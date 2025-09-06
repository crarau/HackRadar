import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { EvaluationService } from '@/lib/evaluation/EvaluationService';
import { getDebugLogger, resetDebugLogger } from '@/lib/evaluation/DebugLogger';

// POST add entry to timeline
export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const formData = await request.formData();
    
    const projectId = formData.get('projectId') as string;
    const text = formData.get('text') as string;
    const url = formData.get('url') as string;
    const captureWebsite = formData.get('captureWebsite') as string;
    const websiteUrl = formData.get('websiteUrl') as string;
    const fileCount = parseInt(formData.get('fileCount') as string || '0');
    const timestamp = formData.get('timestamp') as string;
    
    // Legacy support for old API calls
    const type = formData.get('type') as string;
    const description = formData.get('description') as string;
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
    
    // Handle legacy single-field submissions
    if (type || content || description) {
      const legacyEntry = {
        projectId,
        type: type as 'text' | 'file' | 'image' | 'link',
        content: content || '',
        description,
        createdAt: new Date()
      };
      
      const result = await db.collection('timeline').insertOne(legacyEntry);
      await db.collection('projects').updateOne(
        { _id: new ObjectId(projectId) },
        { $set: { updatedAt: new Date() } }
      );
      
      return NextResponse.json({
        success: true,
        entryId: result.insertedId,
        entry: { ...legacyEntry, _id: result.insertedId }
      });
    }
    
    // New multi-input submission
    const files: Array<{
      name: string;
      type: string;
      size: number;
      data: string;
      isImage: boolean;
    }> = [];
    
    // Auto-capture website screenshot if requested
    if (captureWebsite === 'true' && websiteUrl) {
      // TODO: Implement website screenshot capture
      // Options:
      // 1. Use Puppeteer/Playwright for server-side screenshot
      // 2. Use a screenshot API service like Screenly, ApiFlash
      // 3. Use Vercel's og:image generation
      
      // For now, we'll add a placeholder indicating screenshot was requested
      console.log(`Screenshot requested for: ${websiteUrl}`);
      
      // In production, this would capture and add the screenshot:
      // const screenshot = await captureWebsiteScreenshot(websiteUrl);
      // files.push({
      //   name: `screenshot-${Date.now()}.png`,
      //   type: 'image/png',
      //   size: screenshot.length,
      //   data: screenshot.toString('base64'),
      //   isImage: true
      // });
    }
    
    // Process multiple files
    for (let i = 0; i < fileCount; i++) {
      const file = formData.get(`file_${i}`) as File | null;
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // For screenshots and small files, store base64
        // In production, upload to S3/Cloudinary
        files.push({
          name: file.name,
          type: file.type,
          size: file.size,
          data: buffer.toString('base64'),
          isImage: file.type.startsWith('image/')
        });
      }
    }
    
    // Build comprehensive entry
    const entry: {
      projectId: string;
      type: string;
      text: string;
      url: string;
      files: Array<{
        name: string;
        type: string;
        size: number;
        data: string;
        isImage: boolean;
      }>;
      fileCount: number;
      createdAt: Date;
      description?: string;
      content?: string;
    } = {
      projectId,
      type: 'update',
      text: text || '',
      url: url || '',
      files: files,
      fileCount: files.length,
      createdAt: new Date(timestamp || Date.now())
    };
    
    // Create a description summarizing the submission
    const parts = [];
    if (text) parts.push('text');
    if (url) parts.push('website');
    if (files.length > 0) {
      const imageCount = files.filter(f => f.isImage).length;
      const docCount = files.length - imageCount;
      if (imageCount > 0) parts.push(`${imageCount} image${imageCount > 1 ? 's' : ''}`);
      if (docCount > 0) parts.push(`${docCount} document${docCount > 1 ? 's' : ''}`);
    }
    entry.description = parts.length > 0 
      ? `Update with ${parts.join(', ')}`
      : 'Empty update';
    
    // For display in timeline, create a summary content
    entry.content = text || url || `${files.length} file(s) uploaded`;
    
    const result = await db.collection('timeline').insertOne(entry);
    
    // Trigger evaluation for this submission
    let evaluationResult = null;
    let debugLogs: string[] = [];
    
    try {
      // Reset debug logger for this request
      resetDebugLogger();
      const logger = getDebugLogger();
      
      const evaluationService = new EvaluationService(db);
      const evaluation = await evaluationService.evaluateSubmission(projectId, {
        text,
        files: files.map(f => ({
          name: f.name,
          type: f.type,
          size: f.size
        })),
        url,
        userMessage: text // Using text as user message for now
      });
      
      evaluationResult = evaluation;
      
      // Capture debug logs
      debugLogs = logger.getLogs();
      
      // Add metadata to the entry we just created
      console.log('\n💾 [Timeline API] Updating timeline entry with metadata:');
      console.log('  Entry ID:', result.insertedId);
      console.log('  Metadata final_score:', evaluation.metadata.evaluation.final_score);
      
      await db.collection('timeline').updateOne(
        { _id: result.insertedId },
        { 
          $set: { 
            metadata: evaluation.metadata,
            evaluationComplete: true 
          } 
        }
      );
      
      console.log('✅ [Timeline API] Timeline entry updated with scores');
      
      // Don't create separate score update entries anymore
      // The score is already attached to the main submission entry via metadata
      
      // Update project's updatedAt and current score
      console.log('\n💾 [Timeline API] Updating project with new scores:');
      console.log('  Project ID:', projectId);
      console.log('  New currentScore:', evaluation.scores.final_score);
      console.log('  Should match metadata score:', evaluation.metadata.evaluation.final_score);
      
      await db.collection('projects').updateOne(
        { _id: new ObjectId(projectId) },
        { 
          $set: { 
            updatedAt: new Date(),
            currentScore: evaluation.scores.final_score,
            lastEvaluation: evaluation.metadata.evaluation,
            categoryScores: {
              clarity: evaluation.scores.clarity,
              problem_value: evaluation.scores.problem_value,
              feasibility: evaluation.scores.feasibility,
              originality: evaluation.scores.originality,
              impact_convert: evaluation.scores.impact_convert,
              submission_readiness: evaluation.scores.submission_readiness
            }
          } 
        }
      );
      
      console.log('✅ [Timeline API] Project scores updated successfully');
      
    } catch (evalError) {
      console.error('Evaluation error (non-blocking):', evalError);
      // Continue even if evaluation fails
    }
    
    const response = {
      success: true,
      entryId: result.insertedId,
      entry: { ...entry, _id: result.insertedId, metadata: evaluationResult?.metadata },
      evaluation: evaluationResult,
      debugLogs: process.env.NODE_ENV === 'development' ? debugLogs : undefined
    };
    
    console.log('\n📤 [Timeline API] Sending response with scores:');
    if (evaluationResult) {
      console.log('  Final score in response:', evaluationResult.scores.final_score);
      console.log('  Metadata score in response:', evaluationResult.metadata.evaluation.final_score);
    }
    
    return NextResponse.json(response);
    
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