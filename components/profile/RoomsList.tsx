/**
 * RoomsList Component
 *
 * Displays user's rooms with actions (enter, share, delete)
 */

'use client'

import { useState } from 'react';
import Link from 'next/link';
import { Users, ExternalLink, Share2, Trash2, X } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  shareCode: string;
  maxMembers: number;
  memberCount: number;
  isOwner: boolean;
  role: string;
  joinedAt: string;
  createdAt: string;
  gameId?: string;
}

interface RoomsListProps {
  rooms: Room[];
  onDeleteRoom: (roomId: string) => Promise<void>;
  deletingRoomId: string | null;
}

export function RoomsList({ rooms, onDeleteRoom, deletingRoomId }: RoomsListProps) {
  const [shareModalRoom, setShareModalRoom] = useState<Room | null>(null);

  const handleCopyShareCode = async (shareCode: string) => {
    try {
      await navigator.clipboard.writeText(shareCode);
      // Could add toast notification here
    } catch (error) {
      console.error('Failed to copy share code:', error);
      alert('Failed to copy share code. Please copy manually: ' + shareCode);
    }
  };

  return (
    <>
      <div className="p-6 border-t border-slate-200 dark:border-slate-700">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
          My Rooms ({rooms.length})
        </h2>

        {rooms.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No rooms yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Create or join a room to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <div className="space-y-3">
                  {/* Room header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {room.name}
                        </h3>
                        {room.isOwner && (
                          <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-semibold rounded">
                            Owner
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {room.memberCount}/{room.maxMembers}
                        </span>
                        <span>•</span>
                        <span className="font-mono font-semibold">{room.shareCode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {room.gameId && (
                      <Link
                        href={`/games/${room.gameId}`}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
                        Enter Room
                      </Link>
                    )}
                    <button
                      onClick={() => setShareModalRoom(room)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" strokeWidth={2} />
                      Share
                    </button>
                    {room.isOwner && (
                      <button
                        onClick={() => onDeleteRoom(room.id)}
                        disabled={deletingRoomId === room.id}
                        className="px-3 py-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold"
                        title="Delete room"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareModalRoom && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Share Room
              </h2>
              <button
                onClick={() => setShareModalRoom(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Room name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Room
                </label>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  {shareModalRoom.name}
                </p>
              </div>

              {/* Share code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Share Code
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                    <p className="text-2xl font-bold font-mono text-center text-slate-900 dark:text-slate-100 tracking-wider">
                      {shareModalRoom.shareCode}
                    </p>
                  </div>
                </div>
              </div>

              {/* Copy button */}
              <button
                onClick={() => {
                  handleCopyShareCode(shareModalRoom.shareCode);
                  setTimeout(() => setShareModalRoom(null), 1000);
                }}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Copy Share Code
              </button>

              <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                Share this code with friends so they can join your watch party
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
