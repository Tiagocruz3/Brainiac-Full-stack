# 🎬 Real-Time Preview Server Guide

Complete guide to setting up and deploying the Brainiac preview system.

## 📋 Overview

The preview system allows users to see live previews of generated applications with:
- ✅ **Hot Module Reload (HMR)** - Instant updates without refresh
- ✅ **Vite Dev Server** - Lightning-fast development experience
- ✅ **CORS Support** - Safe iframe embedding
- ✅ **Dynamic Ports** - Auto-assigned ports for multiple previews
- ✅ **File System Operations** - Create, update, delete files in real-time
- ✅ **Health Monitoring** - Server status and metrics

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  usePreviewServer Hook                           │   │
│  │  - Creates preview servers                       │   │
│  │  - Updates files                                 │   │
│  │  - Manages lifecycle                             │   │
│  └────────────────────┬─────────────────────────────┘   │
│                       │ HTTP/REST API                   │
└───────────────────────┼─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│              Preview API Server (Node.js)               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  PreviewServerManager                            │   │
│  │  - Manages multiple preview instances            │   │
│  │  - Creates/destroys servers                      │   │
│  │  - File operations                               │   │
│  └────────────────────┬─────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼────────┐              ┌───────▼────────┐
│  Vite Server 1 │              │  Vite Server 2 │
│  Port: 3001    │              │  Port: 3002    │
│  /tmp/proj-1   │              │  /tmp/proj-2   │
└────────────────┘              └────────────────┘
```

## 🚀 Deployment Options

### Option 1: Separate Node.js Service (Recommended)

Deploy the preview server as a standalone Node.js service:

**Best for:** Production use with multiple concurrent users

**Providers:**
- [Railway](https://railway.app/) - Easy deployment, good free tier
- [Render](https://render.com/) - Auto-scaling, WebSocket support
- [Fly.io](https://fly.io/) - Global edge deployment
- [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)

**Setup:**

1. **Create `preview-server/package.json`:**
```json
{
  "name": "brainiac-preview-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "vite": "^5.4.11",
    "fs-extra": "^11.2.0",
    "nanoid": "^5.0.4",
    "cors": "^2.8.5"
  }
}
```

2. **Create `preview-server/server.js`:**
```javascript
import express from 'express';
import cors from 'cors';
import { createPreviewServerManager } from '../src/lib/preview-server.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const manager = createPreviewServerManager();

// Create preview
app.post('/api/preview/create', async (req, res) => {
  try {
    const { projectId, files } = req.body;
    const server = await manager.createServer({ projectId });
    
    if (files) {
      const updates = Object.entries(files).map(([path, content]) => ({
        path, content, operation: 'create'
      }));
      await server.updateFiles(updates);
    }
    
    res.json({ 
      success: true, 
      server: { 
        id: server.id, 
        url: server.url, 
        port: server.port 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update files
app.post('/api/preview/update', async (req, res) => {
  try {
    const { serverId, files } = req.body;
    const server = manager.getServer(serverId);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    await server.updateFiles(files);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete preview
app.delete('/api/preview/:serverId', async (req, res) => {
  try {
    await manager.destroyServer(req.params.serverId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', servers: manager.listServers().length });
});

// Cleanup stale servers every hour
setInterval(() => {
  manager.cleanupStaleServers().catch(console.error);
}, 3600000);

app.listen(port, () => {
  console.log(`🎬 Preview server running on http://localhost:${port}`);
});
```

3. **Deploy to Railway:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
cd preview-server
railway init
railway up
```

4. **Update frontend to use deployed URL:**
```typescript
// In src/hooks/usePreviewServer.ts
const API_BASE_URL = process.env.VITE_PREVIEW_API_URL || 'https://your-preview-server.railway.app/api/preview';
```

### Option 2: Docker Container

**Best for:** Self-hosted, full control

**Create `Dockerfile`:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY preview-server/package*.json ./
RUN npm ci --production

# Copy server code
COPY preview-server/ ./
COPY src/lib/preview-server.ts ./src/lib/
COPY src/types/preview.ts ./src/types/

EXPOSE 3000

CMD ["node", "server.js"]
```

**Deploy:**
```bash
docker build -t brainiac-preview .
docker run -p 3000:3000 brainiac-preview
```

### Option 3: Browser-Based Preview (Alternative)

If you want to avoid running a separate server, use browser-based solutions:

**StackBlitz SDK:**
```typescript
import sdk from '@stackblitz/sdk';

export async function createBrowserPreview(files: Record<string, string>) {
  const vm = await sdk.embedProject(
    'preview-container',
    {
      title: 'Preview',
      description: 'Generated by Brainiac',
      template: 'node',
      files,
    },
    {
      height: 600,
      openFile: 'src/App.tsx',
    }
  );
  
  return vm;
}
```

**Sandpack (CodeSandbox):**
```tsx
import { Sandpack } from '@codesandbox/sandpack-react';

<Sandpack
  files={{
    '/App.tsx': '...',
    '/index.tsx': '...',
  }}
  template="react-ts"
  theme="dark"
/>
```

## 💻 Local Development

1. **Start the preview server:**
```bash
cd preview-server
npm install
npm start
```

2. **Start your main app:**
```bash
cd ..
npm run dev
```

3. **Test preview creation:**
```typescript
const { createPreview, previewUrl } = usePreviewServer();

await createPreview('test-project', {
  'index.html': '<!DOCTYPE html>...',
  'src/main.tsx': '...',
  'src/App.tsx': '...',
});

console.log('Preview URL:', previewUrl);
```

## 🔧 Configuration

### Environment Variables

**Frontend (`.env`):**
```bash
VITE_PREVIEW_API_URL=http://localhost:3000/api/preview
```

**Preview Server (`.env`):**
```bash
PORT=3000
NODE_ENV=production
MAX_PREVIEW_SERVERS=10
PREVIEW_TIMEOUT=3600000  # 1 hour
TEMP_DIR=/tmp/brainiac-previews
```

### Vite Configuration

Customize Vite behavior in preview servers:

```typescript
const server = await manager.createServer({
  projectId: 'my-project',
  viteConfig: {
    // Custom plugins
    plugins: [react()],
    
    // Optimize deps
    optimizeDeps: {
      include: ['react', 'react-dom', '@supabase/supabase-js'],
    },
    
    // Build config
    build: {
      target: 'es2020',
    },
  },
});
```

## 📊 Monitoring

### Health Checks

```typescript
const { checkHealth } = usePreviewServer();

// Check if preview is healthy
const isHealthy = await checkHealth();

if (!isHealthy) {
  console.error('Preview server is not responding');
}
```

### Metrics

```typescript
// Get server metrics (backend only)
const metrics = server.getMetrics();

console.log({
  uptime: metrics.uptime,
  requests: metrics.requestCount,
  errors: metrics.errorCount,
  memory: metrics.memoryUsage,
});
```

## 🔒 Security

### Iframe Sandbox

Previews use strict sandbox policies:
```html
<iframe 
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
  src="preview-url"
/>
```

### CORS Configuration

Only allow your frontend domain:
```javascript
app.use(cors({
  origin: 'https://yourdomain.com',
  credentials: true,
}));
```

### Rate Limiting

Prevent abuse with rate limiting:
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 previews per window
});

app.use('/api/preview', limiter);
```

## 📝 Usage Examples

### Basic Usage

```tsx
import { Preview } from '@/components/Preview';

function App() {
  const files = {
    'index.html': '<!DOCTYPE html>...',
    'src/App.tsx': 'export default function App() {...}',
  };

  return (
    <Preview 
      projectId="my-project"
      files={files}
      onReady={(url) => console.log('Preview ready:', url)}
      onError={(error) => console.error('Preview error:', error)}
    />
  );
}
```

### With Code Editor

```tsx
import { PreviewWithEditor } from '@/components/Preview';
import { CodeEditor } from '@/components/CodeEditor';

function App() {
  const [code, setCode] = useState('...');
  
  return (
    <PreviewWithEditor 
      projectId="my-project"
      files={{ 'src/App.tsx': code }}
      editor={<CodeEditor value={code} onChange={setCode} />}
      splitRatio={50}
    />
  );
}
```

### Real-time Updates

```tsx
function App() {
  const { updatePreview } = usePreviewServer();
  
  const handleCodeChange = async (newCode: string) => {
    await updatePreview([{
      path: 'src/App.tsx',
      content: newCode,
      operation: 'update',
    }]);
  };
  
  return <CodeEditor onChange={handleCodeChange} />;
}
```

## 🐛 Troubleshooting

### Preview not loading

1. Check if preview server is running
2. Verify CORS headers
3. Check browser console for errors
4. Test health endpoint: `GET /health`

### HMR not working

1. Ensure WebSocket connection is established
2. Check firewall settings
3. Verify Vite config has HMR enabled

### Port conflicts

Preview servers auto-assign ports. If you get errors:
```typescript
const server = await manager.createServer({
  projectId: 'test',
  port: 0, // Let system assign port
});
```

## 📚 API Reference

See TypeScript types in:
- `src/types/preview.ts` - All type definitions
- `src/lib/preview-server.ts` - Server implementation
- `src/hooks/usePreviewServer.ts` - React hooks

## 🎯 Production Checklist

- [ ] Deploy preview server to Railway/Render
- [ ] Set up environment variables
- [ ] Configure CORS for your domain
- [ ] Add rate limiting
- [ ] Set up monitoring/alerts
- [ ] Configure auto-cleanup of stale servers
- [ ] Test preview creation and updates
- [ ] Verify HMR is working
- [ ] Check iframe embedding works
- [ ] Load test with multiple concurrent previews

## 📞 Support

For issues or questions:
- GitHub: [brainiac-monorepo/issues](https://github.com/your-repo/issues)
- Docs: See code comments in source files

---

Built with ❤️ by Brainiac 🧠

