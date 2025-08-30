import { NextRequest, NextResponse } from 'next/server';
import { loadContractAddresses } from '@/lib/contracts';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get('chainId') || '31337', 10);

    const addresses = await loadContractAddresses(chainId);

    return NextResponse.json({
      success: true,
      addresses,
      chainId,
    });
  } catch (error) {
    console.error('Failed to load contract addresses:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load contract addresses',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
