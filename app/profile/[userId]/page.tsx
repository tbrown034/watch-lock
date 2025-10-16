'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, User as UserIcon } from 'lucide-react';
import Link from 'next/link';

interface PublicProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/users/${userId}/profile`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load profile');
        }

        setProfile(data.profile);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Profile Not Found</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{error || 'This user does not exist.'}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
          >
            <span>←</span>
            <span>Home</span>
          </Link>
        </div>
      </div>
    );
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
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md shrink-0">
                  <UserIcon className="w-8 h-8 text-white" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate mb-1">
                    {profile.display_name || profile.username}
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">@{profile.username}</p>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
                Account Info
              </h2>

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
          </div>
        </div>
      </div>
    </div>
  );
}
