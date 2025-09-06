import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'Missing ?url parameter' }, { status: 400 });
    }
    
    // Basic validation: only allow http(s) links
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'Invalid URL - must start with http:// or https://' }, { status: 400 });
    }
    
    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(url, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Return PNG image with caching headers
    return new NextResponse(qrBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Content-Length': qrBuffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json(
      { error: 'QR code generation failed' }, 
      { status: 500 }
    );
  }
}

// Also support POST for more complex scenarios
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, size = 512, margin = 2, errorCorrection = 'M' } = body;
    
    if (!url) {
      return NextResponse.json({ error: 'Missing url in request body' }, { status: 400 });
    }
    
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'Invalid URL - must start with http:// or https://' }, { status: 400 });
    }
    
    const qrBuffer = await QRCode.toBuffer(url, {
      width: size,
      margin: margin,
      errorCorrectionLevel: errorCorrection as any,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return new NextResponse(qrBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': qrBuffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json(
      { error: 'QR code generation failed' }, 
      { status: 500 }
    );
  }
}