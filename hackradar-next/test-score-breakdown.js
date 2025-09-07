const { MongoClient, ObjectId } = require('mongodb');
const { default: fetch } = require('node-fetch');
const FormData = require('form-data');
require('dotenv').config({ path: '.env.local' });

// Test configuration
const TEST_PROJECT_ID = '68bc5da3a1e502fdc1292a65';
const API_BASE_URL = 'http://localhost:7843';

async function testScoreBreakdown() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('🧮 TESTING SCORE BREAKDOWN CALCULATION');
  console.log('🎯 Goal: Verify all 6 score categories are calculated and add up to 100');
  console.log('📊 Expected Categories: Clarity(15) + Problem(20) + Feasibility(15) + Originality(15) + Impact(20) + Readiness(15) = 100');
  console.log('='.repeat(90));

  try {
    // Clean database
    console.log('\n1️⃣ CLEANING DATABASE...');
    await db.collection('timeline').deleteMany({ projectId: TEST_PROJECT_ID });
    await db.collection('projects').updateOne(
      { _id: new ObjectId(TEST_PROJECT_ID) },
      { 
        $set: { 
          teamName: 'Score Breakdown Test',
          currentScore: 0,
          categoryScores: {},
          updatedAt: new Date()
        }
      }
    );
    console.log('   ✅ Database cleaned');

    // Make a comprehensive submission to test all score categories
    const testSubmission = "We're building EcoTracker, an AI sustainability platform. We have a working demo at ecotracker.com, secured $50k from our first customer GreenTech Corp, and our ML model achieved 94% accuracy. The platform processes 500GB of environmental data daily and helped customers reduce emissions by 23%. We have 1,500 active users and are ready for the hackathon judging with our complete pitch deck and live demo.";

    console.log('\n2️⃣ MAKING COMPREHENSIVE SUBMISSION...');
    console.log(`   Text: "${testSubmission.substring(0, 100)}..."`);
    
    const result = await makeSubmission(testSubmission);
    
    if (!result.evaluation) {
      throw new Error('Submission failed to get evaluation!');
    }

    console.log('\n3️⃣ ANALYZING SCORE BREAKDOWN...');
    const scores = result.evaluation.scores;
    const textEval = result.evaluation.textEval;
    const srTracker = result.evaluation.sr_tracker;

    console.log('   📤 API Response Scores:');
    console.log(`      Clarity: ${scores.clarity}/15`);
    console.log(`      Problem Value: ${scores.problem_value}/20`);
    console.log(`      Feasibility: ${scores.feasibility}/10`);
    console.log(`      Originality: ${scores.originality}/10`);
    console.log(`      Impact Convert: ${scores.impact_convert}/20`);
    console.log(`      Submission Readiness: ${scores.submission_readiness}/15`);
    console.log(`      FINAL SCORE: ${scores.final_score}/100`);

    console.log('\n   📊 DETAILED BREAKDOWN:');
    console.log(`      TextEvaluator subscores:`, textEval?.subscores || 'MISSING');
    console.log(`      SRTracker readiness score:`, srTracker?.readiness_score || 'MISSING');

    // Check database storage
    const dbEntry = await db.collection('timeline').findOne({ _id: new ObjectId(result.entryId) });
    console.log('\n   💾 DATABASE STORAGE:');
    console.log(`      Entry found: ${!!dbEntry}`);
    if (dbEntry?.evaluation?.scores) {
      const dbScores = dbEntry.evaluation.scores;
      console.log(`      DB Clarity: ${dbScores.clarity}/15`);
      console.log(`      DB Problem Value: ${dbScores.problem_value}/20`);
      console.log(`      DB Feasibility Signal: ${dbScores.feasibility_signal}/10`);
      console.log(`      DB Originality: ${dbScores.originality}/10`);
      console.log(`      DB Impact Convert: ${dbScores.impact_convert}/20`);
      console.log(`      DB Final Score: ${dbScores.final_score}/100`);
      console.log(`      DB Submission Readiness: ${dbScores.submission_readiness || 'MISSING'}/15`);
    }

    // Mathematical validation
    console.log('\n4️⃣ MATHEMATICAL VALIDATION...');
    
    const expectedCategories = [
      { name: 'Clarity', score: scores.clarity, max: 15 },
      { name: 'Problem Value', score: scores.problem_value, max: 20 },
      { name: 'Feasibility', score: scores.feasibility, max: 15 },
      { name: 'Originality', score: scores.originality, max: 15 },
      { name: 'Impact Convert', score: scores.impact_convert, max: 20 },
      { name: 'Submission Readiness', score: scores.submission_readiness, max: 15 }
    ];

    let calculatedTotal = 0;
    let maxPossible = 0;
    const missingCategories = [];
    const invalidScores = [];

    console.log('   📋 CATEGORY ANALYSIS:');
    expectedCategories.forEach(category => {
      const score = category.score;
      const isValid = typeof score === 'number' && score >= 0 && score <= category.max;
      
      console.log(`      ${category.name}: ${score}/${category.max} ${isValid ? '✅' : '❌'}`);
      
      if (typeof score !== 'number' || score === undefined || score === null) {
        missingCategories.push(category.name);
      } else if (score < 0 || score > category.max) {
        invalidScores.push(`${category.name}: ${score}/${category.max}`);
      } else {
        calculatedTotal += score;
        maxPossible += category.max;
      }
    });

    console.log('\n   🧮 CALCULATION CHECK:');
    console.log(`      Manual sum: ${calculatedTotal}/${maxPossible}`);
    console.log(`      API final_score: ${scores.final_score}/100`);
    console.log(`      Calculation matches: ${calculatedTotal === scores.final_score ? '✅ YES' : '❌ NO'}`);
    console.log(`      Max possible correct: ${maxPossible === 100 ? '✅ YES' : '❌ NO'}`);

    // Validation results
    console.log('\n5️⃣ VALIDATION RESULTS...');
    
    const allCategoriesPresent = missingCategories.length === 0;
    const allScoresValid = invalidScores.length === 0;
    const calculationCorrect = calculatedTotal === scores.final_score;
    const maxCorrect = maxPossible === 100;
    
    console.log(`   ✅ All 6 categories present: ${allCategoriesPresent ? 'YES' : 'NO'}`);
    if (missingCategories.length > 0) {
      console.log(`      Missing: ${missingCategories.join(', ')}`);
    }
    
    console.log(`   ✅ All scores within valid ranges: ${allScoresValid ? 'YES' : 'NO'}`);
    if (invalidScores.length > 0) {
      console.log(`      Invalid: ${invalidScores.join(', ')}`);
    }
    
    console.log(`   ✅ Calculation accuracy: ${calculationCorrect ? 'YES' : 'NO'}`);
    if (!calculationCorrect) {
      console.log(`      Expected: ${calculatedTotal}, Got: ${scores.final_score}, Difference: ${scores.final_score - calculatedTotal}`);
    }
    
    console.log(`   ✅ Maximum total is 100: ${maxCorrect ? 'YES' : 'NO'}`);

    // UI Display Check (simulate what UI shows)
    console.log('\n6️⃣ UI DISPLAY SIMULATION...');
    console.log('   What UI currently shows:');
    console.log(`      Clarity: ${scores.clarity}/15`);
    console.log(`      Problem Value: ${scores.problem_value}/20`);
    console.log(`      Feasibility: ${scores.feasibility}/10`);
    console.log(`      Originality: ${scores.originality}/10`);
    console.log(`      Impact: ${scores.impact_convert}/20`);
    console.log(`      MISSING: Submission Readiness: ${scores.submission_readiness}/15`);
    
    const uiTotal = scores.clarity + scores.problem_value + scores.feasibility + scores.originality + scores.impact_convert;
    console.log(`   UI visible total: ${uiTotal}/85 (missing 15 points from readiness)`);
    console.log(`   Actual total: ${scores.final_score}/100`);
    console.log(`   Missing from UI: ${scores.final_score - uiTotal} points (should be submission readiness)`);

    // Final assessment
    if (allCategoriesPresent && allScoresValid && calculationCorrect && maxCorrect) {
      console.log('\n🎉 SCORE BREAKDOWN TEST PASSED! 🎉');
      console.log('   All 6 score categories are calculated correctly.');
      console.log('   The issue is in UI display - submission readiness is missing.');
      console.log(`   Backend calculates: ${scores.final_score}/100 ✅`);
      console.log(`   UI shows only: ${uiTotal}/85 ❌ (missing submission readiness)`);
    } else {
      console.log('\n❌ SCORE BREAKDOWN TEST FAILED');
      console.log('   The scoring system has calculation or category issues.');
    }

  } catch (error) {
    console.error('\n💥 TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await client.close();
  }
}

async function makeSubmission(text) {
  const formData = new FormData();
  formData.append('projectId', TEST_PROJECT_ID);
  formData.append('text', text);
  formData.append('url', '');
  formData.append('captureWebsite', 'false');
  formData.append('websiteUrl', '');
  formData.append('fileCount', '0');
  formData.append('timestamp', Date.now().toString());

  try {
    const response = await fetch(`${API_BASE_URL}/api/timeline`, {
      method: 'POST',
      body: formData,
      timeout: 30000
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ API call failed:', error.message);
    throw error;
  }
}

testScoreBreakdown().catch(error => {
  console.error('\n💥 CRITICAL ERROR:', error.message);
  process.exit(1);
});