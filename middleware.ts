import { NextResponse, type NextRequest } from 'next/server'

// AUTH BYPASS — all routes are open, no redirects
export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
