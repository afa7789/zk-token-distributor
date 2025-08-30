"use client";

import React from "react";
import { useChainId, useSwitchChain, useAccount } from "wagmi";

const ANVIL_CHAIN_ID = 31337;
const ANVIL_CHAIN_HEX = "0x7A69"; // 31337 in hex

const ANVIL_CHAIN_PARAMS = {
  chainId: ANVIL_CHAIN_HEX,
  chainName: "Anvil Localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["http://127.0.0.1:8545"],
  blockExplorerUrls: [],
};

export default function NetworkSwitcher() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChain } = useSwitchChain();

  const onSwitch = async () => {
    if (!isConnected) return;

    // Try wagmi switchChain first
    if (switchChain) {
      try {
        switchChain({ chainId: ANVIL_CHAIN_ID });
        return;
      } catch {
        // fallback to provider method
      }
    }

    // Fallback: ask the wallet to add the Anvil chain (EIP-3085)
    try {
  const provider = (window as unknown as { ethereum?: { request?: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown> } }).ethereum;
  if (!provider?.request) throw new Error("No injected provider found");

      await provider.request({
        method: "wallet_addEthereumChain",
        params: [ANVIL_CHAIN_PARAMS],
      });

      // Try switching after adding
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: ANVIL_CHAIN_HEX }],
        });
      } catch {
        // user may need to switch manually
      }
    } catch (err) {
      console.error("Failed to add/switch chain:", err);
    }
  };

  if (chainId === ANVIL_CHAIN_ID) return null;

  if (!isConnected) {
    return (
      <div className="text-sm text-yellow-700">
        Conecte a carteira para trocar para a rede local.
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 flex items-center gap-4">
      <div className="flex-1 text-sm">
        Você está na rede <strong>{chainId || "desconhecida"}</strong>. Para usar a
        app local, troque para <strong>Anvil (localhost)</strong>.
      </div>
      <div>
        <button
          onClick={onSwitch}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
        >
          Switch to Anvil
        </button>
      </div>
    </div>
  );
}
