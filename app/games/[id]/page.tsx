'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProgressSliderWithMarkers } from '@/components/game/ProgressSliderWithMarkers';
import { MessageCard } from '@/components/game/MessageCard';
import { GameStateCard } from '@/components/game/GameStateCard';
import { HowItWorks } from '@/components/game/HowItWorks';
import { mockGames, MockMessage } from '@/lib/mock-data';
import { MlbMeta, encodeMlbPosition, formatMlbPositionWithTeams } from '@/lib/position';
import { MESSAGE_CONSTRAINTS, UI_CONFIG, STORAGE_KEYS } from '@/lib/constants';
import type { MlbScheduleGame } from '@/lib/services/mlbSchedule';
import type { MlbGameState } from '@/lib/services/mlbGameState';
import { Calendar, Clock, MessageSquare, MapPin, Package, ExternalLink, RefreshCw } from 'lucide-react';

export default function GameRoomPage() {
  const params = useParams();
  const gameId = params.id as string;

  const game = mockGames.find(g => g.id === gameId);
  const isLiveGame = gameId.startsWith('mlb-');
  const [liveGame, setLiveGame] = useState<MlbScheduleGame | null>(null);
  const [isScheduleLoading, setIsScheduleLoading] = useState(isLiveGame);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Initialize state from localStorage
  const [userPosition, setUserPosition] = useState<MlbMeta>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.getUserPositionKey(gameId));
      if (stored) {
        return JSON.parse(stored);
      }
    }
    return {
      sport: 'mlb',
      inning: 1,
      half: 'TOP',
      outs: 0,
      phase: 'PREGAME'
    };
  });

  const [messages, setMessages] = useState<MockMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.getMessagesKey(gameId));
      if (stored) {
        return JSON.parse(stored);
      }
    }
    return [];
  });

  const [newMessage, setNewMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<MlbGameState | null>(null);
  const autoSyncRef = useRef(false);
  const timezoneAbbr = UI_CONFIG.TIMEZONE.split('/').pop();
  const resolvedGame = game ?? liveGame ?? null;
  const awayTeam = resolvedGame?.awayTeam ?? 'Away';
  const homeTeam = resolvedGame?.homeTeam ?? 'Home';
  const startTimeLabel = resolvedGame?.startTime ? `${resolvedGame.startTime} ${timezoneAbbr}` : `TBD ${timezoneAbbr}`;

  const syncWithLivePosition = useCallback(async () => {
    setSyncMessage(null);

    if (!isLiveGame) {
      setSyncMessage(`Demo matchup scheduled for ${startTimeLabel}. Use the controls to set your own position.`);
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch(`/api/games/${gameId}/state`);
      const data = (await response.json()) as (MlbGameState & { source?: string; status?: string; message?: string }) | { message?: string; source?: string; status?: string };

      if (!response.ok) {
        throw new Error(data?.message || 'Unable to sync live position');
      }

      if ('posMeta' in data && data.posMeta) {
        setUserPosition(data.posMeta as MlbMeta);
      } else if (data.status === 'demo') {
        setUserPosition((prev) => ({ ...prev, phase: 'PREGAME' }));
      } else if ('isFinal' in data && data.isFinal) {
        setUserPosition((prev) => ({ ...prev, phase: 'POSTGAME', outs: 'END' }));
      }

      if (data.source === 'mock' || data.status === 'demo') {
        setLiveState(null);
      } else if ('score' in data || 'bases' in data || 'matchup' in data || 'lastPlay' in data) {
        setLiveState(data as MlbGameState);
      }

      const statusMessage = 'message' in data ? data.message : undefined;
      setSyncMessage(statusMessage ?? 'Live position updated.');
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Unable to reach the live feed.');
      setLiveState(null);
    } finally {
      setIsSyncing(false);
    }
  }, [gameId, isLiveGame, startTimeLabel]);

  useEffect(() => {
    if (!isLiveGame) {
      return;
    }

    let isMounted = true;
    async function fetchLiveGame() {
      setIsScheduleLoading(true);
      try {
        const response = await fetch('/api/games/schedule');
        if (!response.ok) {
          throw new Error('Failed to fetch schedule');
        }
        const data = await response.json();
        const games: MlbScheduleGame[] = data.games ?? [];
        const match = games.find((g) => g.id === gameId);
        if (isMounted) {
          setLiveGame(match ?? null);
          setScheduleError(match ? null : 'Live schedule data is unavailable for this matchup right now.');
        }
      } catch (error) {
        if (isMounted) {
          setScheduleError('Unable to sync with the MLB schedule at the moment.');
        }
      } finally {
        if (isMounted) {
          setIsScheduleLoading(false);
        }
      }
    }

    fetchLiveGame();

    return () => {
      isMounted = false;
    };
  }, [gameId, isLiveGame]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.getMessagesKey(gameId), JSON.stringify(messages));
    }
  }, [messages, gameId]);

  // Persist user position to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.getUserPositionKey(gameId), JSON.stringify(userPosition));
    }
  }, [userPosition, gameId]);

  useEffect(() => {
    if (isLiveGame && resolvedGame && !autoSyncRef.current) {
      autoSyncRef.current = true;
      syncWithLivePosition();
    }
  }, [isLiveGame, resolvedGame, syncWithLivePosition]);

  const today = new Date().toLocaleDateString('en-US', {
    ...UI_CONFIG.DATE_FORMAT.FULL,
    timeZone: UI_CONFIG.TIMEZONE
  });
  const previewUrl =
    isLiveGame && resolvedGame && 'gamePk' in resolvedGame
      ? `https://www.mlb.com/gameday/${resolvedGame.gamePk}`
      : null;

  if (!resolvedGame) {
    if (isScheduleLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-sm uppercase tracking-wide text-slate-500">Loading</p>
            <h1 className="text-2xl font-bold">Syncing live game data…</h1>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold">Game not found</h1>
          {scheduleError && <p className="text-sm text-slate-500">{scheduleError}</p>}
          <Link href="/games" className="text-blue-600 hover:text-blue-700">
            ← Back to Games
          </Link>
        </div>
      </div>
    );
  }

  const handleResetProgress = () => {
    const resetMeta: MlbMeta = {
      sport: 'mlb',
      inning: 1,
      half: 'TOP',
      outs: 0,
      phase: 'PREGAME'
    };
    setUserPosition(resetMeta);
    setSyncMessage('Progress reset to pregame.');
    setLiveState(null);
  };

  const handleClearMessages = () => {
    setMessages([]);
    setSyncMessage('All local messages cleared.');
  };

  const handleDeleteMessage = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: MockMessage = {
      id: crypto.randomUUID(),
      author: 'You',
      body: newMessage.trim(),
      position: { ...userPosition }
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filter messages based on user's current position
  const userPos = encodeMlbPosition(userPosition);
  const visibleMessages = messages.filter(msg =>
    encodeMlbPosition(msg.position) <= userPos
  );

  const hiddenCount = messages.length - visibleMessages.length;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 relative">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <Link href="/games" className="mb-3 inline-flex items-center gap-2 font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 group">
            <span className="transform transition-transform group-hover:-translate-x-1" aria-hidden="true">←</span>
            <span>Back to Games</span>
          </Link>
          <div>
            <h1 className="mb-1 text-4xl font-black text-slate-900 dark:text-slate-100">
              {awayTeam} <span className="text-blue-600">@</span> {homeTeam}
            </h1>
            <p className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                {today}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {startTimeLabel}
              </span>
            </p>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View matchup preview
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <HowItWorks />

        {isLiveGame && scheduleError && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            {scheduleError}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Progress Control */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl backdrop-blur-sm transition-all duration-300 p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {isLiveGame ? 'Live position' : 'Quick sync'}
                </span>
                <button
                  onClick={syncWithLivePosition}
                  disabled={isSyncing}
                  className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm inline-flex items-center gap-2 ${
                    isSyncing ? 'opacity-70 cursor-wait' : ''
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing…' : isLiveGame ? 'Sync live position' : 'Show schedule note'}
                </button>
              </div>
              {syncMessage && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{syncMessage}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleResetProgress}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800/60 hover:bg-slate-300 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 font-medium rounded-xl transition-all duration-200 text-xs"
                >
                  Reset progress
                </button>
                <button
                  onClick={handleClearMessages}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800/60 hover:bg-slate-300 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 font-medium rounded-xl transition-all duration-200 text-xs"
                >
                  Clear messages
                </button>
              </div>
            </div>

            {/* Message Input */}
            <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl backdrop-blur-sm transition-all duration-300 p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <h3 className="text-xl font-semibold text-slate-200">Leave a Message</h3>
              </div>
              <div className="mb-4">
                <div className="p-3 bg-blue-500/10 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Posting at: <span className="font-semibold text-blue-600 dark:text-blue-400">{formatMlbPositionWithTeams(userPosition, awayTeam, homeTeam)}</span>
                  </p>
                </div>
              </div>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tip: Skim ahead on the slider before reacting—everyone behind you stays spoiler-safe. (Press Enter to send)"
                className="w-full px-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700/60 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-slate-100 resize-none text-base"
                rows={3}
                maxLength={MESSAGE_CONSTRAINTS.MAX_LENGTH}
                aria-label="Message content"
              />
              <div className="flex items-center justify-between mt-3">
                <span className={`text-sm font-medium ${newMessage.length > MESSAGE_CONSTRAINTS.WARNING_THRESHOLD ? 'text-orange-500' : 'text-slate-500 dark:text-slate-400'}`}>
                  {newMessage.length}/{MESSAGE_CONSTRAINTS.MAX_LENGTH}
                </span>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Post Message
                </button>
              </div>
            </div>

            <ProgressSliderWithMarkers
              position={userPosition}
              onChange={setUserPosition}
              messageMarkers={messages.map(msg => ({
                position: msg.position,
                author: msg.author
              }))}
              awayTeam={awayTeam}
              homeTeam={homeTeam}
            />

            {liveState && (
              <GameStateCard
                score={liveState.score}
                bases={liveState.bases}
                matchup={liveState.matchup}
                lastPlay={liveState.lastPlay}
                statusMessage={liveState.message}
              />
            )}

          </div>

          {/* Right Column - Messages Feed */}
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl backdrop-blur-sm transition-all duration-300 overflow-hidden flex flex-col max-h-[800px]">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700/50">
              <h3 className="text-xl font-semibold text-slate-200 mb-1">Messages</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Showing up to <span className="font-semibold text-blue-500">{formatMlbPositionWithTeams(userPosition, awayTeam, homeTeam)}</span></span>
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {hiddenCount > 0 && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mb-5 p-4 bg-yellow-500/10 dark:bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center"
                >
                  <p className="text-base text-yellow-700 dark:text-yellow-300 font-semibold mb-1 flex items-center justify-center gap-2">
                    <Package className="w-5 h-5" aria-hidden="true" />
                    <span>{hiddenCount} message{hiddenCount > 1 ? 's' : ''} waiting ahead</span>
                  </p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Move your progress forward to unlock them
                  </p>
                </div>
              )}

              {visibleMessages.length === 0 ? (
                <div className="text-center py-20">
                  <div className="mb-4 flex justify-center opacity-50">
                    <MessageSquare className="w-16 h-16 text-slate-400" />
                  </div>
                  <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">No messages yet at this position</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Be the first to leave one!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visibleMessages.map((message) => (
                    <MessageCard
                      key={message.id}
                      message={{
                        id: message.id,
                        author: message.author,
                        body: message.body,
                        position: message.position
                      }}
                      isOwnMessage={message.author === 'You'}
                      onDelete={handleDeleteMessage}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
