import { NextRequest } from 'next/server';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { FOOTBALL_GAME_BET_ABI } from '@contracts/contracts';

const client = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_INFURA_SEPOLIA_URL),
});

export async function GET(req: NextRequest) {
  try {
    const addresses = req.nextUrl.searchParams.getAll('addresses') as `0x${string}`[];

    if (!addresses.length) {
      return Response.json({ items: [] });
    }

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
      // 2: startTime
      ...addresses.map((address) => ({
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'startTime' as const,
      })),
      // 3: getIsSettled
      ...addresses.map((address) => ({
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'getIsSettled' as const,
      })),
      // 4: organiser
      ...addresses.map((address) => ({
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'organiser' as const,
      })),
    ];

    const res = await client.multicall({
      contracts,
      allowFailure: true,
    });

    let k = 0;
    const slice = (count: number) => {
      const out = res.slice(k, k + count);
      k += count;
      return out;
    };

    const homeTeamArr   = slice(perAddr);
    const awayTeamArr   = slice(perAddr);
    const startTimeArr  = slice(perAddr);
    const isSettledArr  = slice(perAddr);
    const organiserArr  = slice(perAddr);

    const items = addresses.map((address, i) => {
      const safe = <T,>(arr: any[], idx: number, fallback: T): T => {
        const entry = arr[idx];
        if (!entry || entry.status !== 'success') return fallback;
        return entry.result as T;
      };

      const homeTeam  = safe<string>(homeTeamArr,  i, '');
      const awayTeam  = safe<string>(awayTeamArr,  i, '');
      const startTime = Number(safe<bigint>(startTimeArr, i, 0n));
      const isSettled = Boolean(safe<boolean>(isSettledArr, i, false));
      const organiser = safe<`0x${string}`>(organiserArr, i, '0x0000000000000000000000000000000000000000');

      return {
        address,
        homeTeam,
        awayTeam,
        startTime,
        isSettled,
        organiser,
      };
    });

    return Response.json(items);
  } catch (e) {
    console.error('bet-basic-batch error:', e);
    return new Response('Failed to fetch basic batch', { status: 500 });
  }
}
