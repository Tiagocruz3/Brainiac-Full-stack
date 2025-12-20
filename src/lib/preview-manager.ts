/**
 * Preview Manager
 * Handles preview lifecycle, cleanup, and resource management
 */

import { previewErrorHandler, PreviewError } from './preview-errors';

export interface PreviewInstance {
  id: string;
  projectName: string;
  files: Record<string, string>;
  createdAt: number;
  lastAccessedAt: number;
  memoryUsage: number;
}

export interface PreviewManagerConfig {
  maxInstances?: number; // Max concurrent previews
  maxAge?: number; // Max age in milliseconds
  maxMemory?: number; // Max memory per preview in bytes
  cleanupInterval?: number; // Cleanup check interval
}

class PreviewManager {
  private instances: Map<string, PreviewInstance> = new Map();
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private config: Required<PreviewManagerConfig>;

  constructor(config: PreviewManagerConfig = {}) {
    this.config = {
      maxInstances: config.maxInstances || 3,
      maxAge: config.maxAge || 60 * 60 * 1000, // 1 hour
      maxMemory: config.maxMemory || 100 * 1024 * 1024, // 100MB
      cleanupInterval: config.cleanupInterval || 10 * 60 * 1000, // 10 minutes
    };

    this.startCleanupTimer();
    console.log('🎬 Preview Manager initialized', this.config);
  }

  /**
   * Create a new preview instance
   */
  async createPreview(
    id: string,
    projectName: string,
    files: Record<string, string>
  ): Promise<{ success: boolean; error?: PreviewError }> {
    try {
      console.log(`🎬 Creating preview: ${id} (${projectName})`);

      // Check if we're at max instances
      if (this.instances.size >= this.config.maxInstances) {
        console.warn(`⚠️ Max instances reached (${this.config.maxInstances}), cleaning up oldest...`);
        await this.cleanupOldest();
      }

      // Calculate memory usage
      const memoryUsage = this.calculateMemoryUsage(files);
      console.log(`💾 Preview memory usage: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);

      // Check memory limit
      if (memoryUsage > this.config.maxMemory) {
        const error = previewErrorHandler.createError(
          new Error(`Preview exceeds memory limit: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`),
          'memory'
        );
        return { success: false, error };
      }

      // Create instance
      const instance: PreviewInstance = {
        id,
        projectName,
        files,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        memoryUsage,
      };

      this.instances.set(id, instance);
      console.log(`✅ Preview created: ${id} (${this.instances.size}/${this.config.maxInstances} instances)`);

      return { success: true };
    } catch (error) {
      const previewError = previewErrorHandler.createError(error, 'preview creation');
      console.error('❌ Failed to create preview:', previewError);
      return { success: false, error: previewError };
    }
  }

  /**
   * Update an existing preview
   */
  async updatePreview(
    id: string,
    files: Record<string, string>
  ): Promise<{ success: boolean; error?: PreviewError }> {
    try {
      const instance = this.instances.get(id);
      
      if (!instance) {
        const error = previewErrorHandler.createError(
          new Error(`Preview not found: ${id}`),
          'preview update'
        );
        return { success: false, error };
      }

      console.log(`🔄 Updating preview: ${id}`);

      // Calculate new memory usage
      const memoryUsage = this.calculateMemoryUsage(files);

      // Check memory limit
      if (memoryUsage > this.config.maxMemory) {
        const error = previewErrorHandler.createError(
          new Error(`Preview update exceeds memory limit: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`),
          'memory'
        );
        return { success: false, error };
      }

      // Update instance
      instance.files = files;
      instance.lastAccessedAt = Date.now();
      instance.memoryUsage = memoryUsage;

      console.log(`✅ Preview updated: ${id}`);
      return { success: true };
    } catch (error) {
      const previewError = previewErrorHandler.createError(error, 'preview update');
      console.error('❌ Failed to update preview:', previewError);
      return { success: false, error: previewError };
    }
  }

  /**
   * Get a preview instance
   */
  getPreview(id: string): PreviewInstance | null {
    const instance = this.instances.get(id);
    
    if (instance) {
      // Update last accessed time
      instance.lastAccessedAt = Date.now();
      return instance;
    }
    
    return null;
  }

  /**
   * Destroy a preview instance
   */
  async destroyPreview(id: string): Promise<void> {
    console.log(`🗑️ Destroying preview: ${id}`);
    
    const instance = this.instances.get(id);
    if (instance) {
      // Clear files from memory
      instance.files = {};
      this.instances.delete(id);
      
      console.log(`✅ Preview destroyed: ${id} (${this.instances.size} remaining)`);
    }
  }

  /**
   * Clean up old or unused previews
   */
  private async cleanupOld(): Promise<void> {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, instance] of this.instances.entries()) {
      const age = now - instance.createdAt;
      const idleTime = now - instance.lastAccessedAt;

      // Remove if too old or idle for too long
      if (age > this.config.maxAge || idleTime > this.config.maxAge / 2) {
        console.log(`🧹 Cleaning up old preview: ${id} (age: ${(age / 1000 / 60).toFixed(1)}m, idle: ${(idleTime / 1000 / 60).toFixed(1)}m)`);
        await this.destroyPreview(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`✅ Cleaned up ${cleaned} old preview(s)`);
    }
  }

  /**
   * Clean up oldest preview
   */
  private async cleanupOldest(): Promise<void> {
    let oldestId: string | null = null;
    let oldestTime = Date.now();

    for (const [id, instance] of this.instances.entries()) {
      if (instance.lastAccessedAt < oldestTime) {
        oldestTime = instance.lastAccessedAt;
        oldestId = id;
      }
    }

    if (oldestId) {
      console.log(`🧹 Cleaning up oldest preview: ${oldestId}`);
      await this.destroyPreview(oldestId);
    }
  }

  /**
   * Calculate memory usage of files
   */
  private calculateMemoryUsage(files: Record<string, string>): number {
    let totalBytes = 0;
    
    for (const content of Object.values(files)) {
      totalBytes += new Blob([content]).size;
    }

    return totalBytes;
  }

  /**
   * Get current status
   */
  getStatus(): {
    instanceCount: number;
    maxInstances: number;
    totalMemory: number;
    maxMemory: number;
    instances: Array<{
      id: string;
      projectName: string;
      age: number;
      idleTime: number;
      memoryUsage: number;
    }>;
  } {
    const now = Date.now();
    const instances = Array.from(this.instances.entries()).map(([id, instance]) => ({
      id,
      projectName: instance.projectName,
      age: now - instance.createdAt,
      idleTime: now - instance.lastAccessedAt,
      memoryUsage: instance.memoryUsage,
    }));

    const totalMemory = instances.reduce((sum, i) => sum + i.memoryUsage, 0);

    return {
      instanceCount: this.instances.size,
      maxInstances: this.config.maxInstances,
      totalMemory,
      maxMemory: this.config.maxMemory * this.config.maxInstances,
      instances,
    };
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupIntervalId) {
      return;
    }

    console.log(`🔄 Starting cleanup timer (every ${this.config.cleanupInterval / 1000 / 60}m)`);

    this.cleanupIntervalId = setInterval(async () => {
      console.log('🔄 Running scheduled preview cleanup...');
      await this.cleanupOld();
      
      const status = this.getStatus();
      console.log(`📊 Preview Status: ${status.instanceCount}/${status.maxInstances} instances, ${(status.totalMemory / 1024 / 1024).toFixed(2)}MB used`);
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
      console.log('⏸️ Cleanup timer stopped');
    }
  }

  /**
   * Dispose of all resources
   */
  async dispose(): Promise<void> {
    console.log('🧹 Disposing preview manager...');
    
    this.stopCleanupTimer();
    
    // Destroy all instances
    const instanceIds = Array.from(this.instances.keys());
    for (const id of instanceIds) {
      await this.destroyPreview(id);
    }
    
    console.log('✅ Preview manager disposed');
  }
}

// Singleton instance
export const previewManager = new PreviewManager({
  maxInstances: 3,
  maxAge: 60 * 60 * 1000, // 1 hour
  maxMemory: 100 * 1024 * 1024, // 100MB
  cleanupInterval: 10 * 60 * 1000, // 10 minutes
});

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    previewManager.dispose();
  });
}

