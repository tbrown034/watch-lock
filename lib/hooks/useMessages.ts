'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface UseMessagesOptions {
  gameId: string;
  pollInterval?: number;
}

export function useMessages({ gameId, pollInterval = 2000 }: UseMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/${gameId}/messages`);

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();

      // Transform dates from strings to Date objects
      const transformedMessages = data.messages.map((msg: any) => ({
        ...msg,
        createdAt: new Date(msg.createdAt)
      }));

      setMessages(transformedMessages);
      setHiddenCount(data.hiddenCount || 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Polling for updates
  useEffect(() => {
    const interval = setInterval(fetchMessages, pollInterval);
    return () => clearInterval(interval);
  }, [fetchMessages, pollInterval]);

  const sendMessage = useCallback(async (body: string, posMeta: MlbMeta) => {
    try {
      const response = await fetch(`/api/games/${gameId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body, posMeta }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Immediately fetch messages to show the new one
      await fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, [gameId, fetchMessages]);

  return {
    messages,
    hiddenCount,
    isLoading,
    error,
    sendMessage,
    refetch: fetchMessages
  };
}