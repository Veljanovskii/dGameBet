'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { FOOTBALL_GAME_BET_ABI, MARKETS_BET_ABI } from '@contracts/contracts';
import { parseEther, zeroAddress } from 'viem';
import { notifyBetsChanged } from '@/lib/events';
import { Button } from '@/components/ui/button';

type Props = {
  betAddress: `0x${string}`;
  stake: string;
  startTime: number;
};

export default function MarketsSection({ betAddress, stake, startTime }: Props) {
  const { address: userAddress } = useAccount();
  const [pending, setPending] = useState<null | 'UG_0_2' | 'UG_3_PLUS' | 'GG'>(null);

  // 1) Read per-match MarketsBet address from FootballGameBet
  const {
    data: marketsAddressData,
    isLoading: loadingMarketsAddr,
  } = useReadContract({
    address: betAddress,
    abi: FOOTBALL_GAME_BET_ABI,
    functionName: 'markets',
  });

  const marketsAddress = useMemo(
    () => ((marketsAddressData as `0x${string}` | undefined) ?? zeroAddress),
    [marketsAddressData]
  );

  const marketsAvailable =
    !!marketsAddress && marketsAddress !== zeroAddress;

  // 2) Check if the current user already bet each market
  // Only enable these reads if we have a user and a valid markets address
  const enabledHasBet = !!userAddress && marketsAvailable;

  const { data: ug02Has, refetch: refUG02 } = useReadContract({
    address: marketsAddress,
    abi: MARKETS_BET_ABI,
    functionName: 'hasBet',
    args: [0, (userAddress ?? zeroAddress) as `0x${string}`],
    query: { enabled: enabledHasBet },
  });

  const { data: ug3pHas, refetch: refUG3P } = useReadContract({
    address: marketsAddress,
    abi: MARKETS_BET_ABI,
    functionName: 'hasBet',
    args: [1, (userAddress ?? zeroAddress) as `0x${string}`],
    query: { enabled: enabledHasBet },
  });

  const { data: ggHas, refetch: refGG } = useReadContract({
    address: marketsAddress,
    abi: MARKETS_BET_ABI,
    functionName: 'hasBet',
    args: [2, (userAddress ?? zeroAddress) as `0x${string}`],
    query: { enabled: enabledHasBet },
  });

  const hasUG02 = Boolean(ug02Has as boolean | undefined);
  const hasUG3P = Boolean(ug3pHas as boolean | undefined);
  const hasGG   = Boolean(ggHas as boolean | undefined);

  // 3) Prepare write + receipt
  const { writeContractAsync, data: txHash, status, error } = useWriteContract();
  const { isLoading: mining, isSuccess: mined } = useWaitForTransactionReceipt({ hash: txHash });

  const bettingClosed = Date.now() >= startTime * 1000;
  const disabledGlobal = bettingClosed || loadingMarketsAddr || !userAddress || !marketsAvailable;

  useEffect(() => {
    if (mined) {
      setPending(null);
      // Refresh local UI state and notify lists
      Promise.allSettled([refUG02(), refUG3P(), refGG()]);
      notifyBetsChanged();
    }
  }, [mined, refUG02, refUG3P, refGG]);

  const place = async (
    fn: 'betUG_0_2' | 'betUG_3_PLUS' | 'betGG',
    tag: 'UG_0_2' | 'UG_3_PLUS' | 'GG'
  ) => {
    if (!marketsAvailable) {
      alert('Markets are not available for this match.');
      return;
    }
    try {
      setPending(tag);
      await writeContractAsync({
        address: marketsAddress,
        abi: MARKETS_BET_ABI,
        functionName: fn,
        value: parseEther(stake),
      });
    } catch (e) {
      console.error(e);
      setPending(null);
      alert('❌ Failed to place market bet.');
    }
  };

  // --- Render guards ---
  if (!userAddress) return null; // show only for connected users

  if (loadingMarketsAddr) {
    return <p className="text-xs text-gray-400">Loading markets…</p>;
  }

  if (!marketsAvailable) {
    return <p className="text-xs text-gray-500">Markets not available for this match.</p>;
  }

  if (bettingClosed) {
    return <p className="text-sm text-red-500">🔒 Markets betting closed.</p>;
  }

  // --- UI ---
  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-medium">Additional markets:</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={
            disabledGlobal ||
            hasUG02 ||
            status === 'pending' ||
            mining ||
            pending === 'UG_0_2'
          }
          onClick={() => place('betUG_0_2', 'UG_0_2')}
          title={hasUG02 ? 'Already placed a bet on UG 0–2' : undefined}
        >
          {pending === 'UG_0_2' && (mining || status === 'pending') ? 'Placing…' : 'UG 0–2'}
        </Button>

        <Button
          variant="secondary"
          disabled={
            disabledGlobal ||
            hasUG3P ||
            status === 'pending' ||
            mining ||
            pending === 'UG_3_PLUS'
          }
          onClick={() => place('betUG_3_PLUS', 'UG_3_PLUS')}
          title={hasUG3P ? 'Already placed a bet on UG 3+' : undefined}
        >
          {pending === 'UG_3_PLUS' && (mining || status === 'pending') ? 'Placing…' : 'UG 3+'}
        </Button>

        <Button
          variant="secondary"
          disabled={
            disabledGlobal ||
            hasGG ||
            status === 'pending' ||
            mining ||
            pending === 'GG'
          }
          onClick={() => place('betGG', 'GG')}
          title={hasGG ? 'Already placed a bet on GG' : undefined}
        >
          {pending === 'GG' && (mining || status === 'pending') ? 'Placing…' : 'GG'}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-red-600 break-all">
          Tx error: {(error as any)?.message}
        </p>
      )}
    </div>
  );
}
