'use client'

import Logo from './Logo';
import AuthHeader from './AuthHeader';

export default function AppHeader() {
  return (
    <header className="w-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between">
          <Logo />
          <AuthHeader />
        </div>
      </div>
    </header>
  );
}
