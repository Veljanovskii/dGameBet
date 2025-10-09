import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { FOOTBALL_GAME_BET_ABI, GAME_BET_ABI } from '@contracts/contracts';
import { GAME_BET_ADDRESS } from '@contracts/contracts';
import { useAccount } from 'wagmi';

function CanVoteDebug({ betAddress, organiser }: { betAddress: `0x${string}`, organiser: `0x${string}` }) {
  const { address } = useAccount();

  const runDebug = async () => {
    if (!address) {
      console.warn('No connected address');
      return;
    }

    const client = createPublicClient({
      chain: sepolia,
      transport: http(process.env.NEXT_PUBLIC_INFURA_SEPOLIA_URL),
    });

    try {
      // Read all individual conditions
      const organiserOfBet = await client.readContract({
        address: betAddress,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'organiser',
      });

      const startTime = await client.readContract({
        address: betAddress,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'startTime',
      });

      const myBet = await client.readContract({
        address: betAddress,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'bets',
        args: [address],
      });

      const ratingInfo = await client.readContract({
        address: GAME_BET_ADDRESS as `0x${string}`,
        abi: GAME_BET_ABI,
        functionName: 'ratings',
        args: [organiser],
      }) as { active: boolean, totalRate: bigint, numberOfTimesRated: bigint };

      const alreadyVoted = await client.readContract({
        address: GAME_BET_ADDRESS as `0x${string}`,
        abi: GAME_BET_ABI,
        functionName: 'hasVoted',
        args: [organiser, betAddress, address],
      });

      // IMPORTANT: call canVote with account set to your address so msg.sender is correct
      const canVote = await client.readContract({
        address: GAME_BET_ADDRESS as `0x${string}`,
        abi: GAME_BET_ABI,
        functionName: 'canVote',
        args: [organiser, betAddress],
        // viem lets you set the 'from' for eth_call via 'account'
        account: address as `0x${string}`,
      });

      const nowSec = Math.floor(Date.now() / 1000);

      console.group('🔎 canVote debug');
      console.log('you (msg.sender):', address);
      console.log('organiser param:', organiser);
      console.log('organiserOfBet():', organiserOfBet);
      console.log('ratings[organiser].active:', ratingInfo.active);
      console.log('startTime:', Number(startTime), ' now:', nowSec, ' (started? ', nowSec >= Number(startTime), ')');
      console.log('myBet on this match:', Number(myBet)); // 0 none, 1 home, 2 away
      console.log('hasVoted[organiser][bet][you]:', alreadyVoted);
      console.log('FINAL canVote():', canVote);
      console.groupEnd();

      if (!canVote) {
        // quick human message about which condition is likely failing
        if (address.toLowerCase() === (organiser as string).toLowerCase()) {
          alert('You are the organiser; organisers cannot vote.');
        } else if (!ratingInfo.active) {
          alert('Organiser is not marked active (should be set when creating the match). Are you using the correct GameBet deployment?');
        } else if (nowSec < Number(startTime)) {
          alert('Match has not started yet on-chain. Voting opens once startTime has passed.');
        } else if ((organiserOfBet as string).toLowerCase() !== (organiser as string).toLowerCase()) {
          alert('The organiser you passed does not match FootballGameBet.organiser().');
        } else if (Number(myBet) === 0) {
          alert('Chain says you did not place a bet on this match address.');
        } else if (alreadyVoted) {
          alert('You have already voted for this organiser on this match.');
        } else {
          alert('canVote() is false for an unexpected reason. See console for details.');
        }
      } else {
        alert('canVote() is TRUE — you should be able to rate.');
      }
    } catch (e) {
      console.error('canVote debug error:', e);
      alert('Failed to run canVote debug. See console.');
    }
  };

  return (
    <button
      onClick={runDebug}
      className="text-[11px] text-blue-600 underline mt-1"
    >
      Why can’t I vote?
    </button>
  );
}

export default CanVoteDebug;
