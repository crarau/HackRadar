/**
 * Evaluation Model
 * 
 * Represents the result of an evaluation agent analyzing a submission.
 */

export class Evaluation {
  constructor(data = {}) {
    this._id = data._id;
    this.submissionId = data.submissionId;
    this.startupId = data.startupId;
    this.agent = data.agent; // Which evaluation agent performed this evaluation
    this.type = data.type; // Same as submission type: text, file, web, artifact
    
    // Core evaluation results
    this.overallScore = data.overallScore || 0; // 0-100
    this.criteriaScores = data.criteriaScores || {}; // Individual criteria scores
    this.confidence = data.confidence || 0.8; // 0-1, how confident the agent is
    
    // Detailed feedback
    this.feedback = data.feedback || '';
    this.summary = data.summary || '';
    
    // Structured insights
    this.insights = data.insights || {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      recommendations: []
    };
    
    // Award potential flags
    this.awardFlags = data.awardFlags || {};
    
    // Processing metadata
    this.evaluatedAt = data.evaluatedAt || new Date();
    this.processingTimeMs = data.processingTimeMs || 0;
    this.tokenUsage = data.tokenUsage || { input: 0, output: 0 };
    this.modelUsed = data.modelUsed || 'gpt-4';
    
    // Quality assurance
    this.qualityScore = data.qualityScore || 0; // Internal QA score for the evaluation
    this.reviewStatus = data.reviewStatus || 'pending'; // pending, approved, needs_review
  }
  
  /**
   * Set criteria scores with validation
   */
  setCriteriaScores(scores) {
    const validCriteria = [
      'innovation', 'feasibility', 'impact', 'presentation', 'progress',
      'technical', 'business', 'execution', 'scalability', 'originality'
    ];
    
    this.criteriaScores = {};
    Object.entries(scores).forEach(([criterion, score]) => {
      if (validCriteria.includes(criterion) && typeof score === 'number' && score >= 0 && score <= 100) {
        this.criteriaScores[criterion] = Math.round(score);
      }
    });
    
    // Calculate overall score as weighted average
    this.calculateOverallScore();
  }
  
  /**
   * Calculate overall score from criteria scores
   */
  calculateOverallScore() {
    const weights = {
      innovation: 0.2,
      feasibility: 0.15,
      impact: 0.2,
      presentation: 0.1,
      progress: 0.1,
      technical: 0.15,
      business: 0.1
    };
    
    let totalWeighted = 0;
    let totalWeight = 0;
    
    Object.entries(this.criteriaScores).forEach(([criterion, score]) => {
      const weight = weights[criterion] || 0.1;
      totalWeighted += score * weight;
      totalWeight += weight;
    });
    
    this.overallScore = totalWeight > 0 ? Math.round(totalWeighted / totalWeight) : 0;
  }
  
  /**
   * Add insight to structured insights
   */
  addInsight(category, insight) {
    const validCategories = ['strengths', 'weaknesses', 'opportunities', 'recommendations'];
    if (validCategories.includes(category) && typeof insight === 'string' && insight.trim()) {
      if (!this.insights[category].includes(insight.trim())) {
        this.insights[category].push(insight.trim());
      }
    }
  }
  
  /**
   * Set award flags based on evaluation
   */
  setAwardFlags(flags) {
    const validFlags = [
      'technicalInnovation', 'businessViability', 'presentationExcellence',
      'socialImpact', 'aiIntegration', 'crowdFavorite', 'hypeMachine',
      'moonshot', 'rapidDevelopment', 'dataInsights', 'userExperience',
      'sustainability', 'collaboration', 'marketPotential', 'disruptiveTech'
    ];
    
    this.awardFlags = {};
    Object.entries(flags).forEach(([flag, value]) => {
      if (validFlags.includes(flag)) {
        this.awardFlags[flag] = Boolean(value);
      }
    });
  }
  
  /**
   * Set processing metadata
   */
  setProcessingMetadata(processingTimeMs, tokenUsage, modelUsed) {
    this.processingTimeMs = processingTimeMs || 0;
    this.tokenUsage = tokenUsage || { input: 0, output: 0 };
    this.modelUsed = modelUsed || 'gpt-4';
  }
  
  /**
   * Calculate quality score based on various factors
   */
  calculateQualityScore() {
    let qualityScore = 100;
    
    // Deduct for low confidence
    if (this.confidence < 0.7) qualityScore -= (0.7 - this.confidence) * 50;
    
    // Deduct if feedback is too short
    if (this.feedback.length < 100) qualityScore -= 20;
    
    // Deduct if no insights provided
    const totalInsights = Object.values(this.insights).reduce((sum, arr) => sum + arr.length, 0);
    if (totalInsights < 3) qualityScore -= 15;
    
    // Deduct if criteria scores are too uniform (suggests low quality analysis)
    const scores = Object.values(this.criteriaScores);
    if (scores.length > 0) {
      const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length;
      if (variance < 50) qualityScore -= 10; // Too little variation
    }
    
    // Bonus for comprehensive analysis
    if (this.feedback.length > 300 && totalInsights >= 5 && this.confidence >= 0.8) {
      qualityScore += 10;
    }
    
    this.qualityScore = Math.max(0, Math.min(100, Math.round(qualityScore)));
    
    // Set review status based on quality
    if (this.qualityScore >= 80) {
      this.reviewStatus = 'approved';
    } else if (this.qualityScore >= 60) {
      this.reviewStatus = 'needs_review';
    } else {
      this.reviewStatus = 'rejected';
    }
  }
  
  /**
   * Get evaluation summary for display
   */
  getSummary() {
    return {
      id: this._id,
      agent: this.agent,
      overallScore: this.overallScore,
      confidence: this.confidence,
      qualityScore: this.qualityScore,
      reviewStatus: this.reviewStatus,
      evaluatedAt: this.evaluatedAt,
      processingTimeMs: this.processingTimeMs,
      summaryText: this.summary,
      topStrengths: this.insights.strengths.slice(0, 3),
      topRecommendations: this.insights.recommendations.slice(0, 3),
      awardPotential: Object.keys(this.awardFlags).filter(flag => this.awardFlags[flag])
    };
  }
  
  /**
   * Validate evaluation data
   */
  validate() {
    const errors = [];
    
    if (!this.submissionId) errors.push('submissionId is required');
    if (!this.startupId) errors.push('startupId is required');
    if (!this.agent) errors.push('agent is required');
    if (typeof this.overallScore !== 'number' || this.overallScore < 0 || this.overallScore > 100) {
      errors.push('overallScore must be a number between 0 and 100');
    }
    if (typeof this.confidence !== 'number' || this.confidence < 0 || this.confidence > 1) {
      errors.push('confidence must be a number between 0 and 1');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * Convert to MongoDB document
   */
  toDocument() {
    return {
      submissionId: this.submissionId,
      startupId: this.startupId,
      agent: this.agent,
      type: this.type,
      overallScore: this.overallScore,
      criteriaScores: this.criteriaScores,
      confidence: this.confidence,
      feedback: this.feedback,
      summary: this.summary,
      insights: this.insights,
      awardFlags: this.awardFlags,
      evaluatedAt: this.evaluatedAt,
      processingTimeMs: this.processingTimeMs,
      tokenUsage: this.tokenUsage,
      modelUsed: this.modelUsed,
      qualityScore: this.qualityScore,
      reviewStatus: this.reviewStatus
    };
  }
  
  /**
   * Create from MongoDB document
   */
  static fromDocument(doc) {
    return new Evaluation(doc);
  }
}