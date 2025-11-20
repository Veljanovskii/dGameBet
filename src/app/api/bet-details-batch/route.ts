import { NextRequest } from 'next/server';
import { createPublicClient, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import { FOOTBALL_GAME_BET_ABI } from '@contracts/contracts';

const client = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_INFURA_SEPOLIA_URL),
});

export async function GET(req: NextRequest) {
  try {
    const addresses = req.nextUrl.searchParams.getAll(
      'addresses'
    ) as `0x${string}`[];
    if (!addresses.length) return Response.json([]);

    const perAddr = addresses.length;

    const contracts = [
      // 0: homeTeam
      ...addresses.map((address) => ({
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'homeTeam' as const,
      })),
      // 1: awayTeam
      ...addresses.map((address) => ({
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'awayTeam' as const,
      })),
      // 2: stake
      ...addresses.map((address) => ({
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'stake' as const,
      })),
      // 3: startTime
      ...addresses.map((address) => ({
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'startTime' as const,
      })),
      // 4: organiser
      ...addresses.map((address) => ({
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'organiser' as const,
      })),
      // 5: totalHomeBets
      ...addresses.map((address) => ({
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'totalHomeBets' as const,
      })),
      // 6: totalAwayBets
      ...addresses.map((address) => ({
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'totalAwayBets' as const,
      })),
      // 7: homeTeamPool
      ...addresses.map((address) => ({
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'homeTeamPool' as const,
      })),
      // 8: awayTeamPool
      ...addresses.map((address) => ({
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'awayTeamPool' as const,
      })),
      // 9: homeTeamGoals
      ...addresses.map((address) => ({
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'homeTeamGoals' as const,
      })),
      // 10: awayTeamGoals
      ...addresses.map((address) => ({
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'awayTeamGoals' as const,
      })),
      // 11: getIsSettled
      ...addresses.map((address) => ({
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'getIsSettled' as const,
      })),
    ];

    const res = await client.multicall({
      contracts,
      allowFailure: true,
    });

    let i = 0;
    const slice = () => {
      const out = res.slice(i, i + perAddr);
      i += perAddr;
      return out;
    };

    const HOME = slice();
    const AWAY = slice();
    const STAKE = slice();
    const START = slice();
    const ORG = slice();
    const THOME = slice();
    const TAWAY = slice();
    const HOMEPOOL = slice();
    const AWAYPOOL = slice();
    const HOMEGOALS = slice();
    const AWAYGOALS = slice();
    const SETTLED = slice();

    const safe = <T>(arr: any[], idx: number, fallback: T): T => {
      const entry = arr[idx];
      if (!entry || entry.status !== 'success') return fallback;
      return entry.result as T;
    };

    const items = addresses.map((address, idx) => {
      const stakeWei = safe<bigint>(STAKE, idx, 0n);
      const startTimeBn = safe<bigint>(START, idx, 0n);
      const totalHomeBn = safe<bigint>(THOME, idx, 0n);
      const totalAwayBn = safe<bigint>(TAWAY, idx, 0n);
      const homePoolWei = safe<bigint>(HOMEPOOL, idx, 0n);
      const awayPoolWei = safe<bigint>(AWAYPOOL, idx, 0n);
      const homeGoalsBn = safe<bigint>(HOMEGOALS, idx, 0n);
      const awayGoalsBn = safe<bigint>(AWAYGOALS, idx, 0n);

      return {
        address,
        homeTeam: safe<string>(HOME, idx, ''),
        awayTeam: safe<string>(AWAY, idx, ''),
        stake: formatEther(stakeWei),
        startTime: Number(startTimeBn),
        organiser: safe<`0x${string}`>(
          ORG,
          idx,
          '0x0000000000000000000000000000000000000000'
        ),
        totalHomeBets: Number(totalHomeBn),
        totalAwayBets: Number(totalAwayBn),
        homeTeamPool: formatEther(homePoolWei),
        awayTeamPool: formatEther(awayPoolWei),
        homeTeamGoals: Number(homeGoalsBn),
        awayTeamGoals: Number(awayGoalsBn),
        isSettled: Boolean(safe<boolean>(SETTLED, idx, false)),
      };
    });

    return Response.json(items);
  } catch (e) {
    console.error('details batch failed:', e);
    return new Response('Failed to fetch details batch', { status: 500 });
  }
}
