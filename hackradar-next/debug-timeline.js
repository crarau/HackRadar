const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  // Get the project we're testing
  const project = await db.collection('projects').findOne({ _id: new ObjectId('68bc5da3a1e502fdc1292a65') });
  console.log('Project found:', !!project);
  
  // Get timeline entries for this project
  const entries = await db.collection('timeline')
    .find({ projectId: '68bc5da3a1e502fdc1292a65' })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
  
  console.log('Total entries found:', entries.length);
  console.log('');
  entries.forEach((entry, i) => {
    console.log((i + 1) + '. Text: "' + (entry.text?.substring(0, 50) || 'no text') + '..."');
    console.log('   Has evaluation: ' + !!entry.evaluation);
    console.log('   Evaluation scores: ' + (entry.evaluation?.scores?.final_score || 'none'));
    console.log('   CreatedAt: ' + entry.createdAt);
    console.log('');
  });
  
  await client.close();
}

checkDatabase().catch(console.error);