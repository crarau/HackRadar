#!/usr/bin/env node

const { LinkedInPoster } = require('./linkedin-poster');

async function testPost() {
  console.log('🧪 LinkedIn Post Tester for HackRadar');
  console.log('=====================================\n');
  
  const poster = new LinkedInPoster();
  
  try {
    // Test post content
    const testContent = `🧪 Test post from HackRadar automation bot!

This is a test to verify our LinkedIn integration is working correctly.

Testing automated posting for AGI Ventures Canada Hackathon 3.0.

#Test #Automation #HackRadar

(This test post will be deleted shortly)`;
    
    console.log('📝 Test post content:');
    console.log('-------------------');
    console.log(testContent);
    console.log('-------------------\n');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const confirm = await new Promise(resolve => {
      readline.question('Do you want to post this test? (yes/no): ', resolve);
    });
    readline.close();
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Test cancelled.');
      return;
    }
    
    // Initialize browser
    console.log('\n🌐 Opening browser...');
    await poster.init(false); // Show browser for testing
    
    // Login (uses saved session if available)
    await poster.login();
    
    // Create the test post
    console.log('\n📤 Creating test post...');
    await poster.createPost(testContent);
    
    console.log('\n✅ Test post created successfully!');
    console.log('📌 Please check your LinkedIn profile to verify.');
    console.log('💡 Remember to delete the test post after verification.');
    
    // Keep browser open for verification
    console.log('\n⏰ Browser will stay open for 10 seconds for verification...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
  } finally {
    await poster.close();
    console.log('\n👋 Test completed.');
  }
}

// Run the test
if (require.main === module) {
  testPost().catch(console.error);
}

module.exports = { testPost };