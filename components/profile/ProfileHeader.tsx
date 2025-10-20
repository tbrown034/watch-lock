/**
 * ProfileHeader Component
 *
 * Displays user avatar, name, email with inline editing for display name
 */

'use client'

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { User as UserIcon, Edit2, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  last_visited: string | null;
}

interface ProfileHeaderProps {
  user: User;
  profile: Profile;
  onProfileUpdate: (profile: Profile) => void;
}

export function ProfileHeader({ user, profile, onProfileUpdate }: ProfileHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedDisplayName, setEditedDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const supabase = createClient();

  const handleEditName = () => {
    setEditedDisplayName(profile.display_name || '');
    setIsEditingName(true);
    setNameError(null);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedDisplayName('');
    setNameError(null);
  };

  const handleSaveName = async () => {
    setSavingName(true);
    setNameError(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: editedDisplayName.trim() || null })
        .eq('id', user.id);

      if (error) throw error;

      // Update parent state
      const updatedProfile = {
        ...profile,
        display_name: editedDisplayName.trim() || null
      };
      onProfileUpdate(updatedProfile);

      setIsEditingName(false);

      // Dispatch event to update AuthHeader
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (error) {
      console.error('Error updating display name:', error);
      setNameError(error instanceof Error ? error.message : 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  return (
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
                  placeholder="Your display name"
                  className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 text-sm"
                  maxLength={50}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  This is your display name - typically your first name, but you can change it to anything you like.
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
                  {profile.display_name || user.user_metadata?.given_name || 'User'}
                </h1>
                <button
                  onClick={handleEditName}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                  title="Edit display name"
                >
                  <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{user.email}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
