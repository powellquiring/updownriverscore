
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

export type PopoverInputType = 'bid' | 'taken' | 'CONFIRM_BIDS' | 'CONFIRM_TAKEN';

export interface ActivePopoverDetails {
  playerId: string | null; 
  roundNumber: number | null; 
  inputType: PopoverInputType;
  cardsForCell: number | null; 
  triggerElement: HTMLDivElement | null; 
  playerName: string | null; 
  isLive: boolean; // Indicates if the popover is for the live game flow vs. historic edit
  currentValue?: number | null;
  isNumberInvalid?: (num: number) => boolean;
  onSelectNumber?: (value: number) => void;
  onConfirmAction?: () => void; // For CONFIRM_BIDS or CONFIRM_TAKEN popovers
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
  onAdvanceRoundOrEndGame: () => void; // New prop
  onEditHistoricScore: (playerId: string, roundNumber: number, inputType: 'bid' | 'taken', value: string) => void;
  onFinishGame: () => void;
  onRestartGame: () => void;
  onSelectDealer: (playerId: string) => void;
}

