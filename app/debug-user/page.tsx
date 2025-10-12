/**
 * Debug User Page
 * Shows exactly what data Supabase has for the user
 */

'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export default function DebugUserPage() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [supabase.auth])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Not signed in. Please sign in first.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 User Data Debug</h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Raw User Object</h2>
          <pre className="bg-slate-900 text-green-400 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">User Metadata Fields</h2>
          <div className="space-y-2 text-sm">
            {Object.entries(user.user_metadata || {}).map(([key, value]) => (
              <div key={key} className="flex gap-4">
                <span className="font-mono font-bold text-blue-600">{key}:</span>
                <span className="font-mono">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Image Test</h2>
          <div className="space-y-4">
            {user.user_metadata?.picture && (
              <div>
                <p className="text-sm mb-2">✅ user_metadata.picture exists: <code>{user.user_metadata.picture}</code></p>
                <img src={user.user_metadata.picture} alt="From picture field" className="w-16 h-16 rounded-full" />
              </div>
            )}
            {user.user_metadata?.avatar_url && (
              <div>
                <p className="text-sm mb-2">✅ user_metadata.avatar_url exists: <code>{user.user_metadata.avatar_url}</code></p>
                <img src={user.user_metadata.avatar_url} alt="From avatar_url field" className="w-16 h-16 rounded-full" />
              </div>
            )}
            {!user.user_metadata?.picture && !user.user_metadata?.avatar_url && (
              <p className="text-red-600">❌ No picture or avatar_url field found in user_metadata</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
