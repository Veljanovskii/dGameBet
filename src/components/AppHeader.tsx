'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import CreateBetDialog from './CreateBetDialog';
import { Button } from '@/components/ui/button';

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link href={href} className="inline-block">
      <Button variant={active ? 'default' : 'outline'} size="sm" className="rounded-full">
        {label}
      </Button>
    </Link>
  );
}

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          
          <ConnectButton />
        </div>

        <nav className="flex items-center gap-2">
          <NavLink href="/matches/upcoming" label="Upcoming" />
          <NavLink href="/matches/started"  label="Started"  />
          <NavLink href="/matches/history"  label="History"  />

          <CreateBetDialog>
            <Button className="ml-2 rounded-full">Create Football Bet</Button>
          </CreateBetDialog>
        </nav>
      </div>
    </header>
  );
}
