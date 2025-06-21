
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
export type CurrentRoundInputMode = 'BIDDING' | 'TAKING';

export interface ScoreInputTableProps {
  playersScoreData: PlayerScoreData[];
  allPlayers: Player[];
  playerOrderForGame: string[];
  gameRounds: GameRoundInfo[];
  currentRoundForInput: number;
  gamePhase: GamePhase;
  currentRoundInputMode: CurrentRoundInputMode;
  currentDealerId: string | null;
  currentPlayerBiddingId: string | null;
  currentPlayerTakingId: string | null;
  currentRoundBidsConfirmed: boolean;
  firstBidderOfRoundId: string | null;
  firstDealerPlayerId: string | null;
  bidPoints: number;
  onSubmitBid: (playerId: string, bid: string) => void;
  onSubmitTaken: (playerId: string, taken: string) => void;
  onConfirmBidsForRound: () => void;
  onAdvanceRoundOrEndGame: () => void;
  onFinishGame: () => void;
  onRestartGame: () => void;
  onSelectDealer: (playerId: string) => void;
  // New props for edit mode
  isEditingCurrentRound?: boolean;
  editingPlayerId?: string | null;
  isPlayerValueUnderActiveEdit?: boolean;
  onToggleEditMode?: () => void;
  onKeepPlayerValue?: () => void;
  onSetActiveEditPlayerValue?: (active: boolean) => void;
}

