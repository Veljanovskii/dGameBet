import { NextRequest } from 'next/server';
import { createPublicClient, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import {
  GAME_BET_ABI,
  GAME_BET_ADDRESS,
  FOOTBALL_GAME_BET_ABI,
} from '@contracts/contracts';

const client = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_INFURA_SEPOLIA_URL),
});

type Status = 'upcoming' | 'started' | 'history';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const status = (url.searchParams.get('status') ?? 'history') as Status;
  const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
  const sort = (url.searchParams.get('sort') ?? 'asc') as 'asc' | 'desc';
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '10', 10))
  );

  try {
    // 1) read all bet addresses (single chain call)
    const allAddresses = (await client.readContract({
      address: GAME_BET_ADDRESS as `0x${string}`,
      abi: GAME_BET_ABI,
      functionName: 'getBets',
    })) as `0x${string}`[];

    if (!allAddresses?.length) {
      return Response.json({ total: 0, page, pageSize, items: [] });
    }

    // 2) basic info needed for filtering/sorting (batch)
    //    we fetch startTime + isSettled + teams (for search) for ALL, but keep it as a SINGLE multicall.
    const groups = 4; // startTime, isSettled, homeTeam, awayTeam
    const contracts = allAddresses.flatMap((address) => [
      {
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'startTime' as const,
      },
      {
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'getIsSettled' as const,
      },
      {
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'homeTeam' as const,
      },
      {
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'awayTeam' as const,
      },
    ]);

    const basic = await client.multicall({ contracts, allowFailure: true });

    const nowMs = Date.now();
    const basicRows = allAddresses
      .map((address, i) => {
        const pick = (g: number) => basic[g * allAddresses.length + i];

        const startTime = Number((pick(0).result ?? 0n) as bigint);
        const isSettled = Boolean(pick(1).result ?? false);
        const homeTeam = String(pick(2).result ?? '');
        const awayTeam = String(pick(3).result ?? '');

        const hasStarted = nowMs >= startTime * 1000;
        const inStatus =
          status === 'upcoming'
            ? !hasStarted && !isSettled
            : status === 'started'
              ? hasStarted && !isSettled
              : isSettled;

        const matchesSearch =
          search.length >= 2
            ? homeTeam.toLowerCase().includes(search) ||
              awayTeam.toLowerCase().includes(search)
            : true;

        return {
          address,
          startTime,
          isSettled,
          homeTeam,
          awayTeam,
          include: inStatus && matchesSearch,
        };
      })
      .filter((r) => r.include);

    // 3) sort & paginate on the SERVER
    basicRows.sort((a, b) =>
      sort === 'asc' ? a.startTime - b.startTime : b.startTime - a.startTime
    );

    const total = basicRows.length;
    const start = (page - 1) * pageSize;
    const end = Math.min(total, start + pageSize);
    const pageRows = basicRows.slice(start, end);

    if (pageRows.length === 0) {
      return Response.json({ total, page, pageSize, items: [] });
    }

    // 4) details for THIS PAGE ONLY
    const detailsContracts = pageRows.flatMap(({ address }) => [
      {
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'organiser' as const,
      },
      { address, abi: FOOTBALL_GAME_BET_ABI, functionName: 'stake' as const },
      {
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'totalHomeBets' as const,
      },
      {
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'totalAwayBets' as const,
      },
      {
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'homeTeamPool' as const,
      },
      {
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'awayTeamPool' as const,
      },
      {
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'homeTeamGoals' as const,
      },
      {
        address,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'awayTeamGoals' as const,
      },
    ]);

    const details = await client.multicall({
      contracts: detailsContracts,
      allowFailure: true,
    });

    const items = pageRows.map(
      ({ address, startTime, isSettled, homeTeam, awayTeam }, idx) => {
        const pick = (g: number) => details[g * pageRows.length + idx];

        const organiser = (pick(0).result ??
          '0x0000000000000000000000000000000000000000') as `0x${string}`;
        const stake = formatEther((pick(1).result ?? 0n) as bigint);
        const totalHomeBets = Number((pick(2).result ?? 0n) as bigint);
        const totalAwayBets = Number((pick(3).result ?? 0n) as bigint);
        const homeTeamPool = formatEther((pick(4).result ?? 0n) as bigint);
        const awayTeamPool = formatEther((pick(5).result ?? 0n) as bigint);
        const homeTeamGoals = Number((pick(6).result ?? 0n) as bigint);
        const awayTeamGoals = Number((pick(7).result ?? 0n) as bigint);

        return {
          address,
          homeTeam,
          awayTeam,
          stake,
          startTime,
          organiser,
          totalHomeBets,
          totalAwayBets,
          homeTeamPool,
          awayTeamPool,
          homeTeamGoals,
          awayTeamGoals,
          isSettled,
        };
      }
    );

    return Response.json({ total, page, pageSize, items });
  } catch (e) {
    console.error('bets-page error:', e);
    return Response.json({ error: 'Failed to build page' }, { status: 500 });
  }
}
