'use client';

import { createConfig, http } from 'wagmi';
import { sepolia, localhost } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

export const wagmiConfig = getDefaultConfig({
  appName: 'dGameBet',
  projectId: 'dgamebet-local',
  chains: [localhost, sepolia],
  transports: {
    [localhost.id]: http(),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_INFURA_SEPOLIA_URL),
  },
  ssr: true,
});
