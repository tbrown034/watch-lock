'use client';

import { memo } from 'react';

interface NflScoreInfo {
  home: { points: number; name: string };
  away: { points: number; name: string };
}

interface NflSituation {
  down?: number;
  distance?: number;
  yardLine?: number;
}

interface NflFieldViewProps {
  score?: NflScoreInfo;
  possession?: 'home' | 'away';
  situation?: NflSituation;
  lastPlay?: string;
  statusMessage?: string;
  homeTeam: string;
  awayTeam: string;
}

export const NflFieldView = memo(function NflFieldView({
  score,
  possession,
  situation,
  lastPlay,
  statusMessage,
  homeTeam,
  awayTeam
}: NflFieldViewProps) {
  // Calculate ball position on field (0-100 yard line)
  const yardLine = situation?.yardLine ?? 50;
  // Convert to percentage for positioning (0% = left end zone, 100% = right end zone)
  const ballPosition = yardLine;

  return (
    <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl backdrop-blur-sm transition-all duration-300 shadow-lg p-6">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Live Sync</p>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Game Snapshot</h3>
        </div>
        {statusMessage && (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-200">
            {statusMessage}
          </span>
        )}
      </div>

      {/* Score */}
      {score && (
        <div className="mb-5">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className={`p-3 rounded-lg ${possession === 'away' ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{score.away.name}</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{score.away.points}</div>
              {possession === 'away' && (
                <div className="text-[10px] text-green-600 dark:text-green-400 font-semibold mt-1">BALL</div>
              )}
            </div>
            <div className={`p-3 rounded-lg ${possession === 'home' ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{score.home.name}</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{score.home.points}</div>
              {possession === 'home' && (
                <div className="text-[10px] text-green-600 dark:text-green-400 font-semibold mt-1">BALL</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Game Details */}
      <div className="space-y-3">
        {/* Down & Distance */}
        {situation && situation.down !== undefined && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Current Situation</div>
            <div className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {situation.down}
              {['st', 'nd', 'rd', 'th'][situation.down - 1] || 'th'} & {situation.distance}
              {situation.yardLine !== undefined && ` at ${situation.yardLine} yard line`}
            </div>
          </div>
        )}

        {/* Last Play */}
        {lastPlay && (
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide mb-2">Last Play</p>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{lastPlay}</p>
          </div>
        )}
      </div>
    </div>
  );
});

NflFieldView.displayName = 'NflFieldView';
