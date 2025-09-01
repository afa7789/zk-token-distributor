"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { useClaimTokens } from '@/hooks/useClaimTokens';
import TransactionStatus from '@/components/TransactionStatus';

interface ParsedCalldata {
  proof: {
    a: [string, string];
    b: [[string, string], [string, string]];
    c: [string, string];
  };
  publicSignals: [string, string, string]; // Updated: now 3 public signals [merkleRoot, nullifierHash, amount]
  amount?: string; // Amount from calldata (for backward compatibility)
}

export default function ClaimPanel() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [calldataInput, setCalldataInput] = useState('');
  const [parsedCalldata, setParsedCalldata] = useState<ParsedCalldata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedWallet, setGeneratedWallet] = useState<string | null>(null);
  const { submitClaim, transactionState } = useClaimTokens();

  // Check localStorage for wallet that generated calldata
  useEffect(() => {
    try {
      const raw = localStorage.getItem('calldata_generated_wallet');
      if (raw) {
        setGeneratedWallet(raw);
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const parseCalldata = (input: string): ParsedCalldata | null => {
    try {
      // Remove whitespace and newlines
      const cleaned = input.trim().replace(/\s+/g, '');
      
      console.log('Parsing calldata:', cleaned.substring(0, 100) + '...');
      
      // Expected format: ["a0","a1"],[["b00","b01"],["b10","b11"]],["c0","c1"],[signal1,signal2,signal3],"amount"
      // Wrap in brackets to make it valid JSON array and parse
      const calldataArray = JSON.parse('[' + cleaned + ']');
      
      console.log('Parsed array length:', calldataArray.length);
      console.log('Parsed array:', calldataArray);
      
      // Check if we have the new format with amount (5 parts) or old format (4 parts)
      if (calldataArray.length === 5) {
        // New format with amount
        const [proofA, proofB, proofC, publicSignals, amount] = calldataArray;
        
        // Validate public signals - should have exactly 3 elements
        if (!Array.isArray(publicSignals) || publicSignals.length !== 3) {
          throw new Error(`Expected 3 public signals, got ${Array.isArray(publicSignals) ? publicSignals.length : 'non-array'}`);
        }
        
        return {
          proof: {
            a: proofA,
            b: proofB,
            c: proofC
          },
          publicSignals: [publicSignals[0], publicSignals[1], publicSignals[2]] as [string, string, string],
          amount: amount
        };
      } else if (calldataArray.length === 4) {
        // Old format without amount - try to extract amount from public signals if available
        const [proofA, proofB, proofC, publicSignals] = calldataArray;
        
        let formattedPublicSignals: [string, string, string];
        let extractedAmount: string | undefined;
        
        if (Array.isArray(publicSignals)) {
          if (publicSignals.length === 3) {
            // New circuit format with 3 signals: [merkleRoot, nullifierHash, amount]
            formattedPublicSignals = [publicSignals[0], publicSignals[1], publicSignals[2]] as [string, string, string];
            extractedAmount = publicSignals[2]; // amount is the 3rd signal
          } else if (publicSignals.length === 1) {
            // Old circuit format with 1 signal - pad with zeros for compatibility
            formattedPublicSignals = [publicSignals[0], "0", "0"] as [string, string, string];
          } else {
            throw new Error(`Unexpected number of public signals: ${publicSignals.length}`);
          }
        } else {
          // Single public signal - old format
          formattedPublicSignals = [publicSignals, "0", "0"] as [string, string, string];
        }
        
        return {
          proof: {
            a: proofA,
            b: proofB,
            c: proofC
          },
          publicSignals: formattedPublicSignals,
          amount: extractedAmount
        };
      } else {
        throw new Error(`Expected 4 parts (old format) or 5 parts (new format with amount), got ${calldataArray.length} parts`);
      }
    } catch (err) {
      console.error('Parse error:', err);
      return null;
    }
  };

  const handleCalldataChange = (input: string) => {
    setCalldataInput(input);
    setError(null);
    
    if (input.trim()) {
      const parsed = parseCalldata(input);
      if (parsed) {
        setParsedCalldata(parsed);
      } else {
        setParsedCalldata(null);
        setError('Invalid calldata format. Please paste the correct calldata string.');
      }
    } else {
      setParsedCalldata(null);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleCalldataChange(content);
    };
    reader.readAsText(file);
  };

  const handleClaim = async () => {
    if (!parsedCalldata || !address) return;

    // Try to get amount from calldata.amount or from the 3rd public signal
    const amount = parsedCalldata.amount || parsedCalldata.publicSignals[2];
    
    if (!amount || amount === "0") {
      setError('No amount found in calldata. Please use calldata generated with the new format that includes the amount.');
      return;
    }

    try {
      await submitClaim({
        proof: parsedCalldata.proof,
        publicSignals: parsedCalldata.publicSignals,
        amount: amount
      });
    } catch (err) {
      // Error handling is now done in the useClaimTokens hook and displayed via TransactionStatus
      console.error('Claim failed:', err);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setCalldataInput('');
    setParsedCalldata(null);
    setError(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        🎁 Claim Airdrop Tokens
      </h1>
      <p className="text-gray-600 mb-6">
        Upload or paste your calldata to claim your ZK airdrop tokens
      </p>

      {/* Wallet Status & Generated Wallet Info */}
      <div className="mb-6">
        {generatedWallet && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-800 text-sm">
              💡 <strong>Calldata was generated with wallet:</strong> {generatedWallet.slice(0, 6)}...{generatedWallet.slice(-4)}
            </p>
            <p className="text-blue-700 text-xs mt-1">
              You can claim with any wallet, but using a different wallet is recommended for privacy.
            </p>
          </div>
        )}

        {isConnected ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-800 font-medium">
                  ✅ Wallet Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
                <p className="text-green-700 text-sm">
                  Ready to submit claim transaction
                </p>
              </div>
              <button
                onClick={handleDisconnect}
                className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
              >
                🔌 Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-800 font-medium">
                  🔗 Connect Wallet to Submit Claim
                </p>
                <p className="text-yellow-700 text-sm">
                  Connect any wallet to submit your claim transaction
                </p>
              </div>
              <ConnectKitButton />
            </div>
          </div>
        )}
      </div>

      {/* Calldata Input Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Submit Your Calldata</h2>
        
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload calldata.txt file
          </label>
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div className="text-center text-gray-500 text-sm">— OR —</div>

        {/* Text Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste calldata string
          </label>
          <textarea
            value={calldataInput}
            onChange={(e) => handleCalldataChange(e.target.value)}
            placeholder='Paste your calldata here (format: ["a0","a1"],[["b00","b01"],["b10","b11"]],["c0","c1"],[signals...],"amount")'
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            💡 New calldata format includes the amount automatically - no need to enter it separately
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">❌ {error}</p>
          </div>
        )}

        {/* Parsed Calldata Preview */}
        {parsedCalldata && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium mb-2">
              ✅ Calldata parsed successfully!
              {(() => {
                const amount = parsedCalldata.amount || parsedCalldata.publicSignals[2];
                if (amount && amount !== "0") {
                  return (
                    <span className="ml-2 text-sm">
                      (Amount: {(BigInt(amount) / BigInt(10**18)).toString()} tokens)
                    </span>
                  );
                }
                return null;
              })()}
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer text-green-700 hover:text-green-900">
                🔍 View parsed data
              </summary>
              <div className="mt-2 bg-gray-900 text-white p-2 rounded font-mono text-xs overflow-x-auto">
                <div><strong>Proof A:</strong> [{parsedCalldata.proof.a.join(', ')}]</div>
                <div><strong>Proof B:</strong> [
                  [{parsedCalldata.proof.b[0].join(', ')}],
                  [{parsedCalldata.proof.b[1].join(', ')}]
                ]</div>
                <div><strong>Proof C:</strong> [{parsedCalldata.proof.c.join(', ')}]</div>
                <div><strong>Public Signals:</strong> [{parsedCalldata.publicSignals.join(', ')}]</div>
                <div><strong>Merkle Root:</strong> {parsedCalldata.publicSignals[0]}</div>
                <div><strong>Nullifier Hash:</strong> {parsedCalldata.publicSignals[1]}</div>
                <div><strong>Amount (wei):</strong> {parsedCalldata.publicSignals[2]}</div>
                {parsedCalldata.amount && (
                  <div><strong>Amount (legacy):</strong> {parsedCalldata.amount}</div>
                )}
                {(() => {
                  const amount = parsedCalldata.amount || parsedCalldata.publicSignals[2];
                  if (amount && amount !== "0") {
                    return <div><strong>Amount (tokens):</strong> {(BigInt(amount) / BigInt(10**18)).toString()}</div>;
                  }
                  return null;
                })()}
              </div>
            </details>
          </div>
        )}

        {/* Claim Button */}
        <button
          onClick={handleClaim}
          disabled={!parsedCalldata || !isConnected || transactionState.isSubmitting || (() => {
            const amount = parsedCalldata?.amount || parsedCalldata?.publicSignals[2];
            return !amount || amount === "0";
          })()}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {transactionState.isSubmitting ? (
            <>⏳ Submitting Claim...</>
          ) : (() => {
            const amount = parsedCalldata?.amount || parsedCalldata?.publicSignals[2];
            if (!amount || amount === "0") {
              return <>⚠️ Missing Amount (Use New Calldata Format)</>;
            }
            return <>🎁 Claim Tokens</>;
          })()}
        </button>

        {/* Transaction Status */}
        <TransactionStatus 
          transactionState={transactionState}
          onClose={() => {
            // Optionally clear the form on success
            if (transactionState.isSuccess) {
              setCalldataInput('');
              setParsedCalldata(null);
            }
          }}
        />

        {/* Helper Text */}
        <p className="text-sm text-gray-600 text-center">
          💡 Need calldata? Generate it on the <a href="/calldata" className="text-blue-600 hover:text-blue-800 underline">Calldata page</a>
          {(() => {
            const amount = parsedCalldata?.amount || parsedCalldata?.publicSignals[2];
            if (parsedCalldata && (!amount || amount === "0")) {
              return (
                <><br/><span className="text-orange-600">⚠️ Your calldata is missing the amount. Please regenerate it with the latest format.</span></>
              );
            }
            return null;
          })()}
        </p>
      </div>
    </div>
  );
}
