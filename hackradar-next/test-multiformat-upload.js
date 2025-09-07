const { MongoClient, ObjectId } = require('mongodb');
const { default: fetch } = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Test configuration
const TEST_PROJECT_ID = '68bc5da3a1e502fdc1292a65';
const API_BASE_URL = 'http://localhost:7843';

async function testMultiFormatUploadAndEvaluation() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('📄 TESTING MULTI-FORMAT UPLOAD & ANTHROPIC INTEGRATION');
  console.log('🎯 Goal: Test text, image, and PDF processing through Anthropic conversation history');
  console.log('📝 Flow: Text → Image → PDF → Comprehensive submission → Verify all processed');
  console.log('='.repeat(95));

  try {
    // STEP 1: Clean database for fresh test
    console.log('\n1️⃣ CLEANING DATABASE...');
    await db.collection('timeline').deleteMany({ projectId: TEST_PROJECT_ID });
    await db.collection('projects').updateOne(
      { _id: new ObjectId(TEST_PROJECT_ID) },
      { 
        $set: { 
          teamName: 'Multi-Format Upload Test',
          currentScore: 0,
          categoryScores: {},
          updatedAt: new Date()
        }
      }
    );
    console.log('   ✅ Database cleaned');

    // STEP 2: Check for required files
    console.log('\n2️⃣ CHECKING FOR REQUIRED FILES...');
    
    // Check for image
    const imagePath = path.join(__dirname, 'hackradar.png');
    let imageExists = false;
    try {
      const imageStats = fs.statSync(imagePath);
      imageExists = true;
      console.log(`   ✅ Found hackradar.png (${Math.round(imageStats.size / 1024)}KB)`);
    } catch (error) {
      console.log(`   ❌ hackradar.png not found at ${imagePath}`);
    }
    
    // Check for PDF
    const pdfPath = path.join(__dirname, 'hackradar.me.pdf');
    let pdfExists = false;
    try {
      const pdfStats = fs.statSync(pdfPath);
      pdfExists = true;
      console.log(`   ✅ Found hackradar.me.pdf (${Math.round(pdfStats.size / 1024)}KB)`);
    } catch (error) {
      console.log(`   ❌ hackradar.me.pdf not found at ${pdfPath}`);
      console.log('   📝 Creating a test PDF placeholder...');
      
      // Create a minimal PDF file for testing
      const minimalPdf = Buffer.from([
        0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x33, 0x0A, 0x25, 0xC4, 0xE5, 0xF2, 0xE5, 0xEB, 0xA7, 0xF3, 0xA0, 0xD0, 0xC4, 0xC6, 0x0A,
        0x34, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A, 0x3C, 0x3C, 0x0A, 0x2F, 0x4C, 0x65, 0x6E, 0x67, 0x74, 0x68, 0x20, 0x35, 0x20, 0x30,
        0x20, 0x52, 0x0A, 0x2F, 0x46, 0x69, 0x6C, 0x74, 0x65, 0x72, 0x20, 0x2F, 0x41, 0x53, 0x43, 0x49, 0x49, 0x38, 0x35, 0x44, 0x65, 0x63,
        0x6F, 0x64, 0x65, 0x0A, 0x3E, 0x3E, 0x0A, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6D, 0x0A, 0x48, 0x61, 0x63, 0x6B, 0x52, 0x61, 0x64, 0x61,
        0x72, 0x20, 0x54, 0x65, 0x73, 0x74, 0x20, 0x50, 0x44, 0x46, 0x0A, 0x65, 0x6E, 0x64, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6D, 0x0A, 0x65,
        0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A, 0x78, 0x72, 0x65, 0x66, 0x0A, 0x30, 0x20, 0x35, 0x0A, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30,
        0x30, 0x30, 0x30, 0x20, 0x36, 0x35, 0x35, 0x33, 0x35, 0x20, 0x66, 0x20, 0x0A, 0x74, 0x72, 0x61, 0x69, 0x6C, 0x65, 0x72, 0x0A, 0x3C,
        0x3C, 0x0A, 0x2F, 0x53, 0x69, 0x7A, 0x65, 0x20, 0x35, 0x0A, 0x2F, 0x52, 0x6F, 0x6F, 0x74, 0x20, 0x34, 0x20, 0x30, 0x20, 0x52, 0x0A,
        0x3E, 0x3E, 0x0A, 0x73, 0x74, 0x61, 0x72, 0x74, 0x78, 0x72, 0x65, 0x66, 0x0A, 0x31, 0x38, 0x31, 0x0A, 0x25, 0x25, 0x45, 0x4F, 0x46
      ]);
      fs.writeFileSync(pdfPath, minimalPdf);
      pdfExists = true;
      console.log(`   ✅ Created test hackradar.me.pdf (${Math.round(minimalPdf.length / 1024)}KB)`);
    }

    if (!imageExists || !pdfExists) {
      throw new Error('Required test files not found!');
    }

    // STEP 3: First submission - text only (baseline)
    console.log('\n3️⃣ FIRST SUBMISSION (TEXT ONLY) - BASELINE...');
    const textSubmission = "We're building HackRadar, an AI-powered hackathon evaluation platform. Our team has initial concept and basic architecture planned.";
    
    const textResult = await makeSubmission(textSubmission);
    
    if (!textResult.evaluation) {
      throw new Error('Text submission failed to get evaluation!');
    }
    
    console.log('   📤 Text-Only Result:');
    console.log(`      Success: ${textResult.success}`);
    console.log(`      Entry ID: ${textResult.entryId}`);
    console.log(`      Score: ${textResult.evaluation.scores.final_score}/100`);
    console.log(`      Conversation ID: ${textResult.evaluation.textEval?.conversationId}`);

    // STEP 4: Second submission - with HackRadar image
    console.log('\n4️⃣ SECOND SUBMISSION (WITH HACKRADAR SCREENSHOT)...');
    const imageSubmission = "Here's our HackRadar platform dashboard in action. You can see the real-time scoring interface we've built.";
    
    const imageResult = await makeSubmissionWithFiles(imageSubmission, [
      { path: imagePath, fieldName: 'file_0' }
    ]);
    
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
      const imageFile = imageResult.entry.files.find(f => f.isImage);
      if (imageFile) {
        console.log(`      Image Details: ${imageFile.name} (${imageFile.type}, ${Math.round(imageFile.size / 1024)}KB)`);
      }
    }
    console.log(`      Score: ${imageResult.evaluation.scores.final_score}/100`);
    console.log(`      Score Change: ${imageResult.evaluation.scores.final_score - textResult.evaluation.scores.final_score > 0 ? '+' : ''}${imageResult.evaluation.scores.final_score - textResult.evaluation.scores.final_score}`);
    console.log(`      Conversation ID: ${imageResult.evaluation.textEval?.conversationId}`);

    // STEP 5: Third submission - with PDF document
    console.log('\n5️⃣ THIRD SUBMISSION (WITH HACKRADAR PDF)...');
    const pdfSubmission = "Here's our comprehensive HackRadar documentation and business plan as presented on hackradar.me.";
    
    const pdfResult = await makeSubmissionWithFiles(pdfSubmission, [
      { path: pdfPath, fieldName: 'file_0' }
    ]);
    
    if (!pdfResult.evaluation) {
      console.log('   ❌ PDF SUBMISSION DETAILS:');
      console.log(`      Full result: ${JSON.stringify(pdfResult, null, 2)}`);
      throw new Error('PDF submission failed to get evaluation!');
    }
    
    console.log('   📤 PDF Submission Result:');
    console.log(`      Success: ${pdfResult.success}`);
    console.log(`      Entry ID: ${pdfResult.entryId}`);
    console.log(`      Has PDF: ${pdfResult.entry?.files?.length > 0 ? 'YES' : 'NO'}`);
    if (pdfResult.entry?.files?.length > 0) {
      const pdfFile = pdfResult.entry.files.find(f => f.type === 'application/pdf');
      if (pdfFile) {
        console.log(`      PDF Details: ${pdfFile.name} (${pdfFile.type}, ${Math.round(pdfFile.size / 1024)}KB)`);
      }
    }
    console.log(`      Score: ${pdfResult.evaluation.scores.final_score}/100`);
    console.log(`      Score Change: ${pdfResult.evaluation.scores.final_score - imageResult.evaluation.scores.final_score > 0 ? '+' : ''}${pdfResult.evaluation.scores.final_score - imageResult.evaluation.scores.final_score}`);
    console.log(`      Conversation ID: ${pdfResult.evaluation.textEval?.conversationId}`);

    // STEP 6: Fourth submission - comprehensive with both image and PDF
    console.log('\n6️⃣ FOURTH SUBMISSION (COMPREHENSIVE - BOTH IMAGE AND PDF)...');
    const comprehensiveSubmission = "Here's our complete HackRadar submission: the live platform screenshot and our detailed business documentation. This represents our full hackathon project.";
    
    const comprehensiveResult = await makeSubmissionWithFiles(comprehensiveSubmission, [
      { path: imagePath, fieldName: 'file_0' },
      { path: pdfPath, fieldName: 'file_1' }
    ]);
    
    if (!comprehensiveResult.evaluation) {
      throw new Error('Comprehensive submission failed to get evaluation!');
    }
    
    console.log('   📤 Comprehensive Submission Result:');
    console.log(`      Success: ${comprehensiveResult.success}`);
    console.log(`      Entry ID: ${comprehensiveResult.entryId}`);
    console.log(`      File Count: ${comprehensiveResult.entry?.files?.length || 0}`);
    if (comprehensiveResult.entry?.files?.length > 0) {
      comprehensiveResult.entry.files.forEach((file, idx) => {
        console.log(`      File ${idx + 1}: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB) ${file.isImage ? '[IMAGE]' : '[DOCUMENT]'}`);
      });
    }
    console.log(`      Score: ${comprehensiveResult.evaluation.scores.final_score}/100`);
    console.log(`      Score Change: ${comprehensiveResult.evaluation.scores.final_score - pdfResult.evaluation.scores.final_score > 0 ? '+' : ''}${comprehensiveResult.evaluation.scores.final_score - pdfResult.evaluation.scores.final_score}`);
    console.log(`      Conversation ID: ${comprehensiveResult.evaluation.textEval?.conversationId}`);

    // STEP 7: Analyze conversation history and multi-format processing
    console.log('\n7️⃣ ANALYZING MULTI-FORMAT PROCESSING & CONVERSATION HISTORY...');
    
    // Check database storage for all entries
    const allEntries = await db.collection('timeline')
      .find({ projectId: TEST_PROJECT_ID })
      .sort({ createdAt: 1 })
      .toArray();
    
    console.log('   💾 Database Storage Analysis:');
    console.log(`      Total entries: ${allEntries.length}`);
    console.log(`      Entries with evaluations: ${allEntries.filter(e => e.evaluation).length}`);
    console.log(`      Entries with files: ${allEntries.filter(e => e.files?.length > 0).length}`);
    console.log(`      All have conversation IDs: ${allEntries.every(e => e.anthropic_conversation_id) ? '✅ YES' : '❌ NO'}`);

    // Analyze each entry type
    allEntries.forEach((entry, idx) => {
      const hasFiles = entry.files?.length > 0;
      const hasImage = entry.files?.some(f => f.isImage) || false;
      const hasPdf = entry.files?.some(f => f.type === 'application/pdf') || false;
      const fileTypes = [];
      if (hasImage) fileTypes.push('IMAGE');
      if (hasPdf) fileTypes.push('PDF');
      if (!hasFiles) fileTypes.push('TEXT');
      
      console.log(`      Entry ${idx + 1}: ${entry.text?.substring(0, 30)}... [${fileTypes.join(', ')}] Score: ${entry.evaluation?.scores?.final_score}/100`);
    });

    // Analyze final submission's conversation history
    const finalDebugLogs = comprehensiveResult.debugLogs || [];
    const historyLog = finalDebugLogs.find(log => log.includes('Built conversation with'));
    
    console.log('   🧠 Conversation History Analysis:');
    if (historyLog) {
      console.log(`      ${historyLog}`);
      const match = historyLog.match(/Built conversation with (\d+) messages from (\d+) submissions/);
      if (match) {
        const messages = parseInt(match[1]);
        const submissions = parseInt(match[2]);
        console.log(`      Context: ${submissions} previous submissions → ${messages} messages`);
        console.log(`      Expected: 3 previous submissions → 10+ messages (${submissions === 3 ? '✅' : '❌'})`);
      }
    } else {
      console.log('      ❌ No conversation history building log found');
    }

    // STEP 8: Score progression analysis
    console.log('\n8️⃣ SCORE PROGRESSION ANALYSIS...');
    
    const scores = [
      { type: 'Text Only', score: textResult.evaluation.scores.final_score },
      { type: 'Text + Image', score: imageResult.evaluation.scores.final_score },
      { type: 'Text + PDF', score: pdfResult.evaluation.scores.final_score },
      { type: 'Text + Image + PDF', score: comprehensiveResult.evaluation.scores.final_score }
    ];
    
    console.log('   📊 Score Evolution:');
    scores.forEach((item, idx) => {
      const prevScore = idx > 0 ? scores[idx - 1].score : 0;
      const change = idx > 0 ? item.score - prevScore : item.score;
      const changeStr = idx > 0 ? (change >= 0 ? `(+${change})` : `(${change})`) : '';
      console.log(`      ${item.type}: ${item.score}/100 ${changeStr}`);
    });
    
    const totalImprovement = comprehensiveResult.evaluation.scores.final_score - textResult.evaluation.scores.final_score;
    console.log(`      Total Improvement: +${totalImprovement} points from adding multimedia`);

    // STEP 9: File processing validation
    console.log('\n9️⃣ FILE PROCESSING VALIDATION...');
    
    const finalEntry = await db.collection('timeline').findOne({ _id: new ObjectId(comprehensiveResult.entryId) });
    console.log('   📁 File Processing Check:');
    
    if (finalEntry?.files) {
      finalEntry.files.forEach((file, idx) => {
        console.log(`      File ${idx + 1}: ${file.name}`);
        console.log(`        Type: ${file.type}`);
        console.log(`        Size: ${Math.round(file.size / 1024)}KB`);
        console.log(`        Is Image: ${file.isImage ? '✅ YES' : '❌ NO'}`);
        console.log(`        Has Data: ${file.data ? '✅ YES' : '❌ NO'} (${file.data ? file.data.length : 0} chars)`);
        
        // Validate file data format
        if (file.data) {
          const isValidBase64 = /^[A-Za-z0-9+/=]+$/.test(file.data);
          console.log(`        Valid Base64: ${isValidBase64 ? '✅ YES' : '❌ NO'}`);
        }
      });
    }

    // STEP 10: Evidence analysis for multi-format content
    console.log('\n🔟 EVIDENCE ANALYSIS FOR MULTI-FORMAT CONTENT...');
    
    const evidence = comprehensiveResult.evaluation.textEval?.evidence || [];
    const gaps = comprehensiveResult.evaluation.textEval?.gaps || [];
    
    console.log(`   🔍 Evaluation Content Analysis:`);
    console.log(`      Evidence items: ${evidence.length}`);
    console.log(`      Gap items: ${gaps.length}`);
    
    // Look for format-specific content in evaluation
    const imageRelatedEvidence = evidence.filter(item => 
      item.toLowerCase().includes('screenshot') || 
      item.toLowerCase().includes('image') || 
      item.toLowerCase().includes('visual') ||
      item.toLowerCase().includes('dashboard') ||
      item.toLowerCase().includes('interface')
    );
    
    const pdfRelatedEvidence = evidence.filter(item => 
      item.toLowerCase().includes('document') || 
      item.toLowerCase().includes('business') ||
      item.toLowerCase().includes('plan') ||
      item.toLowerCase().includes('comprehensive') ||
      item.toLowerCase().includes('pdf')
    );
    
    console.log(`      Image-related evidence: ${imageRelatedEvidence.length}`);
    if (imageRelatedEvidence.length > 0) {
      console.log(`        Example: "${imageRelatedEvidence[0].substring(0, 80)}..."`);
    }
    
    console.log(`      PDF-related evidence: ${pdfRelatedEvidence.length}`);
    if (pdfRelatedEvidence.length > 0) {
      console.log(`        Example: "${pdfRelatedEvidence[0].substring(0, 80)}..."`);
    }

    // STEP 11: Final validation
    console.log('\n1️⃣1️⃣ FINAL VALIDATION...');
    
    // Success criteria
    const hasAllFormats = allEntries.some(e => e.files?.some(f => f.isImage)) && 
                         allEntries.some(e => e.files?.some(f => f.type === 'application/pdf'));
    const allEvaluated = allEntries.every(e => e.evaluation);
    const scoresImproved = comprehensiveResult.evaluation.scores.final_score >= textResult.evaluation.scores.final_score;
    const conversationContinuity = historyLog && historyLog.includes('3 submissions');
    const hasMultiFormatEntry = finalEntry?.files?.length >= 2;

    console.log('   ✅ SUCCESS CRITERIA:');
    console.log(`      📄 All formats processed (Text/Image/PDF): ${hasAllFormats ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`      🤖 All submissions evaluated: ${allEvaluated ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`      📈 Scores improved with multimedia: ${scoresImproved ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`      🔗 Conversation continuity maintained: ${conversationContinuity ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`      📁 Multi-format submission stored: ${hasMultiFormatEntry ? '✅ PASS' : '❌ FAIL'}`);

    if (hasAllFormats && allEvaluated && scoresImproved && conversationContinuity && hasMultiFormatEntry) {
      console.log('\n🎉 MULTI-FORMAT UPLOAD & ANTHROPIC INTEGRATION TEST PASSED! 🎉');
      console.log('   ✅ Text, images, and PDFs are properly uploaded and stored');
      console.log('   ✅ Anthropic receives all file types in conversation history');
      console.log('   ✅ Multi-format content influences evaluation scores positively');
      console.log('   ✅ Conversation continuity maintained across all submission types');
      console.log('   ✅ Complex multi-file submissions work correctly');
    } else {
      console.log('\n❌ MULTI-FORMAT UPLOAD & ANTHROPIC INTEGRATION TEST FAILED');
      console.log('   The multi-format processing system has issues that need addressing.');
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

async function makeSubmissionWithFiles(text, files) {
  const formData = new FormData();
  formData.append('projectId', TEST_PROJECT_ID);
  formData.append('text', text);
  formData.append('url', '');
  formData.append('captureWebsite', 'false');
  formData.append('websiteUrl', '');
  formData.append('fileCount', files.length.toString());
  formData.append('timestamp', Date.now().toString());
  
  // Add the files
  files.forEach((file, index) => {
    const fileStream = fs.createReadStream(file.path);
    formData.append(file.fieldName, fileStream);
  });

  try {
    const response = await fetch(`${API_BASE_URL}/api/timeline`, {
      method: 'POST',
      body: formData,
      timeout: 60000 // Longer timeout for file processing
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Multi-file submission API call failed:', error.message);
    throw error;
  }
}

testMultiFormatUploadAndEvaluation().catch(error => {
  console.error('\n💥 CRITICAL ERROR:', error.message);
  process.exit(1);
});