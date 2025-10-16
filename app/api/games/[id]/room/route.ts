/**
 * GET /api/games/[id]/room
 *
 * Fetches room information for a given game ID
 * Requires authentication and room membership
 *
 * Response:
 * {
 *   "room": {
 *     "id": "uuid",
 *     "name": "Yankees @ Red Sox",
 *     "shareCode": "ABC123",
 *     "maxMembers": 10,
 *     "memberCount": 3,
 *     "createdBy": "uuid",
 *     "createdAt": "timestamp"
 *   }
 * }
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: gameId } = await params // external_id like "mlb-813043"

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find the game by external_id that the user is a member of
    // Since multiple rooms can exist for the same game, we need to join through room_members
    console.log('[Room Info] Looking for game with external_id:', gameId)

    // Query games that match the external_id
    // Then find rooms for that game where user is a member
    const { data: games, error: gameError } = await supabase
      .from('games')
      .select('id, external_id')
      .eq('external_id', gameId)
      .limit(1)
      .maybeSingle()

    console.log('[Room Info] Game query result:', { game: games, gameError })

    if (gameError || !games) {
      console.log('[Room Info] Game not found, returning 404')
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    const game = games

    // Find rooms for this game where the user is a member
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, name, share_code, max_members, created_by, created_at')
      .eq('game_id', game.id)

    if (roomsError || !rooms || rooms.length === 0) {
      console.log('[Room Info] No rooms found for user, returning 404')
      return NextResponse.json(
        { error: 'You are not a member of any room for this game' },
        { status: 404 }
      )
    }

    // Check which room(s) the user is a member of
    const userRooms = []
    for (const room of rooms) {
      const { data: membership } = await supabase
        .from('room_members')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (membership) {
        userRooms.push(room)
      }
    }

    if (userRooms.length === 0) {
      return NextResponse.json(
        { error: 'You are not a member of any room for this game' },
        { status: 403 }
      )
    }

    // Return the first room the user is in (they should typically only be in one)
    const roomData = userRooms[0]

    // Count room members
    const { count: memberCount, error: countError } = await supabase
      .from('room_members')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomData.id)

    if (countError) {
      console.error('Error counting members:', countError)
      return NextResponse.json(
        { error: 'Failed to count members' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      room: {
        id: roomData.id,
        name: roomData.name,
        shareCode: roomData.share_code,
        maxMembers: roomData.max_members,
        memberCount: memberCount || 0,
        createdBy: roomData.created_by,
        isOwner: roomData.created_by === user.id,
        createdAt: roomData.created_at
      }
    })

  } catch (error) {
    console.error('Unexpected error in /api/games/[id]/room:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
