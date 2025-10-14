'use client';

import {
  MlbMeta,
  NflMeta,
  encodeMlbPosition,
  encodeNflPosition,
  decodeMlbPosition,
  decodeNflPosition,
  MLB_PREGAME_POSITION,
  MLB_POSTGAME_POSITION,
  NFL_PREGAME_POSITION,
  NFL_POSTGAME_POSITION
} from '@/lib/position';
import { GAME_CONSTRAINTS } from '@/lib/constants';
import { MessageSquare } from 'lucide-react';
import { useCallback, useRef } from 'react';

interface MessageMarker {
  position: MlbMeta | NflMeta;
  author: string;
}

interface SimpleProgressSliderProps {
  position: MlbMeta | NflMeta;
  onChange: (position: MlbMeta | NflMeta) => void;
  messageMarkers?: MessageMarker[];
  livePosition?: MlbMeta | NflMeta | null;
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

  const isNfl = position.sport === 'nfl';

  // Calculate max position based on sport
  const inGameMaxPos = isNfl
    ? encodeNflPosition({ sport: 'nfl', quarter: 4, time: '0:00', possession: null })
    : encodeMlbPosition({ sport: 'mlb', inning: maxInning, half: 'BOTTOM', outs: 'END' });
  const normalizedMax = inGameMaxPos + 1;

  const normalizePosition = useCallback((meta: MlbMeta | NflMeta) => {
    const encoded = meta.sport === 'nfl'
      ? encodeNflPosition(meta as NflMeta)
      : encodeMlbPosition(meta as MlbMeta);

    const PREGAME = meta.sport === 'nfl' ? NFL_PREGAME_POSITION : MLB_PREGAME_POSITION;
    const POSTGAME = meta.sport === 'nfl' ? NFL_POSTGAME_POSITION : MLB_POSTGAME_POSITION;

    if (encoded <= PREGAME) return 0;
    if (encoded >= POSTGAME) return normalizedMax;
    return encoded + 1;
  }, [normalizedMax]);

  const denormalizePosition = useCallback((value: number): MlbMeta | NflMeta => {
    if (value <= 0) {
      return isNfl
        ? { sport: 'nfl', quarter: 1, time: '15:00', possession: null, phase: 'PREGAME' }
        : { sport: 'mlb', inning: 1, half: 'TOP', outs: 0, phase: 'PREGAME' };
    }

    if (value >= normalizedMax) {
      return isNfl
        ? { sport: 'nfl', quarter: 4, time: '0:00', possession: null, phase: 'POSTGAME' }
        : { sport: 'mlb', inning: maxInning, half: 'BOTTOM', outs: 'END', phase: 'POSTGAME' };
    }

    return isNfl
      ? decodeNflPosition(value - 1)
      : decodeMlbPosition(value - 1);
  }, [maxInning, normalizedMax, isNfl]);

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

    // Set default phase if not set
    if (meta.sport === 'mlb') {
      const mlbMeta = meta as MlbMeta;
      onChange({ ...mlbMeta, phase: mlbMeta.phase ?? (mlbMeta.outs === 'END' ? undefined : 'IN_GAME') });
    } else {
      // NFL meta already has phase set
      onChange(meta);
    }
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
    <div className="w-full py-2">
      <div className="relative">
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative h-4 w-full cursor-pointer select-none rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          {/* Progress */}
          <div
            className="bg-blue-600 h-4 rounded-full transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Message markers */}
          {markerPositions.map((marker, idx) => (
            <div
              key={idx}
              className="absolute top-0 transform -translate-x-1/2"
              style={{ left: `${marker.percent}%` }}
            >
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[9px] border-t-green-500 transform translate-y-[-16px]"></div>
            </div>
          ))}

          {/* Live position indicator */}
          {livePercent !== null && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-red-500 opacity-70 z-10"
              style={{ left: `${livePercent}%` }}
              title="Live position"
            >
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-red-500 border border-white shadow-sm"></div>
            </div>
          )}

          {/* Current position marker */}
          <div
            className="pointer-events-none absolute -top-[4px] h-5 w-5 rounded-full border-2 border-white bg-blue-600 shadow-lg z-20"
            style={{ left: `calc(${progressPercent}% - 10px)` }}
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

        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2.5">
          <span>Pregame</span>
          <span className="font-medium">{Math.round(progressPercent)}%</span>
          <span>Postgame</span>
        </div>
      </div>
    </div>
  );
}
