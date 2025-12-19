# Deploy Brainiac Preview Server to Railway

Complete step-by-step guide to deploy your preview server to Railway.

## Prerequisites

- ✅ Railway account created
- ✅ Preview server code ready (`preview-server/` folder)
- ✅ GitHub repository (optional but recommended)

## Deployment Options

### Option 1: Deploy from GitHub (Recommended)

This enables automatic deployments on every push.

#### Step 1: Push Code to GitHub

```bash
# If you haven't already
cd /Users/ace/Desktop/brainiac-debug-ui/brainiac-monorepo

# Initialize git (if not already done)
git init
git add .
git commit -m "Add preview server"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/brainiac-monorepo.git
git branch -M main
git push -u origin main
```

#### Step 2: Deploy to Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your `brainiac-monorepo` repository
6. Railway will auto-detect the app

#### Step 3: Configure Root Directory

Since your preview server is in a subdirectory:

1. In Railway dashboard, go to **Settings**
2. Find **"Root Directory"** or **"Build"** section
3. Set root directory to: `preview-server`
4. Click **Save**

#### Step 4: Add Environment Variables

1. Go to **Variables** tab
2. Add these variables:

```bash
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://your-frontend-domain.com,http://localhost:5173
RATE_LIMIT=20
CLEANUP_INTERVAL=3600000
```

3. Click **Add** for each variable

#### Step 5: Deploy!

Railway will automatically deploy. Watch the logs for:

```
🎬 Brainiac Preview Server
📡 Server running on: http://localhost:3000
```

#### Step 6: Get Your URL

1. Go to **Settings** tab
2. Find **"Domains"** section
3. Click **"Generate Domain"**
4. Copy your Railway URL (e.g., `brainiac-preview-production.up.railway.app`)

---

### Option 2: Deploy with Railway CLI

Fast deployment from command line.

#### Step 1: Install Railway CLI

```bash
npm i -g @railway/cli
```

Or with Homebrew (macOS):

```bash
brew install railway
```

#### Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authenticate.

#### Step 3: Initialize Project

```bash
cd /Users/ace/Desktop/brainiac-debug-ui/brainiac-monorepo/preview-server
railway init
```

Select:
- **Create new project**
- Give it a name: `brainiac-preview-server`

#### Step 4: Set Environment Variables

```bash
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set ALLOWED_ORIGINS=https://your-domain.com
railway variables set RATE_LIMIT=20
```

Or create a `.env` file and run:

```bash
railway variables set < .env
```

#### Step 5: Deploy

```bash
railway up
```

This will:
- Upload your code
- Install dependencies
- Start the server

#### Step 6: Get Your URL

```bash
railway domain
```

Or go to Railway dashboard to generate a public domain.

---

## Post-Deployment Setup

### 1. Test Your Preview Server

```bash
# Health check
curl https://your-railway-url.railway.app/health

# Expected response:
{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2024-...",
  "activeServers": 0
}
```

### 2. Update Frontend Environment

In your frontend project, create/update `.env`:

```bash
# .env
VITE_PREVIEW_API_URL=https://your-railway-url.railway.app/api/preview
```

### 3. Test Preview Creation

```bash
# Test creating a preview
curl -X POST https://your-railway-url.railway.app/api/preview/create \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-123",
    "files": {
      "index.html": "<!DOCTYPE html><html><body>Test</body></html>"
    }
  }'
```

Expected response:
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

---

## Frontend Integration

### Update Your Frontend Code

```typescript
// .env
VITE_PREVIEW_API_URL=https://your-railway-url.railway.app/api/preview
```

### Test in Your App

```tsx
import { PreviewManagerWithIframe } from '@/components/PreviewManager';

function App() {
  return (
    <PreviewManagerWithIframe
      projectId="test"
      files={{
        'index.html': '<!DOCTYPE html>...',
        'src/App.tsx': 'export default function App() {...}',
      }}
      onPreviewReady={(url) => {
        console.log('✅ Preview ready:', url);
      }}
      onError={(error) => {
        console.error('❌ Error:', error);
      }}
    />
  );
}
```

---

## Railway Configuration Files

### Option 1: railway.json (Recommended)

Create `preview-server/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Option 2: railway.toml

Create `preview-server/railway.toml`:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm install"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

---

## Monitoring & Logs

### View Logs

**In Railway Dashboard:**
1. Go to your project
2. Click **"Deployments"**
3. Click on latest deployment
4. View live logs

**With Railway CLI:**

```bash
railway logs
```

### Monitor Health

```bash
# Check status
curl https://your-railway-url.railway.app/health

# List active previews
curl https://your-railway-url.railway.app/api/preview/list
```

---

## Scaling & Performance

### Railway Plans

- **Free Tier**: 
  - $5 free credit/month
  - Good for development
  - ~500 hours of runtime

- **Pro Plan** ($20/month):
  - Unlimited projects
  - Better resources
  - Priority support

### Resource Allocation

Railway auto-scales based on usage. For preview server:

- **Memory**: 512MB - 1GB recommended
- **CPU**: 0.5 - 1 vCPU
- **Disk**: Ephemeral (temp files cleared on restart)

### Performance Tips

1. **Enable Redis for session management** (optional):
```bash
railway add redis
```

2. **Set connection limits**:
```bash
railway variables set MAX_PREVIEW_SERVERS=10
```

3. **Monitor memory usage**:
```bash
railway logs --filter "memory"
```

---

## Troubleshooting

### Issue: Deployment Failed

**Solution:**
1. Check build logs in Railway dashboard
2. Verify `package.json` has correct `start` script
3. Ensure all dependencies are listed

### Issue: Preview Server Not Responding

**Solution:**
1. Check if Railway URL is correct
2. Verify environment variables are set
3. Check logs for errors:
```bash
railway logs
```

### Issue: CORS Errors

**Solution:**
Update `ALLOWED_ORIGINS`:
```bash
railway variables set ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:5173
```

### Issue: Port Already in Use

**Solution:**
Railway automatically assigns ports. Don't hardcode port 3000.

```javascript
// ✅ Good
const port = process.env.PORT || 3000;

// ❌ Bad
const port = 3000;
```

### Issue: Out of Memory

**Solution:**
1. Reduce `RATE_LIMIT`
2. Decrease `MAX_PREVIEW_SERVERS`
3. Upgrade to Pro plan for more memory

---

## Custom Domain (Optional)

### Add Custom Domain

1. Go to **Settings** → **Domains**
2. Click **"Add Custom Domain"**
3. Enter your domain: `preview.yourdomain.com`
4. Add DNS records as shown:
   - Type: `CNAME`
   - Name: `preview`
   - Value: `your-app.up.railway.app`

### Update Frontend

```bash
# .env
VITE_PREVIEW_API_URL=https://preview.yourdomain.com/api/preview
```

---

## Automatic Deployments

### Enable GitHub Auto-Deploy

Already enabled if you deployed from GitHub!

Every push to main branch will:
1. Trigger new deployment
2. Run tests (if configured)
3. Deploy automatically
4. Zero downtime

### Rollback if Needed

1. Go to **Deployments**
2. Find previous working deployment
3. Click **"Redeploy"**

---

## Cost Estimation

### Free Tier
- **Cost**: $5 free credit/month
- **Usage**: ~500 hours runtime
- **Perfect for**: Development, testing, low traffic

### Pro Plan
- **Cost**: $20/month base + usage
- **Usage**: Unlimited hours
- **Perfect for**: Production, multiple users

### Typical Monthly Cost

For Brainiac preview server:
- **Development**: $0 (free tier)
- **Small production**: $20-30/month
- **High traffic**: $50-100/month

---

## Security Best Practices

### 1. Set Allowed Origins

```bash
railway variables set ALLOWED_ORIGINS=https://yourdomain.com
```

### 2. Enable Rate Limiting

Already configured in the code. Adjust as needed:
```bash
railway variables set RATE_LIMIT=10
```

### 3. Use Environment Variables

Never commit secrets:
```bash
# ✅ Good - Use env vars
const apiKey = process.env.API_KEY;

# ❌ Bad - Hardcoded
const apiKey = "sk_live_123...";
```

### 4. Monitor Logs

Check logs regularly for suspicious activity:
```bash
railway logs --filter "error"
```

---

## Next Steps

1. ✅ Deploy to Railway (you're here!)
2. ⏭️ Test preview creation
3. ⏭️ Update frontend .env file
4. ⏭️ Test in your Brainiac app
5. ⏭️ Monitor for errors
6. ⏭️ Scale as needed

---

## Quick Commands Reference

```bash
# Deploy
railway up

# View logs
railway logs

# Open dashboard
railway open

# Set variables
railway variables set KEY=VALUE

# Check status
railway status

# Restart
railway restart

# Domain info
railway domain

# Delete project
railway delete
```

---

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Brainiac Docs: See `PREVIEW_SERVER_GUIDE.md`

---

## Success! 🎉

Your preview server is now live on Railway!

Preview URL: `https://your-app.up.railway.app`

Update your frontend `.env` and start creating previews! 🚀🧠

