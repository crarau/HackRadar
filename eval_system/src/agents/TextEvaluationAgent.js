/**
 * Text Evaluation Agent
 * 
 * Specializes in evaluating text-based submissions like project descriptions,
 * pitches, documentation, and written content.
 */

import { BaseAgent } from './BaseAgent.js';
import { Evaluation } from '../models/Evaluation.js';

export class TextEvaluationAgent extends BaseAgent {
  constructor() {
    super(
      'TextEvaluationAgent',
      'Evaluates text-based submissions including project descriptions, pitches, and documentation',
      {
        temperature: 0.2,
        maxTokens: 2500,
        model: 'gpt-4'
      }
    );
  }
  
  /**
   * Evaluate text submission
   */
  async evaluate(submission) {
    const startTime = Date.now();
    
    try {
      if (!submission.content || submission.content.trim().length === 0) {
        throw new Error('No text content provided for evaluation');
      }
      
      const systemPrompt = this.createSystemPrompt(`
You are evaluating a TEXT SUBMISSION for a hackathon project. This could be:
- Project description or pitch
- Technical documentation  
- Business plan or strategy
- Progress update or milestone report
- Team introduction or vision statement

Focus your evaluation on:
- CLARITY: How well does the text communicate the idea?
- COMPLETENESS: Does it cover key aspects (problem, solution, market, tech)?
- PERSUASIVENESS: Is it compelling and convincing?
- FEASIBILITY: Based on the description, is the project realistic?
- INNOVATION: Does it present novel ideas or approaches?
- BUSINESS POTENTIAL: Is there clear value proposition and market opportunity?

Consider the hackathon context - this may be early-stage, rapid development.
Be encouraging but honest about areas for improvement.`);

      const messages = [
        {
          role: 'user',
          content: `Please evaluate this text submission from a hackathon team:

SUBMISSION CONTENT:
${this.truncateContent(submission.content, 6000)}

METADATA:
- Word count: ${submission.metadata?.wordCount || 'unknown'}
- Character count: ${submission.metadata?.characterCount || 'unknown'}
- Submitted at: ${submission.submittedAt}

Provide a thorough evaluation focusing on the text content quality, clarity, completeness, and potential.`
        }
      ];
      
      const response = await this.makeApiCall(messages, systemPrompt);
      const parsedResponse = this.parseStructuredResponse(response.content);
      
      // Create evaluation object
      const evaluation = new Evaluation({
        submissionId: submission._id,
        startupId: submission.startupId,
        agent: this.name,
        type: 'text',
        overallScore: parsedResponse.overallScore,
        criteriaScores: parsedResponse.criteriaScores,
        confidence: parsedResponse.confidence,
        feedback: parsedResponse.feedback,
        summary: parsedResponse.summary,
        insights: parsedResponse.insights,
        awardFlags: parsedResponse.awardFlags,
        evaluatedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
        tokenUsage: {
          input: response.tokenUsage?.prompt_tokens || 0,
          output: response.tokenUsage?.completion_tokens || 0
        },
        modelUsed: response.model
      });
      
      // Apply text-specific scoring adjustments
      this.applyTextSpecificAdjustments(evaluation, submission);
      
      // Calculate quality score
      evaluation.calculateQualityScore();
      
      return evaluation;
      
    } catch (error) {
      console.error('Error in TextEvaluationAgent:', error);
      
      // Return error evaluation
      return new Evaluation({
        submissionId: submission._id,
        startupId: submission.startupId,
        agent: this.name,
        type: 'text',
        overallScore: 0,
        confidence: 0.1,
        feedback: `Error evaluating text submission: ${error.message}`,
        summary: 'Evaluation failed',
        insights: { strengths: [], weaknesses: ['Evaluation failed'], opportunities: [], recommendations: ['Please resubmit'] },
        evaluatedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
        reviewStatus: 'rejected'
      });
    }
  }
  
  /**
   * Apply text-specific scoring adjustments
   */
  applyTextSpecificAdjustments(evaluation, submission) {
    const content = submission.content;
    const wordCount = submission.metadata?.wordCount || content.split(/\s+/).length;
    
    // Adjust based on content length
    if (wordCount < 50) {
      // Very short submissions - penalize completeness
      evaluation.addInsight('weaknesses', 'Submission is very brief and lacks detail');
      evaluation.criteriaScores.presentation = Math.max(0, evaluation.criteriaScores.presentation - 15);
    } else if (wordCount > 1000) {
      // Very long submissions - might be too verbose
      evaluation.addInsight('opportunities', 'Consider condensing key points for better clarity');
    } else if (wordCount >= 200 && wordCount <= 500) {
      // Good length - bonus for conciseness
      evaluation.addInsight('strengths', 'Well-structured and appropriately detailed');
      evaluation.criteriaScores.presentation = Math.min(100, evaluation.criteriaScores.presentation + 5);
    }
    
    // Check for key elements in text submissions
    const hasKeyElements = this.analyzeTextElements(content);
    
    if (hasKeyElements.problem) {
      evaluation.addInsight('strengths', 'Clearly identifies the problem being solved');
    } else {
      evaluation.addInsight('weaknesses', 'Problem statement could be clearer');
      evaluation.criteriaScores.impact = Math.max(0, evaluation.criteriaScores.impact - 10);
    }
    
    if (hasKeyElements.solution) {
      evaluation.addInsight('strengths', 'Describes the proposed solution well');
    } else {
      evaluation.addInsight('weaknesses', 'Solution description needs more detail');
      evaluation.criteriaScores.innovation = Math.max(0, evaluation.criteriaScores.innovation - 10);
    }
    
    if (hasKeyElements.market) {
      evaluation.addInsight('strengths', 'Shows market awareness');
      evaluation.awardFlags.businessViability = true;
    } else {
      evaluation.addInsight('recommendations', 'Include market analysis and target audience');
    }
    
    if (hasKeyElements.technical) {
      evaluation.addInsight('strengths', 'Provides technical details');
      if (hasKeyElements.advanced_tech) {
        evaluation.awardFlags.technicalInnovation = true;
      }
    } else {
      evaluation.addInsight('recommendations', 'Add technical implementation details');
    }
    
    // Recalculate overall score
    evaluation.calculateOverallScore();
  }
  
  /**
   * Analyze text content for key elements
   */
  analyzeTextElements(content) {
    const lowerContent = content.toLowerCase();
    
    return {
      problem: /problem|challenge|issue|pain\s+point|difficulty|struggle/.test(lowerContent),
      solution: /solution|solve|address|approach|method|way|strategy/.test(lowerContent),
      market: /market|customer|user|target|audience|demand|revenue|business/.test(lowerContent),
      technical: /technology|technical|algorithm|api|database|framework|architecture/.test(lowerContent),
      advanced_tech: /ai|machine\s+learning|blockchain|iot|vr|ar|cloud|microservice/.test(lowerContent),
      progress: /progress|milestone|achievement|completed|built|developed|implemented/.test(lowerContent),
      team: /team|founder|developer|designer|experience|background/.test(lowerContent)
    };
  }
  
  /**
   * Get text-specific insights
   */
  getTextInsights(content) {
    const insights = [];
    const wordCount = content.split(/\s+/).length;
    const sentenceCount = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = wordCount / sentenceCount;
    
    // Readability insights
    if (avgWordsPerSentence > 25) {
      insights.push('Consider shorter sentences for better readability');
    }
    
    // Engagement insights
    const hasQuestions = /\?/.test(content);
    if (!hasQuestions) {
      insights.push('Consider adding rhetorical questions to engage readers');
    }
    
    // Call-to-action insights
    const hasCTA = /try|visit|check|download|sign\s+up|get\s+started/i.test(content);
    if (!hasCTA) {
      insights.push('Include a clear call-to-action for users');
    }
    
    return insights;
  }
}