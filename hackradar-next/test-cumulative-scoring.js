const { MongoClient, ObjectId } = require('mongodb');
const { default: fetch } = require('node-fetch');
const FormData = require('form-data');
require('dotenv').config({ path: '.env.local' });

// Test configuration
const TEST_PROJECT_ID = '68bc5da3a1e502fdc1292a65';
const API_BASE_URL = 'http://localhost:7843';

async function testCumulativeScoring() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('📊 TESTING CUMULATIVE SCORING LOGIC');
  console.log('🎯 Goal: Verify scores consider FULL conversation context, not just last message');
  console.log('💡 Rule: Positive updates should NOT decrease existing scores unless something goes wrong');
  console.log('='.repeat(80));

  try {
    // STEP 1: Clean database
    console.log('\n1️⃣ CLEANING DATABASE...');
    await db.collection('timeline').deleteMany({ projectId: TEST_PROJECT_ID });
    await db.collection('projects').updateOne(
      { _id: new ObjectId(TEST_PROJECT_ID) },
      { 
        $set: { 
          teamName: 'Scoring Test Project',
          currentScore: 0,
          categoryScores: {},
          updatedAt: new Date()
        }
      }
    );
    console.log('   ✅ Database cleaned');

    // STEP 2: Progressive messages that should build up scores
    const messages = [
      {
        text: "We're building EcoTracker, an AI sustainability platform that helps businesses reduce carbon footprint through real-time monitoring and automated recommendations. We've identified a clear problem: companies waste 30% of energy due to poor visibility into consumption patterns.",
        expected: "Should establish baseline with decent clarity, problem_value, and originality",
        type: "foundation"
      },
      {
        text: "Update: We completed our MVP! The platform successfully tracks energy usage and our ML model achieved 94% accuracy in predicting waste patterns. Demo is live at ecotracker-demo.com",
        expected: "Feasibility should INCREASE significantly (working demo + metrics)",
        type: "feasibility_boost"
      },
      {
        text: "Major milestone: Secured first customer! GreenTech Corp signed $50k contract. Platform processes 500GB daily and helped them reduce emissions by 23%.",
        expected: "Impact and problem_value should INCREASE (real customer + proven results)",
        type: "impact_boost"
      },
      {
        text: "Product update: Added 15 new KPIs to dashboard. Beta customers love the new interface. Processing 10M+ data points daily.",
        expected: "All scores should stay same or increase (product improvements + user validation)",
        type: "incremental_positive"
      },
      {
        text: "Quick update: We now have 1,500 active users.",
        expected: "Scores should NOT decrease - this adds to the success story established above",
        type: "brief_positive"
      }
    ];

    const results = [];
    let previousScores = null;

    // Process each message and analyze scoring behavior
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      console.log(`\n${i + 2}️⃣ MESSAGE ${i + 1} (${message.type.toUpperCase()})`);
      console.log(`   Text: "${message.text.substring(0, 80)}..."`);
      console.log(`   Expected: ${message.expected}`);
      
      // Wait between messages
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Make submission
      const result = await makeSubmission(message.text);
      
      console.log('   📤 Raw API Response:');
      console.log(`      Success: ${result.success}`);
      console.log(`      Entry ID: ${result.entryId}`);
      console.log(`      Has Evaluation: ${!!result.evaluation}`);
      
      if (!result.evaluation) {
        console.log('   ❌ EVALUATION DETAILS:');
        console.log(`      Full result: ${JSON.stringify(result, null, 2)}`);
        throw new Error(`Message ${i + 1} failed to get evaluation!`);
      }

      const scores = result.evaluation.scores;
      const conversationId = result.evaluation.textEval?.conversationId;
      
      console.log('   📊 SCORES RECEIVED:');
      console.log(`      Clarity: ${scores.clarity}/15`);
      console.log(`      Problem Value: ${scores.problem_value}/20`);
      console.log(`      Feasibility: ${scores.feasibility}/10`);
      console.log(`      Originality: ${scores.originality}/10`);
      console.log(`      Impact: ${scores.impact_convert}/20`);
      console.log(`      TOTAL: ${scores.final_score}/100`);
      console.log(`      Conversation ID: ${conversationId}`);

      // Analyze conversation context
      const debugLogs = result.debugLogs || [];
      const historyLog = debugLogs.find(log => log.includes('Built conversation with'));
      const contextUsed = debugLogs.find(log => log.includes('Using conversation history with'));
      
      console.log('   🧠 CONTEXT ANALYSIS:');
      if (historyLog) console.log(`      ${historyLog}`);
      if (contextUsed) console.log(`      ${contextUsed}`);

      // Compare with previous scores if not first message
      if (previousScores) {
        console.log('   📈 SCORE COMPARISON WITH PREVIOUS:');
        const categories = ['clarity', 'problem_value', 'feasibility', 'originality', 'impact_convert'];
        
        for (const category of categories) {
          const current = scores[category];
          const previous = previousScores[category];
          const change = current - previous;
          const trend = change > 0 ? '📈 INCREASED' : change < 0 ? '📉 DECREASED' : '➡️ UNCHANGED';
          const changeStr = change !== 0 ? ` (${change > 0 ? '+' : ''}${change})` : '';
          
          console.log(`      ${category}: ${previous} → ${current} ${trend}${changeStr}`);
        }
        
        const totalChange = scores.final_score - previousScores.final_score;
        console.log(`      TOTAL: ${previousScores.final_score} → ${scores.final_score} (${totalChange > 0 ? '+' : ''}${totalChange})`);
      }

      // Store results for analysis
      results.push({
        messageNum: i + 1,
        type: message.type,
        text: message.text.substring(0, 100),
        scores: { ...scores },
        conversationId: conversationId,
        previousScores: previousScores ? { ...previousScores } : null,
        hasContext: historyLog ? historyLog.includes('messages from') : false
      });

      previousScores = { ...scores };
    }

    // STEP 3: Analyze cumulative scoring behavior
    console.log(`\n${messages.length + 2}️⃣ CUMULATIVE SCORING ANALYSIS`);
    console.log('='.repeat(80));
    
    console.log('\n📊 SCORE PROGRESSION ANALYSIS:');
    results.forEach((result, i) => {
      console.log(`\n   ${result.messageNum}. ${result.type.toUpperCase()}:`);
      console.log(`      Text: "${result.text}..."`);
      console.log(`      Scores: C:${result.scores.clarity} P:${result.scores.problem_value} F:${result.scores.feasibility} O:${result.scores.originality} I:${result.scores.impact_convert} = ${result.scores.final_score}`);
      console.log(`      Context: ${result.hasContext ? 'YES' : 'NO'}`);
      
      if (result.previousScores) {
        const categories = ['clarity', 'problem_value', 'feasibility', 'originality', 'impact_convert'];
        const decreases = categories.filter(cat => result.scores[cat] < result.previousScores[cat]);
        
        if (decreases.length > 0) {
          console.log(`      ⚠️ SCORE DECREASES: ${decreases.join(', ')} - This should NOT happen for positive updates!`);
        } else {
          console.log(`      ✅ NO SCORE DECREASES - Cumulative scoring working correctly`);
        }
      }
    });

    // STEP 4: Validate cumulative scoring rules
    console.log('\n🎯 CUMULATIVE SCORING VALIDATION:');
    
    // Rule 1: Scores should generally increase with positive updates
    const foundationScore = results[0].scores.final_score;
    const finalScore = results[results.length - 1].scores.final_score;
    const overallIncrease = finalScore >= foundationScore;
    
    console.log(`   Rule 1 - Overall progression: ${foundationScore} → ${finalScore} (${overallIncrease ? '✅ PASS' : '❌ FAIL'})`);
    
    // Rule 2: No category should decrease when adding positive context (except first baseline)
    let inappropriateDecreases = 0;
    for (let i = 1; i < results.length; i++) {
      const current = results[i];
      const previous = results[i - 1];
      
      const categories = ['clarity', 'problem_value', 'feasibility', 'originality', 'impact_convert'];
      const decreases = categories.filter(cat => current.scores[cat] < previous.scores[cat]);
      
      if (decreases.length > 0 && current.type !== 'negative_update') {
        inappropriateDecreases++;
        console.log(`   Rule 2 violation in message ${i + 1}: ${decreases.join(', ')} decreased inappropriately`);
      }
    }
    
    const rule2Pass = inappropriateDecreases === 0;
    console.log(`   Rule 2 - No inappropriate decreases: ${inappropriateDecreases === 0 ? '✅ PASS' : `❌ FAIL (${inappropriateDecreases} violations)`}`);
    
    // Rule 3: Context awareness (all messages except first should have conversation history)
    const messagesWithContext = results.filter((r, i) => i === 0 || r.hasContext).length;
    const contextAwareness = messagesWithContext === results.length;
    
    console.log(`   Rule 3 - Context awareness: ${messagesWithContext}/${results.length} messages (${contextAwareness ? '✅ PASS' : '❌ FAIL'})`);
    
    // Rule 4: Feasibility should increase after demo (message 2)
    const feasibilityBoost = results.length >= 2 && results[1].scores.feasibility > results[0].scores.feasibility;
    console.log(`   Rule 4 - Feasibility boost after demo: ${feasibilityBoost ? '✅ PASS' : '❌ FAIL'}`);
    
    // Rule 5: Impact should increase after customer success (message 3)  
    const impactBoost = results.length >= 3 && results[2].scores.impact_convert >= results[1].scores.impact_convert;
    console.log(`   Rule 5 - Impact maintained/increased after customer: ${impactBoost ? '✅ PASS' : '❌ FAIL'}`);

    console.log('\n📋 FINAL DATABASE STATE:');
    const finalEntries = await db.collection('timeline')
      .find({ projectId: TEST_PROJECT_ID })
      .sort({ createdAt: 1 })
      .toArray();
    
    console.log(`   Total entries: ${finalEntries.length}`);
    console.log(`   All have evaluations: ${finalEntries.every(e => e.evaluation) ? '✅ YES' : '❌ NO'}`);
    console.log(`   All have conversation IDs: ${finalEntries.every(e => e.anthropic_conversation_id) ? '✅ YES' : '❌ NO'}`);

    // Overall test result
    const allRulesPass = overallIncrease && rule2Pass && contextAwareness && feasibilityBoost && impactBoost;
    
    if (allRulesPass) {
      console.log('\n🎉 CUMULATIVE SCORING TEST PASSED! 🎉');
      console.log('   The system correctly considers full conversation context.');
      console.log('   Scores build cumulatively and don\'t decrease inappropriately.');
      console.log('   LLM evaluates based on complete project evolution.');
    } else {
      console.log('\n❌ CUMULATIVE SCORING TEST FAILED');
      console.log('   The scoring system has issues with cumulative evaluation.');
      console.log('   Scores are not properly considering full conversation context.');
      
      if (!overallIncrease) console.log('   - Overall scores did not progress appropriately');
      if (!rule2Pass) console.log('   - Scores decreased inappropriately for positive updates');
      if (!contextAwareness) console.log('   - Some messages lacked conversation context');
      if (!feasibilityBoost) console.log('   - Feasibility did not increase after demo evidence');
      if (!impactBoost) console.log('   - Impact did not maintain/increase after customer success');
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

testCumulativeScoring().catch(error => {
  console.error('\n💥 CRITICAL ERROR:', error.message);
  process.exit(1);
});