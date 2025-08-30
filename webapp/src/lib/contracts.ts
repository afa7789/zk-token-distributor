import type { ContractAddresses } from '@/types/api';
import fs from 'fs';
import path from 'path';

// Default addresses for localhost/development
const DEFAULT_ADDRESSES: ContractAddresses = {
  verifier: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
  token: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
  distributor: '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0',
};

interface BroadcastTransaction {
  contractName: string;
  contractAddress: string;
  transactionType: string;
}

interface BroadcastData {
  transactions: BroadcastTransaction[];
}

export async function loadContractAddresses(chainId: number = 31337): Promise<ContractAddresses> {
  try {
    // For localhost (31337), try to load from broadcast files
    if (chainId === 31337) {
      const broadcastPath = path.join(
        process.cwd(),
        '../broadcast/Deployer.s.sol/31337/run-latest.json'
      );

      if (fs.existsSync(broadcastPath)) {
        const broadcastData: BroadcastData = JSON.parse(
          fs.readFileSync(broadcastPath, 'utf-8')
        );

        const addresses: Partial<ContractAddresses> = {};

        for (const tx of broadcastData.transactions) {
          if (tx.transactionType === 'CREATE') {
            switch (tx.contractName) {
              case 'VerifierZK':
                addresses.verifier = tx.contractAddress;
                break;
              case 'ZKAirDroppedToken':
                addresses.token = tx.contractAddress;
                break;
              case 'ZKTokenDistributor':
                addresses.distributor = tx.contractAddress;
                break;
            }
          }
        }

        // Return loaded addresses, fallback to defaults for missing ones
        return {
          verifier: addresses.verifier || DEFAULT_ADDRESSES.verifier,
          token: addresses.token || DEFAULT_ADDRESSES.token,
          distributor: addresses.distributor || DEFAULT_ADDRESSES.distributor,
        };
      }
    }

    // For other networks, use environment variables or defaults
    return {
      verifier: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS || DEFAULT_ADDRESSES.verifier,
      token: process.env.NEXT_PUBLIC_TOKEN_ADDRESS || DEFAULT_ADDRESSES.token,
      distributor: process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS || DEFAULT_ADDRESSES.distributor,
    };
  } catch (error) {
    console.warn('Failed to load contract addresses from broadcast, using defaults:', error);
    return DEFAULT_ADDRESSES;
  }
}

// Client-side function to fetch addresses from API
export async function fetchContractAddresses(chainId: number = 31337): Promise<ContractAddresses> {
  try {
    const response = await fetch(`/api/contracts?chainId=${chainId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch contract addresses');
    }
    const data = await response.json();
    return data.addresses || DEFAULT_ADDRESSES;
  } catch (error) {
    console.warn('Failed to fetch contract addresses, using defaults:', error);
    return DEFAULT_ADDRESSES;
  }
}
