/**
 * Evaluation Service
 * 
 * Coordinates the evaluation process, manages agents, and handles
 * submission processing and scoring.
 */

import { getDB } from '../lib/database.js';
import { Submission } from '../models/Submission.js';
import { Evaluation } from '../models/Evaluation.js';
import { Snapshot } from '../models/Snapshot.js';
import { ProgressState } from '../models/ProgressState.js';
import { TextEvaluationAgent } from '../agents/TextEvaluationAgent.js';
import { FileEvaluationAgent } from '../agents/FileEvaluationAgent.js';
import { WebEvaluationAgent } from '../agents/WebEvaluationAgent.js';
import { ProgressService } from './ProgressService.js';

export class EvaluationService {
  constructor() {
    this.agents = {
      text: new TextEvaluationAgent(),
      file: new FileEvaluationAgent(),
      web: new WebEvaluationAgent()
    };
    
    this.progressService = new ProgressService();
  }
  
  /**
   * Evaluate a text submission
   */
  async evaluateText(startupId, textContent, options = {}) {
    const db = await getDB();
    
    try {
      // Create submission
      const submission = new Submission({
        startupId,
        type: 'text',
        submittedAt: new Date(),
        processingStatus: 'pending',
        evaluationStatus: 'pending'
      });
      
      submission.setTextContent(textContent);
      submission.startProcessing();
      
      // Save submission
      const submissionResult = await db.collection('submissions')
        .insertOne(submission.toDocument());
      submission._id = submissionResult.insertedId.toString();
      
      submission.completeProcessing();
      await db.collection('submissions')
        .updateOne({ _id: submissionResult.insertedId }, { 
          $set: { 
            processingStatus: 'completed',
            processedAt: new Date()
          }
        });
      
      if (options.verbose) {
        console.log(`Created submission ${submission._id}`);
      }
      
      // Evaluate with text agent
      const evaluation = await this.agents.text.evaluate(submission);
      
      // Save evaluation
      const evaluationResult = await db.collection('evaluations')
        .insertOne(evaluation.toDocument());
      evaluation._id = evaluationResult.insertedId.toString();
      
      // Update submission with evaluation
      submission.addEvaluationResult(evaluation);
      submission.completeEvaluation();
      
      await db.collection('submissions')
        .updateOne({ _id: submissionResult.insertedId }, { 
          $set: { 
            evaluationStatus: 'completed',
            evaluatedAt: new Date(),
            evaluationResults: submission.evaluationResults
          }
        });
      
      if (options.verbose) {
        console.log(`Created evaluation ${evaluation._id}`);
      }
      
      // Update progress state
      await this.progressService.updateProgress(startupId, evaluation, submission);
      
      // Create snapshot if significant change
      if (evaluation.overallScore > 0) {
        await this.createSnapshot(startupId, 'new_submission');
      }
      
      return evaluation;
      
    } catch (error) {
      console.error('Error in evaluateText:', error);
      throw error;
    }
  }
  
  /**
   * Evaluate a web submission
   */
  async evaluateWeb(startupId, url, options = {}) {
    const db = await getDB();
    
    try {
      // Create submission
      const submission = new Submission({
        startupId,
        type: 'web',
        submittedAt: new Date(),
        processingStatus: 'pending',
        evaluationStatus: 'pending'
      });
      
      // Fetch web content
      submission.startProcessing();
      const webAgent = this.agents.web;
      
      try {
        const webData = await webAgent.fetchWebContent(url);
        submission.setWebContent(url, webData.content, webData.metadata.pageTitle, webData.metadata.description);
      } catch (fetchError) {
        submission.failProcessing(fetchError);
        throw fetchError;
      }
      
      // Save submission
      const submissionResult = await db.collection('submissions')
        .insertOne(submission.toDocument());
      submission._id = submissionResult.insertedId.toString();
      
      submission.completeProcessing();
      await db.collection('submissions')
        .updateOne({ _id: submissionResult.insertedId }, { 
          $set: { 
            processingStatus: 'completed',
            processedAt: new Date()
          }
        });
      
      if (options.verbose) {
        console.log(`Created submission ${submission._id} for URL: ${url}`);
      }
      
      // Evaluate with web agent
      const evaluation = await this.agents.web.evaluate(submission);
      
      // Save evaluation
      const evaluationResult = await db.collection('evaluations')
        .insertOne(evaluation.toDocument());
      evaluation._id = evaluationResult.insertedId.toString();
      
      // Update submission with evaluation
      submission.addEvaluationResult(evaluation);
      submission.completeEvaluation();
      
      await db.collection('submissions')
        .updateOne({ _id: submissionResult.insertedId }, { 
          $set: { 
            evaluationStatus: 'completed',
            evaluatedAt: new Date(),
            evaluationResults: submission.evaluationResults
          }
        });
      
      if (options.verbose) {
        console.log(`Created evaluation ${evaluation._id}`);
      }
      
      // Update progress state
      await this.progressService.updateProgress(startupId, evaluation, submission);
      
      // Create snapshot if significant change
      if (evaluation.overallScore > 0) {
        await this.createSnapshot(startupId, 'new_submission');
      }
      
      return evaluation;
      
    } catch (error) {
      console.error('Error in evaluateWeb:', error);
      throw error;
    }
  }
  
  /**
   * Evaluate a file submission
   */
  async evaluateFile(startupId, fileName, fileType, fileSize, extractedContent, options = {}) {
    const db = await getDB();
    
    try {
      // Create submission
      const submission = new Submission({
        startupId,
        type: 'file',
        submittedAt: new Date(),
        processingStatus: 'pending',
        evaluationStatus: 'pending'
      });
      
      submission.setFileContent(fileName, fileType, fileSize, extractedContent);
      submission.completeProcessing();
      
      // Save submission
      const submissionResult = await db.collection('submissions')
        .insertOne(submission.toDocument());
      submission._id = submissionResult.insertedId.toString();
      
      if (options.verbose) {
        console.log(`Created submission ${submission._id} for file: ${fileName}`);
      }
      
      // Evaluate with file agent
      const evaluation = await this.agents.file.evaluate(submission);
      
      // Save evaluation
      const evaluationResult = await db.collection('evaluations')
        .insertOne(evaluation.toDocument());
      evaluation._id = evaluationResult.insertedId.toString();
      
      // Update submission with evaluation
      submission.addEvaluationResult(evaluation);
      submission.completeEvaluation();
      
      await db.collection('submissions')
        .updateOne({ _id: submissionResult.insertedId }, { 
          $set: { 
            evaluationStatus: 'completed',
            evaluatedAt: new Date(),
            evaluationResults: submission.evaluationResults
          }
        });
      
      if (options.verbose) {
        console.log(`Created evaluation ${evaluation._id}`);
      }
      
      // Update progress state
      await this.progressService.updateProgress(startupId, evaluation, submission);
      
      // Create snapshot if significant change
      if (evaluation.overallScore > 0) {
        await this.createSnapshot(startupId, 'new_submission');
      }
      
      return evaluation;
      
    } catch (error) {
      console.error('Error in evaluateFile:', error);
      throw error;
    }
  }
  
  /**
   * Create a snapshot of current state
   */
  async createSnapshot(startupId, triggerEvent = 'manual') {
    const db = await getDB();
    
    try {
      // Get all submissions for this startup
      const submissions = await db.collection('submissions')
        .find({ startupId })
        .sort({ submittedAt: -1 })
        .toArray();
      
      // Get all evaluations for this startup
      const evaluations = await db.collection('evaluations')
        .find({ startupId })
        .sort({ evaluatedAt: -1 })
        .toArray();
      
      // Create snapshot
      const snapshot = new Snapshot({
        startupId,
        timestamp: new Date(),
        triggerEvent,
        metadata: {
          submissionCount: submissions.length,
          evaluationCount: evaluations.length,
          processingTimeMs: 0,
          version: '1.0'
        }
      });
      
      // Add submissions and evaluations
      submissions.forEach(sub => {
        snapshot.addSubmission(Submission.fromDocument(sub));
      });
      
      evaluations.forEach(evaluation => {
        snapshot.addEvaluation(Evaluation.fromDocument(evaluation));
      });
      
      // Calculate aggregated scores
      snapshot.calculateAggregatedScores();
      
      // Get previous snapshot for comparison
      const previousSnapshot = await db.collection('snapshots')
        .findOne(
          { startupId, _id: { $ne: snapshot._id } },
          { sort: { timestamp: -1 } }
        );
      
      if (previousSnapshot) {
        const prevSnapshot = Snapshot.fromDocument(previousSnapshot);
        snapshot.compareWith(prevSnapshot);
      }
      
      // Save snapshot
      const result = await db.collection('snapshots')
        .insertOne(snapshot.toDocument());
      snapshot._id = result.insertedId.toString();
      
      // Update progress state with latest snapshot
      await this.progressService.updateLatestSnapshot(startupId, snapshot._id);
      
      return snapshot;
      
    } catch (error) {
      console.error('Error creating snapshot:', error);
      throw error;
    }
  }
  
  /**
   * Compare two snapshots
   */
  async compareSnapshots(currentSnapshotId, previousSnapshotId) {
    const db = await getDB();
    
    try {
      const [currentDoc, previousDoc] = await Promise.all([
        db.collection('snapshots').findOne({ _id: currentSnapshotId }),
        db.collection('snapshots').findOne({ _id: previousSnapshotId })
      ]);
      
      if (!currentDoc) throw new Error('Current snapshot not found');
      if (!previousDoc) throw new Error('Previous snapshot not found');
      
      const currentSnapshot = Snapshot.fromDocument(currentDoc);
      const previousSnapshot = Snapshot.fromDocument(previousDoc);
      
      return currentSnapshot.compareWith(previousSnapshot);
      
    } catch (error) {
      console.error('Error comparing snapshots:', error);
      throw error;
    }
  }
  
  /**
   * Get evaluation history for a startup
   */
  async getEvaluationHistory(startupId, options = {}) {
    const db = await getDB();
    
    try {
      const limit = options.limit || 10;
      const skip = options.skip || 0;
      
      const evaluations = await db.collection('evaluations')
        .find({ startupId })
        .sort({ evaluatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      return evaluations.map(evaluation => Evaluation.fromDocument(evaluation));
      
    } catch (error) {
      console.error('Error getting evaluation history:', error);
      throw error;
    }
  }
  
  /**
   * Get submissions for a startup
   */
  async getSubmissions(startupId, options = {}) {
    const db = await getDB();
    
    try {
      const limit = options.limit || 10;
      const skip = options.skip || 0;
      const type = options.type;
      
      const query = { startupId };
      if (type) query.type = type;
      
      const submissions = await db.collection('submissions')
        .find(query)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      return submissions.map(submission => Submission.fromDocument(submission));
      
    } catch (error) {
      console.error('Error getting submissions:', error);
      throw error;
    }
  }
  
  /**
   * Get snapshots for a startup
   */
  async getSnapshots(startupId, options = {}) {
    const db = await getDB();
    
    try {
      const limit = options.limit || 10;
      const skip = options.skip || 0;
      
      const snapshots = await db.collection('snapshots')
        .find({ startupId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      return snapshots.map(snapshot => Snapshot.fromDocument(snapshot));
      
    } catch (error) {
      console.error('Error getting snapshots:', error);
      throw error;
    }
  }
  
  /**
   * Get agent configurations
   */
  getAgentConfigs() {
    return Object.entries(this.agents).map(([type, agent]) => ({
      type,
      ...agent.getConfig()
    }));
  }
}