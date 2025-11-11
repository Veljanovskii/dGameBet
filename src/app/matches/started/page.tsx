'use client';

import MatchesList from '@/components/MatchesList';

export default function StartedPage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <MatchesList key="started" status="started" />
    </main>
  );
}