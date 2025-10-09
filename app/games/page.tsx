'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { mockGames } from '@/lib/mock-data';
import { GameCard } from '@/components/game/GameCard';
import { UI_CONFIG } from '@/lib/constants';
import { ArrowUpRight, Lightbulb, Radio } from 'lucide-react';
import type { MlbScheduleGame } from '@/lib/services/mlbSchedule';

interface ScheduleState {
  games: MlbScheduleGame[];
  isLoading: boolean;
  error: string | null;
}

export default function GamesPage() {
  const [schedule, setSchedule] = useState<ScheduleState>({
    games: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchSchedule() {
      try {
        const response = await fetch('/api/games/schedule');
        if (!response.ok) {
          throw new Error('Failed to fetch schedule');
        }
        const data = await response.json();
        if (isMounted) {
          setSchedule({ games: data.games ?? [], isLoading: false, error: null });
        }
      } catch (error) {
        if (isMounted) {
          setSchedule({
            games: [],
            isLoading: false,
            error: 'Unable to load the live MLB schedule right now. Using demo games instead.',
          });
        }
      }
    }

    fetchSchedule();

    return () => {
      isMounted = false;
    };
  }, []);

  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', {
    ...UI_CONFIG.DATE_FORMAT.TIME,
    timeZone: UI_CONFIG.TIMEZONE,
  });

  const today = now.toLocaleDateString('en-US', {
    ...UI_CONFIG.DATE_FORMAT.FULL,
    timeZone: UI_CONFIG.TIMEZONE,
  });

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium group"
          >
            <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
            <span>Back to Home</span>
          </Link>

          <div>
            <h1 className="text-5xl font-black mb-2 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Today's Games
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <span className="font-semibold">{today}</span>
              <span>•</span>
              <span>
                {currentTime} {UI_CONFIG.TIMEZONE.split('/').pop()}
              </span>
            </p>
          </div>
        </div>

        {/* Demo Game Rooms */}
        <section>
          <div className="mb-4">
            <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Product Demo</p>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">WatchLock Sample Rooms</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Explore canned matchups that route you into the in-app experience.
            </p>
          </div>
          <div className="space-y-5">
            {mockGames.map((game) => (
              <Link key={game.id} href={`/games/${game.id}`}>
                <div className="card-elevated p-6 hover:border-blue-500 border-2 border-slate-200 dark:border-slate-700 cursor-pointer group transition-all">
                  <GameCard game={game} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Live MLB Schedule */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Live Data</p>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Radio className="w-5 h-5 text-green-500" /> Today's MLB Schedule
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-500">Source: MLB Stats API</span>
          </div>

          <div className="space-y-4">
            {schedule.isLoading && (
              <div className="p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-500">
                Syncing with MLB Stats API…
              </div>
            )}

            {!schedule.isLoading && schedule.error && (
              <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20">
                {schedule.error}
              </div>
            )}

            {!schedule.isLoading && !schedule.error && schedule.games.length === 0 && (
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-500">
                No MLB games scheduled today.
              </div>
            )}

            {schedule.games.map((game) => (
              <div
                key={game.id}
                className="card-elevated border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition"
              >
                <Link
                  href={`/games/${game.id}`}
                  className="block p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        {game.awayTeam} <span className="text-slate-400">@</span> {game.homeTeam}
                      </p>
                      {game.venue && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{game.venue}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{game.startTime}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Open Watch Room</p>
                    </div>
                  </div>
                </Link>
                <div className="flex justify-end border-t border-slate-100 dark:border-slate-700/80 px-4 py-2">
                  <a
                    href={`https://www.mlb.com/gameday/${game.gamePk}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                  >
                    View matchup preview
                    <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Info Box */}
        <div className="card-elevated p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Lightbulb className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-slate-100">How It Works</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Start inside a sample game to try WatchLock today, then sync with the live MLB schedule for
                real matchups. Messages unlock only when your people reach the same inning, half, or drive.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
