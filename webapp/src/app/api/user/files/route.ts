import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authorization header required',
        },
        { status: 401 }
      );
    }

    // In production, verify the token and get user info
    // For demo, return mock files
    const mockFiles = [
      {
        id: 'file_1',
        name: 'calldata_example_1.json',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'file_2',
        name: 'calldata_example_2.json',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        files: mockFiles,
      },
    });
  } catch (error) {
    console.error('Failed to retrieve user files:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve files',
      },
      { status: 500 }
    );
  }
}
