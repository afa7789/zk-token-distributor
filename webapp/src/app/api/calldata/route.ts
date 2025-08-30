import { NextRequest, NextResponse } from 'next/server';
import { CalldataGenerator } from '@/lib/generateCalldata';
import { cookies } from 'next/headers';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Get user address from query parameter
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('address');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      );
    }

    // Verify authentication (check for session token and address)
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session-token');
    const sessionAddress = cookieStore.get('session-address');
    
    if (!sessionToken || !sessionAddress) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify that the requesting user matches the authenticated user
    if (sessionAddress.value.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Unauthorized: Address mismatch' },
        { status: 403 }
      );
    }
    
    // Path to SMT results file
    const smtResultsPath = path.join(process.cwd(), '..', 'out', 'smt_results.json');
    
    // Generate calldata for the authenticated user
    const calldata = await CalldataGenerator.generateCalldataForUser(
      userAddress, 
      smtResultsPath
    );
    
    if (!calldata) {
      return NextResponse.json({ 
        error: 'No calldata found for this address',
        message: 'This address is not eligible for the airdrop'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      calldata
    });

  } catch (error) {
    console.error('Error generating calldata:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'Failed to generate calldata'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Verify authentication
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session-token');
    const sessionAddress = cookieStore.get('session-address');
    
    if (!sessionToken || !sessionAddress) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Ensure user can only get calldata for their own address
    if (address.toLowerCase() !== sessionAddress.value.toLowerCase()) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'You can only generate calldata for your own address'
      }, { status: 403 });
    }

    // Path to SMT results file
    const smtResultsPath = path.join(process.cwd(), '..', 'out', 'smt_results.json');
    
    // Generate calldata for the requested address
    const calldata = await CalldataGenerator.generateCalldataForUser(
      address, 
      smtResultsPath
    );
    
    if (!calldata) {
      return NextResponse.json({ 
        error: 'No calldata found for this address',
        message: 'This address is not eligible for the airdrop'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      calldata
    });

  } catch (error) {
    console.error('Error generating calldata:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'Failed to generate calldata'
    }, { status: 500 });
  }
}
