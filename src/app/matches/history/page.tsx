'use client';

import MatchesList from '@/components/MatchesList';

export default function HistoryPage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <MatchesList mode="history" />
    </main>
  );
}