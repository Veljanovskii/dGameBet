'use client';

import { useEffect, useState } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import PlaceBetForm from './PlaceBetForm';
import { formatEther } from 'viem';
import { GAME_BET_ADDRESS, GAME_BET_ABI } from '@contracts/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type Bet = {
  address: string;
  homeTeam: string;
  awayTeam: string;
  stake: string;
  startTime: number;
  organiser: string;
  totalHomeBets: number;
  totalAwayBets: number;
  homeTeamPool: string;
  awayTeamPool: string;  
  homeTeamGoals: number;
  awayTeamGoals: number;
  isSettled: boolean;
};

export default function BetList() {
  const { address: userAddress } = useAccount();
  const [bets, setBets] = useState<Bet[] | null>(null);

  const { data: betAddresses, isLoading } = useReadContract({
    address: GAME_BET_ADDRESS,
    abi: GAME_BET_ABI,
    functionName: 'getBets',
  });

  useEffect(() => {
    console.log('🔍 betAddresses from contract:', betAddresses);

    const loadBetDetails = async () => {
        if (!betAddresses || !Array.isArray(betAddresses)) {
        console.log('⛔ betAddresses is empty or not an array');
        return;
        }

        try {
        const detailedBets: Bet[] = await Promise.all(
            betAddresses.map(async (betAddr: string) => {
            const res = await fetch(`/api/bet-details?address=${betAddr}`);
            const data = await res.json();
            console.log(`✅ Loaded details for ${betAddr}:`, data);
            return data;
            })
        );

        setBets(detailedBets);
        } catch (err) {
        console.error('❌ Failed to fetch bet details:', err);
        }
    };

    loadBetDetails();
    }, [betAddresses]);

    if (isLoading || bets === null) {
        return (
        <div className="space-y-4 mt-8 max-w-3xl mx-auto">
            {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl w-full" />
            ))}
        </div>
        );
    }

    if (bets.length === 0) {
        return <p className="text-center text-gray-400 mt-6">No active bets found.</p>;
    }

    return (
        <div className="space-y-4 mt-8 max-w-3xl mx-auto">
            {bets.map((bet) => (
            <Card key={bet.address}>
                <CardHeader>
                <CardTitle>
                    {bet.homeTeam} vs {bet.awayTeam}
                </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                <p><strong>Stake:</strong> {bet.stake} ETH</p>
                <p><strong>Start Time:</strong> {new Date(bet.startTime * 1000).toLocaleString()}</p>
                <p><strong>Organiser:</strong> {bet.organiser}</p>
                <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-gray-50">
                    <div>
                        <p className="font-semibold text-blue-700">🏠 Home Team</p>
                        <p><strong>Bets:</strong> {bet.totalHomeBets}</p>
                        <p><strong>Pool:</strong> {bet.homeTeamPool} ETH</p>
                    </div>
                    <div>
                        <p className="font-semibold text-red-700">🚩 Away Team</p>
                        <p><strong>Bets:</strong> {bet.totalAwayBets}</p>
                        <p><strong>Pool:</strong> {bet.awayTeamPool} ETH</p>
                    </div>
                </div>
                <p><strong>Status:</strong> {
                    (() => {                    
                        if (bet.isSettled) {
                            if (bet.homeTeamGoals > bet.awayTeamGoals) return '✅ Game Settled – Home team won';
                            if (bet.homeTeamGoals < bet.awayTeamGoals) return '✅ Game Settled – Away team won';
                            return '✅ Game Settled – Draw';
                        }

                        const gameHasStarted = Date.now() >= bet.startTime * 1000;
                        return gameHasStarted ? '🔴 Betting Closed' : '🟢 Betting Open';
                    })()
                }</p>

                {userAddress?.toLowerCase() !== bet.organiser.toLowerCase() ? (
                    <p className="text-green-600 font-medium">You're the organiser!</p>
                    ) : (
                    bet.startTime * 1000 > Date.now() && (
                        <PlaceBetForm
                        betAddress={bet.address as `0x${string}`}
                        stake={bet.stake}
                        startTime={bet.startTime}
                        />
                    )
                )}
                </CardContent>  
            </Card>
            ))}
        </div>
    );
}
