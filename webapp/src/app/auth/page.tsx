'use client';

import Link from 'next/link';
import { useAccount, useSignMessage } from 'wagmi';
import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';
import { ConnectKitButton } from 'connectkit';
import { SiweMessage } from 'siwe';
import { useRouter } from 'next/navigation';

export default function Auth() {
  const { address, isConnected } = useAccount();
  const { setAuthenticated } = useAuthStore();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();

  const handleAuthenticate = async () => {
    if (!address || !isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      // Get nonce from server
      const nonceResponse = await fetch('/api/auth/nonce');
      if (!nonceResponse.ok) {
        throw new Error('Failed to get nonce');
      }
      const { nonce } = await nonceResponse.json();

      // Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum to the ZK Token Distributor.',
        uri: window.location.origin,
        version: '1',
        chainId: 31337, // Anvil chain ID
        nonce,
        issuedAt: new Date().toISOString(),
      });

      const messageString = message.prepareMessage();

      // Sign the message
      const signature = await signMessageAsync({
        message: messageString,
      });

      // Verify with server
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageString,
          signature,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Authentication failed');
      }

      const result = await verifyResponse.json();
      
      if (result.success) {
        // Update auth store
        setAuthenticated(result.data.token);
        
        // Redirect to claim page
        router.push('/claim');
      } else {
        throw new Error(result.error || 'Authentication failed');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
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
              Authenticate with Ethereum
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Sign a message to prove ownership of your Ethereum address
            </p>
          </div>

          {/* Authentication Card */}
          <div className="max-w-md mx-auto bg-white shadow rounded-lg p-6">
            {!isConnected ? (
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Connect Your Wallet
                </h3>
                <p className="text-gray-600 mb-6">
                  First, connect your Ethereum wallet to continue
                </p>
                <ConnectKitButton />
              </div>
            ) : (
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Sign In with Ethereum
                </h3>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Connected Address:</p>
                  <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                    {address}
                  </p>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleAuthenticate}
                  disabled={isAuthenticating}
                  className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                    isAuthenticating
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isAuthenticating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Authenticating...
                    </>
                  ) : (
                    'Sign Message'
                  )}
                </button>

                <p className="mt-3 text-xs text-gray-500">
                  This will prompt you to sign a message with your wallet. No gas fees required.
                </p>
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                🔒 Security Notice
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your claim data is private and only accessible to your authenticated address</li>
                <li>• Authentication is required to access token claim information</li>
                <li>• No one else can view your claimable token amounts</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
