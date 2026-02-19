import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${new URL(request.url).origin}/auth/reset-password`,
    })

    if (error) {
      console.error('Password reset error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Password reset email sent. Check your inbox.'
    })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
