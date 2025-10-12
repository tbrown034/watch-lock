'use client'

import Link from 'next/link';
import { Building2, Timer, MessageSquare, Lock, Users, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

export default function Home() {
  const audiencePills = ['Families', 'Friends on delay', 'Roommates', 'Fan clubs'];
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Check if user is already signed in
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error('Error signing in:', error);
      alert('Error signing in. Please try again.');
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Auth Header - Top Right */}
      <div className="absolute top-6 right-6 z-50">
        {loading ? (
          <div className="px-4 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full shadow-lg">
            <span className="text-sm text-slate-500">Loading...</span>
          </div>
        ) : user ? (
          <div className="flex items-center gap-3 px-4 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full shadow-lg">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Welcome, {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
            </span>
            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className="px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-full shadow-lg hover:shadow-xl transition-all border border-slate-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        )}
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-5xl w-full text-center relative z-10">
        {/* Hero Section */}
        <div className="mb-16">
          <div className="mb-6 inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <span className="text-blue-700 dark:text-blue-300 font-medium text-sm">
              Built for fans, families, and friends watching apart
            </span>
          </div>

          <h1 className="text-7xl md:text-8xl font-black mb-6 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent">
            WatchLock
          </h1>

          <p className="text-4xl md:text-5xl font-bold mb-8 text-slate-800 dark:text-slate-100">
            Share the highs<br />
            <span className="text-blue-600">without the spoilers</span>
          </p>

          <p className="text-xl text-slate-600 dark:text-slate-400 mb-6 max-w-3xl mx-auto leading-relaxed">
            Watch parties now live across time zones, streaming delays, and group chats. WatchLock keeps every crew—from soccer squads to sibling text threads—celebrating together without stepping on big plays.
          </p>

          <p className="text-lg text-slate-500 dark:text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            Anchor every post to the precise inning, half, or drive so nobody sees a spoiler until they catch up. Instant context, total trust.
          </p>

          {/* Main CTA */}
          {user ? (
            <Link
              href="/games"
              className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-2xl font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-2xl hover:shadow-blue-500/50 transform hover:scale-105 duration-200"
            >
              <span>Explore Game Rooms</span>
              <Building2 className="w-8 h-8" />
            </Link>
          ) : (
            <button
              onClick={handleSignIn}
              className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-2xl font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-2xl hover:shadow-blue-500/50 transform hover:scale-105 duration-200"
            >
              <span>Get Started</span>
              <Building2 className="w-8 h-8" />
            </button>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            {audiencePills.map((label) => (
              <span
                key={label}
                className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-24 grid md:grid-cols-3 gap-6">
          <div className="card-elevated p-8 text-left group hover:scale-105 transition-transform">
            <div className="mb-4 group-hover:scale-110 transition-transform">
              <Timer className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="font-bold text-xl mb-3 text-slate-800 dark:text-slate-100">Set Your Progress</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Set the exact inning, half, and outs so your group knows precisely where you are—no matter which stream or device.
            </p>
          </div>

          <div className="card-elevated p-8 text-left group hover:scale-105 transition-transform">
            <div className="mb-4 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="font-bold text-xl mb-3 text-slate-800 dark:text-slate-100">Leave Reactions</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Drop reactions, emoji bursts, or rally cries. Every note locks to the moment it happened so the meaning never gets lost.
            </p>
          </div>

          <div className="card-elevated p-8 text-left group hover:scale-105 transition-transform">
            <div className="mb-4 group-hover:scale-110 transition-transform">
              <Lock className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="font-bold text-xl mb-3 text-slate-800 dark:text-slate-100">Zero Spoilers</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Teammates, partners, and superfans only see what they have earned. Move forward to unlock the next celebration—spoiler math included.
            </p>
          </div>
        </div>

        {/* Community Snapshot */}
        <div className="mt-20 card-elevated p-8 text-left max-w-2xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Users className="w-10 h-10 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                Designed for every watch crew
              </h3>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
                  <span>Keep mixed streaming speeds in sync with spoiler-proof message filtering.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
                  <span>Mark every update with precise inning, drive, or moment metadata for full context.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
                  <span>Build private rooms for families, rec teams, alumni clubs, or fantasy leagues in minutes.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
