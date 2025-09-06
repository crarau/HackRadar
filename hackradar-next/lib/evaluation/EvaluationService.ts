import { Db, ObjectId } from 'mongodb';
import { TextEvaluator, TextEvaluatorResult } from './agents/TextEvaluator';
import { SRTracker, ReadinessChecklist, SRTrackerResult } from './agents/SRTracker';
import { EvaluationScores } from './agents/BaseAgent';

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

    // Get submission history
    const previousSubmissions = await this.db.collection('timeline')
      .find({ 
        projectId,
        'metadata.evaluation': { $exists: true }
      })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    const lastSubmission = previousSubmissions[0];
    const submissionNumber = (lastSubmission?.metadata?.submission_number || 0) + 1;

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
    const [textEval, srEval] = await Promise.all([
      this.textEvaluator.evaluate({
        text: text || '',
        mode: lastSubmission ? 'update' : 'initial',
        previousSummary: lastSubmission?.text
      }),
      this.srTracker.evaluate({
        userMessage,
        currentSnapshot: snapshot,
        progressState: {
          submission_readiness_checklist: project.submission_readiness_checklist
        }
      })
    ]);
    
    // Results are already properly typed
    const textEvalResult = textEval;
    const srEvalResult = srEval;
    
    // Aggregate scores
    const scores = this.aggregateScores(
      textEvalResult,
      srEvalResult
    );
    
    // Calculate delta from previous submission
    let delta: EvaluationDelta | null = null;
    let changes: Record<string, string> = {};
    
    if (lastSubmission?.metadata?.evaluation) {
      const prevScores = lastSubmission.metadata.evaluation;
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

    // Update project with latest evaluation
    await this.db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          currentScore: scores.final_score,
          lastEvaluation: metadata.evaluation,
          submission_readiness_checklist: srEvalResult.checklist_update || {},
          submissionCount: submissionNumber,
          updatedAt: new Date()
        }
      }
    );

    const result = {
      scores,
      delta,
      metadata,
      sr_tracker: {
        readiness_score: srEvalResult.submission_readiness_score || 0,
        checklist: srEvalResult.checklist_update || {},
        questions: srEvalResult.questions || [],
        notes: srEvalResult.notes || []
      }
    };
    
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
    const scores: EvaluationScores = {
      clarity: Math.min(15, textEval.subscores.clarity || 0),
      problem_value: Math.min(20, textEval.subscores.problem_value || 0),
      feasibility: Math.min(15, textEval.subscores.feasibility_signal || 5),
      originality: Math.min(15, textEval.subscores.originality || 5),
      impact_convert: Math.min(20, textEval.subscores.impact_convert || 0),
      submission_readiness: Math.min(15, srEval.submission_readiness_score || 0),
      final_score: 0
    };
    
    scores.final_score = Object.values(scores).reduce((a, b) => a + b, 0) - scores.final_score;
    
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
}