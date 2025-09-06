import { BaseAgent, MessageHistory } from './BaseAgent';

export interface TextEvaluatorInput {
  text: string;
  mode?: 'initial' | 'update';
  previousSummary?: string;
  messageHistory?: MessageHistory[];
  isUpdate?: boolean;
}

export interface TextEvaluatorResult {
  subscores: {
    clarity?: number;
    problem_value?: number;
    feasibility_signal?: number;
    originality?: number;
    impact_convert?: number;
  };
  evidence?: string[];
  gaps?: string[];
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
    const { text, mode = 'initial', messageHistory = [], isUpdate = false } = input;
    
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
        gaps: ['No meaningful text provided']
      };
    }

    let prompt: string;
    
    if (isUpdate && messageHistory.length > 0) {
      // For updates, emphasize cumulative evaluation
      prompt = `This is an UPDATE to an ongoing hackathon project evaluation.

NEW UPDATE:
${text}

CRITICAL INSTRUCTIONS:
1. You have access to the full conversation history above
2. This new text is just an incremental update, NOT the complete project description
3. Evaluate the ENTIRE PROJECT based on ALL accumulated information
4. If previous submissions mentioned demos, repos, metrics, etc., those STILL COUNT
5. The new update may be brief (even one sentence) - that's normal
6. DO NOT penalize for brevity if the project has been well-described previously

Provide scores for the COMPLETE PROJECT STATE, considering everything you know:

{
  "subscores": {
    "clarity": <0-15, based on overall message clarity across all submissions>,
    "problem_value": <0-20, based on problem understanding from all context>,
    "feasibility_signal": <0-10, evidence from all submissions>,
    "originality": <0-10, innovation shown throughout>,
    "impact_convert": <0-20, conversion potential of complete pitch>
  },
  "evidence": [<list all strengths from current + previous submissions>],
  "gaps": [<what's still missing for a complete pitch>]
}

Scoring Rules:
- Clarity: How clear is the COMPLETE pitch (not just this update)
- Problem Value: Total problem articulation across all submissions
- Feasibility: All evidence of working solution shown so far
- Originality: Innovation demonstrated throughout
- Impact/Convert: Overall conversion strength of full pitch

Remember: Brief updates are normal. Score the WHOLE PROJECT.`;
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
    "feasibility_signal": <0-10, evidence of working solution>,
    "originality": <0-10, innovation and differentiation>,
    "impact_convert": <0-20, call-to-action strength and conversion potential>
  },
  "evidence": [<list of strengths found in the text>],
  "gaps": [<list of missing elements or improvements needed>]
}

Rules:
- Clarity max 15: Clear hook, no jargon, concise message
- Problem Value max 20: Identifies real pain, quantifies impact
- Feasibility max 10: Shows working solution or strong evidence
- Originality max 10: Novel approach or unique angle
- Impact/Convert max 20: Strong CTA, clear next steps, conversion focus

Be strict with scoring. Most pitches should score 40-60 total.`;
    }

    try {
      const response = await this.callAnthropic(prompt, messageHistory);
      const result = this.parseJSON<TextEvaluatorResult>(response, {
        subscores: {
          clarity: 5,
          problem_value: 5,
          feasibility_signal: 3,
          originality: 3,
          impact_convert: 5
        },
        evidence: ['Text submitted'],
        gaps: ['Could not parse AI response']
      });

      // Enforce maximums
      if (result.subscores) {
        result.subscores.clarity = Math.min(15, result.subscores.clarity || 0);
        result.subscores.problem_value = Math.min(20, result.subscores.problem_value || 0);
        result.subscores.feasibility_signal = Math.min(10, result.subscores.feasibility_signal || 0);
        result.subscores.originality = Math.min(10, result.subscores.originality || 0);
        result.subscores.impact_convert = Math.min(20, result.subscores.impact_convert || 0);
      }

      console.log('\n✅ [TextEvaluator] Evaluation complete:');
      console.log('  Scores:', result.subscores);
      console.log('  Total:', Object.values(result.subscores).reduce((a, b) => (a || 0) + (b || 0), 0));
      console.log('  Evidence:', result.evidence?.length || 0, 'items');
      console.log('  Gaps:', result.gaps?.length || 0, 'items');

      return result;
    } catch (error) {
      this.log(`Failed to evaluate text: ${error}`);
      // Return minimum scores if API fails
      return {
        subscores: {
          clarity: 3,
          problem_value: 3,
          feasibility_signal: 2,
          originality: 2,
          impact_convert: 3
        },
        evidence: ['Submission received'],
        gaps: ['Evaluation service temporarily unavailable']
      };
    }
  }
}