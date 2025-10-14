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
    quarter?: string;
    timeRemaining?: string;
  };
  variant?: 'live' | 'demo';
  sport?: 'mlb' | 'nfl';
}

export function GameCard({ game, variant = 'demo', sport = 'mlb' }: GameCardProps) {
  const isLive = game.status === 'Live';
  const isFinal = game.status === 'Final';
  const isInProgress = game.status === 'In Progress';

  // Game situation (inning for MLB, quarter for NFL)
  const gameSituation = game.quarter || game.inning;

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Teams */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {game.awayTeam} @ {game.homeTeam}
          </span>
          {/* Sport Badge */}
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
            sport === 'nfl'
              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
          }`}>
            {sport}
          </span>
        </div>

        {/* Score or Time */}
        {(isLive || isInProgress) && game.score ? (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {game.score.away} - {game.score.home}
            </span>
            {gameSituation && (
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {gameSituation}
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
