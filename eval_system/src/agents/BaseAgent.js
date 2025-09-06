/**
 * Base Evaluation Agent
 * 
 * Abstract base class for all evaluation agents.
 * Provides common functionality for API calls, scoring, and result formatting.
 */

import axios from 'axios';

export class BaseAgent {
  constructor(name, description, config = {}) {
    this.name = name;
    this.description = description;
    this.config = {
      temperature: 0.1,
      maxTokens: 2000,
      model: 'gpt-4',
      timeout: 30000,
      ...config
    };
    
    this.apiKey = process.env.OPENAI_API_KEY;
    if (!this.apiKey) {
      console.warn(`Warning: No OpenAI API key found. Agent ${this.name} will run in mock mode.`);
    }
  }
  
  /**
   * Main evaluation method - must be implemented by subclasses
   */
  async evaluate(submission) {
    throw new Error(`evaluate() method must be implemented by ${this.constructor.name}`);
  }
  
  /**
   * Make API call to OpenAI
   */
  async makeApiCall(messages, systemPrompt) {
    if (!this.apiKey) {
      return this.generateMockResponse(messages, systemPrompt);
    }
    
    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout
        }
      );
      
      const processingTime = Date.now() - startTime;
      
      return {
        content: response.data.choices[0].message.content,
        tokenUsage: response.data.usage || { prompt_tokens: 0, completion_tokens: 0 },
        processingTime,
        model: this.config.model
      };
    } catch (error) {
      console.error(`API call failed for ${this.name}:`, error.message);
      
      // Fallback to mock response on API failure
      console.log(`Falling back to mock response for ${this.name}`);
      return this.generateMockResponse(messages, systemPrompt);
    }
  }
  
  /**
   * Generate mock response for testing or when API is unavailable
   */
  generateMockResponse(messages, systemPrompt) {
    const mockScores = {
      innovation: Math.floor(Math.random() * 40) + 60, // 60-100
      feasibility: Math.floor(Math.random() * 30) + 70, // 70-100
      impact: Math.floor(Math.random() * 35) + 65, // 65-100
      presentation: Math.floor(Math.random() * 30) + 70, // 70-100
      progress: Math.floor(Math.random() * 25) + 75, // 75-100
      technical: Math.floor(Math.random() * 40) + 60, // 60-100
      business: Math.floor(Math.random() * 35) + 65, // 65-100
      execution: Math.floor(Math.random() * 30) + 70 // 70-100
    };
    
    const overallScore = Math.floor(Object.values(mockScores).reduce((a, b) => a + b, 0) / Object.keys(mockScores).length);
    
    const mockResponse = {
      overallScore,
      criteriaScores: mockScores,
      confidence: 0.8,
      summary: `Mock evaluation from ${this.name}. This is a simulated response for testing purposes.`,
      feedback: `This is a mock evaluation response from the ${this.name} agent. The submission shows potential in several areas with room for improvement in others. This response is generated for testing when the OpenAI API is not available.`,
      insights: {
        strengths: ['Creative approach', 'Strong technical foundation', 'Clear value proposition'],
        weaknesses: ['Needs more market validation', 'Limited scalability analysis'],
        opportunities: ['Potential for partnerships', 'Room for feature expansion'],
        recommendations: ['Conduct user testing', 'Develop go-to-market strategy', 'Build MVP quickly']
      },
      awardFlags: {
        technicalInnovation: Math.random() > 0.7,
        businessViability: Math.random() > 0.6,
        presentationExcellence: Math.random() > 0.8
      }
    };
    
    return {
      content: JSON.stringify(mockResponse, null, 2),
      tokenUsage: { prompt_tokens: 100, completion_tokens: 200 },
      processingTime: 500,
      model: 'mock-' + this.config.model
    };
  }
  
  /**
   * Parse structured response from API
   */
  parseStructuredResponse(responseContent) {
    try {
      const parsed = JSON.parse(responseContent);
      
      // Validate required fields
      const required = ['overallScore', 'criteriaScores', 'confidence', 'feedback'];
      for (const field of required) {
        if (!(field in parsed)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Validate score ranges
      if (parsed.overallScore < 0 || parsed.overallScore > 100) {
        parsed.overallScore = Math.max(0, Math.min(100, parsed.overallScore));
      }
      
      if (parsed.confidence < 0 || parsed.confidence > 1) {
        parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));
      }
      
      // Validate criteria scores
      Object.keys(parsed.criteriaScores || {}).forEach(criterion => {
        const score = parsed.criteriaScores[criterion];
        if (score < 0 || score > 100) {
          parsed.criteriaScores[criterion] = Math.max(0, Math.min(100, score));
        }
      });
      
      return parsed;
    } catch (error) {
      console.error(`Failed to parse response from ${this.name}:`, error.message);
      console.error('Response content:', responseContent);
      
      // Return minimal valid response
      return {
        overallScore: 0,
        criteriaScores: {},
        confidence: 0.1,
        feedback: 'Failed to parse evaluation response',
        summary: 'Evaluation parsing error',
        insights: { strengths: [], weaknesses: [], opportunities: [], recommendations: [] },
        awardFlags: {},
        error: error.message
      };
    }
  }
  
  /**
   * Create system prompt with common instructions
   */
  createSystemPrompt(specificInstructions) {
    return `You are an AI evaluation agent specialized in hackathon submissions. Your role is to provide fair, constructive, and detailed evaluations.

EVALUATION CRITERIA:
- Innovation: Novelty, creativity, unique approach (0-100)
- Feasibility: Technical viability, realistic implementation (0-100)  
- Impact: Potential to solve real problems, market need (0-100)
- Presentation: Clarity, communication, visual appeal (0-100)
- Progress: Development stage, completeness, momentum (0-100)
- Technical: Code quality, architecture, scalability (0-100)
- Business: Revenue model, market strategy, sustainability (0-100)
- Execution: Implementation quality, user experience (0-100)

RESPONSE FORMAT:
You must respond with a valid JSON object containing:
{
  "overallScore": number (0-100, weighted average of criteria),
  "criteriaScores": {
    "innovation": number (0-100),
    "feasibility": number (0-100),
    "impact": number (0-100),
    "presentation": number (0-100),
    "progress": number (0-100),
    "technical": number (0-100),
    "business": number (0-100),
    "execution": number (0-100)
  },
  "confidence": number (0-1, how confident you are in this evaluation),
  "summary": "Brief 1-2 sentence summary of the submission",
  "feedback": "Detailed constructive feedback (200-500 words)",
  "insights": {
    "strengths": ["strength 1", "strength 2", ...],
    "weaknesses": ["weakness 1", "weakness 2", ...],
    "opportunities": ["opportunity 1", "opportunity 2", ...],
    "recommendations": ["recommendation 1", "recommendation 2", ...]
  },
  "awardFlags": {
    "technicalInnovation": boolean,
    "businessViability": boolean,
    "presentationExcellence": boolean,
    "socialImpact": boolean,
    "aiIntegration": boolean,
    "crowdFavorite": boolean,
    "hypeMachine": boolean,
    "moonshot": boolean,
    "rapidDevelopment": boolean,
    "dataInsights": boolean,
    "userExperience": boolean,
    "sustainability": boolean,
    "collaboration": boolean,
    "marketPotential": boolean,
    "disruptiveTech": boolean
  }
}

SPECIFIC INSTRUCTIONS:
${specificInstructions}

IMPORTANT:
- Be constructive and encouraging while honest about weaknesses
- Provide actionable recommendations
- Consider the hackathon context (time constraints, early stage)
- Flag award potential appropriately
- Ensure all scores are integers between 0-100
- Respond only with valid JSON, no additional text`;
  }
  
  /**
   * Truncate content to fit within token limits
   */
  truncateContent(content, maxLength = 8000) {
    if (!content) return '';
    
    if (content.length <= maxLength) {
      return content;
    }
    
    // Truncate and add indication
    return content.substring(0, maxLength - 100) + '\n\n[Content truncated due to length...]';
  }
  
  /**
   * Get agent configuration for display
   */
  getConfig() {
    return {
      name: this.name,
      description: this.description,
      model: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      hasApiKey: !!this.apiKey
    };
  }
}