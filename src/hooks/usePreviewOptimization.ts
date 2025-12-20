/**
 * Preview Optimization Hook
 * Handles debouncing, throttling, and smart rebuild detection
 */

import { useRef, useCallback, useEffect } from 'react';

export interface PreviewOptimizationConfig {
  debounceDelay?: number; // Default: 500ms
  throttleDelay?: number; // Default: 1000ms
  maxFileSize?: number; // Default: 5MB
  cleanupInterval?: number; // Default: 30 minutes
}

export function usePreviewOptimization(config: PreviewOptimizationConfig = {}) {
  const {
    debounceDelay = 500,
    throttleDelay = 1000,
    maxFileSize = 5 * 1024 * 1024, // 5MB
    cleanupInterval = 30 * 60 * 1000, // 30 minutes
  } = config;

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastExecutionRef = useRef<number>(0);
  const pendingFilesRef = useRef<Record<string, string>>({});
  const lastFilesHashRef = useRef<string>('');

  /**
   * Debounce file updates - waits for pause in updates
   */
  const debounceFileUpdate = useCallback(
    (files: Record<string, string>, callback: (files: Record<string, string>) => void) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Merge new files with pending
      pendingFilesRef.current = { ...pendingFilesRef.current, ...files };

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        const filesToUpdate = pendingFilesRef.current;
        pendingFilesRef.current = {};
        
        console.log(`📦 Batched ${Object.keys(filesToUpdate).length} file updates`);
        callback(filesToUpdate);
        
        debounceTimerRef.current = null;
      }, debounceDelay);
    },
    [debounceDelay]
  );

  /**
   * Throttle preview refreshes - limits frequency
   */
  const throttlePreviewRefresh = useCallback(
    (callback: () => void) => {
      const now = Date.now();
      const timeSinceLastExecution = now - lastExecutionRef.current;

      // If enough time has passed, execute immediately
      if (timeSinceLastExecution >= throttleDelay) {
        lastExecutionRef.current = now;
        callback();
        return;
      }

      // Otherwise, schedule for later if not already scheduled
      if (!throttleTimerRef.current) {
        const remainingTime = throttleDelay - timeSinceLastExecution;
        
        throttleTimerRef.current = setTimeout(() => {
          lastExecutionRef.current = Date.now();
          callback();
          throttleTimerRef.current = null;
        }, remainingTime);
      }
    },
    [throttleDelay]
  );

  /**
   * Smart rebuild detection - only rebuild if needed files changed
   */
  const shouldRebuild = useCallback(
    (files: Record<string, string>): boolean => {
      // Create hash of file contents
      const filesArray = Object.entries(files)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([path, content]) => `${path}:${content.length}`);
      
      const currentHash = filesArray.join('|');

      // Compare with last hash
      if (currentHash === lastFilesHashRef.current) {
        console.log('⏭️ Skipping rebuild - no changes detected');
        return false;
      }

      lastFilesHashRef.current = currentHash;
      console.log('🔨 Rebuild needed - files changed');
      return true;
    },
    []
  );

  /**
   * Validate file size
   */
  const validateFileSize = useCallback(
    (files: Record<string, string>): { valid: boolean; oversized: string[] } => {
      const oversized: string[] = [];

      for (const [path, content] of Object.entries(files)) {
        const size = new Blob([content]).size;
        if (size > maxFileSize) {
          oversized.push(path);
          console.warn(`⚠️ File too large: ${path} (${(size / 1024 / 1024).toFixed(2)}MB)`);
        }
      }

      return {
        valid: oversized.length === 0,
        oversized,
      };
    },
    [maxFileSize]
  );

  /**
   * Batch file writes for efficiency
   */
  const batchFileWrites = useCallback(
    async (
      files: Record<string, string>,
      writeCallback: (path: string, content: string) => Promise<void>
    ): Promise<void> => {
      const entries = Object.entries(files);
      const batchSize = 5; // Write 5 files at a time
      
      console.log(`📝 Writing ${entries.length} files in batches of ${batchSize}`);

      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        await Promise.all(
          batch.map(([path, content]) => writeCallback(path, content))
        );
        
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(entries.length / batchSize)} complete`);
      }
    },
    []
  );

  /**
   * Calculate memory usage estimate
   */
  const estimateMemoryUsage = useCallback(
    (files: Record<string, string>): number => {
      let totalBytes = 0;
      
      for (const content of Object.values(files)) {
        totalBytes += new Blob([content]).size;
      }

      return totalBytes;
    },
    []
  );

  /**
   * Cleanup function
   */
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up preview optimization resources...');
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
    
    pendingFilesRef.current = {};
    lastFilesHashRef.current = '';
    lastExecutionRef.current = 0;
    
    console.log('✅ Preview optimization cleanup complete');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Periodic cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Periodic preview cleanup running...');
      
      // Clear pending files if they've been waiting too long
      if (Object.keys(pendingFilesRef.current).length > 0) {
        console.log('⚠️ Clearing stale pending files');
        pendingFilesRef.current = {};
      }
    }, cleanupInterval);

    return () => clearInterval(interval);
  }, [cleanupInterval]);

  return {
    debounceFileUpdate,
    throttlePreviewRefresh,
    shouldRebuild,
    validateFileSize,
    batchFileWrites,
    estimateMemoryUsage,
    cleanup,
  };
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor(label: string) {
  const startTimeRef = useRef<number>(0);

  const start = useCallback(() => {
    startTimeRef.current = performance.now();
    console.log(`⏱️ [${label}] Started`);
  }, [label]);

  const end = useCallback(() => {
    const duration = performance.now() - startTimeRef.current;
    console.log(`⏱️ [${label}] Completed in ${duration.toFixed(2)}ms`);
    return duration;
  }, [label]);

  const measure = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T> => {
      start();
      try {
        const result = await operation();
        end();
        return result;
      } catch (error) {
        console.error(`❌ [${label}] Failed after ${(performance.now() - startTimeRef.current).toFixed(2)}ms`, error);
        throw error;
      }
    },
    [label, start, end]
  );

  return { start, end, measure };
}

