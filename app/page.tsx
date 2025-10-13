'use client'

import Link from 'next/link';
import { Building2, Timer, MessageSquare, Lock, Users } from 'lucide-react';
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
  }, [supabase]);

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

  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 sm:px-6 lg:px-8 md:py-20">
      <div className="w-full max-w-3xl text-center">
        {/* Hero Section */}
        <div className="mb-16 space-y-8 md:mb-20 md:space-y-10">
          <div className="space-y-5 md:space-y-6">
            <p className="text-sm text-slate-600 dark:text-slate-400 tracking-wide">
              Built for fans, families, and friends watching apart
            </p>
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-black text-blue-600 dark:text-blue-500 tracking-tighter leading-none">
              WatchLock
            </h1>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
                Share the highs
              </p>
              <p className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-500">
                without the spoilers
              </p>
            </div>
          </div>

          <div className="mx-auto max-w-xl space-y-3">
            <p className="text-lg text-slate-700 dark:text-slate-300">
              Watch parties now live across time zones, streaming delays, and group chats. WatchLock keeps every crew—from soccer squads to sibling text threads—celebrating together without stepping on big plays.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Anchor every post to the precise inning, half, or drive so nobody sees a spoiler until they catch up. Instant context, total trust.
            </p>
          </div>

          {/* Main CTA */}
          <div className="space-y-4">
            {user ? (
              <Link
                href="/games"
                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md inline-flex items-center gap-2.5 text-base"
              >
                <span>Explore Game Rooms</span>
                <Building2 className="h-5 w-5" />
              </Link>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md inline-flex items-center gap-2.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{loading ? 'Loading...' : 'Explore Game Rooms'}</span>
                <Building2 className="h-5 w-5" />
              </button>
            )}

            <div className="flex flex-wrap justify-center gap-2 text-sm font-medium">
              {audiencePills.map((label) => (
                <span
                  key={label}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700/50 rounded-lg bg-slate-100 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16 grid gap-6 text-left sm:grid-cols-3 md:mb-20 md:gap-8">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md space-y-4 p-6 group cursor-default">
            <Timer className="h-10 w-10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300" strokeWidth={2} aria-hidden="true" />
            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-50">Set Your Progress</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Set the exact inning, half, and outs so your group knows precisely where you are—no matter which stream or device.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md space-y-4 p-6 group cursor-default">
            <MessageSquare className="h-10 w-10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300" strokeWidth={2} aria-hidden="true" />
            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-50">Leave Reactions</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Drop reactions, emoji bursts, or rally cries. Every note locks to the moment it happened so the meaning never gets lost.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md space-y-4 p-6 group cursor-default">
            <Lock className="h-10 w-10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300" strokeWidth={2} aria-hidden="true" />
            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-50">Zero Spoilers</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Teammates, partners, and superfans only see what they have earned. Move forward to unlock the next celebration—spoiler math included.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
