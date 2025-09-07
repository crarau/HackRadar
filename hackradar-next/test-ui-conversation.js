const { MongoClient, ObjectId } = require('mongodb');
const { default: fetch } = require('node-fetch');
const FormData = require('form-data');
require('dotenv').config({ path: '.env.local' });

// Test configuration
const TEST_PROJECT_ID = '68bc5da3a1e502fdc1292a65';
const API_BASE_URL = 'http://localhost:7843';

async function testUIConversationFlow() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('🧪 TESTING UI CONVERSATION FLOW');
  console.log('🎯 Goal: Reproduce exact UI scenario with conversation history');
  console.log('='.repeat(70));

  try {
    // STEP 1: Clean database
    console.log('\n1️⃣ CLEANING DATABASE...');
    await db.collection('timeline').deleteMany({ projectId: TEST_PROJECT_ID });
    await db.collection('projects').updateOne(
      { _id: new ObjectId(TEST_PROJECT_ID) },
      { 
        $set: { 
          teamName: 'EcoTracker Team',
          currentScore: 0,
          categoryScores: {},
          updatedAt: new Date()
        }
      }
    );
    console.log('   ✅ Database cleaned and ready');

    // STEP 2: Build conversation history like your UI scenario
    console.log('\n2️⃣ BUILDING CONVERSATION HISTORY...');
    
    const submissions = [
      {
        text: "Our team is building an AI-powered sustainability platform called EcoTracker. We help businesses reduce their carbon footprint through real-time monitoring and automated recommendations.",
        expected_improvement: "Initial submission should establish baseline"
      },
      {
        text: "Update: We just completed our MVP demo! The platform successfully tracked energy usage for 5 beta customers and generated automated sustainability reports. Our machine learning model achieved 94% accuracy in predicting energy waste patterns.",
        expected_improvement: "Should increase score with demo + metrics"
      },
      {
        text: "Major milestone: We secured our first paying customer! GreenTech Corp signed a $50k annual contract. Our platform is now processing 500GB of environmental data daily.",
        expected_improvement: "Should increase score with revenue + scale"
      },
      {
        text: "Product update: We added real-time dashboard with 15 new sustainability KPIs. Beta customers report average 23% reduction in energy costs. Platform handles 10M+ data points per day.",
        expected_improvement: "Should increase score with product evolution + impact metrics"
      },
      {
        text: "Please add. We just added 1,500 users.",
        expected_improvement: "Should maintain/increase score considering full context"
      }
    ];

    const results = [];
    let previousScore = 0;

    // Make each submission sequentially
    for (let i = 0; i < submissions.length; i++) {
      const submission = submissions[i];
      console.log(`\n${i + 3}️⃣ SUBMISSION ${i + 1}: "${submission.text.substring(0, 50)}..."`);
      console.log(`   Expected: ${submission.expected_improvement}`);

      // Wait between submissions to simulate real usage
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      const result = await makeSubmission(submission.text);
      
      // Check API response
      console.log('   📤 API Response:');
      console.log(`      Success: ${result.success}`);
      console.log(`      Entry ID: ${result.entryId}`);
      console.log(`      Has Evaluation: ${!!result.evaluation}`);
      
      if (result.evaluation) {
        const score = result.evaluation.scores.final_score;
        const conversationId = result.evaluation.textEval?.conversationId;
        const scoreDelta = score - previousScore;
        
        console.log(`      Final Score: ${score} (${previousScore > 0 ? (scoreDelta > 0 ? '+' : '') + scoreDelta : 'baseline'})`);
        console.log(`      Conversation ID: ${conversationId}`);
        
        // Check database
        const dbEntry = await db.collection('timeline').findOne({ _id: new ObjectId(result.entryId) });
        console.log('   📋 Database Verification:');
        console.log(`      Entry stored: ${!!dbEntry}`);
        console.log(`      Evaluation stored: ${!!dbEntry?.evaluation}`);
        console.log(`      Conversation ID stored: ${dbEntry?.anthropic_conversation_id || 'MISSING'}`);
        
        // Check if LLM had conversation history
        const debugLogs = result.debugLogs || [];
        const historyLogs = debugLogs.filter(log => log.includes('Built conversation with') || log.includes('previous messages'));
        console.log('   🧠 LLM Context Check:');
        if (historyLogs.length > 0) {
          historyLogs.forEach(log => console.log(`      ${log}`));
        } else {
          console.log('      ⚠️ No conversation history logs found');
        }

        results.push({
          submission: i + 1,
          text: submission.text.substring(0, 100) + '...',
          score: score,
          scoreDelta: scoreDelta,
          conversationId: conversationId,
          hadHistory: historyLogs.length > 0,
          dbEntry: !!dbEntry?.evaluation
        });

        previousScore = score;
      } else {
        console.log('   ❌ NO EVALUATION RECEIVED');
        throw new Error(`Submission ${i + 1} failed to get evaluation`);
      }
    }

    // STEP 3: Final analysis
    console.log('\n7️⃣ CONVERSATION FLOW ANALYSIS');
    console.log('='.repeat(70));
    
    console.log('\n📊 SCORE PROGRESSION:');
    results.forEach((result, i) => {
      const trend = i === 0 ? 'baseline' : (result.scoreDelta > 0 ? '📈 increase' : result.scoreDelta < 0 ? '📉 decrease' : '➡️ stable');
      console.log(`   ${i + 1}. Score: ${result.score} (${trend}) - History: ${result.hadHistory ? 'YES' : 'NO'}`);
    });

    console.log('\n🧠 CONVERSATION CONTEXT ANALYSIS:');
    const submissionsWithHistory = results.filter(r => r.hadHistory).length;
    const lastSubmissionContext = results[results.length - 1];
    
    console.log(`   Submissions with conversation history: ${submissionsWithHistory}/${results.length}`);
    console.log(`   Final submission had full context: ${lastSubmissionContext.hadHistory ? 'YES' : 'NO'}`);
    
    console.log('\n🎯 KEY REQUIREMENTS CHECK:');
    console.log(`   ✅ All submissions evaluated: ${results.length === submissions.length ? 'YES' : 'NO'}`);
    console.log(`   ✅ Conversation IDs maintained: ${results.every(r => r.conversationId) ? 'YES' : 'NO'}`);
    console.log(`   ✅ Context awareness (>= 80%): ${submissionsWithHistory >= Math.ceil(0.8 * results.length) ? 'YES' : 'NO'}`);
    console.log(`   ✅ Database consistency: ${results.every(r => r.dbEntry) ? 'YES' : 'NO'}`);
    
    // Special focus on the last submission (your test case)
    console.log('\n🔍 FINAL SUBMISSION ANALYSIS (Your UI Test Case):');
    console.log(`   Text: "${submissions[4].text}"`);
    console.log(`   Score: ${lastSubmissionContext.score}`);
    console.log(`   Had conversation history: ${lastSubmissionContext.hadHistory ? 'YES' : 'NO'}`);
    console.log(`   Score appropriate for context: ${lastSubmissionContext.score > 30 ? 'YES (considering full project context)' : 'NO (seems too low for established project)'}`);

    if (submissionsWithHistory >= Math.ceil(0.8 * results.length) && 
        results.every(r => r.conversationId && r.dbEntry) &&
        lastSubmissionContext.hadHistory) {
      console.log('\n🎉 UI CONVERSATION FLOW TEST PASSED! 🎉');
      console.log('   The system correctly maintains conversation context across submissions.');
      console.log('   LLM sees full project history when evaluating new updates.');
    } else {
      console.log('\n❌ UI CONVERSATION FLOW TEST FAILED');
      console.log('   The conversation system is not maintaining proper context.');
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
      timeout: 30000 // 30 second timeout
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

testUIConversationFlow().catch(error => {
  console.error('\n💥 CRITICAL ERROR:', error.message);
  process.exit(1);
});