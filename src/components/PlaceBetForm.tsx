'use client';

import { useState } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { FOOTBALL_GAME_BET_ABI } from '@contracts/contracts';
import { parseEther } from 'viem';

interface PlaceBetFormProps {
  betAddress: `0x${string}`;
  stake: string;
  startTime: number;
  userHasAlreadyBet: boolean;
}

export default function PlaceBetForm({ betAddress, stake, startTime, userHasAlreadyBet }: PlaceBetFormProps) {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const { writeContractAsync } = useWriteContract();

  const placeBet = async (team: 'home' | 'away') => {
    try {
      setLoading(true);
      const functionName = team === 'home' ? 'betOnHomeTeam' : 'betOnAwayTeam';

      await writeContractAsync({
        abi: FOOTBALL_GAME_BET_ABI,
        address: betAddress,
        functionName,
        value: parseEther(stake),
      });

      alert(`Successfully placed bet on ${team === 'home' ? 'Home' : 'Away'} team!`);
    } catch (err) {
      console.error(err);
      alert('❌ Failed to place bet. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  const gameHasStarted = Date.now() >= startTime * 1000;

  if (userHasAlreadyBet) {
    return <div className="text-sm text-green-400">✅ You have already placed a bet.</div>;
  }

  if (gameHasStarted) {
    return <div className="text-sm text-red-400">⏱ Betting is closed for this match (game has started).</div>;
  }

  return (
    <div className="flex gap-4 mt-2">
      <button
        disabled={loading}
        onClick={() => placeBet('home')}
        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white rounded-xl"
      >
        Bet on Home
      </button>
      <button
        disabled={loading}
        onClick={() => placeBet('away')}
        className="bg-red-600 hover:bg-red-700 px-4 py-2 text-white rounded-xl"
      >
        Bet on Away
      </button>
    </div>
  );
}
