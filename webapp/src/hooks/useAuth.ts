import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { SiweMessage } from 'siwe';

export const useAuth = () => {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  const {
    isAuthenticated,
    sessionToken,
    connect: connectStore,
    disconnect: disconnectStore,
    setAuthenticated,
    clearAuthentication,
  } = useAuthStore();

  const signIn = useCallback(async () => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      // Get nonce from server
      const nonceResponse = await fetch('/api/auth/nonce');
      if (!nonceResponse.ok) {
        throw new Error('Failed to get nonce');
      }
      const { nonce } = await nonceResponse.json();

      // Create SIWE message with all required fields
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum to the ZK Token Distributor.',
        uri: window.location.origin,
        version: '1',
        chainId: 31337, // Anvil chain ID
        nonce,
        issuedAt: new Date().toISOString(),
        // Add expiration time (24 hours from now)
        expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        // Add not before time (current time)
        notBefore: new Date().toISOString(),
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
        // Update auth store with the token from server
        connectStore(address);
        setAuthenticated(result.data.token);
        return { success: true, token: result.data.token };
      } else {
        throw new Error(result.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }, [address, isConnected, signMessageAsync, connectStore, setAuthenticated]);

  const signOut = useCallback(() => {
    disconnect();
    disconnectStore();
    clearAuthentication();
  }, [disconnect, disconnectStore, clearAuthentication]);

  return {
    address,
    isConnected,
    isAuthenticated,
    sessionToken,
    signIn,
    signOut,
  };
};