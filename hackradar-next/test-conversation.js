const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testConversationHistory() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  const projectId = '68bc5da3a1e502fdc1292a65';
  
  // This is the exact query from EvaluationService
  const previousSubmissions = await db.collection('timeline')
    .find({ 
      projectId,
      'evaluation': { $exists: true }
    })
    .sort({ createdAt: 1 })
    .toArray();
  
  console.log(`Found ${previousSubmissions.length} previous submissions with evaluations`);
  previousSubmissions.forEach((sub, i) => {
    console.log(`${i + 1}. Text: "${sub.text?.substring(0, 50)}..."`);
    console.log(`   Has evaluation: ${!!sub.evaluation}`);
    console.log(`   Evaluation scores: ${sub.evaluation?.scores?.final_score || 'none'}`);
    console.log(`   Evaluation evidence: ${sub.evaluation?.evidence?.length || 0} items`);
    console.log(`   Evaluation gaps: ${sub.evaluation?.gaps?.length || 0} items`);
    console.log('');
  });
  
  await client.close();
}

testConversationHistory().catch(console.error);