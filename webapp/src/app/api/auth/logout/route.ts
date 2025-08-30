import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // In a real app, you'd invalidate the session/token
    // For demo purposes, we'll just return success

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Logout process failed',
      },
      { status: 500 }
    );
  }
}
