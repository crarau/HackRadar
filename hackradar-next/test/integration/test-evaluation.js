#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import { EvaluationService } from '../../lib/evaluation/EvaluationService.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runIntegrationTest() {
  let client;
  
  try {
    console.log('🧪 Running Evaluation System Integration Test\n');
    console.log('=' .repeat(60));
    
    // Connect to MongoDB
    console.log('📊 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI;
    client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db();
    console.log('✅ Connected to database\n');
    
    // Find or create test user
    console.log('👤 Setting up test user...');
    let testUser = await db.collection('users').findOne({ email: 'test@hackradar.com' });
    
    if (!testUser) {
      const userResult = await db.collection('users').insertOne({
        email: 'test@hackradar.com',
        name: 'Test User',
        createdAt: new Date(),
        role: 'hacker'
      });
      testUser = await db.collection('users').findOne({ _id: userResult.insertedId });
    }
    console.log(`✅ Test user ready: ${testUser.email}\n`);
    
    // Create test project
    console.log('📁 Creating test project...');
    const projectResult = await db.collection('projects').insertOne({
      userEmail: testUser.email,
      teamName: 'Test Team',
      projectName: 'Integration Test Project',
      description: 'Testing evaluation system',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const projectId = projectResult.insertedId.toString();
    console.log(`✅ Test project created: ${projectId}\n`);
    
    // Initialize evaluation service
    const evaluationService = new EvaluationService(db);
    
    // Test 1: Initial submission (text only)
    console.log('📝 Test 1: Initial Text Submission');
    console.log('-' .repeat(40));
    
    const test1 = await evaluationService.evaluateSubmission(projectId, {
      text: 'Building an AI-powered code review assistant that helps developers catch bugs before production.',
      files: [],
      url: null
    });
    
    console.log(`Score: ${test1.scores.final_score}/100`);
    console.log(`Readiness: ${test1.sr_tracker.readiness_score}/15`);
    console.log(`Questions: ${test1.sr_tracker.questions.join(', ') || 'None'}`);
    console.log(`Feedback: ${test1.metadata.evaluation.feedback.strengths.join(', ')}`);
    console.log();
    
    // Test 2: Add files and URL
    console.log('📝 Test 2: Submission with Files and URL');
    console.log('-' .repeat(40));
    
    const test2 = await evaluationService.evaluateSubmission(projectId, {
      text: 'Our AI code reviewer uses GPT-4 to analyze code patterns and detect potential bugs. Demo available at codereview.demo.com. Built during this hackathon weekend.',
      files: [
        { name: 'pitch.pdf', type: 'application/pdf', size: 2000000 },
        { name: 'demo.mp4', type: 'video/mp4', size: 50000000 }
      ],
      url: 'codereview.demo.com'
    });
    
    console.log(`Score: ${test2.scores.final_score}/100`);
    console.log(`Delta: ${test2.delta ? `${test2.delta.direction === 'up' ? '📈' : '📉'} ${test2.delta.total_change > 0 ? '+' : ''}${test2.delta.total_change} points` : 'N/A'}`);
    console.log(`Readiness: ${test2.sr_tracker.readiness_score}/15`);
    console.log(`Verified items: ${Object.entries(test2.sr_tracker.checklist)
      .filter(([k, v]) => v.verified)
      .map(([k]) => k)
      .join(', ')}`);
    console.log();
    
    // Test 3: Add GitHub and screenshots
    console.log('📝 Test 3: Complete Submission');
    console.log('-' .repeat(40));
    
    const test3 = await evaluationService.evaluateSubmission(projectId, {
      text: 'GitHub: github.com/test/ai-reviewer. We have 3 pilot customers testing our solution. Next steps include adding support for more languages.',
      files: [
        { name: 'pitch.pdf', type: 'application/pdf', size: 2000000 },
        { name: 'demo.mp4', type: 'video/mp4', size: 50000000 },
        { name: 'screenshot1.png', type: 'image/png', size: 300000 },
        { name: 'screenshot2.png', type: 'image/png', size: 300000 }
      ],
      url: 'github.com/test/ai-reviewer'
    });
    
    console.log(`Score: ${test3.scores.final_score}/100`);
    console.log(`Delta: ${test3.delta ? `${test3.delta.direction === 'up' ? '📈' : '📉'} ${test3.delta.total_change > 0 ? '+' : ''}${test3.delta.total_change} points (${test3.delta.percent_change.toFixed(1)}%)` : 'N/A'}`);
    console.log(`Readiness: ${test3.sr_tracker.readiness_score}/15`);
    
    if (test3.delta?.category_changes?.length > 0) {
      console.log('Category changes:');
      test3.delta.category_changes.forEach(c => {
        console.log(`  - ${c.category}: ${c.change} (${c.why})`);
      });
    }
    console.log();
    
    // Verify timeline entries
    console.log('📊 Verifying Timeline Entries');
    console.log('-' .repeat(40));
    
    const timelineEntries = await db.collection('timeline')
      .find({ projectId })
      .sort({ createdAt: 1 })
      .toArray();
    
    console.log(`Total timeline entries: ${timelineEntries.length}`);
    
    const scoreUpdates = timelineEntries.filter(e => e.metadata?.type === 'score_update');
    console.log(`Score update entries: ${scoreUpdates.length}`);
    
    const evaluatedEntries = timelineEntries.filter(e => e.evaluationComplete);
    console.log(`Evaluated submissions: ${evaluatedEntries.length}`);
    console.log();
    
    // Check project state
    console.log('📁 Final Project State');
    console.log('-' .repeat(40));
    
    const finalProject = await db.collection('projects').findOne({ _id: projectResult.insertedId });
    console.log(`Current Score: ${finalProject.currentScore}/100`);
    console.log(`Submission Count: ${finalProject.submissionCount || 0}`);
    console.log(`Readiness Checklist Items Verified: ${
      Object.values(finalProject.submission_readiness_checklist || {})
        .filter(item => item.verified).length
    }/8`);
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await db.collection('timeline').deleteMany({ projectId });
    await db.collection('projects').deleteOne({ _id: projectResult.insertedId });
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Integration test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('📊 Database connection closed');
    }
  }
}

// Run test
runIntegrationTest().catch(console.error);