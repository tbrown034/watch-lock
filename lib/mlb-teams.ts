/**
 * MLB Team Abbreviations
 * Maps full team names to their official 2-3 letter codes
 */

export const MLB_TEAM_ABBREVIATIONS: Record<string, string> = {
  // American League East
  'Baltimore Orioles': 'BAL',
  'Boston Red Sox': 'BOS',
  'New York Yankees': 'NYY',
  'Tampa Bay Rays': 'TB',
  'Toronto Blue Jays': 'TOR',

  // American League Central
  'Chicago White Sox': 'CWS',
  'Cleveland Guardians': 'CLE',
  'Detroit Tigers': 'DET',
  'Kansas City Royals': 'KC',
  'Minnesota Twins': 'MIN',

  // American League West
  'Houston Astros': 'HOU',
  'Los Angeles Angels': 'LAA',
  'Oakland Athletics': 'OAK',
  'Seattle Mariners': 'SEA',
  'Texas Rangers': 'TEX',

  // National League East
  'Atlanta Braves': 'ATL',
  'Miami Marlins': 'MIA',
  'New York Mets': 'NYM',
  'Philadelphia Phillies': 'PHI',
  'Washington Nationals': 'WSH',

  // National League Central
  'Chicago Cubs': 'CHC',
  'Cincinnati Reds': 'CIN',
  'Milwaukee Brewers': 'MIL',
  'Pittsburgh Pirates': 'PIT',
  'St. Louis Cardinals': 'STL',
  'St Louis Cardinals': 'STL',

  // National League West
  'Arizona Diamondbacks': 'ARI',
  'Colorado Rockies': 'COL',
  'Los Angeles Dodgers': 'LAD',
  'San Diego Padres': 'SD',
  'San Francisco Giants': 'SF',

  // Short names (for demo games)
  'Cardinals': 'STL',
  'Cubs': 'CHC',
  'Yankees': 'NYY',
  'Red Sox': 'BOS',
  'Mariners': 'SEA',
  'Blue Jays': 'TOR',
  'Dodgers': 'LAD',
  'Giants': 'SF',
};

/**
 * Get the official MLB abbreviation for a team name
 * Falls back to first 3 letters of last word if not found
 */
export function getTeamAbbreviation(teamName: string): string {
  // Try exact match first
  if (MLB_TEAM_ABBREVIATIONS[teamName]) {
    return MLB_TEAM_ABBREVIATIONS[teamName];
  }

  // Try case-insensitive match
  const lowercaseName = teamName.toLowerCase();
  const match = Object.entries(MLB_TEAM_ABBREVIATIONS).find(
    ([key]) => key.toLowerCase() === lowercaseName
  );

  if (match) {
    return match[1];
  }

  // Fallback: first 3 letters of last word, uppercase
  const lastWord = teamName.split(' ').pop() || teamName;
  return lastWord.slice(0, 3).toUpperCase();
}
