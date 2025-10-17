'use client';

import { useEffect, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { FOOTBALL_GAME_BET_ABI } from '@contracts/contracts';
import { notifyBetsChanged } from '@/lib/events';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface Props {
  betAddress: `0x${string}`;
}

export default function SettleGameDialog({ betAddress }: Props) {
  const [open, setOpen] = useState(false);
  const [homeGoals, setHomeGoals] = useState('');
  const [awayGoals, setAwayGoals] = useState('');
  const { writeContractAsync, data: hash, status, error } = useWriteContract();
  const { isLoading: isMining, isSuccess: isMined } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isMined) {
      setOpen(false);
      setHomeGoals('');
      setAwayGoals('');
      notifyBetsChanged();
    }
  }, [isMined]);

  const onOpenChange = (v: boolean) => {
    if (isMining || status === 'pending') return;
    setOpen(v);
  };

  const handleSettle = async () => {
    try {
      const hg = parseInt(homeGoals);
      const ag = parseInt(awayGoals);
      if (Number.isNaN(hg) || Number.isNaN(ag))
        return alert('Enter valid integers');

      await writeContractAsync({
        address: betAddress,
        abi: FOOTBALL_GAME_BET_ABI,
        functionName: 'gameFinished',
        args: [hg, ag],
      });
    } catch (err) {
      console.error(err);
      alert('❌ Failed to settle game. See console for details.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="mt-4">
          Settle Game
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settle Game</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Home Team Goals</label>
            <Input
              type="number"
              value={homeGoals}
              onChange={(e) => setHomeGoals(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Away Team Goals</label>
            <Input
              type="number"
              value={awayGoals}
              onChange={(e) => setAwayGoals(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSettle}
            disabled={
              status === 'pending' ||
              isMining ||
              homeGoals === '' ||
              awayGoals === ''
            }
            className="w-full"
          >
            {status === 'pending' || isMining
              ? 'Settling…'
              : 'Confirm and Settle'}
          </Button>
          {error && (
            <p className="text-sm text-red-600 break-all">
              {String((error as any)?.message ?? error)}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
