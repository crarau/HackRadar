#!/usr/bin/env node

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'hackradar';

async function cleanAndSetupUser(userEmail) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    const projectsCollection = db.collection('projects');
    const timelineCollection = db.collection('timeline');
    
    console.log('='.repeat(60));
    console.log('CLEAN & SETUP FOR USER: ' + userEmail);
    console.log('='.repeat(60));
    
    // Find all projects for this user
    const userProjects = await projectsCollection.find({ userEmail }).toArray();
    
    if (userProjects.length === 0) {
      console.log(`\n⚠️  No projects found for ${userEmail}`);
      console.log('Creating a new project...');
      
      // Create a fresh project
      const newProject = {
        teamName: 'EcoTracker',
        userEmail: userEmail,
        description: 'AI-powered platform helping businesses reduce carbon footprint by 40%',
        currentScore: 55,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await projectsCollection.insertOne(newProject);
      userProjects.push({ ...newProject, _id: result.insertedId });
      console.log(`✅ Created new project with ID: ${result.insertedId}`);
    }
    
    console.log(`\n📋 Found ${userProjects.length} project(s) for ${userEmail}:`);
    
    for (const project of userProjects) {
      console.log(`\n🔄 Processing project: ${project._id}`);
      console.log(`   Team: ${project.teamName}`);
      
      // Clean all timeline entries for this project
      const deleteResult = await timelineCollection.deleteMany({ 
        projectId: project._id.toString() 
      });
      console.log(`   🧹 Cleaned ${deleteResult.deletedCount} timeline entries`);
      
      // Setup fresh EcoTracker data
      const ecoTrackerEntries = [
        {
          projectId: project._id.toString(),
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
          projectId: project._id.toString(),
          type: 'update',
          text: 'EcoTracker uses machine learning to analyze energy patterns and reduce waste by 40%. Demo: ecotracker.demo.com',
          url: 'ecotracker.demo.com',
          files: [],
          fileCount: 0,
          createdAt: new Date('2025-09-06T10:15:00Z'),
          description: 'Feature showcase',
          content: 'EcoTracker uses machine learning to analyze energy patterns and reduce waste by 40%.',
          metadata: {
            evaluation: {
              clarity: 72,
              problem_value: 68,
              feasibility: 65,
              originality: 58,
              impact: 70,
              submission_readiness: 52,
              final_score: 52
            }
          },
          evaluationComplete: true
        },
        {
          projectId: project._id.toString(),
          type: 'update',
          text: 'Built during hackathon weekend. GitHub: github.com/ecotrack/app. Already have 3 pilot customers testing our solution.',
          url: 'github.com/ecotrack/app',
          files: [],
          fileCount: 0,
          createdAt: new Date('2025-09-06T11:45:00Z'),
          description: 'Progress update',
          content: 'Built during hackathon weekend with 3 pilot customers.',
          metadata: {
            evaluation: {
              clarity: 78,
              problem_value: 72,
              feasibility: 68,
              originality: 60,
              impact: 75,
              submission_readiness: 61,
              final_score: 61
            }
          },
          evaluationComplete: true
        },
        {
          projectId: project._id.toString(),
          type: 'update',
          text: "We've added a comprehensive README with setup instructions, documented our limitations, and prepared a live demo at demo.ecotracker.io. Next steps include scaling to enterprise clients.",
          url: 'demo.ecotracker.io',
          files: [],
          fileCount: 0,
          createdAt: new Date('2025-09-06T14:20:00Z'),
          description: 'Documentation and demo',
          content: 'Added README, documentation, and live demo.',
          metadata: {
            evaluation: {
              clarity: 75,
              problem_value: 68,
              feasibility: 62,
              originality: 58,
              impact: 70,
              submission_readiness: 55,
              final_score: 55
            }
          },
          evaluationComplete: true
        }
      ];
      
      // Insert fresh timeline entries
      const insertResult = await timelineCollection.insertMany(ecoTrackerEntries);
      console.log(`   📥 Inserted ${insertResult.insertedCount} fresh EcoTracker entries`);
      
      // Update project metadata
      await projectsCollection.updateOne(
        { _id: project._id },
        {
          $set: {
            teamName: 'EcoTracker',
            description: 'AI-powered platform helping businesses reduce carbon footprint by 40%',
            currentScore: 55,
            updatedAt: new Date()
          }
        }
      );
      console.log(`   ✅ Updated project metadata`);
    }
    
    // Verify final state
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION');
    console.log('='.repeat(60));
    
    for (const project of userProjects) {
      const entries = await timelineCollection
        .find({ projectId: project._id.toString() })
        .sort({ createdAt: 1 })
        .toArray();
      
      console.log(`\nProject ${project._id}:`);
      console.log(`  Timeline entries: ${entries.length}`);
      console.log(`  Latest score: 55/100`);
      
      if (entries.length > 0) {
        console.log(`  First entry: ${new Date(entries[0].createdAt).toLocaleString()}`);
        console.log(`  Last entry: ${new Date(entries[entries.length - 1].createdAt).toLocaleString()}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ CLEAN & SETUP COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n📌 User: ${userEmail}`);
    console.log(`📌 Projects cleaned and reset: ${userProjects.length}`);
    console.log(`📌 Each project now has fresh EcoTracker data`);
    console.log('\n🔄 Refresh your browser to see the clean timeline!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Run for your user
const userEmail = process.argv[2] || 'ciprarau@gmail.com';
cleanAndSetupUser(userEmail).catch(console.error);