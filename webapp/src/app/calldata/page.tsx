'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/hooks/useAuth';
import * as snarkjs from 'snarkjs';

interface GeneratedCalldata {
  proof: [string, string];
  proofB: [[string, string], [string, string]];
  proofC: [string, string];
  publicSignals: string[];
  formattedCalldata: string;
}

interface BackendData {
  userAddress: string;
  amount: string;
  nullifier: string;
  merkleProof: string[];
  metadata: {
    nullifierHash: string;
    merkleRoot: string;
    amountInTokens?: string;
  };
}

export default function CalldataPage() {
  const { address, isConnected } = useAccount();
  const { isAuthenticated, signIn } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [generatedCalldata, setGeneratedCalldata] = useState<GeneratedCalldata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendData, setBackendData] = useState<BackendData | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);
  const [hasBackendData, setHasBackendData] = useState<boolean | null>(null);

  // Check if wallet has data in backend
  const checkBackendData = useCallback(async () => {
    if (!address) return;
    
    setCheckingBackend(true);
    try {
      const response = await fetch(`/api/calldata?address=${address}`);
      const data = await response.json();

      if (response.ok && data.calldata) {
        setBackendData(data.calldata);
        setHasBackendData(true);
      } else {
        setHasBackendData(false);
      }
    } catch {
      setHasBackendData(false);
    } finally {
      setCheckingBackend(false);
    }
  }, [address]);

  // Check backend data when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      checkBackendData();
    }
  }, [isConnected, address, checkBackendData]);

  const generateProof = async () => {
    if (!backendData) {
      setError('No backend data available. Please ensure your wallet is eligible for the airdrop.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare inputs for circom using backend data
      const circuitInputs = {
        merkleRoot: backendData.metadata.merkleRoot,
        nullifierHash: backendData.metadata.nullifierHash,
        userAddress: backendData.userAddress,
        amount: backendData.amount,
        nullifier: backendData.nullifier,
        siblings: backendData.merkleProof.filter(s => s.trim() !== '')
      };

      console.log('Generating proof with backend data:', circuitInputs);

      // Generate the proof using snarkjs
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInputs,
        '/circom/airdrop_smt.wasm',
        '/circom/airdrop_smt_01.zkey'
      );

      console.log('Proof generated:', { proof, publicSignals });

      // Export Solidity calldata
      const solidityCalldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
      const [a, b, c, signals] = solidityCalldata.split(',').map((x: string) => JSON.parse(x));

      // Format as the expected calldata string
      const formattedCalldata = `["${a[0]}", "${a[1]}"],[["${b[0][0]}", "${b[0][1]}"],["${b[1][0]}", "${b[1][1]}"]],["${c[0]}", "${c[1]}"],[${signals.join(',')}]`;

      setGeneratedCalldata({
        proof: a,
        proofB: b,
        proofC: c,
        publicSignals: signals,
        formattedCalldata
      });

      // Save wallet that generated calldata to localStorage
      if (address) {
        try {
          localStorage.setItem('calldata_generated_wallet', address);
        } catch {
          // ignore localStorage errors
        }
      }

    } catch (err) {
      console.error('Proof generation failed:', err);
      setError(err instanceof Error ? err.message : 'Proof generation failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadCalldata = () => {
    if (!generatedCalldata) return;

    const blob = new Blob([generatedCalldata.formattedCalldata], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calldata.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // If not connected, show connection prompt
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
              🔐 ZK Proof & Calldata Generator
            </h1>
            <p className="text-gray-600 mb-6">
              Generate zero-knowledge proofs and Solidity calldata for airdrop claims
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">
                🔗 Please connect your wallet to continue.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If connected but not authenticated with SIWE, show sign-in prompt
  if (isConnected && !isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
              🔐 ZK Proof & Calldata Generator
            </h1>
            <p className="text-gray-600 mb-6">
              Generate zero-knowledge proofs and Solidity calldata for airdrop claims
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="text-center">
                <p className="text-yellow-800 mb-4">
                  🔐 Authentication Required
                </p>
                <p className="text-yellow-700 mb-6">
                  You need to sign in with Ethereum (SIWE) to access calldata generation.
                  This ensures secure access to your airdrop data.
                </p>
                <button
                  onClick={async () => {
                    setSigningIn(true);
                    try {
                      await signIn();
                    } catch (error) {
                      console.error('Sign in failed:', error);
                    } finally {
                      setSigningIn(false);
                    }
                  }}
                  disabled={signingIn}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                >
                  {signingIn ? '⏳ Signing In...' : '✍️ Sign In with Ethereum'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const copyToClipboard = async () => {
    if (!generatedCalldata) return;
    
    try {
      await navigator.clipboard.writeText(generatedCalldata.formattedCalldata);
      alert('Calldata copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            🔐 ZK Proof & Calldata Generator
          </h1>
          <p className="text-gray-600 mb-6">
            Generate zero-knowledge proofs and Solidity calldata for airdrop claims
          </p>

          {/* Wallet Connection Status */}
          {!isConnected && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800">
                ℹ️ Connect your wallet to check for existing airdrop data or generate proofs manually.
              </p>
            </div>
          )}

          {/* Backend Data Status */}
          {isConnected && address && (
            <div className="mb-6">
              {checkingBackend && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-700 flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Checking airdrop eligibility for your wallet...
                  </p>
                  <p className="text-blue-600 text-sm mt-1">
                    Verifying if your address is included in the merkle tree.
                  </p>
                </div>
              )}

              {hasBackendData === true && backendData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-green-800 font-medium mb-2">
                        ✅ Airdrop data found for your wallet!
                      </p>
                      <p className="text-green-700 text-sm mb-3">
                        You can claim <strong>{backendData.metadata?.amountInTokens || backendData.amount} tokens</strong>.
                        Your proof data is ready to generate.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {hasBackendData === false && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-red-800 font-semibold">
                        🚫 No Airdrop Eligibility Found
                      </p>
                      <p className="text-red-700 text-sm mt-1">
                        Wallet <span className="font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span> is not included in the airdrop merkle tree.
                      </p>
                      <p className="text-red-600 text-xs mt-2">
                        ⚠️ <strong>ZK Proof generation is not available</strong> - only eligible addresses can generate valid proofs.
                      </p>
                    </div>
                    <button
                      onClick={checkBackendData}
                      disabled={checkingBackend}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm disabled:opacity-50 flex-shrink-0 ml-4"
                    >
                      🔄 Recheck
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">❌ {error}</p>
            </div>
          )}

          {/* Backend Data Display */}
          {hasBackendData && backendData && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">📋 Your Airdrop Data</h2>
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Wallet Address
                    </label>
                    <div className="bg-white p-3 rounded border text-sm font-mono">
                      {backendData.userAddress}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Token Amount
                    </label>
                    <div className="bg-white p-3 rounded border text-sm">
                      {backendData.metadata?.amountInTokens || backendData.amount} tokens
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Merkle Root
                    </label>
                    <div className="bg-white p-3 rounded border text-sm font-mono break-all">
                      {backendData.metadata.merkleRoot}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nullifier Hash
                    </label>
                    <div className="bg-white p-3 rounded border text-sm font-mono break-all">
                      {backendData.metadata.nullifierHash}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Merkle Proof ({backendData.merkleProof.length} siblings)
                  </label>
                  <div className="bg-white p-3 rounded border max-h-32 overflow-y-auto">
                    {backendData.merkleProof.map((sibling, index) => (
                      <div key={index} className="text-sm font-mono text-gray-600 py-1">
                        [{index}] {sibling}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate Proof Button */}
              <div className="mt-6">
                <button
                  onClick={generateProof}
                  disabled={loading || !backendData}
                  className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg font-semibold"
                >
                  {loading ? (
                    <>⏳ Generating ZK Proof...</>
                  ) : (
                    <>🔐 Generate ZK Proof & Calldata</>
                  )}
                </button>
                <p className="text-sm text-gray-600 mt-2 text-center">
                  This will generate a zero-knowledge proof using your airdrop data
                </p>
              </div>
            </div>
          )}

          {/* No Data State */}
          {hasBackendData === false && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">�</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Proof Generation Available</h3>
              <p className="text-gray-600 mb-4">
                Your wallet address is not eligible for the current airdrop distribution.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-red-800 text-sm">
                  <strong>⚠️ Cannot Generate ZK Proof</strong><br/>
                  No merkle tree data found for address:<br/>
                  <span className="font-mono text-xs break-all">{address}</span>
                </p>
              </div>
              <p className="text-gray-500 text-sm mt-4">
                Only addresses included in the airdrop merkle tree can generate valid proofs.
              </p>
            </div>
          )}

          {/* Generated Calldata Display */}
          {generatedCalldata && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">
                  ✅ Proof generated successfully!
                </p>
              </div>

              {/* Formatted Calldata */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Generated Calldata</h3>
                <div className="bg-gray-900 text-white p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre>{generatedCalldata.formattedCalldata}</pre>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={downloadCalldata}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  📥 Download calldata.txt
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
                  <div><strong>Proof A:</strong> [{generatedCalldata.proof.join(', ')}]</div>
                  <div><strong>Proof B:</strong> [
                    [{generatedCalldata.proofB[0].join(', ')}],
                    [{generatedCalldata.proofB[1].join(', ')}]
                  ]</div>
                  <div><strong>Proof C:</strong> [{generatedCalldata.proofC.join(', ')}]</div>
                  <div><strong>Public Signals:</strong> [{generatedCalldata.publicSignals.join(', ')}]</div>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
