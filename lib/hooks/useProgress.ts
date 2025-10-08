'use client';

import { useState, useEffect, useCallback } from 'react';
import { MlbMeta } from '@/lib/position';

interface UseProgressOptions {
  gameId: string;
}

export function useProgress({ gameId }: UseProgressOptions) {
  const [position, setPosition] = useState<MlbMeta>({
    sport: 'mlb',
    inning: 1,
    half: 'TOP',
    outs: 0
  });
  const [pos, setPos] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/${gameId}/progress`);

      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }

      const data = await response.json();
      setPosition(data.posMeta);
      setPos(data.pos);
      setError(null);
    } catch (err) {
      console.error('Error fetching progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch progress');
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  // Initial fetch
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const updateProgress = useCallback(async (newPosition: MlbMeta) => {
    try {
      // Optimistically update UI
      setPosition(newPosition);

      const response = await fetch(`/api/games/${gameId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ posMeta: newPosition }),
      });

      if (!response.ok) {
        throw new Error('Failed to update progress');
      }

      const data = await response.json();

      // Update with server response (in case it was rejected due to monotonic rule)
      setPosition(data.posMeta);
      setPos(data.pos);

      return data.updated; // Return whether the update was accepted
    } catch (err) {
      console.error('Error updating progress:', err);
      // Revert optimistic update on error
      await fetchProgress();
      throw err;
    }
  }, [gameId, fetchProgress]);

  return {
    position,
    pos,
    isLoading,
    error,
    updateProgress,
    refetch: fetchProgress
  };
}