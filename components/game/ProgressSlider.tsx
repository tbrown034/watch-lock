'use client';

import { useCallback, useRef, useState } from 'react';
import {
  MlbMeta,
  MlbPhase,
  encodeMlbPosition,
  decodeMlbPosition,
  formatMlbPosition,
  MLB_PREGAME_POSITION,
  MLB_POSTGAME_POSITION
} from '@/lib/position';

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
  const trackRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);

  const phase: MlbPhase = localPosition.phase ?? 'IN_GAME';
  const isPregame = phase === 'PREGAME';
  const isPostgame = phase === 'POSTGAME';
  const isInGame = !isPregame && !isPostgame;

  const updatePosition = useCallback((next: MlbMeta) => {
    setLocalPosition(next);
    onChange(next);
  }, [onChange]);

  const handleInningChange = (inning: number) => {
    updatePosition({ ...localPosition, inning });
  };

  const handleHalfChange = (half: 'TOP' | 'BOTTOM') => {
    updatePosition({ ...localPosition, half });
  };

  const handleOutsChange = (outs: 0 | 1 | 2 | 'END') => {
    updatePosition({ ...localPosition, outs });
  };

  const handlePhaseChange = (nextPhase: MlbPhase) => {
    if (nextPhase === 'PREGAME') {
      updatePosition({ sport: 'mlb', inning: 1, half: 'TOP', outs: 0, phase: 'PREGAME' });
      return;
    }

    if (nextPhase === 'POSTGAME') {
      updatePosition({ ...localPosition, outs: 'END', phase: 'POSTGAME' });
      return;
    }

    updatePosition({
      sport: 'mlb',
      inning: localPosition.inning,
      half: localPosition.half,
      outs: localPosition.outs === 'END' ? 0 : localPosition.outs
    });
  };

  const inGameMax = encodeMlbPosition({ sport: 'mlb', inning: maxInning, half: 'BOTTOM', outs: 'END' });
  const normalizedMax = inGameMax + 1;

  const normalizePosition = useCallback((meta: MlbMeta) => {
    const encoded = encodeMlbPosition(meta);
    if (encoded <= MLB_PREGAME_POSITION) return 0;
    if (encoded >= MLB_POSTGAME_POSITION) return normalizedMax;
    return encoded + 1;
  }, [normalizedMax]);

  const denormalizePosition = useCallback((value: number): MlbMeta => {
    if (value <= 0) {
      return { sport: 'mlb', inning: 1, half: 'TOP', outs: 0, phase: 'PREGAME' };
    }

    if (value >= normalizedMax) {
      return { sport: 'mlb', inning: maxInning, half: 'BOTTOM', outs: 'END', phase: 'POSTGAME' };
    }

    return decodeMlbPosition(value - 1);
  }, [maxInning, normalizedMax]);

  const normalizedPos = normalizePosition(localPosition);
  const progressPercent = Math.min(100, Math.max(0, (normalizedPos / normalizedMax) * 100));

  const handleNormalizedChange = useCallback((value: number) => {
    const meta = denormalizePosition(Math.round(value));
    updatePosition({
      ...meta,
      phase: meta.phase ?? (meta.outs === 'END' ? undefined : 'IN_GAME')
    });
  }, [denormalizePosition, updatePosition]);

  const updateFromClientX = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (clientX - rect.left) / rect.width;
    const clamped = Math.min(1, Math.max(0, ratio));
    handleNormalizedChange(clamped * normalizedMax);
  }, [handleNormalizedChange, normalizedMax]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    pointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromClientX(event.clientX);
  }, [updateFromClientX]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    updateFromClientX(event.clientX);
  }, [updateFromClientX]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    pointerIdRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const halfLabel = localPosition.half === 'TOP' ? `Top ${localPosition.inning}` : `Bottom ${localPosition.inning}`;
  const nextHalfLabel = localPosition.half === 'TOP' ? `Bottom ${localPosition.inning}` : `Top ${localPosition.inning + 1}`;
  const isHalfComplete = isInGame && localPosition.outs === 'END';
  const buttonDisabledClass = !isInGame ? 'opacity-60 cursor-not-allowed' : '';

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
        <div>
          <label className="block text-sm font-medium mb-2">Phase</label>
          <div className="flex flex-wrap gap-2">
            {(['PREGAME', 'IN_GAME', 'POSTGAME'] as MlbPhase[]).map((phaseOption) => (
              <button
                key={phaseOption}
                onClick={() => handlePhaseChange(phaseOption)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  phase === phaseOption
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {phaseOption === 'PREGAME' ? 'Pregame' : phaseOption === 'POSTGAME' ? 'Postgame' : 'In-game'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Inning</label>
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {Array.from({ length: maxInning }, (_, i) => i + 1).map((inning) => (
              <button
                key={inning}
                onClick={() => handleInningChange(inning)}
                disabled={!isInGame}
                className={`px-3 py-2 rounded-md font-medium transition ${
                  localPosition.inning === inning && isInGame
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                } ${buttonDisabledClass}`}
              >
                {inning}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Half</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleHalfChange('TOP')}
              disabled={!isInGame}
              className={`px-4 py-2 rounded-md font-medium transition ${
                localPosition.half === 'TOP' && isInGame
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              } ${buttonDisabledClass}`}
            >
              Top ▲
            </button>
            <button
              onClick={() => handleHalfChange('BOTTOM')}
              disabled={!isInGame}
              className={`px-4 py-2 rounded-md font-medium transition ${
                localPosition.half === 'BOTTOM' && isInGame
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              } ${buttonDisabledClass}`}
            >
              Bottom ▼
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Outs</label>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2].map((outs) => (
              <button
                key={outs}
                onClick={() => handleOutsChange(outs as 0 | 1 | 2)}
                disabled={!isInGame}
                className={`px-3 py-2 rounded-md font-medium transition ${
                  localPosition.outs === outs && isInGame
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                } ${buttonDisabledClass}`}
              >
                {outs}
              </button>
            ))}
            <button
              onClick={() => handleOutsChange('END')}
              disabled={!isInGame}
              className={`px-3 py-2 rounded-md font-medium transition ${
                localPosition.outs === 'END' && isInGame
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-400'
              } ${buttonDisabledClass}`}
            >
              End
            </button>
          </div>
        </div>

        <div>
          <div
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative h-2 w-full cursor-pointer select-none rounded-full bg-gray-300 dark:bg-gray-600"
          >
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="absolute -top-[6px] h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow"
              style={{ left: `calc(${progressPercent}% - 8px)` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={normalizedMax}
            step={1}
            value={normalizedPos}
            onChange={(event) => handleNormalizedChange(Number(event.target.value))}
            className="sr-only"
            aria-label="Adjust progress with keyboard"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Pregame</span>
            <span>{Math.round(progressPercent)}%</span>
            <span>Postgame</span>
          </div>
          {isHalfComplete && (
            <div className="mt-2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
              End of {halfLabel}. Switch to {nextHalfLabel} or mark postgame when the game wraps.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
