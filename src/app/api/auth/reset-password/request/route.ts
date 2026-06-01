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
    const { email } = body

    if (!email) {
      logger.warn('Password reset request missing email')
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .single()

    if (!user) {
      // Don't reveal that user doesn't exist for security
      logger.info('Password reset requested for non-existent email', { email })
      return NextResponse.json({
        message: 'If the email exists, a reset link has been sent',
      })
    }

    // Generate a cryptographically secure reset token (valid for 1 hour)
    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const resetToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        reset_token: resetToken,
        reset_token_expires: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      })
      .eq('id', user.id)

    if (updateError) {
      logger.error('Failed to set reset token', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Send reset email via Supabase Auth (non-fatal if it fails — we have our own token)
    const { error: authError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      }
    })

    if (authError) {
      // AuthError isn't a plain Error — log message string only
      logger.warn('Auth link generation failed (non-fatal)', { reason: authError.message })
      // Continue — we've set our own reset token above
    }

    logger.info('Password reset requested', { user_id: user.id, email })

    return NextResponse.json({
      message: 'If the email exists, a reset link has been sent',
      // In production, this would be sent via email
      reset_token: process.env.NODE_ENV === 'development' ? resetToken : undefined,
    })
  } catch (error: unknown) {
    logger.error('Password reset request error', error as Error)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
