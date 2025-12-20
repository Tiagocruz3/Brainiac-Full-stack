/**
 * Preview Manager Tests
 * Tests for preview lifecycle management and resource cleanup
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { previewManager } from '@/lib/preview-manager';

describe('Preview Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup all instances after each test
    await previewManager.dispose();
  });

  describe('createPreview', () => {
    it('should create a new preview instance', async () => {
      const files = {
        'index.html': '<html></html>',
        'app.js': 'console.log("test")',
      };

      const result = await previewManager.createPreview('test-1', 'Test Project', files);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const status = previewManager.getStatus();
      expect(status.instanceCount).toBe(1);
    });

    it('should calculate memory usage correctly', async () => {
      const files = {
        'index.html': '<html></html>',
        'app.js': 'console.log("test")',
      };

      await previewManager.createPreview('test-1', 'Test Project', files);

      const status = previewManager.getStatus();
      expect(status.totalMemory).toBeGreaterThan(0);
    });

    it('should reject previews exceeding memory limit', async () => {
      const largeContent = 'x'.repeat(101 * 1024 * 1024); // 101MB
      const files = {
        'large.txt': largeContent,
      };

      const result = await previewManager.createPreview('test-1', 'Large Project', files);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toContain('memory');
    });

    it('should cleanup oldest instance when max instances reached', async () => {
      const files = { 'test.txt': 'test' };

      // Create 3 instances (max)
      await previewManager.createPreview('test-1', 'Project 1', files);
      await previewManager.createPreview('test-2', 'Project 2', files);
      await previewManager.createPreview('test-3', 'Project 3', files);

      expect(previewManager.getStatus().instanceCount).toBe(3);

      // Create 4th instance - should cleanup oldest
      await previewManager.createPreview('test-4', 'Project 4', files);

      const status = previewManager.getStatus();
      expect(status.instanceCount).toBe(3);
    });
  });

  describe('updatePreview', () => {
    it('should update existing preview', async () => {
      const files = { 'test.txt': 'initial' };
      await previewManager.createPreview('test-1', 'Test', files);

      const updatedFiles = { 'test.txt': 'updated' };
      const result = await previewManager.updatePreview('test-1', updatedFiles);

      expect(result.success).toBe(true);
      const preview = previewManager.getPreview('test-1');
      expect(preview?.files['test.txt']).toBe('updated');
    });

    it('should return error for non-existent preview', async () => {
      const result = await previewManager.updatePreview('non-existent', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getPreview', () => {
    it('should retrieve preview by id', async () => {
      const files = { 'test.txt': 'test' };
      await previewManager.createPreview('test-1', 'Test', files);

      const preview = previewManager.getPreview('test-1');

      expect(preview).toBeDefined();
      expect(preview?.id).toBe('test-1');
      expect(preview?.projectName).toBe('Test');
    });

    it('should update lastAccessedAt when retrieving', async () => {
      const files = { 'test.txt': 'test' };
      await previewManager.createPreview('test-1', 'Test', files);

      const preview1 = previewManager.getPreview('test-1');
      const time1 = preview1?.lastAccessedAt;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      const preview2 = previewManager.getPreview('test-1');
      const time2 = preview2?.lastAccessedAt;

      expect(time2).toBeGreaterThan(time1!);
    });

    it('should return null for non-existent preview', () => {
      const preview = previewManager.getPreview('non-existent');
      expect(preview).toBeNull();
    });
  });

  describe('destroyPreview', () => {
    it('should destroy preview instance', async () => {
      const files = { 'test.txt': 'test' };
      await previewManager.createPreview('test-1', 'Test', files);

      expect(previewManager.getStatus().instanceCount).toBe(1);

      await previewManager.destroyPreview('test-1');

      expect(previewManager.getStatus().instanceCount).toBe(0);
      expect(previewManager.getPreview('test-1')).toBeNull();
    });

    it('should handle destroying non-existent preview', async () => {
      await expect(previewManager.destroyPreview('non-existent')).resolves.not.toThrow();
    });
  });

  describe('getStatus', () => {
    it('should return accurate status', async () => {
      const files = { 'test.txt': 'test' };
      await previewManager.createPreview('test-1', 'Test 1', files);
      await previewManager.createPreview('test-2', 'Test 2', files);

      const status = previewManager.getStatus();

      expect(status.instanceCount).toBe(2);
      expect(status.maxInstances).toBe(3);
      expect(status.totalMemory).toBeGreaterThan(0);
      expect(status.instances).toHaveLength(2);
    });

    it('should include instance details', async () => {
      const files = { 'test.txt': 'test' };
      await previewManager.createPreview('test-1', 'Test', files);

      const status = previewManager.getStatus();
      const instance = status.instances[0];

      expect(instance.id).toBe('test-1');
      expect(instance.projectName).toBe('Test');
      expect(instance.age).toBeGreaterThanOrEqual(0);
      expect(instance.idleTime).toBeGreaterThanOrEqual(0);
      expect(instance.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('dispose', () => {
    it('should cleanup all instances', async () => {
      const files = { 'test.txt': 'test' };
      await previewManager.createPreview('test-1', 'Test 1', files);
      await previewManager.createPreview('test-2', 'Test 2', files);

      expect(previewManager.getStatus().instanceCount).toBe(2);

      await previewManager.dispose();

      expect(previewManager.getStatus().instanceCount).toBe(0);
    });
  });
});

