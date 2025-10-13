import { mockGames } from './mock-data';

describe('mockGames', () => {
  it('only exposes the two curated demo matchups', () => {
    expect(mockGames).toHaveLength(2);
    expect(mockGames).toEqual([
      expect.objectContaining({
        id: 'game-1',
        homeTeam: 'Cardinals',
        awayTeam: 'Cubs',
      }),
      expect.objectContaining({
        id: 'game-2',
        homeTeam: 'Yankees',
        awayTeam: 'Red Sox',
      }),
    ]);
  });
});
