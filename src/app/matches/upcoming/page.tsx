'use client';

import MatchesList from '@/components/MatchesList';

export default function UpcomingPage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <MatchesList mode="upcoming" />
    </main>
  );
}