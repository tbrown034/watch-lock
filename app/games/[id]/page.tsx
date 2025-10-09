'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProgressSliderWithMarkers } from '@/components/game/ProgressSliderWithMarkers';
import { MessageCard } from '@/components/game/MessageCard';
import { mockGames, MockMessage } from '@/lib/mock-data';
import { MlbMeta, encodeMlbPosition, formatMlbPositionWithTeams } from '@/lib/position';
import { MESSAGE_CONSTRAINTS, UI_CONFIG, STORAGE_KEYS } from '@/lib/constants';
import type { MlbScheduleGame } from '@/lib/services/mlbSchedule';
import { Calendar, Clock, MessageSquare, Target, MapPin, Package, ExternalLink, Lightbulb, RefreshCw } from 'lucide-react';

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
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Unable to sync live position');
      }

      if (data.posMeta) {
        setUserPosition(data.posMeta as MlbMeta);
      } else if (data.status === 'demo') {
        setUserPosition((prev) => ({ ...prev, phase: 'PREGAME' }));
      } else if (data.isFinal) {
        setUserPosition((prev) => ({ ...prev, phase: 'POSTGAME', outs: 'END' }));
      }

      setSyncMessage(data.message ?? 'Live position updated.');
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Unable to reach the live feed.');
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
  const previewUrl = isLiveGame && resolvedGame ? `https://www.mlb.com/gameday/${resolvedGame.gamePk}` : null;

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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b-2 border-slate-200 dark:border-slate-700 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/games" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-3 font-medium group">
            <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
            <span>Back to Games</span>
          </Link>
          <div>
            <h1 className="text-4xl font-black mb-1 text-slate-800 dark:text-slate-100">
              {awayTeam} <span className="text-blue-600">@</span> {homeTeam}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                {today}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" aria-hidden="true" />
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
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* How it works - Top of page */}
        <div className="mb-6 card-elevated p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <h4 className="font-bold mb-3 text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span>How it works</span>
          </h4>
          <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">1.</span>
              <span>Set where you are in the game using the controls below</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">2.</span>
              <span><strong>Important:</strong> After a big play happens, advance to the next position <em>before</em> commenting on it (e.g., advance from 1 out to 2 outs after seeing a home run)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">3.</span>
              <span>Messages are locked to your current position - only friends at that position or later will see them</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">4.</span>
              <span>Green markers on the timeline show where messages exist (no spoilers guaranteed)</span>
            </li>
          </ul>
        </div>
        {isLiveGame && (
          <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            scheduleError
              ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
              : 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200'
          }`}>
            {scheduleError
              ? scheduleError
              : 'Live data synced from the MLB Stats API. Refresh the page to pull the latest inning if you move ahead IRL.'}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Progress Control */}
          <div className="space-y-6">
            <div className="card-elevated p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {isLiveGame ? 'Live position' : 'Quick sync'}
                </span>
                <button
                  onClick={syncWithLivePosition}
                  disabled={isSyncing}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white ${
                    isSyncing ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing…' : isLiveGame ? 'Sync live position' : 'Show schedule note'}
                </button>
              </div>
              {syncMessage && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{syncMessage}</p>
              )}
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

            {/* Message Input */}
            <div className="card-elevated p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Leave a Message</h3>
              </div>
              <div className="mb-3 space-y-2">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Posting at: <span className="font-bold text-blue-600 dark:text-blue-400 text-base">{formatMlbPositionWithTeams(userPosition, awayTeam, homeTeam)}</span>
                  </p>
                </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-900/40">
                <p className="text-xs text-blue-700 dark:text-blue-200 flex items-start gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span><strong>Tip:</strong> Skim ahead on the slider before reacting to a moment—everyone behind you stays spoiler-safe.</span>
                </p>
              </div>
              </div>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="That was INCREDIBLE! (Press Enter to send, Shift+Enter for new line)"
                className="w-full px-4 py-3 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 resize-none transition-all text-base"
                rows={3}
                maxLength={MESSAGE_CONSTRAINTS.MAX_LENGTH}
                aria-label="Message content"
              />
              <div className="flex items-center justify-between mt-3">
                <span className={`text-sm font-medium ${newMessage.length > MESSAGE_CONSTRAINTS.WARNING_THRESHOLD ? 'text-orange-600' : 'text-slate-500'}`}>
                  {newMessage.length}/{MESSAGE_CONSTRAINTS.MAX_LENGTH}
                </span>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 transition-all shadow-md hover:shadow-lg"
                >
                  Post Message
                </button>
              </div>
            </div>

          </div>

          {/* Right Column - Messages Feed */}
          <div className="card-elevated overflow-hidden flex flex-col max-h-[800px]">
            <div className="p-5 border-b-2 border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Messages</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Showing up to <span className="font-bold text-blue-600 dark:text-blue-400">{formatMlbPositionWithTeams(userPosition, awayTeam, homeTeam)}</span></span>
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-800">
              {hiddenCount > 0 && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mb-5 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border-2 border-yellow-200 dark:border-yellow-800 text-center"
                >
                  <p className="text-base text-yellow-800 dark:text-yellow-300 font-bold mb-1 flex items-center justify-center gap-2">
                    <Package className="w-5 h-5" aria-hidden="true" />
                    <span>{hiddenCount} message{hiddenCount > 1 ? 's' : ''} waiting ahead</span>
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
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
                      message={message}
                      isOwnMessage={message.author === 'You'}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
