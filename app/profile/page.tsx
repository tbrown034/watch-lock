'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { ArrowLeft, Calendar, Clock, Mail, User as UserIcon, LogOut, Users, Trash2, ExternalLink, Edit2, X, Check, Share2 } from 'lucide-react';
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedDisplayName, setEditedDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [shareModalRoom, setShareModalRoom] = useState<Room | null>(null);
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

      // Fetch user's rooms
      const { data: roomsData, error: roomsError } = await fetch('/api/users/me/rooms').then(res => res.json());

      if (roomsError) {
        console.error('Error fetching rooms:', roomsError);
      } else if (roomsData) {
        setRooms(roomsData.rooms || []);
      }

      setLoading(false);
    };

    fetchUserAndProfile();
  }, [supabase, router]);

  const handleEditName = () => {
    setEditedDisplayName(profile?.display_name || '');
    setIsEditingName(true);
    setNameError(null);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedDisplayName('');
    setNameError(null);
  };

  const handleSaveName = async () => {
    if (!user || !profile) return;

    setSavingName(true);
    setNameError(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: editedDisplayName.trim() || null })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // Update local state
      setProfile({
        ...profile,
        display_name: editedDisplayName.trim() || null
      });

      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating display name:', error);
      setNameError(error instanceof Error ? error.message : 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

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

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      router.push('/');
    }
  };

  const handleCopyShareCode = async (shareCode: string) => {
    try {
      await navigator.clipboard.writeText(shareCode);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy share code:', error);
      alert('Failed to copy share code. Please copy manually: ' + shareCode);
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
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md shrink-0">
                  <UserIcon className="w-8 h-8 text-white" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  {isEditingName ? (
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="displayName" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Display Name
                        </label>
                        <input
                          id="displayName"
                          type="text"
                          value={editedDisplayName}
                          onChange={(e) => setEditedDisplayName(e.target.value)}
                          placeholder={profile.username}
                          className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 text-sm"
                          maxLength={50}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Leave empty to use username: @{profile.username}
                        </p>
                      </div>
                      {nameError && (
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                          {nameError}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveName}
                          disabled={savingName}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Check className="w-4 h-4" />
                          {savingName ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={savingName}
                          className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
                          {profile.display_name || user.user_metadata?.full_name || profile.username}
                        </h1>
                        <button
                          onClick={handleEditName}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                          title="Edit display name"
                        >
                          <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">@{profile.username}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{user.email}</p>
                    </div>
                  )}
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
          </div>

          {/* Rooms Section */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-700">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
              My Rooms ({rooms.length})
            </h2>

            {rooms.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No rooms yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Create or join a room to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                  >
                    <div className="space-y-3">
                      {/* Room header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {room.name}
                            </h3>
                            {room.isOwner && (
                              <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-semibold rounded">
                                Owner
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {room.memberCount}/{room.maxMembers}
                            </span>
                            <span>•</span>
                            <span className="font-mono font-semibold">{room.shareCode}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {room.gameId && (
                          <Link
                            href={`/games/${room.gameId}`}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
                            Enter Room
                          </Link>
                        )}
                        <button
                          onClick={() => setShareModalRoom(room)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 text-xs font-semibold rounded-lg transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" strokeWidth={2} />
                          Share
                        </button>
                        {room.isOwner && (
                          <button
                            onClick={() => handleDeleteRoom(room.id)}
                            disabled={deletingRoomId === room.id}
                            className="px-3 py-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold"
                            title="Delete room"
                          >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sign Out Section */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-700">
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

      {/* Share Modal */}
      {shareModalRoom && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Share Room
              </h2>
              <button
                onClick={() => setShareModalRoom(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Room name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Room
                </label>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  {shareModalRoom.name}
                </p>
              </div>

              {/* Share code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Share Code
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                    <p className="text-2xl font-bold font-mono text-center text-slate-900 dark:text-slate-100 tracking-wider">
                      {shareModalRoom.shareCode}
                    </p>
                  </div>
                </div>
              </div>

              {/* Copy button */}
              <button
                onClick={() => {
                  handleCopyShareCode(shareModalRoom.shareCode);
                  setTimeout(() => setShareModalRoom(null), 1000);
                }}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Copy Share Code
              </button>

              <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                Share this code with friends so they can join your watch party
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
