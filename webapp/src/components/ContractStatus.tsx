'use client';

import { useContracts, useContractAddress } from '@/components/ContractsProvider';

export default function ContractStatus() {
  const { addresses, isLoading, error, reload } = useContracts();
  const distributorAddress = useContractAddress('distributor');

  if (isLoading) {
    return <div>Loading contract addresses...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error loading contracts: {error}
        <button onClick={reload} className="ml-2 text-blue-500">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3 className="text-lg font-semibold mb-2">Contract Addresses</h3>
      <div className="space-y-1 text-sm">
        <div>Verifier: {addresses?.verifier}</div>
        <div>Token: {addresses?.token}</div>
        <div>Distributor: {distributorAddress}</div>
      </div>
    </div>
  );
}
