export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  token: string;
}

export interface Submission {
  id: string;
  userId: string;
  teamName: string;
  files: UploadedFile[];
  submittedAt: Date;
  status: 'pending' | 'analyzing' | 'completed';
  evaluation?: Evaluation;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

export interface Evaluation {
  id: string;
  submissionId: string;
  overallScore: number;
  criteria: EvaluationCriteria[];
  feedback: string;
  strengths: string[];
  improvements: string[];
  evaluatedAt: Date;
}

export interface EvaluationCriteria {
  name: string;
  score: number;
  maxScore: number;
  feedback: string;
  category: 'technical' | 'business' | 'presentation' | 'innovation';
}

export interface LeaderboardEntry {
  rank: number;
  teamName: string;
  score: number;
  submissions: number;
  lastUpdate: Date;
  trend: 'up' | 'down' | 'stable';
}