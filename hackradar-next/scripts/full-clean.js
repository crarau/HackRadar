#!/usr/bin/env node

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'hackradar';

async function fullCleanForUser(userEmail) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    const projectsCollection = db.collection('projects');
    const timelineCollection = db.collection('timeline');
    
    console.log('='.repeat(60));
    console.log('FULL CLEAN FOR USER: ' + userEmail);
    console.log('='.repeat(60));
    
    // Step 1: Find ALL projects for this user
    const userProjects = await projectsCollection.find({ userEmail }).toArray();
    console.log(`\n📋 Found ${userProjects.length} project(s) for ${userEmail}`);
    
    // Also find projects where user might be undefined but match the pattern
    const additionalProjects = await projectsCollection.find({ 
      teamName: { $in: ['EcoTracker', 'Chip'] }
    }).toArray();
    
    console.log(`📋 Found ${additionalProjects.length} additional project(s) by team name`);
    
    // Combine all project IDs
    const allProjectIds = [
      ...userProjects.map(p => p._id.toString()),
      ...additionalProjects.map(p => p._id.toString()),
      '68bc5da3a1e502fdc1292a65', // Your specific project ID
      '68bc936eaec499fa3db4f7eb'  // EcoTracker project ID
    ];
    
    // Remove duplicates
    const uniqueProjectIds = [...new Set(allProjectIds)];
    
    console.log(`\n🎯 Will clean timeline for ${uniqueProjectIds.length} project IDs:`);
    uniqueProjectIds.forEach(id => console.log(`   - ${id}`));
    
    // Step 2: DELETE ALL timeline entries for these projects
    console.log('\n🧹 Cleaning ALL timeline entries...');
    const deleteResult = await timelineCollection.deleteMany({ 
      projectId: { $in: uniqueProjectIds }
    });
    console.log(`   ✅ Deleted ${deleteResult.deletedCount} timeline entries`);
    
    // Step 3: Find the main project to update (or create one)
    let mainProject = userProjects[0];
    if (!mainProject) {
      console.log('\n📝 Creating new project for user...');
      const newProject = {
        teamName: 'EcoTracker',
        userEmail: userEmail,
        description: 'AI-powered platform helping businesses reduce carbon footprint by 40%',
        currentScore: 55,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const result = await projectsCollection.insertOne(newProject);
      mainProject = { ...newProject, _id: result.insertedId };
      console.log(`   ✅ Created project with ID: ${result.insertedId}`);
    } else {
      // Update the existing project
      await projectsCollection.updateOne(
        { _id: mainProject._id },
        {
          $set: {
            teamName: 'EcoTracker',
            description: 'AI-powered platform helping businesses reduce carbon footprint by 40%',
            currentScore: 55,
            updatedAt: new Date()
          }
        }
      );
      console.log(`\n📝 Updated project ${mainProject._id}`);
    }
    
    // Step 4: Insert ONLY fresh EcoTracker entries
    const freshEntries = [
      {
        projectId: mainProject._id.toString(),
        type: 'update',
        text: 'Building an AI sustainability platform to help businesses reduce carbon footprint.',
        url: '',
        files: [],
        fileCount: 0,
        createdAt: new Date('2025-09-06T09:30:00Z'),
        description: 'Project initialization',
        content: 'Building an AI sustainability platform to help businesses reduce carbon footprint.'
      },
      {
        projectId: mainProject._id.toString(),
        type: 'update',
        text: 'EcoTracker uses machine learning to analyze energy patterns and reduce waste by 40%. Demo available.',
        url: 'ecotracker.demo.com',
        files: [],
        fileCount: 0,
        createdAt: new Date('2025-09-06T10:15:00Z'),
        description: 'Feature showcase',
        content: 'EcoTracker uses machine learning to analyze energy patterns.',
        metadata: {
          evaluation: {
            clarity: 72,
            problem_value: 68,
            feasibility: 65,
            originality: 58,
            impact: 70,
            submission_readiness: 52,
            final_score: 52,
            feedback: {
              strengths: ['Clear problem statement', 'Quantified impact (40% reduction)', 'Demo available'],
              recommendations: ['Add team information', 'Include technical details', 'Provide timeline']
            }
          }
        },
        evaluationComplete: true
      },
      {
        projectId: mainProject._id.toString(),
        type: 'update',
        text: 'Built during hackathon weekend. GitHub: github.com/ecotrack/app. Already have 3 pilot customers.',
        url: 'github.com/ecotrack/app',
        files: [],
        fileCount: 0,
        createdAt: new Date('2025-09-06T11:45:00Z'),
        description: 'Progress update',
        content: 'Built during hackathon weekend with pilot customers.',
        metadata: {
          evaluation: {
            clarity: 78,
            problem_value: 72,
            feasibility: 68,
            originality: 60,
            impact: 75,
            submission_readiness: 61,
            final_score: 61,
            feedback: {
              strengths: ['GitHub repository shared', 'Customer validation (3 pilots)', 'Built in hackathon timeframe'],
              recommendations: ['Add technical architecture', 'Quantify customer feedback', 'Include next steps']
            }
          }
        },
        evaluationComplete: true
      },
      {
        projectId: mainProject._id.toString(),
        type: 'update',
        text: 'Added comprehensive documentation and live demo. Next: enterprise scaling.',
        url: 'demo.ecotracker.io',
        files: [],
        fileCount: 0,
        createdAt: new Date('2025-09-06T14:20:00Z'),
        description: 'Documentation complete',
        content: 'Documentation and demo ready.',
        metadata: {
          evaluation: {
            clarity: 75,
            problem_value: 68,
            feasibility: 62,
            originality: 58,
            impact: 70,
            submission_readiness: 55,
            final_score: 55,
            feedback: {
              strengths: ['Documentation complete', 'Live demo available', 'Clear scaling plan'],
              recommendations: ['Add pricing model', 'Include competitive analysis', 'Provide ROI metrics']
            }
          }
        },
        evaluationComplete: true
      }
    ];
    
    console.log(`\n📥 Inserting ${freshEntries.length} fresh entries...`);
    const insertResult = await timelineCollection.insertMany(freshEntries);
    console.log(`   ✅ Inserted ${insertResult.insertedCount} entries`);
    
    // Step 5: Verify the final state
    const finalCount = await timelineCollection.countDocuments({
      projectId: mainProject._id.toString()
    });
    
    const allTimeline = await timelineCollection
      .find({ projectId: mainProject._id.toString() })
      .sort({ createdAt: 1 })
      .toArray();
    
    console.log('\n' + '='.repeat(60));
    console.log('FINAL STATE');
    console.log('='.repeat(60));
    console.log(`\n✅ Project ID: ${mainProject._id}`);
    console.log(`✅ User: ${userEmail}`);
    console.log(`✅ Team: EcoTracker`);
    console.log(`✅ Timeline entries: ${finalCount}`);
    console.log(`✅ Current score: 55/100`);
    
    console.log('\n📊 Timeline entries:');
    allTimeline.forEach((entry, idx) => {
      const score = entry.metadata?.evaluation?.final_score;
      console.log(`   ${idx + 1}. [${new Date(entry.createdAt).toLocaleString()}]`);
      console.log(`      ${entry.text.substring(0, 60)}...`);
      if (score) console.log(`      Score: ${score}/100`);
    });
    
    console.log('\n🔄 Refresh your browser to see the clean timeline!');
    console.log('   Should show exactly 4 entries with no duplicates.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Run the full clean
const userEmail = process.argv[2] || 'ciprarau@gmail.com';
fullCleanForUser(userEmail).catch(console.error);