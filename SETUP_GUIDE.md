# HackRadar - Complete Setup Guide

## Prerequisites
- Node.js (v16+)
- MongoDB (local or cloud)
- Google Cloud Console account (for OAuth)
- OpenAI API key

## 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Application type: Web application
6. Add authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - Your production domain
7. Add authorized redirect URIs:
   - `http://localhost:3000`
   - Your production domain
8. Copy the Client ID

## 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your credentials:
# - MONGODB_URI (MongoDB connection string)
# - GOOGLE_CLIENT_ID (from step 1)
# - OPENAI_API_KEY (from OpenAI)

# Start MongoDB (if local)
mongod

# Run backend server
npm run dev
```

Backend will run on http://localhost:7328

## 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env:
# - REACT_APP_GOOGLE_CLIENT_ID (same as backend)
# - REACT_APP_API_URL=http://localhost:7328

# Start frontend
npm start
```

Frontend will run on http://localhost:3000

## 4. Test the Application

1. Open http://localhost:3000
2. Click "Sign in with Google"
3. Enter a team name
4. Upload test files (PDF, images, documents)
5. Click "Get AI Evaluation"
6. View your evaluation results

## 5. Production Deployment

### Backend (Heroku/Railway/Render)
```bash
# Add these environment variables:
PORT=7328
MONGODB_URI=mongodb+srv://...
GOOGLE_CLIENT_ID=...
OPENAI_API_KEY=...
```

### Frontend (Vercel/Netlify)
```bash
# Build for production
npm run build

# Environment variables:
REACT_APP_GOOGLE_CLIENT_ID=...
REACT_APP_API_URL=https://your-backend-url.com
```

## Architecture Overview

```
HackRadar/
├── frontend/          # React TypeScript app
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandingPage.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── App.tsx
│   │   └── types.ts
│   └── public/
│       └── logo.svg
├── backend/           # Node.js Express API
│   ├── server.js      # Main server file
│   ├── uploads/       # File storage
│   └── .env          # Environment variables
└── social-bot/        # LinkedIn automation
    └── linkedin-poster.js
```

## Features

### For Teams
- 🔐 Google OAuth authentication
- 📤 Multi-file upload (PDF, images, docs)
- 🤖 AI-powered evaluation
- 📊 Real-time scoring
- 💡 Actionable feedback
- 🏆 Leaderboard ranking

### Technical Stack
- **Frontend**: React, TypeScript, Framer Motion
- **Backend**: Node.js, Express, MongoDB
- **AI**: OpenAI GPT-4
- **Auth**: Google OAuth 2.0
- **File Processing**: PDF parsing, text extraction

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check MongoDB is running
mongod --version

# For MongoDB Atlas, whitelist your IP
```

### Google OAuth Errors
- Verify Client ID matches in frontend and backend
- Check authorized origins in Google Console
- Clear browser cookies/cache

### File Upload Issues
- Max file size: 10MB
- Supported formats: PDF, PNG, JPG, DOC, DOCX, TXT
- Check `uploads/` folder permissions

### AI Evaluation Not Working
- Verify OpenAI API key is valid
- Check API rate limits
- Monitor console for errors

## Development Tips

### Run Everything
```bash
# Terminal 1: MongoDB
mongod

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm start
```

### Test with Mock Data
The backend includes fallback mock evaluation if OpenAI fails, ensuring the app works during development.

## Support

For issues or questions:
- GitHub: https://github.com/crarau/HackRadar
- Documentation: See PROJECT_HISTORY.md

---

Built with passion for AGI Ventures Canada Hackathon 3.0 🚀