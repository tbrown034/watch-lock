/**
 * POST /api/rooms/create
 *
 * Creates a new private room for a watch party
 * Requires authentication
 *
 * Request body:
 * {
 *   "gameId": "mlb-746532",           // External game ID (from MLB API)
 *   "name": "My Watch Party",          // Base room name (will be reformatted with abbreviations + date)
 *   "maxMembers": 10,                  // Optional, defaults to 10
 *   "homeTeam": "Yankees",             // From game data
 *   "awayTeam": "Red Sox",             // From game data
 *   "gameDate": "2025-10-16T..."       // ISO date string from API
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
import { getTeamAbbreviation as getMlbTeamAbbreviation } from '@/lib/mlb-teams'
import { getTeamAbbreviation as getNflTeamAbbreviation } from '@/lib/nfl-teams'

// Generate a random 6-character share code
function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No ambiguous chars
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Format date as M/D (e.g., "10/16")
function formatGameDate(isoDate: string): string {
  try {
    const date = new Date(isoDate)
    const month = date.getMonth() + 1 // 0-indexed
    const day = date.getDate()
    return `${month}/${day}`
  } catch {
    return ''
  }
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
    const { gameId, name, maxMembers = 10, homeTeam, awayTeam, gameDate } = body

    // Validate required fields
    if (!gameId || !name || !homeTeam || !awayTeam) {
      return NextResponse.json(
        { error: 'Missing required fields: gameId, name, homeTeam, awayTeam' },
        { status: 400 }
      )
    }

    // Determine sport and get appropriate abbreviation function
    const isNfl = gameId.startsWith('nfl-')
    const getTeamAbbreviation = isNfl ? getNflTeamAbbreviation : getMlbTeamAbbreviation

    // Generate formatted room name: "MIL @ LAD - 10/16"
    const awayAbbr = getTeamAbbreviation(awayTeam)
    const homeAbbr = getTeamAbbreviation(homeTeam)
    const dateStr = gameDate ? ` - ${formatGameDate(gameDate)}` : ''
    const baseRoomName = `${awayAbbr} @ ${homeAbbr}${dateStr}`

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

    // Count existing rooms for this game to determine the next number
    const { data: existingGames, error: countError } = await supabase
      .from('games')
      .select('id, room_id')
      .eq('external_id', gameId)

    if (countError) {
      console.error('Error counting existing rooms:', countError)
    }

    // Add room number if multiple rooms exist for this game
    const roomCount = existingGames?.length || 0
    const finalRoomName = roomCount > 0
      ? `${baseRoomName} (${roomCount + 1})`
      : baseRoomName

    // Create the room
    console.log('Attempting to create room with:', { name: finalRoomName, shareCode, maxMembers, created_by: user.id })

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        name: finalRoomName,
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

    // Room created successfully
    // Note: Database trigger automatically adds creator as room member with 'owner' role

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
      roomName: room.name, // Include the actual room name with number
      shareCode: room.share_code,
      gameId: game.external_id, // Return external_id (mlb-813043) instead of database UUID
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
