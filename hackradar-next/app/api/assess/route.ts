import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Assessment } from '@/lib/models';
import { ObjectId } from 'mongodb';

// POST assess a project
export async function POST(request: NextRequest) {
  try {
    console.log('[ASSESS] Starting assessment request');
    
    const db = await getDatabase();
    console.log('[ASSESS] Database connected');
    
    const { projectId } = await request.json();
    console.log('[ASSESS] Project ID:', projectId);
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Get project and timeline entries
    console.log('[ASSESS] Fetching project...');
    const project = await db.collection('projects').findOne({ 
      _id: new ObjectId(projectId) 
    });
    console.log('[ASSESS] Project found:', !!project);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    console.log('[ASSESS] Fetching timeline...');
    const timeline = await db.collection('timeline')
      .find({ projectId })
      .sort({ createdAt: 1 })
      .toArray();
    console.log('[ASSESS] Timeline entries found:', timeline.length);
    
    // Generate mock assessment (in production, use AI)
    const assessment: Omit<Assessment, '_id'> = {
      projectId,
      score: Math.floor(Math.random() * 30) + 70, // 70-100
      feedback: `Great progress on "${project.teamName}"! You've submitted ${timeline.length} updates.`,
      strengths: [
        'Clear project vision',
        'Good documentation',
        timeline.length > 3 ? 'Consistent progress updates' : 'Getting started well'
      ],
      improvements: [
        'Add more technical details',
        'Include visual mockups',
        'Provide timeline estimates'
      ],
      criteria: {
        innovation: Math.floor(Math.random() * 3) + 7,
        feasibility: Math.floor(Math.random() * 3) + 7,
        impact: Math.floor(Math.random() * 3) + 7,
        presentation: Math.floor(Math.random() * 3) + 7,
        progress: Math.floor(Math.random() * 3) + 7,
      },
      assessedAt: new Date(),
      entriesAssessed: timeline.length
    };
    
    // Save assessment
    console.log('[ASSESS] Saving assessment...');
    const result = await db.collection('assessments').insertOne(assessment);
    console.log('[ASSESS] Assessment saved with ID:', result.insertedId);
    
    // Update project with latest assessment
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { 
        $set: { 
          lastAssessment: { ...assessment, _id: result.insertedId },
          status: 'evaluated',
          updatedAt: new Date()
        }
      }
    );
    
    return NextResponse.json({
      success: true,
      assessment: { ...assessment, _id: result.insertedId }
    });
    
  } catch (error) {
    console.error('Error assessing project:', error);
    
    // Return a more detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      error: 'Failed to assess project',
      message: errorMessage,
      type: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined
    };
    
    return NextResponse.json(errorDetails, { status: 500 });
  }
}