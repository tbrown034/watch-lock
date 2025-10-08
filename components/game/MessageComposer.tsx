'use client';

import { useState, FormEvent } from 'react';
import { MlbMeta, formatMlbPosition } from '@/lib/position';

interface MessageComposerProps {
  currentPosition: MlbMeta;
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
}

export function MessageComposer({ currentPosition, onSend, disabled = false }: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!message.trim() || isSending || disabled) {
      return;
    }

    setIsSending(true);
    try {
      await onSend(message.trim());
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Posting at: {formatMlbPosition(currentPosition)}
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share your reaction..."
            disabled={disabled || isSending}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
            maxLength={280}
          />
          <button
            type="submit"
            disabled={!message.trim() || isSending || disabled}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg
                     hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 text-right">
          {message.length}/280
        </div>
      </form>
    </div>
  );
}