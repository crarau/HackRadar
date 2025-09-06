# LinkedIn Bot Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
cd ~/HackRadar/social-bot
npm install
```

### 2. Create LinkedIn Session
```bash
npm run create-session
```

This will:
- Open a browser window
- Navigate to LinkedIn
- Prompt for your credentials (first time only)
- Handle 2FA if needed
- Save your session locally

### 3. Test the Connection
```bash
npm run test-post
```

This will create a test post to verify everything works.

### 4. Run the Bot
```bash
npm start
```

The bot will now post according to the schedule in `posts.json`.

## Session Management

### View Session Status
Check if you have an active session:
```bash
ls -la linkedin-session/
```

### Clear Session (Logout)
```bash
rm -rf linkedin-session/
```

### Recreate Session
```bash
npm run create-session
```

## Troubleshooting

### Session Expired
If you get logged out:
1. Delete old session: `rm -rf linkedin-session/`
2. Create new session: `npm run create-session`

### 2FA Issues
- The browser window will stay open
- Complete 2FA in the browser
- Press Enter in terminal when done

### Post Not Appearing
- Check LinkedIn's rate limits
- Verify you're logged in
- Try test post first: `npm run test-post`

## Security Notes

⚠️ **IMPORTANT**: 
- Never share the `linkedin-session/` folder
- It contains your active LinkedIn session
- Anyone with this folder can access your LinkedIn
- It's already in `.gitignore` for safety

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run create-session` | Create/refresh LinkedIn session |
| `npm run test-post` | Send a test post |
| `npm start` | Run the scheduled posting bot |
| `npm run post` | Alternative way to run bot |

## Post Schedule

Posts are defined in `posts.json` with scheduled times:
- Launch announcement
- Progress updates
- Beta tester calls
- Technical deep dives
- Demo announcements

Edit `posts.json` to customize content and timing.