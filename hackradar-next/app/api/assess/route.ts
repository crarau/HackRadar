import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Assessment } from '@/lib/models';
import { ObjectId } from 'mongodb';

// POST assess a project
export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { projectId } = await request.json();
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Get project and timeline entries
    const project = await db.collection('projects').findOne({ 
      _id: new ObjectId(projectId) 
    });
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    const timeline = await db.collection('timeline')
      .find({ projectId })
      .sort({ createdAt: 1 })
      .toArray();
    
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
    const result = await db.collection('assessments').insertOne(assessment);
    
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
    return NextResponse.json(
      { error: 'Failed to assess project' },
      { status: 500 }
    );
  }
}