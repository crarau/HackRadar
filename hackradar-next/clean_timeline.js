const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function cleanTimeline() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('hackradar');
    const timelineCollection = db.collection('timeline');
    const projectsCollection = db.collection('projects');
    
    // First find the project for ciprarau@gmail.com
    const project = await projectsCollection.findOne({ userEmail: 'ciprarau@gmail.com' });
    
    if (project) {
      console.log(`\nFound project for ciprarau@gmail.com:`);
      console.log(`- Project ID: ${project._id}`);
      console.log(`- Team Name: ${project.teamName}`);
      console.log(`- Current Score: ${project.currentScore || 0}`);
      
      // Count existing timeline entries
      const entryCount = await timelineCollection.countDocuments({ projectId: project._id.toString() });
      console.log(`\nFound ${entryCount} timeline entries to delete`);
      
      if (entryCount > 0) {
        // Delete all timeline entries for this project
        const deleteResult = await timelineCollection.deleteMany({ 
          projectId: project._id.toString() 
        });
        
        console.log(`\n✅ Successfully deleted ${deleteResult.deletedCount} timeline entries`);
        
        // Reset the project score to 0
        const updateResult = await projectsCollection.updateOne(
          { _id: project._id },
          { 
            $set: { 
              currentScore: 0,
              lastUpdated: new Date()
            }
          }
        );
        
        console.log(`✅ Reset project score to 0`);
      } else {
        console.log('\nNo timeline entries to delete - already clean!');
      }
      
      // Verify cleanup
      const remainingEntries = await timelineCollection.countDocuments({ projectId: project._id.toString() });
      console.log(`\n📊 Verification: ${remainingEntries} timeline entries remaining (should be 0)`);
      
      const updatedProject = await projectsCollection.findOne({ _id: project._id });
      console.log(`📊 Project score: ${updatedProject.currentScore} (should be 0)`);
      
    } else {
      console.log('\n❌ No project found for ciprarau@gmail.com');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

cleanTimeline();