'use client'

import Link from 'next/link';
import { Building2, Timer, MessageSquare, Lock, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';

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
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <main className="flex flex-1 flex-col items-center justify-center p-8 relative overflow-hidden">
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
              className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-2xl font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-2xl hover:shadow-blue-500/50 transform hover:scale-105 duration-200 cursor-pointer"
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

    <AppFooter />
  </div>
  )
}
