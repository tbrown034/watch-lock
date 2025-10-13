'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function HowItWorks() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      >
        <span className="font-bold text-slate-900 dark:text-slate-100">
          How It Works
        </span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-blue-200 dark:border-blue-800">
          <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <li className="flex gap-3">
              <span className="font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">1.</span>
              <span><strong>Leave a message</strong> at any moment during the game</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">2.</span>
              <span><strong>Use the slider</strong> to set where you are in the game (inning, outs, etc.)</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">3.</span>
              <span><strong>No spoilers:</strong> You only see messages from moments you've reached or passed</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">4.</span>
              <span><strong>Green markers</strong> on the slider show where messages are waiting</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
