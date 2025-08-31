'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

interface UserCalldata {
  userAddress: string;
  amount: string;
  nullifier: string;
  merkleProof: string[];
  metadata: {
    keyUint: string;
    leafHash: string;
    nullifierHash: string;
    amountInTokens: string;
  };
  instructions: {
    description: string;
    steps: string[];
  };
}

export default function CalldataPage() {
  const { address, isConnected } = useAccount();
  const [calldata, setCalldata] = useState<UserCalldata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCalldata = useCallback(async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/calldata?address=${address}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch calldata');
      }

      setCalldata(data.calldata);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [address]);

  const downloadCalldata = () => {
    if (!calldata || !address) return;

    const blob = new Blob([JSON.stringify(calldata, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${address}_calldata.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    if (!calldata) return;
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(calldata, null, 2));
      alert('Calldata copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchCalldata();
    }
  }, [isConnected, address, fetchCalldata]);

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
              📄 Calldata Generator
            </h1>
            <p className="text-gray-600 mb-6">
              Generate and download your airdrop claim data
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">
                ℹ️ Please connect your wallet to generate your calldata.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            📄 Airdrop Calldata
          </h1>
          <p className="text-gray-600 mb-6">
            Your personal claim data for the ZK token airdrop
          </p>

          {loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800">
                ⏳ Loading your calldata...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">❌ {error}</p>
            </div>
          )}

          {calldata && (
            <div className="space-y-6">
              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                ✅ Your calldata has been generated successfully! You can claim{' '}
                <strong>{calldata.metadata.amountInTokens} tokens</strong>.
              </p>
              </div>

              {/* Calldata Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 text-white rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-2">Your Address</h3>
                <p className="font-mono text-sm break-all">{calldata.userAddress}</p>
              </div>

              <div className="bg-gray-800 text-white rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-2">Claimable Amount</h3>
                <p className="text-2xl font-bold">{calldata.metadata.amountInTokens} ZKAT</p>
                <p className="text-sm text-gray-300">ZK Airdrop Tokens</p>
              </div>
              </div>

              {/* Instructions */}
              <div className="bg-gray-800 text-white rounded-lg p-4">
              <h3 className="font-semibold mb-3">How to Claim</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                {calldata.instructions.steps.map((step, index) => (
                <li key={index}>{step}</li>
                ))}
              </ol>
              </div>

              {/* Download Buttons */}
              <div className="flex gap-3">
              <button
                onClick={downloadCalldata}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                📥 Download Calldata
              </button>
              
              <button
                onClick={copyToClipboard}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                📋 Copy to Clipboard
              </button>
              </div>

              {/* Technical Details */}
              <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-600 group-open:text-black">
                🔍 Technical Details
              </summary>
              <div className="mt-3 space-y-2 text-xs font-mono bg-gray-900 text-white p-3 rounded">
                <div><strong>Nullifier:</strong> {calldata.nullifier}</div>
                <div><strong>Nullifier Hash:</strong> {calldata.metadata.nullifierHash}</div>
                <div><strong>Leaf Hash:</strong> {calldata.metadata.leafHash}</div>
                <div><strong>Merkle Proof:</strong></div>
                <ul className="list-disc list-inside ml-4 space-y-1">
                {calldata.merkleProof.map((proof, index) => (
                  <li key={index} className="break-all">{proof}</li>
                ))}
                </ul>
              </div>
              </details>
            </div>
          )}

          {!loading && !error && !calldata && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                ℹ️ No calldata available. You might not be eligible for this airdrop.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
