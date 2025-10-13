/**
 * POST /api/rooms/create
 *
 * Creates a new private room for a watch party
 * Requires authentication
 *
 * Request body:
 * {
 *   "gameId": "mlb-746532",           // External game ID (from MLB API)
 *   "name": "My Watch Party",          // Room name
 *   "maxMembers": 10,                  // Optional, defaults to 10
 *   "homeTeam": "Yankees",             // From game data
 *   "awayTeam": "Red Sox"              // From game data
 * }
 *
 * Response:
 * {
 *   "roomId": "uuid",
 *   "shareCode": "ABC123",
 *   "gameId": "uuid"
 * }
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Generate a random 6-character share code
function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No ambiguous chars
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('Auth check:', { userId: user?.id, authError })

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { gameId, name, maxMembers = 10, homeTeam, awayTeam } = body

    // Validate required fields
    if (!gameId || !name || !homeTeam || !awayTeam) {
      return NextResponse.json(
        { error: 'Missing required fields: gameId, name, homeTeam, awayTeam' },
        { status: 400 }
      )
    }

    // Generate unique share code (retry if collision)
    let shareCode = generateShareCode()
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('rooms')
        .select('id')
        .eq('share_code', shareCode)
        .single()

      if (!existing) break // Code is unique!

      shareCode = generateShareCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Failed to generate unique share code. Please try again.' },
        { status: 500 }
      )
    }

    // Create the room
    console.log('Attempting to create room with:', { name, shareCode, maxMembers, created_by: user.id })

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        name,
        share_code: shareCode,
        max_members: maxMembers,
        created_by: user.id,
      })
      .select()
      .single()

    if (roomError) {
      console.error('Error creating room:', roomError)
      return NextResponse.json(
        { error: 'Failed to create room', details: roomError.message },
        { status: 500 }
      )
    }

    // Create the game linked to this room
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        room_id: room.id,
        sport: 'mlb',
        title: `${awayTeam} @ ${homeTeam}`,
        home_team: homeTeam,
        away_team: awayTeam,
        external_id: gameId,
        is_live: gameId.startsWith('mlb-'), // Live if it's an MLB API game
        created_by: user.id,
      })
      .select()
      .single()

    if (gameError) {
      console.error('Error creating game:', gameError)
      // Rollback: delete the room since game creation failed
      await supabase.from('rooms').delete().eq('id', room.id)

      return NextResponse.json(
        { error: 'Failed to create game', details: gameError.message },
        { status: 500 }
      )
    }

    // Initialize creator's progress marker
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
      // Non-fatal error - room and game are created, user can still join
    }

    return NextResponse.json({
      roomId: room.id,
      shareCode: room.share_code,
      gameId: game.id,
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in /api/rooms/create:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
