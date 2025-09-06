import { BaseAgent } from './BaseAgent';

export interface TextEvaluatorInput {
  text: string;
  mode?: 'initial' | 'update';
  previousSummary?: string;
}

export interface TextEvaluatorResult {
  subscores: {
    clarity: number;
    problem_value: number;
    feasibility_signal: number;
    originality: number;
    impact_convert: number;
  };
  evidence: string[];
  gaps: string[];
  delta: {
    changed: boolean;
    improvements?: string[];
    regressions?: string[];
  };
}

export class TextEvaluator extends BaseAgent {
  constructor() {
    super('TextEvaluator');
  }

  protected async mockEvaluate(input: TextEvaluatorInput): Promise<TextEvaluatorResult> {
    const { text, mode = 'initial', previousSummary } = input;
    
    if (!text) {
      return {
        subscores: {
          clarity: 0,
          problem_value: 0,
          feasibility_signal: 0,
          originality: 0,
          impact_convert: 0
        },
        evidence: [],
        gaps: ['No text provided'],
        delta: { changed: false }
      };
    }
    
    // Analyze text characteristics
    const wordCount = text.split(/\s+/).length;
    const hasHook = text.length > 0 && text.split('.')[0].length < 100;
    const hasCTA = /\b(try|start|join|sign up|get started|learn more|contact|demo)\b/i.test(text);
    const hasNumbers = /\d+/.test(text);
    const hasJargon = /\b(synergy|leverage|paradigm|blockchain|web3|AI|ML|DeFi)\b/i.test(text);
    const hasProblem = /\b(problem|issue|challenge|pain|struggle)\b/i.test(text);
    const hasSolution = /\b(solution|solve|fix|address|improve)\b/i.test(text);
    const hasMetrics = /\d+\s*%|\$\d+|\d+x/i.test(text);
    
    // Calculate scores based on text analysis
    const clarity = Math.min(15, 
      (hasHook ? 5 : 2) + 
      (wordCount < 200 ? 5 : wordCount < 400 ? 3 : 1) + 
      (!hasJargon ? 3 : 1) +
      2
    );
    
    const problem_value = Math.min(20,
      (hasProblem ? 5 : 2) +
      (hasSolution ? 5 : 2) +
      (hasNumbers ? 3 : 1) +
      (hasMetrics ? 4 : 1) +
      3
    );
    
    const feasibility_signal = Math.min(10,
      (text.toLowerCase().includes('built') ? 3 : 1) +
      (text.toLowerCase().includes('working') ? 3 : 1) +
      (text.toLowerCase().includes('demo') ? 2 : 0) +
      2
    );
    
    const originality = Math.min(15,
      (text.toLowerCase().includes('first') || text.toLowerCase().includes('unique') ? 5 : 2) +
      (text.toLowerCase().includes('different') ? 3 : 1) +
      (text.toLowerCase().includes('novel') || text.toLowerCase().includes('innovative') ? 3 : 1) +
      4
    );
    
    const impact_convert = Math.min(20,
      (hasCTA ? 8 : 2) +
      (text.toLowerCase().includes('impact') ? 4 : 1) +
      (text.toLowerCase().includes('users') || text.toLowerCase().includes('customers') ? 4 : 1) +
      (hasMetrics ? 3 : 1) +
      1
    );
    
    // Generate evidence and gaps
    const evidence = [];
    const gaps = [];
    
    if (hasHook) evidence.push('Strong opening hook');
    if (hasCTA) evidence.push('Clear call-to-action present');
    if (hasNumbers) evidence.push('Quantified metrics included');
    if (hasMetrics) evidence.push('Specific metrics provided');
    if (hasProblem && hasSolution) evidence.push('Clear problem-solution fit');
    
    if (!hasHook) gaps.push('Missing compelling hook');
    if (!hasCTA) gaps.push('No clear call-to-action');
    if (hasJargon) gaps.push('Too much technical jargon');
    if (wordCount > 400) gaps.push('Text too verbose');
    if (!hasMetrics) gaps.push('Missing quantified metrics');
    
    // Calculate delta if update mode
    const delta = { changed: false, improvements: [], regressions: [] };
    if (mode === 'update' && previousSummary) {
      delta.changed = true;
      
      if (hasCTA && !previousSummary.includes('CTA')) {
        delta.improvements?.push('Added call-to-action');
      }
      if (wordCount < 200 && previousSummary.includes('verbose')) {
        delta.improvements?.push('Improved conciseness');
      }
      if (hasMetrics && !previousSummary.includes('metric')) {
        delta.improvements?.push('Added quantified metrics');
      }
    }
    
    this.log(`Text evaluation complete: Clarity=${clarity}, Value=${problem_value}`);
    
    return {
      subscores: {
        clarity,
        problem_value,
        feasibility_signal,
        originality,
        impact_convert
      },
      evidence,
      gaps,
      delta
    };
  }

  protected buildPrompt(input: TextEvaluatorInput): string {
    return `Evaluate this hackathon pitch text and provide scores (strict maximums):
- Clarity (max 15): 12-year-old test, hook, conciseness, no jargon
- Problem & Value (max 20): acute pain, quantified value
- Feasibility Signal (max 10): evidence of working solution
- Originality (max 15): novel approach or unique constraint
- Impact & Convert (max 20): strong CTA, conversion potential

Text: "${input.text}"

Return JSON with subscores, evidence array, and gaps array.`;
  }

  protected parseResponse(response: string): TextEvaluatorResult {
    try {
      const parsed = JSON.parse(response);
      return parsed;
    } catch {
      // Fallback to mock if parsing fails
      return this.mockEvaluate({ text: '' });
    }
  }
}