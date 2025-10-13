'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { ArrowLeft, Calendar, Clock, Mail, User as UserIcon, LogOut } from 'lucide-react';
import Link from 'next/link';
import AuthHeader from '@/components/AuthHeader';
import Logo from '@/components/Logo';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Loading profile...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 relative">
      {/* Logo - Top Left */}
      <Logo />

      {/* Auth Header - Top Right */}
      <AuthHeader />

      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <UserIcon className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {profile.display_name || user.user_metadata?.full_name || profile.username}
                </h1>
                <p className="text-blue-100">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="p-8 space-y-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
              Account Information
            </h2>

            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Email</div>
                  <div className="text-slate-800 dark:text-slate-100 font-medium">
                    {user.email}
                  </div>
                </div>
              </div>

              {/* Account Created */}
              <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Member Since</div>
                  <div className="text-slate-800 dark:text-slate-100 font-medium">
                    {formatDate(profile.created_at)}
                  </div>
                </div>
              </div>

              {/* Last Visited */}
              {profile.last_visited && (
                <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Last Visited</div>
                    <div className="text-slate-800 dark:text-slate-100 font-medium">
                      {formatDateTime(profile.last_visited)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
