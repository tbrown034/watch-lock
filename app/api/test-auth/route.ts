/**
 * Test authentication endpoint
 * GET /api/test-auth
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      return NextResponse.json({
        authenticated: false,
        error: error.message,
        details: error
      })
    }

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        message: 'No user session found'
      })
    }

    // Test if we can query rooms (to verify RLS)
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id')
      .limit(1)

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        aud: user.aud,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata
      },
      canQueryRooms: !roomsError,
      roomsError: roomsError?.message || null
    })

  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      error: 'Unexpected error',
      details: error
    })
  }
}