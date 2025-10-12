/**
 * Supabase Client (Browser)
 *
 * Use this in client components (use client directive)
 * This client respects Row Level Security policies
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
