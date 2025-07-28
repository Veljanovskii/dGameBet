'use client';

import { useEffect, useState } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { FOOTBALL_GAME_BET_ABI, GAME_BET_ABI } from '@contracts/contracts';
import { parseEther } from 'viem';

interface PlaceBetFormProps {
  betAddress: `0x${string}`;
  stake: string;
  startTime: number;
}

export default function PlaceBetForm({ betAddress, stake, startTime }: PlaceBetFormProps) {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [hasBet, setHasBet] = useState<boolean | null>(null);
  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    const fetchUserBet = async () => {
      if (!address) return;

      try {
        const res = await fetch(`/api/user-bet?betAddress=${betAddress}&user=${address}`);
        const data = await res.json();
        setHasBet(data.bet !== 0);
      } catch (err) {
        console.error('Error fetching user bet:', err);
        setHasBet(false); // fallback
      }
    };

    fetchUserBet();
  }, [address, betAddress]);

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
      setHasBet(true);
    } catch (err) {
      console.error(err);
      alert('❌ Failed to place bet. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (hasBet === null) {
    return <p className="text-sm text-gray-400">Checking if you’ve already bet...</p>;
  }

  if (hasBet) {
    return <p className="text-green-600 font-medium">✅ You've already placed a bet.</p>;
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
