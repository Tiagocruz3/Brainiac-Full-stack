# 🧠 Brainiac - AI App Builder (Monorepo)

Build full-stack applications with AI in minutes!

## ✨ Features

- 🎨 **Beautiful UI** - Premium dark theme with smooth animations
- 🗄️ **Supabase** - Automated project creation & database setup
- 📦 **GitHub** - Automatic repository creation & code commits
- 🚀 **Vercel** - One-click deployment to production
- 💬 **Lovable-style UX** - Step-by-step progress updates
- 🛑 **Stop Generation** - Cancel builds anytime
- 🧠 **Conversation Context** - Edit & iterate on existing apps

## 🚀 Quick Start

### Deploy to Vercel (1 command!)

```bash
vercel
```

That's it! Frontend + Backend deployed together! ✨

### Local Development

**Terminal 1 - Backend:**
```bash
cd api
npm install
node server.js
# http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
npm install
npm run dev
# http://localhost:3000
```

## 📁 Project Structure

```
brainiac-monorepo/
├── src/              # React frontend
├── api/              # Express backend
├── public/
├── vercel.json       # Deployment config
└── package.json
```

## 🎯 How It Works

**One deployment, two services:**

- `https://brainiac.vercel.app/` → Frontend
- `https://brainiac.vercel.app/api/` → Backend API

No CORS issues! Same origin! 🎉

## 📊 Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Anthropic SDK

**Backend:**
- Express.js
- Node.js
- Serverless Functions

## 🔧 Configuration

**API Keys** (set in UI):
- Anthropic API Key
- Supabase Token + Org ID
- GitHub Token + Username
- Vercel Token

## 🎨 Features

- ✅ Create apps from natural language
- ✅ Edit existing apps conversationally
- ✅ Real-time progress updates
- ✅ Stop generation button
- ✅ Project history
- ✅ Premium UI/UX

## 📝 Environment Variables

No environment variables needed! 

API keys are stored in browser localStorage and sent with each request.

## 🐛 Troubleshooting

**Local development:**
```bash
# Backend not running?
cd api && npm install && node server.js

# Frontend errors?
npm install && npm run dev
```

**Deployment:**
```bash
# Check logs
vercel logs

# Redeploy
vercel --prod
```

## 📖 Documentation

See `MONOREPO-DEPLOYMENT.md` for complete deployment guide.

## 🎉 Success!

Your app is now live and ready to build amazing applications! 🚀

---

Built with ❤️ using Claude AI
