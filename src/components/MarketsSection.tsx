'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { FOOTBALL_GAME_BET_ABI, MARKETS_BET_ABI } from '@contracts/contracts';
import { formatEther, parseEther, zeroAddress } from 'viem';
import { notifyBetsChanged, onBetsChanged } from '@/lib/events';
import { Button } from '@/components/ui/button';

type Props = {
  betAddress: `0x${string}`;
  stake: string; // in ETH string
  startTime: number; // unix seconds
};

export default function MarketsSection({
  betAddress,
  stake,
  startTime,
}: Props) {
  const { address: user } = useAccount();

  // 1) Resolve MarketsBet address from the match
  const {
    data: marketsAddressData,
    isLoading: loadingMarketsAddr,
    refetch: refetchMarketsAddr,
  } = useReadContract({
    address: betAddress,
    abi: FOOTBALL_GAME_BET_ABI,
    functionName: 'markets',
  });

  const marketsAddress = useMemo(
    () => (marketsAddressData as `0x${string}` | undefined) ?? zeroAddress,
    [marketsAddressData]
  );

  const enabled = !!user && !!marketsAddress && marketsAddress !== zeroAddress;

  // 2) Read per-market: hasBet, totalBets, poolSize
  // Market indexes: 0 = UG_0_2, 1 = UG_3_PLUS, 2 = GG

  // -- hasBet
  const { data: ug02Has, refetch: refUG02Has } = useReadContract({
    address: marketsAddress,
    abi: MARKETS_BET_ABI,
    functionName: 'hasBet',
    args: [0, user ?? zeroAddress],
    query: { enabled },
  });
  const { data: ug3pHas, refetch: refUG3PHas } = useReadContract({
    address: marketsAddress,
    abi: MARKETS_BET_ABI,
    functionName: 'hasBet',
    args: [1, user ?? zeroAddress],
    query: { enabled },
  });
  const { data: ggHas, refetch: refGGHas } = useReadContract({
    address: marketsAddress,
    abi: MARKETS_BET_ABI,
    functionName: 'hasBet',
    args: [2, user ?? zeroAddress],
    query: { enabled },
  });

  // -- totals/bets
  const { data: ug02Count, refetch: refUG02Count } = useReadContract({
    address: marketsAddress,
    abi: MARKETS_BET_ABI,
    functionName: 'totalBets',
    args: [0],
    query: { enabled: !!marketsAddress && marketsAddress !== zeroAddress },
  });
  const { data: ug3pCount, refetch: refUG3PCount } = useReadContract({
    address: marketsAddress,
    abi: MARKETS_BET_ABI,
    functionName: 'totalBets',
    args: [1],
    query: { enabled: !!marketsAddress && marketsAddress !== zeroAddress },
  });
  const { data: ggCount, refetch: refGGCount } = useReadContract({
    address: marketsAddress,
    abi: MARKETS_BET_ABI,
    functionName: 'totalBets',
    args: [2],
    query: { enabled: !!marketsAddress && marketsAddress !== zeroAddress },
  });

  // -- pools
  const { data: ug02Pool, refetch: refUG02Pool } = useReadContract({
    address: marketsAddress,
    abi: MARKETS_BET_ABI,
    functionName: 'poolSize',
    args: [0],
    query: { enabled: !!marketsAddress && marketsAddress !== zeroAddress },
  });
  const { data: ug3pPool, refetch: refUG3PPool } = useReadContract({
    address: marketsAddress,
    abi: MARKETS_BET_ABI,
    functionName: 'poolSize',
    args: [1],
    query: { enabled: !!marketsAddress && marketsAddress !== zeroAddress },
  });
  const { data: ggPool, refetch: refGGPool } = useReadContract({
    address: marketsAddress,
    abi: MARKETS_BET_ABI,
    functionName: 'poolSize',
    args: [2],
    query: { enabled: !!marketsAddress && marketsAddress !== zeroAddress },
  });

  // 3) Write + receipt
  const {
    writeContractAsync,
    data: txHash,
    status,
    error,
  } = useWriteContract();
  const { isLoading: mining, isSuccess: mined } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [pending, setPending] = useState<null | 'UG_0_2' | 'UG_3_PLUS' | 'GG'>(
    null
  );
  const bettingClosed = Date.now() >= startTime * 1000;
  const disabledGlobally = bettingClosed || loadingMarketsAddr || !user;

  // Refresh readings on global bets changes (someone else bet), and after we mine our own tx
  useEffect(() => {
    const refreshAll = async () => {
      await Promise.allSettled([
        refetchMarketsAddr(),
        refUG02Has(),
        refUG3PHas(),
        refGGHas(),
        refUG02Count(),
        refUG3PCount(),
        refGGCount(),
        refUG02Pool(),
        refUG3PPool(),
        refGGPool(),
      ]);
    };

    const off = onBetsChanged(refreshAll);
    return off;
  }, [
    refetchMarketsAddr,
    refUG02Has,
    refUG3PHas,
    refGGHas,
    refUG02Count,
    refUG3PCount,
    refGGCount,
    refUG02Pool,
    refUG3PPool,
    refGGPool,
  ]);

  useEffect(() => {
    if (mined) {
      setPending(null);
      // refresh and let the rest of the app know
      Promise.allSettled([
        refUG02Has(),
        refUG3PHas(),
        refGGHas(),
        refUG02Count(),
        refUG3PCount(),
        refGGCount(),
        refUG02Pool(),
        refUG3PPool(),
        refGGPool(),
      ]).finally(() => notifyBetsChanged());
    }
  }, [
    mined,
    refUG02Has,
    refUG3PHas,
    refGGHas,
    refUG02Count,
    refUG3PCount,
    refGGCount,
    refUG02Pool,
    refUG3PPool,
    refGGPool,
  ]);

  const place = async (
    fn: 'betUG_0_2' | 'betUG_3_PLUS' | 'betGG',
    tag: 'UG_0_2' | 'UG_3_PLUS' | 'GG'
  ) => {
    if (!marketsAddress || marketsAddress === zeroAddress) {
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

  if (!user) return null; // only show when connected
  if (loadingMarketsAddr)
    return <p className="text-xs text-gray-400">Loading markets…</p>;
  if (!marketsAddress || marketsAddress === zeroAddress)
    return (
      <p className="text-xs text-gray-500">
        Markets not available for this match.
      </p>
    );
  if (bettingClosed)
    return <p className="text-sm text-red-500">🔒 Markets betting closed.</p>;

  // Safe formatters
  const fmtPool = (v: unknown) => {
    try {
      return formatEther((v as bigint) ?? 0n);
    } catch {
      return '0';
    }
  };
  const fmtCount = (v: unknown) => Number(v ?? 0);

  const ug02Disabled =
    disabledGlobally ||
    status === 'pending' ||
    mining ||
    (ug02Has as boolean) === true ||
    pending === 'UG_0_2';
  const ug3pDisabled =
    disabledGlobally ||
    status === 'pending' ||
    mining ||
    (ug3pHas as boolean) === true ||
    pending === 'UG_3_PLUS';
  const ggDisabled =
    disabledGlobally ||
    status === 'pending' ||
    mining ||
    (ggHas as boolean) === true ||
    pending === 'GG';

  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm font-medium">Additional markets:</p>

      {/* UG 0–2 */}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          disabled={ug02Disabled}
          onClick={() => place('betUG_0_2', 'UG_0_2')}
        >
          {pending === 'UG_0_2' && (mining || status === 'pending')
            ? 'Placing…'
            : 'UG 0–2'}
        </Button>
        <span className="text-xs text-gray-600">
          Pool: {fmtPool(ug02Pool)} ETH · Bets: {fmtCount(ug02Count)}
        </span>
      </div>

      {/* UG 3+ */}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          disabled={ug3pDisabled}
          onClick={() => place('betUG_3_PLUS', 'UG_3_PLUS')}
        >
          {pending === 'UG_3_PLUS' && (mining || status === 'pending')
            ? 'Placing…'
            : 'UG 3+'}
        </Button>
        <span className="text-xs text-gray-600">
          Pool: {fmtPool(ug3pPool)} ETH · Bets: {fmtCount(ug3pCount)}
        </span>
      </div>

      {/* GG */}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          disabled={ggDisabled}
          onClick={() => place('betGG', 'GG')}
        >
          {pending === 'GG' && (mining || status === 'pending')
            ? 'Placing…'
            : 'GG'}
        </Button>
        <span className="text-xs text-gray-600">
          Pool: {fmtPool(ggPool)} ETH · Bets: {fmtCount(ggCount)}
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-600 break-all">
          Tx error: {(error as any)?.message}
        </p>
      )}
    </div>
  );
}
