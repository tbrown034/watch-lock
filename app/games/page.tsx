'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { mockGames } from '@/lib/mock-data';
import { GameCard } from '@/components/game/GameCard';
import { UI_CONFIG } from '@/lib/constants';
import type { MlbScheduleGame } from '@/lib/services/mlbSchedule';
import type { User } from '@supabase/supabase-js';
import { RoomCreateModal } from '@/components/room/RoomCreateModal';
import { RoomJoinModal } from '@/components/room/RoomJoinModal';
import { ShareCodeDisplay } from '@/components/room/ShareCodeDisplay';

interface ScheduleState {
  games: MlbScheduleGame[];
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

  // Fetch schedule
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

  const handleCreateRoom = (game: { id: string; homeTeam: string; awayTeam: string }) => {
    if (!user) {
      // Redirect to sign in
      router.push('/');
      return;
    }
    setSelectedGame(game);
    setShowCreateModal(true);
  };

  const handleJoinRoom = () => {
    if (!user) {
      // Redirect to sign in
      router.push('/');
      return;
    }
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
                <GameCard game={game} variant="live" />
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  <button
                    onClick={() => handleCreateRoom({ id: game.id, homeTeam: game.homeTeam, awayTeam: game.awayTeam })}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-lg transition-colors shadow-sm"
                  >
                    Join Game
                  </button>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/games/${game.id}`}
                      className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium text-xs rounded transition-colors text-center"
                    >
                      Test Mode
                    </Link>
                    {game.gameLink && (
                      <a
                        href={game.gameLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium text-xs rounded transition-colors text-center flex items-center justify-center gap-1"
                      >
                        MLB Preview
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
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
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  <button
                    onClick={() => handleCreateRoom({ id: game.id, homeTeam: game.homeTeam, awayTeam: game.awayTeam })}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-lg transition-colors shadow-sm"
                  >
                    Join Game
                  </button>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/games/${game.id}`}
                      className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium text-xs rounded transition-colors text-center"
                    >
                      Test Mode
                    </Link>
                    {game.gameLink && (
                      <a
                        href={game.gameLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium text-xs rounded transition-colors text-center flex items-center justify-center gap-1"
                      >
                        MLB Preview
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
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
