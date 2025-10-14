'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { ArrowLeft, Calendar, Clock, Mail, User as UserIcon, LogOut } from 'lucide-react';
import Link from 'next/link';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  last_visited: string | null;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push('/');
        return;
      }

      setUser(user);

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else {
        setProfile(profileData);
      }

      setLoading(false);
    };

    fetchUserAndProfile();
  }, [supabase, router]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      router.push('/');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm uppercase tracking-wide text-slate-500">Loading</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Loading profile...</h1>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-6 text-sm font-medium group transition-colors"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>Home</span>
          </Link>

          {/* Profile Card */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            {/* Header Section */}
            <div className="border-b border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                  <UserIcon className="w-8 h-8 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {profile.display_name || user.user_metadata?.full_name || profile.username}
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                </div>
              </div>
            </div>

          {/* Stats Section */}
          <div className="p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
              Account Info
            </h2>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" strokeWidth={2} />
                <div className="flex-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Email</div>
                  <div className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" strokeWidth={2} />
                <div className="flex-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Member Since</div>
                  <div className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                    {formatDate(profile.created_at)}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg transition-all text-sm font-medium"
              >
                <LogOut className="w-4 h-4" strokeWidth={2} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
