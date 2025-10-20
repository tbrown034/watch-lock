/**
 * AppFooter Component
 *
 * Server Component - Date calculation happens at build/request time on server
 * No client-side features needed
 */

import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
            <span className="font-semibold text-slate-900 dark:text-slate-50">WatchLock</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/games" className="text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors font-medium">
              Games
            </Link>
            <Link href="/profile" className="text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors font-medium">
              Profile
            </Link>
          </div>

          <div className="text-slate-500 dark:text-slate-400">
            © {currentYear}
          </div>
        </div>
      </div>
    </footer>
  );
}
