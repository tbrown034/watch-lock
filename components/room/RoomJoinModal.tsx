/**
 * Room Join Modal
 *
 * Modal for joining an existing watch party room via share code
 * Validates 6-character uppercase share code and calls /api/rooms/join
 */

'use client'

import { useState } from 'react'
import { X, LogIn } from 'lucide-react'

interface RoomJoinModalProps {
  onClose: () => void
  onSuccess: (roomId: string, gameId: string) => void
}

export function RoomJoinModal({ onClose, onSuccess }: RoomJoinModalProps) {
  const [shareCode, setShareCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (value.length <= 6) {
      setShareCode(value)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (shareCode.length !== 6) {
      setError('Share code must be exactly 6 characters')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareCode })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join room')
      }

      onSuccess(data.roomId, data.gameId)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Join Watch Party
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="shareCode" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Share Code
            </label>
            <input
              id="shareCode"
              type="text"
              value={shareCode}
              onChange={handleInputChange}
              placeholder="ABC123"
              className="w-full px-4 py-3 text-center text-2xl font-mono font-bold tracking-widest uppercase border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
              required
              maxLength={6}
              autoComplete="off"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Enter the 6-character code shared by the room owner
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              disabled={loading || shareCode.length !== 6}
            >
              {loading ? (
                'Joining...'
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Join Room
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
