'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { SimpleProgressSlider } from '@/components/game/SimpleProgressSlider';
import { ExactPosition } from '@/components/game/ExactPosition';
import { FieldView } from '@/components/game/FieldView';
import { MessageCard } from '@/components/game/MessageCard';
import { HowItWorks } from '@/components/game/HowItWorks';
import { mockGames, MockMessage } from '@/lib/mock-data';
import { MlbMeta, encodeMlbPosition, formatMlbPositionWithTeams } from '@/lib/position';
import { MESSAGE_CONSTRAINTS, UI_CONFIG, STORAGE_KEYS } from '@/lib/constants';
import type { MlbScheduleGame } from '@/lib/services/mlbSchedule';
import type { MlbGameState } from '@/lib/services/mlbGameState';
import { Calendar, Clock, MessageSquare, Package, ExternalLink, RefreshCw, ChevronDown, ChevronUp, RotateCcw, Send } from 'lucide-react';

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
  const [liveState, setLiveState] = useState<MlbGameState | null>(null);
  const [livePosition, setLivePosition] = useState<MlbMeta | null>(null);
  const [showGameInfo, setShowGameInfo] = useState(false);
  const [showExactPicker, setShowExactPicker] = useState(false);
  const timezoneAbbr = UI_CONFIG.TIMEZONE.split('/').pop();
  const resolvedGame = game ?? liveGame ?? null;
  const awayTeam = resolvedGame?.awayTeam ?? 'Away';
  const homeTeam = resolvedGame?.homeTeam ?? 'Home';
  const startTimeLabel = resolvedGame?.startTime ? `${resolvedGame.startTime} ${timezoneAbbr}` : `TBD ${timezoneAbbr}`;

  // Fetch live position periodically (for indicator only, doesn't change user position)
  const fetchLivePosition = useCallback(async () => {
    if (!isLiveGame) return;

    try {
      const response = await fetch(`/api/games/${gameId}/state`);
      const data = (await response.json()) as (MlbGameState & { source?: string; status?: string; message?: string; posMeta?: MlbMeta }) | { message?: string; source?: string; status?: string };

      if (response.ok && 'posMeta' in data && data.posMeta) {
        setLivePosition(data.posMeta);
      }
    } catch (error) {
      // Silently fail - this is just for the indicator
    }
  }, [gameId, isLiveGame]);

  const syncToLivePosition = useCallback(async () => {
    if (!isLiveGame) {
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
        setLivePosition(data.posMeta as MlbMeta);
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
    } catch (error) {
      setLiveState(null);
    } finally {
      setIsSyncing(false);
    }
  }, [gameId, isLiveGame]);

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

  // Fetch live position indicator periodically
  useEffect(() => {
    if (!isLiveGame) return;

    fetchLivePosition();
    const interval = setInterval(fetchLivePosition, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isLiveGame, fetchLivePosition]);

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
    setLiveState(null);
  };

  const handleClearMessages = () => {
    setMessages([]);
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

  // Get team abbreviations (first 3 letters)
  const awayAbbr = awayTeam.split(' ').pop()?.slice(0, 3).toUpperCase() || 'AWY';
  const homeAbbr = homeTeam.split(' ').pop()?.slice(0, 3).toUpperCase() || 'HOM';

  // Determine user's position text
  const userPositionText = `Your position: ${formatMlbPositionWithTeams(userPosition, awayTeam, homeTeam)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Compact Header - Not Sticky */}
      <div className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/games"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1.5"
            >
              <span>←</span>
              <span className="hidden sm:inline">Back</span>
            </Link>

            <div className="flex-1 text-center">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                <span className="text-slate-600 dark:text-slate-400 text-sm font-normal">{awayAbbr}</span>
                {' '}
                <span className="text-blue-600">@</span>
                {' '}
                <span className="text-slate-600 dark:text-slate-400 text-sm font-normal">{homeAbbr}</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{awayTeam} @ {homeTeam}</p>
            </div>

            <button
              onClick={() => setShowGameInfo(!showGameInfo)}
              className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              aria-label="Game info"
            >
              {showGameInfo ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {/* Collapsible Game Info */}
          {showGameInfo && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-sm space-y-2">
              <p className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
                <Calendar className="h-4 w-4" />
                {today}
                <span>•</span>
                <Clock className="h-4 w-4" />
                {startTimeLabel}
              </p>
              {previewUrl && (
                <p className="text-center">
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    View on MLB.com
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* 1. How It Works */}
        <HowItWorks />

        {/* Schedule Error Alert */}
        {isLiveGame && scheduleError && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            {scheduleError}
          </div>
        )}

        {/* 2. Game Position Component */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          {/* Top section: Slider and buttons */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Game Position</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {userPositionText}
              </p>
            </div>

            {/* Slider */}
            <SimpleProgressSlider
              position={userPosition}
              onChange={setUserPosition}
              messageMarkers={messages.map(msg => ({
                position: msg.position,
                author: msg.author
              }))}
              livePosition={livePosition}
            />

            {/* Buttons */}
            <div className="flex gap-2">
              {isLiveGame && (
                <button
                  onClick={syncToLivePosition}
                  disabled={isSyncing}
                  className={`flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2 ${
                    isSyncing ? 'opacity-70 cursor-wait' : ''
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Go Live'}
                </button>
              )}
              <button
                onClick={handleResetProgress}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>

            {/* Exact Position Picker (collapsed by default) */}
            <div className="pt-2">
              <button
                onClick={() => setShowExactPicker(!showExactPicker)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 flex items-center gap-1 transition-colors"
              >
                {showExactPicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span>Jump to exact position</span>
              </button>

              {showExactPicker && (
                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700">
                  <ExactPosition
                    position={userPosition}
                    onChange={setUserPosition}
                    awayTeam={awayTeam}
                    homeTeam={homeTeam}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Field View (Diamond and Box Score) */}
          <div className="border-t border-slate-200 dark:border-slate-700">
            <FieldView
              position={userPosition}
              liveState={liveState}
              awayTeam={awayTeam}
              homeTeam={homeTeam}
            />
          </div>
        </div>

        {/* 3. Messages Component */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  Messages
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Showing up to {formatMlbPositionWithTeams(userPosition, awayTeam, homeTeam)}
                </p>
              </div>
              {messages.length > 0 && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                  {visibleMessages.length}/{messages.length}
                </span>
              )}
            </div>

            {/* Progress Slider in Messages */}
            <SimpleProgressSlider
              position={userPosition}
              onChange={setUserPosition}
              messageMarkers={messages.map(msg => ({
                position: msg.position,
                author: msg.author
              }))}
              livePosition={livePosition}
            />
          </div>

          {/* Hidden Messages Alert */}
          {hiddenCount > 0 && (
            <div className="mx-5 mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium flex items-center gap-2">
                <Package className="w-4 h-4" />
                {hiddenCount} message{hiddenCount > 1 ? 's' : ''} waiting ahead
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Move your position forward to unlock
              </p>
            </div>
          )}

          {/* Message Feed */}
          <div className="p-5 max-h-[500px] overflow-y-auto space-y-3">
            {visibleMessages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No messages yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Be the first to leave one!</p>
              </div>
            ) : (
              visibleMessages.map((message) => (
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
              ))
            )}
          </div>

          {/* Message Composer */}
          <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="mb-2">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Posting at: <span className="font-semibold text-blue-600 dark:text-blue-400">{formatMlbPositionWithTeams(userPosition, awayTeam, homeTeam)}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Leave a message... (Enter to send)"
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-slate-100 resize-none text-sm"
                rows={2}
                maxLength={MESSAGE_CONSTRAINTS.MAX_LENGTH}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 self-end"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">Send</span>
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs font-medium ${newMessage.length > MESSAGE_CONSTRAINTS.WARNING_THRESHOLD ? 'text-orange-500' : 'text-slate-400 dark:text-slate-500'}`}>
                {newMessage.length}/{MESSAGE_CONSTRAINTS.MAX_LENGTH}
              </span>
              <button
                onClick={handleClearMessages}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
