export const notifyBetsChanged = () =>
  window.dispatchEvent(new CustomEvent('bets:changed'));

export const onBetsChanged = (handler: () => void) => {
  window.addEventListener('bets:changed', handler);
  return () => window.removeEventListener('bets:changed', handler);
};