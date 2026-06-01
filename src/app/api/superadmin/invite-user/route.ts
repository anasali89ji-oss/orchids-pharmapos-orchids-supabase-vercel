import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'
import { verifySuperAdmin } from '@/lib/verify-superadmin'

// Node runtime for database operations with cryptographic functions
export const runtime = 'nodejs'

// Cryptographically secure password generator using Node.js crypto
function generatePassword(length = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  const randomBytes = new Uint8Array(length * 2)
  crypto.getRandomValues(randomBytes)
  let password = ''
  for (const byte of randomBytes) {
    if (password.length >= length) break
    const index = byte % charset.length
    password += charset[index]
  }
  return password
}

export async function POST(request: NextRequest) {
  try {
    // Verify the caller is an authenticated active super admin
    const auth = await verifySuperAdmin(request)
    if (!auth.ok) return auth.response

    const rateLimitResult = await rateLimit(request, {
      interval: 3600000, // 1 hour
      maxRequests: 50,
    })

    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response
    }

    const body = await request.json()
    const { pharmacy_id, email, name, role } = body

    if (!pharmacy_id || !email || !name || !role) {
      logger.warn('Invite user validation failed', { body })
      return NextResponse.json(
        { error: 'pharmacy_id, email, name, and role are required' },
        { status: 400 }
      )
    }

    const validRoles = [
      'pharmacy_admin',
      'manager',
      'pharmacist',
      'cashier',
      'inventory_clerk',
      'accountant',
      'reporting_analyst',
      'sales_representative',
      'support_agent',
      'procurement_officer',
      'warehouse_supervisor',
      'delivery_coordinator',
    ]

    if (!validRoles.includes(role)) {
      logger.warn('Invalid user role', { role })
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if user already exists
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('pharmacy_id', pharmacy_id)
      .single()

    if (existing) {
      logger.warn('User already exists', { email, pharmacy_id })
      return NextResponse.json({ error: 'User already exists in this pharmacy' }, { status: 409 })
    }

    // Generate password
    const password = generatePassword(12)

    // Create user via Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        pharmacy_id,
      },
    })

    if (authError) {
      logger.error('Failed to create auth user', new Error(authError.message), { email })
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Create user record
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user?.id,
        auth_user_id: authData.user?.id,
        pharmacy_id,
        email,
        name,
        role,
        status: 'active',
        is_active: true,
      })
      .select()
      .single()

    if (userError) {
      logger.error('Failed to create user record', userError)
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    // Get pharmacy details
    const { data: pharmacy } = await supabaseAdmin
      .from('pharmacies')
      .select('name')
      .eq('id', pharmacy_id)
      .single()

    logger.info('User invited successfully', { user_id: user.id, email, role, pharmacy_id })

    return NextResponse.json({
      user,
      credentials: {
        email,
        password,
      },
      message: `User invited successfully. Please share these credentials securely:\n\nEmail: ${email}\nPassword: ${password}\n\nThey can log in at ${pharmacy?.name || 'the pharmacy'}`,
    })
  } catch (error: unknown) {
    logger.error('Invite user error', error as Error)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
