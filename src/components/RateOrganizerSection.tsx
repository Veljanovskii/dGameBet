'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { GAME_BET_ABI, GAME_BET_ADDRESS } from '@contracts/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  betAddress: `0x${string}`;
  organiser: `0x${string}`;
};

export default function RateOrganizerSection({ betAddress, organiser }: Props) {
  const { address } = useAccount();

  const [canVote, setCanVote] = useState<boolean | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [rate, setRate] = useState('5');

  const { writeContract, data: txHash, status, error } = useWriteContract();
  const {
    isLoading: mining,
    isSuccess: mined,
  } = useWaitForTransactionReceipt({ hash: txHash });

  const client = useMemo(
    () =>
      createPublicClient({
        chain: sepolia,
        transport: http(process.env.NEXT_PUBLIC_INFURA_SEPOLIA_URL),
      }),
    []
  );

  // Check eligibility
  useEffect(() => {
    const check = async () => {
      if (!address) {
        setCanVote(null);
        return;
      }
      try {
        const ok = await client.readContract({
          address: GAME_BET_ADDRESS as `0x${string}`,
          abi: GAME_BET_ABI,
          functionName: 'canVote',
          args: [organiser, betAddress],
          account: address as `0x${string}`,
        });
        setCanVote(Boolean(ok));
        setReason(
          ok
            ? null
            : 'You may have already voted, not placed a bet, or the match hasn’t reached start time.'
        );
      } catch (e) {
        console.error('canVote read failed:', e);
        setCanVote(false);
        setReason('Failed to read canVote from chain.');
      }
    };
    check();
  }, [address, betAddress, organiser, client]);

  // After mining: hide the form and show “thanks”
  useEffect(() => {
    if (mined) {
      setCanVote(false);
      setReason(null);
    }
  }, [mined]);

  const submitVote = async () => {
    const r = parseInt(rate, 10);
    if (Number.isNaN(r) || r < 0 || r > 5) {
      alert('Rate must be 0–5');
      return;
    }
    try {
      writeContract({
        address: GAME_BET_ADDRESS as `0x${string}`,
        abi: GAME_BET_ABI,
        functionName: 'vote',
        args: [organiser, betAddress, r],
      });
    } catch (e) {
      console.error(e);
      alert('Failed to send vote transaction.');
    }
  };

  // Not connected
  if (!address) return null;

  // Still checking
  if (canVote === null) {
    return <p className="text-xs text-gray-400">Checking voting eligibility…</p>;
  }

  // Show “thanks” once mined
  if (mined) {
    return (
      <p className="text-xs text-green-600">
        ✅ Thanks for rating! Your vote has been recorded.
      </p>
    );
  }

  // Not eligible
  if (!canVote) {
    return (
      <p className="text-xs text-yellow-700">
        You can’t rate now. {reason ?? ''}
      </p>
    );
  }

  // Eligible: show the form
  return (
    <div className="mt-2 flex items-center gap-2">
      <Input
        type="number"
        min={0}
        max={5}
        value={rate}
        onChange={(e) => setRate(e.target.value)}
        className="w-20"
      />
      <Button
        onClick={submitVote}
        disabled={status === 'pending' || mining}
        variant="secondary"
      >
        {mining ? 'Submitting…' : 'Rate organiser'}
      </Button>
      {status === 'pending' && (
        <span className="text-xs text-gray-500">Waiting for signature…</span>
      )}
      {error && (
        <span className="text-xs text-red-600">Transaction failed.</span>
      )}
    </div>
  );
}
