import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

// Node runtime for auth operations
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, {
      interval: 900000, // 15 minutes
      maxRequests: 5,
    })

    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response
    }

    const body = await request.json()
    const { email, reset_token, new_password } = body

    if (!email || !reset_token || !new_password) {
      logger.warn('Password reset update missing required fields')
      return NextResponse.json(
        { error: 'Email, reset_token, and new_password are required' },
        { status: 400 }
      )
    }

    // Validate reset token
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, reset_token, reset_token_expires')
      .eq('email', email)
      .single()

    if (!user) {
      logger.warn('Password reset for non-existent user', { email })
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.reset_token !== reset_token) {
      logger.warn('Invalid reset token', { email })
      return NextResponse.json({ error: 'Invalid reset token' }, { status: 400 })
    }

    if (user.reset_token_expires && new Date(user.reset_token_expires) < new Date()) {
      logger.warn('Expired reset token', { email })
      return NextResponse.json({ error: 'Reset token has expired' }, { status: 400 })
    }

    // Update password via Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    )

    if (authError) {
      logger.error('Failed to update password', authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Clear reset token
    const { error: clearError } = await supabaseAdmin
      .from('users')
      .update({
        reset_token: null,
        reset_token_expires: null,
      })
      .eq('id', user.id)

    if (clearError) {
      logger.error('Failed to clear reset token', clearError)
    }

    logger.info('Password reset successful', { user_id: user.id, email })

    return NextResponse.json({
      message: 'Password updated successfully',
    })
  } catch (error: unknown) {
    logger.error('Password reset update error', error as Error)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
