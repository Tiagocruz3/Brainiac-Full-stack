# Brainiac Preview Server

Real-time development server for previewing AI-generated applications with HMR support.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm start
```

Server will start on `http://localhost:3000` (or the port specified in `PORT` env var).

## Environment Variables

Create a `.env` file:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Security
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:5173
RATE_LIMIT=10

# Cleanup
CLEANUP_INTERVAL=3600000
```

## API Endpoints

### Create Preview
```bash
POST /api/preview/create
Content-Type: application/json

{
  "projectId": "my-project",
  "files": {
    "src/App.tsx": "...",
    "src/main.tsx": "..."
  }
}
```

Response:
```json
{
  "success": true,
  "server": {
    "id": "abc123",
    "url": "http://localhost:3001",
    "port": 3001,
    "status": "running"
  }
}
```

### Update Files
```bash
POST /api/preview/update
Content-Type: application/json

{
  "serverId": "abc123",
  "files": [
    {
      "path": "src/App.tsx",
      "content": "...",
      "operation": "update"
    }
  ]
}
```

### Health Check
```bash
GET /api/preview/health/:serverId
```

### Delete Preview
```bash
DELETE /api/preview/:serverId
```

### List All Previews
```bash
GET /api/preview/list
```

## Deployment

### Railway

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

### Render

1. Connect your GitHub repo
2. Select "preview-server" as root directory
3. Build Command: `npm install`
4. Start Command: `npm start`

### Docker

```bash
docker build -t brainiac-preview .
docker run -p 3000:3000 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  brainiac-preview
```

### Fly.io

```bash
fly launch
fly deploy
```

## Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### List Active Servers
```bash
curl http://localhost:3000/api/preview/list
```

## Architecture

```
Express Server
├── Preview Server Manager
│   ├── Server 1 (Vite on port 3001)
│   ├── Server 2 (Vite on port 3002)
│   └── Server N (Vite on port 300N)
└── Cleanup Task (runs every hour)
```

Each preview runs in its own Vite dev server instance with:
- Hot Module Reload (HMR)
- CORS enabled
- Isolated temp directory
- Auto-cleanup

## Security

- Rate limiting: 10 requests per 15 minutes
- CORS: Configurable allowed origins
- Iframe sandbox: Restricted permissions
- Auto-cleanup: Stale servers removed hourly

## Performance

- Max recommended concurrent previews: 10
- Memory per preview: ~100-200MB
- Startup time: 2-5 seconds
- Port range: 3001-65535 (auto-assigned)

## Troubleshooting

### Port already in use
Server auto-assigns available ports. No action needed.

### Out of memory
Reduce `RATE_LIMIT` or increase server RAM.

### Previews not loading
Check CORS settings and allowed origins.

### Stale previews
Cleanup task runs hourly. Manual cleanup:
```bash
curl -X DELETE http://localhost:3000/api/preview/:serverId
```

## Support

See [PREVIEW_SERVER_GUIDE.md](../PREVIEW_SERVER_GUIDE.md) for detailed documentation.

## License

MIT

