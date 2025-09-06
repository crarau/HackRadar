#!/usr/bin/env node
/**
 * Simulation CLI for HackRadar Evaluation System
 * 
 * Creates realistic test scenarios to validate the evaluation system
 */

import { program } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { connectDB, disconnectDB, cleanupTestData } from '../lib/database.js';
import { EvaluationService } from '../services/EvaluationService.js';
import { ProgressService } from '../services/ProgressService.js';

// Load environment variables
dotenv.config();

// Initialize services
const evaluationService = new EvaluationService();
const progressService = new ProgressService();

program
  .name('hackradar-simulate')
  .description('Simulation scripts for HackRadar Evaluation System')
  .version('1.0.0');

// Sample data for simulations
const SAMPLE_TEAMS = [
  {
    id: 'test-aibuddy',
    name: 'AI Buddy',
    email: 'team@aibuddy.test',
    description: 'An AI-powered personal assistant that helps users manage their daily tasks, schedule meetings, and provides intelligent recommendations. Built with React, Node.js, and OpenAI GPT-4.',
    website: 'https://github.com/example/aibuddy',
    pitchText: 'AI Buddy revolutionizes personal productivity by providing an intelligent assistant that learns from your habits and preferences. Our solution integrates seamlessly with existing productivity tools and uses advanced NLP to understand natural language commands.'
  },
  {
    id: 'test-ecotrack',
    name: 'EcoTracker',
    email: 'team@ecotrack.test',
    description: 'A sustainability tracking platform that helps individuals and businesses monitor their carbon footprint, set environmental goals, and track progress towards sustainability targets.',
    website: 'https://github.com/example/ecotrack',
    pitchText: 'EcoTracker makes sustainability tangible and actionable. By gamifying environmental responsibility and providing clear metrics, we help users reduce their carbon footprint while building sustainable habits.'
  },
  {
    id: 'test-medconnect',
    name: 'MedConnect',
    email: 'team@medconnect.test',
    description: 'A telemedicine platform connecting patients with healthcare providers through secure video calls, appointment scheduling, and digital health records management.',
    website: 'https://github.com/example/medconnect',
    pitchText: 'MedConnect bridges the gap between patients and healthcare providers with a secure, HIPAA-compliant telemedicine platform. Our solution reduces wait times, increases access to care, and improves patient outcomes.'
  }
];

const SAMPLE_WEBSITES = [
  'https://www.stripe.com',
  'https://www.notion.so',
  'https://www.figma.com',
  'https://openai.com',
  'https://vercel.com'
];

program
  .command('create-teams')
  .description('Create sample test teams')
  .option('-c, --count <number>', 'Number of teams to create', '3')
  .action(async (options) => {
    console.log(chalk.blue('Creating sample test teams...'));
    try {
      await connectDB();
      
      const count = Math.min(parseInt(options.count), SAMPLE_TEAMS.length);
      const teamsToCreate = SAMPLE_TEAMS.slice(0, count);
      
      for (const team of teamsToCreate) {
        console.log(chalk.cyan(`Creating team: ${team.name}`));
        
        // Create initial progress state
        await progressService.getOrCreateProgress(team.id, team.name, team.email);
        
        console.log(chalk.green(`✅ Created team ${team.name}`));
      }
      
      console.log(chalk.green(`🎉 Created ${count} test teams successfully`));
      
    } catch (error) {
      console.log(chalk.red('❌ Error creating teams:', error.message));
    }
    await disconnectDB();
  });

program
  .command('simulate-submissions')
  .description('Simulate realistic submission scenarios')
  .option('-t, --team <id>', 'Specific team ID to simulate (default: all test teams)')
  .option('-s, --submissions <number>', 'Number of submissions per team', '3')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    console.log(chalk.blue('Simulating submission scenarios...'));
    try {
      await connectDB();
      
      const teamsToSimulate = options.team ? 
        SAMPLE_TEAMS.filter(t => t.id === options.team) : 
        SAMPLE_TEAMS;
      
      if (teamsToSimulate.length === 0) {
        console.log(chalk.yellow('⚠️ No teams found to simulate'));
        return;
      }
      
      const submissionsPerTeam = parseInt(options.submissions);
      
      for (const team of teamsToSimulate) {
        console.log(chalk.cyan(`\nSimulating submissions for ${team.name}:`));
        
        // Ensure team exists
        await progressService.getOrCreateProgress(team.id, team.name, team.email);
        
        // Text submission - initial pitch
        console.log('  📝 Submitting initial pitch...');
        await evaluationService.evaluateText(team.id, team.pitchText, { verbose: options.verbose });
        await sleep(1000); // Avoid rate limiting
        
        // Web submission - if we have more submissions to make
        if (submissionsPerTeam > 1 && team.website) {
          console.log('  🌐 Submitting website...');
          try {
            await evaluationService.evaluateWeb(team.id, team.website, { verbose: options.verbose });
          } catch (error) {
            console.log(chalk.yellow(`    ⚠️ Web submission failed: ${error.message}`));
          }
          await sleep(1000);
        }
        
        // Additional text submission - project update
        if (submissionsPerTeam > 2) {
          console.log('  📄 Submitting project update...');
          const updateText = generateProjectUpdate(team);
          await evaluationService.evaluateText(team.id, updateText, { verbose: options.verbose });
          await sleep(1000);
        }
        
        // Show progress after submissions
        const progress = await progressService.getProgress(team.id);
        console.log(chalk.green(`  ✅ ${team.name} - Score: ${progress.currentScore}/100, Submissions: ${progress.submissionCount}`));
      }
      
      console.log(chalk.green('\n🎉 Simulation completed successfully'));
      
    } catch (error) {
      console.log(chalk.red('❌ Error in simulation:', error.message));
    }
    await disconnectDB();
  });

program
  .command('test-progression')
  .description('Test score progression over multiple submissions')
  .requiredOption('-t, --team <id>', 'Team ID to test')
  .option('-i, --iterations <number>', 'Number of iterations', '5')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    console.log(chalk.blue('Testing score progression...'));
    try {
      await connectDB();
      
      const teamId = options.team;
      const iterations = parseInt(options.iterations);
      
      // Ensure team exists
      const team = SAMPLE_TEAMS.find(t => t.id === teamId) || { 
        id: teamId, 
        name: teamId, 
        email: `${teamId}@test.com` 
      };
      await progressService.getOrCreateProgress(team.id, team.name, team.email);
      
      console.log(chalk.cyan(`Testing progression for ${team.name || teamId}:`));
      
      const progressionTexts = generateProgressionTexts(team);
      
      for (let i = 0; i < Math.min(iterations, progressionTexts.length); i++) {
        console.log(chalk.yellow(`\nIteration ${i + 1}:`));
        console.log(`  Submitting: ${progressionTexts[i].title}`);
        
        const evaluation = await evaluationService.evaluateText(
          teamId, 
          progressionTexts[i].content,
          { verbose: options.verbose }
        );
        
        const progress = await progressService.getProgress(teamId);
        
        console.log(`  Score: ${chalk.yellow(evaluation.overallScore)}/100`);
        console.log(`  Confidence: ${chalk.yellow((evaluation.confidence * 100).toFixed(1))}%`);
        console.log(`  Total Score: ${chalk.green(progress.currentScore)}/100`);
        console.log(`  Readiness: ${getReadinessColor(progress.readinessState)(progress.readinessState)}`);
        
        if (i > 0) {
          const delta = progress.lastDelta;
          if (delta) {
            const deltaColor = delta.scoreDelta > 0 ? chalk.green : delta.scoreDelta < 0 ? chalk.red : chalk.gray;
            console.log(`  Delta: ${deltaColor(`${delta.scoreDelta > 0 ? '+' : ''}${delta.scoreDelta}`)}`);
          }
        }
        
        await sleep(1500); // Slower for detailed analysis
      }
      
      // Show final progress trends
      const trends = await progressService.getProgressTrends(teamId);
      console.log(chalk.blue('\n📈 Final Progress Analysis:'));
      console.log(`  Trend: ${chalk.yellow(trends.trend)}`);
      console.log(`  Momentum: ${chalk.yellow(trends.momentum)}`);
      console.log(`  Average Score: ${chalk.yellow(trends.averageScore)}/100`);
      console.log(`  Total Delta: ${chalk.yellow(trends.totalDelta)}`);
      
    } catch (error) {
      console.log(chalk.red('❌ Error in progression test:', error.message));
    }
    await disconnectDB();
  });

program
  .command('benchmark-agents')
  .description('Benchmark evaluation agent performance')
  .option('-s, --samples <number>', 'Number of samples per agent', '3')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    console.log(chalk.blue('Benchmarking evaluation agents...'));
    try {
      await connectDB();
      
      const samples = parseInt(options.samples);
      const testTeamId = 'test-benchmark';
      
      // Test samples for each agent type
      const testCases = {
        text: [
          'We are building an innovative AI-powered solution that revolutionizes how people interact with technology.',
          'Our startup focuses on sustainable energy solutions using blockchain and IoT technologies to create smart grid systems.',
          'MediTrack is a comprehensive healthcare platform that connects patients, doctors, and insurance providers through a secure, HIPAA-compliant interface.'
        ],
        web: SAMPLE_WEBSITES.slice(0, samples)
      };
      
      const results = {};
      
      // Test text agent
      console.log(chalk.cyan('\n🔤 Testing Text Evaluation Agent:'));
      results.text = [];
      
      for (let i = 0; i < Math.min(samples, testCases.text.length); i++) {
        const startTime = Date.now();
        
        try {
          const evaluation = await evaluationService.evaluateText(
            `${testTeamId}-text-${i}`,
            testCases.text[i],
            { verbose: options.verbose }
          );
          
          const duration = Date.now() - startTime;
          results.text.push({
            duration,
            score: evaluation.overallScore,
            confidence: evaluation.confidence,
            qualityScore: evaluation.qualityScore
          });
          
          console.log(`  Sample ${i + 1}: ${chalk.green('✅')} ${duration}ms - Score: ${evaluation.overallScore}/100`);
          
        } catch (error) {
          console.log(`  Sample ${i + 1}: ${chalk.red('❌')} Error: ${error.message}`);
          results.text.push({ error: error.message, duration: Date.now() - startTime });
        }
        
        await sleep(1000);
      }
      
      // Test web agent
      console.log(chalk.cyan('\n🌐 Testing Web Evaluation Agent:'));
      results.web = [];
      
      for (let i = 0; i < Math.min(samples, testCases.web.length); i++) {
        const startTime = Date.now();
        
        try {
          const evaluation = await evaluationService.evaluateWeb(
            `${testTeamId}-web-${i}`,
            testCases.web[i],
            { verbose: options.verbose }
          );
          
          const duration = Date.now() - startTime;
          results.web.push({
            duration,
            score: evaluation.overallScore,
            confidence: evaluation.confidence,
            qualityScore: evaluation.qualityScore
          });
          
          console.log(`  Sample ${i + 1}: ${chalk.green('✅')} ${duration}ms - Score: ${evaluation.overallScore}/100`);
          
        } catch (error) {
          console.log(`  Sample ${i + 1}: ${chalk.red('❌')} Error: ${error.message}`);
          results.web.push({ error: error.message, duration: Date.now() - startTime });
        }
        
        await sleep(2000); // Web requests need more time
      }
      
      // Show benchmark results
      console.log(chalk.blue('\n📊 Benchmark Results:'));
      
      Object.entries(results).forEach(([agentType, agentResults]) => {
        const successful = agentResults.filter(r => !r.error);
        const failed = agentResults.filter(r => r.error);
        
        console.log(chalk.yellow(`\n${agentType.toUpperCase()} Agent:`));
        console.log(`  Success Rate: ${successful.length}/${agentResults.length} (${((successful.length/agentResults.length)*100).toFixed(1)}%)`);
        
        if (successful.length > 0) {
          const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
          const avgScore = successful.reduce((sum, r) => sum + r.score, 0) / successful.length;
          const avgConfidence = successful.reduce((sum, r) => sum + r.confidence, 0) / successful.length;
          
          console.log(`  Avg Duration: ${Math.round(avgDuration)}ms`);
          console.log(`  Avg Score: ${Math.round(avgScore)}/100`);
          console.log(`  Avg Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
        }
        
        if (failed.length > 0) {
          console.log(`  Failures: ${failed.length}`);
          failed.forEach((failure, index) => {
            console.log(`    ${index + 1}. ${failure.error}`);
          });
        }
      });
      
    } catch (error) {
      console.log(chalk.red('❌ Error in benchmarking:', error.message));
    }
    await disconnectDB();
  });

program
  .command('test-deltas')
  .description('Test delta comparison functionality')
  .requiredOption('-t, --team <id>', 'Team ID to test')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    console.log(chalk.blue('Testing delta comparison...'));
    try {
      await connectDB();
      
      const teamId = options.team;
      
      // Create initial snapshot
      console.log('📸 Creating initial snapshot...');
      const initialSnapshot = await evaluationService.createSnapshot(teamId, 'test_initial');
      console.log(`Initial snapshot: ${initialSnapshot._id} - Score: ${initialSnapshot.aggregatedScores.overall}`);
      
      // Add some submissions
      console.log('\n📝 Adding submissions...');
      await evaluationService.evaluateText(teamId, 'Updated project description with more technical details and market analysis.');
      await sleep(1000);
      
      await evaluationService.evaluateText(teamId, 'Completed MVP development. Added user authentication, dashboard, and reporting features.');
      await sleep(1000);
      
      // Create second snapshot
      console.log('\n📸 Creating updated snapshot...');
      const updatedSnapshot = await evaluationService.createSnapshot(teamId, 'test_updated');
      console.log(`Updated snapshot: ${updatedSnapshot._id} - Score: ${updatedSnapshot.aggregatedScores.overall}`);
      
      // Compare snapshots
      console.log('\n🔍 Comparing snapshots...');
      const comparison = await evaluationService.compareSnapshots(
        updatedSnapshot._id,
        initialSnapshot._id
      );
      
      console.log(chalk.green('📊 Delta Comparison Results:'));
      console.log(`Type: ${chalk.yellow(comparison.type)}`);
      console.log(`Summary: ${chalk.gray(comparison.summary)}`);
      
      if (comparison.changes.length > 0) {
        console.log('\nDetected Changes:');
        comparison.changes.forEach(change => {
          const icon = change.significant ? '🔥' : '📝';
          const color = change.delta > 0 ? chalk.green : change.delta < 0 ? chalk.red : chalk.yellow;
          
          console.log(`  ${icon} ${change.field}: ${color(change.oldValue)} → ${color(change.newValue)}`);
          if (change.delta !== undefined) {
            console.log(`     ${color(`Delta: ${change.delta > 0 ? '+' : ''}${change.delta}`)}`);
          }
        });
      }
      
    } catch (error) {
      console.log(chalk.red('❌ Error in delta testing:', error.message));
    }
    await disconnectDB();
  });

program
  .command('cleanup')
  .description('Clean up test data')
  .option('-f, --force', 'Force cleanup without confirmation')
  .action(async (options) => {
    if (!options.force) {
      console.log(chalk.yellow('⚠️  This will delete all test data. Use --force to confirm.'));
      return;
    }
    
    console.log(chalk.blue('Cleaning up test data...'));
    try {
      await connectDB();
      await cleanupTestData();
      console.log(chalk.green('✅ Test data cleanup completed'));
    } catch (error) {
      console.log(chalk.red('❌ Error cleaning up:', error.message));
    }
    await disconnectDB();
  });

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getReadinessColor(state) {
  switch (state) {
    case 'verified': return chalk.green;
    case 'asserted': return chalk.yellow;
    case 'not_ready': return chalk.red;
    default: return chalk.gray;
  }
}

function generateProjectUpdate(team) {
  const updates = [
    `Great progress on ${team.name}! We've completed the core functionality and are now focusing on user experience improvements. Added real-time notifications, improved dashboard performance, and integrated with third-party APIs.`,
    `Major milestone reached for ${team.name}. We've successfully onboarded 50 beta users and received valuable feedback. Based on user insights, we've pivoted our pricing model and added enterprise features.`,
    `Technical breakthrough on ${team.name}! Implemented advanced machine learning algorithms that improved accuracy by 40%. Also completed security audit and achieved SOC 2 compliance.`
  ];
  
  return updates[Math.floor(Math.random() * updates.length)];
}

function generateProgressionTexts(team) {
  return [
    {
      title: 'Initial Concept',
      content: `${team.name} is an innovative solution that aims to solve real-world problems through technology.`
    },
    {
      title: 'Detailed Pitch',
      content: team.pitchText || `${team.name} leverages cutting-edge technology to provide users with an exceptional experience. Our solution addresses key market needs while maintaining scalability and user-friendliness.`
    },
    {
      title: 'Technical Implementation',
      content: `${team.name} technical stack includes React frontend, Node.js backend, MongoDB database, and AWS cloud infrastructure. We've implemented JWT authentication, RESTful APIs, and real-time WebSocket connections.`
    },
    {
      title: 'Market Validation',
      content: `Market research for ${team.name} shows strong demand with 78% of surveyed users expressing interest. We've identified key competitors and differentiated through superior user experience and innovative features.`
    },
    {
      title: 'Business Model',
      content: `${team.name} business model focuses on SaaS subscription with tiered pricing. Revenue projections show $100k ARR potential within 12 months, with enterprise features driving premium subscriptions.`
    }
  ];
}

program.parse();

if (!process.argv.slice(2).length) {
  program.outputHelp();
}