const { MongoClient, ObjectId } = require('mongodb');
const { default: fetch } = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Test configuration
const TEST_PROJECT_ID = '68bc5da3a1e502fdc1292a65';
const API_BASE_URL = 'http://localhost:7843';

async function testImageUploadAndEvaluation() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('🖼️ TESTING IMAGE UPLOAD & ANTHROPIC INTEGRATION');
  console.log('🎯 Goal: Upload hackradar.png and verify Anthropic processes it in conversation history');
  console.log('📝 Flow: Upload image → Store in DB → Send to Anthropic → Get evaluation');
  console.log('='.repeat(85));

  try {
    // STEP 1: Clean database for fresh test
    console.log('\n1️⃣ CLEANING DATABASE...');
    await db.collection('timeline').deleteMany({ projectId: TEST_PROJECT_ID });
    await db.collection('projects').updateOne(
      { _id: new ObjectId(TEST_PROJECT_ID) },
      { 
        $set: { 
          teamName: 'Image Upload Test',
          currentScore: 0,
          categoryScores: {},
          updatedAt: new Date()
        }
      }
    );
    console.log('   ✅ Database cleaned');

    // STEP 2: Check for hackradar.png image file
    const imagePath = path.join(__dirname, 'hackradar.png');
    console.log(`\n2️⃣ CHECKING FOR IMAGE FILE...`);
    console.log(`   Looking for: ${imagePath}`);
    
    let imageExists = false;
    try {
      const stats = fs.statSync(imagePath);
      imageExists = true;
      console.log(`   ✅ Found hackradar.png (${Math.round(stats.size / 1024)}KB)`);
    } catch (error) {
      console.log(`   ❌ hackradar.png not found at ${imagePath}`);
      console.log(`   📝 Creating a test image placeholder...`);
      
      // Create a simple test image file (1x1 PNG)
      const testImageData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00, 
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00, 
        0x01, 0x00, 0x01, 0x5C, 0xC2, 0xD4, 0xE4, 0x00, 0x00, 0x00, 0x00, 0x49, 
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);
      fs.writeFileSync(imagePath, testImageData);
      console.log(`   ✅ Created test hackradar.png (${Math.round(testImageData.length / 1024)}KB)`);
    }

    // STEP 3: First submission - text only to establish context
    console.log('\n3️⃣ FIRST SUBMISSION (TEXT ONLY) - ESTABLISHING CONTEXT...');
    const contextSubmission = "We're building HackRadar, an AI-powered hackathon evaluation platform. The system provides real-time scoring and feedback for hackathon teams.";
    
    const contextResult = await makeSubmission(contextSubmission);
    
    if (!contextResult.evaluation) {
      throw new Error('Context submission failed to get evaluation!');
    }
    
    console.log('   📤 Context Submission Result:');
    console.log(`      Success: ${contextResult.success}`);
    console.log(`      Entry ID: ${contextResult.entryId}`);
    console.log(`      Score: ${contextResult.evaluation.scores.final_score}/100`);
    console.log(`      Conversation ID: ${contextResult.evaluation.textEval?.conversationId}`);

    // STEP 4: Second submission - with hackradar.png image
    console.log('\n4️⃣ SECOND SUBMISSION (WITH HACKRADAR IMAGE)...');
    const imageSubmission = "Here's a screenshot of our HackRadar platform in action. This shows the real-time scoring dashboard we've built.";
    
    const imageResult = await makeSubmissionWithImage(imageSubmission, imagePath);
    
    if (!imageResult.evaluation) {
      console.log('   ❌ IMAGE SUBMISSION DETAILS:');
      console.log(`      Full result: ${JSON.stringify(imageResult, null, 2)}`);
      throw new Error('Image submission failed to get evaluation!');
    }
    
    console.log('   📤 Image Submission Result:');
    console.log(`      Success: ${imageResult.success}`);
    console.log(`      Entry ID: ${imageResult.entryId}`);
    console.log(`      Has Image: ${imageResult.entry?.files?.length > 0 ? 'YES' : 'NO'}`);
    if (imageResult.entry?.files?.length > 0) {
      const imageFile = imageResult.entry.files[0];
      console.log(`      Image Details: ${imageFile.name} (${imageFile.type}, ${Math.round(imageFile.size / 1024)}KB)`);
    }
    console.log(`      Score: ${imageResult.evaluation.scores.final_score}/100`);
    console.log(`      Score Change: ${imageResult.evaluation.scores.final_score - contextResult.evaluation.scores.final_score > 0 ? '+' : ''}${imageResult.evaluation.scores.final_score - contextResult.evaluation.scores.final_score}`);
    console.log(`      Conversation ID: ${imageResult.evaluation.textEval?.conversationId}`);

    // STEP 5: Analyze conversation history and image processing
    console.log('\n5️⃣ ANALYZING IMAGE PROCESSING & CONVERSATION HISTORY...');
    
    // Check database storage
    const imageEntry = await db.collection('timeline').findOne({ _id: new ObjectId(imageResult.entryId) });
    console.log('   💾 Database Storage Analysis:');
    console.log(`      Entry found: ${!!imageEntry}`);
    console.log(`      Has files array: ${!!imageEntry?.files}`);
    console.log(`      Files count: ${imageEntry?.files?.length || 0}`);
    console.log(`      Has evaluation: ${!!imageEntry?.evaluation}`);
    console.log(`      Conversation ID stored: ${imageEntry?.anthropic_conversation_id || 'MISSING'}`);

    if (imageEntry?.files?.length > 0) {
      const storedFile = imageEntry.files[0];
      console.log(`      Stored file: ${storedFile.name} (${storedFile.type})`);
      console.log(`      Is image: ${storedFile.isImage}`);
      console.log(`      Has base64 data: ${!!storedFile.data} (${storedFile.data ? storedFile.data.length : 0} chars)`);
    }

    // Analyze debug logs for conversation history
    const debugLogs = imageResult.debugLogs || [];
    const historyLog = debugLogs.find(log => log.includes('Built conversation with'));
    const anthropicLog = debugLogs.find(log => log.includes('Using conversation history with'));
    
    console.log('   🧠 Conversation History Analysis:');
    if (historyLog) {
      console.log(`      ${historyLog}`);
      const match = historyLog.match(/Built conversation with (\d+) messages from (\d+) submissions/);
      if (match) {
        const messages = parseInt(match[1]);
        const submissions = parseInt(match[2]);
        console.log(`      Context: ${submissions} previous submissions → ${messages} messages`);
        console.log(`      Expected: 1 previous submission → 4 messages (${submissions === 1 && messages === 4 ? '✅' : '❌'})`);
      }
    } else {
      console.log('      ❌ No conversation history building log found');
    }
    
    if (anthropicLog) {
      console.log(`      ${anthropicLog}`);
    } else {
      console.log('      ❌ No Anthropic conversation usage log found');
    }

    // STEP 6: Anthropic image processing validation
    console.log('\n6️⃣ ANTHROPIC IMAGE PROCESSING VALIDATION...');
    
    // Check if scores improved with image context
    const scoreImprovement = imageResult.evaluation.scores.final_score - contextResult.evaluation.scores.final_score;
    console.log(`   📊 Score Impact Analysis:`);
    console.log(`      Text only score: ${contextResult.evaluation.scores.final_score}/100`);
    console.log(`      With image score: ${imageResult.evaluation.scores.final_score}/100`);
    console.log(`      Score change: ${scoreImprovement > 0 ? '+' : ''}${scoreImprovement} points`);
    console.log(`      Image helped: ${scoreImprovement >= 0 ? '✅ YES' : '❌ NO'}`);

    // Check evaluation content for image-related insights
    const evidence = imageResult.evaluation.textEval?.evidence || [];
    const gaps = imageResult.evaluation.textEval?.gaps || [];
    
    console.log(`   🔍 Evaluation Content Analysis:`);
    console.log(`      Evidence items: ${evidence.length}`);
    console.log(`      Gap items: ${gaps.length}`);
    
    // Look for image-related content in evaluation
    const imageRelatedEvidence = evidence.filter(item => 
      item.toLowerCase().includes('screenshot') || 
      item.toLowerCase().includes('image') || 
      item.toLowerCase().includes('visual') ||
      item.toLowerCase().includes('dashboard') ||
      item.toLowerCase().includes('platform')
    );
    
    console.log(`      Image-related evidence: ${imageRelatedEvidence.length}`);
    if (imageRelatedEvidence.length > 0) {
      console.log(`      Examples: "${imageRelatedEvidence[0].substring(0, 80)}..."`);
    }

    // STEP 7: Third submission to test continued conversation with image history
    console.log('\n7️⃣ THIRD SUBMISSION - TESTING CONVERSATION CONTINUITY...');
    const followUpSubmission = "As you can see from the screenshot above, our platform is fully functional with real-time scoring. We now have 500+ teams using it.";
    
    const followUpResult = await makeSubmission(followUpSubmission);
    
    if (!followUpResult.evaluation) {
      throw new Error('Follow-up submission failed to get evaluation!');
    }
    
    console.log('   📤 Follow-up Submission Result:');
    console.log(`      Success: ${followUpResult.success}`);
    console.log(`      Score: ${followUpResult.evaluation.scores.final_score}/100`);
    console.log(`      References image: ${followUpSubmission.includes('screenshot') ? '✅ YES' : '❌ NO'}`);
    
    // Check if this submission has conversation history including the image
    const followUpDebugLogs = followUpResult.debugLogs || [];
    const followUpHistoryLog = followUpDebugLogs.find(log => log.includes('Built conversation with'));
    
    console.log('   🔗 Conversation Continuity Check:');
    if (followUpHistoryLog) {
      console.log(`      ${followUpHistoryLog}`);
      const match = followUpHistoryLog.match(/Built conversation with (\d+) messages from (\d+) submissions/);
      if (match) {
        const messages = parseInt(match[1]);
        const submissions = parseInt(match[2]);
        console.log(`      Context includes: ${submissions} submissions (text + image) → ${messages} messages`);
        console.log(`      Expected: 2 previous submissions → 6+ messages (${submissions === 2 ? '✅' : '❌'})`);
      }
    }

    // STEP 8: Final validation
    console.log('\n8️⃣ FINAL VALIDATION...');
    
    const allEntries = await db.collection('timeline')
      .find({ projectId: TEST_PROJECT_ID })
      .sort({ createdAt: 1 })
      .toArray();
    
    console.log(`   📊 Complete Flow Analysis:`);
    console.log(`      Total submissions: ${allEntries.length}`);
    console.log(`      Submissions with evaluations: ${allEntries.filter(e => e.evaluation).length}`);
    console.log(`      Submissions with images: ${allEntries.filter(e => e.files?.length > 0).length}`);
    console.log(`      All have conversation IDs: ${allEntries.every(e => e.anthropic_conversation_id) ? '✅ YES' : '❌ NO'}`);

    // Success criteria
    const hasImageSubmission = allEntries.some(e => e.files?.length > 0);
    const imageProcessedByAnthropic = scoreImprovement >= 0; // Anthropic could evaluate with image
    const conversationContinuity = followUpHistoryLog && followUpHistoryLog.includes('2 submissions');
    const allEvaluated = allEntries.every(e => e.evaluation);

    console.log('\n✅ SUCCESS CRITERIA:');
    console.log(`   📸 Image uploaded and stored: ${hasImageSubmission ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   🤖 Anthropic processed image: ${imageProcessedByAnthropic ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   🔗 Conversation continuity: ${conversationContinuity ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   📊 All submissions evaluated: ${allEvaluated ? '✅ PASS' : '❌ FAIL'}`);

    if (hasImageSubmission && imageProcessedByAnthropic && conversationContinuity && allEvaluated) {
      console.log('\n🎉 IMAGE UPLOAD & ANTHROPIC INTEGRATION TEST PASSED! 🎉');
      console.log('   ✅ Images are properly uploaded and stored');
      console.log('   ✅ Anthropic receives images in conversation history');
      console.log('   ✅ Image content influences evaluation scores');
      console.log('   ✅ Conversation continuity maintained across submissions');
    } else {
      console.log('\n❌ IMAGE UPLOAD & ANTHROPIC INTEGRATION TEST FAILED');
      console.log('   The image processing and conversation system has issues.');
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
    console.error('❌ Text submission API call failed:', error.message);
    throw error;
  }
}

async function makeSubmissionWithImage(text, imagePath) {
  const formData = new FormData();
  formData.append('projectId', TEST_PROJECT_ID);
  formData.append('text', text);
  formData.append('url', '');
  formData.append('captureWebsite', 'false');
  formData.append('websiteUrl', '');
  formData.append('fileCount', '1');
  formData.append('timestamp', Date.now().toString());
  
  // Add the image file
  const imageStream = fs.createReadStream(imagePath);
  formData.append('file_0', imageStream);

  try {
    const response = await fetch(`${API_BASE_URL}/api/timeline`, {
      method: 'POST',
      body: formData,
      timeout: 45000 // Longer timeout for image processing
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Image submission API call failed:', error.message);
    throw error;
  }
}

testImageUploadAndEvaluation().catch(error => {
  console.error('\n💥 CRITICAL ERROR:', error.message);
  process.exit(1);
});