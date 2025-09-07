import Anthropic from '@anthropic-ai/sdk';
import { getDebugLogger } from '../DebugLogger';

export interface MessageHistory {
  role: 'user' | 'assistant';
  content: string;
}

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

  protected async callAnthropic(
    prompt: string, 
    messageHistory: MessageHistory[] = [],
    conversationId?: string
  ): Promise<{ response: string; conversationId: string }> {
    const logger = getDebugLogger();
    
    try {
      // Build messages array with history
      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...messageHistory,
        { role: 'user', content: prompt }
      ];
      
      // Log the conversation context
      if (conversationId) {
        logger.log(`🔗 [${this.name}] Continuing conversation: ${conversationId}`);
      }
      if (messageHistory.length > 0) {
        logger.log(`📚 [${this.name}] Using conversation history with ${messageHistory.length} previous messages`);
      }
      logger.logPrompt(this.name, prompt, messageHistory);
      
      const startTime = Date.now();
      
      // Build request parameters - Anthropic doesn't support conversation_id in metadata
      const requestParams: any = {
        model: 'claude-3-5-sonnet-20240620', // Better reasoning for cumulative evaluation
        max_tokens: 1000,
        messages
      };
      
      const response = await this.anthropic.messages.create(requestParams);

      const duration = Date.now() - startTime;
      
      const content = response.content[0];
      if (content.type === 'text') {
        // Use the response ID as conversation ID for continuity
        const returnedConversationId = response.id;
        
        logger.log(`🆔 [${this.name}] Conversation ID: ${returnedConversationId}`);
        logger.logResponse(this.name, content.text, duration);
        
        return {
          response: content.text,
          conversationId: returnedConversationId
        };
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
    
    // Apply anchors and clamp values - NO FALLBACKS!
    for (const [key, max] of Object.entries(anchors)) {
      const value = scores[key as keyof typeof scores];
      if (value === undefined || value === null) {
        throw new Error(`Missing required score: ${key}`);
      }
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