#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testEvaluationFlow() {
  let client;
  
  try {
    console.log('🧪 Testing Complete Evaluation Flow\n');
    console.log('=' .repeat(60));
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db();
    console.log('✅ Connected to MongoDB Atlas\n');
    
    // Find the EcoTracker project
    const project = await db.collection('projects').findOne({ 
      teamName: 'EcoTracker',
      userEmail: 'ciprarau@gmail.com'
    });
    
    if (!project) {
      console.error('❌ EcoTracker project not found!');
      return;
    }
    
    console.log(`📁 Found EcoTracker project: ${project._id}\n`);
    
    // Check current state
    console.log('📊 Current State:');
    const currentTimeline = await db.collection('timeline')
      .find({ projectId: project._id.toString() })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    console.log(`  Timeline entries: ${currentTimeline.length}`);
    console.log(`  Current score: ${project.currentScore || 'N/A'}/100`);
    console.log();
    
    // Display recent entries
    console.log('📜 Recent Timeline Entries:');
    currentTimeline.forEach((entry, i) => {
      const hasScore = entry.metadata?.evaluation?.final_score !== undefined;
      const isScoreUpdate = entry.metadata?.type === 'score_update';
      const date = new Date(entry.createdAt).toLocaleString();
      
      if (isScoreUpdate) {
        console.log(`  ${i + 1}. [SCORE UPDATE] ${date}`);
        console.log(`     ${entry.text}`);
      } else {
        console.log(`  ${i + 1}. [SUBMISSION] ${date}`);
        if (entry.text) {
          console.log(`     Text: "${entry.text.substring(0, 60)}..."`);
        }
        if (hasScore) {
          console.log(`     ✅ Score: ${entry.metadata.evaluation.final_score}/100`);
          if (entry.metadata.delta) {
            const delta = entry.metadata.delta;
            const icon = delta.direction === 'up' ? '📈' : '📉';
            console.log(`     ${icon} Delta: ${delta.total_change > 0 ? '+' : ''}${delta.total_change} points`);
          }
          if (entry.metadata.evaluation.feedback?.strengths?.length > 0) {
            console.log(`     Strengths: ${entry.metadata.evaluation.feedback.strengths[0]}`);
          }
        } else {
          console.log(`     ⚠️  NO SCORE ATTACHED`);
        }
      }
      console.log();
    });
    
    // Check for issues
    console.log('🔍 Issue Detection:');
    
    const scoreUpdateEntries = currentTimeline.filter(e => e.metadata?.type === 'score_update');
    const submissionsWithScores = currentTimeline.filter(e => 
      !e.metadata?.type && e.metadata?.evaluation?.final_score !== undefined
    );
    const submissionsWithoutScores = currentTimeline.filter(e => 
      !e.metadata?.type && !e.metadata?.evaluation
    );
    
    console.log(`  ❌ Separate score update entries: ${scoreUpdateEntries.length}`);
    console.log(`  ✅ Submissions with inline scores: ${submissionsWithScores.length}`);
    console.log(`  ⚠️  Submissions without scores: ${submissionsWithoutScores.length}`);
    
    if (scoreUpdateEntries.length > 0) {
      console.log('\n  ⚠️  Found separate score entries that should be inline!');
      console.log('  These will be fixed with the new code.');
    }
    
    if (submissionsWithoutScores.length > 0) {
      console.log('\n  ⚠️  Some submissions are missing evaluations!');
      console.log('  New submissions will automatically get evaluated.');
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Test complete!\n');
    
    console.log('📝 Summary:');
    console.log('  - Evaluations should appear inline with submissions');
    console.log('  - No separate "Score Update" entries should be created');
    console.log('  - Each submission should show score, delta, and feedback');
    console.log('  - Processing takes 2-4 seconds to simulate agent thinking');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    if (client) {
      await client.close();
      console.log('\n📊 Database connection closed');
    }
  }
}

// Run test
testEvaluationFlow().catch(console.error);