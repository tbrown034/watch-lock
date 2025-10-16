/**
 * DELETE /api/rooms/[roomId]
 *
 * Deletes a room (creator only)
 * Requires authentication
 * Cascades to delete all associated data (games, messages, progress markers)
 *
 * Response:
 * {
 *   "success": true
 * }
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
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

    // Check if room exists and user is the creator
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, created_by')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Verify user is the creator
    if (room.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the room creator can delete this room' },
        { status: 403 }
      )
    }

    // Delete the room (cascades will handle related data)
    const { error: deleteError } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)

    if (deleteError) {
      console.error('Error deleting room:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete room' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in DELETE /api/rooms/[roomId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
