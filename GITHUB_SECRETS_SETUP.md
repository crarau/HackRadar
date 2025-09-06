# GitHub Secrets Setup for Vercel CI/CD

This guide will help you set up the required GitHub secrets for automatic Vercel deployment.

## Required GitHub Secrets

You need to add the following secrets to your GitHub repository:

1. **VERCEL_TOKEN** - Your Vercel authentication token
2. **VERCEL_ORG_ID** - Your Vercel organization ID  
3. **VERCEL_PROJECT_ID** - Your Vercel project ID

## Step 1: Get Your Vercel Token

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Give it a name (e.g., "GitHub Actions")
4. Copy the token (you won't be able to see it again!)

## Step 2: Get Your Organization and Project IDs

These are already configured in your project:

- **Organization ID**: `team_T4P5m4tS5AJdG2L4h6PVz2zF`
- **Project ID**: `prj_AbIA4ZK946mhIrLWMBBXxKAyLexQ`
- **Project Name**: `hackradar-next`

## Step 3: Add Secrets to GitHub

1. Go to your GitHub repository: https://github.com/crarau/HackRadar
2. Click on "Settings" tab
3. In the left sidebar, click "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Add each secret:

### Secret 1: VERCEL_TOKEN
- Name: `VERCEL_TOKEN`
- Value: (paste your Vercel token from Step 1)

### Secret 2: VERCEL_ORG_ID
- Name: `VERCEL_ORG_ID`
- Value: `team_T4P5m4tS5AJdG2L4h6PVz2zF`

### Secret 3: VERCEL_PROJECT_ID
- Name: `VERCEL_PROJECT_ID`
- Value: `prj_AbIA4ZK946mhIrLWMBBXxKAyLexQ`

## Step 4: Configure Environment Variables in Vercel

Go to your [Vercel project settings](https://vercel.com/dashboard) and add these environment variables:

1. **google_client_id**
   - Value: `378200832535-trha0skd6g1mma6dv0rtl6o9fprjh38b.apps.googleusercontent.com`

2. **api_url** 
   - Production: `https://hackradar.me/api`
   - Development: `http://localhost:7328`

3. **mongodb_uri**
   - Your MongoDB connection string

4. **openai_api_key**
   - Your OpenAI API key

## How It Works

Once configured, the GitHub Actions workflow will:

1. **On push to main/master**: Deploy to production
2. **On pull request**: Create a preview deployment
3. **Automatic**: No manual intervention needed!

## Testing the Setup

After adding all secrets:

1. Make a small change to any file
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Test CI/CD deployment"
   git push origin main
   ```
3. Go to the "Actions" tab in your GitHub repository
4. Watch the deployment workflow run
5. Once complete, your site will be live at https://hackradar.me

## Troubleshooting

If the deployment fails:

1. Check the GitHub Actions logs for errors
2. Verify all secrets are correctly set
3. Ensure the Vercel token hasn't expired
4. Check that the project IDs match your Vercel project

## Directory Structure

```
HackRadar/
├── .github/
│   └── workflows/
│       └── vercel-deploy.yml    # CI/CD workflow
├── hackradar-next/              # Next.js application
│   ├── .vercel/                 # Vercel configuration
│   │   └── project.json         # Project IDs
│   ├── vercel.json             # Vercel settings
│   └── ...
```

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)