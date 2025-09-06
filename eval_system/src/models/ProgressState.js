/**
 * ProgressState Model
 * 
 * Represents the persistent progress state that summarizes everything known about a startup.
 * This is the central document that tracks a startup's entire evaluation journey.
 */

export class ProgressState {
  constructor(data = {}) {
    this._id = data._id;
    this.startupId = data.startupId; // Unique identifier for the startup
    this.teamName = data.teamName;
    this.email = data.email;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    
    // Current state tracking
    this.currentScore = data.currentScore || 0;
    this.submissionCount = data.submissionCount || 0;
    this.lastSubmissionAt = data.lastSubmissionAt;
    this.readinessState = data.readinessState || 'not_ready'; // not_ready, asserted, verified
    
    // Award flags tracking
    this.awardFlags = data.awardFlags || {
      technicalInnovation: false,
      businessViability: false,
      presentationExcellence: false,
      socialImpact: false,
      aiIntegration: false,
      crowdFavorite: false,
      hypeMachine: false,
      moonshot: false,
      rapidDevelopment: false,
      dataInsights: false,
      userExperience: false,
      sustainability: false,
      collaboration: false,
      marketPotential: false,
      disruptiveTech: false
    };
    
    // Cumulative insights from all evaluations
    this.insights = data.insights || {
      strengths: [], // Array of identified strengths
      weaknesses: [], // Array of identified weaknesses
      trends: [], // Array of observed trends
      recommendations: [] // Array of actionable recommendations
    };
    
    // Score history for trend analysis
    this.scoreHistory = data.scoreHistory || [];
    
    // Reference to latest snapshot
    this.latestSnapshotId = data.latestSnapshotId;
    
    // Evaluation criteria scores (averaged over time)
    this.criteriaScores = data.criteriaScores || {
      innovation: 0,
      feasibility: 0,
      impact: 0,
      presentation: 0,
      progress: 0,
      technical: 0,
      business: 0,
      execution: 0
    };
    
    // Delta tracking
    this.lastDelta = data.lastDelta || null;
    this.significantChanges = data.significantChanges || []; // Array of significant changes detected
  }
  
  /**
   * Update the progress state with new evaluation results
   */
  updateFromEvaluation(evaluation) {
    this.updatedAt = new Date();
    this.submissionCount += 1;
    this.lastSubmissionAt = new Date();
    
    // Update current score
    const previousScore = this.currentScore;
    this.currentScore = evaluation.overallScore;
    
    // Add to score history
    this.scoreHistory.push({
      score: this.currentScore,
      timestamp: new Date(),
      delta: this.currentScore - previousScore,
      submissionId: evaluation.submissionId
    });
    
    // Update criteria scores (weighted average)
    const weight = 0.3; // Weight for new score vs historical average
    Object.keys(this.criteriaScores).forEach(criterion => {
      if (evaluation.criteriaScores && evaluation.criteriaScores[criterion] !== undefined) {
        this.criteriaScores[criterion] = 
          (this.criteriaScores[criterion] * (1 - weight)) + 
          (evaluation.criteriaScores[criterion] * weight);
      }
    });
    
    // Update insights
    if (evaluation.insights) {
      this.mergeInsights(evaluation.insights);
    }
    
    // Update award flags
    if (evaluation.awardFlags) {
      Object.keys(evaluation.awardFlags).forEach(flag => {
        if (evaluation.awardFlags[flag]) {
          this.awardFlags[flag] = true;
        }
      });
    }
    
    // Calculate and store delta
    this.lastDelta = {
      scoreDelta: this.currentScore - previousScore,
      timestamp: new Date(),
      significant: Math.abs(this.currentScore - previousScore) > (process.env.DELTA_THRESHOLD || 5)
    };
    
    if (this.lastDelta.significant) {
      this.significantChanges.push({
        type: 'score_change',
        delta: this.lastDelta.scoreDelta,
        timestamp: new Date(),
        reason: evaluation.summary || 'Score significantly changed'
      });
    }
  }
  
  /**
   * Merge new insights with existing ones
   */
  mergeInsights(newInsights) {
    if (newInsights.strengths) {
      newInsights.strengths.forEach(strength => {
        if (!this.insights.strengths.includes(strength)) {
          this.insights.strengths.push(strength);
        }
      });
    }
    
    if (newInsights.weaknesses) {
      newInsights.weaknesses.forEach(weakness => {
        if (!this.insights.weaknesses.includes(weakness)) {
          this.insights.weaknesses.push(weakness);
        }
      });
    }
    
    if (newInsights.recommendations) {
      newInsights.recommendations.forEach(rec => {
        if (!this.insights.recommendations.includes(rec)) {
          this.insights.recommendations.push(rec);
        }
      });
    }
  }
  
  /**
   * Get recent score trend
   */
  getScoreTrend(lookbackPeriod = 5) {
    if (this.scoreHistory.length < 2) return 'insufficient_data';
    
    const recentScores = this.scoreHistory.slice(-lookbackPeriod);
    const trend = recentScores[recentScores.length - 1].score - recentScores[0].score;
    
    if (trend > 5) return 'improving';
    if (trend < -5) return 'declining';
    return 'stable';
  }
  
  /**
   * Get readiness assessment
   */
  assessReadiness() {
    const criteria = {
      hasMinimumSubmissions: this.submissionCount >= 3,
      hasRecentActivity: this.lastSubmissionAt && (Date.now() - this.lastSubmissionAt.getTime()) < 24 * 60 * 60 * 1000,
      hasAcceptableScore: this.currentScore >= 60,
      hasAllCriteriaCovered: Object.values(this.criteriaScores).every(score => score > 0),
      hasAwardPotential: Object.values(this.awardFlags).some(flag => flag)
    };
    
    const metCriteria = Object.values(criteria).filter(Boolean).length;
    
    if (metCriteria >= 4) return 'verified';
    if (metCriteria >= 2) return 'asserted';
    return 'not_ready';
  }
  
  /**
   * Convert to MongoDB document
   */
  toDocument() {
    return {
      startupId: this.startupId,
      teamName: this.teamName,
      email: this.email,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      currentScore: this.currentScore,
      submissionCount: this.submissionCount,
      lastSubmissionAt: this.lastSubmissionAt,
      readinessState: this.readinessState,
      awardFlags: this.awardFlags,
      insights: this.insights,
      scoreHistory: this.scoreHistory,
      latestSnapshotId: this.latestSnapshotId,
      criteriaScores: this.criteriaScores,
      lastDelta: this.lastDelta,
      significantChanges: this.significantChanges
    };
  }
  
  /**
   * Create from MongoDB document
   */
  static fromDocument(doc) {
    return new ProgressState(doc);
  }
}