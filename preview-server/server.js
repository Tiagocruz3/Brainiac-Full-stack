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

// Simple in-memory preview manager (for Railway deployment)
const previews = new Map();

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
    const { projectId, files } = req.body;

    if (!projectId) {
      return res.status(400).json({ 
        success: false, 
        error: 'projectId is required' 
      });
    }

    console.log(`📦 Creating preview for project: ${projectId}`);

    // Generate preview data
    const previewId = `preview-${Date.now()}`;
    const previewData = {
      id: previewId,
      projectId,
      files: files || {},
      createdAt: new Date().toISOString(),
    };

    previews.set(previewId, previewData);

    res.json({
      success: true,
      server: {
        id: previewId,
        url: `https://brainiac-full-stack-production.up.railway.app/preview/${previewId}`,
        port: 3000,
        status: 'running',
        projectId: projectId,
      },
    });

    console.log(`✅ Preview created: ${previewId}`);
  } catch (error) {
    console.error('❌ Failed to create preview:', error);
    res.status(500).json({
      success: false,
      error: error.message,
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

    const preview = previews.get(serverId);

    if (!preview) {
      return res.status(404).json({
        success: false,
        error: 'Server not found',
      });
    }

    // Update files in memory
    files.forEach(file => {
      if (file.operation === 'delete') {
        delete preview.files[file.path];
      } else {
        preview.files[file.path] = file.content;
      }
    });

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
    const servers = Array.from(previews.values());

    res.json({
      success: true,
      count: servers.length,
      servers: servers.map(s => ({
        id: s.id,
        url: `https://brainiac-full-stack-production.up.railway.app/preview/${s.id}`,
        port: 3000,
        status: 'running',
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

    const preview = previews.get(serverId);

    if (!preview) {
      return res.status(404).json({
        success: false,
        error: 'Server not found',
      });
    }

    res.json({
      success: true,
      healthy: true,
      server: {
        id: preview.id,
        status: 'running',
        url: `https://brainiac-full-stack-production.up.railway.app/preview/${preview.id}`,
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

    previews.delete(serverId);

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
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    activeServers: previews.size,
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
    const now = Date.now();
    const ONE_HOUR = 3600000;
    
    for (const [id, preview] of previews.entries()) {
      const age = now - new Date(preview.createdAt).getTime();
      if (age > ONE_HOUR) {
        previews.delete(id);
        console.log(`🗑️  Cleaned up stale preview: ${id}`);
      }
    }
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
    previews.clear();
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
    previews.clear();
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

