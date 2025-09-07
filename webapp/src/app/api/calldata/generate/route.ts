import { NextRequest, NextResponse } from 'next/server';

// Mock data for demonstration - updated to match new format
const mockCalldata = {
  merkleRoot: "7054385145717911653721609161544638637633539625963676117015460245407631267339",
  leaves: [
    {
      userAddress: "1390849295786071768276380950238675083608645509734",
      amount: "60000000000000000000000",
      nullifier: "99892431667264780526922438873684298401970450191349354653913613666127552981714",
      expectedNullifierHash: "12956891689705020057948810939605933591830586451085471908875849842579991009580",
      pathElements: [
        "15324457267448334292508727107018736926623408961328830725439383822191146092582",
        "17959057458501074086662484692447564394388239761773269233299109093124629458531",
        "13687360756100395227825494650245324393489352573711604433876050929661508748935",
        "14128336012355316854689530660174047682298228668731064114128318706349080384522",
        "17903822129909817717122288064678017104411031693253675943446999432073303897479"
      ],
      pathIndices: "4"
    }
  ]
};

export async function POST(request: NextRequest) {
  try {
    const { address, sessionToken } = await request.json();

    if (!address || !sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Address and session token are required',
        },
        { status: 400 }
      );
    }

    // In production, verify the session token
    // For demo purposes, we'll accept any token

    // Generate unique file ID
    const fileId = `calldata_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In production, save to database or file system
    // For demo, we'll just return the data

    return NextResponse.json({
      success: true,
      data: {
        fileId,
        downloadUrl: `/api/calldata/download/${fileId}`,
        preview: mockCalldata
      },
    });
  } catch (error) {
    console.error('Calldata generation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate calldata',
      },
      { status: 500 }
    );
  }
}
