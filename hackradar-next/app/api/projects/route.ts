import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Project } from '@/lib/models';
import { ObjectId } from 'mongodb';

// GET all projects or a specific project
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');
    
    if (projectId) {
      const project = await db.collection('projects').findOne({ 
        _id: new ObjectId(projectId) 
      });
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      
      // Get timeline entries for this project
      const timeline = await db.collection('timeline')
        .find({ projectId })
        .sort({ createdAt: -1 })
        .toArray();
      
      return NextResponse.json({ project, timeline });
    }
    
    // Get all projects
    const projects = await db.collection('projects')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST create a new project
export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const body = await request.json();
    
    const { teamName, email } = body;
    
    if (!teamName || !email) {
      return NextResponse.json(
        { error: 'Team name and email are required' },
        { status: 400 }
      );
    }
    
    // Check if project already exists
    const existing = await db.collection('projects').findOne({ 
      $or: [{ teamName }, { email }]
    });
    
    if (existing) {
      return NextResponse.json(
        { error: 'Project with this team name or email already exists' },
        { status: 409 }
      );
    }
    
    const project: Omit<Project, '_id'> = {
      teamName,
      email,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };
    
    const result = await db.collection('projects').insertOne(project);
    
    return NextResponse.json({
      success: true,
      projectId: result.insertedId,
      project: { ...project, _id: result.insertedId }
    });
    
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}