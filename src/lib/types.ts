
export interface Player {
  id: string;
  name: string;
}

export interface GameRoundInfo {
  roundNumber: number;
  cardsDealt: number;
  isUpRound: boolean; // true if cards are increasing/at max, false if decreasing
}

export interface RoundScoreEntry {
  roundNumber: number;
  bid: number | null;
  taken: number | null;
  roundScore: number;
}

export interface PlayerScoreData {
  playerId: string;
  name:string;
  scores: RoundScoreEntry[];
  totalScore: number;
}

export type GamePhase = 'SETUP' | 'DEALER_SELECTION' | 'SCORING' | 'RESULTS';
