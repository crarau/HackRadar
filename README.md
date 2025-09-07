# 🚀 HackRadar - AI-Powered Real-Time Hackathon Evaluation Platform

![HackRadar Platform](hackradar.png)

<div align="center">
  
  [![Live Demo](https://img.shields.io/badge/Live-hackradar.me-00d4ff?style=for-the-badge)](https://hackradar.me)
  [![AI Powered](https://img.shields.io/badge/AI-Claude%203.5-a855f7?style=for-the-badge)](https://www.anthropic.com)
  [![Built In](https://img.shields.io/badge/Built%20In-12%20Hours-00ff88?style=for-the-badge)](https://hackradar.me/technical-journey)
  
  **🏆 Built at AGI Ventures Canada Hackathon 3.0**
  
</div>

## 🤖 The AI Revolution: 99% AI-Generated Code

<div align="center">
  <table>
    <tr>
      <td align="center"><b>20,000+</b><br/>Lines of Code</td>
      <td align="center"><b>2 😊</b><br/>Lines Written by Hand</td>
      <td align="center"><b>$400</b><br/>AI Tokens Used</td>
      <td align="center"><b>12</b><br/>Hours to Build</td>
    </tr>
  </table>
</div>

> **This entire platform was built using Claude Code** - we literally wrote only 2 lines of code by hand. Everything else was AI-generated: the complex multi-agent system, React components, API endpoints, CSS styling. This represents the future of software development.

## 🎯 What is HackRadar?

HackRadar is a revolutionary platform that transforms how hackathons evaluate projects. Teams get **real-time AI feedback** to improve their submissions, while organizers get **consistent, fair evaluation** across all projects.

### Key Features

- 🎨 **Multi-Format Support**: Upload PDFs, screenshots, websites, pitch decks
- 🧠 **AI-Powered Analysis**: Multi-agent system with specialized evaluation agents
- 📊 **Real-Time Scoring**: Instant feedback across 6 key criteria
- 💡 **Actionable Feedback**: Specific suggestions on HOW to improve
- 📈 **Progress Tracking**: See your score evolution over time
- 🏆 **Live Leaderboard**: Track competition in real-time

## 👥 The Team

A unique collaboration of three minds with one vision:

- **Ciprian (Chip) Rarau** - DevOps, deployment, AI coding implementation
- **Yehor Sanko** - AI architect, prompt engineering, UI/UX refinement
- **Luca Rarau** - Customer validation, sales, product feedback

The magic happened when Ciprian and Yehor discovered they had the same idea independently - creating a tool to help hackathon teams succeed.

## 🏗️ Technical Architecture

### System Overview

```
🎨 Frontend Layer
├── Next.js 15
├── React 19
├── TypeScript
└── Tailwind CSS

⚡ API Layer
├── /api/projects
├── /api/timeline
├── /api/assess
└── /api/leaderboard

🧠 AI Evaluation Engine
├── BaseAgent (Orchestrator)
├── TextEvaluator (Claude 3.5)
└── SRTracker (Checklist)

💾 Database Layer
├── MongoDB Atlas
├── Projects Collection
├── Timeline Collection
└── Evaluations Collection
```

### Key Innovations

#### 🧠 Conversation Memory System
Revolutionary cumulative scoring that maintains context across multiple submissions. Teams' scores can only improve or maintain - never decrease unfairly.

```typescript
// Conversation continuity across evaluations
const messageHistory = await buildMessageHistory(projectId);
const evaluation = await evaluateWithContext(
  content, 
  messageHistory, 
  conversationId
);
```

#### ⚡ Real-Time Progress Tracking
Timeline-based architecture enables perfect audit trails and historical tracking.

#### 🛡️ Anti-Regression Logic
Innovative score anchoring system ensures teams are protected from scoring volatility.

## 📊 Scoring Algorithm (100 Points Total)

| Criterion | Points | Description |
|-----------|--------|-------------|
| **Clarity** | 15 | Message clarity and structure |
| **Problem Value** | 20 | Pain point identification |
| **Feasibility** | 15 | Technical evidence |
| **Originality** | 15 | Innovation factor |
| **Impact** | 20 | Conversion potential |
| **Readiness** | 15 | Completeness check |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB connection string
- Anthropic API key

### Installation

```bash
# Clone the repository
git clone https://github.com/crarau/HackRadar.git
cd HackRadar/hackradar-next

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev

# Open http://localhost:7843
```

### Environment Variables

```env
MONGODB_URI=your_mongodb_connection_string
ANTHROPIC_API_KEY=your_anthropic_api_key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

## 📈 12-Hour Development Timeline

| Hours | Achievement | Details |
|-------|-------------|---------|
| **0-2** | Domain & Infrastructure | Deployed on Azure/Vercel, configured domain |
| **2-4** | Core Development | Next.js app, authentication, database schema |
| **4-6** | AI Multi-Agent System | Claude API integration, evaluation agents |
| **6-8** | Frontend & UX | React components, real-time updates |
| **8-10** | Customer Validation | Talked with 10+ teams, gathered feedback |
| **10-12** | Testing & Polish | End-to-end tests, API simulation, UI testing |

## 🎯 Customer Validation

During the hackathon, we:
- 🗣️ **Interviewed 10+ teams** directly
- 👀 **Saw teams' eyes light up** when receiving actionable feedback
- 🎯 **Pitched to existing teams** and watched them improve in real-time
- ✅ **Validated the need** for real-time feedback during hackathons

## 🧪 Testing Approach

We leveraged the power of LLMs to accelerate our testing strategy:
- **End-to-End Tests** for main application flows
- **API Simulation** to test without external dependencies
- **UI Testing** through simulated user interactions
- **LLM-Assisted Testing**: Used AI to write tests and validate API responses directly

This approach helped us accelerate development significantly. While we don't have 100% coverage, we ensured the critical paths were thoroughly tested.

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Azure VM deployment
- **Database**: MongoDB Atlas
- **AI**: Anthropic Claude 3.5 Sonnet
- **Authentication**: Google OAuth
- **Development**: Claude Code (99% AI-generated!)

## 📊 Project Statistics

- **60** Git Commits
- **20,000+** Lines of Code
- **2** Lines Written Manually 😊
- **$400** Worth of AI Tokens
- **10+** Teams Interviewed
- **End-to-End Tests** for Main Features

## 🌟 Why HackRadar?

### For Teams
- Get specific, actionable feedback to improve your project
- Track your progress throughout the hackathon
- Understand exactly what judges are looking for
- Iterate quickly based on AI suggestions

### For Organizers
- Consistent evaluation across all projects
- Reduce judge workload and bias
- Get comprehensive analytics
- Provide better experience for participants

## 📱 Features in Action

1. **Submit Your Project**: Upload any format - PDF, screenshots, code, URLs
2. **Get Instant Analysis**: AI evaluates across 6 key criteria
3. **Receive Actionable Feedback**: Specific suggestions for improvement
4. **Track Progress**: See your score evolution over time
5. **Compete Live**: Watch the leaderboard update in real-time

## 🚦 Build & Deployment

```bash
# Production build
npm run build

# Run tests
npm test

# Deploy to Vercel
vercel --prod
```

## 🔗 Links

- 🌐 **Live Platform**: [hackradar.me](https://hackradar.me)
- 📖 **Technical Journey**: [hackradar.me/technical-journey](https://hackradar.me/technical-journey)
- 🏆 **Leaderboard**: [hackradar.me/public-dashboard](https://hackradar.me/public-dashboard)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- **AGI Ventures Canada** for hosting the hackathon
- **Anthropic** for Claude API
- **All the teams** who provided invaluable feedback
- **The hackathon community** for the inspiration

---

<div align="center">
  
  **Built with ❤️ and AI by the HackRadar Team**
  
  *We didn't just build a tool. We built the future of hackathon feedback.*
  
  [![Try HackRadar](https://img.shields.io/badge/Try-HackRadar-00d4ff?style=for-the-badge)](https://hackradar.me)
  
</div>