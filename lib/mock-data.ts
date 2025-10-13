import { MlbMeta } from './position';

export interface MockGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status?: string;
  detailedState?: string;
  gameLink?: string;
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
    startTime: '6:15 PM',
    status: 'Live',
    detailedState: 'Top 5th',
    gameLink: 'https://www.mlb.com/gameday/746001'
  },
  {
    id: 'game-2',
    homeTeam: 'Yankees',
    awayTeam: 'Red Sox',
    startTime: '7:10 PM',
    gameLink: 'https://www.mlb.com/gameday/746002'
  },

];

// Messages are stored per game - in MVP, starts empty
export const mockMessages: Record<string, MockMessage[]> = {};
