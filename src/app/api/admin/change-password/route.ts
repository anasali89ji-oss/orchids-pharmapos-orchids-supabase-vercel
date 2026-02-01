import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { userId, newPassword } = await request.json()

    if (!userId || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('email', session.user.email)
      .single()

    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
