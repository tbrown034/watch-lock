import {
  encodeMlbPosition,
  decodeMlbPosition,
  formatMlbPosition,
  formatMlbPositionWithTeams,
  isMessageVisible,
  filterMessagesByPosition,
  isValidMlbPosition,
  MlbMeta,
  MLB_PREGAME_POSITION,
  MLB_POSTGAME_POSITION
} from './position';

describe('Position Encoding', () => {
  it('encodes top of 1st with 0-2 outs and END correctly', () => {
    expect(encodeMlbPosition({ sport: 'mlb', inning: 1, half: 'TOP', outs: 0 })).toBe(0);
    expect(encodeMlbPosition({ sport: 'mlb', inning: 1, half: 'TOP', outs: 1 })).toBe(1);
    expect(encodeMlbPosition({ sport: 'mlb', inning: 1, half: 'TOP', outs: 2 })).toBe(2);
    expect(encodeMlbPosition({ sport: 'mlb', inning: 1, half: 'TOP', outs: 'END' })).toBe(3);
  });

  it('encodes bottom of 1st correctly', () => {
    expect(encodeMlbPosition({ sport: 'mlb', inning: 1, half: 'BOTTOM', outs: 0 })).toBe(4);
    expect(encodeMlbPosition({ sport: 'mlb', inning: 1, half: 'BOTTOM', outs: 2 })).toBe(6);
    expect(encodeMlbPosition({ sport: 'mlb', inning: 1, half: 'BOTTOM', outs: 'END' })).toBe(7);
  });

  it('encodes later innings and extra innings', () => {
    expect(encodeMlbPosition({ sport: 'mlb', inning: 2, half: 'TOP', outs: 0 })).toBe(8);
    expect(encodeMlbPosition({ sport: 'mlb', inning: 9, half: 'BOTTOM', outs: 2 })).toBe(70);
    expect(encodeMlbPosition({ sport: 'mlb', inning: 10, half: 'TOP', outs: 0 })).toBe(72);
  });

  it('encodes pregame and postgame sentinels', () => {
    expect(encodeMlbPosition({ sport: 'mlb', inning: 1, half: 'TOP', outs: 0, phase: 'PREGAME' })).toBe(MLB_PREGAME_POSITION);
    expect(encodeMlbPosition({ sport: 'mlb', inning: 9, half: 'BOTTOM', outs: 'END', phase: 'POSTGAME' })).toBe(MLB_POSTGAME_POSITION);
  });
});

describe('Position Decoding', () => {
  it('decodes regular in-game positions', () => {
    expect(decodeMlbPosition(0)).toEqual({ sport: 'mlb', inning: 1, half: 'TOP', outs: 0 });
    expect(decodeMlbPosition(4)).toEqual({ sport: 'mlb', inning: 1, half: 'BOTTOM', outs: 0 });
    expect(decodeMlbPosition(70)).toEqual({ sport: 'mlb', inning: 9, half: 'BOTTOM', outs: 2 });
  });

  it('decodes END positions', () => {
    expect(decodeMlbPosition(3)).toEqual({ sport: 'mlb', inning: 1, half: 'TOP', outs: 'END' });
    expect(decodeMlbPosition(7)).toEqual({ sport: 'mlb', inning: 1, half: 'BOTTOM', outs: 'END' });
  });

  it('decodes pregame and postgame sentinels', () => {
    expect(decodeMlbPosition(MLB_PREGAME_POSITION)).toEqual({
      sport: 'mlb',
      inning: 1,
      half: 'TOP',
      outs: 0,
      phase: 'PREGAME'
    });

    expect(decodeMlbPosition(MLB_POSTGAME_POSITION)).toEqual({
      sport: 'mlb',
      inning: 9,
      half: 'BOTTOM',
      outs: 'END',
      phase: 'POSTGAME'
    });
  });
});

describe('Formatting', () => {
  it('formats active innings', () => {
    expect(formatMlbPosition({ sport: 'mlb', inning: 5, half: 'TOP', outs: 1 })).toBe('Top 5th • 1 out');
    expect(formatMlbPosition({ sport: 'mlb', inning: 9, half: 'BOTTOM', outs: 2 })).toBe('Bottom 9th • 2 outs');
  });

  it('formats END-of-half positions', () => {
    expect(formatMlbPosition({ sport: 'mlb', inning: 3, half: 'TOP', outs: 'END' })).toBe('End of top half • 3rd');
    expect(formatMlbPosition({ sport: 'mlb', inning: 3, half: 'BOTTOM', outs: 'END' })).toBe('End of bottom half • 3rd');
  });

  it('formats phases', () => {
    expect(formatMlbPosition({ sport: 'mlb', inning: 1, half: 'TOP', outs: 0, phase: 'PREGAME' })).toBe('Pregame');
    expect(formatMlbPosition({ sport: 'mlb', inning: 9, half: 'BOTTOM', outs: 'END', phase: 'POSTGAME' })).toBe('Final');
  });

  it('formats with team context', () => {
    const away = 'Cubs';
    const home = 'Cardinals';
    expect(formatMlbPositionWithTeams({ sport: 'mlb', inning: 1, half: 'TOP', outs: 0 }, away, home)).toBe('Top 1st • 0 outs • Cubs batting');
    expect(formatMlbPositionWithTeams({ sport: 'mlb', inning: 1, half: 'TOP', outs: 'END' }, away, home)).toBe('End of top half • 1st');
    expect(formatMlbPositionWithTeams({ sport: 'mlb', inning: 1, half: 'TOP', outs: 0, phase: 'PREGAME' }, away, home)).toBe('Pregame • Cubs @ Cardinals');
    expect(formatMlbPositionWithTeams({ sport: 'mlb', inning: 9, half: 'BOTTOM', outs: 'END', phase: 'POSTGAME' }, away, home)).toBe('Final • Cubs @ Cardinals');
  });
});

describe('Visibility Logic', () => {
  it('obeys core spoiler prevention rule', () => {
    expect(isMessageVisible(10, 10)).toBe(true);
    expect(isMessageVisible(5, 10)).toBe(true);
    expect(isMessageVisible(11, 10)).toBe(false);
    expect(isMessageVisible(0, 5)).toBe(true);
  });

  it('filters messages by position', () => {
    const messages = [
      { id: '1', pos: encodeMlbPosition({ sport: 'mlb', inning: 1, half: 'TOP', outs: 0 }), body: 'Game start' },
      { id: '2', pos: encodeMlbPosition({ sport: 'mlb', inning: 1, half: 'TOP', outs: 'END' }), body: 'Top half over' },
      { id: '3', pos: encodeMlbPosition({ sport: 'mlb', inning: 2, half: 'TOP', outs: 0 }), body: 'Top 2nd begins' }
    ];

    const visible = filterMessagesByPosition(messages, encodeMlbPosition({ sport: 'mlb', inning: 1, half: 'TOP', outs: 'END' }));
    expect(visible.map((m) => m.id)).toEqual(['1', '2']);
  });
});

describe('Validation', () => {
  it('accepts valid in-game and phase states', () => {
    expect(isValidMlbPosition({ sport: 'mlb', inning: 5, half: 'TOP', outs: 2 })).toBe(true);
    expect(isValidMlbPosition({ sport: 'mlb', inning: 5, half: 'TOP', outs: 'END' })).toBe(true);
    expect(isValidMlbPosition({ sport: 'mlb', inning: 1, half: 'TOP', outs: 0, phase: 'PREGAME' })).toBe(true);
    expect(isValidMlbPosition({ sport: 'mlb', inning: 9, half: 'BOTTOM', outs: 'END', phase: 'POSTGAME' })).toBe(true);
  });

  it('rejects invalid data', () => {
    expect(isValidMlbPosition({ sport: 'mlb', inning: 0, half: 'TOP', outs: 0 })).toBe(false);
    expect(isValidMlbPosition({ sport: 'mlb', inning: 1, half: 'MIDDLE' as any, outs: 0 })).toBe(false);
    expect(isValidMlbPosition({ sport: 'mlb', inning: 1, half: 'TOP', outs: 3 as any })).toBe(false);
  });
});
