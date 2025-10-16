/**
 * Room Member List
 *
 * Displays list of room members with avatars and current viewing positions
 * Shows live updates of where each member is in the game
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Crown, Clock, MessageSquare } from 'lucide-react'

interface Member {
  userId: string
  displayName: string
  avatarUrl?: string
  role: 'owner' | 'member'
  position: {
    pos: number
    posMeta: {
      inning?: number
      half?: string
      outs?: number
      phase?: string
    }
    updatedAt?: string
  } | null
  messageCount: number
  joinedAt: string
}

interface RoomMemberListProps {
  roomId: string
  refreshInterval?: number
}

export function RoomMemberList({ roomId, refreshInterval = 30000 }: RoomMemberListProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/members`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch members')
      }

      setMembers(data.members || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching members:', err)
      setError(err instanceof Error ? err.message : 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()

    const interval = setInterval(fetchMembers, refreshInterval)
    return () => clearInterval(interval)
  }, [roomId, refreshInterval])

  const formatPosition = (position: Member['position']) => {
    if (!position?.posMeta) return 'Starting position'

    const { inning, half, outs, phase } = position.posMeta

    if (phase === 'PREGAME') return 'Pregame'
    if (phase === 'FINAL') return 'Game ended'

    if (inning && half) {
      const halfStr = half === 'TOP' ? 'Top' : 'Bottom'
      const outStr = outs !== undefined ? `, ${outs} out${outs !== 1 ? 's' : ''}` : ''
      return `${halfStr} ${inning}${outStr}`
    }

    return `Position ${position.pos}`
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins === 1) return '1 min ago'
    if (diffMins < 60) return `${diffMins} mins ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`

    return 'More than a day ago'
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Room Members
          </h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Room Members
          </h3>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Room Members
          </h3>
        </div>
        <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm font-semibold rounded-full">
          {members.length}
        </span>
      </div>

      {/* Member List */}
      {members.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
          No members yet
        </p>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <Link
              key={member.userId}
              href={`/profile/${member.userId}`}
              className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.displayName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {member.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {member.role === 'owner' && (
                  <div className="absolute -top-1 -right-1 bg-yellow-400 dark:bg-yellow-500 rounded-full p-1">
                    <Crown className="w-3 h-3 text-yellow-900" />
                  </div>
                )}
              </div>

              {/* Member Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {member.displayName}
                  </p>
                  {member.role === 'owner' && (
                    <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-semibold rounded">
                      Owner
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
                  {formatPosition(member.position)}
                </p>

                <div className="flex items-center gap-3">
                  {member.position?.updatedAt && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{getTimeAgo(member.position.updatedAt)}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                    <MessageSquare className="w-3 h-3" />
                    <span>{member.messageCount} {member.messageCount === 1 ? 'message' : 'messages'}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
