import { BaseAgent } from './BaseAgent';

export interface ChecklistItem {
  asserted: boolean;
  verified: boolean;
  files?: string[];
  url?: string;
  evidence?: string;
  notes?: string;
  count?: number;
  last_checked_at?: Date;
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
    files?: Array<{ name: string; type: string; size: number }>;
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
  private readonly pointsMap = {
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

  async evaluate(input: SRTrackerInput): Promise<SRTrackerResult> {
    const { userMessage, currentSnapshot, progressState } = input;
    const checklist = progressState?.submission_readiness_checklist || this.getEmptyChecklist();
    const questions: string[] = [];
    const notes: string[] = [];

    // Analyze files if present
    if (currentSnapshot?.files) {
      this.analyzeFiles(currentSnapshot.files, checklist, notes);
    }

    // Analyze text content if present
    if (currentSnapshot?.text) {
      this.analyzeText(currentSnapshot.text, currentSnapshot.url, checklist, notes);
    }

    // Process user message if present
    if (userMessage) {
      this.processUserMessage(userMessage, checklist, notes);
    }

    // Generate questions for missing items
    const missingItems = this.getMissingItems(checklist);
    questions.push(...this.generateQuestions(missingItems));

    // Calculate readiness score
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

  private analyzeFiles(
    files: Array<{ name: string; type: string; size: number }>,
    checklist: ReadinessChecklist,
    notes: string[]
  ): void {
    for (const file of files) {
      const fileName = file.name.toLowerCase();
      
      // Check for demo video
      if (this.isVideoFile(fileName)) {
        checklist.demo_video.verified = true;
        checklist.demo_video.files = [file.name];
        checklist.demo_video.evidence = `Found demo video: ${file.name}`;
        checklist.demo_video.last_checked_at = new Date();
        notes.push(`Demo video verified: ${file.name}`);
      }
      
      // Check for presentation
      if (this.isPresentationFile(fileName)) {
        checklist.slides_pdf.verified = true;
        checklist.slides_pdf.files = [file.name];
        checklist.slides_pdf.evidence = `Found presentation: ${file.name}`;
        checklist.slides_pdf.last_checked_at = new Date();
        notes.push(`Slides verified: ${file.name}`);
      }
      
      // Check for screenshots
      if (this.isScreenshot(fileName)) {
        if (!checklist.screenshots.files) checklist.screenshots.files = [];
        if (!checklist.screenshots.files.includes(file.name)) {
          checklist.screenshots.files.push(file.name);
        }
        checklist.screenshots.count = checklist.screenshots.files.length;
        checklist.screenshots.verified = checklist.screenshots.count >= 3;
        checklist.screenshots.evidence = `Found ${checklist.screenshots.count} screenshots`;
        checklist.screenshots.last_checked_at = new Date();
      }
    }
  }

  private analyzeText(
    text: string,
    url: string | undefined,
    checklist: ReadinessChecklist,
    notes: string[]
  ): void {
    const lowerText = text.toLowerCase();
    
    // Check for repository
    const repoMatch = lowerText.match(/(github|gitlab|bitbucket)\.(com|org)\/[\w-]+\/[\w-]+/);
    if (repoMatch) {
      checklist.repo.verified = true;
      checklist.repo.url = repoMatch[0];
      checklist.repo.evidence = 'Repository link found';
      checklist.repo.last_checked_at = new Date();
      notes.push(`Repo verified: ${repoMatch[0]}`);
    }
    
    // Check for demo link
    if (url && (lowerText.includes('demo') || lowerText.includes('try'))) {
      checklist.demo_link.verified = true;
      checklist.demo_link.url = url;
      checklist.demo_link.evidence = 'Demo link provided';
      notes.push('Demo link verified');
    }
    
    // Check for README/setup mentions
    if (lowerText.includes('readme') || lowerText.includes('setup') || lowerText.includes('installation')) {
      checklist.readme_run_steps.asserted = true;
      checklist.readme_run_steps.evidence = 'Setup instructions mentioned';
    }
    
    // Check if built during hackathon
    if ((lowerText.includes('built') || lowerText.includes('created')) && 
        (lowerText.includes('hackathon') || lowerText.includes('48 hours'))) {
      checklist.built_during_hack.verified = true;
      checklist.built_during_hack.notes = 'Confirmed built during hackathon';
    }
    
    // Check for limitations/next steps
    if (lowerText.includes('limitation') || lowerText.includes('next step') || lowerText.includes('future')) {
      checklist.known_limits_next_steps.asserted = true;
      checklist.known_limits_next_steps.notes = 'Limitations/next steps mentioned';
    }
  }

  private processUserMessage(
    message: string,
    checklist: ReadinessChecklist,
    notes: string[]
  ): void {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('yes') || lowerMsg.includes('have it')) {
      // Mark first unverified item as asserted
      const items = Object.keys(this.pointsMap) as Array<keyof ReadinessChecklist>;
      for (const item of items) {
        if (!checklist[item].asserted && !checklist[item].verified) {
          checklist[item].asserted = true;
          checklist[item].evidence = 'User confirmed';
          notes.push(`${item} marked as asserted`);
          break;
        }
      }
    }
  }

  private getMissingItems(checklist: ReadinessChecklist): string[] {
    const missing: string[] = [];
    const items = Object.keys(this.pointsMap) as Array<keyof ReadinessChecklist>;
    
    for (const item of items) {
      if (!checklist[item].verified && !checklist[item].asserted) {
        missing.push(item);
      }
    }
    
    return missing;
  }

  private generateQuestions(missingItems: string[]): string[] {
    const questionMap: Record<string, string> = {
      demo_link: 'Do you have a live demo URL?',
      demo_video: 'Do you have a demo video (2-3 minutes)?',
      repo: 'Is your code on GitHub/GitLab?',
      readme_run_steps: 'Does your README include setup instructions?',
      slides_pdf: 'Do you have presentation slides?',
      screenshots: 'Do you have 3-5 screenshots?',
      built_during_hack: 'Was this built during the hackathon?',
      known_limits_next_steps: 'Have you documented limitations and next steps?'
    };
    
    return missingItems
      .slice(0, 3) // Ask about 3 items at most
      .map(item => questionMap[item])
      .filter(Boolean);
  }

  private calculateReadinessScore(checklist: ReadinessChecklist): number {
    let score = 0;
    const items = Object.keys(this.pointsMap) as Array<keyof ReadinessChecklist>;
    
    for (const item of items) {
      const points = this.pointsMap[item];
      const checklistItem = checklist[item];
      
      if (checklistItem.verified) {
        score += points; // Full points for verified
      } else if (checklistItem.asserted) {
        score += points * 0.5; // Half points for asserted
      }
    }
    
    return Math.min(15, Math.round(score));
  }

  private getEmptyChecklist(): ReadinessChecklist {
    const items = Object.keys(this.pointsMap) as Array<keyof ReadinessChecklist>;
    const checklist = {} as ReadinessChecklist;
    
    for (const item of items) {
      checklist[item] = {
        asserted: false,
        verified: false
      };
    }
    
    return checklist;
  }

  private isVideoFile(fileName: string): boolean {
    return fileName.includes('demo') && 
           /\.(mp4|mov|webm|avi)$/i.test(fileName);
  }

  private isPresentationFile(fileName: string): boolean {
    return /\.(pdf|pptx?|key)$/i.test(fileName);
  }

  private isScreenshot(fileName: string): boolean {
    return (fileName.includes('screenshot') || fileName.includes('screen')) ||
           (/\.(png|jpg|jpeg)$/i.test(fileName) && 
            (fileName.includes('ui') || fileName.includes('app')));
  }
}