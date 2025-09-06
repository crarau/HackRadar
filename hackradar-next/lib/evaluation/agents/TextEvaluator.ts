import { BaseAgent } from './BaseAgent';

export interface TextEvaluatorInput {
  text: string;
  mode?: 'initial' | 'update';
  previousSummary?: string;
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
    const { text, mode = 'initial' } = input;
    
    if (!text || text.trim().length < 10) {
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

    const prompt = `Evaluate this hackathon pitch text and provide scores with strict maximums.
    
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

    try {
      const response = await this.callAnthropic(prompt);
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