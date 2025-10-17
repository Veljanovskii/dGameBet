'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import CreateBetForm from '../components/CreateBetForm';
import BetList from '@/components/BetList';

export default function Home() {
  const { address, isConnected } = useAccount();

  return (
    <main className="p-6 space-y-6">
      <ConnectButton />

      {isConnected && (
        <>
          <div className="mt-4 text-white">
            Connected as: <span className="font-mono">{address}</span>
          </div>
          <div className="mt-6">
            <CreateBetForm />
            <BetList />
          </div>
        </>
      )}
    </main>
  );
}
