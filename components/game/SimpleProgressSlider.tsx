'use client';

import {
  MlbMeta,
  encodeMlbPosition,
  decodeMlbPosition,
  MLB_PREGAME_POSITION,
  MLB_POSTGAME_POSITION
} from '@/lib/position';
import { GAME_CONSTRAINTS } from '@/lib/constants';
import { MessageSquare } from 'lucide-react';
import { useCallback, useRef } from 'react';

interface MessageMarker {
  position: MlbMeta;
  author: string;
}

interface SimpleProgressSliderProps {
  position: MlbMeta;
  onChange: (position: MlbMeta) => void;
  messageMarkers?: MessageMarker[];
  livePosition?: MlbMeta | null;
  maxInning?: number;
}

export function SimpleProgressSlider({
  position,
  onChange,
  messageMarkers = [],
  livePosition = null,
  maxInning = GAME_CONSTRAINTS.DEFAULT_MAX_INNING
}: SimpleProgressSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);

  const inGameMaxPos = encodeMlbPosition({ sport: 'mlb', inning: maxInning, half: 'BOTTOM', outs: 'END' });
  const normalizedMax = inGameMaxPos + 1;

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

  const currentNormalized = normalizePosition(position);
  const progressPercent = Math.min(100, Math.max(0, (currentNormalized / normalizedMax) * 100));

  // Calculate marker positions on the timeline
  const markerPositions = messageMarkers.map(marker => {
    const percent = Math.min(100, Math.max(0, (normalizePosition(marker.position) / normalizedMax) * 100));
    return { ...marker, percent };
  });

  // Calculate live position percentage
  const livePercent = livePosition
    ? Math.min(100, Math.max(0, (normalizePosition(livePosition) / normalizedMax) * 100))
    : null;

  const handleSliderChange = useCallback((value: number) => {
    const meta = denormalizePosition(Math.round(value));
    onChange({ ...meta, phase: meta.phase ?? (meta.outs === 'END' ? undefined : 'IN_GAME') });
  }, [denormalizePosition, onChange]);

  const updateFromClientX = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (clientX - rect.left) / rect.width;
    const clamped = Math.min(1, Math.max(0, ratio));
    handleSliderChange(clamped * normalizedMax);
  }, [handleSliderChange, normalizedMax]);

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

  return (
    <div className="w-full">
      <div className="relative">
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative h-3 w-full cursor-pointer select-none rounded-full bg-slate-200 dark:bg-slate-700"
        >
          {/* Progress */}
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Message markers */}
          {markerPositions.map((marker, idx) => (
            <div
              key={idx}
              className="absolute top-0 transform -translate-x-1/2"
              style={{ left: `${marker.percent}%` }}
            >
              <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-green-500 transform translate-y-[-14px]"></div>
            </div>
          ))}

          {/* Live position indicator */}
          {livePercent !== null && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-red-500 opacity-70 z-10"
              style={{ left: `${livePercent}%` }}
              title="Live position"
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500 border border-white shadow-sm"></div>
            </div>
          )}

          {/* Current position marker */}
          <div
            className="pointer-events-none absolute -top-[3px] h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow-md z-20"
            style={{ left: `calc(${progressPercent}% - 6px)` }}
          />
        </div>

        <input
          type="range"
          min={0}
          max={normalizedMax}
          step={1}
          value={currentNormalized}
          onChange={(event) => handleSliderChange(Number(event.target.value))}
          className="sr-only"
          aria-label="Adjust your progress in the game"
        />

        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1.5">
          <span>Pregame</span>
          <span>{Math.round(progressPercent)}%</span>
          <span>Postgame</span>
        </div>
      </div>
    </div>
  );
}
