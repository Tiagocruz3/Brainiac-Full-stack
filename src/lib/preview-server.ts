/**
 * Real-time Preview Server for Brainiac
 * 
 * ⚠️ IMPORTANT: This module uses Vite's createServer API which is Node.js only.
 * This should run as a separate backend service, NOT in the browser.
 * 
 * Architecture:
 * 1. Run this as a Node.js Express/Fastify API service
 * 2. Frontend calls API endpoints to create/manage preview servers
 * 3. Preview servers run on dynamic ports
 * 4. Frontend embeds preview in iframe using the returned URL
 * 
 * Deployment Options:
 * - Docker container with Node.js
 * - Separate Vercel/Railway/Render deployment
 * - Local development server
 */

import { createServer as createViteServer, ViteDevServer } from 'vite';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { nanoid } from 'nanoid';
import type {
  PreviewConfig,
  PreviewServer,
  PreviewServerManager,
  FileUpdate,
  ViteServerInstance,
  PreviewError,
  PreviewMetrics,
} from '@/types/preview';

/**
 * Preview Server Implementation
 */
class PreviewServerImpl implements PreviewServer {
  public readonly id: string;
  public port: number = 0;
  public url: string = '';
  public status: 'starting' | 'running' | 'stopped' | 'error' = 'starting';
  public readonly projectId: string;

  private viteServer: ViteDevServer | null = null;
  private config: PreviewConfig;
  private startTime: Date | null = null;
  private requestCount: number = 0;
  private errorCount: number = 0;
  private cleanupCallbacks: (() => Promise<void>)[] = [];

  constructor(config: PreviewConfig) {
    this.id = nanoid();
    this.projectId = config.projectId;
    this.config = config;
  }

  /**
   * Start the preview server
   */
  async start(): Promise<void> {
    try {
      this.status = 'starting';
      
      // Ensure base directory exists
      await fs.ensureDir(this.config.baseDir);

      // Create Vite dev server with optimized config
      this.viteServer = await createViteServer({
        root: this.config.baseDir,
        server: {
          port: this.config.port || 0, // 0 = auto-assign
          host: this.config.host || 'localhost',
          strictPort: false, // Allow port fallback
          cors: this.config.cors !== false, // Enable CORS by default
          hmr: this.config.hmr !== false ? {
            protocol: 'ws',
            host: 'localhost',
            overlay: true,
          } : false,
          // Allow iframe embedding
          headers: {
            'X-Frame-Options': 'SAMEORIGIN',
            'Content-Security-Policy': "frame-ancestors 'self' http://localhost:*",
          },
          middlewareMode: false,
          watch: {
            // Watch for file changes
            usePolling: true,
            interval: 100,
          },
        },
        // Optimize for preview
        optimizeDeps: {
          include: ['react', 'react-dom'],
        },
        // Custom config overrides
        ...this.config.viteConfig,
        // Logging
        logLevel: 'info',
        clearScreen: false,
      });

      // Start the server
      await this.viteServer.listen();

      // Get the assigned port
      const serverInfo = this.viteServer.httpServer?.address();
      if (serverInfo && typeof serverInfo === 'object') {
        this.port = serverInfo.port;
        this.url = `http://${this.config.host || 'localhost'}:${this.port}`;
      }

      this.status = 'running';
      this.startTime = new Date();

      // Add request counter middleware
      if (this.viteServer.middlewares) {
        this.viteServer.middlewares.use((req, res, next) => {
          this.requestCount++;
          next();
        });
      }

      // Setup error handlers
      this.viteServer.httpServer?.on('error', (error) => {
        console.error(`Preview server ${this.id} error:`, error);
        this.errorCount++;
        this.status = 'error';
      });

      console.log(`✅ Preview server started: ${this.url} (ID: ${this.id})`);
    } catch (error: any) {
      this.status = 'error';
      console.error('Failed to start preview server:', error);
      throw new Error(`Failed to start preview server: ${error.message}`);
    }
  }

  /**
   * Stop the preview server
   */
  async stop(): Promise<void> {
    try {
      if (this.viteServer) {
        await this.viteServer.close();
        this.viteServer = null;
      }

      // Run cleanup callbacks
      for (const cleanup of this.cleanupCallbacks) {
        await cleanup();
      }

      this.status = 'stopped';
      console.log(`🛑 Preview server stopped: ${this.id}`);
    } catch (error: any) {
      console.error('Error stopping preview server:', error);
      throw error;
    }
  }

  /**
   * Update files in the preview
   */
  async updateFiles(files: FileUpdate[]): Promise<void> {
    if (!this.viteServer) {
      throw new Error('Preview server not running');
    }

    try {
      for (const file of files) {
        const filePath = path.join(this.config.baseDir, file.path);

        switch (file.operation) {
          case 'create':
          case 'update':
            if (file.content !== null) {
              // Ensure directory exists
              await fs.ensureDir(path.dirname(filePath));
              // Write file
              await fs.writeFile(filePath, file.content, 'utf-8');
              console.log(`📝 Updated file: ${file.path}`);
            }
            break;

          case 'delete':
            if (await fs.pathExists(filePath)) {
              await fs.remove(filePath);
              console.log(`🗑️  Deleted file: ${file.path}`);
            }
            break;
        }

        // Trigger HMR for the updated file
        const module = this.viteServer.moduleGraph.getModuleById(filePath);
        if (module) {
          this.viteServer.moduleGraph.invalidateModule(module);
          this.viteServer.ws.send({
            type: 'full-reload',
            path: '*',
          });
        }
      }
    } catch (error: any) {
      this.errorCount++;
      console.error('Error updating files:', error);
      throw new Error(`Failed to update files: ${error.message}`);
    }
  }

  /**
   * Check if server is healthy
   */
  async healthCheck(): Promise<boolean> {
    if (!this.viteServer || this.status !== 'running') {
      return false;
    }

    try {
      // Check if HTTP server is still listening
      const isListening = this.viteServer.httpServer?.listening ?? false;
      return isListening;
    } catch {
      return false;
    }
  }

  /**
   * Get server metrics
   */
  getMetrics(): PreviewMetrics {
    return {
      serverId: this.id,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      lastActivity: new Date(),
      memoryUsage: process.memoryUsage().heapUsed,
    };
  }

  /**
   * Add cleanup callback
   */
  onCleanup(callback: () => Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }
}

/**
 * Preview Server Manager
 * Manages multiple preview server instances
 */
export class PreviewServerManagerImpl implements PreviewServerManager {
  private servers: Map<string, PreviewServer> = new Map();
  private tempDirs: Set<string> = new Set();

  /**
   * Create a new preview server instance
   */
  async createServer(config: PreviewConfig): Promise<PreviewServer> {
    // Create temp directory if not provided
    let baseDir = config.baseDir;
    if (!baseDir) {
      baseDir = await this.createTempDir(config.projectId);
      this.tempDirs.add(baseDir);
    }

    const serverConfig: PreviewConfig = {
      ...config,
      baseDir,
      cors: config.cors !== false,
      hmr: config.hmr !== false,
    };

    const server = new PreviewServerImpl(serverConfig);
    
    // Add cleanup to remove temp directory
    server.onCleanup(async () => {
      if (this.tempDirs.has(baseDir)) {
        await fs.remove(baseDir);
        this.tempDirs.delete(baseDir);
      }
    });

    await server.start();
    this.servers.set(server.id, server);

    return server;
  }

  /**
   * Get an existing preview server by ID
   */
  getServer(id: string): PreviewServer | null {
    return this.servers.get(id) || null;
  }

  /**
   * Stop and remove a preview server
   */
  async destroyServer(id: string): Promise<void> {
    const server = this.servers.get(id);
    if (server) {
      await server.stop();
      this.servers.delete(id);
    }
  }

  /**
   * List all active preview servers
   */
  listServers(): PreviewServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * Stop all preview servers
   */
  async destroyAll(): Promise<void> {
    const stopPromises = Array.from(this.servers.keys()).map(id => 
      this.destroyServer(id)
    );
    await Promise.all(stopPromises);
  }

  /**
   * Create a temporary directory for a project
   */
  private async createTempDir(projectId: string): Promise<string> {
    const tempDir = path.join(
      os.tmpdir(),
      'brainiac-preview',
      projectId,
      nanoid()
    );
    await fs.ensureDir(tempDir);
    return tempDir;
  }

  /**
   * Clean up stale servers (not active for > 1 hour)
   */
  async cleanupStaleServers(maxAge: number = 3600000): Promise<void> {
    const now = Date.now();
    const staleServers: string[] = [];

    for (const [id, server] of this.servers) {
      const isHealthy = await server.healthCheck();
      if (!isHealthy) {
        staleServers.push(id);
      }
    }

    // Remove stale servers
    for (const id of staleServers) {
      console.log(`🧹 Cleaning up stale server: ${id}`);
      await this.destroyServer(id);
    }
  }
}

/**
 * Create a new preview server manager instance
 */
export function createPreviewServerManager(): PreviewServerManager {
  return new PreviewServerManagerImpl();
}

/**
 * Helper: Create a preview from GitHub repo content
 */
export async function createPreviewFromGithub(
  manager: PreviewServerManager,
  projectId: string,
  files: Record<string, string>
): Promise<PreviewServer> {
  const tempDir = path.join(os.tmpdir(), 'brainiac-preview', projectId, nanoid());
  
  // Write all files to temp directory
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(tempDir, filePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  // Create preview server
  return manager.createServer({
    projectId,
    baseDir: tempDir,
    cors: true,
    hmr: true,
  });
}

/**
 * Helper: Get available port
 */
export async function getAvailablePort(preferredPort?: number): Promise<number> {
  const net = await import('net');
  
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.listen(preferredPort || 0, () => {
      const address = server.address();
      const port = typeof address === 'object' ? address?.port || 0 : 0;
      server.close(() => resolve(port));
    });
    
    server.on('error', reject);
  });
}

// Export types
export type { PreviewServer, PreviewConfig, FileUpdate, PreviewServerManager };

