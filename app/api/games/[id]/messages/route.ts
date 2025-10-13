/**
 * Messages API for a game
 *
 * POST /api/games/[gameId]/messages
 * - Create a new message at current position
 *
 * GET /api/games/[gameId]/messages
 * - Fetch messages (RLS automatically filters by user's position)
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST - Create a new message
 *
 * Request body:
 * {
 *   "body": "Great catch!",
 *   "pos": 31,
 *   "posMeta": {"inning": 3, "half": "TOP", "outs": 1}
 * }
 */
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
    const { body: messageBody, pos, posMeta } = body

    // Validate required fields
    if (!messageBody || typeof pos !== 'number' || !posMeta) {
      return NextResponse.json(
        { error: 'Missing required fields: body, pos, posMeta' },
        { status: 400 }
      )
    }

    // Validate message length (280 chars)
    if (messageBody.length > 280) {
      return NextResponse.json(
        { error: 'Message too long. Maximum 280 characters.' },
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

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        game_id: gameId,
        author_id: user.id,
        body: messageBody,
        pos,
        pos_meta: posMeta,
        kind: 'text'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating message:', insertError)
      return NextResponse.json(
        { error: 'Failed to create message', details: insertError.message },
        { status: 500 }
      )
    }

    // Update room last activity
    await supabase
      .from('rooms')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', game.room_id)

    return NextResponse.json({
      message: {
        id: message.id,
        body: message.body,
        pos: message.pos,
        posMeta: message.pos_meta,
        createdAt: message.created_at
      },
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in POST /api/games/[gameId]/messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET - Fetch messages
 *
 * Query params:
 * - limit: number of messages (default 50, max 100)
 * - before: cursor for pagination (message ID)
 *
 * Response:
 * {
 *   "messages": [
 *     {
 *       "id": "uuid",
 *       "authorId": "uuid",
 *       "username": "alice",
 *       "avatarUrl": "https://...",
 *       "body": "Great catch!",
 *       "pos": 31,
 *       "posMeta": {"inning": 3, "half": "TOP", "outs": 1},
 *       "createdAt": "2025-10-12T..."
 *     }
 *   ]
 * }
 *
 * Note: RLS automatically filters messages based on user's current position
 */
export async function GET(
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const before = searchParams.get('before') // Message ID for pagination

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

    // Fetch messages with author profiles
    // RLS will automatically filter messages based on user's position!
    let query = supabase
      .from('messages')
      .select(`
        id,
        author_id,
        body,
        pos,
        pos_meta,
        created_at,
        profiles:author_id (
          username,
          avatar_url
        )
      `)
      .eq('game_id', gameId)
      .eq('is_deleted', false)
      .order('pos', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(limit)

    if (before) {
      query = query.lt('id', before)
    }

    const { data: messages, error: messagesError } = await query

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: messagesError.message },
        { status: 500 }
      )
    }

    // Format response
    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id,
      authorId: msg.author_id,
      username: msg.profiles?.username || 'Unknown',
      avatarUrl: msg.profiles?.avatar_url,
      body: msg.body,
      pos: msg.pos,
      posMeta: msg.pos_meta,
      createdAt: msg.created_at
    }))

    return NextResponse.json({
      messages: formattedMessages,
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/games/[gameId]/messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
