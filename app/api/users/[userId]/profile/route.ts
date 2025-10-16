/**
 * GET /api/users/[userId]/profile
 *
 * Get public profile information for a user
 * Public endpoint (no auth required)
 *
 * Response:
 * {
 *   "profile": {
 *     "id": "uuid",
 *     "username": "alice",
 *     "display_name": "Alice Smith",
 *     "avatar_url": "https://...",
 *     "created_at": "2025-01-01T..."
 *   }
 * }
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const supabase = await createClient()

    // Fetch public profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, created_at')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      profile,
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in /api/users/[userId]/profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
