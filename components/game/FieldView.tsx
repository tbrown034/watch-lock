'use client';

import { MlbMeta, NflMeta } from '@/lib/position';
import { GameStateCard } from './GameStateCard';
import { NflFieldView } from './NflFieldView';
import type { MlbGameState } from '@/lib/services/mlbGameState';
import type { NflGameState } from '@/lib/services/nflGameState';

interface FieldViewProps {
  position: MlbMeta | NflMeta;
  liveState: MlbGameState | NflGameState | null;
  awayTeam: string;
  homeTeam: string;
}

export function FieldView({ position, liveState, awayTeam, homeTeam }: FieldViewProps) {
  const isNfl = position.sport === 'nfl';

  // If we have live state data, show it
  if (liveState) {
    if (isNfl) {
      // NFL game state
      const nflState = liveState as NflGameState;
      return (
        <NflFieldView
          score={nflState.score}
          possession={nflState.possession}
          situation={nflState.situation}
          lastPlay={nflState.lastPlay}
          statusMessage={nflState.message}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />
      );
    }

    // MLB game state
    const mlbState = liveState as MlbGameState;
    return (
      <GameStateCard
        score={mlbState.score}
        bases={mlbState.bases}
        matchup={mlbState.matchup}
        lastPlay={mlbState.lastPlay}
        statusMessage={mlbState.message}
      />
    );
  }

  // No live state - show placeholder based on position phase
  if (position.phase === 'PREGAME') {
    if (isNfl) {
      return (
        <NflFieldView
          score={{
            home: { points: 0, name: homeTeam },
            away: { points: 0, name: awayTeam }
          }}
          statusMessage="Game hasn't started yet"
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />
      );
    }

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
    if (isNfl) {
      return (
        <NflFieldView
          score={{
            home: { points: 0, name: homeTeam },
            away: { points: 0, name: awayTeam }
          }}
          statusMessage="Game has ended"
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />
      );
    }

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

  // IN_GAME but no live data
  if (isNfl) {
    return (
      <NflFieldView
        score={{
          home: { points: 0, name: homeTeam },
          away: { points: 0, name: awayTeam }
        }}
        statusMessage="In Progress"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />
    );
  }

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
