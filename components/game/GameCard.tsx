interface GameCardProps {
  game: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    startTime: string;
    status?: string;
    detailedState?: string;
    venue?: string;
    score?: {
      home: number;
      away: number;
    };
    inning?: string;
  };
  variant?: 'live' | 'demo';
}

export function GameCard({ game, variant = 'demo' }: GameCardProps) {
  const isLive = game.status === 'Live';
  const isFinal = game.status === 'Final';
  const isInProgress = game.status === 'In Progress';

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Teams */}
      <div className="flex-1 space-y-1">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {game.awayTeam} @ {game.homeTeam}
        </div>

        {/* Score or Time */}
        {(isLive || isInProgress) && game.score ? (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {game.score.away} - {game.score.home}
            </span>
            {game.inning && (
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {game.inning}
              </span>
            )}
          </div>
        ) : isFinal && game.score ? (
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {game.score.away} - {game.score.home}
          </div>
        ) : (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {game.startTime}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="text-right">
        {isLive && (
          <span className="text-xs font-medium text-green-600 dark:text-green-400">
            LIVE
          </span>
        )}
        {isInProgress && (
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            IN PROGRESS
          </span>
        )}
        {isFinal && (
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            FINAL
          </span>
        )}
      </div>
    </div>
  );
}
