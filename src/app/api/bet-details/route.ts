import { NextRequest } from 'next/server';
import { createPublicClient, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import { FOOTBALL_GAME_BET_ABI } from '@contracts/contracts';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_INFURA_SEPOLIA_URL),
});

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) return new Response('Missing address', { status: 400 });

  try {
    const [homeTeam, awayTeam, stake, startTime, organiser] = await Promise.all([
      publicClient.readContract({ address: address as `0x${string}`, abi: FOOTBALL_GAME_BET_ABI, functionName: 'homeTeam' }),
      publicClient.readContract({ address: address as `0x${string}`, abi: FOOTBALL_GAME_BET_ABI, functionName: 'awayTeam' }),
      publicClient.readContract({ address: address as `0x${string}`, abi: FOOTBALL_GAME_BET_ABI, functionName: 'stake' }),
      publicClient.readContract({ address: address as `0x${string}`, abi: FOOTBALL_GAME_BET_ABI, functionName: 'startTime' }),
      publicClient.readContract({ address: address as `0x${string}`, abi: FOOTBALL_GAME_BET_ABI, functionName: 'organiser' }),
    ]);

    return Response.json({
      address,
      homeTeam,
      awayTeam,
      stake: formatEther(BigInt(stake)),
      startTime: Number(startTime),
      organiser,
    });
  } catch (e) {
    console.error(e);
    return new Response('Failed to fetch bet details', { status: 500 });
  }
}
