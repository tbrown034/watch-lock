'use client'

import Logo from './Logo';
import AuthHeader from './AuthHeader';

export default function AppHeader() {
  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo - Left Side */}
          <Logo />

          {/* Auth - Right Side */}
          <AuthHeader />
        </div>
      </div>
    </header>
  );
}
