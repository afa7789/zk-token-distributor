import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { cookies } from 'next/headers';

interface UserData {
  merkleRoot: string;
  nullifierHash: string;
  userAddress: string;
  amount: string;
  nullifier: string;
  siblings: string[];
  amountInTokens?: string; // Added for compatibility
}

// Convert Ethereum address to the format used in inputs_circom.json
function addressToDecimal(address: string): string {
  const hexAddress = address.slice(2);
  return BigInt('0x' + hexAddress).toString();
}

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

    // Convert user's Ethereum address to decimal format for searching
    const userAddressDecimal = addressToDecimal(userAddress);
    
    // Read the inputs_circom.json file from the out directory
    const filePath = path.join(process.cwd(), '..', 'out', 'inputs_circom.json');
    const fileContent = await readFile(filePath, 'utf-8');
    const inputsData: UserData[] = JSON.parse(fileContent);

    // Find only the user's data
    const userData = inputsData.find(data => data.userAddress === userAddressDecimal);
    
    if (!userData || userData.amount === "0") {
      return NextResponse.json(
        { error: 'No claimable tokens found for this address' },
        { status: 404 }
      );
    }

    // Format the data to ensure proper field element format and add token amount
    const formatFieldElement = (value: string): string => BigInt(value).toString();
    const formatTokenAmount = (amountWei: string): string => {
      const tokens = BigInt(amountWei) / BigInt(10 ** 18);
      return tokens.toString();
    };

    const formattedUserData = {
      merkleRoot: formatFieldElement(userData.merkleRoot),
      nullifierHash: formatFieldElement(userData.nullifierHash),
      userAddress: formatFieldElement(userData.userAddress),
      amount: formatFieldElement(userData.amount),
      nullifier: formatFieldElement(userData.nullifier),
      siblings: userData.siblings.map(s => formatFieldElement(s)),
      amountInTokens: formatTokenAmount(userData.amount)
    };

    // Return only the user's specific data
    return NextResponse.json(formattedUserData);
  } catch (error) {
    console.error('Error reading inputs file:', error);
    return NextResponse.json(
      { error: 'Failed to load user claim data' },
      { status: 500 }
    );
  }
}
