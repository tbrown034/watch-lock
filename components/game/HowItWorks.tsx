'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

export function HowItWorks() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500 group-hover:text-blue-600 transition-colors" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            How this works
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              <span className="text-slate-700 dark:text-slate-300">Use the slider</span> to set where you are in the game.
              Leave messages at any moment—they'll appear as <span className="text-blue-600 dark:text-blue-400 font-medium">markers</span> on the timeline.
            </p>
            <p>
              <span className="text-slate-700 dark:text-slate-300">No spoilers:</span> You'll only see messages from moments you've already reached or passed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
