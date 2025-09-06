# HackRadar Cloud Infrastructure & Deployment

## 🌐 Production Deployment

### Domain
- **Primary Domain**: HackRadar.me
- **Status**: ✅ Purchased and configured
- **DNS Provider**: Configured with Vercel DNS
- **SSL**: Auto-provisioned by Vercel

### Hosting Infrastructure

#### Frontend (Vercel)
- **Platform**: Vercel Edge Network
- **URL**: https://hackradar.me
- **Framework**: React 19 with TypeScript
- **Build Command**: `npm run build`
- **Output Directory**: `build/`
- **Environment Variables**:
  ```
  REACT_APP_API_URL=https://api.hackradar.me
  REACT_APP_GOOGLE_CLIENT_ID=[Google OAuth Client ID]
  ```

#### Backend API (Vercel Functions)
- **Platform**: Vercel Serverless Functions
- **API URL**: https://api.hackradar.me
- **Runtime**: Node.js 20.x
- **Framework**: Express.js with serverless adapter
- **Environment Variables**:
  ```
  MONGODB_URI=[MongoDB Atlas Connection String]
  OPENAI_API_KEY=[OpenAI API Key]
  GOOGLE_CLIENT_ID=[Google OAuth Client ID]
  JWT_SECRET=[JWT Secret Key]
  ```

### Database Infrastructure

#### MongoDB Atlas
- **Cluster**: M10 Dedicated Cluster
- **Provider**: AWS
- **Region**: us-east-1
- **Database Name**: hackradar-prod
- **Collections**:
  - `teams` - Team registration and profiles
  - `submissions` - Document submissions
  - `evaluations` - AI evaluation results
  - `users` - User authentication data
  - `scores` - Score history and tracking

### AI Services

#### OpenAI API
- **Model**: GPT-4-turbo
- **Usage**: Document analysis and evaluation
- **Rate Limits**: 10,000 TPM (Tokens Per Minute)
- **Endpoints Used**:
  - Chat Completions for evaluation
  - Embeddings for similarity analysis

### Authentication

#### Google OAuth 2.0
- **Provider**: Google Cloud Platform
- **Client ID**: Configured in GCP Console
- **Authorized Domains**: hackradar.me
- **Redirect URIs**: 
  - https://hackradar.me/auth/callback
  - http://localhost:3000/auth/callback (dev)

## 📊 Monitoring & Analytics

### Vercel Analytics
- Real-time performance metrics
- Web Vitals tracking
- Error monitoring
- Usage statistics

### MongoDB Atlas Monitoring
- Database performance metrics
- Query performance insights
- Connection analytics
- Alert configurations

## 🚀 Deployment Process

### Automated CI/CD Pipeline
```yaml
# Vercel deployment configuration
{
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    },
    {
      "src": "backend/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/backend/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    }
  ]
}
```

### Deployment Commands
```bash
# Frontend deployment
cd frontend
npm run build
vercel --prod

# Backend deployment
cd backend
vercel --prod

# Full stack deployment
vercel --prod
```

## 🔒 Security Configuration

### Environment Security
- All sensitive keys stored in Vercel Environment Variables
- Secrets never committed to repository
- API keys rotated regularly

### CORS Configuration
```javascript
const corsOptions = {
  origin: [
    'https://hackradar.me',
    'https://www.hackradar.me',
    'http://localhost:3000',
    'http://localhost:8742'
  ],
  credentials: true
};
```

### Rate Limiting
- API: 100 requests per minute per IP
- File uploads: 10 per minute per user
- AI evaluations: 5 per minute per team

## 📈 Scaling Configuration

### Auto-scaling
- **Vercel**: Automatic scaling based on traffic
- **MongoDB Atlas**: Auto-scaling enabled for storage
- **Compute**: Scales from 0 to 100 concurrent executions

### CDN Configuration
- Static assets served via Vercel Edge Network
- Global distribution across 70+ PoPs
- Automatic image optimization

## 🛠️ Development Setup

### Local Development
```bash
# Clone repository
git clone https://github.com/yourusername/HackRadar.git
cd HackRadar

# Install dependencies
cd frontend && npm install
cd ../backend && npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run development servers
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm start
```

### Required Services for Development
1. MongoDB Atlas account (free tier available)
2. OpenAI API key
3. Google Cloud Platform project with OAuth configured
4. Vercel account for deployment

## 📝 Maintenance & Updates

### Regular Maintenance Tasks
- [ ] Weekly dependency updates
- [ ] Monthly security audits
- [ ] Database backup verification
- [ ] API key rotation (quarterly)
- [ ] Performance optimization reviews

### Monitoring Checklist
- [ ] Vercel deployment status
- [ ] MongoDB connection health
- [ ] API response times
- [ ] Error rates
- [ ] User authentication flow

## 🆘 Troubleshooting

### Common Issues & Solutions

#### MongoDB Connection Issues
```bash
# Check connection string
mongodb+srv://<username>:<password>@cluster.mongodb.net/hackradar-prod

# Ensure IP whitelist includes Vercel IPs
0.0.0.0/0 (for production)
```

#### Build Failures
```bash
# Clear cache and rebuild
vercel --force
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Environment Variable Issues
```bash
# List all env vars
vercel env ls

# Add missing env var
vercel env add VARIABLE_NAME
```

## 📞 Support & Resources

- **Vercel Dashboard**: https://vercel.com/dashboard
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Google Cloud Console**: https://console.cloud.google.com
- **OpenAI Platform**: https://platform.openai.com

## 🎯 Performance Targets

- **Page Load Time**: < 2 seconds
- **API Response Time**: < 500ms
- **AI Evaluation Time**: < 30 seconds
- **Uptime Target**: 99.9%

---

Last Updated: September 6, 2025
Deployed at AGI Ventures Canada Hackathon 3.0
Location: Invest Ottawa