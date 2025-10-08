# WatchLock Testing Specification

## Testing Philosophy
- Test the critical path first (no spoilers!)
- Focus on user behavior, not implementation
- Real-time features need special attention
- Mobile responsiveness is mandatory

## Unit Tests

### Core Logic Tests (`lib/utils/game-logic.test.ts`)

```typescript
describe('Position Calculation', () => {
  it('should calculate correct position for top of inning');
  it('should calculate correct position for bottom of inning');
  it('should handle extra innings (10+)');
  it('should handle 0-3 outs correctly');
});

describe('Message Filtering', () => {
  const testCases = [
    {
      name: 'shows messages at exact position',
      userPos: { inning: 5, half: 'TOP', outs: 2 },
      msgPos: { inning: 5, half: 'TOP', outs: 2 },
      shouldShow: true
    },
    {
      name: 'shows messages before position',
      userPos: { inning: 5, half: 'BOTTOM', outs: 0 },
      msgPos: { inning: 3, half: 'TOP', outs: 1 },
      shouldShow: true
    },
    {
      name: 'hides messages after position',
      userPos: { inning: 5, half: 'TOP', outs: 0 },
      msgPos: { inning: 5, half: 'BOTTOM', outs: 0 },
      shouldShow: false
    },
    {
      name: 'handles same inning different half',
      userPos: { inning: 7, half: 'TOP', outs: 2 },
      msgPos: { inning: 7, half: 'BOTTOM', outs: 1 },
      shouldShow: false
    }
  ];

  testCases.forEach(test => {
    it(test.name, () => {
      const result = isMessageVisible(test.msgPos, test.userPos);
      expect(result).toBe(test.shouldShow);
    });
  });
});

describe('Share Code Generation', () => {
  it('should generate 6-character code');
  it('should use only unambiguous characters');
  it('should generate unique codes');
  it('should be case-insensitive for lookup');
});
```

### Component Tests (`components/**/*.test.tsx`)

```typescript
describe('ProgressSlider', () => {
  it('should display current position correctly');
  it('should update position on drag');
  it('should snap to valid positions');
  it('should prevent invalid positions');
  it('should show "LIVE" badge when at max position');
  it('should be keyboard accessible');
});

describe('MessageTimeline', () => {
  it('should render visible messages');
  it('should not render filtered messages');
  it('should group messages by inning');
  it('should show user avatars');
  it('should indicate own messages');
  it('should auto-scroll to bottom on new message');
  it('should show "new messages" indicator');
});

describe('MessageInput', () => {
  it('should send message on Enter');
  it('should send message on button click');
  it('should clear after sending');
  it('should disable when sending');
  it('should show character limit');
  it('should prevent empty messages');
});
```

### Hook Tests (`lib/hooks/*.test.ts`)

```typescript
describe('useGame', () => {
  it('should load game data on mount');
  it('should filter messages based on progress');
  it('should update messages in real-time');
  it('should handle progress updates');
  it('should optimistically update UI');
  it('should rollback on error');
});

describe('useRealtime', () => {
  it('should establish connection');
  it('should reconnect on disconnect');
  it('should handle subscription');
  it('should cleanup on unmount');
  it('should queue messages when offline');
});
```

## Integration Tests

### API Tests (`tests/integration/api.test.ts`)

```typescript
describe('Game API', () => {
  describe('POST /api/games', () => {
    it('should create game with valid data');
    it('should generate unique share code');
    it('should add creator as participant');
    it('should require authentication');
    it('should validate team names');
  });

  describe('POST /api/games/join', () => {
    it('should join game with valid code');
    it('should be case-insensitive');
    it('should prevent duplicate joins');
    it('should return 404 for invalid code');
    it('should include game details in response');
  });
});

describe('Message API', () => {
  describe('POST /api/games/:id/messages', () => {
    it('should create message with current game position');
    it('should broadcast to all participants');
    it('should require game membership');
    it('should validate message length');
    it('should sanitize HTML content');
  });

  describe('GET /api/games/:id/messages', () => {
    it('should return filtered messages based on user progress');
    it('should paginate results');
    it('should include user data');
    it('should order by position then time');
  });
});

describe('Progress API', () => {
  describe('PATCH /api/games/:id/progress', () => {
    it('should update user progress');
    it('should broadcast update to others');
    it('should validate position values');
    it('should not allow backward progress past seen messages');
  });
});
```

### Database Tests (`tests/integration/database.test.ts`)

```typescript
describe('Row Level Security', () => {
  it('should only show games user is part of');
  it('should only show messages in user games');
  it('should prevent reading other user progress');
  it('should cascade delete properly');
});

describe('Database Constraints', () => {
  it('should enforce unique share codes');
  it('should enforce unique game-user pairs');
  it('should require all message position fields');
  it('should validate enum values');
});
```

## E2E Tests

### Critical User Flows (`tests/e2e/flows.spec.ts`)

```typescript
test('Complete game session', async ({ page, context }) => {
  // User A: Create game
  await page.goto('/');
  await page.click('text=Get Started');
  await page.fill('[name=email]', 'user_a@test.com');
  await page.fill('[name=password]', 'password');
  await page.click('text=Sign In');

  await page.click('text=Create Game');
  await page.fill('[name=title]', 'Cubs @ Cardinals');
  await page.fill('[name=homeTeam]', 'Cardinals');
  await page.fill('[name=awayTeam]', 'Cubs');
  await page.click('text=Create');

  const shareCode = await page.textContent('[data-testid=share-code]');

  // User B: Join game in new context
  const page2 = await context.newPage();
  await page2.goto('/join');
  await page2.fill('[name=email]', 'user_b@test.com');
  await page2.fill('[name=password]', 'password');
  await page2.click('text=Sign In');

  await page2.fill('[name=shareCode]', shareCode);
  await page2.click('text=Join Game');

  // User A: Send messages at different positions
  await page.click('[data-testid=progress-slider]');
  await page.dragAndDrop(
    '[data-testid=slider-thumb]',
    '[data-testid=inning-3]'
  );
  await page.fill('[data-testid=message-input]', 'Great play!');
  await page.press('[data-testid=message-input]', 'Enter');

  // User B: Should not see message yet
  await expect(page2.locator('text=Great play!')).not.toBeVisible();

  // User B: Advance progress
  await page2.dragAndDrop(
    '[data-testid=slider-thumb]',
    '[data-testid=inning-3]'
  );

  // User B: Should now see message
  await expect(page2.locator('text=Great play!')).toBeVisible();
});

test('No spoilers revealed', async ({ page }) => {
  // Setup game with messages at innings 1, 3, 5, 7, 9
  await setupGameWithMessages(page);

  // Start at inning 1
  await page.dragAndDrop('[data-testid=slider-thumb]', '[data-testid=inning-1]');
  await expect(page.locator('[data-testid=message]')).toHaveCount(1);

  // Jump to inning 5
  await page.dragAndDrop('[data-testid=slider-thumb]', '[data-testid=inning-5]');
  await expect(page.locator('[data-testid=message]')).toHaveCount(3);

  // Jump to inning 9
  await page.dragAndDrop('[data-testid=slider-thumb]', '[data-testid=inning-9]');
  await expect(page.locator('[data-testid=message]')).toHaveCount(5);

  // Go back to inning 5 - should still see all 5 (no hiding)
  await page.dragAndDrop('[data-testid=slider-thumb]', '[data-testid=inning-5]');
  await expect(page.locator('[data-testid=message]')).toHaveCount(5);
});

test('Real-time updates', async ({ page, context }) => {
  // Two users in same game
  const { page1, page2 } = await setupTwoUsersInGame(context);

  // User 1 sends message
  await page1.fill('[data-testid=message-input]', 'Home run!');
  await page1.press('[data-testid=message-input]', 'Enter');

  // User 2 sees it immediately (both at same progress)
  await expect(page2.locator('text=Home run!')).toBeVisible({ timeout: 1000 });

  // User 2 updates progress
  await page2.dragAndDrop('[data-testid=slider-thumb]', '[data-testid=inning-7]');

  // User 1 sees progress update indicator
  await expect(page1.locator('text=user_b is at Top 7th')).toBeVisible();
});
```

### Mobile Tests (`tests/e2e/mobile.spec.ts`)

```typescript
test.describe('Mobile Experience', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should be fully responsive', async ({ page }) => {
    await page.goto('/games/123');

    // Check mobile menu
    await page.click('[data-testid=mobile-menu]');
    await expect(page.locator('[data-testid=mobile-nav]')).toBeVisible();

    // Check touch slider works
    await page.locator('[data-testid=progress-slider]').tap();
    await page.touchscreen.swipe(100, 300, 200, 300);

    // Check message input accessible
    await page.tap('[data-testid=message-input]');
    await page.keyboard.type('Mobile message');
    await page.tap('[data-testid=send-button]');
  });
});
```

### Performance Tests (`tests/e2e/performance.spec.ts`)

```typescript
test('should handle 1000+ messages efficiently', async ({ page }) => {
  await setupGameWithManyMessages(page, 1000);

  const startTime = Date.now();
  await page.goto('/games/123');
  await page.waitForSelector('[data-testid=message]');
  const loadTime = Date.now() - startTime;

  expect(loadTime).toBeLessThan(2000); // Should load in under 2s

  // Check virtualization works
  const visibleMessages = await page.locator('[data-testid=message]').count();
  expect(visibleMessages).toBeLessThan(50); // Should virtualize
});

test('real-time updates should be < 100ms', async ({ page, context }) => {
  const { page1, page2, measureLatency } = await setupLatencyTest(context);

  const latency = await measureLatency(async () => {
    await page1.fill('[data-testid=message-input]', 'Test');
    await page1.press('[data-testid=message-input]', 'Enter');
  });

  expect(latency).toBeLessThan(100);
});
```

## Test Data

### Fixtures (`tests/fixtures/`)

```typescript
export const mockUsers = [
  { id: '1', email: 'john@test.com', username: 'john' },
  { id: '2', email: 'sarah@test.com', username: 'sarah' },
  { id: '3', email: 'mike@test.com', username: 'mike' }
];

export const mockGame = {
  id: 'game-1',
  shareCode: 'ABC123',
  title: 'Cubs @ Cardinals',
  homeTeam: 'Cardinals',
  awayTeam: 'Cubs',
  status: 'IN_PROGRESS'
};

export const mockMessages = [
  {
    id: 'msg-1',
    content: 'First inning message',
    inning: 1,
    inningHalf: 'TOP',
    outs: 0
  },
  {
    id: 'msg-2',
    content: 'Third inning message',
    inning: 3,
    inningHalf: 'BOTTOM',
    outs: 2
  },
  // ... more test messages
];
```

## Test Commands

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "playwright test",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:ui": "playwright test --ui",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

## CI/CD Pipeline

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e

  deploy:
    needs: [test, e2e]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: vercel deploy --prod
```