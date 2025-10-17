import { NextRequest } from 'next/server';
import { createPublicClient, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import { FOOTBALL_GAME_BET_ABI } from '@contracts/contracts';

const client = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_INFURA_SEPOLIA_URL),
});

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) return new Response('Missing address', { status: 400 });

  try {
    const results = await client.multicall({
      contracts: [
        {
          address: address as `0x${string}`,
          abi: FOOTBALL_GAME_BET_ABI,
          functionName: 'homeTeam',
        },
        {
          address: address as `0x${string}`,
          abi: FOOTBALL_GAME_BET_ABI,
          functionName: 'awayTeam',
        },
        {
          address: address as `0x${string}`,
          abi: FOOTBALL_GAME_BET_ABI,
          functionName: 'stake',
        },
        {
          address: address as `0x${string}`,
          abi: FOOTBALL_GAME_BET_ABI,
          functionName: 'startTime',
        },
        {
          address: address as `0x${string}`,
          abi: FOOTBALL_GAME_BET_ABI,
          functionName: 'organiser',
        },
        {
          address: address as `0x${string}`,
          abi: FOOTBALL_GAME_BET_ABI,
          functionName: 'totalHomeBets',
        },
        {
          address: address as `0x${string}`,
          abi: FOOTBALL_GAME_BET_ABI,
          functionName: 'totalAwayBets',
        },
        {
          address: address as `0x${string}`,
          abi: FOOTBALL_GAME_BET_ABI,
          functionName: 'homeTeamPool',
        },
        {
          address: address as `0x${string}`,
          abi: FOOTBALL_GAME_BET_ABI,
          functionName: 'awayTeamPool',
        },
        {
          address: address as `0x${string}`,
          abi: FOOTBALL_GAME_BET_ABI,
          functionName: 'homeTeamGoals',
        },
        {
          address: address as `0x${string}`,
          abi: FOOTBALL_GAME_BET_ABI,
          functionName: 'awayTeamGoals',
        },
        {
          address: address as `0x${string}`,
          abi: FOOTBALL_GAME_BET_ABI,
          functionName: 'getIsSettled',
        },
      ],
      allowFailure: true,
    });

    const [
      homeTeamRes,
      awayTeamRes,
      stakeRes,
      startTimeRes,
      organiserRes,
      totalHomeBetsRes,
      totalAwayBetsRes,
      homeTeamPoolRes,
      awayTeamPoolRes,
      homeGoalsRes,
      awayGoalsRes,
      isSettledRes,
    ] = results;

    const stake = stakeRes.status === 'success' ? stakeRes.result : 0n;
    const startTime =
      startTimeRes.status === 'success' ? Number(startTimeRes.result) : 0;
    const organiser =
      organiserRes.status === 'success'
        ? (organiserRes.result as `0x${string}`)
        : '0x0000000000000000000000000000000000000000';
    const totalHomeBets =
      totalHomeBetsRes.status === 'success'
        ? Number(totalHomeBetsRes.result)
        : 0;
    const totalAwayBets =
      totalAwayBetsRes.status === 'success'
        ? Number(totalAwayBetsRes.result)
        : 0;
    const homeTeamPool =
      homeTeamPoolRes.status === 'success'
        ? formatEther(homeTeamPoolRes.result as bigint)
        : '0';
    const awayTeamPool =
      awayTeamPoolRes.status === 'success'
        ? formatEther(awayTeamPoolRes.result as bigint)
        : '0';
    const homeTeamGoals =
      homeGoalsRes.status === 'success' ? Number(homeGoalsRes.result) : 0;
    const awayTeamGoals =
      awayGoalsRes.status === 'success' ? Number(awayGoalsRes.result) : 0;
    const isSettled =
      isSettledRes.status === 'success' ? Boolean(isSettledRes.result) : false;

    return Response.json({
      address,
      homeTeam:
        homeTeamRes.status === 'success' ? (homeTeamRes.result as string) : '',
      awayTeam:
        awayTeamRes.status === 'success' ? (awayTeamRes.result as string) : '',
      stake: formatEther(stake as bigint),
      startTime,
      organiser,
      totalHomeBets,
      totalAwayBets,
      homeTeamPool,
      awayTeamPool,
      homeTeamGoals,
      awayTeamGoals,
      isSettled,
    });
  } catch (e) {
    console.error('bet-details error:', e);
    return Response.json(
      { error: 'Failed to fetch bet details' },
      { status: 500 }
    );
  }
}
