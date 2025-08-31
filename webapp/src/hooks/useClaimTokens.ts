import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { ZKTokenDistributor__factory } from '@/types';
import { ClaimData } from '@/types/api';
import { useContractAddress } from '@/components/ContractsProvider';

export const useClaimTokens = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();
  const distributorAddress = useContractAddress('distributor');

  const { data: hash, writeContract, isPending } = useWriteContract();

  const { isLoading: isTransactionLoading, isSuccess } = useWaitForTransactionReceipt({
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

    setIsSubmitting(true);
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
      const errorMessage = err instanceof Error ? err.message : 'Claim failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
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

  return {
    submitClaim,
    validateProofFile,
    isSubmitting: isSubmitting || isPending || isTransactionLoading,
    isSuccess,
    error,
    transactionHash: hash,
    clearError: () => setError(null),
  };
};

export default useClaimTokens;
