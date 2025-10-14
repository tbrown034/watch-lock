/**
 * NFL Team Abbreviations
 * Maps full team names to their official 2-3 letter codes
 */

export const NFL_TEAM_ABBREVIATIONS: Record<string, string> = {
  // AFC East
  'Buffalo Bills': 'BUF',
  'Miami Dolphins': 'MIA',
  'New England Patriots': 'NE',
  'New York Jets': 'NYJ',

  // AFC North
  'Baltimore Ravens': 'BAL',
  'Cincinnati Bengals': 'CIN',
  'Cleveland Browns': 'CLE',
  'Pittsburgh Steelers': 'PIT',

  // AFC South
  'Houston Texans': 'HOU',
  'Indianapolis Colts': 'IND',
  'Jacksonville Jaguars': 'JAX',
  'Tennessee Titans': 'TEN',

  // AFC West
  'Denver Broncos': 'DEN',
  'Kansas City Chiefs': 'KC',
  'Las Vegas Raiders': 'LV',
  'Los Angeles Chargers': 'LAC',

  // NFC East
  'Dallas Cowboys': 'DAL',
  'New York Giants': 'NYG',
  'Philadelphia Eagles': 'PHI',
  'Washington Commanders': 'WSH',

  // NFC North
  'Chicago Bears': 'CHI',
  'Detroit Lions': 'DET',
  'Green Bay Packers': 'GB',
  'Minnesota Vikings': 'MIN',

  // NFC South
  'Atlanta Falcons': 'ATL',
  'Carolina Panthers': 'CAR',
  'New Orleans Saints': 'NO',
  'Tampa Bay Buccaneers': 'TB',

  // NFC West
  'Arizona Cardinals': 'ARI',
  'Los Angeles Rams': 'LAR',
  'San Francisco 49ers': 'SF',
  'Seattle Seahawks': 'SEA',

  // Short names (for demo games)
  'Bills': 'BUF',
  'Dolphins': 'MIA',
  'Patriots': 'NE',
  'Jets': 'NYJ',
  'Ravens': 'BAL',
  'Bengals': 'CIN',
  'Browns': 'CLE',
  'Steelers': 'PIT',
  'Texans': 'HOU',
  'Colts': 'IND',
  'Jaguars': 'JAX',
  'Titans': 'TEN',
  'Broncos': 'DEN',
  'Chiefs': 'KC',
  'Raiders': 'LV',
  'Chargers': 'LAC',
  'Cowboys': 'DAL',
  'Giants': 'NYG',
  'Eagles': 'PHI',
  'Commanders': 'WSH',
  'Bears': 'CHI',
  'Lions': 'DET',
  'Packers': 'GB',
  'Vikings': 'MIN',
  'Falcons': 'ATL',
  'Panthers': 'CAR',
  'Saints': 'NO',
  'Buccaneers': 'TB',
  'Cardinals': 'ARI',
  'Rams': 'LAR',
  '49ers': 'SF',
  'Seahawks': 'SEA',
};

/**
 * Get the official NFL abbreviation for a team name
 * Falls back to first 3 letters of last word if not found
 */
export function getTeamAbbreviation(teamName: string): string {
  // Try exact match first
  if (NFL_TEAM_ABBREVIATIONS[teamName]) {
    return NFL_TEAM_ABBREVIATIONS[teamName];
  }

  // Try case-insensitive match
  const lowercaseName = teamName.toLowerCase();
  const match = Object.entries(NFL_TEAM_ABBREVIATIONS).find(
    ([key]) => key.toLowerCase() === lowercaseName
  );

  if (match) {
    return match[1];
  }

  // Fallback: first 3 letters of last word, uppercase
  const lastWord = teamName.split(' ').pop() || teamName;
  return lastWord.slice(0, 3).toUpperCase();
}
