// MongoDB Models for HackRadar

export interface Project {
  _id?: string;
  teamName: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'submitted' | 'evaluated';
  lastAssessment?: Assessment;
}

export interface TimelineEntry {
  _id?: string;
  projectId: string;
  type: 'text' | 'file' | 'image' | 'link';
  content: string; // Text content or file URL
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  description?: string;
  createdAt: Date;
  anthropic_conversation_id?: string; // Store Anthropic conversation ID for continuity
  evaluation?: {
    scores: {
      clarity: number;
      problem_value: number;
      feasibility_signal: number;
      originality: number;
      impact_convert: number;
      final_score: number;
    };
    evidence: string[];
    gaps: string[];
    raw_ai_response?: string;
    evaluated_at: Date;
  };
}

export interface Assessment {
  _id?: string;
  projectId: string;
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  criteria: {
    innovation: number;
    feasibility: number;
    impact: number;
    presentation: number;
    progress: number;
  };
  assessedAt: Date;
  entriesAssessed: number; // Number of timeline entries included in this assessment
}

export interface User {
  email: string;
  name: string;
  picture: string;
}