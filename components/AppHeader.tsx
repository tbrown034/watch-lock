"use client";

import Logo from "./Logo";
import AuthHeader from "./AuthHeader";
import ThemeToggle from "./ThemeToggle";

export default function AppHeader() {
  return (
    <header className="w-full sticky top-0 z-50 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <AuthHeader />
          </div>
        </div>
      </div>
    </header>
  );
}
