/**
 * Preview Optimization Tests
 * Tests for debouncing, throttling, and smart rebuild detection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePreviewOptimization, usePerformanceMonitor } from '@/hooks/usePreviewOptimization';

describe('usePreviewOptimization', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('debounceFileUpdate', () => {
    it('should debounce file updates', async () => {
      const callback = vi.fn();
      const { result } = renderHook(() => usePreviewOptimization({ debounceDelay: 500 }));

      const files1 = { 'test.txt': 'v1' };
      const files2 = { 'test.txt': 'v2' };
      const files3 = { 'test.txt': 'v3' };

      act(() => {
        result.current.debounceFileUpdate(files1, callback);
        result.current.debounceFileUpdate(files2, callback);
        result.current.debounceFileUpdate(files3, callback);
      });

      // Should not call immediately
      expect(callback).not.toHaveBeenCalled();

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Should call once with merged files
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(files3);
    });

    it('should batch multiple file updates', async () => {
      const callback = vi.fn();
      const { result } = renderHook(() => usePreviewOptimization({ debounceDelay: 500 }));

      act(() => {
        result.current.debounceFileUpdate({ 'a.txt': 'a' }, callback);
        result.current.debounceFileUpdate({ 'b.txt': 'b' }, callback);
        result.current.debounceFileUpdate({ 'c.txt': 'c' }, callback);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        'a.txt': 'a',
        'b.txt': 'b',
        'c.txt': 'c',
      });
    });
  });

  describe('throttlePreviewRefresh', () => {
    it('should throttle preview refreshes', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => usePreviewOptimization({ throttleDelay: 1000 }));

      // First call should execute immediately
      act(() => {
        result.current.throttlePreviewRefresh(callback);
      });
      expect(callback).toHaveBeenCalledTimes(1);

      // Second call within throttle period should be delayed
      act(() => {
        result.current.throttlePreviewRefresh(callback);
      });
      expect(callback).toHaveBeenCalledTimes(1);

      // After throttle period
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('shouldRebuild', () => {
    it('should detect when files change', () => {
      const { result } = renderHook(() => usePreviewOptimization());

      const files1 = { 'test.txt': 'content1' };
      const files2 = { 'test.txt': 'content2' };

      const shouldRebuild1 = result.current.shouldRebuild(files1);
      expect(shouldRebuild1).toBe(true);

      const shouldRebuild2 = result.current.shouldRebuild(files1);
      expect(shouldRebuild2).toBe(false); // Same files

      const shouldRebuild3 = result.current.shouldRebuild(files2);
      expect(shouldRebuild3).toBe(true); // Different content
    });

    it('should handle file additions', () => {
      const { result } = renderHook(() => usePreviewOptimization());

      const files1 = { 'test.txt': 'content' };
      const files2 = { 'test.txt': 'content', 'new.txt': 'new' };

      result.current.shouldRebuild(files1);
      const shouldRebuild = result.current.shouldRebuild(files2);

      expect(shouldRebuild).toBe(true);
    });
  });

  describe('validateFileSize', () => {
    it('should validate file sizes', () => {
      const { result } = renderHook(() => usePreviewOptimization({ maxFileSize: 1024 }));

      const files = {
        'small.txt': 'x'.repeat(100),
        'large.txt': 'x'.repeat(2000),
      };

      const validation = result.current.validateFileSize(files);

      expect(validation.valid).toBe(false);
      expect(validation.oversized).toContain('large.txt');
    });

    it('should pass validation for valid sizes', () => {
      const { result } = renderHook(() => usePreviewOptimization({ maxFileSize: 1024 * 1024 }));

      const files = {
        'file1.txt': 'small content',
        'file2.txt': 'also small',
      };

      const validation = result.current.validateFileSize(files);

      expect(validation.valid).toBe(true);
      expect(validation.oversized).toHaveLength(0);
    });
  });

  describe('estimateMemoryUsage', () => {
    it('should estimate memory usage', () => {
      const { result } = renderHook(() => usePreviewOptimization());

      const files = {
        'test.txt': 'x'.repeat(1000),
      };

      const memory = result.current.estimateMemoryUsage(files);

      expect(memory).toBeGreaterThan(0);
      expect(memory).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources on unmount', () => {
      const { result, unmount } = renderHook(() => usePreviewOptimization());

      const callback = vi.fn();
      act(() => {
        result.current.debounceFileUpdate({ 'test.txt': 'test' }, callback);
      });

      unmount();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Callback should not be called after unmount
      expect(callback).not.toHaveBeenCalled();
    });
  });
});

describe('usePerformanceMonitor', () => {
  it('should measure operation duration', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { result } = renderHook(() => usePerformanceMonitor('TestOperation'));

    act(() => {
      result.current.start();
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    const duration = result.current.end();

    expect(duration).toBeGreaterThan(0);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('TestOperation'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Started'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Completed'));

    consoleLogSpy.mockRestore();
  });

  it('should measure async operations', async () => {
    const { result } = renderHook(() => usePerformanceMonitor('AsyncOp'));

    const asyncOp = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'result';
    };

    const value = await result.current.measure(asyncOp);

    expect(value).toBe('result');
  });

  it('should handle errors in measured operations', async () => {
    const { result } = renderHook(() => usePerformanceMonitor('FailingOp'));

    const failingOp = async () => {
      throw new Error('Test error');
    };

    await expect(result.current.measure(failingOp)).rejects.toThrow('Test error');
  });
});

