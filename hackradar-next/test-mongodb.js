// Test MongoDB Connection
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function testConnection() {
  console.log('🔧 Testing MongoDB connection...');
  console.log('📍 URI:', uri.replace(/:[^:@]*@/, ':****@')); // Hide password in logs
  
  const client = new MongoClient(uri);
  
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Access the database
    const database = client.db('hackradar');
    console.log('📊 Database: hackradar');
    
    // List collections
    const collections = await database.listCollections().toArray();
    console.log('📁 Collections found:', collections.length);
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // Test write operation
    const testCollection = database.collection('test_connection');
    const testDoc = {
      message: 'HackRadar MongoDB test',
      timestamp: new Date(),
      status: 'Connection successful'
    };
    
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('✍️  Test document inserted:', insertResult.insertedId);
    
    // Test read operation
    const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log('📖 Retrieved document:', foundDoc);
    
    // Clean up test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('🧹 Test document cleaned up');
    
    // Get database stats
    const stats = await database.stats();
    console.log('\n📈 Database Stats:');
    console.log(`  - Storage Size: ${(stats.dataSize / 1024).toFixed(2)} KB`);
    console.log(`  - Collections: ${stats.collections}`);
    console.log(`  - Objects: ${stats.objects}`);
    
    console.log('\n🎉 MongoDB connection test PASSED!');
    
  } catch (error) {
    console.error('❌ MongoDB connection test FAILED:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

// Run the test
testConnection().catch(console.error);