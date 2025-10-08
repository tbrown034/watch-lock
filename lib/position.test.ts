import {
  encodeMlbPosition,
  decodeMlbPosition,
  formatMlbPosition,
  isMessageVisible,
  filterMessagesByPosition,
  isValidMlbPosition,
  MlbMeta
} from './position';

describe('Position Encoding', () => {
  it('should encode Top 1st, 0 outs as 0', () => {
    const pos: MlbMeta = { sport: 'mlb', inning: 1, half: 'TOP', outs: 0 };
    expect(encodeMlbPosition(pos)).toBe(0);
  });

  it('should encode Top 1st, 1 out as 1', () => {
    const pos: MlbMeta = { sport: 'mlb', inning: 1, half: 'TOP', outs: 1 };
    expect(encodeMlbPosition(pos)).toBe(1);
  });

  it('should encode Top 1st, 2 outs as 2', () => {
    const pos: MlbMeta = { sport: 'mlb', inning: 1, half: 'TOP', outs: 2 };
    expect(encodeMlbPosition(pos)).toBe(2);
  });

  it('should encode Bottom 1st, 0 outs as 3', () => {
    const pos: MlbMeta = { sport: 'mlb', inning: 1, half: 'BOTTOM', outs: 0 };
    expect(encodeMlbPosition(pos)).toBe(3);
  });

  it('should encode Bottom 1st, 2 outs as 5', () => {
    const pos: MlbMeta = { sport: 'mlb', inning: 1, half: 'BOTTOM', outs: 2 };
    expect(encodeMlbPosition(pos)).toBe(5);
  });

  it('should encode Top 2nd, 0 outs as 6', () => {
    const pos: MlbMeta = { sport: 'mlb', inning: 2, half: 'TOP', outs: 0 };
    expect(encodeMlbPosition(pos)).toBe(6);
  });

  it('should encode Bottom 9th, 2 outs as 53', () => {
    const pos: MlbMeta = { sport: 'mlb', inning: 9, half: 'BOTTOM', outs: 2 };
    expect(encodeMlbPosition(pos)).toBe(53);
  });

  it('should handle extra innings', () => {
    const pos: MlbMeta = { sport: 'mlb', inning: 10, half: 'TOP', outs: 0 };
    expect(encodeMlbPosition(pos)).toBe(54); // (10-1) * 6 + 0 + 0
  });
});

describe('Position Decoding', () => {
  it('should decode 0 to Top 1st, 0 outs', () => {
    const pos = decodeMlbPosition(0);
    expect(pos).toEqual({ sport: 'mlb', inning: 1, half: 'TOP', outs: 0 });
  });

  it('should decode 3 to Bottom 1st, 0 outs', () => {
    const pos = decodeMlbPosition(3);
    expect(pos).toEqual({ sport: 'mlb', inning: 1, half: 'BOTTOM', outs: 0 });
  });

  it('should decode 53 to Bottom 9th, 2 outs', () => {
    const pos = decodeMlbPosition(53);
    expect(pos).toEqual({ sport: 'mlb', inning: 9, half: 'BOTTOM', outs: 2 });
  });
});

describe('Message Visibility - THE CRITICAL TEST', () => {
  it('should show messages at exact user position', () => {
    expect(isMessageVisible(10, 10)).toBe(true);
  });

  it('should show messages before user position', () => {
    expect(isMessageVisible(5, 10)).toBe(true);
  });

  it('should NEVER show messages after user position', () => {
    expect(isMessageVisible(11, 10)).toBe(false);
  });

  it('should show message at position 0', () => {
    expect(isMessageVisible(0, 5)).toBe(true);
  });
});

describe('Message Filtering', () => {
  const messages = [
    { id: '1', pos: 0, body: 'Game start' },
    { id: '2', pos: 5, body: 'Bottom 1st' },
    { id: '3', pos: 10, body: 'Top 2nd' },
    { id: '4', pos: 15, body: 'Bottom 2nd' },
    { id: '5', pos: 20, body: 'Top 3rd' }
  ];

  it('should filter messages correctly for user at position 10', () => {
    const visible = filterMessagesByPosition(messages, 10);
    expect(visible).toHaveLength(3);
    expect(visible.map(m => m.id)).toEqual(['1', '2', '3']);
  });

  it('should show no messages for user at position -1', () => {
    const visible = filterMessagesByPosition(messages, -1);
    expect(visible).toHaveLength(0);
  });

  it('should show all messages for user at position 100', () => {
    const visible = filterMessagesByPosition(messages, 100);
    expect(visible).toHaveLength(5);
  });
});

describe('Position Validation', () => {
  it('should validate correct MLB position', () => {
    const pos: MlbMeta = { sport: 'mlb', inning: 5, half: 'TOP', outs: 2 };
    expect(isValidMlbPosition(pos)).toBe(true);
  });

  it('should reject position with 3 outs', () => {
    const pos: any = { sport: 'mlb', inning: 5, half: 'TOP', outs: 3 };
    expect(isValidMlbPosition(pos)).toBe(false);
  });

  it('should reject position with invalid half', () => {
    const pos: any = { sport: 'mlb', inning: 5, half: 'MIDDLE', outs: 1 };
    expect(isValidMlbPosition(pos)).toBe(false);
  });

  it('should reject position with negative inning', () => {
    const pos: any = { sport: 'mlb', inning: -1, half: 'TOP', outs: 0 };
    expect(isValidMlbPosition(pos)).toBe(false);
  });

  it('should reject position with inning 0', () => {
    const pos: any = { sport: 'mlb', inning: 0, half: 'TOP', outs: 0 };
    expect(isValidMlbPosition(pos)).toBe(false);
  });
});

describe('Position Formatting', () => {
  it('should format Top 5th, 1 out correctly', () => {
    const pos: MlbMeta = { sport: 'mlb', inning: 5, half: 'TOP', outs: 1 };
    expect(formatMlbPosition(pos)).toBe('T5 • 1 out');
  });

  it('should format Bottom 9th, 2 outs correctly', () => {
    const pos: MlbMeta = { sport: 'mlb', inning: 9, half: 'BOTTOM', outs: 2 };
    expect(formatMlbPosition(pos)).toBe('B9 • 2 outs');
  });

  it('should format 0 outs with plural', () => {
    const pos: MlbMeta = { sport: 'mlb', inning: 1, half: 'TOP', outs: 0 };
    expect(formatMlbPosition(pos)).toBe('T1 • 0 outs');
  });
});