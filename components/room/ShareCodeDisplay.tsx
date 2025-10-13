/**
 * Share Code Display
 *
 * Component to display room share code with copy functionality
 * Shows large formatted code and generates shareable links
 */

'use client'

import { useState } from 'react'
import { Copy, Check, Share2, Link as LinkIcon } from 'lucide-react'

interface ShareCodeDisplayProps {
  shareCode: string
  roomId?: string
  compact?: boolean
}

export function ShareCodeDisplay({ shareCode, roomId, compact = false }: ShareCodeDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const shareLink = roomId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/room/${roomId}`
    : null

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const handleCopyLink = async () => {
    if (!shareLink) return

    try {
      await navigator.clipboard.writeText(shareLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <code className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg font-mono font-bold text-sm tracking-wider">
          {shareCode}
        </code>
        <button
          onClick={handleCopyCode}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          aria-label="Copy share code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Share Code */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
            Share Code
          </h3>
        </div>

        <div className="flex items-center justify-between gap-4">
          <code className="text-4xl font-mono font-bold text-blue-900 dark:text-blue-100 tracking-[0.3em] select-all">
            {shareCode}
          </code>

          <button
            onClick={handleCopyCode}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2 shrink-0"
            aria-label="Copy share code"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">
          Share this code with others so they can join your watch party
        </p>
      </div>

      {/* Share Link */}
      {shareLink && (
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-2 mb-2">
            <LinkIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Direct Link
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={shareLink}
              readOnly
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-slate-600 dark:text-slate-300"
              onClick={(e) => e.currentTarget.select()}
            />

            <button
              onClick={handleCopyLink}
              className="px-3 py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 rounded-lg font-semibold transition-colors flex items-center gap-2 shrink-0"
              aria-label="Copy share link"
            >
              {linkCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
