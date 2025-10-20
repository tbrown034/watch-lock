/**
 * SignOutButton Component
 *
 * Button to sign out the current user
 */

'use client'

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="p-6 border-t border-slate-200 dark:border-slate-700">
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg transition-all text-sm font-medium"
      >
        <LogOut className="w-4 h-4" strokeWidth={2} />
        <span>Sign Out</span>
      </button>
    </div>
  );
}
