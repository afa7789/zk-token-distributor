'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useAuthStore } from '@/store/authStore';
import { useState, useEffect } from 'react';
import { ConnectKitButton } from 'connectkit';
import { useClaimTokens } from '@/hooks/useClaimTokens';
import { formatEther } from 'viem';

interface UserData {
  merkleRoot: string;
  nullifierHash: string;
  userAddress: string;
  amount: string;
  nullifier: string;
  siblings: string[];
}

export default function Claim() {
  const { address, isConnected } = useAccount();
  const { isAuthenticated } = useAuthStore();
  const [userClaimData, setUserClaimData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { submitClaim, isSubmitting, error: claimError } = useClaimTokens();

  // Load user data from inputs_circom.json
  useEffect(() => {
    if (!address || !isAuthenticated) {
      setUserClaimData(null);
      return;
    }

    const loadUserData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch user-specific data from secure API endpoint
        const response = await fetch(`/api/inputs?address=${address}`);
        
        if (response.status === 401) {
          setError('Authentication required');
          return;
        }
        
        if (response.status === 404) {
          setError('No claimable tokens found for your address');
          return;
        }
        
        if (!response.ok) {
          throw new Error('Failed to load user data');
        }
        
        const userData: UserData = await response.json();
        setUserClaimData(userData);
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Failed to load claim data');
        setUserClaimData(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [address, isAuthenticated]);

  const handleClaim = async () => {
    if (!userClaimData) return;

    try {
      // For now, we need to generate the ZK proof
      // This is a simplified version - in production you'd generate actual ZK proofs
      const claimData = {
        proof: {
          a: ["0", "0"] as [string, string],
          b: [["0", "0"], ["0", "0"]] as [[string, string], [string, string]],
          c: ["0", "0"] as [string, string]
        },
        publicSignals: [userClaimData.nullifierHash] as [string],
        amount: userClaimData.amount
      };
      
      await submitClaim(claimData);
    } catch (err) {
      console.error('Claim failed:', err);
    }
  };

  const formatTokenAmount = (amount: string) => {
    try {
      return formatEther(BigInt(amount));
    } catch {
      return '0';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                ZK Token Distributor
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/about"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                About
              </Link>
              <Link
                href="/"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </Link>
              <ConnectKitButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Claim Your Tokens
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Connect your wallet and authenticate to claim your ZK tokens
            </p>
          </div>

          {/* Connection Status */}
          {!isConnected && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <div className="text-center">
                <h3 className="text-lg font-medium text-yellow-800 mb-2">
                  Connect Your Wallet
                </h3>
                <p className="text-yellow-700 mb-4">
                  Please connect your wallet to check for claimable tokens
                </p>
                <ConnectKitButton />
              </div>
            </div>
          )}

          {/* Authentication Required */}
          {isConnected && !isAuthenticated && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <div className="text-center">
                <h3 className="text-lg font-medium text-blue-800 mb-2">
                  Authentication Required
                </h3>
                <p className="text-blue-700 mb-4">
                  Please authenticate with Sign-In with Ethereum to proceed
                </p>
                <Link
                  href="/auth"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Authenticate
                </Link>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isConnected && isAuthenticated && loading && (
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your claim data...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {isConnected && isAuthenticated && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
              <div className="text-center">
                <h3 className="text-lg font-medium text-red-800 mb-2">
                  No Tokens Available
                </h3>
                <p className="text-red-700">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Claim Data */}
          {isConnected && isAuthenticated && userClaimData && (
            <>
              <div className="bg-white shadow rounded-lg p-6 mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Your Claimable Tokens
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Address
                    </label>
                    <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                      {address}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Claimable Amount
                    </label>
                    <p className="text-lg font-bold text-green-600">
                      {formatTokenAmount(userClaimData.amount)} ZKT
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Merkle Root
                    </label>
                    <p className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded break-all">
                      {userClaimData.merkleRoot}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nullifier Hash
                    </label>
                    <p className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded break-all">
                      {userClaimData.nullifierHash}
                    </p>
                  </div>
                </div>
              </div>

              {/* Claim Button */}
              <div className="text-center">
                <button
                  onClick={handleClaim}
                  disabled={isSubmitting}
                  className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Claiming...
                    </>
                  ) : (
                    'Claim Tokens'
                  )}
                </button>
                {claimError && (
                  <p className="mt-2 text-sm text-red-600">
                    Error: {claimError}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
