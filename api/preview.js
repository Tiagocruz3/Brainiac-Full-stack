/**
 * Preview Server API Endpoint
 * 
 * ⚠️ IMPORTANT: Vercel serverless functions have timeouts (10s hobby, 60s pro)
 * For long-running preview servers, consider:
 * 1. Deploy this as a separate Node.js service (Railway, Render, Fly.io)
 * 2. Use WebSocket for real-time updates
 * 3. Use a managed preview service (StackBlitz, CodeSandbox API)
 * 
 * This file provides the API structure. For production, deploy separately.
 */

import { createPreviewServerManager } from '../src/lib/preview-server.js';

// Global manager instance (in production, use Redis or database)
let manager = null;

function getManager() {
  if (!manager) {
    manager = createPreviewServerManager();
  }
  return manager;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { method } = req;
    const { action } = req.query;

    switch (method) {
      case 'POST':
        if (action === 'create') {
          return await handleCreate(req, res);
        } else if (action === 'update') {
          return await handleUpdate(req, res);
        }
        break;

      case 'GET':
        if (action === 'list') {
          return await handleList(req, res);
        } else if (action === 'health') {
          return await handleHealth(req, res);
        }
        break;

      case 'DELETE':
        return await handleDelete(req, res);

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Preview API error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

/**
 * Create a new preview server
 */
async function handleCreate(req, res) {
  const { projectId, files, port } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const manager = getManager();
  
  try {
    // Create preview server
    const server = await manager.createServer({
      projectId,
      port: port || 0,
      cors: true,
      hmr: true,
    });

    // If files provided, write them
    if (files && Object.keys(files).length > 0) {
      const fileUpdates = Object.entries(files).map(([path, content]) => ({
        path,
        content,
        operation: 'create',
      }));
      await server.updateFiles(fileUpdates);
    }

    return res.status(200).json({
      success: true,
      server: {
        id: server.id,
        url: server.url,
        port: server.port,
        status: server.status,
        projectId: server.projectId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Update files in an existing preview
 */
async function handleUpdate(req, res) {
  const { serverId, files } = req.body;

  if (!serverId || !files) {
    return res.status(400).json({ error: 'serverId and files are required' });
  }

  const manager = getManager();
  const server = manager.getServer(serverId);

  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }

  try {
    await server.updateFiles(files);
    return res.status(200).json({
      success: true,
      message: 'Files updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * List all active preview servers
 */
async function handleList(req, res) {
  const manager = getManager();
  const servers = manager.listServers();

  return res.status(200).json({
    success: true,
    servers: servers.map(s => ({
      id: s.id,
      url: s.url,
      port: s.port,
      status: s.status,
      projectId: s.projectId,
    })),
  });
}

/**
 * Health check for a preview server
 */
async function handleHealth(req, res) {
  const { serverId } = req.query;

  if (!serverId) {
    return res.status(400).json({ error: 'serverId is required' });
  }

  const manager = getManager();
  const server = manager.getServer(serverId);

  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }

  const healthy = await server.healthCheck();

  return res.status(200).json({
    success: true,
    healthy,
    server: {
      id: server.id,
      status: server.status,
      url: server.url,
    },
  });
}

/**
 * Delete a preview server
 */
async function handleDelete(req, res) {
  const { serverId } = req.query;

  if (!serverId) {
    return res.status(400).json({ error: 'serverId is required' });
  }

  const manager = getManager();
  
  try {
    await manager.destroyServer(serverId);
    return res.status(200).json({
      success: true,
      message: 'Server destroyed successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

