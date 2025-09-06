#!/usr/bin/env node

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'hackradar';

// Simulation scenarios
const SCENARIOS = {
  ecotracker: {
    teamName: 'EcoTracker',
    description: 'AI-powered platform helping businesses reduce carbon footprint by 40%',
    currentScore: 55,
    entries: [
      {
        text: 'Building an AI sustainability platform to help businesses reduce carbon footprint.',
        createdAt: new Date('2025-09-06T09:30:00Z'),
      },
      {
        text: 'EcoTracker uses machine learning to analyze energy patterns and reduce waste by 40%. Demo: ecotracker.demo.com',
        url: 'ecotracker.demo.com',
        createdAt: new Date('2025-09-06T10:15:00Z'),
      },
      {
        text: '📊 Score Update: 52/100 (📈 +13 points, ↗️ 33.3%)',
        createdAt: new Date('2025-09-06T10:15:01Z'),
        metadata: {
          type: 'score_update',
          score: 52,
          delta: { total_change: 13, percent_change: 33.3, direction: 'up' }
        }
      },
      {
        text: 'Built during hackathon weekend. GitHub: github.com/ecotrack/app. Already have 3 pilot customers testing our solution.',
        url: 'github.com/ecotrack/app',
        createdAt: new Date('2025-09-06T11:45:00Z'),
      },
      {
        text: '📊 Score Update: 61/100 (📈 +9 points, ↗️ 17.3%)',
        createdAt: new Date('2025-09-06T11:45:01Z'),
        metadata: {
          type: 'score_update',
          score: 61,
          delta: { total_change: 9, percent_change: 17.3, direction: 'up' }
        }
      },
      {
        text: "We've added a comprehensive README with setup instructions, documented our limitations, and prepared a live demo at demo.ecotracker.io. Next steps include scaling to enterprise clients.",
        url: 'demo.ecotracker.io',
        createdAt: new Date('2025-09-06T14:20:00Z'),
      },
      {
        text: '📊 Score Update: 55/100 (📉 -6 points, ↘️ 9.8%)',
        createdAt: new Date('2025-09-06T14:20:01Z'),
        metadata: {
          type: 'score_update',
          score: 55,
          delta: { total_change: -6, percent_change: -9.8, direction: 'down' }
        }
      }
    ]
  },
  
  healthhub: {
    teamName: 'HealthHub AI',
    description: 'AI-powered telemedicine platform with real-time diagnostics',
    currentScore: 72,
    entries: [
      {
        text: 'HealthHub AI - Revolutionizing telemedicine with ML-powered diagnostics',
        createdAt: new Date('2025-09-06T08:00:00Z'),
      },
      {
        text: 'Integrated computer vision for skin condition analysis. 94% accuracy in preliminary tests.',
        url: 'healthhub-demo.vercel.app',
        createdAt: new Date('2025-09-06T10:30:00Z'),
      },
      {
        text: '📊 Score Update: 68/100 (📈 +28 points from baseline)',
        createdAt: new Date('2025-09-06T10:30:01Z'),
        metadata: {
          type: 'score_update',
          score: 68,
          delta: { total_change: 28, percent_change: 70, direction: 'up' }
        }
      },
      {
        text: 'Partnership secured with Memorial Hospital for pilot program. 500 patients enrolled.',
        createdAt: new Date('2025-09-06T13:00:00Z'),
      },
      {
        text: '📊 Score Update: 72/100 (📈 +4 points, ↗️ 5.9%)',
        createdAt: new Date('2025-09-06T13:00:01Z'),
        metadata: {
          type: 'score_update',
          score: 72,
          delta: { total_change: 4, percent_change: 5.9, direction: 'up' }
        }
      }
    ]
  },
  
  fintech: {
    teamName: 'CryptoSafe',
    description: 'Blockchain-based secure payment gateway with AI fraud detection',
    currentScore: 83,
    entries: [
      {
        text: 'CryptoSafe - Building the future of secure digital payments',
        createdAt: new Date('2025-09-06T09:00:00Z'),
      },
      {
        text: 'Smart contract deployed on Ethereum testnet. Gas optimization achieved 40% reduction.',
        url: 'etherscan.io/tx/0xabc123',
        createdAt: new Date('2025-09-06T11:00:00Z'),
      },
      {
        text: '📊 Score Update: 75/100 (📈 Strong technical implementation)',
        createdAt: new Date('2025-09-06T11:00:01Z'),
        metadata: {
          type: 'score_update',
          score: 75,
          delta: { total_change: 35, percent_change: 87.5, direction: 'up' }
        }
      },
      {
        text: 'AI fraud detection system preventing 99.2% of test attacks. Patent pending.',
        createdAt: new Date('2025-09-06T14:00:00Z'),
      },
      {
        text: '📊 Score Update: 83/100 (📈 +8 points, ↗️ 10.7%)',
        createdAt: new Date('2025-09-06T14:00:01Z'),
        metadata: {
          type: 'score_update',
          score: 83,
          delta: { total_change: 8, percent_change: 10.7, direction: 'up' }
        }
      },
      {
        text: '$250K seed funding commitment from TechStars accelerator!',
        createdAt: new Date('2025-09-06T16:00:00Z'),
      }
    ]
  },
  
  edtech: {
    teamName: 'LearnSmart',
    description: 'Personalized AI tutor adapting to student learning styles',
    currentScore: 67,
    entries: [
      {
        text: 'LearnSmart - Every student learns differently. Our AI understands that.',
        createdAt: new Date('2025-09-06T08:30:00Z'),
      },
      {
        text: 'GPT-4 integration complete. Generating personalized lesson plans in real-time.',
        createdAt: new Date('2025-09-06T10:00:00Z'),
      },
      {
        text: '📊 Score Update: 58/100 (📈 Good progress on core features)',
        createdAt: new Date('2025-09-06T10:00:01Z'),
        metadata: {
          type: 'score_update',
          score: 58,
          delta: { total_change: 18, percent_change: 45, direction: 'up' }
        }
      },
      {
        text: 'Beta test with 50 high school students. 87% showed improved test scores.',
        url: 'learnsmart-study.pdf',
        createdAt: new Date('2025-09-06T12:30:00Z'),
      },
      {
        text: '📊 Score Update: 67/100 (📈 +9 points, ↗️ 15.5%)',
        createdAt: new Date('2025-09-06T12:30:01Z'),
        metadata: {
          type: 'score_update',
          score: 67,
          delta: { total_change: 9, percent_change: 15.5, direction: 'up' }
        }
      }
    ]
  },
  
  empty: {
    teamName: 'Fresh Start',
    description: 'Clean slate project',
    currentScore: 0,
    entries: []
  }
};

async function simulateProject(projectId, scenario = 'ecotracker') {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    const projectsCollection = db.collection('projects');
    const timelineCollection = db.collection('timeline');
    
    // Validate project exists
    const project = await projectsCollection.findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      console.error(`❌ Project ${projectId} not found!`);
      console.log('\n💡 To find your project ID, check localStorage in browser console:');
      console.log('   localStorage.getItem("projectId")');
      return;
    }
    
    console.log('='.repeat(60));
    console.log('PROJECT SIMULATION');
    console.log('='.repeat(60));
    console.log(`\n📋 Current Project:`);
    console.log(`   ID: ${project._id}`);
    console.log(`   Team: ${project.teamName}`);
    console.log(`   Email: ${project.userEmail}`);
    
    // Get scenario data
    const scenarioData = SCENARIOS[scenario];
    if (!scenarioData) {
      console.error(`\n❌ Unknown scenario: ${scenario}`);
      console.log('Available scenarios:', Object.keys(SCENARIOS).join(', '));
      return;
    }
    
    console.log(`\n🎭 Applying scenario: ${scenario}`);
    console.log(`   Team Name: ${scenarioData.teamName}`);
    console.log(`   Entries to add: ${scenarioData.entries.length}`);
    
    // Step 1: Clean existing timeline data
    console.log('\n🧹 Cleaning existing timeline data...');
    const deleteResult = await timelineCollection.deleteMany({ projectId });
    console.log(`   Removed ${deleteResult.deletedCount} existing entries`);
    
    // Step 2: Update project metadata
    console.log('\n📝 Updating project metadata...');
    await projectsCollection.updateOne(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          teamName: scenarioData.teamName,
          description: scenarioData.description,
          currentScore: scenarioData.currentScore,
          updatedAt: new Date()
        }
      }
    );
    console.log(`   Team name → ${scenarioData.teamName}`);
    console.log(`   Score → ${scenarioData.currentScore}`);
    
    // Step 3: Insert new timeline entries
    if (scenarioData.entries.length > 0) {
      console.log('\n📥 Inserting new timeline entries...');
      
      const entriesToInsert = scenarioData.entries.map(entry => ({
        projectId,
        type: 'update',
        text: entry.text || '',
        url: entry.url || '',
        files: entry.files || [],
        fileCount: entry.files?.length || 0,
        createdAt: entry.createdAt,
        description: entry.description || 'Update',
        content: entry.text || entry.content || '',
        metadata: entry.metadata || undefined,
        evaluationComplete: entry.metadata ? true : false
      }));
      
      const insertResult = await timelineCollection.insertMany(entriesToInsert);
      console.log(`   Inserted ${insertResult.insertedCount} new entries`);
      
      // Display summary of entries
      console.log('\n📊 New Timeline Summary:');
      entriesToInsert.slice(0, 3).forEach((entry, idx) => {
        console.log(`   ${idx + 1}. [${entry.createdAt.toLocaleString()}]`);
        console.log(`      ${entry.text.substring(0, 60)}${entry.text.length > 60 ? '...' : ''}`);
      });
      if (entriesToInsert.length > 3) {
        console.log(`   ... and ${entriesToInsert.length - 3} more entries`);
      }
    }
    
    // Step 4: Verify the simulation
    const finalEntries = await timelineCollection
      .find({ projectId })
      .sort({ createdAt: -1 })
      .toArray();
    
    const finalProject = await projectsCollection.findOne({ _id: new ObjectId(projectId) });
    
    console.log('\n' + '='.repeat(60));
    console.log('SIMULATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n✅ Project successfully simulated as: ${scenarioData.teamName}`);
    console.log(`   Timeline entries: ${finalEntries.length}`);
    console.log(`   Current score: ${finalProject.currentScore}/100`);
    console.log('\n🔄 Refresh your browser to see the changes!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const projectId = args[0] || '68bc5da3a1e502fdc1292a65'; // Your current project ID as default
const scenario = args[1] || 'ecotracker';

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node simulate-project.js [projectId] [scenario]');
  console.log('\nAvailable scenarios:');
  Object.keys(SCENARIOS).forEach(key => {
    console.log(`  ${key}: ${SCENARIOS[key].teamName} - ${SCENARIOS[key].description}`);
  });
  console.log('\nExample:');
  console.log('  node simulate-project.js 68bc5da3a1e502fdc1292a65 healthhub');
  process.exit(0);
}

// Run the simulation
simulateProject(projectId, scenario).catch(console.error);