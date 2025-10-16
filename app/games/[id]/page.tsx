'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { SimpleProgressSlider } from '@/components/game/SimpleProgressSlider';
import { ExactPosition } from '@/components/game/ExactPosition';
import { FieldView } from '@/components/game/FieldView';
import { MessageCard } from '@/components/game/MessageCard';
import { HowItWorks } from '@/components/game/HowItWorks';
import { mockGames, MockMessage } from '@/lib/mock-data';
import {
  MlbMeta,
  NflMeta,
  encodeMlbPosition,
  encodeNflPosition,
  formatMlbPositionWithTeams,
  formatNflPositionWithTeams
} from '@/lib/position';
import { MESSAGE_CONSTRAINTS, UI_CONFIG, STORAGE_KEYS } from '@/lib/constants';
import type { MlbScheduleGame } from '@/lib/services/mlbSchedule';
import type { NflScheduleGame } from '@/lib/services/nflSchedule';
import type { MlbGameState } from '@/lib/services/mlbGameState';
import type { NflGameState } from '@/lib/services/nflGameState';
import { getTeamAbbreviation as getMlbTeamAbbreviation } from '@/lib/mlb-teams';
import { getTeamAbbreviation as getNflTeamAbbreviation } from '@/lib/nfl-teams';
import { Calendar, Clock, MessageSquare, Package, ExternalLink, RefreshCw, ChevronDown, ChevronUp, RotateCcw, Send, Eye, EyeOff, Users, Share2, Trash2 } from 'lucide-react';
import { ShareCodeDisplay } from '@/components/room/ShareCodeDisplay';
import { RoomMemberList } from '@/components/room/RoomMemberList';

export default function GameRoomPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const game = mockGames.find(g => g.id === gameId);

  // Detect sport from gameId
  const isNflGame = gameId.startsWith('nfl-');
  const isMlbGame = gameId.startsWith('mlb-');
  const isLiveGame = isMlbGame || isNflGame;
  const sport: 'mlb' | 'nfl' = isNflGame ? 'nfl' : 'mlb';

  const [liveGame, setLiveGame] = useState<MlbScheduleGame | NflScheduleGame | null>(null);
  const [isScheduleLoading, setIsScheduleLoading] = useState(isLiveGame);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Initialize state from localStorage
  const [userPosition, setUserPosition] = useState<MlbMeta | NflMeta>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.getUserPositionKey(gameId));
      if (stored) {
        return JSON.parse(stored);
      }
    }

    // Return default position based on sport
    if (isNflGame) {
      return {
        sport: 'nfl',
        quarter: 1,
        time: '15:00',
        possession: null,
        phase: 'PREGAME'
      };
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
  const [liveState, setLiveState] = useState<MlbGameState | NflGameState | null>(null);
  const [livePosition, setLivePosition] = useState<MlbMeta | NflMeta | null>(null);
  const [showGameInfo, setShowGameInfo] = useState(false);
  const [showExactPicker, setShowExactPicker] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoomInfo, setShowRoomInfo] = useState(true); // Open by default
  const [deletingRoom, setDeletingRoom] = useState(false);
  const [roomInfo, setRoomInfo] = useState<{
    id: string;
    name: string;
    shareCode: string;
    maxMembers: number;
    memberCount: number;
    isOwner: boolean;
  } | null>(null);
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
      const data = (await response.json()) as ((MlbGameState | NflGameState) & { source?: string; status?: string; message?: string; posMeta?: MlbMeta | NflMeta }) | { message?: string; source?: string; status?: string };

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
      const data = (await response.json()) as ((MlbGameState | NflGameState) & { source?: string; status?: string; message?: string }) | { message?: string; source?: string; status?: string };

      if (!response.ok) {
        throw new Error(data?.message || 'Unable to sync live position');
      }

      if ('posMeta' in data && data.posMeta) {
        setUserPosition(data.posMeta as MlbMeta | NflMeta);
        setLivePosition(data.posMeta as MlbMeta | NflMeta);
      } else if (data.status === 'demo') {
        setUserPosition((prev) => ({ ...prev, phase: 'PREGAME' }));
      } else if ('isFinal' in data && data.isFinal) {
        if (sport === 'mlb') {
          setUserPosition((prev) => ({ ...prev, phase: 'POSTGAME', outs: 'END' } as MlbMeta));
        } else {
          setUserPosition((prev) => ({ ...prev, phase: 'POSTGAME' } as NflMeta));
        }
      }

      if (data.source === 'mock' || data.status === 'demo') {
        setLiveState(null);
      } else if ('score' in data) {
        setLiveState(data as MlbGameState | NflGameState);
      }
    } catch (error) {
      setLiveState(null);
    } finally {
      setIsSyncing(false);
    }
  }, [gameId, isLiveGame, sport]);

  useEffect(() => {
    if (!isLiveGame) {
      return;
    }

    let isMounted = true;
    async function fetchLiveGame() {
      setIsScheduleLoading(true);
      try {
        const sportParam = sport === 'nfl' ? 'nfl' : 'mlb';
        const response = await fetch(`/api/games/schedule?sport=${sportParam}`);
        if (!response.ok) {
          throw new Error('Failed to fetch schedule');
        }
        const data = await response.json();
        const games: (MlbScheduleGame | NflScheduleGame)[] = data.games ?? [];
        const match = games.find((g) => g.id === gameId);
        if (isMounted) {
          setLiveGame(match ?? null);
          setScheduleError(match ? null : 'Live schedule data is unavailable for this matchup right now.');
        }
      } catch (error) {
        if (isMounted) {
          setScheduleError(`Unable to sync with the ${sport.toUpperCase()} schedule at the moment.`);
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
  }, [gameId, isLiveGame, sport]);

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

  // Fetch room information
  useEffect(() => {
    async function fetchRoomInfo() {
      try {
        console.log('Fetching room info for game:', gameId);
        const response = await fetch(`/api/games/${gameId}/room`);
        console.log('Room info response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.log('Room info error:', errorData);
          // Not in a room - that's OK for test mode
          return;
        }
        const data = await response.json();
        console.log('Room info data:', data);
        setRoomInfo(data.room);

        // Clear old localStorage messages when entering a room
        // Messages should come from the database, not localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEYS.getMessagesKey(gameId));
          setMessages([]);
        }
      } catch (error) {
        // Silently fail - room info is optional
        console.error('Failed to fetch room info:', error);
      }
    }

    fetchRoomInfo();
  }, [gameId]);

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

  const handleDeleteRoom = async () => {
    if (!roomInfo) return;

    if (!confirm('Are you sure you want to delete this room? This action cannot be undone and will delete all messages and progress.')) {
      return;
    }

    setDeletingRoom(true);

    try {
      const response = await fetch(`/api/rooms/${roomInfo.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete room');
      }

      // Redirect to games page
      router.push('/games');
    } catch (error) {
      console.error('Error deleting room:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete room');
      setDeletingRoom(false);
    }
  };

  const handleResetProgress = () => {
    const resetMeta: MlbMeta | NflMeta = sport === 'nfl'
      ? {
          sport: 'nfl',
          quarter: 1,
          time: '15:00',
          possession: null,
          phase: 'PREGAME'
        }
      : {
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

  // Filter messages based on user's current position (sport-specific encoding)
  const encodePosition = (pos: MlbMeta | NflMeta): number => {
    return pos.sport === 'nfl' ? encodeNflPosition(pos as NflMeta) : encodeMlbPosition(pos as MlbMeta);
  };

  const userPos = encodePosition(userPosition);
  const visibleMessages = messages.filter(msg =>
    encodePosition(msg.position) <= userPos
  );

  const hiddenCount = messages.length - visibleMessages.length;

  // Get team abbreviations using sport-specific functions
  const getTeamAbbreviation = sport === 'nfl' ? getNflTeamAbbreviation : getMlbTeamAbbreviation;
  const awayAbbr = getTeamAbbreviation(awayTeam);
  const homeAbbr = getTeamAbbreviation(homeTeam);

  // Determine user's position text (sport-specific formatting)
  const formatPositionWithTeams = sport === 'nfl' ? formatNflPositionWithTeams : formatMlbPositionWithTeams;
  const userPositionText = `Your position: ${formatPositionWithTeams(userPosition as any, awayTeam, homeTeam)}`;

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

        {/* Room Info Section */}
        {roomInfo && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {roomInfo.name}
                  </h3>
                </div>
                <button
                  onClick={() => setShowRoomInfo(!showRoomInfo)}
                  className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  aria-label={showRoomInfo ? 'Hide room info' : 'Show room info'}
                >
                  {showRoomInfo ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {showRoomInfo && (
              <div className="p-4 space-y-4">
                {/* Share Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Share Code
                  </label>
                  <div className="flex items-center justify-between">
                    <ShareCodeDisplay shareCode={roomInfo.shareCode} compact={true} />
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Share2 className="w-4 h-4" />
                      Invite
                    </button>
                  </div>
                </div>

                {/* Member Count */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Members
                  </label>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {roomInfo.memberCount} / {roomInfo.maxMembers} members
                    </span>
                  </div>
                </div>

                {/* Delete Room (Owner Only) */}
                {roomInfo.isOwner && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex justify-center">
                      <button
                        onClick={handleDeleteRoom}
                        disabled={deletingRoom}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg transition-all text-xs font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{deletingRoom ? 'Deleting...' : 'Delete Room'}</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                      This will permanently delete the room and all its data
                    </p>
                  </div>
                )}

                {/* Member List */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 -mx-4 -mb-4">
                  <RoomMemberList roomId={roomInfo.id} />
                </div>
              </div>
            )}
          </div>
        )}

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
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMarkers(!showMarkers)}
                  className={`px-2 py-1 rounded-lg transition-all text-[10px] font-medium flex items-center gap-1 ${
                    showMarkers
                      ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400'
                  }`}
                  title={showMarkers ? 'Hide markers (spoiler-free mode)' : 'Show markers and live position'}
                >
                  {showMarkers ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span className="hidden sm:inline">{showMarkers ? 'Visible' : 'Hidden'}</span>
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {userPositionText}
                </p>
              </div>
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
              showMarkers={showMarkers}
            />

            {/* Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleResetProgress}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg transition-all text-xs font-medium flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              <button
                onClick={() => setShowExactPicker(!showExactPicker)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-xs font-semibold flex items-center gap-2"
              >
                {showExactPicker ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>Jump to Exact Position</span>
              </button>
            </div>

            {/* Exact Position Picker (collapsed by default) */}
            <div className="pt-2">
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
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  Messages
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Showing up to {formatPositionWithTeams(userPosition as any, awayTeam, homeTeam)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                      {visibleMessages.length}/{messages.length}
                    </span>
                    <button
                      onClick={handleClearMessages}
                      className="px-2 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg transition-all text-[10px] font-medium flex items-center gap-1"
                      title="Clear all messages"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span className="hidden sm:inline">Reset</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Hidden Messages Alert */}
          {hiddenCount > 0 && (
            <div className="mx-4 mt-3 p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                {hiddenCount} message{hiddenCount > 1 ? 's' : ''} waiting ahead
              </p>
              <p className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-0.5">
                Move your position forward to unlock
              </p>
            </div>
          )}

          {/* Message Feed */}
          <div className="p-4 max-h-[500px] overflow-y-auto space-y-3">
            {visibleMessages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No messages yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Be the first to leave one!</p>
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

          {/* Message Composer - Enhanced */}
          <div className="px-4 py-4 border-t-2 border-blue-500/20 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-blue-950/30 dark:to-slate-800/50 shadow-inner">
            <div className="mb-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Leave Your Reaction
                </h4>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded-full border border-blue-200 dark:border-blue-800">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse"></div>
                  <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">Posting at: {formatPositionWithTeams(userPosition as any, awayTeam, homeTeam)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Share your reaction at this moment... (Press Enter to send, Shift+Enter for new line)"
                className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm resize-none min-h-[80px]"
                maxLength={MESSAGE_CONSTRAINTS.MAX_LENGTH}
                rows={3}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg font-medium h-[80px]"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline text-sm">Send</span>
              </button>
            </div>
            <div className="mt-2 text-right">
              <span className={`text-[10px] font-semibold ${newMessage.length > MESSAGE_CONSTRAINTS.WARNING_THRESHOLD ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {newMessage.length}/{MESSAGE_CONSTRAINTS.MAX_LENGTH} characters
              </span>
            </div>

            {/* Progress Slider */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <SimpleProgressSlider
                position={userPosition}
                onChange={setUserPosition}
                messageMarkers={messages.map(msg => ({
                  position: msg.position,
                  author: msg.author
                }))}
                livePosition={livePosition}
                showMarkers={showMarkers}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && roomInfo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wide">
              Invite to {roomInfo.name}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Share this code with friends to invite them to your watch party:
            </p>
            <ShareCodeDisplay
              shareCode={roomInfo.shareCode}
              roomId={roomInfo.id}
              compact={false}
            />
            <button
              onClick={() => setShowInviteModal(false)}
              className="w-full mt-4 px-4 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
