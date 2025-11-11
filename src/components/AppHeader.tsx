'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CreateBetDialog from './CreateBetDialog';

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium ${
        active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
}

export default function AppHeader() {
  return (
    <header className="w-full border-b">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">
          dGameBet
        </Link>
        <nav className="flex items-center gap-2">
          <NavLink href="/matches/upcoming">Upcoming</NavLink>
          <NavLink href="/matches/started">Started</NavLink>
          <NavLink href="/matches/history">History</NavLink>
          <CreateBetDialog>
            <span className="px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
              Create Football Bet
            </span>
          </CreateBetDialog>
        </nav>
      </div>
    </header>
  );
}
