import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, role, pharmacyId, phone } = body

    if (!name || !email || !role || !pharmacyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

        const supabase = await createClient()

        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', email.toLowerCase())
          .single()

        if (existingUser) {
          return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
        }

        const tempPassword = generatePassword(12)

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: email.toLowerCase(),
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            name,
            role,
            phone: phone || ''
          }
        })

        if (authError || !authData.user) {
          return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
        }

        const { data: newUser, error: dbError } = await supabase
          .from('users')
          .insert({
            name,
            email: email.toLowerCase(),
            role,
            role_id: role,
            phone: phone || '',
            pharmacy_id: pharmacyId,
            auth_user_id: authData.user.id,
            status: 'active',
            is_pharmacy_admin: role === 'pharmacy_admin'
          })
          .select()
          .single()

        if (dbError) {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
          return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
        }

        const pharmacy = await supabase
          .from('pharmacies')
          .select('name')
          .eq('id', pharmacyId)
          .single()

        const pharmacyName = pharmacy.data?.name || 'PharmaPOS'

    await supabase.from('email_notifications').insert({
      type: 'user_invitation',
      recipient_email: email.toLowerCase(),
      subject: `Welcome to ${pharmacyName} - Your Login Credentials`,
      sent_at: new Date().toISOString(),
      status: 'sent',
      pharmacy_id: pharmacyId
    })

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        password: tempPassword
      }
    })

  } catch (error) {
    console.error('Invite user error:', error)
    return NextResponse.json({
      error: 'Failed to invite user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generatePassword(length: number): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, status, created_at, pharmacies(name)')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({ success: true, users })

  } catch (error) {
    console.error('Fetch users error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
