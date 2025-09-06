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