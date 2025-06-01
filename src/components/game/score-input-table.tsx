
"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlayerScoreData, GameRoundInfo, GamePhase, Player, CurrentRoundInputMode } from '@/lib/types';
import { ArrowRight, CheckCircle, RefreshCw, UserCheck, UserCog, Target, Edit3, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NumberInputPad } from './number-input-pad';
import { cn } from '@/lib/utils';

interface ScoreInputTableProps {
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
  onSubmitBid: (playerId: string, bid: string) => void;
  onSubmitTaken: (playerId: string, taken: string) => void;
  onConfirmBidsForRound: () => void;
  onEditHistoricScore: (playerId: string, roundNumber: number, inputType: 'bid' | 'taken', value: string) => void;
  onNextRound: () => void;
  onFinishGame: () => void;
  onRestartGame: () => void;
  onSelectDealer?: (playerId: string) => void;
}

export function ScoreInputTable({
  playersScoreData,
  allPlayers,
  playerOrderForGame,
  gameRounds,
  currentRoundForInput,
  gamePhase,
  currentRoundInputMode,
  currentDealerId,
  currentPlayerBiddingId,
  currentPlayerTakingId,
  currentRoundBidsConfirmed,
  onSubmitBid,
  onSubmitTaken,
  onConfirmBidsForRound,
  onEditHistoricScore,
  onNextRound,
  onFinishGame,
  onRestartGame,
  onSelectDealer,
}: ScoreInputTableProps) {
  const currentRoundConfig = gameRounds.find(r => r.roundNumber === currentRoundForInput);
  const playersForDisplay = gamePhase === 'DEALER_SELECTION' ? allPlayers.map(p => ({ ...p, playerId: p.id, name: p.name })) : playersScoreData;
  
  const [editingCellDetails, setEditingCellDetails] = useState<{
    playerId: string;
    roundNumber: number;
    inputType: 'bid' | 'taken';
    cardsDealt: number;
  } | null>(null);

  const currentDealerName = allPlayers.find(p => p.id === currentDealerId)?.name;
  let currentPlayerActiveName = '';
  if (currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId) {
    currentPlayerActiveName = allPlayers.find(p => p.id === currentPlayerBiddingId)?.name || '';
  } else if (currentRoundInputMode === 'TAKING' && currentPlayerTakingId) {
    currentPlayerActiveName = allPlayers.find(p => p.id === currentPlayerTakingId)?.name || '';
  }


  const handleOpenEditPopover = (
    playerId: string,
    roundNumber: number,
    inputType: 'bid' | 'taken',
    cardsDealt: number
  ) => {
    const isCurrentActiveBidCell = roundNumber === currentRoundForInput && inputType === 'bid' && playerId === currentPlayerBiddingId && currentRoundInputMode === 'BIDDING';
    const isCurrentActiveTakeCell = roundNumber === currentRoundForInput && inputType === 'taken' && playerId === currentPlayerTakingId && currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed;
    
    if (isCurrentActiveBidCell || isCurrentActiveTakeCell) return; // Don't use popover for direct input cells
    
    // Prevent editing "taken" for current round if bids not confirmed
    if (roundNumber === currentRoundForInput && inputType === 'taken' && !currentRoundBidsConfirmed) return;

    setEditingCellDetails({ playerId, roundNumber, inputType, cardsDealt });
  };
  
  const closeEditPopover = () => setEditingCellDetails(null);

  if (gamePhase === 'SCORING' && !currentRoundConfig && gameRounds.length > 0) return <p>Loading round configuration...</p>;

  const isLastRound = currentRoundConfig && gameRounds.length > 0 && currentRoundForInput === gameRounds[gameRounds.length - 1]?.roundNumber;
  const roundsToDisplay = gameRounds.filter(roundInfo => roundInfo.roundNumber <= currentRoundForInput);

  const getHeaderTitle = () => {
    if (gamePhase === 'DEALER_SELECTION') return "Select First Dealer";
    if (gamePhase === 'SCORING' && currentRoundConfig) {
      let phaseText = '';
      if (currentRoundInputMode === 'BIDDING') {
        if (currentPlayerBiddingId) {
            phaseText = `Bidding: ${currentPlayerActiveName}'s turn`;
        } else if (!currentRoundBidsConfirmed) {
            phaseText = 'All Bids In! Confirm below to proceed.';
        } else { // Should not happen if logic is correct, but as a fallback
            phaseText = 'Bidding Phase Complete';
        }
      } else if (currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed) {
        phaseText = currentPlayerTakingId ? `Taking: ${currentPlayerActiveName}'s turn` : 'All Tricks Taken!';
      }
      const dealerInfo = currentDealerName ? `(Dealer: ${currentDealerName})` : '';
      return `Score Sheet - Round ${currentRoundForInput} of ${gameRounds.length} (Cards: ${currentRoundConfig.cardsDealt}) ${dealerInfo} - ${phaseText}`;
    }
    return "Score Sheet";
  }

  const getTableCaption = () => {
    if (gamePhase === 'DEALER_SELECTION') return "Click player's name to select as first dealer.";
    if (gamePhase === 'SCORING') {
      if (currentRoundInputMode === 'BIDDING') {
        if (currentPlayerBiddingId) return `Player ${currentPlayerActiveName || 'Next'} is bidding. Click a number in their column.`;
        if (!currentRoundBidsConfirmed) return `All bids for Round ${currentRoundForInput} are recorded. Click the green button below to confirm bids and start entering tricks taken.`;
      }
      if (currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed) {
        if (currentPlayerTakingId) return `Player ${currentPlayerActiveName || 'Next'} is entering tricks taken. Click a number in their column.`;
        return `All tricks taken for Round ${currentRoundForInput} are entered. Proceed to next round or finish game. Double-click any score to correct.`;
      }
      return "Double-click any score to correct past entries.";
    }
    return "";
  }
  
  const isPlayerActiveForBidding = (playerId: string) => currentRoundInputMode === 'BIDDING' && playerId === currentPlayerBiddingId;
  const isPlayerActiveForTaking = (playerId: string) => currentRoundInputMode === 'TAKING' && playerId === currentPlayerTakingId && currentRoundBidsConfirmed;


  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-lg sm:text-xl text-center text-primary-foreground">
          {getHeaderTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>{getTableCaption()}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] font-semibold">{gamePhase === 'DEALER_SELECTION' ? 'Players' : 'Round'}</TableHead>
                <TableHead className="w-[60px] font-semibold">{gamePhase === 'DEALER_SELECTION' ? '' : 'Cards'}</TableHead>
                {playersForDisplay.map(player => (
                  <TableHead key={player.playerId} className="min-w-[150px] sm:min-w-[180px] text-center font-semibold">
                    {gamePhase === 'DEALER_SELECTION' && onSelectDealer ? (
                      <Button variant="ghost" className="w-full h-auto p-1 text-base hover:bg-primary/20" onClick={() => onSelectDealer(player.playerId)}>
                        <UserCheck className="mr-2 h-5 w-5 text-accent" /> {player.name}
                      </Button>
                    ) : (
                      <>
                        {player.name}
                        {currentDealerId === player.playerId && <UserCog className="ml-2 h-4 w-4 inline text-primary-foreground" title="Dealer" />}
                        {(isPlayerActiveForBidding(player.playerId) || isPlayerActiveForTaking(player.playerId)) && <Target className="ml-2 h-4 w-4 inline text-accent" title="Current Turn" />}
                      </>
                    )}
                  </TableHead>
                ))}
              </TableRow>
               {gamePhase === 'SCORING' && (
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                  {playersScoreData.map(player => (
                    <TableHead key={`${player.playerId}-subtitle`} className="text-center text-xs text-muted-foreground">
                      {(isPlayerActiveForBidding(player.playerId)) ? 'Enter Bid Below' : 
                       (isPlayerActiveForTaking(player.playerId)) ? 'Enter Tricks Taken Below' 
                       : 'Bid / Taken → Score'}
                       <Edit3 className="h-3 w-3 inline ml-1 opacity-50" title="Double-click past scores to edit"/>
                    </TableHead>
                  ))}
                </TableRow>
              )}
            </TableHeader>
            {gamePhase === 'SCORING' && currentRoundConfig && (
              <>
                <TableBody>
                  {roundsToDisplay.map((roundInfo) => {
                    const isCurrentDisplayRound = roundInfo.roundNumber === currentRoundForInput;
                    const isHistoricRound = roundInfo.roundNumber < currentRoundForInput;

                    return (
                    <React.Fragment key={roundInfo.roundNumber}>
                      <TableRow className={cn(
                        isCurrentDisplayRound && currentRoundInputMode === 'BIDDING' && !currentRoundBidsConfirmed ? 'bg-primary/10' : '',
                        isCurrentDisplayRound && currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed ? 'bg-secondary/10' : '',
                        !isCurrentDisplayRound ? 'opacity-80 hover:opacity-100' : ''
                      )}>
                        <TableCell className="font-medium">{roundInfo.roundNumber}</TableCell>
                        <TableCell>{roundInfo.cardsDealt}</TableCell>
                        {playersScoreData.map(player => {
                          const scoreEntry = player.scores.find(s => s.roundNumber === roundInfo.roundNumber);
                          const cardsForThisRound = roundInfo.cardsDealt;
                          const cellKey = `${player.playerId}-${roundInfo.roundNumber}`;
                          
                          const showBidInput = isCurrentDisplayRound && isPlayerActiveForBidding(player.playerId);
                          const showTakeInput = isCurrentDisplayRound && isPlayerActiveForTaking(player.playerId);

                          const isEditingThisBid = editingCellDetails?.playerId === player.playerId && editingCellDetails.roundNumber === roundInfo.roundNumber && editingCellDetails.inputType === 'bid';
                          const isEditingThisTake = editingCellDetails?.playerId === player.playerId && editingCellDetails.roundNumber === roundInfo.roundNumber && editingCellDetails.inputType === 'taken';
                          
                          return (
                            <TableCell key={cellKey} className="text-center align-top pt-2 sm:align-middle sm:pt-4">
                              {showBidInput ? (
                                <div className="min-h-[60px]"> {/* Bid Input Pad */}
                                  <NumberInputPad 
                                    min={0} max={cardsForThisRound} 
                                    onSelectNumber={(val) => onSubmitBid(player.playerId, val.toString())}
                                    currentValue={scoreEntry?.bid} 
                                  />
                                  <div className="text-xs text-muted-foreground mt-1">Taken: -</div>
                                </div>
                              ) : showTakeInput ? (
                                <div className="min-h-[60px]"> {/* Take Input Pad */}
                                  <div className="text-sm mb-1">Bid: {scoreEntry?.bid ?? '-'}</div>
                                  <NumberInputPad 
                                    min={0} max={cardsForThisRound} 
                                    onSelectNumber={(val) => onSubmitTaken(player.playerId, val.toString())}
                                    currentValue={scoreEntry?.taken} 
                                  />
                                </div>
                              ) : ( // Displaying historic or non-active scores
                                <div className="flex flex-col items-center gap-0.5">
                                  <Popover open={isEditingThisBid} onOpenChange={(isOpen) => !isOpen && closeEditPopover()}>
                                    <PopoverTrigger asChild>
                                      <span
                                        className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded-md text-sm"
                                        onDoubleClick={() => handleOpenEditPopover(player.playerId, roundInfo.roundNumber, 'bid', cardsForThisRound)}
                                      >
                                        Bid: {scoreEntry?.bid ?? '-'}
                                      </span>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="center">
                                      <NumberInputPad
                                        min={0} max={cardsForThisRound} currentValue={scoreEntry?.bid}
                                        onSelectNumber={(val) => {
                                          onEditHistoricScore(player.playerId, roundInfo.roundNumber, 'bid', val.toString());
                                          closeEditPopover();
                                        }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  
                                  <span className="text-muted-foreground text-xs">/</span>
                                  
                                  <Popover open={isEditingThisTake} onOpenChange={(isOpen) => !isOpen && closeEditPopover()}>
                                    <PopoverTrigger asChild>
                                      <span
                                        className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded-md text-sm"
                                        onDoubleClick={() => handleOpenEditPopover(player.playerId, roundInfo.roundNumber, 'taken', cardsForThisRound)}
                                      >
                                        Taken: {(isCurrentDisplayRound && currentRoundInputMode === 'BIDDING' && !currentRoundBidsConfirmed) ? '-' : (scoreEntry?.taken ?? '-')}
                                      </span>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="center">
                                      <NumberInputPad
                                        min={0} max={cardsForThisRound} currentValue={scoreEntry?.taken}
                                        onSelectNumber={(val) => {
                                          onEditHistoricScore(player.playerId, roundInfo.roundNumber, 'taken', val.toString());
                                          closeEditPopover();
                                        }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <span className="text-xs text-muted-foreground mt-0.5">→ {scoreEntry?.roundScore ?? 0}</span>
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {/* Row for "Confirm Bids" button */}
                      {isCurrentDisplayRound && gamePhase === 'SCORING' && currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId === null && !currentRoundBidsConfirmed && (
                        <TableRow className="bg-card border-t border-b border-border">
                          <TableCell colSpan={2} className="py-1"></TableCell> 
                          <TableCell colSpan={playersScoreData.length} className="text-center py-2 px-1">
                            <Button
                              onClick={onConfirmBidsForRound}
                              className="w-full bg-green-500 hover:bg-green-600 text-white text-sm font-semibold"
                              size="sm"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" /> All Bids In! Click to Confirm & Enter Tricks Taken
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-card border-t-2 border-primary">
                    <TableCell colSpan={2} className="font-bold text-lg text-right">Total</TableCell>
                    {playersScoreData.map(player => (
                      <TableCell key={`total-${player.playerId}`} className="text-center font-bold text-lg text-primary-foreground">
                        {player.totalScore}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              </>
            )}
          </Table>
        </div>
        {gamePhase === 'SCORING' && (
          <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <Button onClick={onRestartGame} variant="outline" size="lg" className="w-full sm:w-auto">
              <RefreshCw className="mr-2 h-5 w-5" /> Restart Game
            </Button>
            <div className="flex gap-4 w-full sm:w-auto">
              { (currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId !== null) ? (
                 <div className="flex-grow text-center p-2 text-muted-foreground h-11 items-center justify-center flex">
                    {currentPlayerActiveName ? `${currentPlayerActiveName} is bidding...` : `Waiting for bids...`}
                 </div>
              ) : (currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId === null && !currentRoundBidsConfirmed) ? (
                 <div className="flex-grow text-center p-2 text-muted-foreground h-11 items-center justify-center flex">
                    Confirm bids in the table above to proceed...
                 </div>
              ) : (currentRoundInputMode === 'TAKING' && currentPlayerTakingId !== null && currentRoundBidsConfirmed) ? (
                 <div className="flex-grow text-center p-2 text-muted-foreground h-11 items-center justify-center flex">
                    {currentPlayerActiveName ? `${currentPlayerActiveName} is entering tricks...` : `Waiting for tricks taken...`}
                 </div>
              ) : (currentRoundInputMode === 'TAKING' && currentPlayerTakingId === null && currentRoundBidsConfirmed) ? (
                 isLastRound ? (
                    <Button onClick={onFinishGame} className="bg-accent text-accent-foreground hover:bg-accent/90 flex-grow" size="lg">
                      <CheckCircle className="mr-2 h-5 w-5" /> Finish & View Results
                    </Button>
                  ) : (
                    <Button onClick={onNextRound} size="lg" className="flex-grow">
                      Next Round <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  )
              ) : (
                // Fallback or placeholder if no other condition met, or when game setup phase
                 <div className="flex-grow text-center p-2 text-muted-foreground h-11 items-center justify-center flex">
                    Game in progress...
                 </div>
              )}
            </div>
          </div>
        )}
        {gamePhase === 'DEALER_SELECTION' && (
          <div className="mt-8 flex justify-end items-center gap-4">
            <Button onClick={onRestartGame} variant="outline" size="lg">
              <RefreshCw className="mr-2 h-5 w-5" /> Back to Setup
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
