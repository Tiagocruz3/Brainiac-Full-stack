/**
 * Brainiac Preview Server
 * 
 * Standalone Node.js server for running real-time preview instances
 * 
 * Deploy this separately from your main app:
 * - Railway: railway up
 * - Render: Connect GitHub repo
 * - Fly.io: fly deploy
 * - Docker: docker build && docker run
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createPreviewServerManager } from '../src/lib/preview-server.js';

// Initialize Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));

// Rate limiting - prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT || 10, // Max requests per window
  message: 'Too many preview requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/preview', limiter);

// Initialize preview server manager
const manager = createPreviewServerManager();

console.log('🚀 Initializing Brainiac Preview Server...');

// ============================================================================
// API Routes
// ============================================================================

/**
 * POST /api/preview/create
 * Create a new preview server
 * 
 * Body:
 * {
 *   projectId: string,
 *   files: { [path: string]: string },
 *   port?: number
 * }
 */
app.post('/api/preview/create', async (req, res) => {
  try {
    const { projectId, files, port } = req.body;

    if (!projectId) {
      return res.status(400).json({ 
        success: false, 
        error: 'projectId is required' 
      });
    }

    console.log(`📦 Creating preview for project: ${projectId}`);

    // Create preview server
    const server = await manager.createServer({
      projectId,
      port: port || 0,
      cors: true,
      hmr: true,
    });

    // Write files if provided
    if (files && Object.keys(files).length > 0) {
      const fileUpdates = Object.entries(files).map(([path, content]) => ({
        path,
        content,
        operation: 'create',
      }));
      
      await server.updateFiles(fileUpdates);
      console.log(`✅ Created ${fileUpdates.length} files for ${projectId}`);
    }

    res.json({
      success: true,
      server: {
        id: server.id,
        url: server.url,
        port: server.port,
        status: server.status,
        projectId: server.projectId,
      },
    });

    console.log(`✅ Preview server started: ${server.url} (ID: ${server.id})`);
  } catch (error) {
    console.error('❌ Failed to create preview:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/preview/update
 * Update files in an existing preview
 * 
 * Body:
 * {
 *   serverId: string,
 *   files: FileUpdate[]
 * }
 */
app.post('/api/preview/update', async (req, res) => {
  try {
    const { serverId, files } = req.body;

    if (!serverId || !files) {
      return res.status(400).json({
        success: false,
        error: 'serverId and files are required',
      });
    }

    const server = manager.getServer(serverId);

    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found',
      });
    }

    await server.updateFiles(files);

    res.json({
      success: true,
      message: 'Files updated successfully',
    });

    console.log(`📝 Updated ${files.length} files in server ${serverId}`);
  } catch (error) {
    console.error('❌ Failed to update files:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/preview/list
 * List all active preview servers
 */
app.get('/api/preview/list', async (req, res) => {
  try {
    const servers = manager.listServers();

    res.json({
      success: true,
      count: servers.length,
      servers: servers.map(s => ({
        id: s.id,
        url: s.url,
        port: s.port,
        status: s.status,
        projectId: s.projectId,
      })),
    });
  } catch (error) {
    console.error('❌ Failed to list servers:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/preview/health/:serverId
 * Check health of a specific preview server
 */
app.get('/api/preview/health/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;

    if (!serverId) {
      return res.status(400).json({
        success: false,
        error: 'serverId is required',
      });
    }

    const server = manager.getServer(serverId);

    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found',
      });
    }

    const healthy = await server.healthCheck();

    res.json({
      success: true,
      healthy,
      server: {
        id: server.id,
        status: server.status,
        url: server.url,
      },
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/preview/:serverId
 * Stop and remove a preview server
 */
app.delete('/api/preview/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;

    if (!serverId) {
      return res.status(400).json({
        success: false,
        error: 'serverId is required',
      });
    }

    await manager.destroyServer(serverId);

    res.json({
      success: true,
      message: 'Server destroyed successfully',
    });

    console.log(`🗑️  Destroyed server: ${serverId}`);
  } catch (error) {
    console.error('❌ Failed to destroy server:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /health
 * Overall health check
 */
app.get('/health', (req, res) => {
  const servers = manager.listServers();
  
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    activeServers: servers.length,
    memory: {
      used: process.memoryUsage().heapUsed,
      total: process.memoryUsage().heapTotal,
    },
  });
});

/**
 * GET /
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Brainiac Preview Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      create: 'POST /api/preview/create',
      update: 'POST /api/preview/update',
      list: 'GET /api/preview/list',
      health: 'GET /api/preview/health/:serverId',
      destroy: 'DELETE /api/preview/:serverId',
    },
  });
});

// ============================================================================
// Background Tasks
// ============================================================================

/**
 * Cleanup stale servers every hour
 */
const CLEANUP_INTERVAL = parseInt(process.env.CLEANUP_INTERVAL) || 3600000; // 1 hour

setInterval(async () => {
  console.log('🧹 Running cleanup task...');
  try {
    await manager.cleanupStaleServers();
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}, CLEANUP_INTERVAL);

// ============================================================================
// Error Handling
// ============================================================================

app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
  });
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGTERM', async () => {
  console.log('⏹️  SIGTERM received, shutting down gracefully...');
  
  try {
    await manager.destroyAll();
    console.log('✅ All preview servers stopped');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('⏹️  SIGINT received, shutting down gracefully...');
  
  try {
    await manager.destroyAll();
    console.log('✅ All preview servers stopped');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(port, () => {
  console.log('');
  console.log('🎬 ═════════════════════════════════════════════════════════');
  console.log('🎬   Brainiac Preview Server');
  console.log('🎬 ═════════════════════════════════════════════════════════');
  console.log('');
  console.log(`   📡 Server running on: http://localhost:${port}`);
  console.log(`   🏥 Health check:      http://localhost:${port}/health`);
  console.log(`   📋 API docs:          http://localhost:${port}/`);
  console.log('');
  console.log('   Environment:');
  console.log(`     • NODE_ENV:         ${process.env.NODE_ENV || 'development'}`);
  console.log(`     • Rate limit:       ${process.env.RATE_LIMIT || 10} req/15min`);
  console.log(`     • Cleanup interval: ${CLEANUP_INTERVAL / 1000}s`);
  console.log('');
  console.log('   Ready to accept preview requests! 🚀');
  console.log('');
  console.log('🎬 ═════════════════════════════════════════════════════════');
  console.log('');
});

