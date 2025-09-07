import { NextRequest, NextResponse } from 'next/server';
import { CalldataGenerator } from '@/lib/generateCalldata';
import { cookies } from 'next/headers';
import path from 'path';
import fs from 'fs/promises';

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
    const smtResultsPath = path.join(process.cwd(), '..', 'out', 'smt_results_fixed.json');
    // Verify SMT file exists and contains the address before attempting to generate calldata
    try {
      const exists = await addressExistsInSmt(smtResultsPath, userAddress);
      if (!exists) {
        return NextResponse.json({
          error: 'No merkle tree data found for address',
          address: userAddress,
          path: smtResultsPath
        }, { status: 404 });
      }
    } catch (err) {
      console.error('SMT file read/parse error', err);
      return NextResponse.json({
        error: 'SMT file read/parse error',
        details: String(err),
        path: smtResultsPath
      }, { status: 500 });
    }
    
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
    const smtResultsPath = path.join(process.cwd(), '..', 'out', 'smt_results_fixed.json');
    // Verify SMT file exists and contains the address before attempting to generate calldata
    try {
      const exists = await addressExistsInSmt(smtResultsPath, address);
      if (!exists) {
        return NextResponse.json({
          error: 'No merkle tree data found for address',
          address,
          path: smtResultsPath
        }, { status: 404 });
      }
    } catch (err) {
      console.error('SMT file read/parse error', err);
      return NextResponse.json({
        error: 'SMT file read/parse error',
        details: String(err),
        path: smtResultsPath
      }, { status: 500 });
    }
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

async function addressExistsInSmt(smtPath: string, address: string | null | undefined): Promise<boolean> {
  if (!address) return false;
  
  // Convert address to BigInt format for comparison
  const addressToBigInt = (addr: string): string => {
    if (!addr.startsWith('0x')) {
      return addr;
    }
    const hexAddress = addr.slice(2);
    return BigInt('0x' + hexAddress).toString();
  };
  
  const addrLower = address.toLowerCase();
  const addrBigInt = addressToBigInt(address);
  
  const raw = await fs.readFile(smtPath, 'utf8');
  const json = JSON.parse(raw);

  // Check if it's the new format with inputs_circom_fixed.json structure (array of user objects)
  if (Array.isArray(json)) {
    return json.some((item: unknown) => {
      if (!item || typeof item !== 'object') return false;
      const obj = item as Record<string, unknown>;
      
      // Check userAddress field (BigInt format)
      if (obj.userAddress === addrBigInt) return true;
      
      // Fallback checks for other possible formats
      if (obj.key && typeof obj.key === 'string' && obj.key.toLowerCase() === addrLower) return true;
      if (obj.address && typeof obj.address === 'string' && obj.address.toLowerCase() === addrLower) return true;
      
      return false;
    });
  }

  // Check if it's the SMT results format with leaves array
  if (json && typeof json === 'object' && 'leaves' in json && Array.isArray((json as { leaves: unknown[] }).leaves)) {
    const smtResults = json as { leaves: unknown[] };
    return smtResults.leaves.some((leaf: unknown) => {
      if (!leaf || typeof leaf !== 'object') return false;
      const leafObj = leaf as Record<string, unknown>;
      
      // Check key field (original address format)
      if (leafObj.key && typeof leafObj.key === 'string' && leafObj.key.toLowerCase() === addrLower) return true;
      
      // Check keyUint field (BigInt format)
      if (leafObj.keyUint === addrBigInt) return true;
      
      return false;
    });
  }

  // If it's an object keyed by address
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    // direct keys may be 0x... or lowercased
    for (const k of Object.keys(json)) {
      if (k.toLowerCase() === addrLower) return true;
    }
  }

  // Fallback: full-text search
  return JSON.stringify(json).toLowerCase().includes(addrLower) || 
         JSON.stringify(json).includes(addrBigInt);
}
