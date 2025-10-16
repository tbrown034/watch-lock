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

    // Query games that match the external_id AND where user is a room member
    const { data: games, error: gameError } = await supabase
      .from('games')
      .select(`
        id,
        room_id,
        room:rooms!inner(
          id,
          name,
          share_code,
          max_members,
          created_by,
          created_at,
          room_members!inner(
            user_id
          )
        )
      `)
      .eq('external_id', gameId)
      .eq('room.room_members.user_id', user.id)

    console.log('[Room Info] Game query result:', { games, gameError })

    if (gameError || !games || games.length === 0) {
      console.log('[Room Info] Game not found or user not a member, returning 404')
      return NextResponse.json(
        { error: 'Game not found or you are not a member of any room for this game' },
        { status: 404 }
      )
    }

    // Get the first game (user should typically only be in one room per game)
    const game = games[0]

    // Fetch room information
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('id, name, share_code, max_members, created_by, created_at')
      .eq('id', game.room_id)
      .single()

    if (roomError || !roomData) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

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
