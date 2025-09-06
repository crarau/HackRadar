# HackathonPulse - AI-Powered Real-Time Hackathon Evaluation System

## Project Overview
An intelligent evaluation platform that automatically analyzes hackathon team submissions in real-time, providing continuous scoring, feedback, and progress tracking throughout the event.

## Core Features

### 1. Multi-Format Document Ingestion
- **Supported Formats**: PDF, DOC/DOCX, websites, screenshots, pitch decks
- **Team Repositories**: Each team has their own document repository
- **Version Tracking**: Track document updates with timestamps
- **Multi-language Support**: Handle submissions in various languages

### 2. AI-Powered Analysis Engine
- **Multiple Analysis Agents**: Specialized agents for different evaluation criteria
- **Criteria Evaluated**:
  - Technical innovation
  - Business viability
  - Presentation quality
  - Progress milestones
  - Team achievements (funding secured, customer acquisition, etc.)
- **Unstructured Data Processing**: Handle diverse content types and formats

### 3. Real-Time Scoring System
- **Dynamic Scoring**: Scores update as teams submit new materials
- **Temporal Tracking**: Record when updates occur and how scores change
- **Score History**: Maintain complete scoring history with timestamps
- **Visual Progress**: Generate graphs showing score evolution over time

### 4. Interactive Feedback System
- **Automated Feedback**: Provide actionable insights to teams
- **Improvement Guidance**: Suggest next steps based on current submission
- **Strengths & Weaknesses**: Highlight what's working and what needs work

### 5. Live Leaderboard
- **Real-Time Updates**: Scoreboard updates as evaluations complete
- **Comparative Analysis**: Show relative team performance
- **Progress Indicators**: Display team activity and momentum

## Technical Architecture

### Frontend
- **Team Portal**: QR code-based upload interface
- **Dashboard**: Real-time scoring visualization
- **Submission Interface**: Drag-and-drop file upload
- **Progress Tracking**: Team-specific progress views

### Backend
- **Document Processing Pipeline**:
  1. File ingestion and format detection
  2. Content extraction (OCR for images, parsing for documents)
  3. Multi-agent analysis
  4. Score calculation and aggregation
  5. Feedback generation

### Database Schema
```
teams:
  - id
  - name
  - repository_path
  - created_at

submissions:
  - id
  - team_id
  - file_path
  - file_type
  - submitted_at
  - processed_at

evaluations:
  - id
  - submission_id
  - criterion
  - score
  - feedback
  - evaluated_at

score_history:
  - id
  - team_id
  - total_score
  - timestamp
  - delta_from_previous
```

### AI Agents
- **Technical Analysis Agent**: Code quality, innovation, implementation
- **Business Analysis Agent**: Market fit, monetization, scalability
- **Presentation Agent**: Clarity, visual design, communication
- **Progress Tracking Agent**: Milestone achievement, momentum
- **Feedback Generation Agent**: Constructive feedback synthesis

## Implementation Timeline

### Phase 1: Core Infrastructure (Hours 1-3)
- Set up project structure
- Create database schema
- Build file upload system
- Implement basic document processing

### Phase 2: AI Integration (Hours 3-6)
- Integrate LLM for document analysis
- Create evaluation agents
- Implement scoring algorithms
- Build feedback generation

### Phase 3: Real-Time Features (Hours 6-9)
- Implement real-time scoring updates
- Create live leaderboard
- Build progress tracking graphs
- Add WebSocket for live updates

### Phase 4: User Interface (Hours 9-11)
- Create team submission portal
- Build dashboard
- Generate QR codes for easy access
- Implement feedback display

### Phase 5: Testing & Deployment (Hour 11-12)
- End-to-end testing
- Deploy to cloud
- Generate team access codes
- Final verification

## Success Metrics
- Successfully process multiple document formats
- Generate scores within 30 seconds of submission
- Provide actionable feedback for each submission
- Track score evolution throughout the hackathon
- Handle concurrent submissions from multiple teams

## Deployment Requirements
- Cloud hosting with auto-scaling
- Document storage system
- Real-time database
- AI/LLM API access
- WebSocket support for live updates

## Security Considerations
- Team authentication via unique codes
- Secure document storage
- Rate limiting on submissions
- Data privacy compliance
- Audit logging for all evaluations

## Port Configuration
- Application Server: 7328
- WebSocket Server: 7329
- Document Processing Service: 7330