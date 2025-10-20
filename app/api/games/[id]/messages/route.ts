/**
 * Messages API for a game
 *
 * Handles spoiler-locked chat messages tied to game positions
 *
 * ============================================
 * POST /api/games/[gameId]/messages
 * ============================================
 * Creates a new message at user's current position
 *
 * AUTHENTICATION: Required (must be room member)
 *
 * REQUEST BODY:
 * {
 *   "body": "Great catch!",
 *   "pos": 31,
 *   "posMeta": {"inning": 3, "half": "TOP", "outs": 1}
 * }
 *
 * RESPONSE (Success 200):
 * {
 *   "message": {
 *     "id": "uuid",
 *     "body": "Great catch!",
 *     "pos": 31,
 *     "posMeta": {...},
 *     "createdAt": "2025-01-20T..."
 *   },
 *   "success": true
 * }
 *
 * ============================================
 * GET /api/games/[gameId]/messages
 * ============================================
 * Fetches messages up to user's current position (spoiler filter)
 *
 * QUERY PARAMS:
 * - limit: number of messages (default 50, max 100)
 * - before: cursor for pagination (message ID)
 *
 * RESPONSE (Success 200):
 * {
 *   "messages": [
 *     {
 *       "id": "uuid",
 *       "authorId": "uuid",
 *       "displayName": "alice",
 *       "avatarUrl": "https://...",
 *       "body": "Great catch!",
 *       "pos": 31,
 *       "posMeta": {...},
 *       "createdAt": "2025-01-20T..."
 *     }
 *   ],
 *   "success": true
 * }
 *
 * WHY MANUAL AUTH CHECKS?
 * We verify room membership manually (not just via RLS) to provide
 * better error messages to users. RLS would just return empty results,
 * but explicit checks let us tell users "You don't have access" vs
 * "No messages found".
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
    // Find rooms for this game where user is a member
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id')
      .eq('game_id', gameId)

    if (roomsError || !rooms || rooms.length === 0) {
      return NextResponse.json(
        { error: 'Game not found or no rooms exist' },
        { status: 404 }
      )
    }

    // Check if user is a member of ANY room for this game
    const roomIds = rooms.map(r => r.id)
    const { data: membership, error: membershipError } = await supabase
      .from('room_members')
      .select('id, room_id')
      .in('room_id', roomIds)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

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
    if (membership?.room_id) {
      await supabase
        .from('rooms')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', membership.room_id)
    }

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
    // Find rooms for this game where user is a member
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id')
      .eq('game_id', gameId)

    if (roomsError || !rooms || rooms.length === 0) {
      return NextResponse.json(
        { error: 'Game not found or no rooms exist' },
        { status: 404 }
      )
    }

    // Check if user is a member of ANY room for this game
    const roomIds = rooms.map(r => r.id)
    const { data: membership, error: membershipError } = await supabase
      .from('room_members')
      .select('id, room_id')
      .in('room_id', roomIds)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

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
          display_name,
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
      displayName: msg.profiles?.display_name || 'User',
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
