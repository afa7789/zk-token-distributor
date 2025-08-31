"use client";

import StyledConnectKitButton from "@/components/StyledConnectKitButton";
import NetworkSwitcher from "@/components/NetworkSwitcher";
import { useAccount } from "wagmi";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import CalldataPage from "./calldata/page";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { isAuthenticated, signIn } = useAuth();

  return (
    <div className="min-h-screen py-6 px-4">
      <header className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <h1 className="text-lg font-semibold">ZK Token Distributor</h1>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-700">Dashboard</Link>
          <Link href="/about" className="text-sm text-gray-700">About</Link>
          <Link href="/claim" className="text-sm text-gray-700">Claim</Link>
          <StyledConnectKitButton />
        </nav>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="mb-4">
          <NetworkSwitcher />
        </div>
        <section className="mb-6">
          <h2 className="text-2xl font-medium">Welcome</h2>
          <p className="text-sm text-gray-700">Private token distribution demo — sign in to see your calldata.</p>
        </section>

        <section className="mb-6">
          <div>
            <p className="text-sm">Wallet connected: {isConnected ? 'Yes' : 'No'}</p>
            {address && <p className="text-sm">Address: <span className="font-mono">{address}</span></p>}
            <p className="text-sm">Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
          </div>
        </section>

        {!isAuthenticated && isConnected && (
          <section className="mb-6">
            <p className="text-sm text-gray-700 mb-2">Sign a message to authenticate and access your calldata.</p>
            <button
              onClick={signIn}
              className="btn-neutral px-3 py-2"
            >
              Sign In
            </button>
          </section>
        )}

        {isAuthenticated ? (
          <section>
            {/* Show Calldata inline after SIWE */}
            <CalldataPage />
          </section>
        ) : (
          <section>
            <p className="text-sm text-gray-600">Please sign in to view and download your calldata.</p>
          </section>
        )}
      </main>
    </div>
  );
}
