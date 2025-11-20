'use client';

import { useEffect, useState } from 'react';
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { FOOTBALL_GAME_BET_ABI } from '@contracts/contracts';
import { parseEther } from 'viem';
import { notifyBetsChanged, onBetClosed, notifyBetClosed } from '@/lib/events';

interface PlaceBetFormProps {
  betAddress: `0x${string}`;
  stake: string;
  startTime: number;
}

export default function PlaceBetForm({
  betAddress,
  stake,
  startTime,
}: PlaceBetFormProps) {
  const { address } = useAccount();
  const [hasBet, setHasBet] = useState<boolean | null>(null);
  const [pendingTeam, setPendingTeam] = useState<'home' | 'away' | null>(null);

  const [bettingClosed, setBettingClosed] = useState(
    () => Date.now() >= startTime * 1000
  );

  const { writeContractAsync, data: hash, status, error } = useWriteContract();
  const { isLoading: isMining, isSuccess: isMined } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    const fetchUserBet = async () => {
      if (!address) return;
      try {
        const res = await fetch(
          `/api/user-bet?betAddress=${betAddress}&user=${address}`
        );
        if (!res.ok) throw new Error('Failed to read user bet');
        const data = await res.json();
        setHasBet(data.bet !== 0);
      } catch (e) {
        console.error('Error fetching user bet:', e);
        setHasBet(false);
      }
    };
    fetchUserBet();
  }, [address, betAddress]);

  useEffect(() => {
    if (isMined) {
      setPendingTeam(null);
      setHasBet(true);
      notifyBetsChanged();
    }
  }, [isMined]);

  useEffect(() => {
    if (bettingClosed) return;

    const msUntilStart = startTime * 1000 - Date.now();
    if (msUntilStart <= 0) {
      setBettingClosed(true);
      notifyBetClosed(betAddress);
      return;
    }

    const t = setTimeout(() => {
      setBettingClosed(true);
      notifyBetClosed(betAddress);
      notifyBetsChanged();
    }, msUntilStart);

    const off = onBetClosed((addr) => {
      if (addr.toLowerCase() === betAddress.toLowerCase()) {
        setBettingClosed(true);
      }
    });

    return () => {
      clearTimeout(t);
      off();
    };
  }, [bettingClosed, startTime, betAddress]);

  const disabled =
    status === 'pending' ||
    isMining ||
    hasBet === null ||
    hasBet ||
    bettingClosed;

  const placeBet = async (team: 'home' | 'away') => {
    try {
      setPendingTeam(team);
      await writeContractAsync({
        abi: FOOTBALL_GAME_BET_ABI,
        address: betAddress,
        functionName: team === 'home' ? 'betOnHomeTeam' : 'betOnAwayTeam',
        value: parseEther(stake),
      });
    } catch (err) {
      console.error(err);
      setPendingTeam(null);
      alert('❌ Failed to place bet. See console for details.');
    }
  };

  if (hasBet === null) {
    return (
      <p className="text-sm text-gray-400">Checking if you’ve already bet…</p>
    );
  }

  if (hasBet) {
    return (
      <p className="text-green-600 font-medium">✅ You’ve placed a bet.</p>
    );
  }

  if (bettingClosed) {
    return (
      <div className="text-sm text-red-400">
        ⏱ Betting is closed for this match.
      </div>
    );
  }

  return (
    <div className="flex gap-4 mt-2">
      <button
        disabled={disabled}
        onClick={() => placeBet('home')}
        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white rounded-xl disabled:opacity-60"
      >
        {pendingTeam === 'home' && (isMining || status === 'pending')
          ? 'Placing…'
          : 'Bet on Home'}
      </button>
      <button
        disabled={disabled}
        onClick={() => placeBet('away')}
        className="bg-red-600 hover:bg-red-700 px-4 py-2 text-white rounded-xl disabled:opacity-60"
      >
        {pendingTeam === 'away' && (isMining || status === 'pending')
          ? 'Placing…'
          : 'Bet on Away'}
      </button>
    </div>
  );
}
