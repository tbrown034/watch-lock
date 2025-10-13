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
        <div className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
          <span className="text-xs sm:text-sm text-slate-500">Loading...</span>
        </div>
      ) : user ? (
        <Link
          href="/profile"
          className="flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full hover:shadow-md transition-all cursor-pointer"
        >
          <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:inline">
            Welcome, {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
          </span>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 sm:hidden">
            {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
          </span>
          <div className="w-6 h-6 sm:w-7 sm:h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs sm:text-sm text-white font-bold">
              {(user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
            </span>
          </div>
        </Link>
      ) : (
        <button
          onClick={handleSignIn}
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs sm:text-sm rounded-full hover:shadow-md transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 sm:gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="hidden sm:inline">Sign in with Google</span>
          <span className="sm:hidden">Sign in</span>
        </button>
      )}
    </div>
  );
}
