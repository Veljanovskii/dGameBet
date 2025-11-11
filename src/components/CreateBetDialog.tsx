'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import CreateBetForm from './CreateBetForm';
import { useState } from 'react';

export default function CreateBetDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create Football Bet</DialogTitle>
        </DialogHeader>
        <CreateBetForm />
      </DialogContent>
    </Dialog>
  );
}
