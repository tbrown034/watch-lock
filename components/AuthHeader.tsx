'use client'

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { User as UserIcon, LogIn } from 'lucide-react';

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
}

export default function AuthHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      // Check if user is already signed in
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Fetch profile data
      if (user) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          console.log('Profile data loaded:', profileData);
          setProfile(profileData);
        }

        // Update last_visited when user visits
        await supabase
          .from('profiles')
          .update({ last_visited: new Date().toISOString() })
          .eq('id', user.id);
      }

      setLoading(false);
    };

    fetchUserAndProfile();

    // Listen for profile updates (when user edits their profile)
    const handleProfileUpdate = async (e: Event) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();

        setProfile(profileData);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch profile
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setProfile(profileData);
        }

        // Update last_visited on sign in
        await supabase
          .from('profiles')
          .update({ last_visited: new Date().toISOString() })
          .eq('id', session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
    };
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
    // Use display_name from profile, fallback to Google given_name, then email
    const displayName = profile?.display_name
      || user?.user_metadata?.given_name
      || user?.email?.split('@')[0]
      || 'User';
    return displayName.length > 12 ? `${displayName.slice(0, 12)}...` : displayName;
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
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={getUserDisplayName()}
              className="w-7 h-7 rounded-full object-cover group-hover:scale-110 group-active:scale-100 transition-transform duration-200"
            />
          ) : (
            <UserIcon className="w-7 h-7 text-slate-600 dark:text-slate-400 group-hover:scale-110 group-active:scale-100 transition-transform duration-200" />
          )}
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
