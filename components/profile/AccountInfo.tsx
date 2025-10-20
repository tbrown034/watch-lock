/**
 * AccountInfo Component
 *
 * Displays user account information (email, member since)
 */

import { User } from '@supabase/supabase-js';
import { Calendar, Mail } from 'lucide-react';

interface AccountInfoProps {
  user: User;
  createdAt: string;
}

export function AccountInfo({ user, createdAt }: AccountInfoProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
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
              {formatDate(createdAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
