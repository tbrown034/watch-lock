/**
 * Auth Callback Route
 *
 * Google redirects here after user signs in
 * This exchanges the OAuth code for a session
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirect = requestUrl.searchParams.get('redirect')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to specified page or home page after sign in
  const redirectPath = redirect || '/'
  return NextResponse.redirect(`${origin}${redirectPath}`)
}
