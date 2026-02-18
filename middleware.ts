import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Don't process static files or API routes
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/api') ||
    req.nextUrl.pathname.startsWith('/static') ||
    req.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Skip middleware for login and superadmin pages
  if (
    req.nextUrl.pathname === '/login' ||
    req.nextUrl.pathname.startsWith('/superadmin') ||
    req.nextUrl.pathname === '/suspended'
  ) {
    return NextResponse.next()
  }

  let res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.delete({ name, ...options })
        }
      }
    }
  )

  // Check session
  const { data: { session } } = await supabase.auth.getSession()

  // Redirect to login if no session
  if (!session) {
    const redirectUrl = new URL('/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Get user with pharmacy info
  const { data: user } = await supabase
    .from('users')
    .select('*, pharmacies!inner(id, slug, subscription_status, is_suspended)')
    .eq('id', session.user.id)
    .single()

  // If user not found or has no pharmacy, redirect to login
  if (!user?.pharmacies) {
    await supabase.auth.signOut()
    const redirectUrl = new URL('/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  const pharmacy = user.pharmacies

  // Check if pharmacy is suspended
  if (pharmacy.is_suspended) {
    const redirectUrl = new URL('/suspended', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Check subscription status
  const invalidStatus = ['cancelled', 'inactive', 'canceled']
  if (invalidStatus.includes(pharmacy.subscription_status || '')) {
    const redirectUrl = new URL('/suspended', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // For past_due accounts, allow access but show warning (handled by SubscriptionGuard)
  // Store pharmacy info in headers for client-side
  res.headers.set('x-pharmacy-id', pharmacy.id)
  res.headers.set('x-pharmacy-slug', pharmacy.slug)
  res.headers.set('x-subscription-status', pharmacy.subscription_status || 'inactive')

  return res
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
}
