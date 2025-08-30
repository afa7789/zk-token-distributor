"use client";

import React from 'react';
import { WagmiProvider } from 'wagmi';
import { ConnectKitProvider } from 'connectkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import { ContractsProvider } from './ContractsProvider';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <ConnectKitProvider>
          <ContractsProvider>
            {children}
          </ContractsProvider>
        </ConnectKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
