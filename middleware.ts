import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next()
  }

  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/superadmin-login' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/suspended' ||
    pathname.startsWith('/auth')
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // No session - redirect based on requested path
  if (!session) {
    if (pathname.startsWith('/superadmin')) {
      return NextResponse.redirect(new URL('/superadmin-login', request.url))
    }
    
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Check if accessing superadmin routes
  if (pathname.startsWith('/superadmin')) {
    const { data: superAdminData } = await supabase
      .from('super_admins')
      .select('id, email, status')
      .eq('auth_user_id', session.user.id)
      .maybeSingle()

    if (!superAdminData || superAdminData.status !== 'active') {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/superadmin-login', request.url))
    }
    return response
  }

  // Regular user routes (not superadmin)
  const { data: userData } = await supabase
    .from('users')
    .select('id, pharmacy_id, role, email')
    .eq('auth_user_id', session.user.id)
    .maybeSingle()

  if (!userData?.pharmacy_id) {
    return response
  }

  const { data: pharmacy } = await supabase
    .from('pharmacies')
    .select('id, slug, subscription_status, is_suspended, subscription_tier')
    .eq('id', userData.pharmacy_id)
    .single()

  if (!pharmacy) return response

  const isSuspended = pharmacy.is_suspended
  const isInactive =
    pharmacy.subscription_status === 'cancelled' ||
    pharmacy.subscription_status === 'canceled' ||
    pharmacy.subscription_status === 'inactive'

  if ((isSuspended || isInactive) && pathname !== '/suspended') {
    return NextResponse.redirect(new URL('/suspended', request.url))
  }

  response.headers.set('x-pharmacy-id', pharmacy.id)
  response.headers.set('x-pharmacy-slug', pharmacy.slug)
  response.headers.set('x-subscription-status', pharmacy.subscription_status || 'inactive')
  response.headers.set('x-subscription-tier', pharmacy.subscription_tier || 'pro')

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
