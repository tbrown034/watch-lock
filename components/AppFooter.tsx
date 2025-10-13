'use client'

import Link from 'next/link';
import { Lock, Github, Twitter } from 'lucide-react';

export default function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-500" strokeWidth={2.5} />
            <span className="font-semibold text-slate-900 dark:text-slate-200">WatchLock</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/games" className="text-slate-600 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 transition-colors font-medium">
              Games
            </Link>
            <Link href="/profile" className="text-slate-600 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 transition-colors font-medium">
              Profile
            </Link>
          </div>

          <div className="text-slate-500 dark:text-slate-400 font-medium">
            © {currentYear}
          </div>
        </div>
      </div>
    </footer>
  );
}
