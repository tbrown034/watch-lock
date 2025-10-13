'use client'

import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 group cursor-pointer"
    >
      {/* Icon with gradient background */}
      <div className="relative">
        <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all group-hover:scale-105 duration-200">
          <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
        </div>
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-blue-500/20 rounded-lg blur-md -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
      </div>

      {/* Brand text */}
      <div className="flex flex-col leading-tight">
        <span className="text-lg sm:text-xl font-black bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          WatchLock
        </span>
      </div>
    </Link>
  );
}
