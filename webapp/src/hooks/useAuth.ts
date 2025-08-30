import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import SIWEUtils from '@/lib/siwe';
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
      const nonceResp = await fetch('/api/auth/nonce');
      if (!nonceResp.ok) throw new Error('Failed to fetch nonce');
      const { data } = await nonceResp.json();
      const nonce = data?.nonce;

      // Create SIWE message object and prepared string
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to ZK Token Distributor',
        uri: window.location.origin,
        version: '1',
        chainId: 31337,
        nonce,
        issuedAt: new Date().toISOString(),
      });

      const messageString = message.prepareMessage();

      // Sign the message string
      const signature = await signMessageAsync({ message: messageString });

      // Verify the signature via server
      const verification = await SIWEUtils.verifyMessage(messageString, signature);

      if (verification.success) {
        connectStore(address);
        setAuthenticated(signature);
        return { success: true, token: signature };
      }
      throw new Error('SIWE verification failed');
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

export default useAuth;
