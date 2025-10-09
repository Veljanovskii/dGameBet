import { NextRequest } from 'next/server';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { GAME_BET_ABI, GAME_BET_ADDRESS } from '@contracts/contracts';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_INFURA_SEPOLIA_URL),
});

export async function GET(req: NextRequest) {
  const organiser = req.nextUrl.searchParams.get('organiser');
  if (!organiser) return new Response('Missing organiser address', { status: 400 });

  try {
    const rating = await publicClient.readContract({
      address: GAME_BET_ADDRESS,
      abi: GAME_BET_ABI,
      functionName: 'ratings',
      args: [organiser as `0x${string}`],
    });

    // ratings returns a struct { active: bool, totalRate: uint, numberOfTimesRated: uint }
    const [active, totalRate, numberOfTimesRated] = rating as [boolean, bigint, bigint];

    const average =
      Number(numberOfTimesRated) > 0
        ? Number(totalRate) / Number(numberOfTimesRated)
        : 0;

    return Response.json({
      organiser,
      active,
      totalRate: Number(totalRate),
      numberOfTimesRated: Number(numberOfTimesRated),
      average,
    });
  } catch (err) {
    console.error('❌ Error reading organiser rating:', err);
    return new Response('Failed to read organiser rating', { status: 500 });
  }
}
