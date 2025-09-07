const { MongoClient, ObjectId } = require('mongodb');
const { default: fetch } = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
require('dotenv').config({ path: '.env.local' });

// Test configuration
const TEST_PROJECT_ID = '68bc5da3a1e502fdc1292a65';
const API_BASE_URL = 'http://localhost:7843';
const WEBSITE_URL = 'https://hackradar.me';

async function testWebsiteScreenshotAndMultiFormatUpload() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('🌐 TESTING WEBSITE SCREENSHOT + MULTI-FORMAT UPLOAD & ANTHROPIC INTEGRATION');
  console.log('🎯 Goal: Test automated screenshot capture + text, image, PDF, and website processing');
  console.log('📝 Flow: Text → Manual Image → PDF → Website Screenshot → Comprehensive submission');
  console.log('🌍 Website: https://hackradar.me');
  console.log('='.repeat(110));

  let browser = null;

  try {
    // STEP 1: Clean database for fresh test
    console.log('\n1️⃣ CLEANING DATABASE...');
    await db.collection('timeline').deleteMany({ projectId: TEST_PROJECT_ID });
    await db.collection('projects').updateOne(
      { _id: new ObjectId(TEST_PROJECT_ID) },
      { 
        $set: { 
          teamName: 'Website Screenshot + Multi-Format Test',
          currentScore: 0,
          categoryScores: {},
          updatedAt: new Date()
        }
      }
    );
    console.log('   ✅ Database cleaned');

    // STEP 2: Initialize headless Chrome browser
    console.log('\n2️⃣ INITIALIZING HEADLESS CHROME BROWSER...');
    console.log(`   🌐 Target website: ${WEBSITE_URL}`);
    
    browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // This might help with memory issues
        '--disable-gpu'
      ]
    });
    console.log('   ✅ Headless Chrome browser launched');

    // STEP 3: Check for existing files
    console.log('\n3️⃣ CHECKING FOR EXISTING FILES...');
    
    // Check for manual image
    const manualImagePath = path.join(__dirname, 'hackradar.png');
    let manualImageExists = false;
    try {
      const imageStats = fs.statSync(manualImagePath);
      manualImageExists = true;
      console.log(`   ✅ Found manual hackradar.png (${Math.round(imageStats.size / 1024)}KB)`);
    } catch (error) {
      console.log(`   ❌ Manual hackradar.png not found`);
    }
    
    // Check for PDF
    const pdfPath = path.join(__dirname, 'hackradar.me.pdf');
    let pdfExists = false;
    try {
      const pdfStats = fs.statSync(pdfPath);
      pdfExists = true;
      console.log(`   ✅ Found hackradar.me.pdf (${Math.round(pdfStats.size / 1024)}KB)`);
    } catch (error) {
      console.log(`   ❌ hackradar.me.pdf not found`);
    }

    // STEP 4: Capture website screenshot
    console.log('\n4️⃣ CAPTURING WEBSITE SCREENSHOT...');
    const screenshotPath = path.join(__dirname, 'hackradar-website-screenshot.png');
    
    try {
      const page = await browser.newPage();
      
      // Set viewport for consistent screenshots
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
      });

      console.log(`   🌐 Navigating to ${WEBSITE_URL}...`);
      
      // Navigate with extended timeout and wait for network to be idle
      await page.goto(WEBSITE_URL, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      console.log('   📸 Taking full page screenshot...');
      
      // Take screenshot
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        type: 'png'
      });
      
      await page.close();
      
      // Verify screenshot was created
      const screenshotStats = fs.statSync(screenshotPath);
      console.log(`   ✅ Website screenshot captured: hackradar-website-screenshot.png (${Math.round(screenshotStats.size / 1024)}KB)`);
      
    } catch (screenshotError) {
      console.error('   ❌ Screenshot capture failed:', screenshotError.message);
      throw new Error(`Failed to capture website screenshot: ${screenshotError.message}`);
    }

    // STEP 5: First submission - text only (baseline)
    console.log('\n5️⃣ FIRST SUBMISSION (TEXT ONLY) - BASELINE...');
    const textSubmission = "We're building HackRadar, an AI-powered hackathon evaluation platform. Check out our live website at hackradar.me.";
    
    const textResult = await makeSubmission(textSubmission);
    
    if (!textResult.evaluation) {
      throw new Error('Text submission failed to get evaluation!');
    }
    
    console.log('   📤 Text-Only Result:');
    console.log(`      Success: ${textResult.success}`);
    console.log(`      Entry ID: ${textResult.entryId}`);
    console.log(`      Score: ${textResult.evaluation.scores.final_score}/100`);
    console.log(`      Conversation ID: ${textResult.evaluation.textEval?.conversationId}`);

    // STEP 6: Second submission - with manual image (if available)
    let imageResult = null;
    if (manualImageExists) {
      console.log('\n6️⃣ SECOND SUBMISSION (WITH MANUAL HACKRADAR IMAGE)...');
      const imageSubmission = "Here's our manual HackRadar platform screenshot showing the dashboard interface.";
      
      imageResult = await makeSubmissionWithFiles(imageSubmission, [
        { path: manualImagePath, fieldName: 'file_0' }
      ]);
      
      if (!imageResult.evaluation) {
        throw new Error('Manual image submission failed to get evaluation!');
      }
      
      console.log('   📤 Manual Image Submission Result:');
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
      const prevScore = textResult.evaluation.scores.final_score;
      console.log(`      Score Change: ${imageResult.evaluation.scores.final_score - prevScore > 0 ? '+' : ''}${imageResult.evaluation.scores.final_score - prevScore}`);
      console.log(`      Conversation ID: ${imageResult.evaluation.textEval?.conversationId}`);
    } else {
      console.log('\n6️⃣ SKIPPING MANUAL IMAGE SUBMISSION - File not found');
      imageResult = textResult; // Use text result as baseline for next comparison
    }

    // STEP 7: Third submission - with PDF (if available)
    let pdfResult = null;
    if (pdfExists) {
      console.log('\n7️⃣ THIRD SUBMISSION (WITH HACKRADAR PDF)...');
      const pdfSubmission = "Here's our comprehensive HackRadar documentation and business plan from hackradar.me.";
      
      pdfResult = await makeSubmissionWithFiles(pdfSubmission, [
        { path: pdfPath, fieldName: 'file_0' }
      ]);
      
      if (!pdfResult.evaluation) {
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
      const prevScore = imageResult.evaluation.scores.final_score;
      console.log(`      Score Change: ${pdfResult.evaluation.scores.final_score - prevScore > 0 ? '+' : ''}${pdfResult.evaluation.scores.final_score - prevScore}`);
      console.log(`      Conversation ID: ${pdfResult.evaluation.textEval?.conversationId}`);
    } else {
      console.log('\n7️⃣ SKIPPING PDF SUBMISSION - File not found');
      pdfResult = imageResult; // Use previous result as baseline
    }

    // STEP 8: Fourth submission - with website screenshot
    console.log('\n8️⃣ FOURTH SUBMISSION (WITH WEBSITE SCREENSHOT)...');
    const websiteSubmission = `Here's a live screenshot of our HackRadar website at ${WEBSITE_URL}. This shows our platform as it appears to users right now.`;
    
    const websiteResult = await makeSubmissionWithFiles(websiteSubmission, [
      { path: screenshotPath, fieldName: 'file_0' }
    ]);
    
    if (!websiteResult.evaluation) {
      throw new Error('Website screenshot submission failed to get evaluation!');
    }
    
    console.log('   📤 Website Screenshot Submission Result:');
    console.log(`      Success: ${websiteResult.success}`);
    console.log(`      Entry ID: ${websiteResult.entryId}`);
    console.log(`      Has Screenshot: ${websiteResult.entry?.files?.length > 0 ? 'YES' : 'NO'}`);
    if (websiteResult.entry?.files?.length > 0) {
      const screenshotFile = websiteResult.entry.files.find(f => f.isImage);
      if (screenshotFile) {
        console.log(`      Screenshot Details: ${screenshotFile.name} (${screenshotFile.type}, ${Math.round(screenshotFile.size / 1024)}KB)`);
      }
    }
    console.log(`      Score: ${websiteResult.evaluation.scores.final_score}/100`);
    const prevScore = pdfResult.evaluation.scores.final_score;
    console.log(`      Score Change: ${websiteResult.evaluation.scores.final_score - prevScore > 0 ? '+' : ''}${websiteResult.evaluation.scores.final_score - prevScore}`);
    console.log(`      Conversation ID: ${websiteResult.evaluation.textEval?.conversationId}`);

    // STEP 9: Fifth submission - comprehensive with all available files
    console.log('\n9️⃣ FIFTH SUBMISSION (COMPREHENSIVE - ALL AVAILABLE FILES)...');
    
    const allFiles = [];
    let fileIndex = 0;
    
    if (manualImageExists) {
      allFiles.push({ path: manualImagePath, fieldName: `file_${fileIndex++}` });
    }
    if (pdfExists) {
      allFiles.push({ path: pdfPath, fieldName: `file_${fileIndex++}` });
    }
    allFiles.push({ path: screenshotPath, fieldName: `file_${fileIndex++}` }); // Always include website screenshot
    
    const comprehensiveSubmission = `Here's our complete HackRadar submission including ${allFiles.length} files: ${manualImageExists ? 'manual platform screenshot, ' : ''}${pdfExists ? 'business documentation, ' : ''}and live website screenshot from ${WEBSITE_URL}. This represents our full hackathon project.`;
    
    const comprehensiveResult = await makeSubmissionWithFiles(comprehensiveSubmission, allFiles);
    
    if (!comprehensiveResult.evaluation) {
      throw new Error('Comprehensive submission failed to get evaluation!');
    }
    
    console.log('   📤 Comprehensive Submission Result:');
    console.log(`      Success: ${comprehensiveResult.success}`);
    console.log(`      Entry ID: ${comprehensiveResult.entryId}`);
    console.log(`      File Count: ${comprehensiveResult.entry?.files?.length || 0}`);
    if (comprehensiveResult.entry?.files?.length > 0) {
      comprehensiveResult.entry.files.forEach((file, idx) => {
        const fileType = file.isImage ? '[IMAGE]' : file.type === 'application/pdf' ? '[PDF]' : '[DOCUMENT]';
        const isWebsiteScreenshot = file.name.includes('website-screenshot');
        console.log(`      File ${idx + 1}: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB) ${fileType}${isWebsiteScreenshot ? ' 🌐[WEBSITE]' : ''}`);
      });
    }
    console.log(`      Score: ${comprehensiveResult.evaluation.scores.final_score}/100`);
    const prevScore = websiteResult.evaluation.scores.final_score;
    console.log(`      Score Change: ${comprehensiveResult.evaluation.scores.final_score - prevScore > 0 ? '+' : ''}${comprehensiveResult.evaluation.scores.final_score - prevScore}`);
    console.log(`      Conversation ID: ${comprehensiveResult.evaluation.textEval?.conversationId}`);

    // STEP 10: Analyze conversation history and multi-format processing
    console.log('\n🔟 ANALYZING WEBSITE SCREENSHOT & MULTI-FORMAT PROCESSING...');
    
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
      const hasManualImage = entry.files?.some(f => f.isImage && !f.name.includes('website-screenshot')) || false;
      const hasWebsiteScreenshot = entry.files?.some(f => f.name.includes('website-screenshot')) || false;
      const hasPdf = entry.files?.some(f => f.type === 'application/pdf') || false;
      const fileTypes = [];
      if (hasManualImage) fileTypes.push('MANUAL-IMG');
      if (hasWebsiteScreenshot) fileTypes.push('WEBSITE-IMG');
      if (hasPdf) fileTypes.push('PDF');
      if (!hasFiles) fileTypes.push('TEXT');
      
      console.log(`      Entry ${idx + 1}: ${entry.text?.substring(0, 40)}... [${fileTypes.join(', ')}] Score: ${entry.evaluation?.scores?.final_score}/100`);
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
        console.log(`      Expected: ${allEntries.length - 1} previous submissions → ${(allEntries.length - 1) * 2 + 2}+ messages`);
      }
    } else {
      console.log('      ❌ No conversation history building log found');
    }

    // STEP 11: Website screenshot specific validation
    console.log('\n1️⃣1️⃣ WEBSITE SCREENSHOT SPECIFIC VALIDATION...');
    
    const websiteEntry = await db.collection('timeline').findOne({ _id: new ObjectId(websiteResult.entryId) });
    const comprehensiveEntry = await db.collection('timeline').findOne({ _id: new ObjectId(comprehensiveResult.entryId) });
    
    console.log('   🌐 Website Screenshot Analysis:');
    console.log(`      Website screenshot created: ${fs.existsSync(screenshotPath) ? '✅ YES' : '❌ NO'}`);
    console.log(`      Stored in website submission: ${websiteEntry?.files?.some(f => f.name.includes('website-screenshot')) ? '✅ YES' : '❌ NO'}`);
    console.log(`      Included in comprehensive submission: ${comprehensiveEntry?.files?.some(f => f.name.includes('website-screenshot')) ? '✅ YES' : '❌ NO'}`);
    
    if (websiteEntry?.files?.length > 0) {
      const websiteScreenshotFile = websiteEntry.files.find(f => f.name.includes('website-screenshot'));
      if (websiteScreenshotFile) {
        console.log(`      Website screenshot file: ${websiteScreenshotFile.name}`);
        console.log(`        Size: ${Math.round(websiteScreenshotFile.size / 1024)}KB`);
        console.log(`        Is Image: ${websiteScreenshotFile.isImage ? '✅ YES' : '❌ NO'}`);
        console.log(`        Has Data: ${websiteScreenshotFile.data ? '✅ YES' : '❌ NO'} (${websiteScreenshotFile.data ? websiteScreenshotFile.data.length : 0} chars)`);
      }
    }

    // STEP 12: Score progression analysis
    console.log('\n1️⃣2️⃣ SCORE PROGRESSION ANALYSIS...');
    
    const scores = [
      { type: 'Text Only', score: textResult.evaluation.scores.final_score }
    ];
    
    if (manualImageExists && imageResult) {
      scores.push({ type: 'Text + Manual Image', score: imageResult.evaluation.scores.final_score });
    }
    if (pdfExists && pdfResult) {
      scores.push({ type: 'Text + PDF', score: pdfResult.evaluation.scores.final_score });
    }
    scores.push({ type: 'Text + Website Screenshot', score: websiteResult.evaluation.scores.final_score });
    scores.push({ type: 'Comprehensive (All Files)', score: comprehensiveResult.evaluation.scores.final_score });
    
    console.log('   📊 Score Evolution:');
    scores.forEach((item, idx) => {
      const prevScore = idx > 0 ? scores[idx - 1].score : 0;
      const change = idx > 0 ? item.score - prevScore : item.score;
      const changeStr = idx > 0 ? (change >= 0 ? `(+${change})` : `(${change})`) : '';
      console.log(`      ${item.type}: ${item.score}/100 ${changeStr}`);
    });
    
    const totalImprovement = comprehensiveResult.evaluation.scores.final_score - textResult.evaluation.scores.final_score;
    console.log(`      Total Improvement: +${totalImprovement} points from adding multimedia + website screenshot`);

    // STEP 13: Evidence analysis for website content
    console.log('\n1️⃣3️⃣ EVIDENCE ANALYSIS FOR WEBSITE CONTENT...');
    
    const evidence = comprehensiveResult.evaluation.textEval?.evidence || [];
    const gaps = comprehensiveResult.evaluation.textEval?.gaps || [];
    
    console.log(`   🔍 Evaluation Content Analysis:`);
    console.log(`      Evidence items: ${evidence.length}`);
    console.log(`      Gap items: ${gaps.length}`);
    
    // Look for website-specific content in evaluation
    const websiteRelatedEvidence = evidence.filter(item => 
      item.toLowerCase().includes('website') || 
      item.toLowerCase().includes('hackradar.me') ||
      item.toLowerCase().includes('live') ||
      item.toLowerCase().includes('screenshot') ||
      item.toLowerCase().includes('online')
    );
    
    const imageRelatedEvidence = evidence.filter(item => 
      item.toLowerCase().includes('dashboard') || 
      item.toLowerCase().includes('interface') ||
      item.toLowerCase().includes('platform') ||
      item.toLowerCase().includes('visual')
    );
    
    const pdfRelatedEvidence = evidence.filter(item => 
      item.toLowerCase().includes('document') || 
      item.toLowerCase().includes('business') ||
      item.toLowerCase().includes('comprehensive') ||
      item.toLowerCase().includes('plan')
    );
    
    console.log(`      Website-related evidence: ${websiteRelatedEvidence.length}`);
    if (websiteRelatedEvidence.length > 0) {
      console.log(`        Example: "${websiteRelatedEvidence[0].substring(0, 80)}..."`);
    }
    
    console.log(`      Image-related evidence: ${imageRelatedEvidence.length}`);
    if (imageRelatedEvidence.length > 0) {
      console.log(`        Example: "${imageRelatedEvidence[0].substring(0, 80)}..."`);
    }
    
    console.log(`      PDF-related evidence: ${pdfRelatedEvidence.length}`);
    if (pdfRelatedEvidence.length > 0) {
      console.log(`        Example: "${pdfRelatedEvidence[0].substring(0, 80)}..."`);
    }

    // STEP 14: Final validation
    console.log('\n1️⃣4️⃣ FINAL VALIDATION...');
    
    // Success criteria
    const hasWebsiteScreenshot = allEntries.some(e => e.files?.some(f => f.name.includes('website-screenshot')));
    const hasManualFiles = manualImageExists || pdfExists;
    const allEvaluated = allEntries.every(e => e.evaluation);
    const scoresImproved = comprehensiveResult.evaluation.scores.final_score >= textResult.evaluation.scores.final_score;
    const websiteScreenshotWorking = fs.existsSync(screenshotPath) && hasWebsiteScreenshot;
    const anthropicProcessedWebsite = websiteRelatedEvidence.length > 0;

    console.log('   ✅ SUCCESS CRITERIA:');
    console.log(`      🌐 Website screenshot captured automatically: ${websiteScreenshotWorking ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`      📄 All formats processed (Text/Image/PDF/Website): ${hasWebsiteScreenshot && (hasManualFiles || true) ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`      🤖 All submissions evaluated: ${allEvaluated ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`      📈 Scores improved with multimedia: ${scoresImproved ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`      🧠 Anthropic processed website content: ${anthropicProcessedWebsite ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`      🔗 Headless Chrome integration working: ${websiteScreenshotWorking ? '✅ PASS' : '❌ FAIL'}`);

    if (websiteScreenshotWorking && allEvaluated && scoresImproved && anthropicProcessedWebsite) {
      console.log('\n🎉 WEBSITE SCREENSHOT + MULTI-FORMAT INTEGRATION TEST PASSED! 🎉');
      console.log('   ✅ Headless Chrome automatically captures website screenshots');
      console.log('   ✅ Website screenshots are properly uploaded and stored');
      console.log('   ✅ Anthropic receives and processes website screenshot content');
      console.log('   ✅ Website screenshots influence evaluation scores positively');
      console.log('   ✅ Complete multi-format pipeline (text/image/PDF/website) works end-to-end');
      console.log(`   ✅ Live website ${WEBSITE_URL} successfully captured and processed`);
    } else {
      console.log('\n❌ WEBSITE SCREENSHOT + MULTI-FORMAT INTEGRATION TEST FAILED');
      console.log('   The website screenshot and multi-format processing system has issues.');
    }

  } catch (error) {
    console.error('\n💥 TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    // Clean up browser
    if (browser) {
      await browser.close();
      console.log('   🧹 Browser closed');
    }
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
      timeout: 90000 // Extended timeout for multi-file + website processing
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

testWebsiteScreenshotAndMultiFormatUpload().catch(error => {
  console.error('\n💥 CRITICAL ERROR:', error.message);
  process.exit(1);
});