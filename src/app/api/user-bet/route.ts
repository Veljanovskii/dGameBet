import { NextRequest } from 'next/server';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { FOOTBALL_GAME_BET_ABI } from '@contracts/contracts';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_INFURA_SEPOLIA_URL),
});

export async function GET(req: NextRequest) {
  const betAddress = req.nextUrl.searchParams.get('betAddress');
  const user = req.nextUrl.searchParams.get('user');
  if (!betAddress || !user)
    return new Response('Missing betAddress or user', { status: 400 });

  try {
    const betValue = await publicClient.readContract({
      address: betAddress as `0x${string}`,
      abi: FOOTBALL_GAME_BET_ABI,
      functionName: 'bets',
      args: [user as `0x${string}`],
    });

    return Response.json({ bet: Number(betValue) }); // 0, 1, or 2
  } catch (e) {
    console.error(e);
    return new Response('Failed to fetch user bet info', { status: 500 });
  }
}
