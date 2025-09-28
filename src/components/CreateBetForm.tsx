'use client';

import { useEffect, useRef, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { GAME_BET_ADDRESS, GAME_BET_ABI } from '@contracts/contracts';
import { notifyBetsChanged } from '@/lib/events';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CreateBetForm() {
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [startTime, setStartTime] = useState('');
  const [stake, setStake] = useState('');

  const unixStartTime = startTime ? Math.floor(new Date(startTime).getTime() / 1000) : 0;

  const { writeContract, data: txHash, status, error } = useWriteContract();
  const {
    isLoading: isMining,
    isSuccess: isMined,
    error: mineError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorLogged = useRef(false);

  const isSubmitting = status === 'pending' || isMining;

  useEffect(() => {
    const isError = status === 'error';
    if (isError && error && !errorLogged.current) {
      let msg = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        if ('message' in error) msg = (error as any).message;
        else msg = JSON.stringify(error);
      } else if (typeof error === 'string') {
        msg = error;
      }
      setErrorMessage(msg);
      errorLogged.current = true;
    } else if (!isError) {
      setErrorMessage(null);
      errorLogged.current = false;
    }
  }, [status, error]);

  useEffect(() => {
    if (isMined) {
      notifyBetsChanged();
      setHomeTeam('');
      setAwayTeam('');
      setStartTime('');
      setStake('');
    }
  }, [isMined]);

  const handleCreate = () => {
    if (!homeTeam || !awayTeam || unixStartTime <= 0 || !stake) return;

    let stakeValue;
    try {
      stakeValue = parseEther(stake);
    } catch {
      setErrorMessage('Invalid stake value');
      return;
    }

    try {
      writeContract({
        address: GAME_BET_ADDRESS as `0x${string}`,
        abi: GAME_BET_ABI,
        functionName: 'createFootballBet',
        args: [homeTeam, awayTeam, unixStartTime, stakeValue],
        value: stakeValue,
      });
    } catch (e: any) {
      setErrorMessage(e?.message ?? 'Transaction failed');
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Football Bet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Home Team</Label>
          <Input value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Away Team</Label>
          <Input value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Start Time</Label>
          <Input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Stake (ETH)</Label>
          <Input
            type="number"
            step="0.01"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
          />
        </div>

        <Button
          onClick={handleCreate}
          disabled={!homeTeam || !awayTeam || !startTime || !stake || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Confirming…' : 'Create Bet'}
        </Button>

        {isMined && <p className="text-sm text-green-600">Bet created successfully!</p>}

        {(errorMessage || mineError) && (
          <div className="text-sm text-red-600 whitespace-pre-wrap break-all">
            {errorMessage ?? (mineError as any)?.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
