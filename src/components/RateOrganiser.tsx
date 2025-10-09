'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { GAME_BET_ABI, GAME_BET_ADDRESS, FOOTBALL_GAME_BET_ABI } from '@contracts/contracts';
import { Button } from '@/components/ui/button';
import { notifyBetsChanged } from '@/lib/events';

type Props = {
  organiser: `0x${string}`;
  betAddress: `0x${string}`;
};

export default function RateOrganiser({ organiser, betAddress }: Props) {
  const { address } = useAccount();
  const [rate, setRate] = useState<number>(0);

  const { data: canVote, refetch: refetchCanVote, isLoading: loadingCanVote } = useReadContract({
    address: GAME_BET_ADDRESS,
    abi: GAME_BET_ABI,
    functionName: 'canVote',
    args: [organiser, betAddress],
    query: { enabled: Boolean(address) },
  });

  const { data: organiserOfBet } = useReadContract({
    address: betAddress,
    abi: FOOTBALL_GAME_BET_ABI,
    functionName: 'organiser',
  });

  const { data: startTime } = useReadContract({
    address: betAddress,
    abi: FOOTBALL_GAME_BET_ABI,
    functionName: 'startTime',
  });

  const { data: myBetRaw } = useReadContract({
    address: betAddress,
    abi: FOOTBALL_GAME_BET_ABI,
    functionName: 'bets',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: Boolean(address) },
  });

  const myBet = Number((myBetRaw as bigint | undefined) ?? 0n); // 0, 1, or 2
  const gameStarted = useMemo(
    () => (typeof startTime === 'bigint' ? Date.now() >= Number(startTime) * 1000 : false),
    [startTime]
  );

  const { writeContract, data: hash, status, error } = useWriteContract();
  const { isLoading: isMining, isSuccess: isMined } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isMined) {
      refetchCanVote();
      notifyBetsChanged();
    }
  }, [isMined, refetchCanVote]);

  const disabled = !address || canVote !== true || status === 'pending' || isMining;

  const whyNot = useMemo(() => {
    if (!address) return 'Connect a wallet to vote.';
    if (loadingCanVote) return 'Checking eligibility…';
    if (organiserOfBet && organiser.toLowerCase() !== (organiserOfBet as string).toLowerCase()) {
      return 'This organiser address doesn’t match the bet’s organiser.';
    }
    if (!gameStarted) return 'Voting opens after the game starts.';
    if (myBet === 0) return 'You can only rate if you placed a bet on this match.';
    if (canVote === false) return 'You may have already voted for this organiser on this match.';
    return null;
  }, [address, loadingCanVote, organiser, organiserOfBet, gameStarted, myBet, canVote]);

  if (canVote !== true) {
    return whyNot ? <p className="text-xs text-gray-500">{whyNot}</p> : null;
  }

  const submit = () => {
    if (rate < 0 || rate > 5) return alert('Pick a rating 0–5.');
    writeContract({
      address: GAME_BET_ADDRESS,
      abi: GAME_BET_ABI,
      functionName: 'vote',
      args: [organiser, betAddress, rate],
    });
  };

  return (
    <div className="mt-2 p-3 rounded-lg border">
      <p className="text-sm mb-2">Rate the organiser (0–5):</p>
      <div className="flex items-center gap-2">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <Button
            key={n}
            variant={n === rate ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRate(n)}
            disabled={disabled}
            className="px-3"
          >
            {n}
          </Button>
        ))}
        <Button onClick={submit} disabled={disabled || rate < 0} className="ml-2">
          {status === 'pending' || isMining ? 'Submitting…' : 'Submit'}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2 break-all">{String((error as any)?.message ?? error)}</p>}
      {isMined && <p className="text-xs text-green-600 mt-2">Thanks! Your vote was recorded.</p>}
    </div>
  );
}
