import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url') || 'https://hackradar.me';
    
    // Generate QR code as SVG
    const qrCodeSvg = await QRCode.toString(url, {
      type: 'svg',
      width: 150,
      margin: 1,
      color: {
        dark: '#00d4ff',
        light: '#ffffff'
      }
    });

    return new Response(qrCodeSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
      },
    });
  } catch (error) {
    console.error('QR Code generation error:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}