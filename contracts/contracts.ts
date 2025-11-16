import gameBetAbi from './GameBet.json';
import footballAbi from './FootballGameBet.json';
import marketsAbi from './MarketsBet.json';

export const GAME_BET_ADDRESS = process.env.NEXT_PUBLIC_GAME_BET_ADDRESS!;

export const GAME_BET_ABI = gameBetAbi.abi;
export const FOOTBALL_GAME_BET_ABI = footballAbi.abi;
export const MARKETS_BET_ABI = marketsAbi.abi;
