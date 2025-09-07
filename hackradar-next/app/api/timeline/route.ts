import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { EvaluationService } from '@/lib/evaluation/EvaluationService';
import { getDebugLogger, resetDebugLogger } from '@/lib/evaluation/DebugLogger';

// POST add entry to timeline
export async function POST(request: NextRequest) {
  console.log('\n🌟 [Timeline API] POST request received');
  try {
    console.log('📦 [Timeline API] Getting database connection...');
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
      console.log('\n🚀 [Timeline API] Starting evaluation process...');
      console.log('  Project ID:', projectId);
      console.log('  Text:', text?.substring(0, 100) || 'No text');
      console.log('  Files:', files.length);
      
      // Reset debug logger for this request
      resetDebugLogger();
      const logger = getDebugLogger();
      
      console.log('📊 [Timeline API] Creating EvaluationService...');
      const evaluationService = new EvaluationService(db);
      
      console.log('📊 [Timeline API] Calling evaluateSubmission...');
      console.log('  Submission data:');
      console.log('    Text length:', text?.length || 0);
      console.log('    Files count:', files.length);
      console.log('    URL:', url || 'none');
      
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
      
      console.log('✅ [Timeline API] Evaluation completed successfully');
      console.log('  Final score:', evaluation?.scores?.final_score || 'none');
      console.log('  Text eval result:', !!evaluation?.textEval);
      console.log('  SR tracker result:', !!evaluation?.sr_tracker);
      console.log('  Conversation ID:', evaluation?.textEval?.conversationId || 'none');
      
      evaluationResult = evaluation;
      
      // Capture debug logs
      debugLogs = logger.getLogs();
      
      // Store evaluation directly on timeline entry in simple format
      const evaluationData = {
        scores: {
          clarity: evaluation.scores.clarity,
          problem_value: evaluation.scores.problem_value,
          feasibility_signal: evaluation.scores.feasibility, // Map feasibility to feasibility_signal
          originality: evaluation.scores.originality,
          impact_convert: evaluation.scores.impact_convert,
          submission_readiness: evaluation.scores.submission_readiness, // MISSING - add submission readiness
          final_score: evaluation.scores.final_score
        },
        evidence: evaluation.textEval?.evidence || [],
        gaps: evaluation.textEval?.gaps || [],
        raw_ai_response: evaluation.textEval?.raw_response || '',
        evaluated_at: new Date()
      };
      
      console.log('\n💾 [Timeline API] Storing evaluation on timeline entry:');
      console.log('  Entry ID:', result.insertedId);
      console.log('  Final Score:', evaluationData.scores.final_score);
      console.log('  Individual Scores:', JSON.stringify(evaluationData.scores, null, 2));
      
      await db.collection('timeline').updateOne(
        { _id: result.insertedId },
        { 
          $set: { 
            evaluation: evaluationData,
            anthropic_conversation_id: evaluation.textEval?.conversationId
          } 
        }
      );
      
      console.log('✅ [Timeline API] Timeline entry updated with evaluation data');
      
      // Update project with latest score (only if evaluation succeeded)
      if (evaluation.scores?.final_score !== undefined) {
        await db.collection('projects').updateOne(
          { _id: new ObjectId(projectId) },
          { 
            $set: { 
              updatedAt: new Date(),
              currentScore: evaluation.scores.final_score,
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
      } else {
        console.log('⚠️ [Timeline API] Skipping project update - no valid scores');
      }
      
    } catch (evalError) {
      console.error('\n❌ [Timeline API] EVALUATION FAILED:');
      console.error('Project ID:', projectId);
      console.error('Text length:', text?.length || 0);
      console.error('Error message:', (evalError as Error)?.message || 'Unknown error');
      console.error('Error stack:', (evalError as Error)?.stack || 'No stack trace');
      console.error('Error type:', typeof evalError);
      console.error('Error name:', (evalError as Error)?.name || 'Unknown');
      console.error('Full error object:', JSON.stringify(evalError, null, 2));
      // Continue even if evaluation fails - but with detailed logging
    }
    
    const response = {
      success: true,
      entryId: result.insertedId,
      entry: { ...entry, _id: result.insertedId },
      evaluation: evaluationResult,
      debugLogs: process.env.NODE_ENV === 'development' ? debugLogs : undefined
    };
    
    console.log('\n📤 [Timeline API] Sending response with scores:');
    if (evaluationResult) {
      console.log('  Final score in response:', evaluationResult.scores?.final_score || 'N/A');
      console.log('  TextEval scores:', evaluationResult.textEval?.subscores || 'N/A');
    } else {
      console.log('  No evaluation result (evaluation failed)');
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