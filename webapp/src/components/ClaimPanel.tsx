"use client";

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useClaimTokens } from '@/hooks/useClaimTokens';
import { formatEther } from 'viem';
import { zkProofGenerator, ZKProofInputs } from '@/lib/zkProofGenerator';

interface UserData {
  merkleRoot: string;
  nullifierHash: string;
  userAddress: string;
  amount: string;
  nullifier: string;
  siblings: string[];
}

export default function ClaimPanel() {
  const { address, isConnected } = useAccount();
  const [userClaimData, setUserClaimData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoWarning, setInfoWarning] = useState<string | null>(null);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const { submitClaim, isSubmitting } = useClaimTokens();

  const formatTokenAmount = (amount: string) => {
    try {
      return formatEther(BigInt(amount));
    } catch {
      return '0';
    }
  };

  // helper omitted — we write generated addresses to localStorage when calldata is present

  useEffect(() => {
    // Clear previous state when address changes
    setUserClaimData(null);
    setError(null);
    setInfoWarning(null);

    if (!address) return;

    const loadUserData = async () => {
      setLoading(true);
      setError(null);

      try {
        const resp = await fetch(`/api/inputs?address=${address}`);

        if (resp.status === 404) {
          setError('No claimable tokens found for this address');
          return;
        }

        if (resp.status === 401) {
          // Don't force SIWE; show a helpful note and allow trying a different wallet
          setInfoWarning('Server requested authentication for this address. If you generated calldata with this same wallet, try using a different address to claim.');
          return;
        }

        if (!resp.ok) {
          throw new Error('Failed to fetch claim data');
        }

        const data: UserData = await resp.json();
        setUserClaimData(data);

        // Record that this address has generated/received calldata (client-side marker)
        try {
          const raw = localStorage.getItem('generated_addresses');
          const list: string[] = raw ? JSON.parse(raw) : [];
          const lower = address.toLowerCase();
          if (!list.includes(lower)) {
            list.push(lower);
            localStorage.setItem('generated_addresses', JSON.stringify(list));
          }
  } catch {
          // ignore localStorage errors
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load claim data');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [address]);

  const handleClaim = async () => {
    if (!userClaimData) return;

    setIsGeneratingProof(true);

    try {
      const zkInputs: ZKProofInputs = {
        merkleRoot: userClaimData.merkleRoot,
        nullifierHash: userClaimData.nullifierHash,
        userAddress: userClaimData.userAddress,
        amount: userClaimData.amount,
        nullifier: userClaimData.nullifier,
        siblings: userClaimData.siblings
      };

      const proofData = await zkProofGenerator.generateProof(zkInputs);

      await submitClaim({
        proof: proofData.proof,
        publicSignals: proofData.publicSignals,
        amount: userClaimData.amount
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setIsGeneratingProof(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-2">Claim Your Tokens</h3>

      {!isConnected && (
        <div className="mb-4">
          <p className="text-sm">Please connect your wallet to check for claimable tokens.</p>
        </div>
      )}

      {infoWarning && (
        <div className="mb-4 text-sm text-gray-700">
          {infoWarning}
        </div>
      )}

      {loading && <p className="text-sm">Loading claim data...</p>}

      {error && <p className="text-sm text-gray-700">{error}</p>}

      {userClaimData && (
        <div className="mt-4">
          <p className="text-sm">Address: <span className="font-mono">{userClaimData.userAddress}</span></p>
          <p className="text-sm">Amount: {formatTokenAmount(userClaimData.amount)} ZKT</p>

          <div className="mt-3">
            <button onClick={handleClaim} disabled={isSubmitting || isGeneratingProof} className="btn-neutral px-3 py-2">
              {isGeneratingProof || isSubmitting ? 'Processing...' : 'Claim Tokens'}
            </button>
          </div>
        </div>
      )}

      {!loading && !error && !userClaimData && isConnected && (
        <p className="text-sm text-gray-700 mt-2">No calldata available for this address.</p>
      )}
    </div>
  );
}
