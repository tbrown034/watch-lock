import { formatMlbPosition, MlbMeta } from '@/lib/position';
import { Trash2 } from 'lucide-react';

interface MessageCardProps {
  message: {
    id: string;
    author: string;
    body: string;
    position: MlbMeta;
  };
  isOwnMessage: boolean;
  onDelete?: (id: string) => void;
}

export function MessageCard({ message, isOwnMessage, onDelete }: MessageCardProps) {
  return (
    <div
      className={`p-4 rounded-xl shadow-sm transform hover:scale-[1.02] transition-all ${
        isOwnMessage
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ml-8'
          : 'bg-white dark:bg-slate-700 mr-8 border border-slate-200 dark:border-slate-600'
      }`}
    >
      <div className={`flex items-center mb-2 ${isOwnMessage ? 'flex-row-reverse gap-2' : 'gap-2'}`}>
        <div
          className={`flex-1 flex items-center ${isOwnMessage ? 'justify-end' : 'justify-start'} gap-2`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              isOwnMessage ? 'bg-white/20 text-white' : 'bg-blue-500 text-white'
            }`}
            aria-hidden="true"
          >
            {message.author[0]}
          </div>
          <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
            <span
              className={`font-bold text-sm ${
                isOwnMessage ? 'text-white' : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              {message.author}
            </span>
            <span
              className={`text-xs ${
                isOwnMessage ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {formatMlbPosition(message.position)}
            </span>
          </div>
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(message.id)}
            className={`rounded-full p-1 transition ${
              isOwnMessage
                ? 'text-white hover:bg-white/20'
                : 'text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-600'
            }`}
            aria-label="Delete message"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <p
        className={`text-base leading-relaxed ${
          isOwnMessage ? 'text-white' : 'text-slate-800 dark:text-slate-200'
        }`}
      >
        {message.body}
      </p>
    </div>
  );
}
