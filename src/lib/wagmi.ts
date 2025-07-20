'use client';

import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

export const wagmiConfig = getDefaultConfig({
  appName: 'dGameBet',
  projectId: 'c0eff7080012dbe81000c487d96205eb',
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_INFURA_SEPOLIA_URL),
  },
  ssr: true,
});
