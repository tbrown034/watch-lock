/**
 * AUTH TEST PAGE
 *
 * Simple page to test if Google OAuth is working
 * Visit: http://localhost:3000/auth-test
 */

'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export default function AuthTestPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Check if user is already signed in
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      console.error('Error signing in:', error)
      alert('Error signing in: ' + error.message)
    }
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-2 text-center">🔐 Auth Test</h1>
        <p className="text-slate-600 text-center mb-8 text-sm">
          Testing Supabase + Google OAuth
        </p>

        {user ? (
          <div className="space-y-6">
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-bold mb-2">✅ Signed In!</p>
              <div className="text-sm space-y-1">
                <p><span className="font-semibold">Email:</span> {user.email}</p>
                <p><span className="font-semibold">ID:</span> <code className="text-xs">{user.id}</code></p>
                <p><span className="font-semibold">Name:</span> {user.user_metadata?.full_name || 'N/A'}</p>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 font-bold mb-2">📝 What to Check:</p>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Go to Supabase Dashboard</li>
                <li>Click "Authentication" → "Users"</li>
                <li>You should see your email listed</li>
              </ol>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                Click the button below to test Google OAuth.
                You should be redirected to Google's login page.
              </p>
            </div>

            <button
              onClick={handleSignIn}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-xs">
                <strong>Note:</strong> If this fails, check:
                <br/>• Google OAuth client ID/secret in Supabase
                <br/>• Redirect URI matches in Google Console
                <br/>• Browser console for errors
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t-2 border-slate-200">
          <p className="text-center text-sm text-slate-500">
            Once this works, we'll build the full schema.
          </p>
        </div>
      </div>
    </div>
  )
}
