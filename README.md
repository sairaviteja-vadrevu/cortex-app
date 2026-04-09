# G5 World Building

> AI-powered storyboard and film production platform

## 📚 Documentation

**[📖 Complete Documentation Index](./DOCS_INDEX.md)** - Find all guides

**Quick Links:**

- **[🚀 Quick Start Guide](./QUICKSTART.md)** - Deploy in 5 minutes
- **[📖 Full Deployment Guide](./DEPLOYMENT.md)** - Comprehensive deployment instructions
- **[✅ Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist
- **[🔐 Environment Variables](./ENV_VARS.md)** - Complete env vars reference
- **[🔌 API Integration](./API_INTEGRATION.md)** - Frontend-backend connection
- **[🏗️ Architecture](./ARCHITECTURE.md)** - System design and diagrams

---

## 🚀 Quick Deploy

### 1. Get Prerequisites

- MongoDB Atlas (free tier)
- One AI API key (Anthropic/OpenAI/Google)
- Railway or Render account
- Netlify account

### 2. Deploy Backend to Railway

```bash
# Set environment variables in Railway dashboard:
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=generate-with-openssl-rand-hex-32
ANTHROPIC_API_KEY=your-key
```

### 3. Deploy Frontend to Netlify

```bash
# Set environment variable in Netlify:
VITE_API_URL=your-railway-backend-url
```

### 4. Update CORS

```bash
# In Railway, add:
CORS_ORIGINS=your-netlify-url
```

**See [QUICKSTART.md](./QUICKSTART.md) for detailed 5-minute setup guide.**

---

## 💻 Local Development

### Backend

```bash
cd server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Then configure your .env
uvicorn app.main:app --reload
```

### Frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` with API proxy to `http://localhost:8000`.

---

## 🏗️ Architecture

### Frontend (client/)

- **Framework**: React 19 + Vite
- **3D Engine**: Three.js + React Three Fiber
- **State**: Valtio
- **Styling**: Tailwind CSS
- **Features**: PWA support, service workers

### Backend (server/)

- **Framework**: FastAPI + Python 3.12
- **Database**: MongoDB (Motor async driver)
- **Auth**: JWT with bcrypt
- **AI**: Anthropic, OpenAI, Google AI integration
- **File Processing**: PDF extraction, scene splitting

---

## 🔧 Tech Stack

**Frontend:**

- React 19, Vite, Three.js
- React Three Fiber, Drei, Rapier
- Tailwind CSS, Lucide Icons
- Valtio state management
- PWA with Workbox

**Backend:**

- FastAPI, Uvicorn
- MongoDB with Motor
- Anthropic Claude, OpenAI GPT
- Google Gemini, Replicate
- JWT auth, bcrypt

---

## 📋 Features

✅ User authentication (signup/signin)
✅ Organization & collection management
✅ AI-powered screenplay processing
✅ Scene & shot extraction
✅ Storyboard generation
✅ 3D world building editor
✅ Character creation & management
✅ File upload & management
✅ Real-time AI chat interface
✅ Agentic pipeline workflows
✅ Motion generation (Kimodo integration)

---

## 🚀 Deployment Guide

### Prerequisites

1. **MongoDB Database** - MongoDB Atlas (free tier available)
2. **AI API Keys** - At least one:
   - Anthropic API key
   - OpenAI API key
   - Google/Gemini API key
3. **Backend Hosting** - Railway, Render, Fly.io, or similar
4. **Frontend Hosting** - Netlify (pre-configured)

### Backend Deployment

#### Environment Variables Required

Create a `.env` file in the `server/` directory:

```bash
# MongoDB (Required)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB=storyboard_ai

# JWT Authentication (Required)
JWT_SECRET=your-secure-random-secret-key-here

# LLM API Keys (at least one required)
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
GOOGLE_API_KEY=your-google-key
GEMINI_API_KEY=your-gemini-key

# Optional
KLEIN_API_KEY=your-klein-key
REPLICATE_KEY=your-replicate-key
CORS_ORIGINS=https://your-frontend.netlify.app
```

#### Deploy to Railway/Render/Fly.io

1. Connect your GitHub repository
2. Set environment variables in dashboard
3. Deploy from `server/` directory
4. Note your backend URL (e.g., `https://your-app.railway.app`)

### Frontend Deployment

#### 1. Configure API URL

Create `client/.env.production`:

```bash
VITE_API_URL=https://your-backend-url.com
```

Replace with your actual deployed backend URL.

#### 2. Deploy to Netlify

**Option A: Netlify Dashboard**

1. Connect your GitHub repository
2. Set **Build directory**: `client/`
3. Set **Environment variable**: `VITE_API_URL=https://your-backend-url.com`
4. Deploy (uses existing `netlify.toml` config)

**Option B: Netlify CLI**

```bash
cd client
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

#### 3. Update Backend CORS

After getting your Netlify URL, update backend's `CORS_ORIGINS`:

```bash
CORS_ORIGINS=https://your-app.netlify.app,https://your-custom-domain.com
```

### Local Development

#### Backend

```bash
cd server
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
cp .env.example .env  # Configure your .env
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd client
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API requests to `http://localhost:8000`.

### Deployment Checklist

- [ ] MongoDB Atlas cluster created and connection string obtained
- [ ] At least one LLM API key acquired
- [ ] JWT secret generated (`openssl rand -hex 32`)
- [ ] Backend deployed with all environment variables
- [ ] Backend URL noted
- [ ] Frontend `.env.production` created with backend URL
- [ ] Frontend deployed to Netlify
- [ ] Backend CORS updated with frontend URL
- [ ] Test authentication and API calls

### Troubleshooting

**CORS errors**: Ensure backend `CORS_ORIGINS` includes your frontend URL
**API connection failed**: Verify `VITE_API_URL` in frontend env
**Authentication issues**: Check JWT_SECRET is set on backend
**Database errors**: Verify MongoDB connection string and IP whitelist
