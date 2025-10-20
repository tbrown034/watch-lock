/**
 * Supabase Server Client
 *
 * Official Supabase pattern for Next.js 15 App Router
 * Source: https://supabase.com/docs/guides/auth/server-side/nextjs
 *
 * Usage: Server Components, API Routes, Server Actions
 * Security: Respects Row Level Security (RLS) policies
 * Auth: Reads session from cookies (set by middleware)
 *
 * CRITICAL: Always call `await cookies()` BEFORE creating Supabase client
 * This opts Server Components out of Next.js static caching
 *
 * Example (Server Component):
 * ```tsx
 * import { createClient } from '@/lib/supabase/server'
 * const supabase = await createClient()
 * const { data: { user } } = await supabase.auth.getUser()
 * ```
 *
 * Example (API Route):
 * ```tsx
 * import { createClient } from '@/lib/supabase/server'
 * export async function GET() {
 *   const supabase = await createClient()
 *   const { data } = await supabase.from('table').select()
 *   return Response.json(data)
 * }
 * ```
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
