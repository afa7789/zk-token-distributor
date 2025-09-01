import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    if (!fileId) {
      return NextResponse.json(
        {
          success: false,
          error: 'File ID is required',
        },
        { status: 400 }
      );
    }

    // In production, retrieve file from database or file system
    // For demo, generate mock data
    const mockFileData = {
      fileId,
      merkleRoot: "0x1234567890abcdef",
      leaves: [
        {
          userAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          amount: "1000000000000000000",
          nullifier: "0xabcdef1234567890",
          nullifierHash: "0xfedcba0987654321",
          siblings: ["0x1111111111111111", "0x2222222222222222"]
        }
      ],
      generatedAt: new Date().toISOString()
    };

    const jsonData = JSON.stringify(mockFileData, null, 2);

    return new Response(jsonData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="calldata_${fileId}.json"`,
      },
    });
  } catch (error) {
    console.error('File download failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to download file',
      },
      { status: 500 }
    );
  }
}
