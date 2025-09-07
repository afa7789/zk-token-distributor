"use client";

import React from 'react';
import Link from 'next/link';
import type { TransactionState } from '@/hooks/useClaimTokens';

interface TransactionStatusProps {
  transactionState: TransactionState;
  onClose?: () => void;
}

export default function TransactionStatus({ transactionState, onClose }: TransactionStatusProps) {
  const { hash, isSubmitting, isWaitingForConfirmation, isSuccess, error, receipt } = transactionState;

  if (!hash && !error && !isSubmitting) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Transaction Hash */}
      {hash && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-800 font-medium">📝 Transaction Submitted</p>
              <p className="text-blue-700 text-sm font-mono break-all">
                {hash}
              </p>
              <a
                href={`https://localhost:8545` /* This would be block explorer URL for real networks */}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                View on block explorer →
              </a>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-blue-500 hover:text-blue-700 text-lg"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Waiting for Confirmation */}
      {isWaitingForConfirmation && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin text-yellow-600">⏳</div>
            <div>
              <p className="text-yellow-800 font-medium">⏳ Waiting for Confirmation</p>
              <p className="text-yellow-700 text-sm">
                Your transaction is being processed by the network...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success */}
      {isSuccess && receipt && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-green-800 font-medium">🎉 Transaction Confirmed!</p>
              <p className="text-green-700 text-sm">
                Your claim has been successfully processed.
              </p>
              
              {/* Dashboard Link */}
              <div className="mt-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  📊 Go to Dashboard →
                </Link>
              </div>
              
              {/* Receipt Details */}
              <details className="mt-2">
                <summary className="cursor-pointer text-green-700 hover:text-green-900 text-sm">
                  📄 View transaction receipt
                </summary>
                <div className="mt-2 bg-gray-900 text-white p-3 rounded text-xs font-mono space-y-1">
                  <div><strong>Block Number:</strong> {receipt.blockNumber?.toString()}</div>
                  <div><strong>Gas Used:</strong> {receipt.gasUsed?.toString()}</div>
                  <div><strong>Status:</strong> {receipt.status === 'success' ? '✅ Success' : '❌ Failed'}</div>
                  {receipt.logs && receipt.logs.length > 0 && (
                    <div><strong>Events:</strong> {receipt.logs.length} event(s) emitted</div>
                  )}
                </div>
              </details>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-green-500 hover:text-green-700 text-lg ml-3"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-red-800 font-medium">❌ Transaction Failed</p>
              <p className="text-red-700 text-sm mt-1">
                {error}
              </p>
              
              {/* Common Solutions */}
              <div className="mt-3 text-red-700 text-sm">
                <p className="font-medium">💡 Common solutions:</p>
                <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                  <li>If &ldquo;nullifier already used&rdquo;: Restart Anvil to reset the blockchain state</li>
                  <li>If &ldquo;proof verification failed&rdquo;: Regenerate your calldata</li>
                  <li>If &ldquo;claim period&rdquo;: Check the claim period is active</li>
                  <li>Try refreshing the page and reconnecting your wallet</li>
                </ul>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-red-500 hover:text-red-700 text-lg ml-3"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Submitting State */}
      {isSubmitting && !hash && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin text-blue-600">⏳</div>
            <div>
              <p className="text-blue-800 font-medium">📝 Preparing Transaction</p>
              <p className="text-blue-700 text-sm">
                Please sign the transaction in your wallet...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
