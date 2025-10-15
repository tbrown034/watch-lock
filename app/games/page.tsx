'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { mockGames } from '@/lib/mock-data';
import { GameCard } from '@/components/game/GameCard';
import { UI_CONFIG } from '@/lib/constants';
import type { MlbScheduleGame } from '@/lib/services/mlbSchedule';
import type { NflScheduleGame } from '@/lib/services/nflSchedule';
import type { User } from '@supabase/supabase-js';
import { RoomCreateModal } from '@/components/room/RoomCreateModal';
import { RoomJoinModal } from '@/components/room/RoomJoinModal';
import { ShareCodeDisplay } from '@/components/room/ShareCodeDisplay';

// Unified game type with sport identifier
type UnifiedGame = (MlbScheduleGame | NflScheduleGame) & { sport: 'mlb' | 'nfl' };

interface ScheduleState {
  games: UnifiedGame[];
  isLoading: boolean;
  error: string | null;
}

export default function GamesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [schedule, setSchedule] = useState<ScheduleState>({
    games: [],
    isLoading: true,
    error: null,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<{ id: string; homeTeam: string; awayTeam: string } | null>(null);
  const [createdRoomData, setCreatedRoomData] = useState<{ shareCode: string; gameId: string } | null>(null);

  // Check auth status
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Fetch schedule (both MLB and NFL)
  useEffect(() => {
    let isMounted = true;

    async function fetchSchedule() {
      try {
        // Fetch both MLB and NFL games in parallel
        const [mlbResponse, nflResponse] = await Promise.all([
          fetch('/api/games/schedule?sport=mlb'),
          fetch('/api/games/schedule?sport=nfl')
        ]);

        const mlbData = mlbResponse.ok ? await mlbResponse.json() : { games: [] };
        const nflData = nflResponse.ok ? await nflResponse.json() : { games: [] };

        // Tag games with their sport
        const mlbGames: UnifiedGame[] = (mlbData.games ?? []).map((game: MlbScheduleGame) => ({
          ...game,
          sport: 'mlb' as const
        }));

        const nflGames: UnifiedGame[] = (nflData.games ?? []).map((game: NflScheduleGame) => ({
          ...game,
          sport: 'nfl' as const
        }));

        // Merge games
        const allGames = [...mlbGames, ...nflGames];

        if (isMounted) {
          setSchedule({ games: allGames, isLoading: false, error: null });
        }
      } catch (error) {
        if (isMounted) {
          setSchedule({
            games: [],
            isLoading: false,
            error: 'Unable to load live game schedules right now. Using demo games instead.',
          });
        }
      }
    }

    fetchSchedule();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateRoom = (game: { id: string; homeTeam: string; awayTeam: string }) => {
    setSelectedGame(game);
    setShowCreateModal(true);
  };

  const handleJoinRoom = () => {
    setShowJoinModal(true);
  };

  const handleCreateSuccess = (roomId: string, shareCode: string, gameId: string) => {
    setShowCreateModal(false);
    setCreatedRoomData({ shareCode, gameId });
    setShowSuccessModal(true);
  };

  const handleJoinSuccess = (gameId: string) => {
    setShowJoinModal(false);
    router.push(`/games/${gameId}`);
  };

  const handleGoToRoom = () => {
    if (createdRoomData) {
      router.push(`/games/${createdRoomData.gameId}`);
    }
  };

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
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Header */}
        <div className="space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 text-sm font-medium group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform" aria-hidden="true">←</span>
            <span>Home</span>
          </Link>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Today's Games
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {today} • {currentTime}
            </p>
          </div>
        </div>

        {/* Live MLB Schedule */}
        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Today's Games
            </h2>
          </div>

          <div className="space-y-3">
            {schedule.isLoading && (
              <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl backdrop-blur-sm transition-all duration-300 p-4 text-sm text-slate-600 dark:text-slate-400">
                Loading games...
              </div>
            )}

            {!schedule.isLoading && schedule.error && (
              <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl backdrop-blur-sm transition-all duration-300 p-4 text-sm text-slate-600 dark:text-slate-400">
                {schedule.error}
              </div>
            )}

            {!schedule.isLoading && !schedule.error && schedule.games.length === 0 && (
              <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl backdrop-blur-sm transition-all duration-300 p-4 text-sm text-slate-600 dark:text-slate-400">
                No games scheduled today.
              </div>
            )}

            {schedule.games.map((game) => (
              <div key={game.id} className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl backdrop-blur-sm transition-all duration-300 p-5">
                <GameCard game={game} variant="live" sport={game.sport} />

                {/* Game Preview Link */}
                {game.gameLink && (
                  <div className="mt-4">
                    <a
                      href={game.gameLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                    >
                      {game.sport === 'nfl' ? 'ESPN Game Preview' : 'MLB Game Preview'}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleCreateRoom({ id: game.id, homeTeam: game.homeTeam, awayTeam: game.awayTeam })}
                      className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-lg transition-colors shadow-sm"
                    >
                      Create Room
                    </button>
                    <button
                      onClick={handleJoinRoom}
                      className="flex-1 px-4 py-3 border-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 font-semibold text-base rounded-lg transition-colors"
                    >
                      Join Room
                    </button>
                  </div>

                  <Link
                    href={`/games/${game.id}`}
                    className="block text-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                  >
                    Test Mode
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Demo Game Rooms */}
        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Demo Games</h2>
          </div>
          <div className="space-y-3">
            {mockGames.map((game) => (
              <div key={game.id} className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl backdrop-blur-sm transition-all duration-300 p-5">
                <GameCard game={game} variant="demo" />

                {/* Action Buttons - Demo games go directly to test mode */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Link
                    href={`/games/${game.id}`}
                    className="block w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-lg transition-colors shadow-sm text-center"
                  >
                    Enter Demo
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Modals */}
      {showCreateModal && selectedGame && (
        <RoomCreateModal
          gameId={selectedGame.id}
          homeTeam={selectedGame.homeTeam}
          awayTeam={selectedGame.awayTeam}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {showJoinModal && (
        <RoomJoinModal
          onClose={() => setShowJoinModal(false)}
          onSuccess={handleJoinSuccess}
        />
      )}

      {showSuccessModal && createdRoomData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wide">
              Watch Party Created
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Share this code:
            </p>
            <ShareCodeDisplay
              shareCode={createdRoomData.shareCode}
              compact={false}
            />
            <button
              onClick={handleGoToRoom}
              className="w-full mt-4 px-4 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
            >
              Enter Room →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
