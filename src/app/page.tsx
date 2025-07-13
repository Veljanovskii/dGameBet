'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import CreateBetForm from '../components/CreateBetForm';

export default function Home() {
  const { address, isConnected } = useAccount();

  return (
    <main className="p-6 space-y-6">
      <ConnectButton />

      {isConnected && (
        <>
          <div className="text-white">
            Connected as: <span className="font-mono">{address}</span>
          </div>

          <CreateBetForm />
        </>
      )}
    </main>
  );
}
