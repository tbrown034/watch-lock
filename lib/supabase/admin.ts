/**
 * Supabase Admin Client (Service Role)
 *
 * ⚠️ WARNING: BYPASSES ALL ROW LEVEL SECURITY ⚠️
 *
 * This client uses the service_role key which has FULL database access.
 * It ignores ALL RLS policies - use with extreme caution.
 *
 * ONLY use in:
 * - API routes (server-side only)
 * - Server actions
 * - Background jobs
 *
 * NEVER:
 * - Import in client components
 * - Expose to browser
 * - Use for user-facing queries (use server.ts client instead)
 *
 * Common use cases:
 * - Creating records that bypass RLS during setup (e.g., auto-adding room owner)
 * - Admin operations (deleting users, bulk updates)
 * - Background tasks (cleanup, notifications)
 *
 * Example:
 * ```tsx
 * import { createAdminClient } from '@/lib/supabase/admin'
 *
 * export async function POST(request: Request) {
 *   const supabase = await createClient() // Regular client for auth
 *   const { data: { user } } = await supabase.auth.getUser()
 *   if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
 *
 *   const admin = createAdminClient() // Admin client for privileged operations
 *   await admin.from('table').insert({ ... }) // Bypasses RLS
 * }
 * ```
 */

import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
