/**
 * Progress Service
 * 
 * Manages startup progress states, tracks changes over time,
 * and handles readiness assessments.
 */

import { getDB } from '../lib/database.js';
import { ProgressState } from '../models/ProgressState.js';

export class ProgressService {
  constructor() {
    this.db = null;
  }
  
  async getDb() {
    if (!this.db) {
      this.db = await getDB();
    }
    return this.db;
  }
  
  /**
   * Get or create progress state for a startup
   */
  async getOrCreateProgress(startupId, teamName = null, email = null) {
    const db = await this.getDb();
    
    try {
      // Try to find existing progress
      let progressDoc = await db.collection('progressStates')
        .findOne({ startupId });
      
      if (progressDoc) {
        return ProgressState.fromDocument(progressDoc);
      }
      
      // Create new progress state
      const progress = new ProgressState({
        startupId,
        teamName: teamName || startupId,
        email: email || `${startupId}@example.com`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const result = await db.collection('progressStates')
        .insertOne(progress.toDocument());
      
      progress._id = result.insertedId.toString();
      return progress;
      
    } catch (error) {
      console.error('Error getting or creating progress:', error);
      throw error;
    }
  }
  
  /**
   * Update progress with new evaluation results
   */
  async updateProgress(startupId, evaluation, submission = null) {
    const db = await this.getDb();
    
    try {
      // Get or create progress state
      const progress = await this.getOrCreateProgress(startupId);
      
      // Update with evaluation results
      progress.updateFromEvaluation({
        submissionId: submission?._id,
        overallScore: evaluation.overallScore,
        criteriaScores: evaluation.criteriaScores,
        insights: evaluation.insights,
        awardFlags: evaluation.awardFlags,
        summary: evaluation.summary
      });
      
      // Update readiness state
      progress.readinessState = progress.assessReadiness();
      
      // Save updated progress
      await db.collection('progressStates')
        .replaceOne(
          { startupId },
          progress.toDocument(),
          { upsert: true }
        );
      
      return progress;
      
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  }
  
  /**
   * Get progress for a startup
   */
  async getProgress(startupId) {
    const db = await this.getDb();
    
    try {
      const progressDoc = await db.collection('progressStates')
        .findOne({ startupId });
      
      if (!progressDoc) {
        return null;
      }
      
      return ProgressState.fromDocument(progressDoc);
      
    } catch (error) {
      console.error('Error getting progress:', error);
      throw error;
    }
  }
  
  /**
   * Get all progress states with filtering and sorting
   */
  async getAllProgress(options = {}) {
    const db = await this.getDb();
    
    try {
      const limit = options.limit || 50;
      const skip = options.skip || 0;
      const sortBy = options.sortBy || 'currentScore';
      const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
      
      // Build query
      const query = {};
      
      if (options.minScore) {
        query.currentScore = { $gte: options.minScore };
      }
      
      if (options.readinessState) {
        query.readinessState = options.readinessState;
      }
      
      if (options.hasAwards) {
        query.$or = Object.keys(ProgressState.prototype.awardFlags).map(flag => ({
          [`awardFlags.${flag}`]: true
        }));
      }
      
      // Execute query
      const progressDocs = await db.collection('progressStates')
        .find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      return progressDocs.map(doc => ProgressState.fromDocument(doc));
      
    } catch (error) {
      console.error('Error getting all progress:', error);
      throw error;
    }
  }
  
  /**
   * Update latest snapshot reference
   */
  async updateLatestSnapshot(startupId, snapshotId) {
    const db = await this.getDb();
    
    try {
      await db.collection('progressStates')
        .updateOne(
          { startupId },
          { 
            $set: { 
              latestSnapshotId: snapshotId,
              updatedAt: new Date()
            }
          }
        );
      
    } catch (error) {
      console.error('Error updating latest snapshot:', error);
      throw error;
    }
  }
  
  /**
   * Get progress trends for a startup
   */
  async getProgressTrends(startupId, options = {}) {
    const db = await this.getDb();
    
    try {
      const progress = await this.getProgress(startupId);
      if (!progress) {
        return null;
      }
      
      const lookbackPeriod = options.lookbackPeriod || 10;
      const recentHistory = progress.scoreHistory.slice(-lookbackPeriod);
      
      if (recentHistory.length < 2) {
        return {
          trend: 'insufficient_data',
          recentScores: recentHistory,
          averageScore: progress.currentScore,
          totalDelta: 0,
          momentum: 'unknown'
        };
      }
      
      // Calculate trend metrics
      const scores = recentHistory.map(h => h.score);
      const deltas = recentHistory.map(h => h.delta);
      
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const totalDelta = scores[scores.length - 1] - scores[0];
      
      // Calculate momentum (recent vs earlier performance)
      const recentAvg = scores.slice(-3).reduce((sum, score) => sum + score, 0) / Math.min(3, scores.length);
      const earlierAvg = scores.slice(0, -3).reduce((sum, score) => sum + score, 0) / Math.max(1, scores.length - 3);
      
      let momentum = 'stable';
      if (recentAvg > earlierAvg + 5) momentum = 'accelerating';
      else if (recentAvg < earlierAvg - 5) momentum = 'declining';
      
      return {
        trend: progress.getScoreTrend(lookbackPeriod),
        recentScores: recentHistory,
        averageScore: Math.round(averageScore),
        totalDelta,
        momentum,
        volatility: this.calculateVolatility(deltas)
      };
      
    } catch (error) {
      console.error('Error getting progress trends:', error);
      throw error;
    }
  }
  
  /**
   * Get leaderboard of top performing startups
   */
  async getLeaderboard(options = {}) {
    const db = await this.getDb();
    
    try {
      const limit = options.limit || 10;
      
      const leaderboard = await db.collection('progressStates')
        .find({ currentScore: { $gt: 0 } })
        .sort({ currentScore: -1, submissionCount: -1, updatedAt: -1 })
        .limit(limit)
        .toArray();
      
      return leaderboard.map((doc, index) => ({
        rank: index + 1,
        ...ProgressState.fromDocument(doc).toDocument(),
        rankChange: null // Could be calculated by comparing with previous leaderboard
      }));
      
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }
  
  /**
   * Get award potential analysis
   */
  async getAwardPotential(startupId) {
    const db = await this.getDb();
    
    try {
      const progress = await this.getProgress(startupId);
      if (!progress) {
        return null;
      }
      
      // Count active award flags
      const activeAwards = Object.entries(progress.awardFlags)
        .filter(([_, active]) => active)
        .map(([award, _]) => award);
      
      // Get potential awards based on criteria scores
      const potentialAwards = [];
      
      Object.entries(progress.criteriaScores).forEach(([criterion, score]) => {
        if (score >= 80) {
          // Map criteria to potential awards
          const awardMapping = {
            innovation: ['technicalInnovation', 'disruptiveTech', 'moonshot'],
            technical: ['technicalInnovation', 'aiIntegration'],
            business: ['businessViability', 'marketPotential'],
            presentation: ['presentationExcellence'],
            impact: ['socialImpact'],
            execution: ['userExperience', 'rapidDevelopment']
          };
          
          if (awardMapping[criterion]) {
            potentialAwards.push(...awardMapping[criterion]);
          }
        }
      });
      
      // Remove duplicates and already active awards
      const uniquePotentialAwards = [...new Set(potentialAwards)]
        .filter(award => !activeAwards.includes(award));
      
      return {
        activeAwards,
        potentialAwards: uniquePotentialAwards,
        totalPotential: activeAwards.length + uniquePotentialAwards.length,
        readinessScore: this.calculateReadinessScore(progress),
        recommendations: this.generateAwardRecommendations(progress)
      };
      
    } catch (error) {
      console.error('Error getting award potential:', error);
      throw error;
    }
  }
  
  /**
   * Calculate volatility from deltas
   */
  calculateVolatility(deltas) {
    if (deltas.length < 2) return 0;
    
    const mean = deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
    const variance = deltas.reduce((sum, delta) => sum + Math.pow(delta - mean, 2), 0) / deltas.length;
    
    return Math.sqrt(variance);
  }
  
  /**
   * Calculate readiness score for awards
   */
  calculateReadinessScore(progress) {
    let score = 0;
    
    // Base criteria
    if (progress.submissionCount >= 3) score += 20;
    if (progress.currentScore >= 70) score += 30;
    if (progress.readinessState === 'verified') score += 25;
    else if (progress.readinessState === 'asserted') score += 15;
    
    // Recent activity
    const daysSinceUpdate = (Date.now() - progress.updatedAt.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceUpdate < 1) score += 15;
    else if (daysSinceUpdate < 3) score += 10;
    
    // Award potential
    const activeAwards = Object.values(progress.awardFlags).filter(Boolean).length;
    score += Math.min(10, activeAwards * 2);
    
    return Math.min(100, score);
  }
  
  /**
   * Generate award-specific recommendations
   */
  generateAwardRecommendations(progress) {
    const recommendations = [];
    
    if (progress.criteriaScores.innovation >= 75) {
      recommendations.push('Strong innovation score - highlight technical novelty for Technical Innovation award');
    }
    
    if (progress.criteriaScores.business >= 75) {
      recommendations.push('Good business fundamentals - focus on market validation for Business Viability award');
    }
    
    if (progress.criteriaScores.presentation >= 80) {
      recommendations.push('Excellent presentation - perfect candidate for Presentation Excellence award');
    }
    
    if (progress.submissionCount >= 5) {
      recommendations.push('High activity level - emphasize rapid development for Rapid Development award');
    }
    
    if (progress.currentScore < 70) {
      recommendations.push('Increase overall score through more comprehensive submissions');
    }
    
    return recommendations;
  }
}