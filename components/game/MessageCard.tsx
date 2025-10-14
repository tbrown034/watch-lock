import { formatMlbPosition, formatNflPosition, MlbMeta, NflMeta } from '@/lib/position';
import { Trash2 } from 'lucide-react';

interface MessageCardProps {
  message: {
    id: string;
    author: string;
    body: string;
    position: MlbMeta | NflMeta;
  };
  isOwnMessage: boolean;
  onDelete?: (id: string) => void;
}

export function MessageCard({ message, isOwnMessage, onDelete }: MessageCardProps) {
  // Format position based on sport
  const formattedPosition = message.position.sport === 'nfl'
    ? formatNflPosition(message.position as NflMeta)
    : formatMlbPosition(message.position as MlbMeta);

  return (
    <div
      className={`p-2.5 rounded-lg transition-all ${
        isOwnMessage
          ? 'bg-blue-600 text-white ml-6'
          : 'bg-white dark:bg-slate-700 mr-6 border border-slate-200 dark:border-slate-600'
      }`}
    >
      <div className={`flex items-start gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${
            isOwnMessage ? 'bg-white/20 text-white' : 'bg-blue-500 text-white'
          }`}
          aria-hidden="true"
        >
          {message.author[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
            <span
              className={`font-semibold text-xs ${
                isOwnMessage ? 'text-white' : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              {message.author}
            </span>
            <span
              className={`text-[10px] ${
                isOwnMessage ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {formattedPosition}
            </span>
            {onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className={`rounded-full p-0.5 transition ml-auto ${
                  isOwnMessage
                    ? 'text-white/70 hover:text-white hover:bg-white/20'
                    : 'text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-600'
                }`}
                aria-label="Delete message"
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
          <p
            className={`text-sm leading-snug ${
              isOwnMessage ? 'text-white' : 'text-slate-800 dark:text-slate-200'
            }`}
          >
            {message.body}
          </p>
        </div>
      </div>
    </div>
  );
}
