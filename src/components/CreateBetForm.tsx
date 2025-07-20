'use client';

import { useState } from 'react';
import { useWriteContract } from 'wagmi';
import { useEffect, useRef } from 'react';
import { parseEther } from 'viem';
import { GAME_BET_ADDRESS, GAME_BET_ABI } from '@contracts/contracts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CreateBetForm() {
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [startTime, setStartTime] = useState('');
  const [stake, setStake] = useState('');

  const unixStartTime = startTime
    ? Math.floor(new Date(startTime).getTime() / 1000)
    : 0;

  const { writeContract, data, status, error } = useWriteContract();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorLogged = useRef(false);

  const isLoading = status === 'pending';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  useEffect(() => {
    if (isError && error && !errorLogged.current) {
      let msg = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        if ('message' in error) {
          msg = (error as any).message;
        } else {
          msg = JSON.stringify(error);
        }
      } else if (typeof error === 'string') {
        msg = error;
      }
      setErrorMessage(msg);
      errorLogged.current = true;
      console.error('Contract call error:', error);
    } else if (!isError) {
      setErrorMessage(null);
      errorLogged.current = false;
    }
  }, [isError, error]);

  const handleCreate = () => {
    if (!homeTeam || !awayTeam || unixStartTime <= 0 || !stake) return;

    let stakeValue;
    try {
        stakeValue = parseEther(stake);
    } catch (err) {
        alert('Invalid stake value');
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
    } catch (error) {
        console.error('Transaction failed:', error);
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
          <Input
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Away Team</Label>
          <Input
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
          />
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
          disabled={!homeTeam || !awayTeam || !startTime || !stake || isLoading}
          className="w-full"
        >
          {isLoading ? 'Creating...' : 'Create Bet'}
        </Button>

        {isSuccess && (
          <p className="text-sm text-green-600">Bet created successfully!</p>
        )}
        {isError && (
          <div className="text-sm text-red-600">
            Transaction failed.
            {errorMessage && (
              <pre className="whitespace-pre-wrap break-all mt-2">{errorMessage}</pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
