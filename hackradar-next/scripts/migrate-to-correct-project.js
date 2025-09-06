#!/usr/bin/env node

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'hackradar';

async function migrateToCorrectProject() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    const projectsCollection = db.collection('projects');
    const timelineCollection = db.collection('timeline');
    
    // The project ID you're actually using
    const currentProjectId = '68bc5da3a1e502fdc1292a65';
    
    // The old EcoTracker project ID where the data is
    const oldProjectId = '68bc936eaec499fa3db4f7eb';
    
    console.log('🔄 Migrating timeline entries...');
    console.log(`   From project: ${oldProjectId}`);
    console.log(`   To project: ${currentProjectId}`);
    
    // Update all timeline entries to use the correct project ID
    const updateResult = await timelineCollection.updateMany(
      { projectId: oldProjectId },
      { $set: { projectId: currentProjectId } }
    );
    
    console.log(`\n✅ Migrated ${updateResult.modifiedCount} timeline entries`);
    
    // Verify the migration
    const newEntries = await timelineCollection
      .find({ projectId: currentProjectId })
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`\n📊 Project ${currentProjectId} now has ${newEntries.length} timeline entries:`);
    
    newEntries.slice(0, 3).forEach((entry, idx) => {
      console.log(`\n   ${idx + 1}. [${new Date(entry.createdAt).toLocaleString()}]`);
      const displayText = entry.text || entry.description || entry.content || 'No text';
      console.log(`      ${displayText.substring(0, 80)}${displayText.length > 80 ? '...' : ''}`);
    });
    
    // Update the project's metadata
    const project = await projectsCollection.findOne({ _id: new ObjectId(currentProjectId) });
    if (project) {
      console.log(`\n📋 Current project details:`);
      console.log(`   Team: ${project.teamName}`);
      console.log(`   Email: ${project.userEmail}`);
      console.log(`   Score: ${project.currentScore || 'Not set'}`);
      
      // Update with the latest score from timeline
      const scoreEntry = newEntries.find(e => e.metadata?.type === 'score_update');
      if (scoreEntry && scoreEntry.metadata?.score) {
        await projectsCollection.updateOne(
          { _id: new ObjectId(currentProjectId) },
          { 
            $set: { 
              currentScore: scoreEntry.metadata.score,
              updatedAt: new Date()
            }
          }
        );
        console.log(`   Updated score to: ${scoreEntry.metadata.score}`);
      }
    }
    
    console.log('\n✨ Migration complete! Refresh your browser to see the timeline.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Run the migration
migrateToCorrectProject().catch(console.error);