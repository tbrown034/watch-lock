'use client'

import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 group cursor-pointer"
    >
      {/* Icon */}
      <div className="w-9 h-9 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
        <Lock className="w-5 h-5 text-white" strokeWidth={2.5} />
      </div>

      {/* Brand text */}
      <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50">
        WatchLock
      </span>
    </Link>
  );
}
