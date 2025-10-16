/**
 * GET /api/rooms/[roomId]/members
 *
 * Get all members in a room with their current progress
 * Requires authentication and room membership
 *
 * Response:
 * {
 *   "members": [
 *     {
 *       "userId": "uuid",
 *       "username": "alice",
 *       "avatarUrl": "https://...",
 *       "role": "owner",
 *       "position": {
 *         "pos": 31,
 *         "posMeta": {"inning": 3, "half": "TOP", "outs": 1}
 *       },
 *       "joinedAt": "2025-10-12T..."
 *     }
 *   ]
 * }
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a member of this room
    const { data: membership, error: membershipError } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'You are not a member of this room' },
        { status: 403 }
      )
    }

    // Get the game for this room
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id')
      .eq('room_id', roomId)
      .single()

    if (gameError) {
      console.error('Error fetching game:', gameError)
      return NextResponse.json(
        { error: 'Failed to fetch game info' },
        { status: 500 }
      )
    }

    // Get all room members
    const { data: members, error: membersError } = await supabase
      .from('room_members')
      .select('user_id, role, joined_at')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true })

    if (membersError) {
      console.error('Error fetching members:', membersError)
      return NextResponse.json(
        { error: 'Failed to fetch room members' },
        { status: 500 }
      )
    }

    // Get profiles for all members
    const userIds = members.map((m: any) => m.user_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      // Non-fatal - continue without profiles
    }

    // Get progress markers for all members
    const { data: progressMarkers, error: progressError } = await supabase
      .from('progress_markers')
      .select('user_id, pos, pos_meta, updated_at')
      .eq('game_id', game.id)

    if (progressError) {
      console.error('Error fetching progress:', progressError)
      // Non-fatal - return members without progress
    }

    // Get message counts for all members in this game
    const { data: messageCounts, error: messageCountError } = await supabase
      .from('messages')
      .select('author_id')
      .eq('game_id', game.id)

    if (messageCountError) {
      console.error('Error fetching message counts:', messageCountError)
      // Non-fatal - continue without message counts
    }

    // Count messages per user
    const messageCountsByUser: Record<string, number> = {}
    messageCounts?.forEach((msg: any) => {
      messageCountsByUser[msg.author_id] = (messageCountsByUser[msg.author_id] || 0) + 1
    })

    // Combine members with their profiles and progress
    const membersWithProgress = members.map((member: any) => {
      const profile = profiles?.find(p => p.id === member.user_id)
      const progress = progressMarkers?.find(p => p.user_id === member.user_id)

      return {
        userId: member.user_id,
        username: profile?.username || 'Unknown',
        avatarUrl: profile?.avatar_url,
        role: member.role,
        position: progress ? {
          pos: progress.pos,
          posMeta: progress.pos_meta,
          updatedAt: progress.updated_at
        } : null,
        messageCount: messageCountsByUser[member.user_id] || 0,
        joinedAt: member.joined_at
      }
    })

    return NextResponse.json({
      members: membersWithProgress,
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in /api/rooms/[roomId]/members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
