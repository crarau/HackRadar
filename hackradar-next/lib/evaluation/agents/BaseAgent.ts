import Anthropic from '@anthropic-ai/sdk';
import { getDebugLogger } from '../DebugLogger';

export interface EvaluationScores {
  clarity: number;
  problem_value: number;
  feasibility: number;
  originality: number;
  impact_convert: number;
  submission_readiness: number;
  final_score: number;
}

export class BaseAgent {
  protected name: string;
  protected anthropic: Anthropic;

  constructor(name: string) {
    this.name = name;
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(`[${this.name}] ANTHROPIC_API_KEY is required`);
    }
    
    this.anthropic = new Anthropic({ apiKey });
  }

  protected log(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_ANTHROPIC === 'true') {
      console.log(`[${this.name}] ${message}`);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  protected async callAnthropic(prompt: string): Promise<string> {
    const logger = getDebugLogger();
    
    try {
      // Log the prompt being sent
      logger.logPrompt(this.name, prompt);
      
      const startTime = Date.now();
      
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307', // Fast and cheap for evaluations
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const duration = Date.now() - startTime;
      
      const content = response.content[0];
      if (content.type === 'text') {
        // Log the response received
        logger.logResponse(this.name, content.text, duration);
        return content.text;
      }
      
      throw new Error('Invalid response from Anthropic');
    } catch (error) {
      logger.log(`❌ [${this.name}] ANTHROPIC API ERROR: ${error}`);
      throw error;
    }
  }

  protected parseJSON<T>(response: string, fallback: T): T {
    try {
      const parsed = JSON.parse(response) as T;
      console.log(`✅ [${this.name}] Successfully parsed JSON response`);
      return parsed;
    } catch (error) {
      console.error(`⚠️ [${this.name}] Failed to parse JSON response:`, error);
      console.log('Using fallback:', fallback);
      return fallback;
    }
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
    
    const result: EvaluationScores = {
      clarity: 0,
      problem_value: 0,
      feasibility: 0,
      originality: 0,
      impact_convert: 0,
      submission_readiness: 0,
      final_score: 0
    };
    
    // Apply anchors and clamp values
    for (const [key, max] of Object.entries(anchors)) {
      const value = scores[key as keyof typeof scores] || 0;
      result[key as keyof typeof anchors] = Math.min(Math.max(0, value), max);
    }
    
    // Calculate total
    result.final_score = 
      result.clarity + 
      result.problem_value + 
      result.feasibility + 
      result.originality + 
      result.impact_convert + 
      result.submission_readiness;
    
    return result;
  }
}