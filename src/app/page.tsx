'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

export default function Home() {
  const { address, isConnected } = useAccount();

  return (
    <main className="p-6">
      <ConnectButton />
      {isConnected && (
        <div className="mt-4 text-white">
          Connected as: {address}
        </div>
      )}
    </main>
  );
}
