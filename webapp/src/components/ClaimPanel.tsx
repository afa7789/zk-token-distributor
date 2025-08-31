"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useClaimTokens } from '@/hooks/useClaimTokens';

interface ParsedCalldata {
  proof: {
    a: [string, string];
    b: [[string, string], [string, string]];
    c: [string, string];
  };
  publicSignals: [string];
}

export default function ClaimPanel() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [calldataInput, setCalldataInput] = useState('');
  const [parsedCalldata, setParsedCalldata] = useState<ParsedCalldata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedWallet, setGeneratedWallet] = useState<string | null>(null);
  const { submitClaim, isSubmitting } = useClaimTokens();

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
      
      // Expected format: ["a0","a1"],[["b00","b01"],["b10","b11"]],["c0","c1"],[signal1,signal2,...]
      // We need to carefully parse this as it's not valid JSON
      
      // Split by top-level commas, but respect nested arrays
      const parts: string[] = [];
      let current = '';
      let depth = 0;
      let inQuotes = false;
      
      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];
        
        if (char === '"' && cleaned[i-1] !== '\\') {
          inQuotes = !inQuotes;
        }
        
        if (!inQuotes) {
          if (char === '[') depth++;
          if (char === ']') depth--;
          
          if (char === ',' && depth === 0) {
            parts.push(current);
            current = '';
            continue;
          }
        }
        
        current += char;
      }
      parts.push(current); // Add the last part
      
      if (parts.length !== 4) {
        throw new Error('Expected 4 parts: proof A, proof B, proof C, and public signals');
      }
      
      // Parse each part as JSON
      const proofA = JSON.parse(parts[0]);
      const proofB = JSON.parse(parts[1]);
      const proofC = JSON.parse(parts[2]);
      const publicSignals = JSON.parse(parts[3]);
      
      return {
        proof: {
          a: proofA,
          b: proofB,
          c: proofC
        },
        publicSignals: [publicSignals[0]] // ClaimData expects tuple [string]
      };
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

    try {
      await submitClaim({
        proof: parsedCalldata.proof,
        publicSignals: parsedCalldata.publicSignals,
        amount: "0" // Amount will be extracted from public signals by contract
      });
      
      // Clear form after successful claim
      setCalldataInput('');
      setParsedCalldata(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Claim failed');
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
            <p className="text-yellow-800">
              🔗 Connect a wallet to submit your claim transaction
            </p>
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
            placeholder='Paste your calldata here (format: ["a0","a1"],[["b00","b01"],["b10","b11"]],["c0","c1"],[signals...])'
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
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
            <p className="text-green-800 font-medium mb-2">✅ Calldata parsed successfully!</p>
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
              </div>
            </details>
          </div>
        )}

        {/* Claim Button */}
        <button
          onClick={handleClaim}
          disabled={!parsedCalldata || !isConnected || isSubmitting}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>⏳ Submitting Claim...</>
          ) : (
            <>🎁 Claim Tokens</>
          )}
        </button>

        {/* Helper Text */}
        <p className="text-sm text-gray-600 text-center">
          💡 Need calldata? Generate it on the <a href="/calldata" className="text-blue-600 hover:text-blue-800 underline">Calldata page</a>
        </p>
      </div>
    </div>
  );
}
