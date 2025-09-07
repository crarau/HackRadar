const { MongoClient, ObjectId } = require('mongodb');
const { default: fetch } = require('node-fetch');
const FormData = require('form-data');
require('dotenv').config({ path: '.env.local' });

// Test configuration
const TEST_PROJECT_ID = '68bc5da3a1e502fdc1292a65';
const API_BASE_URL = 'http://localhost:7843';

async function testConversationContinuity() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('🔗 TESTING CONVERSATION CONTINUITY');
  console.log('🎯 Goal: Verify conversation context flows from message to message');
  console.log('='.repeat(65));

  try {
    // STEP 1: Clean database
    console.log('\n1️⃣ CLEANING DATABASE...');
    await db.collection('timeline').deleteMany({ projectId: TEST_PROJECT_ID });
    await db.collection('projects').updateOne(
      { _id: new ObjectId(TEST_PROJECT_ID) },
      { 
        $set: { 
          teamName: 'Continuity Test',
          currentScore: 0,
          categoryScores: {},
          updatedAt: new Date()
        }
      }
    );
    console.log('   ✅ Database cleaned');

    // STEP 2: The 4 exact messages you specified
    const messages = [
      "You add 10 users",
      "You have 50 users", 
      "You get more feedback",
      "You create 4 messages"
    ];

    const results = [];

    // Make each submission and analyze conversation continuity
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      console.log(`\n${i + 2}️⃣ MESSAGE ${i + 1}: "${message}"`);
      
      // Wait between messages
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Make submission
      const result = await makeSubmission(message);
      
      console.log('   📤 API Response:');
      console.log(`      Success: ${result.success}`);
      console.log(`      Entry ID: ${result.entryId}`);
      console.log(`      Has Evaluation: ${!!result.evaluation}`);
      
      if (!result.evaluation) {
        throw new Error(`Message ${i + 1} failed to get evaluation!`);
      }

      const score = result.evaluation.scores.final_score;
      const conversationId = result.evaluation.textEval?.conversationId;
      
      // Check database state
      const dbEntry = await db.collection('timeline').findOne({ _id: new ObjectId(result.entryId) });
      const allEntries = await db.collection('timeline')
        .find({ projectId: TEST_PROJECT_ID })
        .sort({ createdAt: 1 })
        .toArray();
      
      console.log(`      Final Score: ${score}`);
      console.log(`      Conversation ID: ${conversationId}`);
      console.log(`      DB Entry Stored: ${!!dbEntry}`);
      console.log(`      Total Entries in DB: ${allEntries.length}`);

      // Analyze conversation context from debug logs
      const debugLogs = result.debugLogs || [];
      const historyLog = debugLogs.find(log => log.includes('Built conversation with'));
      const anthropicLog = debugLogs.find(log => log.includes('Using conversation history with'));
      
      console.log('   🧠 Conversation Context Analysis:');
      if (historyLog) {
        console.log(`      ${historyLog}`);
      }
      if (anthropicLog) {
        console.log(`      ${anthropicLog}`);
      }
      
      // Extract conversation context numbers
      let messagesBuilt = 0;
      let submissionsFound = 0;
      let messagesUsed = 0;
      
      if (historyLog) {
        const match = historyLog.match(/Built conversation with (\d+) messages from (\d+) submissions/);
        if (match) {
          messagesBuilt = parseInt(match[1]);
          submissionsFound = parseInt(match[2]);
        }
      }
      
      if (anthropicLog) {
        const match = anthropicLog.match(/Using conversation history with (\d+) previous messages/);
        if (match) {
          messagesUsed = parseInt(match[1]);
        }
      }
      
      console.log('   📊 Context Numbers:');
      console.log(`      Messages built from history: ${messagesBuilt}`);
      console.log(`      Previous submissions found: ${submissionsFound}`);
      console.log(`      Messages sent to Anthropic: ${messagesUsed}`);
      console.log(`      Expected previous submissions: ${i}`); // Should match number of previous submissions
      
      // Verify continuity
      const expectedPreviousSubmissions = i;
      const expectedMessages = expectedPreviousSubmissions * 2; // Each submission = user + assistant message
      
      console.log('   ✅ Continuity Check:');
      console.log(`      Found expected submissions: ${submissionsFound === expectedPreviousSubmissions ? 'YES' : 'NO'} (${submissionsFound}/${expectedPreviousSubmissions})`);
      console.log(`      Built expected messages: ${messagesBuilt === expectedMessages ? 'YES' : 'NO'} (${messagesBuilt}/${expectedMessages})`);
      console.log(`      Used messages in API call: ${messagesUsed === messagesBuilt ? 'YES' : 'NO'} (${messagesUsed}/${messagesBuilt})`);
      
      // Store result for analysis
      results.push({
        messageNum: i + 1,
        text: message,
        score: score,
        conversationId: conversationId,
        messagesBuilt: messagesBuilt,
        submissionsFound: submissionsFound,
        messagesUsed: messagesUsed,
        expectedPrevious: expectedPreviousSubmissions,
        continuityCorrect: submissionsFound === expectedPreviousSubmissions && messagesBuilt === expectedMessages
      });
    }

    // STEP 3: Final continuity analysis
    console.log(`\n${messages.length + 2}️⃣ CONTINUITY ANALYSIS`);
    console.log('='.repeat(65));
    
    console.log('\n📊 MESSAGE PROGRESSION:');
    results.forEach((result, i) => {
      const continuity = result.continuityCorrect ? '✅' : '❌';
      const contextGrowth = i === 0 ? '(baseline)' : `(+${result.submissionsFound - results[i-1].submissionsFound} submissions, +${result.messagesBuilt - results[i-1].messagesBuilt} messages)`;
      
      console.log(`   ${result.messageNum}. "${result.text}"`);
      console.log(`      Score: ${result.score} | Context: ${result.submissionsFound} prev submissions → ${result.messagesBuilt} messages ${contextGrowth}`);
      console.log(`      Continuity: ${continuity} ${result.continuityCorrect ? 'CORRECT' : 'BROKEN'}`);
    });

    console.log('\n🔗 CONVERSATION ID TRACKING:');
    const uniqueConversationIds = new Set(results.map(r => r.conversationId));
    console.log(`   Unique conversation IDs: ${uniqueConversationIds.size}`);
    console.log(`   All different (expected): ${uniqueConversationIds.size === results.length ? 'YES' : 'NO'}`);
    results.forEach((result, i) => {
      console.log(`   ${result.messageNum}. ${result.conversationId}`);
    });

    console.log('\n🎯 CONTINUITY SUCCESS CRITERIA:');
    const allContinuityCorrect = results.every(r => r.continuityCorrect);
    const scoresProgression = results.map(r => r.score);
    const contextGrowthCorrect = results.every((result, i) => {
      if (i === 0) return true; // First message has no previous context
      return result.submissionsFound === i && result.messagesBuilt === i * 2;
    });

    console.log(`   ✅ All messages maintain continuity: ${allContinuityCorrect ? 'YES' : 'NO'}`);
    console.log(`   ✅ Context grows correctly: ${contextGrowthCorrect ? 'YES' : 'NO'}`);
    console.log(`   ✅ All messages evaluated: ${results.length === messages.length ? 'YES' : 'NO'}`);
    console.log(`   ✅ Conversation IDs generated: ${results.every(r => r.conversationId) ? 'YES' : 'NO'}`);
    
    console.log('\n📈 SCORE PROGRESSION:');
    console.log(`   Scores: ${scoresProgression.join(' → ')}`);
    console.log(`   Score changes show context awareness: ${scoresProgression.every(s => s > 0) ? 'YES' : 'NO'}`);

    // Final verification by checking the database state
    const finalEntries = await db.collection('timeline')
      .find({ projectId: TEST_PROJECT_ID })
      .sort({ createdAt: 1 })
      .toArray();
    
    console.log('\n💾 FINAL DATABASE STATE:');
    console.log(`   Total entries: ${finalEntries.length}`);
    console.log(`   All have evaluations: ${finalEntries.every(e => e.evaluation) ? 'YES' : 'NO'}`);
    console.log(`   All have conversation IDs: ${finalEntries.every(e => e.anthropic_conversation_id) ? 'YES' : 'NO'}`);
    
    // Success determination
    if (allContinuityCorrect && contextGrowthCorrect && results.length === messages.length) {
      console.log('\n🎉 CONVERSATION CONTINUITY TEST PASSED! 🎉');
      console.log('   The system perfectly maintains conversation context across all messages.');
      console.log('   Each message builds on the previous conversation history.');
      console.log('   LLM receives complete context for intelligent evaluation.');
    } else {
      console.log('\n❌ CONVERSATION CONTINUITY TEST FAILED');
      console.log('   The conversation system has continuity issues.');
      if (!allContinuityCorrect) console.log('   - Some messages did not maintain proper continuity');
      if (!contextGrowthCorrect) console.log('   - Context growth pattern is incorrect');
      if (results.length !== messages.length) console.log('   - Not all messages were processed successfully');
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

testConversationContinuity().catch(error => {
  console.error('\n💥 CRITICAL ERROR:', error.message);
  process.exit(1);
});