#!/usr/bin/env node

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'hackradar';

async function verifyAndFixEcoTracker() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
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
    
    console.log(`✅ Found EcoTracker project:`, {
      id: ecoProject._id.toString(),
      teamName: ecoProject.teamName,
      userEmail: ecoProject.userEmail
    });
    
    // Get timeline entries for EcoTracker
    const timelineEntries = await timelineCollection
      .find({ projectId: ecoProject._id.toString() })
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`\n📊 Current timeline entries: ${timelineEntries.length}`);
    
    if (timelineEntries.length === 0) {
      console.log('\n⚠️  No timeline entries found. Creating sample entries...');
      
      const sampleEntries = [
        {
          projectId: ecoProject._id.toString(),
          type: 'update',
          text: 'Initial project setup - AI-powered sustainability tracker',
          url: 'https://github.com/ecotracker/main',
          files: [],
          fileCount: 0,
          createdAt: new Date('2025-09-06T10:00:00Z'),
          description: 'Project initialization',
          content: 'Initial project setup - AI-powered sustainability tracker'
        },
        {
          projectId: ecoProject._id.toString(),
          type: 'update',
          text: 'Implemented carbon footprint calculator using ML models',
          url: '',
          files: [],
          fileCount: 0,
          createdAt: new Date('2025-09-06T11:30:00Z'),
          description: 'Feature implementation',
          content: 'Implemented carbon footprint calculator using ML models'
        },
        {
          projectId: ecoProject._id.toString(),
          type: 'update',
          text: 'Added real-time data visualization dashboard',
          url: 'https://ecotracker-demo.vercel.app',
          files: [],
          fileCount: 0,
          createdAt: new Date('2025-09-06T13:00:00Z'),
          description: 'Dashboard update',
          content: 'Added real-time data visualization dashboard'
        }
      ];
      
      const result = await timelineCollection.insertMany(sampleEntries);
      console.log(`✅ Created ${result.insertedCount} sample timeline entries`);
      
    } else {
      console.log('\nExisting timeline entries:');
      timelineEntries.forEach((entry, idx) => {
        console.log(`${idx + 1}. [${new Date(entry.createdAt).toLocaleString()}]`);
        console.log(`   Text: ${entry.text || entry.content || '(empty)'}`);
        console.log(`   URL: ${entry.url || '(none)'}`);
        console.log(`   Files: ${entry.fileCount || 0}`);
      });
      
      // Check if entries have proper structure
      let needsUpdate = false;
      for (const entry of timelineEntries) {
        if (!entry.text && entry.content) {
          // Migrate old content field to text field
          await timelineCollection.updateOne(
            { _id: entry._id },
            { 
              $set: { 
                text: entry.content,
                type: entry.type || 'update'
              }
            }
          );
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        console.log('\n✅ Updated timeline entries to new format');
      }
    }
    
    // Update project's updatedAt timestamp
    await projectsCollection.updateOne(
      { _id: ecoProject._id },
      { $set: { updatedAt: new Date() } }
    );
    
    console.log('\n✅ Project timestamp updated');
    
    // Verify the changes are visible
    const updatedEntries = await timelineCollection
      .find({ projectId: ecoProject._id.toString() })
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`\n📊 Final timeline entries: ${updatedEntries.length}`);
    console.log('\n✨ EcoTracker verification complete!');
    console.log('\n📌 To view in UI:');
    console.log(`   1. Login with email: ${ecoProject.userEmail}`);
    console.log(`   2. Your project should load automatically`);
    console.log(`   3. Timeline should show ${updatedEntries.length} entries`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Run the verification
verifyAndFixEcoTracker().catch(console.error);