'use client'

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { User as UserIcon, LogIn } from 'lucide-react';

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

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      const firstName = user.user_metadata.full_name.split(' ')[0];
      return firstName.length > 12 ? `${firstName.slice(0, 12)}...` : firstName;
    }
    const email = user?.email?.split('@')[0] || 'User';
    return email.length > 12 ? `${email.slice(0, 12)}...` : email;
  };

  const getUserInitials = () => {
    if (user?.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(' ');
      return names.length > 1
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : names[0][0].toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <div className="flex items-center">
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse">
          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="w-16 h-4 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      ) : user ? (
        <Link
          href="/profile"
          className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 text-sm font-medium text-slate-900 dark:text-slate-50 shadow-sm hover:shadow-md active:scale-95 active:shadow-sm group"
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-semibold group-hover:scale-110 group-active:scale-100 transition-transform duration-200">
            {getUserInitials()}
          </div>
          <span className="hidden sm:inline">{getUserDisplayName()}</span>
        </Link>
      ) : (
        <button
          onClick={handleSignIn}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 active:shadow-sm group"
        >
          <LogIn className="w-4 h-4 group-hover:translate-x-0.5 group-active:translate-x-1 transition-transform duration-200" />
          <span>Sign in</span>
        </button>
      )}
    </div>
  );
}
