#!/usr/bin/env node
/**
 * Main CLI for HackRadar Evaluation System
 */

import { program } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { connectDB, disconnectDB, testConnection, getStats, healthCheck } from '../lib/database.js';
import { EvaluationService } from '../services/EvaluationService.js';
import { ProgressService } from '../services/ProgressService.js';

// Load environment variables
dotenv.config();

// Initialize services
const evaluationService = new EvaluationService();
const progressService = new ProgressService();

program
  .name('hackradar-eval')
  .description('HackRadar Evaluation System CLI')
  .version('1.0.0');

// Database commands
program
  .command('db:test')
  .description('Test database connection')
  .action(async () => {
    console.log(chalk.blue('Testing database connection...'));
    try {
      const isConnected = await testConnection();
      if (isConnected) {
        console.log(chalk.green('✅ Database connection successful'));
      } else {
        console.log(chalk.red('❌ Database connection failed'));
      }
    } catch (error) {
      console.log(chalk.red('❌ Database connection error:', error.message));
    }
    await disconnectDB();
  });

program
  .command('db:stats')
  .description('Show database statistics')
  .action(async () => {
    console.log(chalk.blue('Getting database statistics...'));
    try {
      const stats = await getStats();
      console.log(chalk.green('📊 Database Statistics:'));
      Object.entries(stats).forEach(([collection, data]) => {
        console.log(`  ${collection}: ${chalk.yellow(data.count)} documents`);
      });
    } catch (error) {
      console.log(chalk.red('❌ Error getting stats:', error.message));
    }
    await disconnectDB();
  });

program
  .command('db:health')
  .description('Show database health status')
  .action(async () => {
    console.log(chalk.blue('Checking database health...'));
    try {
      const health = await healthCheck();
      console.log(`Status: ${health.status === 'healthy' ? chalk.green('✅ Healthy') : chalk.red('❌ Unhealthy')}`);
      console.log(`Response Time: ${chalk.yellow(health.responseTime)}ms`);
      console.log(`Timestamp: ${chalk.gray(health.timestamp)}`);
      
      if (health.collections) {
        console.log('\nCollections:');
        Object.entries(health.collections).forEach(([collection, data]) => {
          console.log(`  ${collection}: ${chalk.yellow(data.count)} documents`);
        });
      }
    } catch (error) {
      console.log(chalk.red('❌ Health check error:', error.message));
    }
    await disconnectDB();
  });

// Evaluation commands
program
  .command('eval:text')
  .description('Evaluate a text submission')
  .requiredOption('-s, --startup <id>', 'Startup ID')
  .requiredOption('-t, --text <content>', 'Text content to evaluate')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    console.log(chalk.blue('Evaluating text submission...'));
    try {
      await connectDB();
      
      const result = await evaluationService.evaluateText(
        options.startup,
        options.text,
        { verbose: options.verbose }
      );
      
      console.log(chalk.green('✅ Text evaluation completed'));
      console.log(`Score: ${chalk.yellow(result.overallScore)}/100`);
      console.log(`Confidence: ${chalk.yellow((result.confidence * 100).toFixed(1))}%`);
      
      if (options.verbose) {
        console.log('\nFeedback:');
        console.log(chalk.gray(result.feedback));
        
        if (result.insights.strengths.length > 0) {
          console.log('\nStrengths:');
          result.insights.strengths.forEach(strength => {
            console.log(chalk.green(`  + ${strength}`));
          });
        }
        
        if (result.insights.recommendations.length > 0) {
          console.log('\nRecommendations:');
          result.insights.recommendations.forEach(rec => {
            console.log(chalk.yellow(`  • ${rec}`));
          });
        }
      }
      
    } catch (error) {
      console.log(chalk.red('❌ Error:', error.message));
    }
    await disconnectDB();
  });

program
  .command('eval:web')
  .description('Evaluate a web submission')
  .requiredOption('-s, --startup <id>', 'Startup ID')
  .requiredOption('-u, --url <url>', 'URL to evaluate')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    console.log(chalk.blue('Evaluating web submission...'));
    try {
      await connectDB();
      
      const result = await evaluationService.evaluateWeb(
        options.startup,
        options.url,
        { verbose: options.verbose }
      );
      
      console.log(chalk.green('✅ Web evaluation completed'));
      console.log(`Score: ${chalk.yellow(result.overallScore)}/100`);
      console.log(`Confidence: ${chalk.yellow((result.confidence * 100).toFixed(1))}%`);
      
      if (options.verbose) {
        console.log('\nFeedback:');
        console.log(chalk.gray(result.feedback));
        
        if (result.insights.strengths.length > 0) {
          console.log('\nStrengths:');
          result.insights.strengths.forEach(strength => {
            console.log(chalk.green(`  + ${strength}`));
          });
        }
        
        if (result.insights.recommendations.length > 0) {
          console.log('\nRecommendations:');
          result.insights.recommendations.forEach(rec => {
            console.log(chalk.yellow(`  • ${rec}`));
          });
        }
      }
      
    } catch (error) {
      console.log(chalk.red('❌ Error:', error.message));
    }
    await disconnectDB();
  });

// Progress tracking commands
program
  .command('progress:show')
  .description('Show progress for a startup')
  .requiredOption('-s, --startup <id>', 'Startup ID')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    console.log(chalk.blue('Getting progress information...'));
    try {
      await connectDB();
      
      const progress = await progressService.getProgress(options.startup);
      
      if (!progress) {
        console.log(chalk.yellow('⚠️ No progress found for this startup'));
        return;
      }
      
      console.log(chalk.green(`📊 Progress for ${progress.teamName || progress.startupId}:`));
      console.log(`Current Score: ${chalk.yellow(progress.currentScore)}/100`);
      console.log(`Submissions: ${chalk.yellow(progress.submissionCount)}`);
      console.log(`Readiness: ${getReadinessColor(progress.readinessState)(progress.readinessState)}`);
      console.log(`Last Updated: ${chalk.gray(progress.updatedAt)}`);
      
      if (options.verbose) {
        console.log('\nScore History:');
        progress.scoreHistory.slice(-5).forEach(entry => {
          const deltaColor = entry.delta > 0 ? chalk.green : entry.delta < 0 ? chalk.red : chalk.gray;
          console.log(`  ${chalk.gray(entry.timestamp.toISOString().split('T')[0])} - Score: ${chalk.yellow(entry.score)} ${deltaColor(`(${entry.delta > 0 ? '+' : ''}${entry.delta})`)}`);
        });
        
        console.log('\nAward Flags:');
        Object.entries(progress.awardFlags).forEach(([flag, value]) => {
          if (value) {
            console.log(chalk.green(`  ✅ ${flag}`));
          }
        });
      }
      
    } catch (error) {
      console.log(chalk.red('❌ Error:', error.message));
    }
    await disconnectDB();
  });

program
  .command('progress:list')
  .description('List all startups with progress')
  .option('-l, --limit <number>', 'Limit number of results', '10')
  .option('-s, --sort <field>', 'Sort by field (score, submissions, updated)', 'score')
  .action(async (options) => {
    console.log(chalk.blue('Listing startup progress...'));
    try {
      await connectDB();
      
      const progressList = await progressService.getAllProgress({
        limit: parseInt(options.limit),
        sortBy: options.sort
      });
      
      console.log(chalk.green(`📋 Found ${progressList.length} startups:`));
      console.log('');
      
      progressList.forEach((progress, index) => {
        const rank = index + 1;
        const readinessIcon = progress.readinessState === 'verified' ? '✅' : 
                             progress.readinessState === 'asserted' ? '⚠️' : '❌';
        
        console.log(`${chalk.yellow(rank.toString().padStart(2))}. ${chalk.bold(progress.teamName || progress.startupId)}`);
        console.log(`    Score: ${chalk.yellow(progress.currentScore)}/100 | Submissions: ${chalk.cyan(progress.submissionCount)} | ${readinessIcon} ${progress.readinessState}`);
      });
      
    } catch (error) {
      console.log(chalk.red('❌ Error:', error.message));
    }
    await disconnectDB();
  });

// Snapshot commands
program
  .command('snapshot:create')
  .description('Create a snapshot for a startup')
  .requiredOption('-s, --startup <id>', 'Startup ID')
  .option('-t, --trigger <event>', 'Trigger event', 'manual')
  .action(async (options) => {
    console.log(chalk.blue('Creating snapshot...'));
    try {
      await connectDB();
      
      const snapshot = await evaluationService.createSnapshot(options.startup, options.trigger);
      
      console.log(chalk.green('✅ Snapshot created'));
      console.log(`Snapshot ID: ${chalk.yellow(snapshot._id)}`);
      console.log(`Overall Score: ${chalk.yellow(snapshot.aggregatedScores.overall)}/100`);
      console.log(`Submissions: ${chalk.cyan(snapshot.submissions.length)}`);
      console.log(`Evaluations: ${chalk.cyan(snapshot.evaluations.length)}`);
      
    } catch (error) {
      console.log(chalk.red('❌ Error:', error.message));
    }
    await disconnectDB();
  });

program
  .command('snapshot:compare')
  .description('Compare two snapshots for delta analysis')
  .requiredOption('-c, --current <id>', 'Current snapshot ID')
  .requiredOption('-p, --previous <id>', 'Previous snapshot ID')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    console.log(chalk.blue('Comparing snapshots...'));
    try {
      await connectDB();
      
      const comparison = await evaluationService.compareSnapshots(
        options.current, 
        options.previous
      );
      
      console.log(chalk.green('📊 Snapshot Comparison Results:'));
      console.log(`Type: ${chalk.yellow(comparison.type)}`);
      console.log(`Summary: ${chalk.gray(comparison.summary)}`);
      
      if (comparison.changes.length > 0) {
        console.log('\nChanges Detected:');
        comparison.changes.forEach(change => {
          const icon = change.significant ? '🔥' : '📝';
          const color = change.delta > 0 ? chalk.green : change.delta < 0 ? chalk.red : chalk.yellow;
          
          console.log(`  ${icon} ${change.field}: ${color(change.oldValue)} → ${color(change.newValue)}`);
          if (change.delta) {
            console.log(`     ${color(`Delta: ${change.delta > 0 ? '+' : ''}${change.delta}`)}`);
          }
        });
      } else {
        console.log(chalk.gray('No significant changes detected.'));
      }
      
    } catch (error) {
      console.log(chalk.red('❌ Error:', error.message));
    }
    await disconnectDB();
  });

// Utility functions
function getReadinessColor(state) {
  switch (state) {
    case 'verified': return chalk.green;
    case 'asserted': return chalk.yellow;
    case 'not_ready': return chalk.red;
    default: return chalk.gray;
  }
}

// Error handling
process.on('uncaughtException', async (error) => {
  console.error(chalk.red('💥 Uncaught Exception:'), error);
  await disconnectDB();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error(chalk.red('💥 Unhandled Rejection at:'), promise, 'reason:', reason);
  await disconnectDB();
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n🛑 Received SIGINT, shutting down gracefully...'));
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\n🛑 Received SIGTERM, shutting down gracefully...'));
  await disconnectDB();
  process.exit(0);
});

// Parse and execute
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}