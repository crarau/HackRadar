#!/usr/bin/env node

const { LinkedInPoster } = require('./linkedin-poster');

async function createSession() {
  console.log('🚀 LinkedIn Session Creator for HackRadar');
  console.log('=========================================\n');
  
  const poster = new LinkedInPoster();
  
  try {
    console.log('📋 This script will:');
    console.log('1. Open a browser window');
    console.log('2. Navigate to LinkedIn');
    console.log('3. Check for existing session or prompt for login');
    console.log('4. Save the session for future use\n');
    
    // Initialize browser in visible mode so you can complete 2FA if needed
    console.log('🌐 Opening browser...');
    await poster.init(false); // false = show browser window
    
    // Attempt login (will check for existing session first)
    await poster.login();
    
    console.log('\n✅ Session established successfully!');
    console.log('📁 Session saved in: ./linkedin-session/');
    console.log('\n🎉 You can now run the posting bot without logging in again!');
    console.log('Run: npm start');
    
    // Keep browser open for 5 seconds to verify login
    console.log('\n⏰ Browser will close in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('\n❌ Error creating session:', error.message);
    console.error('Please try again or check your credentials.');
  } finally {
    await poster.close();
    console.log('\n👋 Session creator closed.');
  }
}

// Run the session creator
if (require.main === module) {
  createSession().catch(console.error);
}

module.exports = { createSession };