import { NextRequest, NextResponse } from 'next/server';
import { SiweMessage } from 'siwe';

export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await request.json();

    if (!message || !signature) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message and signature are required',
        },
        { status: 400 }
      );
    }

    // Parse the SIWE message
    const siweMessage = new SiweMessage(message);

    // Verify the signature
    const verification = await siweMessage.verify({ signature });

    if (verification.success) {
      // In a real app, you'd create a proper JWT token here
      // For demo purposes, we'll use the signature as a token
      const token = signature;

      return NextResponse.json({
        success: true,
        data: {
          token,
          address: siweMessage.address,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Signature verification failed',
        },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Verification failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Verification process failed',
      },
      { status: 500 }
    );
  }
}
