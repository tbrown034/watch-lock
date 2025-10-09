import { MlbMeta } from './position';

export interface MockGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
}

export interface MockMessage {
  id: string;
  author: string;
  body: string;
  position: MlbMeta;
}

// Today's games - API would provide this data
export const mockGames: MockGame[] = [
  {
    id: 'game-1',
    homeTeam: 'Cardinals',
    awayTeam: 'Cubs',
    startTime: '6:15 PM'
  },
  {
    id: 'game-2',
    homeTeam: 'Yankees',
    awayTeam: 'Red Sox',
    startTime: '7:10 PM'
  },
  {
    id: 'game-3',
    homeTeam: 'Dodgers',
    awayTeam: 'Giants',
    startTime: '9:40 PM'
  },
  {
    id: 'game-4',
    homeTeam: 'Astros',
    awayTeam: 'Rangers',
    startTime: '5:30 PM'
  }
];

// Messages are stored per game - in MVP, starts empty
export const mockMessages: Record<string, MockMessage[]> = {};
