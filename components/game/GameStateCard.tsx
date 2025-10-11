'use client';

import { memo } from 'react';

interface BaseInfo {
  first?: string;
  second?: string;
  third?: string;
}

interface ScoreInfo {
  home: { runs: number; hits: number; errors: number; name: string };
  away: { runs: number; hits: number; errors: number; name: string };
  innings?: Array<{ num: number; home?: number | null; away?: number | null }>;
}

interface MatchupInfo {
  batter?: string;
  pitcher?: string;
  onDeck?: string;
  inHole?: string;
  count?: { balls: number; strikes: number };
}

interface GameStateCardProps {
  score?: ScoreInfo;
  bases?: BaseInfo;
  matchup?: MatchupInfo;
  lastPlay?: string;
  statusMessage?: string;
}

function renderBase(label: string | undefined) {
  if (!label) return null;
  const initials = label
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs font-semibold text-white shadow">
      {initials}
    </div>
  );
}

export const GameStateCard = memo(function GameStateCard({
  score,
  bases,
  matchup,
  lastPlay,
  statusMessage
}: GameStateCardProps) {
  return (
    <div className="card-elevated p-6">
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

      {score && (
        <div className="mb-5">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <span />
            <span>R</span>
            <span>H</span>
            <span>E</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 text-base font-bold">
            <span className="text-slate-800 dark:text-slate-100">{score.away.name}</span>
            <span>{score.away.runs}</span>
            <span>{score.away.hits}</span>
            <span>{score.away.errors}</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 text-base font-bold">
            <span className="text-slate-800 dark:text-slate-100">{score.home.name}</span>
            <span>{score.home.runs}</span>
            <span>{score.home.hits}</span>
            <span>{score.home.errors}</span>
          </div>

          {score.innings && score.innings.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-xs text-slate-500 dark:text-slate-400">
                <thead>
                  <tr>
                    {score.innings.map((inning) => (
                      <th key={inning.num} className="px-2 py-1 text-center font-medium">
                        {inning.num}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {score.innings.map((inning) => (
                      <td key={`away-${inning.num}`} className="px-2 py-1 text-center">
                        {inning.away ?? '-'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    {score.innings.map((inning) => (
                      <td key={`home-${inning.num}`} className="px-2 py-1 text-center">
                        {inning.home ?? '-'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
            Bases
          </h4>
          <div className="mx-auto grid h-32 w-32 grid-cols-3 grid-rows-3 place-items-center">
            <div />
            <div className="rotate-45 rounded bg-slate-200 p-5 dark:bg-slate-700">
              {renderBase(bases?.second)}
            </div>
            <div />
            <div className="rotate-45 rounded bg-slate-200 p-5 dark:bg-slate-700">
              {renderBase(bases?.third)}
            </div>
            <div />
            <div className="rotate-45 rounded bg-slate-200 p-5 dark:bg-slate-700">
              {renderBase(bases?.first)}
            </div>
            <div />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Runners shown with initials. Empty bases are gray.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
            Matchup
          </h4>
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
            {matchup?.batter && (
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                At Bat: <span className="font-normal">{matchup.batter}</span>
              </p>
            )}
            {matchup?.pitcher && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Pitching: <span className="font-medium">{matchup.pitcher}</span>
              </p>
            )}
            {matchup?.count && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Count: <span className="font-medium">{matchup.count.balls}-{matchup.count.strikes}</span>
              </p>
            )}
            {(matchup?.onDeck || matchup?.inHole) && (
              <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                {matchup?.onDeck && <p>On Deck: {matchup.onDeck}</p>}
                {matchup?.inHole && <p>In Hole: {matchup.inHole}</p>}
              </div>
            )}
          </div>

          {lastPlay && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <p className="font-semibold">Last Play</p>
              <p className="mt-1 text-sm leading-relaxed">{lastPlay}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

GameStateCard.displayName = 'GameStateCard';
