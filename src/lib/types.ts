
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

// PopoverInputType is now only for historic/cascading edits.
export type PopoverInputType = 'bid' | 'taken';

export interface ActivePopoverDetails {
  playerId: string; // PlayerId is required for historic edits
  roundNumber: number;
  inputType: PopoverInputType;
  cardsForCell: number;
  triggerElement: HTMLDivElement | null;
  playerName: string;
  isLive: boolean; // Should generally be false, as live input is now in fixed panel
  currentValue?: number | null;
  isNumberInvalid?: (num: number) => boolean;
  onSelectNumber?: (value: number) => void;
  // onConfirmAction is removed as confirmations are handled by dedicated buttons
}

export interface CascadingEditTarget {
  playerId: string;
  roundNumber: number;
  inputType: 'bid' | 'taken';
  cardsForCell: number;
}

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
  cascadingEditTarget: CascadingEditTarget | null;
  onCascadedEditOpened: () => void;
  onSubmitBid: (playerId: string, bid: string) => void;
  onSubmitTaken: (playerId: string, taken: string) => void;
  onConfirmBidsForRound: () => void;
  onAdvanceRoundOrEndGame: () => void;
  onEditHistoricScore: (playerId: string, roundNumber: number, inputType: 'bid' | 'taken', value: string) => void;
  onFinishGame: () => void;
  onRestartGame: () => void;
  onSelectDealer: (playerId: string) => void;
}
