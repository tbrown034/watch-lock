'use client';

import {
  MlbMeta,
  MlbPhase,
  encodeMlbPosition,
  decodeMlbPosition,
  formatMlbPosition,
  formatMlbPositionWithTeams,
  MLB_PREGAME_POSITION,
  MLB_POSTGAME_POSITION
} from '@/lib/position';
import { GAME_CONSTRAINTS } from '@/lib/constants';
import { MapPin, MessageSquare } from 'lucide-react';
import { useCallback, useRef } from 'react';

interface MessageMarker {
  position: MlbMeta;
  author: string;
}

interface ProgressSliderWithMarkersProps {
  position: MlbMeta;
  onChange: (position: MlbMeta) => void;
  messageMarkers?: MessageMarker[];
  maxInning?: number;
  awayTeam?: string;
  homeTeam?: string;
}

export function ProgressSliderWithMarkers({
  position,
  onChange,
  messageMarkers = [],
  maxInning = GAME_CONSTRAINTS.DEFAULT_MAX_INNING,
  awayTeam,
  homeTeam
}: ProgressSliderWithMarkersProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);

  // Use position prop directly instead of local state to avoid sync issues
  const handleInningChange = (inning: number) => {
    onChange({ ...position, inning });
  };

  const handleHalfChange = (half: 'TOP' | 'BOTTOM') => {
    onChange({ ...position, half });
  };

  const handleOutsChange = (outs: 0 | 1 | 2 | 'END') => {
    onChange({ ...position, outs });
  };

  const handleBatterChange = useCallback((value: string) => {
    const trimmed = value.trim();
    onChange({ ...position, batter: trimmed.length ? trimmed : undefined });
  }, [onChange, position]);

  const phase: MlbPhase = position.phase ?? 'IN_GAME';
  const isPregame = phase === 'PREGAME';
  const isPostgame = phase === 'POSTGAME';
  const isInGame = !isPregame && !isPostgame;

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

  const isHalfComplete = isInGame && position.outs === 'END';
  const halfLabel = position.half === 'TOP' ? `Top ${position.inning}` : `Bottom ${position.inning}`;
  const nextHalfLabel = position.half === 'TOP' ? `Bottom ${position.inning}` : `Top ${position.inning + 1}`;

  const handlePhaseChange = (nextPhase: MlbPhase) => {
    if (nextPhase === 'PREGAME') {
      onChange({ ...position, inning: 1, half: 'TOP', outs: 0, phase: 'PREGAME' });
      return;
    }

    if (nextPhase === 'POSTGAME') {
      onChange({ ...position, phase: 'POSTGAME', outs: 'END' });
      return;
    }

    // IN_GAME
    const { inning, half, outs } = position;
    onChange({ sport: 'mlb', inning, half, outs: outs === 'END' ? 0 : outs });
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg p-6 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Your Position in the Game</h3>
      </div>

      <div className="text-3xl font-bold mb-6 text-center text-blue-600">
        {awayTeam && homeTeam
          ? formatMlbPositionWithTeams(position, awayTeam, homeTeam)
          : formatMlbPosition(position)
        }
      </div>

      <div className="space-y-6">
        {/* Phase Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Phase</label>
          <div className="flex flex-wrap gap-2">
            {(['PREGAME', 'IN_GAME', 'POSTGAME'] as MlbPhase[]).map((phaseOption) => {
              const label = phaseOption === 'PREGAME' ? 'Pregame' : phaseOption === 'POSTGAME' ? 'Postgame' : 'In-game';
              const isSelected = phase === phaseOption || (phaseOption === 'IN_GAME' && phase === 'IN_GAME');
              return (
                <button
                  key={phaseOption}
                  onClick={() => handlePhaseChange(phaseOption)}
                  className={`px-4 py-2 rounded-md font-semibold transition-all ${
                    (phase === phaseOption || (phaseOption === 'IN_GAME' && phase === 'IN_GAME'))
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {isPregame && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Pregame messages are visible to everyone before first pitch.
            </p>
          )}
          {isPostgame && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Postgame captures reactions after the final out.
            </p>
          )}
        </div>

        {/* Progress Bar with Message Markers */}
        <div className="relative">
          <div
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative h-4 w-full cursor-pointer select-none rounded-full bg-gray-200 dark:bg-gray-700"
          >
            {/* Your progress */}
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />

            {/* Message markers */}
            {markerPositions.map((marker, idx) => (
              <div
                key={idx}
                className="absolute top-0 transform -translate-x-1/2"
                style={{ left: `${marker.percent}%` }}
              >
                <div className="relative">
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-green-500 transform translate-y-[-16px]"></div>
                  <div className="absolute top-[-40px] left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <MessageSquare className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </div>
            ))}

            {/* Current position marker */}
            <div
              className="pointer-events-none absolute -top-[6px] h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow"
              style={{ left: `calc(${progressPercent}% - 8px)` }}
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

          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Pregame</span>
            <span>{Math.round(progressPercent)}%</span>
            <span>Postgame</span>
          </div>
        </div>

        {isHalfComplete && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
            <div className="font-semibold">{`End of ${halfLabel}`}</div>
            <div className="text-xs">
              {`Move into ${nextHalfLabel} or mark postgame once the final out is confirmed.`}
            </div>
          </div>
        )}

        {/* Inning Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Inning</label>
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {Array.from({ length: maxInning }, (_, i) => i + 1).map((inning) => (
              <button
                key={inning}
                onClick={() => handleInningChange(inning)}
                aria-label={`Select inning ${inning}`}
                aria-pressed={position.inning === inning}
                className={`px-4 py-2 rounded-md font-semibold transition-all flex-shrink-0 ${
                  position.inning === inning && isInGame
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {inning}
              </button>
            ))}
            {position.inning >= maxInning && (
              <button
                onClick={() => handleInningChange(position.inning + 1)}
                aria-label="Add extra inning"
                className="px-4 py-2 rounded-md font-semibold transition-all flex-shrink-0 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
              >
                + Extra
              </button>
            )}
          </div>
          {position.inning > 9 && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
              Extra innings (Inning {position.inning})
            </p>
          )}
        </div>

        {/* Half Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Half</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleHalfChange('TOP')}
              aria-label="Select top of inning"
              aria-pressed={position.half === 'TOP'}
              className={`px-4 py-3 rounded-md font-semibold transition-all ${
                position.half === 'TOP'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Top ▲
            </button>
            <button
              onClick={() => handleHalfChange('BOTTOM')}
              aria-label="Select bottom of inning"
              aria-pressed={position.half === 'BOTTOM'}
              className={`px-4 py-3 rounded-md font-semibold transition-all ${
                position.half === 'BOTTOM'
                  ? 'bg-blue-600 text-white shadow-md'
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
          <div className="grid grid-cols-4 gap-3">
            {([0, 1, 2] as const).map((outs) => (
              <button
                key={outs}
                onClick={() => handleOutsChange(outs)}
                aria-label={`Select ${outs} out${outs === 1 ? '' : 's'}`}
                aria-pressed={position.outs === outs}
                className={`px-4 py-3 rounded-md font-semibold transition-all ${
                  position.outs === outs
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {outs}
              </button>
            ))}
            <button
              onClick={() => handleOutsChange('END')}
              aria-label="End of inning"
              aria-pressed={position.outs === 'END'}
              title="Mark the 3rd out and end of half-inning"
              className={`px-4 py-3 rounded-md font-semibold transition-all ${
                position.outs === 'END'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-400'
              }`}
            >
              End
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Select "End" when the 3rd out happens and the half-inning ends
          </p>
        </div>

        {/* Batter Input (Optional) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            At Bat <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={position.batter || ''}
            onChange={(e) => handleBatterChange(e.target.value)}
            placeholder="e.g., Shohei Ohtani, #17, or Player name"
            disabled={!isInGame || position.outs === 'END'}
            className={`w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 transition-all ${!isInGame || position.outs === 'END' ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
            aria-label="Batter name or jersey number"
            maxLength={50}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Add context about who is batting to differentiate back-to-back plays.
          </p>
        </div>
      </div>
    </div>
  );
}
