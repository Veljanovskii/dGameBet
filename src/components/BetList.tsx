'use client';

import { useEffect, useState, useCallback } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import PlaceBetForm from './PlaceBetForm';
import SettleGameDialog from './SettleGameDialog';
import OrganiserRating from './OrganiserRating';
import RateOrganiser from './RateOrganiser';
import { GAME_BET_ADDRESS, GAME_BET_ABI } from '@contracts/contracts';
import { onBetsChanged, onBetClosed, notifyBetClosed, notifyBetsChanged } from '@/lib/events';
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: betAddresses,
    isLoading,
    refetch,
  } = useReadContract({
    address: GAME_BET_ADDRESS,
    abi: GAME_BET_ABI,
    functionName: 'getBets',
  });

  const fetchDetails = useCallback(async () => {
    if (!betAddresses || !Array.isArray(betAddresses)) return;
    try {
      const detailedBets: Bet[] = await Promise.all(
        betAddresses.map(async (betAddr: string) => {
          const res = await fetch(`/api/bet-details?address=${betAddr}`);
          if (!res.ok) throw new Error(`Failed to fetch details for ${betAddr}`);
          return await res.json();
        })
      );
      setBets(detailedBets);
    } catch (err) {
      console.error('❌ Failed to fetch bet details:', err);
    }
  }, [betAddresses]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    const handler = async () => {
      setIsRefreshing(true);
      try {
        await refetch();
        await fetchDetails();
      } finally {
        setIsRefreshing(false);
      }
    };
    const off = onBetsChanged(handler);
    return off;
  }, [refetch, fetchDetails]);

  useEffect(() => {
    if (!bets) return;

    const timers: number[] = [];

    for (const b of bets) {
      const msUntilStart = b.startTime * 1000 - Date.now();
      if (msUntilStart > 0 && !b.isSettled) {
        const t = window.setTimeout(() => {
          notifyBetClosed(b.address);
          notifyBetsChanged();
        }, msUntilStart);
        timers.push(t);
      }
    }

    const offClosed = onBetClosed((addr) => {
      if (bets.some((b) => b.address.toLowerCase() === addr.toLowerCase())) {
        notifyBetsChanged();
      }
    });

    return () => {
      timers.forEach(clearTimeout);
      offClosed();
    };
  }, [bets]);

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
      {isRefreshing && (
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {bets.map((bet) => {
        const hasStarted = Date.now() >= bet.startTime * 1000;

        return (
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

              <p>
                <strong>Status:</strong>{' '}
                {bet.isSettled
                  ? bet.homeTeamGoals > bet.awayTeamGoals
                    ? '✅ Game Settled – Home team won'
                    : bet.homeTeamGoals < bet.awayTeamGoals
                      ? '✅ Game Settled – Away team won'
                      : '✅ Game Settled – Draw'
                  : hasStarted
                    ? '🔴 Betting Closed'
                    : '🟢 Betting Open'}
              </p>

              {userAddress?.toLowerCase() === bet.organiser.toLowerCase() ? (
                <>
                  <p className="text-green-600 font-medium">You're the organiser!</p>
                  {hasStarted && !bet.isSettled && (
                    <SettleGameDialog betAddress={bet.address as `0x${string}`} />
                  )}
                </>
              ) : (
                !hasStarted && (
                  <PlaceBetForm
                    betAddress={bet.address as `0x${string}`}
                    stake={bet.stake}
                    startTime={bet.startTime}
                  />
                )
              )}

              <OrganiserRating organiser={bet.organiser as `0x${string}`} />
              <RateOrganiser
                organiser={bet.organiser as `0x${string}`}
                betAddress={bet.address as `0x${string}`}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
