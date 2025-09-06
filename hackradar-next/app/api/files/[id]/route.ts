import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET endpoint to download/view files
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const fileIndex = searchParams.get('fileIndex');
    
    // Find the timeline entry
    const entry = await db.collection('timeline').findOne({
      _id: new ObjectId(params.id)
    });
    
    if (!entry) {
      return NextResponse.json(
        { error: 'Timeline entry not found' },
        { status: 404 }
      );
    }
    
    if (!entry.files || entry.files.length === 0) {
      return NextResponse.json(
        { error: 'No files in this entry' },
        { status: 404 }
      );
    }
    
    const index = parseInt(fileIndex || '0');
    if (index >= entry.files.length) {
      return NextResponse.json(
        { error: 'File index out of range' },
        { status: 404 }
      );
    }
    
    const file = entry.files[index];
    const buffer = Buffer.from(file.data, 'base64');
    
    // Sanitize filename for header - replace non-ASCII characters
    const safeFilename = file.name.replace(/[^\x00-\x7F]/g, '_');
    
    // Set appropriate headers for file download/display
    const headers = new Headers();
    headers.set('Content-Type', file.type);
    headers.set('Content-Length', buffer.length.toString());
    
    // For PDFs and images, display inline; for others, download
    if (file.type.includes('pdf') || file.type.startsWith('image/')) {
      headers.set('Content-Disposition', `inline; filename="${safeFilename}"`);
    } else {
      headers.set('Content-Disposition', `attachment; filename="${safeFilename}"`);
    }
    
    return new NextResponse(buffer, { headers });
    
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}