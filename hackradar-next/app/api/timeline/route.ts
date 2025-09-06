import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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
    const entry = {
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