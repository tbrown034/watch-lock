/**
 * GET /api/users/me/rooms
 *
 * Fetches all rooms the current user is a member of
 * Requires authentication
 *
 * Response:
 * {
 *   "rooms": [
 *     {
 *       "id": "uuid",
 *       "name": "Yankees @ Red Sox - Oct 15 8:00 PM",
 *       "shareCode": "ABC123",
 *       "maxMembers": 10,
 *       "memberCount": 3,
 *       "isOwner": true,
 *       "role": "owner",
 *       "joinedAt": "timestamp",
 *       "createdAt": "timestamp",
 *       "gameId": "mlb-813043"
 *     }
 *   ]
 * }
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
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

    // Get all rooms the user is a member of
    const { data: memberships, error: membershipsError } = await supabase
      .from('room_members')
      .select('room_id, role, joined_at')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    if (membershipsError) {
      console.error('Error fetching memberships:', membershipsError)
      return NextResponse.json(
        { error: 'Failed to fetch room memberships' },
        { status: 500 }
      )
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ rooms: [] })
    }

    // Get room details (including game_id)
    const roomIds = memberships.map((m: any) => m.room_id)
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, name, share_code, max_members, created_at, created_by, game_id')
      .in('id', roomIds)

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError)
      return NextResponse.json(
        { error: 'Failed to fetch rooms' },
        { status: 500 }
      )
    }

    // Get game_ids from rooms to fetch external_ids
    const gameIds = rooms.map((r: any) => r.game_id).filter(Boolean)
    let gamesMap: Record<string, string> = {}

    if (gameIds.length > 0) {
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('id, external_id')
        .in('id', gameIds)

      if (gamesError) {
        console.error('Error fetching games:', gamesError)
        // Non-fatal - continue without game IDs
      } else if (games) {
        gamesMap = games.reduce((acc: Record<string, string>, g: any) => {
          acc[g.id] = g.external_id
          return acc
        }, {})
      }
    }

    // Count members for each room
    const roomsWithDetails = await Promise.all(
      rooms.map(async (room: any) => {
        const { count } = await supabase
          .from('room_members')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id)

        const membership = memberships.find((m: any) => m.room_id === room.id)

        return {
          id: room.id,
          name: room.name,
          shareCode: room.share_code,
          maxMembers: room.max_members,
          memberCount: count || 0,
          isOwner: room.created_by === user.id,
          role: membership?.role || 'member',
          joinedAt: membership?.joined_at || room.created_at,
          createdAt: room.created_at,
          gameId: room.game_id ? gamesMap[room.game_id] : undefined
        }
      })
    )

    return NextResponse.json({
      rooms: roomsWithDetails
    })

  } catch (error) {
    console.error('Unexpected error in /api/users/me/rooms:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
