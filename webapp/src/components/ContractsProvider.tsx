'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useChainId } from 'wagmi';
import type { ContractAddresses } from '@/types/api';
import { fetchContractAddresses } from '@/lib/contracts';

interface ContractsContextType {
  addresses: ContractAddresses | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const ContractsContext = createContext<ContractsContextType | undefined>(undefined);

export function ContractsProvider({ children }: { children: React.ReactNode }) {
  const [addresses, setAddresses] = useState<ContractAddresses | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chainId = useChainId();

  const loadAddresses = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const contractAddresses = await fetchContractAddresses(chainId);
      setAddresses(contractAddresses);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load contract addresses';
      setError(errorMessage);
      console.error('ContractsProvider error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [chainId]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const value: ContractsContextType = {
    addresses,
    isLoading,
    error,
    reload: loadAddresses,
  };

  return (
    <ContractsContext.Provider value={value}>
      {children}
    </ContractsContext.Provider>
  );
}

export function useContracts() {
  const context = useContext(ContractsContext);
  if (context === undefined) {
    throw new Error('useContracts must be used within a ContractsProvider');
  }
  return context;
}

// Hook to get specific contract address
export function useContractAddress(contract: keyof ContractAddresses) {
  const { addresses } = useContracts();
  return addresses?.[contract] || null;
}
