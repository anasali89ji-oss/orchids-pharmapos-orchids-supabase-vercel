import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'
import { verifySession } from '@/lib/verify-session'

// Node runtime for auth operations
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Require a valid session; only pharmacy_admin or manager may call this
    const auth = await verifySession(request)
    if (!auth.ok) return auth.response

    const allowedRoles = ['pharmacy_admin', 'manager']
    if (!auth.role || !allowedRoles.includes(auth.role)) {
      logger.warn('Change password: insufficient role', { role: auth.role, caller: auth.userId })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rateLimitResult = await rateLimit(request, {
      interval: 300000, // 5 minutes
      maxRequests: 3,
    })

    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response
    }

    const body = await request.json()
    const { user_id, new_password } = body

    if (!user_id || !new_password) {
      logger.warn('Change password missing required fields', { user_id })
      return NextResponse.json(
        { error: 'user_id and new_password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (new_password.length < 8) {
      logger.warn('Password too short', { user_id })
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Update password via Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    )

    if (authError) {
      logger.error('Failed to update password', new Error(authError.message), { user_id })
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    logger.info('Password changed successfully', { user_id })

    return NextResponse.json({
      message: 'Password updated successfully',
    })
  } catch (error: unknown) {
    logger.error('Change password error', error as Error)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
