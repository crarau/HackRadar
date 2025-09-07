import { Db, ObjectId } from 'mongodb';
import { TextEvaluator, TextEvaluatorResult } from './agents/TextEvaluator';
import { SRTracker, ReadinessChecklist, SRTrackerResult } from './agents/SRTracker';
import { EvaluationScores, MessageHistory } from './agents/BaseAgent';
import { getDebugLogger } from './DebugLogger';

export interface Submission {
  text?: string;
  files?: Array<{
    name: string;
    type: string;
    size: number;
    data?: string;
  }>;
  url?: string;
  userMessage?: string;
}

export interface EvaluationDelta {
  total_change: number;
  percent_change: number;
  direction: 'up' | 'down' | 'stable';
  category_changes: Array<{
    category: string;
    change: string;
    why: string;
  }>;
}

export interface EvaluationMetadata {
  submission_number: number;
  score: number;
  delta: EvaluationDelta | null;
  readiness_score: number;
  evaluation: {
    clarity: number;
    problem_value: number;
    feasibility: number;
    originality: number;
    impact: number;
    submission_readiness: number;
    final_score: number;
    feedback: {
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
    };
    changes?: Record<string, string>;
  };
}

export class EvaluationService {
  private db: Db;
  private textEvaluator: TextEvaluator;
  private srTracker: SRTracker;

  constructor(db: Db) {
    this.db = db;
    this.textEvaluator = new TextEvaluator();
    this.srTracker = new SRTracker();
  }

  async evaluateSubmission(projectId: string, submission: Submission, addDelay: boolean = true): Promise<{
    scores: EvaluationScores;
    delta: EvaluationDelta | null;
    metadata: EvaluationMetadata;
    textEval: TextEvaluatorResult;
    sr_tracker: {
      readiness_score: number;
      checklist: ReadinessChecklist;
      questions: string[];
      notes: string[];
    };
  }> {
    const { text, files, url, userMessage } = submission;
    
    console.log('\n' + '🚀'.repeat(40));
    console.log('🎯 [EvaluationService] STARTING NEW EVALUATION');
    console.log('🚀'.repeat(40));
    console.log(`Project ID: ${projectId}`);
    console.log(`Has text: ${text ? `Yes (${text.length} chars)` : 'No'}`);
    console.log(`Has files: ${files ? `Yes (${files.length} files)` : 'No'}`);
    console.log(`Has URL: ${url ? 'Yes' : 'No'}`);
    console.log('🚀'.repeat(40) + '\n');
    
    // Get current progress state from database
    const project = await this.db.collection('projects').findOne({ 
      _id: new ObjectId(projectId) 
    });
    
    if (!project) {
      throw new Error('Project not found');
    }

    // Get ALL submission history to build conversation context
    console.log('\n🔍 [EvaluationService] Querying for previous submissions...');
    console.log('  Project ID:', projectId);
    
    const previousSubmissions = await this.db.collection('timeline')
      .find({ 
        projectId,
        'evaluation': { $exists: true }
      })
      .sort({ createdAt: 1 }) // Oldest first to build conversation chronologically
      .toArray();
    
    console.log(`🔍 [EvaluationService] Found ${previousSubmissions.length} previous submissions with evaluations`);
    previousSubmissions.forEach((sub, i) => {
      console.log(`  ${i + 1}. Text: "${sub.text?.substring(0, 50)}..."`);
      console.log(`     Has evaluation: ${!!sub.evaluation}`);
      console.log(`     Evaluation scores: ${sub.evaluation?.scores?.final_score || 'none'}`);
    });

    const lastSubmission = previousSubmissions[previousSubmissions.length - 1];
    const submissionNumber = previousSubmissions.length + 1; // Simply count existing submissions
    
    // Get the conversation ID from the most recent submission
    const conversationId = lastSubmission?.anthropic_conversation_id;
    console.log(`🔗 [EvaluationService] Previous conversation ID: ${conversationId || 'none (starting new)'}`);
    console.log(`📊 [EvaluationService] Submission #${submissionNumber}`);
    
    // Extract previous scores for cumulative evaluation
    const previousScores = lastSubmission?.evaluation?.scores ? {
      clarity: lastSubmission.evaluation.scores.clarity,
      problem_value: lastSubmission.evaluation.scores.problem_value, 
      feasibility_signal: lastSubmission.evaluation.scores.feasibility_signal,
      originality: lastSubmission.evaluation.scores.originality,
      impact_convert: lastSubmission.evaluation.scores.impact_convert,
      final_score: lastSubmission.evaluation.scores.final_score
    } : undefined;
    
    if (previousScores) {
      console.log(`📊 [EvaluationService] Previous scores for cumulative evaluation:`);
      console.log(`   Clarity: ${previousScores.clarity}/15`);
      console.log(`   Problem Value: ${previousScores.problem_value}/20`);
      console.log(`   Feasibility: ${previousScores.feasibility_signal}/10`);
      console.log(`   Originality: ${previousScores.originality}/10`);
      console.log(`   Impact: ${previousScores.impact_convert}/20`);
      console.log(`   Total: ${previousScores.final_score}/100`);
    }
    
    // Build message history from all previous submissions - FORCE SUCCESS
    let messageHistory: any[] = [];
    try {
      messageHistory = this.buildMessageHistory(previousSubmissions as Array<{
      text?: string;
      files?: Array<{ name: string; type: string; size: number }>;
      url?: string;
      evaluation?: {
        scores: {
          final_score: number;
          clarity: number;
          problem_value: number;
          feasibility_signal: number;
          originality: number;
          impact_convert: number;
        };
        evidence: string[];
        gaps: string[];
      };
      anthropic_conversation_id?: string;
      createdAt?: string;
    }>);
    } catch (historyError) {
      console.error('❌ [EvaluationService] MESSAGE HISTORY BUILD FAILED - CONTINUING WITHOUT HISTORY:');
      console.error('  Error:', (historyError as Error)?.message || 'Unknown');
      messageHistory = []; // Continue without history rather than failing completely
    }
    const logger = getDebugLogger();
    
    if (messageHistory.length > 0) {
      logger.log(`📦 Building context from ${previousSubmissions.length} previous submissions`);
      logger.log(`Total message history: ${messageHistory.length} messages`);
    }

    // Create snapshot of current submission
    const snapshot = {
      text,
      files,
      url
    };
    
    // Add processing delay to simulate agent thinking (2-4 seconds)
    if (addDelay) {
      const delayMs = 2000 + Math.random() * 2000; // 2-4 seconds
      console.log(`⏳ Simulating processing delay: ${Math.round(delayMs)}ms`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    console.log('\n🔄 Running evaluations in parallel...');
    // Run evaluations in parallel
    console.log('\n🤖 [EvaluationService] About to run TextEvaluator...');
    console.log('  Text length:', text?.length || 0);
    console.log('  Message history length:', messageHistory.length);
    console.log('  Is update mode:', previousSubmissions.length > 0);
    
    let textEval, srEval;
    try {
      [textEval, srEval] = await Promise.all([
        this.textEvaluator.evaluate({
          text: text || '',
          mode: lastSubmission ? 'update' : 'initial',
          previousSummary: lastSubmission?.text,
          messageHistory,
          isUpdate: previousSubmissions.length > 0,
          conversationId: conversationId,
          previousScores: previousScores
        }),
        this.srTracker.evaluate({
          userMessage,
          currentSnapshot: snapshot,
          progressState: {
            submission_readiness_checklist: project.submission_readiness_checklist
          }
        })
      ]);
      
      console.log('✅ [EvaluationService] Both evaluators completed successfully');
      console.log('  TextEval final_score:', textEval?.subscores?.final_score || 'none');
      console.log('  SRTracker readiness:', srEval?.submission_readiness_score || 0);
      
    } catch (evalError) {
      console.error('❌ [EvaluationService] EVALUATOR FAILED - FORCING BASIC EVALUATION:');
      console.error('  Error:', (evalError as Error)?.message || 'Unknown');
      console.error('  Stack:', (evalError as Error)?.stack || 'No stack');
      
      // FORCE BASIC EVALUATION WITHOUT CONVERSATION HISTORY
      console.log('🔄 [EvaluationService] Attempting basic evaluation without history...');
      try {
        [textEval, srEval] = await Promise.all([
          this.textEvaluator.evaluate({
            text: text || '',
            mode: 'initial', // Force initial mode
            previousSummary: undefined,
            messageHistory: [], // No history
            isUpdate: false,
            conversationId: undefined, // No conversation ID
            previousScores: previousScores // Still pass previous scores for basic evaluation
          }),
          this.srTracker.evaluate({
            userMessage,
            currentSnapshot: snapshot,
            progressState: {
              submission_readiness_checklist: project.submission_readiness_checklist
            }
          })
        ]);
        console.log('✅ [EvaluationService] Basic evaluation succeeded');
      } catch (basicError) {
        console.error('❌ [EvaluationService] EVEN BASIC EVALUATION FAILED:');
        console.error('  Error:', (basicError as Error)?.message || 'Unknown');
        throw basicError; // Re-throw to be caught by timeline API
      }
    }
    
    // Results are already properly typed
    const textEvalResult = textEval;
    const srEvalResult = srEval;
    
    // Aggregate scores
    console.log('\n🔄 [EvaluationService] About to aggregate scores:');
    console.log('TextEval result:', textEvalResult);
    console.log('SRTracker result:', srEvalResult);
    
    const scores = this.aggregateScores(
      textEvalResult,
      srEvalResult
    );
    
    console.log('\n⚙️ [EvaluationService] Aggregated final scores:', scores);
    
    // Calculate delta from previous submission
    let delta: EvaluationDelta | null = null;
    let changes: Record<string, string> = {};
    
    if (lastSubmission?.evaluation?.scores) {
      const prevScores = lastSubmission.evaluation.scores;
      delta = this.calculateDelta(scores, prevScores);
      changes = this.generateChanges(scores, prevScores);
    }
    
    // Prepare evaluation metadata
    const metadata: EvaluationMetadata = {
      submission_number: submissionNumber,
      score: scores.final_score,
      delta,
      readiness_score: srEvalResult.submission_readiness_score || 0,
      evaluation: {
        clarity: scores.clarity,
        problem_value: scores.problem_value,
        feasibility: scores.feasibility,
        originality: scores.originality,
        impact: scores.impact_convert,
        submission_readiness: scores.submission_readiness,
        final_score: scores.final_score,
        feedback: {
          strengths: textEvalResult.evidence || [],
          weaknesses: textEvalResult.gaps || [],
          recommendations: this.generateRecommendations(textEvalResult, srEvalResult, scores)
        },
        changes: Object.keys(changes).length > 0 ? changes : undefined
      }
    };

    // Update project with latest evaluation and detailed scores
    console.log(`\n💾 [EvaluationService] Saving to database:`);
    console.log(`  Project ID: ${projectId}`);
    console.log(`  Final Score: ${scores.final_score} (should match UI)`);
    console.log(`  Category Scores:`, {
      clarity: scores.clarity,
      problem_value: scores.problem_value,
      feasibility: scores.feasibility,
      originality: scores.originality,
      impact_convert: scores.impact_convert,
      submission_readiness: scores.submission_readiness
    });
    console.log(`  Metadata final_score: ${metadata.evaluation.final_score}`);
    
    await this.db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          currentScore: scores.final_score,
          categoryScores: {
            clarity: scores.clarity,
            problem_value: scores.problem_value,
            feasibility: scores.feasibility,
            originality: scores.originality,
            impact_convert: scores.impact_convert,
            submission_readiness: scores.submission_readiness
          },
          lastEvaluation: metadata.evaluation,
          submission_readiness_checklist: srEvalResult.checklist_update || {},
          submissionCount: submissionNumber,
          updatedAt: new Date(),
          lastEvaluatedAt: new Date()
        }
      }
    );
    
    console.log('💾 [EvaluationService] Database update completed');

    const result = {
      scores,
      delta,
      metadata,
      textEval: textEvalResult, // Include full TextEvaluator result
      sr_tracker: {
        readiness_score: srEvalResult.submission_readiness_score || 0,
        checklist: srEvalResult.checklist_update || {},
        questions: srEvalResult.questions || [],
        notes: srEvalResult.notes || []
      }
    };
    
    // Verify the update worked by logging what we're returning
    console.log('\n📤 [EvaluationService] Returning result with scores:');
    console.log('Final score being returned:', result.scores.final_score);
    console.log('Metadata final score:', result.metadata.evaluation.final_score);
    
    console.log('\n' + '🎉'.repeat(40));
    console.log('🏆 [EvaluationService] EVALUATION COMPLETE');
    console.log('🎉'.repeat(40));
    console.log(`Final Score: ${scores.final_score}/100`);
    console.log(`Score Breakdown:`);
    console.log(`  - Clarity: ${scores.clarity}/15`);
    console.log(`  - Problem Value: ${scores.problem_value}/20`);
    console.log(`  - Feasibility: ${scores.feasibility}/15`);
    console.log(`  - Originality: ${scores.originality}/15`);
    console.log(`  - Impact: ${scores.impact_convert}/20`);
    console.log(`  - Readiness: ${scores.submission_readiness}/15`);
    if (delta) {
      console.log(`\nDelta from previous: ${delta.direction === 'up' ? '📈' : delta.direction === 'down' ? '📉' : '➡️'} ${delta.total_change > 0 ? '+' : ''}${delta.total_change} points`);
    }
    console.log('🎉'.repeat(40) + '\n');
    
    return result;
  }

  private aggregateScores(textEval: TextEvaluatorResult, srEval: SRTrackerResult): EvaluationScores {
    // Log what we're aggregating for debugging
    console.log('\n📊 [EvaluationService] Aggregating scores:');
    console.log('TextEval subscores:', textEval.subscores);
    console.log('SRTracker readiness score:', srEval.submission_readiness_score);
    
    // Validate required scores exist - NO FALLBACKS!
    if (!textEval.subscores) {
      throw new Error('TextEvaluator did not return subscores');
    }
    
    if (textEval.subscores.final_score === undefined || textEval.subscores.final_score === null) {
      throw new Error('TextEvaluator did not calculate final_score');
    }
    
    // Use TextEvaluator scores directly - they're already calculated accurately
    const scores: EvaluationScores = {
      clarity: textEval.subscores.clarity!,
      problem_value: textEval.subscores.problem_value!,
      feasibility: textEval.subscores.feasibility_signal!,
      originality: textEval.subscores.originality!,
      impact_convert: textEval.subscores.impact_convert!,
      submission_readiness: Math.min(15, srEval.submission_readiness_score || 0), // SRTracker can be 0
      final_score: textEval.subscores.final_score! + Math.min(15, srEval.submission_readiness_score || 0)
    };
    
    console.log('Aggregated scores:', scores);
    console.log('Final score:', scores.final_score);
    
    return scores;
  }

  private calculateDelta(currentScores: EvaluationScores, previousScores: { final_score?: number; [key: string]: number | undefined }): EvaluationDelta {
    const prevScore = previousScores.final_score || 0;
    const totalChange = currentScores.final_score - prevScore;
    const percentChange = prevScore > 0 
      ? (totalChange / prevScore) * 100 
      : 0;
    
    const delta: EvaluationDelta = {
      total_change: totalChange,
      percent_change: Math.abs(percentChange),
      direction: totalChange > 0 ? 'up' : totalChange < 0 ? 'down' : 'stable',
      category_changes: []
    };
    
    for (const category of ['clarity', 'problem_value', 'feasibility', 'originality', 'impact', 'submission_readiness']) {
      const currentKey = category === 'impact' ? 'impact_convert' : category;
      const prevKey = category;
      
      const current = (currentScores as unknown as Record<string, number>)[currentKey] || 0;
      const previous = previousScores[prevKey] || 0;
      const change = current - previous;
      
      if (Math.abs(change) > 0.5) {
        delta.category_changes.push({
          category,
          change: change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1),
          why: this.explainChange(category, change)
        });
      }
    }
    
    return delta;
  }

  private generateChanges(currentScores: EvaluationScores, previousScores: { [key: string]: number | undefined }): Record<string, string> {
    const changes: Record<string, string> = {};
    
    const categories = [
      { key: 'clarity', label: 'clarity' },
      { key: 'problem_value', label: 'problem_value' },
      { key: 'feasibility', label: 'feasibility' },
      { key: 'originality', label: 'originality' },
      { key: 'impact_convert', label: 'impact', prev: 'impact' },
      { key: 'submission_readiness', label: 'readiness' }
    ];
    
    for (const cat of categories) {
      const current = (currentScores as unknown as Record<string, number>)[cat.key] || 0;
      const previous = previousScores[cat.prev || cat.key] || 0;
      const change = current - previous;
      
      if (Math.abs(change) > 0.5) {
        const sign = change > 0 ? '+' : '';
        const reason = this.explainChange(cat.label, change);
        changes[cat.label] = `${sign}${change.toFixed(0)} (${reason})`;
      }
    }
    
    return changes;
  }

  private explainChange(category: string, change: number): string {
    const improving = change > 0;
    const explanations: Record<string, string> = {
      clarity: improving ? 'Message became clearer' : 'Message clarity decreased',
      problem_value: improving ? 'Better problem articulation' : 'Problem less clear',
      feasibility: improving ? 'More evidence of working solution' : 'Feasibility concerns',
      originality: improving ? 'Innovation highlighted' : 'Less differentiation shown',
      impact: improving ? 'Stronger conversion potential' : 'Weaker call-to-action',
      submission_readiness: improving ? 'More artifacts submitted' : 'Missing components',
      readiness: improving ? 'More artifacts submitted' : 'Missing components'
    };
    return explanations[category] || `${category} ${improving ? 'improved' : 'declined'}`;
  }

  private generateRecommendations(textEval: TextEvaluatorResult, srEval: SRTrackerResult, scores: EvaluationScores): string[] {
    const recommendations: string[] = [];
    
    // Priority fixes from gaps
    if (textEval.gaps && textEval.gaps.length > 0) {
      recommendations.push(...textEval.gaps.slice(0, 2));
    }
    
    // Add missing submission items with point values
    if (srEval.submission_readiness_score < 15) {
      const pointsPossible = 15 - srEval.submission_readiness_score;
      recommendations.push(`Complete submission checklist (+${pointsPossible.toFixed(1)} pts possible)`);
    }
    
    // Add specific recommendations based on low scores
    if (scores.clarity < 10) {
      recommendations.push('Improve message clarity and add compelling hook');
    }
    if (scores.problem_value < 12) {
      recommendations.push('Better articulate the problem and add metrics');
    }
    if (scores.impact_convert < 10) {
      recommendations.push('Add clear call-to-action for conversion');
    }
    
    return recommendations.slice(0, 3);
  }
  
  private buildMessageHistory(submissions: Array<{
    text?: string;
    files?: Array<{ name: string; type: string; size: number }>;
    url?: string;
    evaluation?: {
      scores: {
        final_score: number;
        clarity: number;
        problem_value: number;
        feasibility_signal: number;
        originality: number;
        impact_convert: number;
      };
      evidence: string[];
      gaps: string[];
    };
    createdAt?: string;
  }>): MessageHistory[] {
    const history: MessageHistory[] = [];
    const logger = getDebugLogger();
    
    console.log(`\n🏗️ [buildMessageHistory] Starting with ${submissions.length} submissions`);
    submissions.forEach((sub, i) => {
      console.log(`  ${i + 1}. "${sub.text?.substring(0, 30)}..." - Has eval: ${!!sub.evaluation}`);
    });
    
    // System prompt to establish context
    if (submissions.length > 0) {
      history.push({
        role: 'user',
        content: `You are evaluating a hackathon project. This conversation tracks the project's progress over time. Each message represents a new submission/update. Your task is to evaluate the ENTIRE project based on ALL information provided throughout the conversation, not just individual updates.

IMPORTANT: When scoring, consider the cumulative knowledge about the project. If early submissions establish strong foundations (demo, repository, etc.), those should continue to contribute to scores even if not mentioned in later updates.`
      });
      
      history.push({
        role: 'assistant',
        content: 'I understand. I will evaluate the project holistically based on all information provided across all submissions, maintaining context of what has been established in previous updates.'
      });
    }
    
    // Add each previous submission to the conversation
    for (let i = 0; i < submissions.length; i++) {
      const submission = submissions[i];
      
      // User submission
      const userContent = this.formatSubmissionForHistory(submission, i);
      history.push({
        role: 'user',
        content: userContent
      });
      
      // Assistant evaluation response (simplified)
      const evalResponse = this.formatEvaluationForHistory(submission.evaluation);
      history.push({
        role: 'assistant',
        content: evalResponse
      });
    }
    
    logger.log(`Built conversation with ${history.length} messages from ${submissions.length} submissions`);
    
    return history;
  }
  
  private formatSubmissionForHistory(submission: {
    text?: string;
    files?: Array<{ name: string; type: string; size: number }>;
    url?: string;
    createdAt?: string;
  }, index: number): string {
    const parts: string[] = [];
    
    parts.push(`[Submission #${index + 1}]`);
    
    if (submission.text) {
      parts.push(`Text: ${submission.text}`);
    }
    
    if (submission.files && submission.files.length > 0) {
      const fileList = submission.files.map(f => f.name).join(', ');
      parts.push(`Files uploaded: ${fileList}`);
    }
    
    if (submission.url) {
      parts.push(`URL: ${submission.url}`);
    }
    
    return parts.join('\n');
  }
  
  private formatEvaluationForHistory(evaluation?: {
    scores: {
      final_score: number;
      clarity: number;
      problem_value: number;
      feasibility_signal: number;
      originality: number;
      impact_convert: number;
    };
    evidence: string[];
    gaps: string[];
  }): string {
    if (!evaluation || !evaluation.scores) {
      return 'Evaluation noted.';
    }
    
    const parts: string[] = [];
    
    parts.push(`Score: ${evaluation.scores.final_score}/100`);
    
    if (evaluation.evidence && evaluation.evidence.length > 0) {
      parts.push(`Strengths: ${evaluation.evidence.join('; ')}`);
    }
    
    if (evaluation.gaps && evaluation.gaps.length > 0) {
      parts.push(`Areas for improvement: ${evaluation.gaps.join('; ')}`);
    }
    
    return parts.join('\n');
  }
}