import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { ZKTokenDistributor__factory } from '@/types';
import { ClaimData } from '@/types/api';
import { useContractAddress } from '@/components/ContractsProvider';
import { formatTransactionError } from '@/lib/errorDecoder';
import type { TransactionReceipt } from 'viem';

export interface TransactionState {
  hash?: `0x${string}`;
  isSubmitting: boolean;
  isPending: boolean;
  isWaitingForConfirmation: boolean;
  isSuccess: boolean;
  error: string | null;
  receipt?: TransactionReceipt;
}

export const useClaimTokens = () => {
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();
  const distributorAddress = useContractAddress('distributor');

  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();

  const { 
    data: receipt, 
    isLoading: isWaitingForConfirmation, 
    isSuccess,
    error: receiptError 
  } = useWaitForTransactionReceipt({
    hash,
  });

  const submitClaim = useCallback(async (claimData: ClaimData) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    if (!distributorAddress) {
      throw new Error('Distributor contract address not available');
    }

    if (!writeContract) {
      throw new Error('Contract write function not available');
    }

    setError(null);

    try {
      // Prepare contract arguments - convert strings to bigints
      const args = [
        [BigInt(claimData.proof.a[0]), BigInt(claimData.proof.a[1])],
        [[BigInt(claimData.proof.b[0][0]), BigInt(claimData.proof.b[0][1])], [BigInt(claimData.proof.b[1][0]), BigInt(claimData.proof.b[1][1])]],
        [BigInt(claimData.proof.c[0]), BigInt(claimData.proof.c[1])],
        [BigInt(claimData.publicSignals[0])],
        BigInt(claimData.amount),
      ] as const;

      writeContract({
        address: distributorAddress as `0x${string}`,
        abi: ZKTokenDistributor__factory.abi,
        functionName: 'claim',
        args,
      });

    } catch (err) {
      const errorMessage = formatTransactionError(err);
      setError(errorMessage);
      throw err;
    }
  }, [address, distributorAddress, writeContract]);

  const validateProofFile = useCallback((fileContent: string): ClaimData | null => {
    try {
      const data = JSON.parse(fileContent);

      // Validate required fields
      if (!data.proof || !data.publicSignals || !data.amount) {
        throw new Error('Invalid proof file format');
      }

      if (!data.proof.a || !data.proof.b || !data.proof.c) {
        throw new Error('Invalid proof structure');
      }

      return {
        proof: {
          a: data.proof.a,
          b: data.proof.b,
          c: data.proof.c,
        },
        publicSignals: data.publicSignals,
        amount: data.amount,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid proof file');
      return null;
    }
  }, []);

  // Aggregate all errors
  const currentError = error || 
    (writeError ? formatTransactionError(writeError) : null) || 
    (receiptError ? formatTransactionError(receiptError) : null);

  const transactionState: TransactionState = {
    hash,
    isSubmitting: isPending,
    isPending,
    isWaitingForConfirmation,
    isSuccess,
    error: currentError,
    receipt,
  };

  return {
    submitClaim,
    validateProofFile,
    transactionState,
    clearError: () => setError(null),
    
    // Legacy props for backwards compatibility
    isSubmitting: isPending || isWaitingForConfirmation,
    isSuccess,
    error: currentError,
    transactionHash: hash,
  };
};

export default useClaimTokens;
