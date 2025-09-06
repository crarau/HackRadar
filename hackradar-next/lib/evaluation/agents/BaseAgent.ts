import Anthropic from '@anthropic-ai/sdk';

export interface EvaluationScores {
  clarity: number;
  problem_value: number;
  feasibility: number;
  originality: number;
  impact_convert: number;
  submission_readiness: number;
  final_score: number;
}

export interface EvaluationResult {
  scores: EvaluationScores;
  feedback: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  evidence?: string[];
  gaps?: string[];
}

export abstract class BaseAgent {
  protected name: string;
  protected useMock: boolean;
  protected anthropic?: Anthropic;

  constructor(name: string) {
    this.name = name;
    this.useMock = process.env.USE_MOCK_EVALUATIONS === 'true' || !process.env.ANTHROPIC_API_KEY;
    
    if (!this.useMock && process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }
  }

  protected log(message: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.name}] ${message}`);
    }
  }

  async evaluate<TInput, TResult>(input: TInput): Promise<TResult> {
    this.log(`Starting evaluation with ${this.useMock ? 'MOCK' : 'REAL'} mode`);
    
    if (this.useMock) {
      return await this.mockEvaluate(input);
    }
    
    try {
      return await this.realEvaluate(input);
    } catch (error) {
      this.log(`Error in real evaluation: ${error.message}, falling back to mock`);
      return await this.mockEvaluate(input);
    }
  }

  protected abstract mockEvaluate<TInput, TResult>(input: TInput): Promise<TResult>;
  
  protected async realEvaluate<TInput, TResult>(input: TInput): Promise<TResult> {
    // Default implementation using Anthropic Claude 3.5
    if (!this.anthropic) {
      return this.mockEvaluate(input);
    }

    try {
      const prompt = this.buildPrompt(input);
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return this.parseResponse(content.text);
      }
      
      return this.mockEvaluate(input);
    } catch (error) {
      this.log(`Anthropic API error: ${error}`);
      return this.mockEvaluate(input);
    }
  }

  protected abstract buildPrompt<TInput>(input: TInput): string;
  protected abstract parseResponse<TResult>(response: string): TResult;

  protected generateMockScore(base: number, variance: number = 5): number {
    const min = Math.max(0, base - variance);
    const max = Math.min(100, base + variance);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  protected enforceAnchors(scores: Partial<EvaluationScores>): EvaluationScores {
    const anchors = {
      clarity: 15,
      problem_value: 20,
      feasibility: 15,
      originality: 15,
      impact_convert: 20,
      submission_readiness: 15
    };
    
    const enforced: Record<string, number> = {};
    for (const [key, max] of Object.entries(anchors)) {
      const value = (scores as Record<string, number>)[key] || 0;
      enforced[key] = Math.min(Math.max(0, value), max);
    }
    
    enforced.final_score = Object.values(enforced).reduce((a: number, b: number) => a + b, 0);
    return enforced as EvaluationScores;
  }
}