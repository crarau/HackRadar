/**
 * Snapshot Model
 * 
 * Represents a point-in-time capture of all submissions and their evaluations.
 * Used for delta comparisons and historical tracking.
 */

export class Snapshot {
  constructor(data = {}) {
    this._id = data._id;
    this.startupId = data.startupId;
    this.timestamp = data.timestamp || new Date();
    this.triggerEvent = data.triggerEvent || 'manual'; // manual, new_submission, scheduled, significant_change
    
    // Submission data at time of snapshot
    this.submissions = data.submissions || [];
    
    // Evaluation results at time of snapshot
    this.evaluations = data.evaluations || [];
    
    // Aggregated scores at time of snapshot
    this.aggregatedScores = data.aggregatedScores || {
      overall: 0,
      criteria: {},
      confidence: 0
    };
    
    // Context and metadata
    this.metadata = data.metadata || {
      submissionCount: 0,
      evaluationCount: 0,
      processingTimeMs: 0,
      version: '1.0'
    };
    
    // Delta information (if this is a comparison snapshot)
    this.deltaFrom = data.deltaFrom; // Reference to previous snapshot ID
    this.deltaResults = data.deltaResults;
  }
  
  /**
   * Add a submission to this snapshot
   */
  addSubmission(submission) {
    this.submissions.push({
      id: submission._id || submission.id,
      type: submission.type,
      content: submission.content,
      url: submission.url,
      fileName: submission.fileName,
      fileSize: submission.fileSize,
      submittedAt: submission.submittedAt,
      metadata: submission.metadata
    });
    
    this.metadata.submissionCount = this.submissions.length;
  }
  
  /**
   * Add an evaluation to this snapshot
   */
  addEvaluation(evaluation) {
    this.evaluations.push({
      id: evaluation._id || evaluation.id,
      submissionId: evaluation.submissionId,
      agent: evaluation.agent,
      type: evaluation.type,
      score: evaluation.score,
      criteriaScores: evaluation.criteriaScores,
      feedback: evaluation.feedback,
      insights: evaluation.insights,
      confidence: evaluation.confidence,
      processingTimeMs: evaluation.processingTimeMs,
      evaluatedAt: evaluation.evaluatedAt
    });
    
    this.metadata.evaluationCount = this.evaluations.length;
  }
  
  /**
   * Calculate aggregated scores from all evaluations
   */
  calculateAggregatedScores() {
    if (this.evaluations.length === 0) {
      this.aggregatedScores = { overall: 0, criteria: {}, confidence: 0 };
      return;
    }
    
    // Calculate overall score (weighted average)
    const weights = {
      text: 1.0,
      file: 1.2,
      web: 1.1,
      artifact: 1.3
    };
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let totalConfidence = 0;
    const criteriaAccumulator = {};
    
    this.evaluations.forEach(evaluation => {
      const weight = weights[evaluation.type] || 1.0;
      totalWeightedScore += evaluation.score * weight;
      totalWeight += weight;
      totalConfidence += evaluation.confidence || 0.8;
      
      // Accumulate criteria scores
      if (evaluation.criteriaScores) {
        Object.entries(evaluation.criteriaScores).forEach(([criterion, score]) => {
          if (!criteriaAccumulator[criterion]) {
            criteriaAccumulator[criterion] = { total: 0, count: 0 };
          }
          criteriaAccumulator[criterion].total += score * weight;
          criteriaAccumulator[criterion].count += weight;
        });
      }
    });
    
    this.aggregatedScores.overall = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
    this.aggregatedScores.confidence = Math.min(1.0, totalConfidence / this.evaluations.length);
    
    // Calculate average criteria scores
    Object.entries(criteriaAccumulator).forEach(([criterion, data]) => {
      this.aggregatedScores.criteria[criterion] = Math.round(data.total / data.count);
    });
  }
  
  /**
   * Compare this snapshot with another to calculate delta
   */
  compareWith(previousSnapshot) {
    if (!previousSnapshot) {
      return {
        type: 'initial',
        changes: [],
        summary: 'Initial snapshot - no comparison available'
      };
    }
    
    const changes = [];
    
    // Score changes
    const scoreDelta = this.aggregatedScores.overall - previousSnapshot.aggregatedScores.overall;
    if (Math.abs(scoreDelta) >= (process.env.DELTA_THRESHOLD || 5)) {
      changes.push({
        type: 'score_change',
        field: 'overall_score',
        oldValue: previousSnapshot.aggregatedScores.overall,
        newValue: this.aggregatedScores.overall,
        delta: scoreDelta,
        significant: true
      });
    }
    
    // Criteria score changes
    Object.entries(this.aggregatedScores.criteria).forEach(([criterion, score]) => {
      const oldScore = previousSnapshot.aggregatedScores.criteria[criterion] || 0;
      const delta = score - oldScore;
      if (Math.abs(delta) >= 3) {
        changes.push({
          type: 'criteria_change',
          field: criterion,
          oldValue: oldScore,
          newValue: score,
          delta: delta,
          significant: Math.abs(delta) >= 5
        });
      }
    });
    
    // New submissions
    const newSubmissions = this.submissions.filter(sub => 
      !previousSnapshot.submissions.some(prevSub => prevSub.id === sub.id)
    );
    
    newSubmissions.forEach(sub => {
      changes.push({
        type: 'new_submission',
        field: 'submissions',
        submissionType: sub.type,
        submissionId: sub.id,
        significant: true
      });
    });
    
    // Summary
    let summary = '';
    if (scoreDelta > 0) {
      summary += `Score improved by ${scoreDelta} points. `;
    } else if (scoreDelta < 0) {
      summary += `Score decreased by ${Math.abs(scoreDelta)} points. `;
    }
    
    if (newSubmissions.length > 0) {
      summary += `${newSubmissions.length} new submission(s) added. `;
    }
    
    if (changes.length === 0) {
      summary = 'No significant changes detected.';
    }
    
    this.deltaFrom = previousSnapshot._id;
    this.deltaResults = {
      type: changes.length > 0 ? 'changes_detected' : 'no_changes',
      changes: changes,
      summary: summary.trim(),
      comparedAt: new Date()
    };
    
    return this.deltaResults;
  }
  
  /**
   * Get summary statistics
   */
  getSummaryStats() {
    return {
      submissionCount: this.submissions.length,
      evaluationCount: this.evaluations.length,
      overallScore: this.aggregatedScores.overall,
      confidence: this.aggregatedScores.confidence,
      timestamp: this.timestamp,
      hasSignificantChanges: this.deltaResults && 
        this.deltaResults.changes.some(change => change.significant)
    };
  }
  
  /**
   * Convert to MongoDB document
   */
  toDocument() {
    return {
      startupId: this.startupId,
      timestamp: this.timestamp,
      triggerEvent: this.triggerEvent,
      submissions: this.submissions,
      evaluations: this.evaluations,
      aggregatedScores: this.aggregatedScores,
      metadata: this.metadata,
      deltaFrom: this.deltaFrom,
      deltaResults: this.deltaResults
    };
  }
  
  /**
   * Create from MongoDB document
   */
  static fromDocument(doc) {
    return new Snapshot(doc);
  }
}