/**
 * Server-side superadmin session verification utility.
 * Import this in all /api/superadmin/* routes.
 */
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function verifySuperAdmin(request: NextRequest): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const cookieHeader = request.headers.get('cookie') ?? ''

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () =>
          cookieHeader.split(';').map((c) => {
            const [name, ...rest] = c.trim().split('=')
            return { name: name.trim(), value: rest.join('=') }
          }),
        setAll: () => {},
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  // Verify the user is an active super_admin in the DB
  const { data: superAdmin } = await supabase
    .from('super_admins')
    .select('id, status')
    .eq('auth_user_id', session.user.id)
    .maybeSingle()

  if (!superAdmin || superAdmin.status !== 'active') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { ok: true, userId: session.user.id }
}
