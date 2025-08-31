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
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { data: ethBalance } = useBalance({ address: address });
  const { data: tokenBalance } = useBalance({
    address: address,
    token: tokenAddress as `0x${string}`,
  });

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="bg-black rounded-lg border border-white p-6 text-center">
              <h1 className="text-xl font-bold mb-4">📊 Dashboard</h1>
              <p className="text-white mb-4">Connect your wallet to view stats</p>
              <ConnectKitButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">📊 Dashboard</h1>
            <a 
              href="/" 
              className="bg-black border border-white text-white px-4 py-2 rounded-lg hover:bg-white hover:text-black transition-colors"
            >
              ← Home
            </a>
          </div>

          {/* Wallet Info */}
          <div className="bg-black border border-white rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">Connected Wallet</p>
                <p className="font-mono text-sm">{address}</p>
              </div>
              <ConnectKitButton />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            
            {/* Block Number */}
            <div className="bg-black border border-white rounded-lg p-4">
              <div className="text-center">
                <p className="text-2xl font-bold">#{blockNumber?.toString()}</p>
                <p className="text-sm text-gray-300">Current Block</p>
              </div>
            </div>

            {/* ETH Balance */}
            <div className="bg-black border border-white rounded-lg p-4">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {ethBalance ? parseFloat(formatEther(ethBalance.value)).toFixed(4) : '0.0000'}
                </p>
                <p className="text-sm text-gray-300">ETH Balance</p>
              </div>
            </div>

            {/* Token Balance */}
            <div className="bg-black border border-white rounded-lg p-4">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {tokenBalance ? parseFloat(formatEther(tokenBalance.value)).toFixed(0) : '0'}
                </p>
                <p className="text-sm text-gray-300">Project Tokens</p>
              </div>
            </div>
          </div>

          {/* Contract Addresses */}
          <div className="bg-black border border-white rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-3">Contract Addresses</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-300">Token (ZKAT):</span>
                <p className="font-mono text-xs break-all">{tokenAddress || 'Loading...'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-300">Verifier:</span>
                <p className="font-mono text-xs break-all">{verifierAddress || 'Loading...'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-300">Distributor:</span>
                <p className="font-mono text-xs break-all">{distributorAddress || 'Loading...'}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-black border border-white rounded-lg p-4">
            <h3 className="font-semibold mb-3">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <a 
                href="/calldata" 
                className="bg-black border border-white text-white px-4 py-2 rounded hover:bg-white hover:text-black text-center transition-colors"
              >
                🔐 Generate Calldata
              </a>
              <a 
                href="/claim" 
                className="bg-black border border-white text-white px-4 py-2 rounded hover:bg-white hover:text-black text-center transition-colors"
              >
                🎁 Claim Tokens
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}