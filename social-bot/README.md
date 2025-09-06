# HackRadar Social Bot - LinkedIn Automation

Automated LinkedIn posting for the HackRadar project during AGI Ventures Canada Hackathon 3.0.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your LinkedIn credentials
```

## Usage

### Manual Posting
```bash
# Using environment variables
npm start

# Using command line arguments
node linkedin-poster.js your-email@example.com your-password
```

### Scheduled Posts
Posts are configured in `posts.json` with scheduled times. The bot will automatically post at the specified times.

## Features

- 🤖 Automated LinkedIn login
- 📝 Scheduled post publishing
- 🖼️ Image upload support
- ⏰ Time-based scheduling
- 🔒 2FA handling support
- 📊 Post tracking

## Important Notes

1. **2FA**: If your LinkedIn account has 2FA enabled, you'll need to complete verification manually when prompted
2. **Rate Limiting**: Be careful not to post too frequently to avoid LinkedIn restrictions
3. **Headless Mode**: Set to `false` in development to see what's happening
4. **Security**: Never commit your `.env` file with real credentials

## Post Schedule

- **Day 1 (Sept 6)**
  - 9:30 AM - Launch announcement
  - 3:00 PM - Progress update
  - 6:00 PM - Call for beta testers
  - 8:00 PM - Technical deep dive
  - 9:00 PM - End of day update

- **Day 2 (Sept 7)**
  - 9:00 AM - Final sprint
  - 10:00 AM - Demo announcement

## Required Tags

All posts must include:
- Tag: **AGI Ventures Canada**
- Hashtags: `#AGIV #AGIVenturesCanada #BuildToConvert`

## Troubleshooting

- If login fails, check your credentials
- If posts aren't appearing, verify LinkedIn hasn't changed their UI
- For 2FA issues, complete verification in the browser window
- Check console logs for detailed error messages