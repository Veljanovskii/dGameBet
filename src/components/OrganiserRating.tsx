'use client';

import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { GAME_BET_ABI, GAME_BET_ADDRESS } from '@contracts/contracts';

export default function OrganiserRating({
  organiser,
}: {
  organiser: `0x${string}`;
}) {
  const { data, isLoading } = useReadContract({
    address: GAME_BET_ADDRESS,
    abi: GAME_BET_ABI,
    functionName: 'ratings',
    args: [organiser],
  });

  const { avg, count, active } = useMemo(() => {
    if (!data) return { avg: 0, count: 0, active: false };
    const [activeFlag, totalRate, numberOfTimesRated] = data as unknown as [
      boolean,
      bigint,
      bigint,
    ];
    const c = Number(numberOfTimesRated ?? 0n);
    const a = c > 0 ? Number(totalRate ?? 0n) / c : 0;
    return { avg: a, count: c, active: activeFlag };
  }, [data]);

  if (isLoading) return <p className="text-xs text-gray-500">Rating: …</p>;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-medium">Organiser rating:</span>
      <span className="font-mono">{avg.toFixed(2)}</span>
      <span className="text-gray-500">
        ({count} {count === 1 ? 'vote' : 'votes'})
      </span>
      {!active && (
        <span className="text-xs text-gray-400">• new organiser</span>
      )}
    </div>
  );
}
