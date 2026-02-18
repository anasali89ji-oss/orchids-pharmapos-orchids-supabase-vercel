import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          response.cookies.setAll(cookiesToSet)
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const url = request.nextUrl

  // Allow access to static files and public routes
  const isPublicRoute = url.pathname === '/login' || 
                        url.pathname === '/superadmin-login' ||
                        url.pathname === '/suspended' ||
                        url.pathname.startsWith('/_next') ||
                        url.pathname.startsWith('/api')

  if (isPublicRoute) {
    return response
  }

  // Super admin routes protection
  if (url.pathname.startsWith('/superadmin') && url.pathname !== '/superadmin-login') {
    const superAdminCookie = request.cookies.get('superadmin_session')
    if (!superAdminCookie?.value) {
      return NextResponse.redirect(new URL('/superadmin-login', request.url))
    }
    return response
  }

  // If no user, redirect to login
  if (!user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', url.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Check user's pharmacy and subscription status
  const { data: userData } = await supabase
    .from('users')
    .select('pharmacy_id')
    .eq('id', user.id)
    .single()

  if (!userData?.pharmacy_id) {
    // User has no pharmacy, redirect to a setup page or handle appropriately
    return response
  }

  const { data: pharmacy } = await supabase
    .from('pharmacies')
    .select('subscription_status, slug, is_suspended')
    .eq('id', userData.pharmacy_id)
    .single()

  if (!pharmacy) {
    return response
  }

  // Check if pharmacy is suspended or subscription is inactive
  if (pharmacy.is_suspended || 
      pharmacy.subscription_status === 'past_due' || 
      pharmacy.subscription_status === 'cancelled') {
    if (url.pathname !== '/suspended') {
      return NextResponse.redirect(new URL('/suspended', request.url))
    }
  }

  // Pharmacy slug routing - ensure URL contains pharmacy slug
  const pharmacySlug = pharmacy.slug
  const pathnameParts = url.pathname.split('/').filter(Boolean)

  // If not on suspended page and path doesn't start with pharmacy slug
  if (pathnameParts[0] !== pharmacySlug && url.pathname !== '/suspended') {
    const newPathname = `/${pharmacySlug}${url.pathname}`
    return NextResponse.redirect(new URL(newPathname, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
