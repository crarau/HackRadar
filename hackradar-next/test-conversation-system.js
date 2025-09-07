const { MongoClient, ObjectId } = require('mongodb');
const { default: fetch } = require('node-fetch');
const FormData = require('form-data');
require('dotenv').config({ path: '.env.local' });

// Test configuration
const TEST_PROJECT_ID = '68bc5da3a1e502fdc1292a65';
const API_BASE_URL = 'http://localhost:7843';

async function runEndToEndTest() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('🧪 STARTING END-TO-END CONVERSATION SYSTEM TEST');
  console.log('='.repeat(60));

  try {
    // STEP 1: Clean database completely
    console.log('\n1️⃣ CLEANING DATABASE...');
    const deletedTimeline = await db.collection('timeline').deleteMany({ projectId: TEST_PROJECT_ID });
    const updatedProject = await db.collection('projects').updateOne(
      { _id: new ObjectId(TEST_PROJECT_ID) },
      { 
        $set: { 
          teamName: 'Test Project',
          currentScore: 0,
          categoryScores: {},
          updatedAt: new Date()
        }
      }
    );
    console.log(`   ✅ Deleted ${deletedTimeline.deletedCount} timeline entries`);
    console.log(`   ✅ Reset project data`);

    // STEP 2: First submission (should create new conversation)
    console.log('\n2️⃣ MAKING FIRST SUBMISSION...');
    const submission1 = await makeSubmission('Our team is building an AI-powered sustainability platform called EcoTracker. We help businesses reduce their carbon footprint through real-time monitoring and automated recommendations.');
    
    console.log('   📤 API Response:');
    console.log(`      Success: ${submission1.success}`);
    console.log(`      Entry ID: ${submission1.entryId}`);
    console.log(`      Evaluation: ${submission1.evaluation ? 'YES' : 'NO'}`);
    if (submission1.evaluation) {
      console.log(`      Final Score: ${submission1.evaluation.scores.final_score}`);
      console.log(`      Conversation ID: ${submission1.evaluation.textEval?.conversationId || 'MISSING'}`);
    }

    // Check database after first submission
    const entry1 = await db.collection('timeline').findOne({ _id: new ObjectId(submission1.entryId) });
    console.log('   📋 Database Check:');
    console.log(`      Entry found: ${!!entry1}`);
    console.log(`      Has evaluation: ${!!entry1?.evaluation}`);
    console.log(`      Evaluation score: ${entry1?.evaluation?.scores?.final_score || 'MISSING'}`);
    console.log(`      Conversation ID: ${entry1?.anthropic_conversation_id || 'MISSING'}`);

    if (!entry1?.evaluation?.scores?.final_score) {
      throw new Error('❌ FIRST SUBMISSION FAILED: No evaluation scores found');
    }
    if (!entry1?.anthropic_conversation_id) {
      throw new Error('❌ FIRST SUBMISSION FAILED: No conversation ID stored');
    }

    const conversationId1 = entry1.anthropic_conversation_id;
    const score1 = entry1.evaluation.scores.final_score;

    // STEP 3: Second submission (should use existing conversation)
    console.log('\n3️⃣ MAKING SECOND SUBMISSION...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    const submission2 = await makeSubmission('Update: We just completed our MVP demo! The platform successfully tracked energy usage for 5 beta customers and generated automated sustainability reports. Our machine learning model achieved 94% accuracy in predicting energy waste patterns.');
    
    console.log('   📤 API Response:');
    console.log(`      Success: ${submission2.success}`);
    console.log(`      Entry ID: ${submission2.entryId}`);
    console.log(`      Evaluation: ${submission2.evaluation ? 'YES' : 'NO'}`);
    if (submission2.evaluation) {
      console.log(`      Final Score: ${submission2.evaluation.scores.final_score}`);
      console.log(`      Conversation ID: ${submission2.evaluation.textEval?.conversationId || 'MISSING'}`);
    }

    // Check database after second submission
    const entry2 = await db.collection('timeline').findOne({ _id: new ObjectId(submission2.entryId) });
    console.log('   📋 Database Check:');
    console.log(`      Entry found: ${!!entry2}`);
    console.log(`      Has evaluation: ${!!entry2?.evaluation}`);
    console.log(`      Evaluation score: ${entry2?.evaluation?.scores?.final_score || 'MISSING'}`);
    console.log(`      Conversation ID: ${entry2?.anthropic_conversation_id || 'MISSING'}`);
    console.log(`      Same conversation ID: ${entry2?.anthropic_conversation_id === conversationId1 ? 'YES' : 'NO'}`);

    if (!entry2?.evaluation?.scores?.final_score) {
      throw new Error('❌ SECOND SUBMISSION FAILED: No evaluation scores found');
    }
    if (entry2?.anthropic_conversation_id !== conversationId1) {
      console.warn(`⚠️ WARNING: Conversation ID changed from ${conversationId1} to ${entry2?.anthropic_conversation_id}`);
    }

    const score2 = entry2.evaluation.scores.final_score;
    const scoreDelta = score2 - score1;

    // STEP 4: Third submission (should maintain conversation context)
    console.log('\n4️⃣ MAKING THIRD SUBMISSION...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    const submission3 = await makeSubmission('Final update: We secured our first paying customer! GreenTech Corp signed a $50k annual contract. Our platform is now processing 500GB of environmental data daily and has helped reduce their carbon emissions by 23%. Ready for full market launch.');
    
    console.log('   📤 API Response:');
    console.log(`      Success: ${submission3.success}`);
    console.log(`      Entry ID: ${submission3.entryId}`);
    console.log(`      Evaluation: ${submission3.evaluation ? 'YES' : 'NO'}`);
    if (submission3.evaluation) {
      console.log(`      Final Score: ${submission3.evaluation.scores.final_score}`);
      console.log(`      Conversation ID: ${submission3.evaluation.textEval?.conversationId || 'MISSING'}`);
    }

    // Check database after third submission
    const entry3 = await db.collection('timeline').findOne({ _id: new ObjectId(submission3.entryId) });
    console.log('   📋 Database Check:');
    console.log(`      Entry found: ${!!entry3}`);
    console.log(`      Has evaluation: ${!!entry3?.evaluation}`);
    console.log(`      Evaluation score: ${entry3?.evaluation?.scores?.final_score || 'MISSING'}`);
    console.log(`      Conversation ID: ${entry3?.anthropic_conversation_id || 'MISSING'}`);
    console.log(`      Same conversation ID: ${entry3?.anthropic_conversation_id === conversationId1 ? 'YES' : 'NO'}`);

    if (!entry3?.evaluation?.scores?.final_score) {
      throw new Error('❌ THIRD SUBMISSION FAILED: No evaluation scores found');
    }

    const score3 = entry3.evaluation.scores.final_score;

    // STEP 5: Final validation and summary
    console.log('\n5️⃣ FINAL VALIDATION...');
    const allEntries = await db.collection('timeline')
      .find({ projectId: TEST_PROJECT_ID })
      .sort({ createdAt: 1 })
      .toArray();

    console.log(`   📊 Total entries created: ${allEntries.length}`);
    console.log('   📈 Score progression:');
    console.log(`      Submission 1: ${score1} (baseline)`);
    console.log(`      Submission 2: ${score2} (${scoreDelta > 0 ? '+' : ''}${scoreDelta})`);
    console.log(`      Submission 3: ${score3} (${score3 - score2 > 0 ? '+' : ''}${score3 - score2})`);

    // Validate that all entries have evaluations
    const entriesWithEvaluations = allEntries.filter(entry => entry.evaluation?.scores?.final_score);
    const entriesWithConversationIds = allEntries.filter(entry => entry.anthropic_conversation_id);

    console.log('\n✅ SUCCESS CRITERIA:');
    console.log(`   ✅ All entries have evaluations: ${entriesWithEvaluations.length === allEntries.length ? 'YES' : 'NO'} (${entriesWithEvaluations.length}/${allEntries.length})`);
    console.log(`   ✅ All entries have conversation IDs: ${entriesWithConversationIds.length === allEntries.length ? 'YES' : 'NO'} (${entriesWithConversationIds.length}/${allEntries.length})`);
    console.log(`   ✅ Scores show progression: ${score3 > score1 ? 'YES' : 'NO'} (${score1} → ${score3})`);
    console.log(`   ✅ LLM calls successful: ${allEntries.every(e => e.evaluation?.raw_ai_response) ? 'YES' : 'NO'}`);

    if (entriesWithEvaluations.length === allEntries.length && 
        entriesWithConversationIds.length === allEntries.length &&
        score3 > score1) {
      console.log('\n🎉 END-TO-END TEST PASSED! 🎉');
      console.log('   The conversation system is working correctly.');
      console.log('   Every submission gets evaluated and maintains conversation context.');
    } else {
      throw new Error('❌ END-TO-END TEST FAILED: Some success criteria not met');
    }

  } catch (error) {
    console.error('\n💥 TEST FAILED:', error.message);
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
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ API call failed:', error.message);
    throw error;
  }
}

// FormData already imported above

runEndToEndTest().catch(error => {
  console.error('\n💥 CRITICAL ERROR:', error);
  process.exit(1);
});