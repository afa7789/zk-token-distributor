import { NextResponse } from 'next/server';
import SIWEUtils from '@/lib/siwe';

export async function GET() {
  try {
    const nonce = SIWEUtils.generateNonce();

    return NextResponse.json({
      success: true,
      data: { nonce },
    });
  } catch (error) {
    console.error('Nonce generation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate nonce',
      },
      { status: 500 }
    );
  }
}
