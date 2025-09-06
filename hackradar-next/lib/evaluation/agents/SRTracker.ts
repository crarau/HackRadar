import { BaseAgent } from './BaseAgent';

export interface ChecklistItem {
  asserted: boolean;
  verified: boolean;
  evidence?: string;
  url?: string;
  files?: string[];
  last_checked_at?: Date;
  notes?: string;
  count?: number;
}

export interface ReadinessChecklist {
  demo_link: ChecklistItem;
  demo_video: ChecklistItem;
  repo: ChecklistItem;
  readme_run_steps: ChecklistItem;
  slides_pdf: ChecklistItem;
  screenshots: ChecklistItem;
  built_during_hack: ChecklistItem;
  known_limits_next_steps: ChecklistItem;
}

export interface SRTrackerInput {
  userMessage?: string;
  currentSnapshot?: {
    text?: string;
    files?: Array<{
      name: string;
      type: string;
      size: number;
    }>;
    url?: string;
  };
  progressState?: {
    submission_readiness_checklist?: ReadinessChecklist;
  };
}

export interface SRTrackerResult {
  checklist_update: ReadinessChecklist;
  submission_readiness_score: number;
  questions: string[];
  notes: string[];
}

export class SRTracker extends BaseAgent {
  private pointsMap = {
    demo_link: 2,
    demo_video: 2,
    repo: 2,
    readme_run_steps: 3,
    slides_pdf: 2,
    screenshots: 2,
    built_during_hack: 1,
    known_limits_next_steps: 1
  };

  constructor() {
    super('SRTracker');
  }

  private calculateReadinessScore(checklist: ReadinessChecklist): number {
    let score = 0;
    
    for (const [item, points] of Object.entries(this.pointsMap)) {
      const status = (checklist as Record<string, ChecklistItem>)[item];
      if (!status) continue;
      
      if (status.verified) {
        // Full points for verified items
        score += points;
      } else if (status.asserted) {
        // Half points for asserted but not verified
        score += points / 2;
      }
    }
    
    return Math.min(15, score);
  }

  protected async mockEvaluate(input: SRTrackerInput): Promise<SRTrackerResult> {
    const { userMessage, currentSnapshot, progressState } = input;
    const checklist = progressState?.submission_readiness_checklist || this.getEmptyChecklist();
    const questions: string[] = [];
    const notes: string[] = [];
    
    // Check files in current snapshot
    if (currentSnapshot?.files) {
      for (const file of currentSnapshot.files) {
        const fileName = file.name.toLowerCase();
        
        // Check for demo video
        if (fileName.includes('demo') && (fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.webm'))) {
          checklist.demo_video.verified = true;
          checklist.demo_video.files = [file.name];
          checklist.demo_video.evidence = `Found demo video: ${file.name}`;
          checklist.demo_video.last_checked_at = new Date();
          notes.push(`Demo video verified: ${file.name}`);
        }
        
        // Check for slides/PDF
        if (fileName.endsWith('.pdf') || fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) {
          checklist.slides_pdf.verified = true;
          checklist.slides_pdf.files = [file.name];
          checklist.slides_pdf.evidence = `Found presentation: ${file.name}`;
          checklist.slides_pdf.last_checked_at = new Date();
          notes.push(`Slides verified: ${file.name}`);
        }
        
        // Check for screenshots
        if (fileName.includes('screenshot') || fileName.includes('screen') || 
            (fileName.match(/\.(png|jpg|jpeg)$/i) && (fileName.includes('ui') || fileName.includes('app')))) {
          if (!checklist.screenshots.files) checklist.screenshots.files = [];
          if (!checklist.screenshots.files.includes(file.name)) {
            checklist.screenshots.files.push(file.name);
          }
          checklist.screenshots.count = checklist.screenshots.files.length;
          checklist.screenshots.verified = true;
          checklist.screenshots.evidence = `Found ${checklist.screenshots.count} screenshots`;
          checklist.screenshots.last_checked_at = new Date();
        }
      }
    }
    
    // Check text content for links and evidence
    if (currentSnapshot?.text) {
      const text = currentSnapshot.text.toLowerCase();
      
      // Check for repo link
      if (text.includes('github.com/') || text.includes('gitlab.com/') || text.includes('bitbucket.org/')) {
        const repoMatch = text.match(/(github|gitlab|bitbucket)\.(com|org)\/[\w-]+\/[\w-]+/);
        if (repoMatch) {
          checklist.repo.verified = true;
          checklist.repo.url = repoMatch[0];
          checklist.repo.evidence = `Repository link found`;
          checklist.repo.last_checked_at = new Date();
          notes.push(`Repo verified: ${repoMatch[0]}`);
        }
      }
      
      // Check for demo link
      if ((text.includes('demo') || text.includes('try')) && 
          (text.includes('http://') || text.includes('https://') || text.includes('.com') || text.includes('.io'))) {
        checklist.demo_link.asserted = true;
        checklist.demo_link.evidence = 'Demo link mentioned in text';
        if (currentSnapshot.url) {
          checklist.demo_link.url = currentSnapshot.url;
          checklist.demo_link.verified = true;
          notes.push('Demo link verified');
        } else {
          notes.push('Demo link asserted (needs verification)');
        }
      }
      
      // Check for README mentions
      if (text.includes('readme') || text.includes('installation') || text.includes('setup') || text.includes('instructions')) {
        checklist.readme_run_steps.asserted = true;
        checklist.readme_run_steps.evidence = 'Setup instructions mentioned';
      }
      
      // Check if built during hackathon
      if ((text.includes('built') || text.includes('created') || text.includes('developed')) && 
          (text.includes('weekend') || text.includes('hackathon') || text.includes('48 hours') || text.includes('24 hours'))) {
        checklist.built_during_hack.verified = true;
        checklist.built_during_hack.notes = 'Confirmed built during hackathon';
      }
      
      // Check for limitations/next steps
      if (text.includes('limitation') || text.includes('next step') || text.includes('future') || text.includes('roadmap')) {
        checklist.known_limits_next_steps.asserted = true;
        checklist.known_limits_next_steps.notes = 'Limitations/next steps mentioned';
      }
    }
    
    // Process user message responses
    if (userMessage) {
      const msg = userMessage.toLowerCase();
      
      // User affirming they have something
      if (msg.includes('yes') || msg.includes('have it') || msg.includes('we have') || msg.includes('already')) {
        // Check what we asked about last and mark as asserted
        for (const item of Object.keys(this.pointsMap)) {
          const checklistItem = (checklist as Record<string, ChecklistItem>)[item];
          if (!checklistItem.asserted && !checklistItem.verified) {
            checklistItem.asserted = true;
            checklistItem.evidence = 'User confirmed having this';
            notes.push(`${item} marked as asserted based on user response`);
            break;
          }
        }
      }
    }
    
    // Generate questions for missing items (max 1 question)
    const missingItems: string[] = [];
    for (const [item, status] of Object.entries(checklist)) {
      if (!status.asserted && !status.verified) {
        missingItems.push(item);
      }
    }
    
    if (missingItems.length > 0 && questions.length === 0) {
      const item = missingItems[0];
      const questionMap: Record<string, string> = {
        demo_video: 'Do you already have a ≤2-min demo video?',
        demo_link: 'Do you have a working demo link?',
        repo: 'Do you have a GitHub/GitLab repository?',
        readme_run_steps: 'Does your README include setup/run instructions?',
        slides_pdf: 'Do you have presentation slides (≤7 pages)?',
        screenshots: 'Do you have 3-5 screenshots of your app?',
        built_during_hack: 'Was this built during the hackathon?',
        known_limits_next_steps: 'Have you documented limitations and next steps?'
      };
      
      if (questionMap[item]) {
        questions.push(questionMap[item]);
      }
    }
    
    // Calculate final readiness score
    const submissionReadinessScore = this.calculateReadinessScore(checklist);
    
    this.log(`Readiness score: ${submissionReadinessScore}/15`);
    this.log(`Missing items: ${missingItems.join(', ') || 'None'}`);
    
    return {
      checklist_update: checklist,
      submission_readiness_score: submissionReadinessScore,
      questions,
      notes
    };
  }

  private getEmptyChecklist(): ReadinessChecklist {
    const checklist: Record<string, ChecklistItem> = {};
    for (const item of Object.keys(this.pointsMap)) {
      checklist[item] = {
        asserted: false,
        verified: false,
        evidence: undefined,
        last_checked_at: undefined
      };
    }
    return checklist as ReadinessChecklist;
  }

  protected buildPrompt(_input: SRTrackerInput): string {
    return `Check submission readiness for hackathon. Return JSON with checklist status.`;
  }

  protected parseResponse(response: string): SRTrackerResult {
    try {
      return JSON.parse(response);
    } catch {
      return this.mockEvaluate({});
    }
  }
}