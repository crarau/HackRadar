import { BaseAgent, MessageHistory } from './BaseAgent';

export interface TextEvaluatorInput {
  text: string;
  mode?: 'initial' | 'update';
  previousSummary?: string;
  messageHistory?: MessageHistory[];
  isUpdate?: boolean;
  conversationId?: string;
  previousScores?: {
    clarity: number;
    problem_value: number;
    feasibility_signal: number;
    originality: number;
    impact_convert: number;
    final_score: number;
  };
}

export interface TextEvaluatorResult {
  subscores: {
    clarity?: number;
    problem_value?: number;
    feasibility_signal?: number;
    originality?: number;
    impact_convert?: number;
    final_score?: number;
  };
  evidence?: string[];
  gaps?: string[];
  raw_response?: string; // Store the raw AI response
  conversationId?: string; // Store the conversation ID for next call
  delta?: {
    changed: boolean;
    improvements?: string[];
  };
}

export class TextEvaluator extends BaseAgent {
  constructor() {
    super('TextEvaluator');
  }

  async evaluate(input: TextEvaluatorInput): Promise<TextEvaluatorResult> {
    const { text, mode = 'initial', messageHistory = [], isUpdate = false, conversationId, previousScores } = input;
    
    console.log('\n📝 [TextEvaluator] Starting evaluation...');
    console.log(`Mode: ${mode}`);
    console.log(`Text length: ${text?.length || 0} characters`);
    if (text && text.length < 500) {
      console.log(`Text preview: "${text}"`);
    } else if (text) {
      console.log(`Text preview: "${text.substring(0, 200)}..."`);
    }
    
    if (!text || text.trim().length < 10) {
      console.log('⚠️ Text too short, returning minimum scores');
      return {
        subscores: {
          clarity: 0,
          problem_value: 0,
          feasibility_signal: 0,
          originality: 0,
          impact_convert: 0
        },
        evidence: [],
        gaps: ['No meaningful text provided'],
        raw_response: 'Text too short for evaluation'
      };
    }

    let prompt: string;
    
    if (isUpdate && messageHistory.length > 0) {
      // For updates, emphasize ADDITIVE/CUMULATIVE evaluation with explicit score minimums
      const prevScoresText = previousScores ? `
📊 PREVIOUS SCORES (ABSOLUTE MINIMUMS):
- Clarity: ${previousScores.clarity}/15 (NEW SCORE MUST BE >= ${previousScores.clarity})
- Problem Value: ${previousScores.problem_value}/20 (NEW SCORE MUST BE >= ${previousScores.problem_value})
- Feasibility: ${previousScores.feasibility_signal}/15 (NEW SCORE MUST BE >= ${previousScores.feasibility_signal})
- Originality: ${previousScores.originality}/15 (NEW SCORE MUST BE >= ${previousScores.originality})
- Impact: ${previousScores.impact_convert}/20 (NEW SCORE MUST BE >= ${previousScores.impact_convert})
- Previous Total: ${previousScores.final_score}/100` : '';

      prompt = `This is an UPDATE to an ongoing hackathon project evaluation.

NEW UPDATE:
${text}
${prevScoresText}

🚨 MANDATORY CUMULATIVE SCORING RULES:
1. You have FULL ACCESS to conversation history above
2. This update ADDS to existing project achievements
3. SCORES CANNOT GO BELOW the previous values shown above
4. Each category score MUST be >= the previous score for that category
5. Only decrease if this update explicitly mentions failures/problems
6. Positive updates (users, features, customers) should INCREASE scores

SCORING ENFORCEMENT:
- Take the MAXIMUM of (previous score, new evidence level) for each category
- If previous clarity was 14/15, new clarity must be 14 or 15 (never lower)
- If previous feasibility was 9/10, new feasibility must be 9 or 10 (never lower)
- Brief updates maintain previous achievements while adding new value

Provide scores that respect the MINIMUM thresholds above:

{
  "subscores": {
    "clarity": <${previousScores ? `${previousScores.clarity}` : '0'}-15, must be >= ${previousScores ? previousScores.clarity : '0'}>,
    "problem_value": <${previousScores ? `${previousScores.problem_value}` : '0'}-20, must be >= ${previousScores ? previousScores.problem_value : '0'}>,
    "feasibility_signal": <${previousScores ? `${previousScores.feasibility_signal}` : '0'}-15, must be >= ${previousScores ? previousScores.feasibility_signal : '0'}>,
    "originality": <${previousScores ? `${previousScores.originality}` : '0'}-15, must be >= ${previousScores ? previousScores.originality : '0'}>,
    "impact_convert": <${previousScores ? `${previousScores.impact_convert}` : '0'}-20, must be >= ${previousScores ? previousScores.impact_convert : '0'}>
  },
  "evidence": [<ALL evidence from complete project history>],
  "gaps": [<remaining gaps despite all progress>]
}

⚠️ CRITICAL: Your scores will be rejected if any category is below its previous value!`;
    } else {
      // For initial submission, use original prompt
      prompt = `Evaluate this hackathon pitch and provide scores with strict maximums.
    
Text to evaluate:
${text}

Mode: ${mode}

Provide a JSON response with this exact structure:
{
  "subscores": {
    "clarity": <0-15, based on 12-year-old test, hook quality, conciseness>,
    "problem_value": <0-20, based on acute pain points and quantified value>,
    "feasibility_signal": <0-15, evidence of working solution>,
    "originality": <0-15, innovation and differentiation>,
    "impact_convert": <0-20, call-to-action strength and conversion potential>
  },
  "evidence": [<list of strengths found in the text>],
  "gaps": [<list of missing elements or improvements needed>]
}

Rules:
- Clarity max 15: Clear hook, no jargon, concise message
- Problem Value max 20: Identifies real pain, quantifies impact
- Feasibility max 15: Shows working solution or strong evidence
- Originality max 15: Novel approach or unique angle
- Impact/Convert max 20: Strong CTA, clear next steps, conversion focus

Be strict with scoring. Most pitches should score 40-60 total.`;
    }

    try {
      console.log(`🔗 [TextEvaluator] Using conversation ID: ${conversationId || 'new conversation'}`);
      const { response, conversationId: newConversationId } = await this.callAnthropic(prompt, messageHistory, conversationId);
      
      console.log('\n📜 [TextEvaluator] Raw AI Response:');
      console.log(response);
      
      let result: TextEvaluatorResult;
      try {
        // First, try to clean the response to ensure it's valid JSON
        let cleanResponse = response.trim();
        
        // Remove any markdown code blocks if present
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/```[a-z]*\s*/, '').replace(/```\s*$/, '');
        }
        
        console.log('📊 [TextEvaluator] Cleaned response for parsing:', cleanResponse);
        
        const parsed = JSON.parse(cleanResponse);
        console.log('📊 [TextEvaluator] Parsed JSON:', JSON.stringify(parsed, null, 2));
        
        // More robust extraction with validation - NO FALLBACKS!
        if (!parsed.subscores) {
          throw new Error('AI response missing subscores object');
        }
        
        const subscores = parsed.subscores;
        
        // Validate all required scores exist
        const requiredScores = ['clarity', 'problem_value', 'feasibility_signal', 'originality', 'impact_convert'];
        for (const scoreKey of requiredScores) {
          if (subscores[scoreKey] === undefined || subscores[scoreKey] === null) {
            throw new Error(`AI response missing required score: ${scoreKey}`);
          }
        }
        
        result = {
          subscores: {
            clarity: Number(subscores.clarity),
            problem_value: Number(subscores.problem_value),
            feasibility_signal: Number(subscores.feasibility_signal),
            originality: Number(subscores.originality),
            impact_convert: Number(subscores.impact_convert)
          },
          evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
          gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
          raw_response: response, // Store the original AI response
          conversationId: newConversationId // Store the conversation ID for next call
        };
        
        // Calculate final_score ourselves for accuracy (values already validated above)
        result.subscores.final_score = 
          result.subscores.clarity! + 
          result.subscores.problem_value! + 
          result.subscores.feasibility_signal! + 
          result.subscores.originality! + 
          result.subscores.impact_convert!;
        
        // Log the final extracted values
        console.log('✅ [TextEvaluator] Successfully extracted scores:', result.subscores);
        console.log('✅ [TextEvaluator] Evidence items:', result.evidence?.length || 0);
        console.log('✅ [TextEvaluator] Gap items:', result.gaps?.length || 0);
        
        // Verify we have valid scores - NO FALLBACKS!
        const totalScore = Object.values(result.subscores).reduce((sum, score) => sum + score, 0);
        console.log('📈 [TextEvaluator] Total score extracted:', totalScore);
        
        // Validate scores are reasonable numbers
        for (const [key, value] of Object.entries(result.subscores)) {
          if (isNaN(value) || value < 0) {
            throw new Error(`Invalid score for ${key}: ${value} (must be a positive number)`);
          }
        }
        
        if (totalScore === 0) {
          throw new Error('All extracted scores are zero - this indicates a critical evaluation failure');
        }
        
      } catch (parseError) {
        console.error('❌ [TextEvaluator] PARSING FAILED - NO FALLBACK!');
        console.log('Raw response that failed to parse:');
        console.log('---START RESPONSE---');
        console.log(response);
        console.log('---END RESPONSE---');
        console.error('Parse error details:', parseError);
        
        // NO FALLBACK - Let it fail completely!
        throw new Error(`TextEvaluator parsing failed: ${parseError}. Raw response: ${response}`);
      }

      // Enforce maximums - NO FALLBACKS! (values already validated above)
      result.subscores.clarity = Math.min(15, result.subscores.clarity!);
      result.subscores.problem_value = Math.min(20, result.subscores.problem_value!);
      result.subscores.feasibility_signal = Math.min(10, result.subscores.feasibility_signal!);
      result.subscores.originality = Math.min(10, result.subscores.originality!);
      result.subscores.impact_convert = Math.min(20, result.subscores.impact_convert!);

      console.log('\n✅ [TextEvaluator] Evaluation complete:');
      console.log('  Scores:', result.subscores);
      console.log('  Total:', Object.values(result.subscores).reduce((a, b) => a + b, 0));
      console.log('  Evidence:', result.evidence?.length || 0, 'items');
      console.log('  Gaps:', result.gaps?.length || 0, 'items');

      return result;
    } catch (error) {
      this.log(`❌ TextEvaluator COMPLETELY FAILED - NO FALLBACK!`);
      this.log(`Error details: ${error}`);
      // NO FALLBACK - Let the whole evaluation system fail!
      throw new Error(`TextEvaluator evaluation failed: ${error}`);
    }
  }
}