/**
 * QuickActions Component
 *
 * Action buttons for common profile page tasks
 */

'use client'

import Link from 'next/link';
import { PlayCircle, Users } from 'lucide-react';

interface QuickActionsProps {
  onJoinRoom: () => void;
}

export function QuickActions({ onJoinRoom }: QuickActionsProps) {
  return (
    <div className="p-6 border-b border-slate-200 dark:border-slate-700 space-y-3">
      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/games"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95 text-sm group"
        >
          <PlayCircle className="w-5 h-5 group-hover:scale-110 transition-transform" strokeWidth={2} />
          <span>View Today's Games</span>
        </Link>
        <button
          onClick={onJoinRoom}
          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 font-semibold rounded-lg transition-colors text-sm group"
        >
          <Users className="w-5 h-5 group-hover:scale-110 transition-transform" strokeWidth={2} />
          <span>Join a Room</span>
        </button>
      </div>
    </div>
  );
}
