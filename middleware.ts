/**
 * Next.js Middleware for Supabase Auth
 *
 * Official Supabase pattern for Next.js 15 App Router
 * Source: https://supabase.com/docs/guides/auth/server-side/nextjs
 *
 * Purpose:
 * 1. Refreshes auth session on EVERY request (keeps users logged in)
 * 2. Updates cookies with fresh session tokens
 * 3. Runs BEFORE any page/API route is executed
 *
 * CRITICAL: This is REQUIRED for SSR auth to work correctly
 * Without this middleware, server components will not have access to user sessions
 *
 * How it works:
 * 1. Reads session from request cookies
 * 2. Calls supabase.auth.getUser() to validate/refresh session
 * 3. Updates response cookies with fresh tokens
 * 4. Passes request to route handler
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Create response (will be mutated with new cookies)
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update request cookies (for this request)
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          // Create new response with updated cookies
          supabaseResponse = NextResponse.next({
            request,
          })

          // Update response cookies (for client)
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // CRITICAL: This validates and refreshes the session
  // Do NOT remove this line - it's what keeps users logged in
  await supabase.auth.getUser()

  return supabaseResponse
}

// Matcher: Which routes should run this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - Image files (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
