/**
 * GET /api/games/stats
 *
 * Returns room and member counts for all active games
 * Public endpoint (no auth required)
 *
 * Response:
 * {
 *   "mlb-813033": { roomCount: 3, memberCount: 15 },
 *   "nfl-401547652": { roomCount: 1, memberCount: 5 }
 * }
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get all active (non-archived) rooms with their games
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select(`
        id,
        games!inner (
          external_id
        )
      `)
      .eq('is_archived', false)

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError)
      return NextResponse.json({}, { status: 200 }) // Return empty object on error
    }

    if (!rooms || rooms.length === 0) {
      return NextResponse.json({})
    }

    // Get member counts for all rooms
    const roomIds = rooms.map((r: any) => r.id)
    const { data: members, error: membersError } = await supabase
      .from('room_members')
      .select('room_id')
      .in('room_id', roomIds)

    if (membersError) {
      console.error('Error fetching members:', membersError)
      // Continue without member counts
    }

    // Group by game external_id
    const stats: Record<string, { roomCount: number; memberCount: number }> = {}

    rooms.forEach((room: any) => {
      const gameId = room.games?.external_id
      if (!gameId) return

      if (!stats[gameId]) {
        stats[gameId] = { roomCount: 0, memberCount: 0 }
      }

      stats[gameId].roomCount++

      // Count members for this room
      const roomMemberCount = members?.filter((m: any) => m.room_id === room.id).length || 0
      stats[gameId].memberCount += roomMemberCount
    })

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Unexpected error in /api/games/stats:', error)
    return NextResponse.json({}, { status: 200 }) // Return empty object on error
  }
}
