/**
 * POST /api/games/[gameId]/position
 *
 * Update user's current position in a game
 * Requires authentication and game access
 *
 * Request body:
 * {
 *   "pos": 31,
 *   "posMeta": {
 *     "sport": "mlb",
 *     "inning": 3,
 *     "half": "TOP",
 *     "outs": 1,
 *     "phase": "LIVE"
 *   }
 * }
 *
 * Response:
 * {
 *   "success": true
 * }
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { pos, posMeta } = body

    // Validate required fields
    if (typeof pos !== 'number' || !posMeta) {
      return NextResponse.json(
        { error: 'Missing required fields: pos, posMeta' },
        { status: 400 }
      )
    }

    // Verify user has access to this game (via room membership)
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('room_id')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    const { data: membership, error: membershipError } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', game.room_id)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'You do not have access to this game' },
        { status: 403 }
      )
    }

    // Upsert progress marker (create or update)
    const { error: upsertError } = await supabase
      .from('progress_markers')
      .upsert({
        game_id: gameId,
        user_id: user.id,
        pos,
        pos_meta: posMeta,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'game_id,user_id'
      })

    if (upsertError) {
      console.error('Error updating progress marker:', upsertError)
      return NextResponse.json(
        { error: 'Failed to update position', details: upsertError.message },
        { status: 500 }
      )
    }

    // Update room last activity
    await supabase
      .from('rooms')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', game.room_id)

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in /api/games/[gameId]/position:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
