/**
 * POST /api/rooms/join
 *
 * Join an existing room via share code
 * Requires authentication
 *
 * Request body:
 * {
 *   "shareCode": "ABC123"
 * }
 *
 * Response:
 * {
 *   "roomId": "uuid",
 *   "gameId": "uuid",
 *   "memberCount": 3,
 *   "success": true
 * }
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
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
    const { shareCode } = body

    // Validate share code
    if (!shareCode || shareCode.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid share code. Must be 6 characters.' },
        { status: 400 }
      )
    }

    // Find room by share code
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('share_code', shareCode.toUpperCase())
      .single()

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found. Check your share code and try again.' },
        { status: 404 }
      )
    }

    // Check if room is archived
    if (room.is_archived) {
      return NextResponse.json(
        { error: 'This room has ended and is no longer accepting new members.' },
        { status: 410 } // 410 Gone
      )
    }

    // Check if user is already in the room
    const { data: existingMembership } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .single()

    if (existingMembership) {
      // User is already in the room - return success with game info
      const { data: game } = await supabase
        .from('games')
        .select('external_id')
        .eq('id', room.game_id) // FIXED: Use room.game_id not room_id
        .single()

      return NextResponse.json({
        roomId: room.id,
        gameId: game?.external_id, // Return external_id (mlb-813043) instead of database UUID
        message: 'You are already a member of this room',
        success: true
      })
    }

    // Check if room is full
    const { count: memberCount } = await supabase
      .from('room_members')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id)

    if (memberCount !== null && memberCount >= room.max_members) {
      return NextResponse.json(
        {
          error: `Room is full (${room.max_members}/${room.max_members} members). Ask the owner to increase the limit.`
        },
        { status: 409 } // 409 Conflict
      )
    }

    // Add user to room
    const { error: memberError } = await supabase
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: user.id,
        role: 'member'
      })

    if (memberError) {
      console.error('Error adding user to room:', memberError)
      return NextResponse.json(
        { error: 'Failed to join room', details: memberError.message },
        { status: 500 }
      )
    }

    // Get the game for this room
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, external_id')
      .eq('id', room.game_id) // FIXED: Use room.game_id
      .single()

    if (gameError) {
      console.error('Error fetching game:', gameError)
      return NextResponse.json(
        { error: 'Room joined, but failed to fetch game info' },
        { status: 500 }
      )
    }

    // Initialize user's progress marker
    const { error: progressError } = await supabase
      .from('progress_markers')
      .insert({
        game_id: game.id,
        user_id: user.id,
        pos: 0,
        pos_meta: {
          sport: 'mlb',
          inning: 1,
          half: 'TOP',
          outs: 0,
          phase: 'PREGAME'
        }
      })

    if (progressError) {
      console.error('Error creating progress marker:', progressError)
      // Non-fatal - user can still access the room
    }

    // Update room last activity
    await supabase
      .from('rooms')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', room.id)

    return NextResponse.json({
      roomId: room.id,
      gameId: game.external_id, // Return external_id (mlb-813043) instead of database UUID
      memberCount: (memberCount || 0) + 1,
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in /api/rooms/join:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
