/**
 * Server-side session verification utility.
 * Import in /api/admin/* and other protected routes.
 */
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function verifySession(request: NextRequest): Promise<
  | { ok: true; userId: string; pharmacyId: string | null; role: string | null }
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

  const { data: user } = await supabase
    .from('users')
    .select('id, pharmacy_id, role')
    .eq('auth_user_id', session.user.id)
    .maybeSingle()

  return {
    ok: true,
    userId: session.user.id,
    pharmacyId: user?.pharmacy_id ?? null,
    role: user?.role ?? null,
  }
}
