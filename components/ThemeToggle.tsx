'use client'

import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 active:shadow-sm group"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative w-5 h-5">
        {/* Moon icon for light mode */}
        <Moon
          className={`absolute inset-0 w-5 h-5 text-slate-700 transition-all duration-300 ${
            theme === 'light'
              ? 'rotate-0 opacity-100 scale-100'
              : 'rotate-90 opacity-0 scale-50'
          }`}
        />
        {/* Sun icon for dark mode */}
        <Sun
          className={`absolute inset-0 w-5 h-5 text-yellow-500 transition-all duration-300 ${
            theme === 'dark'
              ? 'rotate-0 opacity-100 scale-100'
              : '-rotate-90 opacity-0 scale-50'
          }`}
        />
      </div>
    </button>
  );
}
