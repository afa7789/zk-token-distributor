'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useBlockNumber, useBalance } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { formatEther } from 'viem';
import { useContractAddress } from '@/components/ContractsProvider';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const tokenAddress = useContractAddress('token');
  const verifierAddress = useContractAddress('verifier');
  const distributorAddress = useContractAddress('distributor');
  const { data: blockNumber, isLoading: blockLoading, error: blockError } = useBlockNumber({
    watch: true, // This will auto-update
  });

  // Get ETH balance
  const { data: ethBalance, isLoading: ethLoading } = useBalance({
    address: address,
  });

  // Get token balance using the deployed contract address
  const { data: tokenBalance, isLoading: tokenLoading } = useBalance({
    address: address,
    token: tokenAddress as `0x${string}`,
  });

  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Update timestamp when block changes
  useEffect(() => {
    if (blockNumber) {
      setLastUpdate(new Date());
    }
  }, [blockNumber]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-black rounded-lg border border-white p-6">
              <h1 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
                📊 Wallet Dashboard
              </h1>
              <p className="text-white mb-6">
                View your wallet information, block number, and token balances
              </p>
              <div className="bg-black border border-white rounded-lg p-4">
                <p className="text-white mb-4">
                  🔗 Please connect your wallet to view dashboard information.
                </p>
                <div className="flex justify-center">
                  <ConnectKitButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-black rounded-lg shadow-2xl border border-black p-6">
            <h1 className="text-2xl font-bold mb-2 flex items-center gap-2 text-white">
              📊 Wallet Dashboard
            </h1>
            <p className="text-white mb-6">
              Real-time blockchain and wallet information
            </p>

            {/* Wallet Connection Status */}
            <div className="bg-black border border-black rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">
                    ✅ Wallet Connected
                  </p>
                  <p className="text-white text-sm font-mono">
                    {address}
                  </p>
                </div>
                <ConnectKitButton />
              </div>
            </div>            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              
                            {/* Block Number Card */}
              <div className="bg-black border border-black rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🔗</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Block Number</h3>
                    <p className="text-sm text-white">Current blockchain block</p>
                  </div>
                </div>
                
                {blockLoading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-black rounded mb-2"></div>
                    <div className="h-4 bg-black rounded w-2/3"></div>
                  </div>
                ) : blockError ? (
                  <div className="text-white">
                    <p className="text-lg font-bold">Error</p>
                    <p className="text-sm">Failed to load block</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-white">
                      #{blockNumber?.toString()}
                    </p>
                    <p className="text-xs text-white mt-1">
                      Updated: {lastUpdate.toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>

              {/* ETH Balance Card */}
              <div className="bg-black border border-black rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">💎</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">ETH Balance</h3>
                    <p className="text-sm text-white">Native token balance</p>
                  </div>
                </div>
                
                {ethLoading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-black rounded mb-2"></div>
                    <div className="h-4 bg-black rounded w-2/3"></div>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {ethBalance ? parseFloat(formatEther(ethBalance.value)).toFixed(4) : '0.0000'}
                    </p>
                    <p className="text-sm text-white">
                      {ethBalance?.symbol || 'ETH'}
                    </p>
                  </div>
                )}
              </div>

              {/* Token Balance Card */}
              <div className="bg-black border border-black rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🎁</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Project Tokens</h3>
                    <p className="text-sm text-white">Airdrop token balance</p>
                  </div>
                </div>
                
                {tokenLoading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-black rounded mb-2"></div>
                    <div className="h-4 bg-black rounded w-2/3"></div>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {tokenBalance ? parseFloat(formatEther(tokenBalance.value)).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-sm text-white">
                      {tokenBalance?.symbol || 'TOKENS'}
                    </p>
                  </div>
                )}
              </div>

              {/* ETH Balance Card */}
              <div className="bg-black border border-white rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-black border border-white rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">💎</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">ETH Balance</h3>
                    <p className="text-sm text-white">Native token balance</p>
                  </div>
                </div>
                
                {ethLoading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-black border border-white rounded mb-2"></div>
                    <div className="h-4 bg-black border border-white rounded w-2/3"></div>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {ethBalance ? parseFloat(formatEther(ethBalance.value)).toFixed(4) : '0.0000'}
                    </p>
                    <p className="text-sm text-white">
                      {ethBalance?.symbol || 'ETH'}
                    </p>
                  </div>
                )}
              </div>

              {/* Token Balance Card */}
              <div className="bg-black border border-white rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-black border border-white rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🎁</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Project Tokens</h3>
                    <p className="text-sm text-white">Airdrop token balance</p>
                  </div>
                </div>
                
                {tokenLoading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-black border border-white rounded mb-2"></div>
                    <div className="h-4 bg-black border border-white rounded w-2/3"></div>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {tokenBalance ? parseFloat(formatEther(tokenBalance.value)).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-sm text-white">
                      {tokenBalance?.symbol || 'TOKENS'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              
              {/* Contract Addresses */}
              <div className="bg-black border border-black rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  📋 Contract Addresses
                </h3>
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-white text-sm">Token Contract (ZKAT):</span>
                    <span className="font-mono text-xs text-white bg-black px-2 py-1 rounded break-all">
                      {tokenAddress || 'Loading...'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-white text-sm">Verifier Contract:</span>
                    <span className="font-mono text-xs text-white bg-black px-2 py-1 rounded break-all">
                      {verifierAddress || 'Loading...'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-white text-sm">Distributor Contract:</span>
                    <span className="font-mono text-xs text-white bg-black px-2 py-1 rounded break-all">
                      {distributorAddress || 'Loading...'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Network Information */}
              <div className="bg-black border border-black rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  🌐 Network Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white">Chain ID:</span>
                    <span className="font-mono text-white">31337</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white">Network:</span>
                    <span className="text-white">Local Development</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white">Block Explorer:</span>
                    <span className="text-white">N/A (Local)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Quick Actions */}
              <div className="bg-black border border-white rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  ⚡ Quick Actions
                </h3>
                <div className="space-y-3">
                  <a 
                    href="/calldata" 
                    className="block w-full bg-black border border-white text-white px-4 py-2 rounded-lg hover:bg-white hover:text-black text-center transition-colors"
                  >
                    🔐 Generate Calldata
                  </a>
                  <a 
                    href="/claim" 
                    className="block w-full bg-black border border-white text-white px-4 py-2 rounded-lg hover:bg-white hover:text-black text-center transition-colors"
                  >
                    🎁 Claim Tokens
                  </a>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="block w-full bg-black border border-white text-white px-4 py-2 rounded-lg hover:bg-white hover:text-black text-center transition-colors"
                  >
                    🔄 Refresh Data
                  </button>
                </div>
              </div>

              {/* Contract Actions */}
              <div className="bg-black border border-white rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  🔧 Contract Utils
                </h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => navigator.clipboard.writeText(tokenAddress || '')}
                    className="block w-full bg-black border border-white text-white px-4 py-2 rounded-lg hover:bg-white hover:text-black text-center transition-colors text-sm"
                    disabled={!tokenAddress}
                  >
                    📋 Copy Token Address
                  </button>
                  <button 
                    onClick={() => navigator.clipboard.writeText(verifierAddress || '')}
                    className="block w-full bg-black border border-white text-white px-4 py-2 rounded-lg hover:bg-white hover:text-black text-center transition-colors text-sm"
                    disabled={!verifierAddress}
                  >
                    📋 Copy Verifier Address
                  </button>
                  <button 
                    onClick={() => navigator.clipboard.writeText(distributorAddress || '')}
                    className="block w-full bg-black border border-white text-white px-4 py-2 rounded-lg hover:bg-white hover:text-black text-center transition-colors text-sm"
                    disabled={!distributorAddress}
                  >
                    📋 Copy Distributor Address
                  </button>
                </div>
              </div>
            </div>

            {/* Auto-refresh notice */}
            <div className="mt-6 bg-black border border-gray-700 rounded-lg p-4">
              <p className="text-gray-300 text-sm">
                ℹ️ <strong>Auto-refresh:</strong> Block number updates automatically. Token balances refresh when you reload the page or perform transactions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
