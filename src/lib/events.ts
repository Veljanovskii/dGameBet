type BetClosedDetail = { betAddress: string };

export const notifyBetsChanged = () =>
  window.dispatchEvent(new CustomEvent('bets:changed'));

export const onBetsChanged = (handler: () => void) => {
  window.addEventListener('bets:changed', handler);
  return () => window.removeEventListener('bets:changed', handler);
};

export const notifyBetClosed = (betAddress: string) =>
  window.dispatchEvent(new CustomEvent<BetClosedDetail>('bet:closed', { detail: { betAddress } }));

export const onBetClosed = (handler: (betAddress: string) => void) => {
  const listener = (e: Event) => {
    const ce = e as CustomEvent<BetClosedDetail>;
    if (ce?.detail?.betAddress) handler(ce.detail.betAddress);
  };
  window.addEventListener('bet:closed', listener as EventListener);
  return () => window.removeEventListener('bet:closed', listener as EventListener);
};