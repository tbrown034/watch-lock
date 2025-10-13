'use client'

import Link from 'next/link';
import { Lock, Github, Twitter } from 'lucide-react';

export default function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 mt-auto shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-md">
              <Lock className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-base font-bold text-slate-800 dark:text-slate-200">WatchLock</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">No Spoilers, Just Vibes</div>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link href="/games" className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors font-medium">
              Games
            </Link>
            <Link href="/profile" className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors font-medium">
              Profile
            </Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">
              <Github className="w-5 h-5" />
            </a>
          </div>

          {/* Copyright */}
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            © {currentYear} WatchLock. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
