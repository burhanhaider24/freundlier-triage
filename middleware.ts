import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // 1. Unauthenticated Guard
  if (!user && (pathname.startsWith('/patient') || pathname.startsWith('/doctor'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Authenticated Routing & Strict Isolation
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    
    // Clean, defensive fallback
    const role = profile?.role ?? 'patient'

    // Security Audit Logging for Role Violations
    if (role === 'patient' && pathname.startsWith('/doctor')) {
      console.warn(`🚨 SECURITY: Role violation attempt. Patient (${user.email}) tried to access Doctor Workspace.`)
      return NextResponse.redirect(new URL('/patient', request.url))
    }
    
    if (role === 'doctor' && pathname.startsWith('/patient')) {
      return NextResponse.redirect(new URL('/doctor', request.url))
    }
    
    if (pathname === '/' || pathname === '/login') {
        return NextResponse.redirect(new URL(`/${role}`, request.url))
    }
  }

  return response
}

export const config = {
  // Perfect Matcher: Ignores static files, images, and API routes to prevent infinite loops
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)'],
}