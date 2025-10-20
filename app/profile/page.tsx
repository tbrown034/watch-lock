/**
 * Profile Page
 *
 * User profile with account info, rooms list, and settings
 * Refactored into smaller, focused components
 */

'use client'

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { RoomJoinModal } from '@/components/room/RoomJoinModal';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { QuickActions } from '@/components/profile/QuickActions';
import { AccountInfo } from '@/components/profile/AccountInfo';
import { RoomsList } from '@/components/profile/RoomsList';
import { SignOutButton } from '@/components/profile/SignOutButton';

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  last_visited: string | null;
}

interface Room {
  id: string;
  name: string;
  shareCode: string;
  maxMembers: number;
  memberCount: number;
  isOwner: boolean;
  role: string;
  joinedAt: string;
  createdAt: string;
  gameId?: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error('Not authenticated:', authError);
          setLoading(false);
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
          // Profile doesn't exist - this is a problem with the trigger
          // For now, show an error or redirect
          alert('Profile not found. Please contact support or try signing out and back in.');
        } else {
          setProfile(profileData);
        }

        // Fetch user's rooms
        const roomsResponse = await fetch('/api/users/me/rooms');
        const roomsData = await roomsResponse.json();

        if (roomsData.error) {
          console.error('Error fetching rooms:', roomsData.error);
        } else if (roomsData.rooms) {
          setRooms(roomsData.rooms);
        }

        setLoading(false);
      } catch (err) {
        console.error('Profile page error:', err);
        setLoading(false);
      }
    };

    fetchUserAndProfile();
  }, [router, supabase]);

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      return;
    }

    setDeletingRoomId(roomId);

    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete room');
      }

      // Remove room from local state
      setRooms(rooms.filter(r => r.id !== roomId));
    } catch (error) {
      console.error('Error deleting room:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete room');
    } finally {
      setDeletingRoomId(null);
    }
  };

  const handleJoinSuccess = (gameId: string) => {
    setShowJoinModal(false);
    router.push(`/games/${gameId}`);
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
    // User is not signed in - show sign in prompt
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Not Signed In</h1>
            <p className="text-slate-600 dark:text-slate-400">
              You need to sign in to view your profile
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
                  },
                });
                if (error) {
                  console.error('Error signing in:', error);
                  alert('Error signing in. Please try again.');
                }
              }}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
            >
              Sign in with Google
            </button>

            <Link
              href="/"
              className="block text-sm text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
            >
              ← Back to home
            </Link>
          </div>
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
            <ProfileHeader
              user={user}
              profile={profile}
              onProfileUpdate={setProfile}
            />

            {/* Quick Actions Section */}
            <QuickActions onJoinRoom={() => setShowJoinModal(true)} />

            {/* Account Info Section */}
            <AccountInfo user={user} createdAt={profile.created_at} />

            {/* Rooms Section */}
            <RoomsList
              rooms={rooms}
              onDeleteRoom={handleDeleteRoom}
              deletingRoomId={deletingRoomId}
            />

            {/* Sign Out Section */}
            <SignOutButton />
          </div>
        </div>
      </div>

      {/* Join Room Modal */}
      {showJoinModal && (
        <RoomJoinModal
          onClose={() => setShowJoinModal(false)}
          onSuccess={handleJoinSuccess}
        />
      )}
    </div>
  );
}
