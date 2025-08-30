import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import SIWEUtils from '@/lib/siwe';

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
      // Generate nonce
      const nonce = SIWEUtils.generateNonce();

      // Create SIWE message
      const message = SIWEUtils.createMessage(
        address,
        1, // mainnet
        nonce
      );

      // Sign the message
      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      // Verify the signature
      const verification = await SIWEUtils.verifyMessage(message, signature);

      if (verification.success) {
        // Store authentication state
        connectStore(address);
        setAuthenticated(signature); // Using signature as token for demo

        return { success: true, token: signature };
      } else {
        throw new Error('SIWE verification failed');
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

export default useAuth;
