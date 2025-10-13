'use client';

import { MlbMeta } from '@/lib/position';
import { GameStateCard } from './GameStateCard';
import type { MlbGameState } from '@/lib/services/mlbGameState';

interface FieldViewProps {
  position: MlbMeta;
  liveState: MlbGameState | null;
  awayTeam: string;
  homeTeam: string;
}

export function FieldView({ position, liveState, awayTeam, homeTeam }: FieldViewProps) {
  // If we have live state data, show it
  if (liveState) {
    return (
      <GameStateCard
        score={liveState.score}
        bases={liveState.bases}
        matchup={liveState.matchup}
        lastPlay={liveState.lastPlay}
        statusMessage={liveState.message}
      />
    );
  }

  // Otherwise, show a state based on the position phase
  if (position.phase === 'PREGAME') {
    return (
      <div className="p-6">
        <GameStateCard
          score={{
            away: { runs: 0, hits: 0, errors: 0, name: awayTeam },
            home: { runs: 0, hits: 0, errors: 0, name: homeTeam }
          }}
          bases={{}}
          statusMessage="Game hasn't started yet"
        />
      </div>
    );
  }

  if (position.phase === 'POSTGAME') {
    return (
      <div className="p-6">
        <GameStateCard
          score={{
            away: { runs: 0, hits: 0, errors: 0, name: awayTeam },
            home: { runs: 0, hits: 0, errors: 0, name: homeTeam }
          }}
          bases={{}}
          statusMessage="Game has ended"
        />
      </div>
    );
  }

  // IN_GAME but no live data - show empty box score and diamond
  return (
    <div className="p-6">
      <GameStateCard
        score={{
          away: { runs: 0, hits: 0, errors: 0, name: awayTeam },
          home: { runs: 0, hits: 0, errors: 0, name: homeTeam }
        }}
        bases={{}}
        statusMessage="In Progress"
      />
    </div>
  );
}
