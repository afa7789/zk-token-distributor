"use client";

import ClaimPanel from '@/components/ClaimPanel';
import NetworkSwitcher from '@/components/NetworkSwitcher';

export default function ClaimPage() {
  return (
    <div className="min-h-screen py-6 px-4">
      <main className="max-w-4xl mx-auto">
        <div className="mb-4">
          <NetworkSwitcher />
        </div>
        <ClaimPanel />
      </main>
    </div>
  );
}
