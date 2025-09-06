#!/usr/bin/env node

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'hackradar';

async function checkEcoTrackerUI() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    const projectsCollection = db.collection('projects');
    const timelineCollection = db.collection('timeline');
    
    // Find EcoTracker project
    const ecoProject = await projectsCollection.findOne({ 
      teamName: { $regex: /ecotracker/i }
    });
    
    if (!ecoProject) {
      console.error('❌ EcoTracker project not found!');
      return;
    }
    
    console.log('='.repeat(60));
    console.log('ECOTRACKER PROJECT STATUS');
    console.log('='.repeat(60));
    
    console.log('\n📋 Project Details:');
    console.log(`   ID: ${ecoProject._id.toString()}`);
    console.log(`   Team Name: ${ecoProject.teamName}`);
    console.log(`   User Email: ${ecoProject.userEmail}`);
    console.log(`   Description: ${ecoProject.description || 'N/A'}`);
    console.log(`   Current Score: ${ecoProject.currentScore || 'Not evaluated'}`);
    console.log(`   Created: ${new Date(ecoProject.createdAt).toLocaleString()}`);
    console.log(`   Last Updated: ${new Date(ecoProject.updatedAt).toLocaleString()}`);
    
    // Get timeline entries - EXACTLY as the UI would fetch them
    const timelineEntries = await timelineCollection
      .find({ projectId: ecoProject._id.toString() })
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log('\n📊 Timeline Entries (as UI sees them):');
    console.log(`   Total Entries: ${timelineEntries.length}`);
    
    if (timelineEntries.length > 0) {
      console.log('\n   Latest 5 Entries:');
      console.log('   ' + '-'.repeat(55));
      
      timelineEntries.slice(0, 5).forEach((entry, idx) => {
        console.log(`\n   Entry #${idx + 1}:`);
        console.log(`   ID: ${entry._id.toString()}`);
        console.log(`   Created: ${new Date(entry.createdAt).toLocaleString()}`);
        console.log(`   Type: ${entry.type || 'unknown'}`);
        
        // Show what the UI would display
        const displayText = entry.text || entry.description || entry.content || `${entry.type} submission`;
        console.log(`   Display Text: "${displayText.substring(0, 100)}${displayText.length > 100 ? '...' : ''}"`);
        
        if (entry.url) {
          console.log(`   URL: ${entry.url}`);
        }
        
        if (entry.files && entry.files.length > 0) {
          console.log(`   Files: ${entry.files.length} file(s)`);
        }
        
        if (entry.metadata) {
          console.log(`   Has Metadata: Yes (type: ${entry.metadata.type || 'evaluation'})`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('UI ACCESS INSTRUCTIONS');
    console.log('='.repeat(60));
    
    console.log('\n1. Open browser to: http://localhost:7843');
    console.log(`2. Sign in with Google using: ${ecoProject.userEmail}`);
    console.log('3. The project should auto-load after login');
    console.log('4. Timeline should display all entries');
    
    console.log('\n⚠️  If timeline is not showing:');
    console.log('   - Check browser console for errors');
    console.log('   - Verify projectId matches in localStorage');
    console.log('   - Try clearing localStorage and re-login');
    console.log('   - Check network tab for /api/timeline response');
    
    console.log('\n🔍 Debug Info for Frontend:');
    console.log(`   Project ID to look for: ${ecoProject._id.toString()}`);
    console.log(`   API call should be: /api/timeline?projectId=${ecoProject._id.toString()}`);
    console.log(`   Expected response: Array with ${timelineEntries.length} entries`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Run the check
checkEcoTrackerUI().catch(console.error);