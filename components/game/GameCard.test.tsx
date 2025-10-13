import { render, screen } from '@testing-library/react';
import { GameCard } from './GameCard';
import { UI_CONFIG } from '@/lib/constants';

const TIMEZONE_ABBREV = UI_CONFIG.TIMEZONE.split('/').pop();

describe('GameCard', () => {
  it('shows scheduled state for an upcoming matchup', () => {
    render(
      <GameCard
        game={{
          id: 'game-1',
          homeTeam: 'Cardinals',
          awayTeam: 'Cubs',
          startTime: '6:15 PM',
        }}
      />,
    );

    expect(screen.getByRole('heading', { level: 3, name: /Cubs.*Cardinals/ })).toBeInTheDocument();
    expect(screen.getByText(`6:15 PM ${TIMEZONE_ABBREV}`)).toBeInTheDocument();
    expect(screen.getByText('Enter')).toBeInTheDocument();
    expect(screen.getByText('Try Demo')).toBeInTheDocument();
  });

  it('surfaces live state badge and detailed status', () => {
    render(
      <GameCard
        game={{
          id: 'game-2',
          homeTeam: 'Yankees',
          awayTeam: 'Red Sox',
          startTime: '7:10 PM',
          status: 'Live',
          detailedState: 'Top 9th',
        }}
      />,
    );

    expect(screen.getByText('Simulated')).toBeInTheDocument();
    expect(screen.getByText('Top 9th')).toBeInTheDocument();
  });
});
