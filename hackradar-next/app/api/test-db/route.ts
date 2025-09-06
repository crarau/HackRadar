import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;

export async function GET() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const database = client.db('hackradar');
    
    // Get collections
    const collections = await database.listCollections().toArray();
    
    // Get sample data from submissions if exists
    const submissionsCollection = database.collection('submissions');
    const count = await submissionsCollection.countDocuments();
    const recentSubmissions = await submissionsCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    return NextResponse.json({
      status: 'connected',
      database: 'hackradar',
      collections: collections.map(c => c.name),
      submissions: {
        count,
        recent: recentSubmissions
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to database', details: (error as Error).message },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}