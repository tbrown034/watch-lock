/**
 * Supabase Browser Client
 *
 * Official Supabase pattern for Next.js 15 App Router
 * Source: https://supabase.com/docs/guides/auth/server-side/nextjs
 *
 * Usage: Client Components only (components with 'use client')
 * Security: Respects Row Level Security (RLS) policies
 *
 * Example:
 * ```tsx
 * 'use client'
 * import { createClient } from '@/lib/supabase/client'
 * const supabase = useMemo(() => createClient(), [])
 * ```
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
