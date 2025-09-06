import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { TimelineEntry } from '@/lib/models';
import { ObjectId } from 'mongodb';

// POST add entry to timeline
export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const formData = await request.formData();
    
    const projectId = formData.get('projectId') as string;
    const type = formData.get('type') as string;
    const description = formData.get('description') as string;
    const file = formData.get('file') as File | null;
    const content = formData.get('content') as string;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Verify project exists (projectId is the string from MongoDB insertedId)
    const project = await db.collection('projects').findOne({ 
      _id: new ObjectId(projectId) 
    });
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    let entry: Omit<TimelineEntry, '_id'> = {
      projectId,
      type: type as 'text' | 'file' | 'image' | 'link',
      content: content || '',
      description,
      createdAt: new Date()
    };
    
    // Handle file upload
    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // For demo, we'll store base64 encoded content
      // In production, you'd upload to S3 or similar
      entry.content = buffer.toString('base64');
      entry.fileName = file.name;
      entry.fileType = file.type;
      entry.fileSize = file.size;
      entry.type = file.type.startsWith('image/') ? 'image' : 'file';
    }
    
    const result = await db.collection('timeline').insertOne(entry);
    
    // Update project's updatedAt
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { updatedAt: new Date() } }
    );
    
    return NextResponse.json({
      success: true,
      entryId: result.insertedId,
      entry: { ...entry, _id: result.insertedId }
    });
    
  } catch (error) {
    console.error('Error adding timeline entry:', error);
    return NextResponse.json(
      { error: 'Failed to add timeline entry' },
      { status: 500 }
    );
  }
}

// GET timeline entries for a project
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    const entries = await db.collection('timeline')
      .find({ projectId })
      .sort({ createdAt: -1 })
      .toArray();
    
    return NextResponse.json(entries);
    
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}