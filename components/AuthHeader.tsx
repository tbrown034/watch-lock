'use client'

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function AuthHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Check if user is already signed in
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);

      // Update last_visited when user visits
      if (user) {
        supabase
          .from('profiles')
          .update({ last_visited: new Date().toISOString() })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) {
              console.error('Error updating last_visited:', error);
            }
          });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      // Update last_visited on sign in
      if (session?.user) {
        supabase
          .from('profiles')
          .update({ last_visited: new Date().toISOString() })
          .eq('id', session.user.id)
          .then(({ error }) => {
            if (error) {
              console.error('Error updating last_visited:', error);
            }
          });
      }
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
    <div>
      {loading ? (
        <div className="px-4 py-2.5 sm:px-5 sm:py-3 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl">
          <span className="text-sm sm:text-base text-slate-500 dark:text-slate-400">Loading...</span>
        </div>
      ) : user ? (
        <Link
          href="/profile"
          className="px-4 py-2.5 sm:px-5 sm:py-3 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-xl transition-all"
        >
          <span className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300">
            {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
          </span>
        </Link>
      ) : (
        <button
          onClick={handleSignIn}
          className="px-4 py-2.5 sm:px-5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm sm:text-base rounded-xl transition-all"
        >
          <span>Sign in</span>
        </button>
      )}
    </div>
  );
}
