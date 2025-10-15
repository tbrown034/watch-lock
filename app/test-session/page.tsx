/**
 * Test page to check both client and server auth state
 */
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestSessionPage() {
  const [clientAuth, setClientAuth] = useState<any>(null)
  const [serverAuth, setServerAuth] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check client-side auth
    const supabase = createClient()
    supabase.auth.getUser().then(({ data, error }) => {
      setClientAuth({
        hasUser: !!data.user,
        userId: data.user?.id,
        email: data.user?.email,
        error: error?.message
      })
    })

    // Check server-side auth via API
    fetch('/api/test-auth')
      .then(res => res.json())
      .then(data => {
        setServerAuth(data)
        setLoading(false)
      })
  }, [])

  const testRoomCreation = async () => {
    const response = await fetch('/api/rooms/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: 'test-123',
        name: 'Test Room ' + Date.now(),
        maxMembers: 10,
        homeTeam: 'Test Home',
        awayTeam: 'Test Away'
      })
    })
    const result = await response.json()
    alert(JSON.stringify(result, null, 2))
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Session Debug</h1>

      <div className="space-y-4">
        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded">
          <h2 className="font-bold mb-2">Client-Side Auth (Browser)</h2>
          <pre className="text-sm">{JSON.stringify(clientAuth, null, 2)}</pre>
        </div>

        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded">
          <h2 className="font-bold mb-2">Server-Side Auth (API)</h2>
          <pre className="text-sm">{JSON.stringify(serverAuth, null, 2)}</pre>
        </div>

        <button
          onClick={testRoomCreation}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Room Creation
        </button>
      </div>

      <div className="text-sm text-slate-600 dark:text-slate-400">
        <p>If client shows user but server doesn't, there's a cookie/session issue.</p>
        <p>If both show no user, you need to sign in.</p>
      </div>
    </div>
  )
}