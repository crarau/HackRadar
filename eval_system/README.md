# HackRadar Evaluation System

A standalone evaluation system for HackRadar that provides AI-powered analysis of hackathon submissions with persistent progress tracking, delta comparisons, and comprehensive scoring.

## Overview

This system handles:
- **Text evaluations** - Project descriptions, pitches, documentation
- **File/artifact evaluations** - PDFs, videos, repositories, documents  
- **Web evaluations** - Websites, landing pages, demo applications
- **Delta comparisons** - Track changes between submissions over time
- **Submission readiness** - Asserted vs verified states tracking
- **Award flags** - Automatic detection of award potential
- **Persistent progress** - Complete startup evaluation history

## Architecture

### Core Components

- **Models** - Data structures for submissions, evaluations, progress states, and snapshots
- **Agents** - Specialized AI evaluation agents for different content types
- **Services** - Business logic for evaluation orchestration and progress management
- **CLI** - Command-line interface for testing and simulation

### MongoDB Collections

- `progressStates` - Persistent state summarizing everything about each startup
- `snapshots` - Point-in-time captures for delta comparison
- `submissions` - Individual submissions (text, file, web, artifact)
- `evaluations` - AI evaluation results with scores and feedback

## Quick Start

### Installation

```bash
cd /home/chipdev/eval-system
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and OpenAI API key
```

### Basic Usage

```bash
# Test database connection
node src/cli/main.js db:test

# Evaluate text submission
node src/cli/main.js eval:text -s startup-123 -t "Your project description here" --verbose

# Evaluate website
node src/cli/main.js eval:web -s startup-123 -u "https://example.com" --verbose

# View progress
node src/cli/main.js progress:show -s startup-123 --verbose

# List all startups
node src/cli/main.js progress:list
```

### Simulation & Testing

```bash
# Create test teams
node src/cli/simulate.js create-teams

# Simulate submissions for all teams
node src/cli/simulate.js simulate-submissions --verbose

# Test score progression
node src/cli/simulate.js test-progression -t test-aibuddy -i 5 --verbose

# Benchmark agents
node src/cli/simulate.js benchmark-agents -s 3 --verbose

# Clean up test data
node src/cli/simulate.js cleanup --force
```

## System Features

### 1. Multi-Agent Evaluation

#### TextEvaluationAgent
- Evaluates written content (pitches, descriptions, documentation)
- Analyzes clarity, completeness, persuasiveness, feasibility
- Detects key elements (problem, solution, market, technical details)

#### FileEvaluationAgent  
- Evaluates PDFs, presentations, documents, images, videos
- Categorizes file types and applies specialized evaluation criteria
- Extracts and analyzes content based on file format

#### WebEvaluationAgent
- Evaluates websites, landing pages, demo applications
- Fetches live content and analyzes user experience
- Detects technical complexity and framework usage

### 2. Progressive Scoring System

- **Criteria-based scoring**: Innovation, feasibility, impact, presentation, progress, technical, business, execution
- **Weighted averages**: Different submission types have different weights
- **Quality assurance**: Internal scoring of evaluation quality
- **Confidence tracking**: AI confidence levels for each evaluation

### 3. Progress State Management

#### Persistent Progress Tracking
- Cumulative score history with timestamps
- Submission count and activity tracking
- Award flags for 15+ award categories
- Readiness state assessment (not_ready → asserted → verified)

#### Delta Detection
- Automatic comparison between submissions
- Significant change detection (configurable thresholds)
- Trend analysis (improving, declining, stable)
- Momentum calculation

### 4. Snapshot System

#### Point-in-Time Capture
- Complete state capture including all submissions and evaluations
- Aggregated scoring at snapshot time
- Metadata about processing context

#### Delta Comparisons
- Compare any two snapshots
- Identify specific changes (scores, submissions, criteria)
- Generate human-readable change summaries
- Track significant vs minor changes

### 5. Award Flag System

Automatic detection of potential awards:
- Technical Innovation
- Business Viability  
- Presentation Excellence
- Social Impact
- AI Integration
- Crowd Favorite
- Hype Machine
- Moonshot
- Rapid Development
- Data Insights
- User Experience
- Sustainability
- Collaboration
- Market Potential
- Disruptive Technology

## API Integration

### With HackRadar Next.js App

The system can be integrated with the main HackRadar application:

```javascript
import { EvaluationService } from './eval-system/src/services/EvaluationService.js';

const evalService = new EvaluationService();

// Evaluate submission
const result = await evalService.evaluateText(startupId, content);

// Get progress
const progress = await evalService.getProgress(startupId);

// Create snapshot
const snapshot = await evalService.createSnapshot(startupId, 'user_request');
```

### Environment Variables

```env
# MongoDB connection (required)
MONGODB_URI=mongodb+srv://...

# OpenAI API key (optional, will use mock mode if not provided)
OPENAI_API_KEY=sk-...

# Configuration
MIN_SCORE=0
MAX_SCORE=100  
DELTA_THRESHOLD=5
MAX_RETRIES=3
TIMEOUT_MS=30000
```

## Testing Results

The system has been tested with:
- ✅ Database connectivity and indexing
- ✅ Text evaluation pipeline
- ✅ Web evaluation with live content fetching
- ✅ Progress state management and updates
- ✅ Snapshot creation and delta comparison
- ✅ Multi-team simulation scenarios
- ✅ Score progression tracking
- ✅ Award flag detection
- ✅ CLI interface functionality

### Sample Test Results

```
📋 Found 3 startups:
 1. EcoTracker    - Score: 82/100 | Submissions: 2 | ✅ verified
 2. MedConnect    - Score: 77/100 | Submissions: 2 | ✅ verified  
 3. AI Buddy      - Score: 71/100 | Submissions: 2 | ✅ verified
```

## Performance Characteristics

- **Text evaluations**: ~500ms (mock mode), ~2-5s (with OpenAI API)
- **Web evaluations**: ~2-3s (including content fetch)  
- **Database operations**: <100ms for most queries
- **Snapshot creation**: ~200-500ms depending on submission count
- **Memory usage**: ~50-100MB for typical workloads

## Error Handling & Resilience

- Automatic fallback to mock mode when OpenAI API unavailable
- Graceful handling of inaccessible websites
- Transaction-like behavior for database operations
- Comprehensive input validation
- Detailed error logging and user feedback

## Monitoring & Health Checks

```bash
# Database health
node src/cli/main.js db:health

# Collection statistics  
node src/cli/main.js db:stats

# Agent configuration
node src/cli/main.js agents:config
```

## Security Considerations

- Environment variable protection for API keys
- Input sanitization for all user content
- Database connection security with MongoDB Atlas
- Rate limiting considerations for API calls
- No sensitive data logging

## Future Enhancements

- Real-time WebSocket notifications for score updates
- Advanced ML models for content analysis  
- Integration with GitHub API for repository analysis
- Automated report generation
- Multi-language support for international hackathons
- Advanced analytics and insights dashboard

## Support

For questions or issues:
1. Check the CLI help: `node src/cli/main.js --help`
2. Review simulation examples: `node src/cli/simulate.js --help`
3. Test with mock mode first (no OpenAI API key required)
4. Check database connectivity: `node src/cli/main.js db:test`