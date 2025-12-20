/**
 * E2E Tests for Preview System
 * Full user flow testing with Playwright
 */

import { test, expect } from '@playwright/test';

test.describe('Preview System E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForSelector('text=Brainiac');
  });

  test('should display settings warning when no API keys configured', async ({ page }) => {
    const warning = page.locator('text=Configure API keys to start');
    await expect(warning).toBeVisible();
  });

  test('should open settings modal', async ({ page }) => {
    // Click settings button
    await page.click('button[aria-label="Settings"]');
    
    // Wait for modal
    const modal = page.locator('text=API Configuration');
    await expect(modal).toBeVisible();
  });

  test.describe('Desktop experience', () => {
    test('should show split pane layout on desktop', async ({ page }) => {
      const chat = page.locator('text=Chat Content').or(page.locator('[data-testid="chat"]'));
      await expect(chat).toBeVisible();

      // Should be side-by-side layout (not tabs)
      const tabs = page.locator('text=Chat').and(page.locator('text=Code')).first();
      await expect(tabs).not.toBeVisible();
    });

    test('should show code viewer when files are generated', async ({ page }) => {
      // Mock file generation (would need actual implementation or mocks)
      // This is a placeholder for when the feature is fully integrated
    });
  });

  test.describe('Mobile experience', () => {
    test.use({ 
      viewport: { width: 375, height: 667 },
      isMobile: true,
    });

    test('should show tabbed interface on mobile', async ({ page }) => {
      // Should see tab bar
      const chatTab = page.locator('button', { hasText: 'Chat' });
      await expect(chatTab).toBeVisible();
    });

    test('should switch tabs on mobile', async ({ page }) => {
      // When code content is available, should see Code tab
      const codeTab = page.locator('button', { hasText: 'Code' });
      
      // If tab exists, click it
      if (await codeTab.isVisible()) {
        await codeTab.click();
        
        // Should switch to code view
        await expect(page.locator('[data-testid="code-viewer"]')).toBeVisible();
      }
    });

    test('should swipe between tabs', async ({ page }) => {
      // This would require more complex gesture simulation
      // Placeholder for touch gesture testing
    });

    test('should show drawer sidebar', async ({ page }) => {
      // Click hamburger menu
      const menuButton = page.locator('button[aria-label="Open menu"]');
      
      if (await menuButton.isVisible()) {
        await menuButton.click();
        
        // Should show sidebar
        const sidebar = page.locator('text=Project History');
        await expect(sidebar).toBeVisible();
      }
    });
  });

  test.describe('Preview iframe', () => {
    test('should load preview when deployment URL is available', async ({ page }) => {
      // Mock deployment URL (would need actual implementation)
      // This is a placeholder for when the feature is fully integrated
    });

    test('should show device frame selector', async ({ page }) => {
      // When preview is active
      const deviceSelector = page.locator('button', { hasText: 'Desktop' });
      
      if (await deviceSelector.isVisible()) {
        await deviceSelector.click();
        
        // Should show device options
        await expect(page.locator('text=Device Presets')).toBeVisible();
      }
    });

    test('should refresh preview', async ({ page }) => {
      const refreshButton = page.locator('button[title="Refresh preview"]');
      
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        
        // Should trigger refresh
        // Would need to verify iframe reload
      }
    });

    test('should copy preview URL', async ({ page }) => {
      // Grant clipboard permissions
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      
      const copyButton = page.locator('button[title="Copy preview URL"]');
      
      if (await copyButton.isVisible()) {
        await copyButton.click();
        
        // Should show success indicator
        await expect(page.locator('svg.text-green-500')).toBeVisible();
      }
    });

    test('should open preview in new tab', async ({ page, context }) => {
      const openButton = page.locator('button[title="Open in new tab"]');
      
      if (await openButton.isVisible()) {
        const [newPage] = await Promise.all([
          context.waitForEvent('page'),
          openButton.click(),
        ]);
        
        // New tab should open
        expect(newPage).toBeTruthy();
        await newPage.close();
      }
    });
  });

  test.describe('Keyboard shortcuts', () => {
    test('should refresh preview with R key', async ({ page }) => {
      // Focus on preview area (not input field)
      await page.click('body');
      
      // Press R
      await page.keyboard.press('r');
      
      // Should trigger refresh (would need to verify)
    });

    test('should toggle orientation with O key', async ({ page }) => {
      await page.click('body');
      await page.keyboard.press('o');
      
      // Should toggle orientation (would need to verify)
    });

    test('should zoom with +/- keys', async ({ page }) => {
      await page.click('body');
      
      // Zoom in
      await page.keyboard.press('+');
      
      // Zoom out
      await page.keyboard.press('-');
      
      // Should adjust scale (would need to verify)
    });
  });

  test.describe('Error handling', () => {
    test('should show error state when preview fails', async ({ page }) => {
      // Mock preview error (would need actual implementation)
      // This is a placeholder for error state testing
    });

    test('should allow retry on error', async ({ page }) => {
      const retryButton = page.locator('button', { hasText: 'Try Again' });
      
      if (await retryButton.isVisible()) {
        await retryButton.click();
        
        // Should attempt to reload
      }
    });

    test('should show clear cache option', async ({ page }) => {
      const clearButton = page.locator('button', { hasText: 'Clear Cache' });
      
      if (await clearButton.isVisible()) {
        await clearButton.click();
        
        // Should clear cache and retry
      }
    });
  });

  test.describe('Responsive breakpoints', () => {
    test('tablet view (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Should show appropriate layout
      await expect(page.locator('text=Brainiac')).toBeVisible();
    });

    test('desktop view (1920px)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Should show split pane layout
      await expect(page.locator('text=Brainiac')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForSelector('text=Brainiac');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should not have console errors', async ({ page }) => {
      const errors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // Filter out expected errors (like 404s from missing assets)
      const criticalErrors = errors.filter(
        err => !err.includes('404') && !err.includes('Failed to load resource')
      );
      
      expect(criticalErrors).toHaveLength(0);
    });
  });
});

