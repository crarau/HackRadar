import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Submission } from '@/lib/models';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const formData = await request.formData();
    const teamName = formData.get('teamName') as string;
    const email = formData.get('email') as string;
    const description = formData.get('description') as string;
    const files = formData.getAll('files') as File[];
    
    // Process files
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        return {
          name: file.name,
          type: file.type,
          size: file.size,
          content: buffer.toString('base64').substring(0, 1000), // Store first 1KB as base64
        };
      })
    );
    
    // Create submission
    const submission = await Submission.create({
      teamName,
      email,
      description,
      files: processedFiles,
      status: 'analyzing',
    });
    
    // Start AI evaluation (async)
    evaluateSubmission(submission._id.toString(), teamName, description, processedFiles);
    
    return NextResponse.json({ 
      success: true,
      id: submission._id,
      message: 'Submission received and being analyzed',
    });
  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json(
      { error: 'Failed to process submission' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      const submission = await Submission.findById(id);
      return NextResponse.json(submission);
    }
    
    // Return all submissions (leaderboard)
    const submissions = await Submission.find({
      status: 'completed',
      'evaluation.overallScore': { $exists: true }
    })
    .sort({ 'evaluation.overallScore': -1 })
    .limit(20);
    
    return NextResponse.json(submissions);
  } catch (error) {
    console.error('Get submission error:', error);
    return NextResponse.json(
      { error: 'Failed to get submissions' },
      { status: 500 }
    );
  }
}

async function evaluateSubmission(id: string, teamName: string, description: string, files: Array<{ name: string; type: string; size: number; content: string }>) {
  try {
    if (openai) {
      const filesList = files.map(f => f.name).join(', ');
      
      const prompt = `Evaluate this hackathon submission:
      Team: ${teamName}
      Description: ${description}
      Files: ${filesList}
      
      Score on these criteria (0-10):
      1. Technical Innovation
      2. Business Viability
      3. Presentation Quality
      4. Innovation Factor
      5. Progress & Momentum
      
      Return JSON with: overallScore (0-100), criteria array, feedback, strengths array, improvements array`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a hackathon judge. Provide constructive feedback." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      const evaluation = JSON.parse(completion.choices[0].message.content || '{}');
      evaluation.evaluatedAt = new Date();
      
      // Update submission with evaluation
      await Submission.findByIdAndUpdate(id, {
        status: 'completed',
        evaluation: evaluation
      });
      return;
    }
  } catch (error) {
    console.error('AI evaluation error:', error);
    
    // Fallback evaluation
    const mockEvaluation = {
      overallScore: Math.floor(Math.random() * 30) + 70,
      criteria: [
        { name: 'Technical Innovation', score: 8, maxScore: 10, feedback: 'Good implementation', category: 'technical' },
        { name: 'Business Viability', score: 7, maxScore: 10, feedback: 'Solid business case', category: 'business' },
        { name: 'Presentation Quality', score: 8, maxScore: 10, feedback: 'Clear presentation', category: 'presentation' },
        { name: 'Innovation Factor', score: 9, maxScore: 10, feedback: 'Creative approach', category: 'innovation' },
        { name: 'Progress & Momentum', score: 7, maxScore: 10, feedback: 'Good pace', category: 'progress' },
      ],
      feedback: 'Your submission shows promise. Keep iterating!',
      strengths: ['Clear problem statement', 'Good technical foundation'],
      improvements: ['Add more user validation', 'Expand market analysis'],
      evaluatedAt: new Date()
    };
    
    await Submission.findByIdAndUpdate(id, {
      status: 'completed',
      evaluation: mockEvaluation
    });
  }
}