'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { GAME_BET_ABI, GAME_BET_ADDRESS } from '@contracts/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import PlaceBetForm from './PlaceBetForm';
import SettleGameDialog from './SettleGameDialog';
import OrganiserRating from './OrganiserRating';
import RateOrganiser from './RateOrganiser';
import MarketsSection from './MarketsSection';
import { onBetsChanged } from '@/lib/events';

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

type Props = {
  status: 'upcoming' | 'started' | 'history';
};

const PAGE_SIZE = 3;

export default function MatchesList({ status }: Props) {
  const { address: userAddress } = useAccount();
  const [bets, setBets] = useState<Bet[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
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

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchDetails = useCallback(async (addresses: string[]) => {
    if (!addresses?.length) {
      setBets([]);
      return;
    }
    try {
      const query = addresses.map((a) => `addresses=${a}`).join('&');
      const res = await fetch(`/api/bet-details-batch?${query}`);
      if (!res.ok) throw new Error('Failed to fetch details batch');
      const data = await res.json();
      setBets(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('details batch failed:', e);
    }
  }, []);

  useEffect(() => {
    const addrs = (betAddresses as string[] | undefined) ?? [];
    fetchDetails(addrs);
  }, [betAddresses, fetchDetails]);

  useEffect(() => {
    const off = onBetsChanged(async () => {
      setIsRefreshing(true);
      try {
        const { data } = await refetch();
        const fresh =
          (data as string[] | undefined) ?? (betAddresses as string[]) ?? [];
        await fetchDetails(fresh);
      } finally {
        setIsRefreshing(false);
      }
    });
    return off;
  }, [refetch, fetchDetails, betAddresses]);

  // ---------- Filtering, searching, sorting ----------
  const filtered = useMemo(() => {
    const now = Date.now();

    const statusFiltered = bets.filter((b) => {
      const started = now >= b.startTime * 1000;
      if (status === 'upcoming') return !started && !b.isSettled;
      if (status === 'started') return started && !b.isSettled;
      return b.isSettled;
    });

    const searched =
      debouncedSearch.trim().length >= 2
        ? statusFiltered.filter((b) => {
            const q = debouncedSearch.toLowerCase();
            return (
              b.homeTeam.toLowerCase().includes(q) ||
              b.awayTeam.toLowerCase().includes(q)
            );
          })
        : statusFiltered;

    const sorted = [...searched].sort((a, b) =>
      sort === 'asc' ? a.startTime - b.startTime : b.startTime - a.startTime
    );

    return sorted;
  }, [bets, status, debouncedSearch, sort]);

  // ---------- Pagination ----------
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [status, debouncedSearch, sort]);

  // ---------- Loading ----------
  if (isLoading && bets.length === 0) {
    return (
      <div className="space-y-4 mt-8 max-w-5xl mx-auto">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl w-full" />
        ))}
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">
            Search by team
          </label>
          <input
            className="w-full border rounded-md px-3 py-2"
            placeholder="Min 2 characters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Sort by start time
          </label>
          <select
            className="border rounded-md px-3 py-2"
            value={sort}
            onChange={(e) => setSort(e.target.value as 'asc' | 'desc')}
          >
            <option value="asc">Ascending (earliest first)</option>
            <option value="desc">Descending (latest first)</option>
          </select>
        </div>
      </div>

      {isRefreshing && (
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {paged.length === 0 ? (
        <p className="text-center text-gray-500 mt-6">No matches found.</p>
      ) : (
        <div className="space-y-4 mt-2">
          {paged.map((bet) => {
            const now = Date.now();
            const started = now >= bet.startTime * 1000;
            const statusText = bet.isSettled
              ? bet.homeTeamGoals > bet.awayTeamGoals
                ? '✅ Game Settled – Home team won'
                : bet.homeTeamGoals < bet.awayTeamGoals
                  ? '✅ Game Settled – Away team won'
                  : '✅ Game Settled – Draw'
              : started
                ? '🔴 Betting Closed'
                : '🟢 Betting Open';

            const isOrganiser =
              userAddress?.toLowerCase() === bet.organiser.toLowerCase();

            return (
              <Card key={bet.address}>
                <CardHeader>
                  <CardTitle>
                    {bet.homeTeam} vs {bet.awayTeam}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <strong>Stake:</strong> {bet.stake} ETH
                  </p>
                  <p>
                    <strong>Start Time:</strong>{' '}
                    {new Date(bet.startTime * 1000).toLocaleString()}
                  </p>
                  <p>
                    <strong>Organiser:</strong> {bet.organiser}
                  </p>

                  <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-gray-50">
                    <div>
                      <p className="font-semibold text-blue-700">
                        🏠 Home Team
                      </p>
                      <p>
                        <strong>Bets:</strong> {bet.totalHomeBets}
                      </p>
                      <p>
                        <strong>Pool:</strong> {bet.homeTeamPool} ETH
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-red-700">🚩 Away Team</p>
                      <p>
                        <strong>Bets:</strong> {bet.totalAwayBets}
                      </p>
                      <p>
                        <strong>Pool:</strong> {bet.awayTeamPool} ETH
                      </p>
                    </div>
                  </div>

                  <p>
                    <strong>Status:</strong> {statusText}
                  </p>

                  {isOrganiser ? (
                    <>
                      <p className="text-green-600 font-medium">
                        You're the organiser!
                      </p>
                      {started && !bet.isSettled && (
                        <SettleGameDialog
                          betAddress={bet.address as `0x${string}`}
                        />
                      )}
                    </>
                  ) : (
                    !started && (
                      <>
                        {/* Primary 1X2 market (home/away) */}
                        <PlaceBetForm
                          betAddress={bet.address as `0x${string}`}
                          stake={bet.stake}
                          startTime={bet.startTime}
                        />
                        {/* NEW: side markets (UG 0–2, UG 3+, GG) */}
                        <MarketsSection
                          betAddress={bet.address as `0x${string}`}
                          stake={bet.stake}
                          startTime={bet.startTime}
                        />
                      </>
                    )
                  )}

                  <OrganiserRating organiser={bet.organiser as `0x${string}`} />
                  {bet.isSettled && (
                    <RateOrganiser
                      organiser={bet.organiser as `0x${string}`}
                      betAddress={bet.address as `0x${string}`}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          disabled={currentPage <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </button>
        <span className="text-sm">
          Page {currentPage} / {totalPages}
        </span>
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          disabled={currentPage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </button>
      </div>
    </div>
  );
}
