'use client';

import { useEffect, useRef } from 'react';
import { MessageCard } from './MessageCard';
import { MlbMeta } from '@/lib/position';

interface Message {
  id: string;
  body: string;
  pos: number;
  posMeta: MlbMeta;
  createdAt: Date;
  author: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
}

interface MessageFeedProps {
  messages: Message[];
  currentUserId: string;
  hiddenCount?: number;
  onDeleteMessage?: (id: string) => void;
}

export function MessageFeed({
  messages,
  currentUserId,
  hiddenCount = 0,
  onDeleteMessage
}: MessageFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">No messages yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Be the first to share a reaction!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {hiddenCount > 0 && (
        <div className="text-center py-3 mb-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            📦 {hiddenCount} message{hiddenCount > 1 ? 's' : ''} waiting ahead
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Advance your progress to see them
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        {messages.map((message) => (
          <MessageCard
            key={message.id}
            message={{
              id: message.id,
              author: message.author.username,
              body: message.body,
              position: message.posMeta
            }}
            isOwnMessage={message.author.id === currentUserId}
            onDelete={onDeleteMessage}
          />
        ))}
      </div>

      <div ref={bottomRef} />
    </div>
  );
}
