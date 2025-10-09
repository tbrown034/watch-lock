import { Clock } from 'lucide-react';
import { UI_CONFIG } from '@/lib/constants';

interface GameCardProps {
  game: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    startTime: string;
  };
}

export function GameCard({ game }: GameCardProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          {game.awayTeam} <span className="text-slate-400">@</span> {game.homeTeam}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <Clock className="w-4 h-4" aria-hidden="true" />
          <span>
            Scheduled:{' '}
            <span className="font-semibold">
              {game.startTime} {UI_CONFIG.TIMEZONE.split('/').pop()}
            </span>
          </span>
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className="text-blue-600 dark:text-blue-400 font-bold text-lg group-hover:gap-3 flex items-center gap-2 transition-all">
          <span>Join Game</span>
          <span className="transform group-hover:translate-x-1 transition-transform text-2xl" aria-hidden="true">→</span>
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Share your reactions
        </span>
      </div>
    </div>
  );
}
