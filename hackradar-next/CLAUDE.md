# HackRadar Project Build & Development Guidelines

## CRITICAL BUILD REQUIREMENTS

⚠️ **MUST PASS BUILD BEFORE DEPLOYMENT** ⚠️

Before pushing any changes to production:
1. **ALWAYS run `npm run build` locally**
2. **Fix ALL TypeScript errors and ESLint warnings**
3. **Never deploy with build failures**

### Build Commands
```bash
# Development
npm run dev

# Production build (MUST pass for deployment)
npm run build

# Linting
npm run lint

# Type checking
npm run type-check
```

## Common Build Fixes

### TypeScript Errors
- Never use `any` type - always provide proper type definitions
- Remove unused imports and variables
- Use proper React icon imports: `<FiIcon />` not `React.createElement(FiIcon as any)`

### ESLint Warnings
- Remove unused variables and imports
- Use Next.js `<Image />` component instead of `<img>` tags
- Remove unused function parameters

### Image Optimization
Replace `<img>` tags with:
```tsx
import Image from 'next/image'

<Image 
  src="/logo.svg" 
  alt="HackRadar" 
  width={32} 
  height={32} 
  className="dashboard-logo" 
/>
```

## Port Configuration
- Frontend Development: 7843 (Next.js)
- Production: Deployed on Vercel

## Environment Variables
- `MONGODB_URI`: MongoDB connection string
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth client ID
- `OPENAI_API_KEY`: OpenAI API key for AI evaluations

## Pre-deployment Checklist
- [ ] `npm run build` passes without errors
- [ ] All TypeScript errors resolved
- [ ] All ESLint warnings addressed
- [ ] Images optimized using Next.js Image component
- [ ] No console.log statements in production code
- [ ] Environment variables properly configured

## Deployment Status
✅ Live on: hackradar.me
✅ Backend API: Vercel serverless functions
✅ Database: MongoDB Atlas
✅ Authentication: Google OAuth

**Remember: A failing build means a broken production deployment!**

## Database Management Scripts

### Clean and Insert Mock Data
Always clean existing data before inserting mock data to avoid conflicts.

#### Available Scripts:
```bash
# Full clean and insert mock EcoTracker data
node scripts/simulate-project.js [projectId] [scenario]

# Scenarios available:
# - ecotracker: AI sustainability platform (score: 55)
# - healthhub: Telemedicine AI (score: 72)
# - fintech: Blockchain payments (score: 83)
# - edtech: AI tutor (score: 67)
# - empty: Clean slate

# Example for specific project:
node scripts/simulate-project.js 68bc5da3a1e502fdc1292a65 ecotracker
```

#### Clean Before Insert Process:
1. Script automatically cleans ALL existing timeline entries
2. Updates project metadata (team name, score, description)
3. Inserts fresh mock data without conflicts
4. Verifies final state

#### Important Project IDs:
- Main testing project: `68bc5da3a1e502fdc1292a65`
- EcoTracker project: `68bc936eaec499fa3db4f7eb`
- User email: `ciprarau@gmail.com`

### Verification Scripts:
```bash
# Check current state of a project
node scripts/check-ecotracker-ui.js

# Full clean for a user
node scripts/full-clean.js ciprarau@gmail.com
```

**IMPORTANT**: The simulate-project.js script ALWAYS cleans before inserting to ensure no data conflicts.