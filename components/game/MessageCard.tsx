import { formatMlbPosition } from '@/lib/position';
import { MlbMeta } from '@/lib/position';

interface MessageCardProps {
  message: {
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
  };
  isOwn: boolean;
  showPosition?: boolean;
}

export function MessageCard({ message, isOwn, showPosition = true }: MessageCardProps) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
        <div className={`flex items-start space-x-2 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm font-bold">
              {message.author.username[0].toUpperCase()}
            </div>
          </div>

          {/* Message Content */}
          <div className="flex-1">
            <div className="flex items-baseline space-x-2 mb-1">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {message.author.username}
              </span>
              {showPosition && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  • {formatMlbPosition(message.posMeta)}
                </span>
              )}
            </div>

            <div
              className={`rounded-lg px-4 py-2 ${
                isOwn
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
            </div>

            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formatTime(message.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}