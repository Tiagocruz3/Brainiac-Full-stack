# Testing Guide

Comprehensive testing setup for Brainiac preview system with unit, integration, and E2E tests.

## Test Stack

- **Vitest**: Unit and integration tests
- **React Testing Library**: Component testing
- **Playwright**: E2E browser testing
- **Coverage**: V8 coverage reporting

## Running Tests

### Unit & Integration Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### E2E Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run specific browser
npm run test:e2e -- --project=chromium
```

### Run All Tests

```bash
npm run test:all
```

## Test Structure

```
src/
├── __tests__/
│   ├── setup.ts                      # Global test setup
│   ├── preview-manager.test.ts       # Preview lifecycle tests
│   ├── preview-optimization.test.ts  # Performance optimization tests
│   └── split-pane.test.tsx          # Responsive layout tests
└── ...

e2e/
└── preview-system.spec.ts           # End-to-end tests
```

## Test Coverage Goals

- **Lines**: 80%+
- **Functions**: 80%+
- **Branches**: 80%+
- **Statements**: 80%+

## Writing Tests

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('should render correctly', () => {
    // Test implementation
  });
});
```

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';

describe('MyComponent', () => {
  it('should display text', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test('user can interact with preview', async ({ page }) => {
  await page.goto('/');
  await page.click('button');
  await expect(page.locator('text=Success')).toBeVisible();
});
```

## Test Coverage

### What's Tested

✅ **Preview Manager**
- Instance creation and lifecycle
- Memory management
- Resource cleanup
- Max instance limits

✅ **Preview Optimization**
- Debouncing file updates
- Throttling refreshes
- Smart rebuild detection
- File size validation

✅ **Responsive Layout (SplitPane)**
- Desktop split panes
- Mobile tabs
- Tab switching
- Swipe gestures
- Responsive breakpoints

✅ **E2E Scenarios**
- Full preview flow
- Device frame selection
- Keyboard shortcuts
- Error handling
- Mobile experience

### What Needs More Testing

⚠️ **Preview Iframe**
- Iframe loading states
- Console message capture
- Network request capture

⚠️ **Code Viewer**
- Monaco editor integration
- File tree navigation
- Syntax highlighting

⚠️ **Keyboard Shortcuts**
- All shortcut combinations
- Shortcut conflicts

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Main branch commits
- Pre-deployment

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

## Debugging Tests

### Vitest UI

```bash
npm run test:ui
```

Opens interactive UI at `http://localhost:51204`

### Playwright Debug

```bash
# Debug mode with browser
npx playwright test --debug

# Headed mode
npx playwright test --headed

# Specific test
npx playwright test preview-system.spec.ts:42
```

### Coverage Reports

Coverage reports are generated in `coverage/` directory:
- `coverage/index.html` - Interactive HTML report
- `coverage/lcov.info` - LCOV format
- `coverage/coverage-final.json` - JSON format

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Clean up after tests
- Don't rely on test execution order

### 2. Descriptive Names
```typescript
// ❌ Bad
it('works', () => {});

// ✅ Good
it('should refresh preview when refresh button is clicked', () => {});
```

### 3. Arrange-Act-Assert
```typescript
it('should update file count', () => {
  // Arrange
  const files = { 'test.txt': 'content' };
  
  // Act
  const result = countFiles(files);
  
  // Assert
  expect(result).toBe(1);
});
```

### 4. Mock External Dependencies
```typescript
vi.mock('@/lib/api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: [] }),
}));
```

### 5. Test User Behavior, Not Implementation
```typescript
// ❌ Bad - testing implementation
expect(component.state.isOpen).toBe(true);

// ✅ Good - testing behavior
expect(screen.getByRole('dialog')).toBeVisible();
```

## Performance Testing

### Load Time Tests
```typescript
test('should load within 3 seconds', async ({ page }) => {
  const start = Date.now();
  await page.goto('/');
  await page.waitForSelector('text=Brainiac');
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(3000);
});
```

### Memory Tests
```typescript
it('should not exceed memory limit', async () => {
  const status = previewManager.getStatus();
  expect(status.totalMemory).toBeLessThan(300 * 1024 * 1024); // 300MB
});
```

## Troubleshooting

### Tests Timing Out
- Increase timeout in test file: `test.setTimeout(10000)`
- Check for missing `await` statements
- Verify mock implementations

### Flaky Tests
- Add proper wait conditions: `waitFor(() => ...)`
- Use `screen.findBy*` instead of `getBy*` for async
- Check for race conditions

### Coverage Not 100%
- Some files are intentionally excluded (types, configs)
- Focus on critical path coverage
- 80% is the target, not 100%

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Coverage.js](https://istanbul.js.org/)

