'use client';

import { useState } from 'react';
import { MlbMeta, encodeMlbPosition, formatMlbPosition } from '@/lib/position';

interface ProgressSliderProps {
  position: MlbMeta;
  onChange: (position: MlbMeta) => void;
  isLive?: boolean;
  maxInning?: number;
}

export function ProgressSlider({
  position,
  onChange,
  isLive = false,
  maxInning = 9
}: ProgressSliderProps) {
  const [localPosition, setLocalPosition] = useState(position);

  const handleInningChange = (inning: number) => {
    const newPosition: MlbMeta = { ...localPosition, inning };
    setLocalPosition(newPosition);
    onChange(newPosition);
  };

  const handleHalfChange = (half: 'TOP' | 'BOTTOM') => {
    const newPosition: MlbMeta = { ...localPosition, half };
    setLocalPosition(newPosition);
    onChange(newPosition);
  };

  const handleOutsChange = (outs: 0 | 1 | 2) => {
    const newPosition: MlbMeta = { ...localPosition, outs };
    setLocalPosition(newPosition);
    onChange(newPosition);
  };

  const currentPos = encodeMlbPosition(localPosition);
  const maxPos = encodeMlbPosition({ sport: 'mlb', inning: maxInning, half: 'BOTTOM', outs: 2 });
  const progressPercent = (currentPos / maxPos) * 100;

  return (
    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Your Progress</h3>
        {isLive && (
          <span className="px-3 py-1 bg-green-500 text-white text-sm font-medium rounded-full">
            LIVE
          </span>
        )}
      </div>

      <div className="text-2xl font-bold mb-4 text-center">
        {formatMlbPosition(localPosition)}
      </div>

      <div className="space-y-4">
        {/* Inning Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Inning</label>
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {Array.from({ length: maxInning }, (_, i) => i + 1).map((inning) => (
              <button
                key={inning}
                onClick={() => handleInningChange(inning)}
                className={`px-3 py-2 rounded-md font-medium transition ${
                  localPosition.inning === inning
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {inning}
              </button>
            ))}
          </div>
        </div>

        {/* Half Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Half</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleHalfChange('TOP')}
              className={`px-4 py-2 rounded-md font-medium transition ${
                localPosition.half === 'TOP'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Top ▲
            </button>
            <button
              onClick={() => handleHalfChange('BOTTOM')}
              className={`px-4 py-2 rounded-md font-medium transition ${
                localPosition.half === 'BOTTOM'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Bottom ▼
            </button>
          </div>
        </div>

        {/* Outs Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Outs</label>
          <div className="flex space-x-2">
            {[0, 1, 2].map((outs) => (
              <button
                key={outs}
                onClick={() => handleOutsChange(outs as 0 | 1 | 2)}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition ${
                  localPosition.outs === outs
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {outs}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1st</span>
            <span>{Math.round(progressPercent)}%</span>
            <span>9th</span>
          </div>
        </div>
      </div>
    </div>
  );
}