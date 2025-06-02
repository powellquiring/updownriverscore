"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlayerScoreData, GameRoundInfo, GamePhase, Player, CurrentRoundInputMode } from '@/lib/types';
import { CheckCircle, RefreshCw, UserCheck, UserCog, Target, Edit3, Flag } from 'lucide-react';
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
  firstBidderOfRoundId: string | null; 
  firstDealerPlayerId: string | null;
  onSubmitBid: (playerId: string, bid: string) => void;
  onSubmitTaken: (playerId: string, taken: string) => void;
  onConfirmBidsForRound: () => void;
  onEditHistoricScore: (playerId: string, roundNumber: number, inputType: 'bid' | 'taken', value: string) => void;
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
  firstBidderOfRoundId,
  firstDealerPlayerId,
  onSubmitBid,
  onSubmitTaken,
  onConfirmBidsForRound,
  onEditHistoricScore,
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
    inputType: 'bid' | 'taken'
  ) => {
    const isCurrentActiveBidCell = roundNumber === currentRoundForInput && inputType === 'bid' && playerId === currentPlayerBiddingId && currentRoundInputMode === 'BIDDING';
    const isCurrentActiveTakeCell = roundNumber === currentRoundForInput && inputType === 'taken' && playerId === currentPlayerTakingId && currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed;
    
    if (isCurrentActiveBidCell || isCurrentActiveTakeCell) return; 
    if (roundNumber === currentRoundForInput && inputType === 'taken' && !currentRoundBidsConfirmed) return;

    setEditingCellDetails({ playerId, roundNumber, inputType });
  };
  
  const closeEditPopover = () => setEditingCellDetails(null);

  if (gamePhase === 'SCORING' && !currentRoundConfig && gameRounds.length > 0 && currentRoundForInput <= gameRounds.length ) return <p>Loading round configuration...</p>;

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
        } else { 
            phaseText = 'Bidding Phase Complete';
        }
      } else if (currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed) {
        phaseText = currentPlayerTakingId ? `Taking: ${currentPlayerActiveName}'s turn` : 'Round Complete! Advancing...';
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
        if (currentPlayerBiddingId) return `Player ${currentPlayerActiveName || 'Next'} is bidding. Select a number.`;
        if (!currentRoundBidsConfirmed) return `All bids for Round ${currentRoundForInput} are recorded. Click the green button below to confirm bids.`;
      }
      if (currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed) {
        if (currentPlayerTakingId) return `Player ${currentPlayerActiveName || 'Next'} is entering tricks taken. Select a number.`;
        return `All tricks taken for Round ${currentRoundForInput} are entered. Game will proceed automatically. Double-click any score to correct.`;
      }
      return "Double-click any score to correct past entries.";
    }
    return "";
  }
  
  const isPlayerActiveForBidding = (playerId: string) => currentRoundInputMode === 'BIDDING' && playerId === currentPlayerBiddingId && !currentRoundBidsConfirmed;
  const isPlayerActiveForTaking = (playerId: string) => currentRoundInputMode === 'TAKING' && playerId === currentPlayerTakingId && currentRoundBidsConfirmed;


  // Helper function to determine if a bid number is invalid for the dealer
  const getIsBidInvalidForDealer = (bidAttempt: number, roundConfigForCheck: GameRoundInfo | undefined, playerWhoseBidIsChecked: string): ((num: number) => boolean) | undefined => {
    if (!roundConfigForCheck || playerWhoseBidIsChecked !== currentDealerId || currentRoundInputMode !== 'BIDDING' || !isPlayerActiveForBidding(playerWhoseBidIsChecked)) {
        // Only apply "screw the dealer" for active dealer's bid
        if (editingCellDetails?.inputType === 'bid' && editingCellDetails.roundNumber === roundConfigForCheck?.roundNumber && editingCellDetails.playerId === playerWhoseBidIsChecked) {
           // historic dealer edit
            const order = playerOrderForGame;
            let historicDealerForThisRoundId = null;
            if (firstDealerPlayerId && order.length > 0) {
                const firstDealerIdx = order.indexOf(firstDealerPlayerId);
                if (firstDealerIdx !== -1) {
                    historicDealerForThisRoundId = order[(firstDealerIdx + editingCellDetails.roundNumber - 1) % order.length];
                }
            }
            if (editingCellDetails.playerId !== historicDealerForThisRoundId) return undefined; // Not the dealer for this historic round

            const cardsForHistoricRound = roundConfigForCheck.cardsDealt;
            const sumOfOtherBids = playersScoreData.reduce((sum, pData) => {
                if (pData.playerId !== editingCellDetails.playerId) {
                    const scoreEntry = pData.scores.find(s => s.roundNumber === editingCellDetails.roundNumber);
                    return sum + (scoreEntry?.bid ?? 0);
                }
                return sum;
            }, 0);
            return (numToCheck: number) => sumOfOtherBids + numToCheck === cardsForHistoricRound;
        }
        return undefined;
    }
    
    const cardsDealt = roundConfigForCheck.cardsDealt;
    const sumOfOtherPlayerBids = playersScoreData.reduce((sum, pData) => {
        if (pData.playerId !== playerWhoseBidIsChecked) { 
            const scoreEntry = pData.scores.find(s => s.roundNumber === currentRoundForInput);
            return sum + (scoreEntry?.bid ?? 0); 
        }
        return sum;
    }, 0);

    return (numToCheck: number) => sumOfOtherPlayerBids + numToCheck === cardsDealt;
  };

  // Helper function to determine if a "taken" number is invalid
  const getIsTakenInvalid = (
    takenAttempt: number,
    roundConfigForCheck: GameRoundInfo | undefined,
    playerWhoseTakeIsChecked: string,
    isHistoricEdit: boolean
  ): boolean => {
    if (!roundConfigForCheck) return false; // Should not happen if roundConfig is valid

    const cardsDealt = roundConfigForCheck.cardsDealt;
    const roundNum = roundConfigForCheck.roundNumber;

    let sumOfPreviousTakes = 0;
    let isLastPlayerInOrderForTake = false; // For the current round, this would be the dealer

    const order = playerOrderForGame;
    const firstTakerForRoundId = order[(order.indexOf(firstDealerPlayerId!) + roundNum -1 + 1) % order.length]; // Player after dealer for *this* round
    
    let historicDealerForRoundId = null;
    if (firstDealerPlayerId && order.length > 0) {
        const firstDealerIdx = order.indexOf(firstDealerPlayerId);
        if (firstDealerIdx !== -1) {
            historicDealerForRoundId = order[(firstDealerIdx + roundNum - 1) % order.length];
        }
    }


    if (isHistoricEdit) {
        sumOfPreviousTakes = playersScoreData.reduce((sum, pData) => {
            if (pData.playerId !== playerWhoseTakeIsChecked) {
                const scoreEntry = pData.scores.find(s => s.roundNumber === roundNum);
                return sum + (scoreEntry?.taken ?? 0);
            }
            return sum;
        }, 0);
        // For historic edit, the "last player" is the one whose input makes the sum correct
        return takenAttempt + sumOfPreviousTakes !== cardsDealt;

    } else { // Live input
        if (playerWhoseTakeIsChecked !== currentPlayerTakingId) return false; // Not their turn

        const currentPlayerIndexInOrder = order.indexOf(playerWhoseTakeIsChecked);
        const firstTakerIndexInOrder = order.indexOf(firstTakerForRoundId);

        for (let i = 0; i < order.length; i++) {
            const playerInSequenceId = order[(firstTakerIndexInOrder + i) % order.length];
            if (playerInSequenceId === playerWhoseTakeIsChecked) {
                isLastPlayerInOrderForTake = i === order.length - 1; // True if this player is the last in the bidding/taking sequence for the round
                break;
            }
            const pData = playersScoreData.find(ps => ps.playerId === playerInSequenceId);
            const scoreEntry = pData?.scores.find(s => s.roundNumber === roundNum);
            sumOfPreviousTakes += (scoreEntry?.taken ?? 0);
        }
        
        const tricksRemainingForCurrentAndSubsequent = cardsDealt - sumOfPreviousTakes;
        if (playerWhoseTakeIsChecked === historicDealerForRoundId) { // If current taker is the dealer of this round
             return takenAttempt !== tricksRemainingForCurrentAndSubsequent;
        } else {
            return takenAttempt > tricksRemainingForCurrentAndSubsequent;
        }
    }
  };


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
                        {currentDealerId === player.playerId && gamePhase === 'SCORING' && <UserCog className="ml-2 h-4 w-4 inline text-primary-foreground" title="Dealer" />}
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
                          const cellKey = `${player.playerId}-${roundInfo.roundNumber}`;
                          
                          const showBidInputDirectly = isCurrentDisplayRound && isPlayerActiveForBidding(player.playerId);
                          const showTakeInputDirectly = isCurrentDisplayRound && isPlayerActiveForTaking(player.playerId);

                          const isEditingThisCell = editingCellDetails?.playerId === player.playerId && editingCellDetails.roundNumber === roundInfo.roundNumber;
                          const isEditingBid = isEditingThisCell && editingCellDetails.inputType === 'bid';
                          const isEditingTake = isEditingThisCell && editingCellDetails.inputType === 'taken';
                          
                          const isBidInvalidCallback = getIsBidInvalidForDealer(0, roundInfo, player.playerId);
                          const isTakenInvalidCallbackForLive = (num: number) => getIsTakenInvalid(num, roundInfo, player.playerId, false);
                          const isTakenInvalidCallbackForHistoric = (num: number) => getIsTakenInvalid(num, roundInfo, player.playerId, true);


                          return (
                            <TableCell key={cellKey} className="text-center align-top pt-2 sm:align-middle sm:pt-4">
                              {showBidInputDirectly ? (
                                <div className="min-h-[60px]">
                                  <NumberInputPad 
                                    min={0} max={roundInfo.cardsDealt} 
                                    onSelectNumber={(val) => onSubmitBid(player.playerId, val.toString())}
                                    currentValue={scoreEntry?.bid}
                                    isNumberInvalid={isBidInvalidCallback}
                                  />
                                  <div className="text-xs text-muted-foreground mt-1">Taken: -</div>
                                </div>
                              ) : showTakeInputDirectly ? (
                                <div className="min-h-[60px]"> 
                                  <div className="text-sm mb-1">Bid: {scoreEntry?.bid ?? '-'}</div>
                                  <NumberInputPad 
                                    min={0} 
                                    max={roundInfo.cardsDealt} 
                                    onSelectNumber={(val) => onSubmitTaken(player.playerId, val.toString())}
                                    currentValue={scoreEntry?.taken} 
                                    isNumberInvalid={isTakenInvalidCallbackForLive}
                                  />
                                </div>
                              ) : ( 
                                <div className="text-center text-sm py-1">
                                  <Popover open={isEditingBid} onOpenChange={(isOpen) => { if (!isOpen) closeEditPopover(); }}>
                                    <PopoverTrigger asChild>
                                      <span
                                        className="cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded-md"
                                        onDoubleClick={() => handleOpenEditPopover(player.playerId, roundInfo.roundNumber, 'bid')}
                                      >
                                        Bid: {scoreEntry?.bid ?? '-'}
                                      </span>
                                    </PopoverTrigger>
                                    {editingCellDetails && isEditingBid && (
                                    <PopoverContent className="w-auto p-0" align="center">
                                      <NumberInputPad
                                        min={0} 
                                        max={roundInfo.cardsDealt} 
                                        currentValue={scoreEntry?.bid}
                                        isNumberInvalid={getIsBidInvalidForDealer(0, gameRounds.find(r=>r.roundNumber === editingCellDetails.roundNumber), editingCellDetails.playerId)}
                                        onSelectNumber={(val) => {
                                          onEditHistoricScore(player.playerId, roundInfo.roundNumber, 'bid', val.toString());
                                          closeEditPopover();
                                        }}
                                      />
                                    </PopoverContent>
                                    )}
                                  </Popover>
                                  
                                  <span className="text-muted-foreground mx-0.5 sm:mx-1">/</span>
                                  
                                  <Popover open={isEditingTake} onOpenChange={(isOpen) => { if (!isOpen) closeEditPopover(); }}>
                                    <PopoverTrigger asChild>
                                      <span
                                        className="cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded-md"
                                        onDoubleClick={() => handleOpenEditPopover(player.playerId, roundInfo.roundNumber, 'taken')}
                                      >
                                        Taken: {(isCurrentDisplayRound && currentRoundInputMode === 'BIDDING' && !currentRoundBidsConfirmed) ? '-' : (scoreEntry?.taken ?? '-')}
                                      </span>
                                    </PopoverTrigger>
                                    {editingCellDetails && isEditingTake && (
                                    <PopoverContent className="w-auto p-0" align="center">
                                      <NumberInputPad
                                        min={0} 
                                        max={roundInfo.cardsDealt} 
                                        currentValue={scoreEntry?.taken}
                                        isNumberInvalid={isTakenInvalidCallbackForHistoric}
                                        onSelectNumber={(val) => {
                                          onEditHistoricScore(player.playerId, roundInfo.roundNumber, 'taken', val.toString());
                                          closeEditPopover();
                                        }}
                                      />
                                    </PopoverContent>
                                    )}
                                  </Popover>
                                  <span className="text-muted-foreground mx-0.5 sm:mx-1">→</span>
                                  <span className="font-medium">{scoreEntry?.roundScore ?? 0}</span>
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {isCurrentDisplayRound && gamePhase === 'SCORING' && currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId === null && !currentRoundBidsConfirmed && (
                        <TableRow className="bg-card border-t border-b border-border">
                          <TableCell colSpan={2} className="py-1"></TableCell> 
                          <TableCell colSpan={playersScoreData.length} className="text-center py-2 px-1">
                            <Button
                              onClick={onConfirmBidsForRound}
                              className="w-full bg-green-500 hover:bg-green-600 text-white text-sm font-semibold"
                              size="sm"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" /> All Bids In! Click to Confirm &amp; Enter Tricks Taken
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
            
            <Button 
                onClick={onFinishGame} 
                variant="destructive" 
                size="lg" 
                className="w-full sm:w-auto"
                disabled={
                  (currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId !== null) ||
                  (currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId === null && !currentRoundBidsConfirmed) ||
                  (currentRoundInputMode === 'TAKING' && currentPlayerTakingId !== null && currentRoundBidsConfirmed)
                }
            >
                <Flag className="mr-2 h-5 w-5" /> Finish Game Early
            </Button>
            
            <div className="flex-grow text-center p-2 text-muted-foreground h-11 items-center justify-center flex">
                {currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId !== null && !currentRoundBidsConfirmed && (
                    currentPlayerActiveName ? `${currentPlayerActiveName} is bidding...` : `Waiting for bids...`
                )}
                {currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId === null && !currentRoundBidsConfirmed && (
                    `Confirm bids in the table above to proceed...`
                )}
                {currentRoundInputMode === 'TAKING' && currentPlayerTakingId !== null && currentRoundBidsConfirmed && (
                    currentPlayerActiveName ? `${currentPlayerActiveName} is entering tricks...` : `Waiting for tricks taken...`
                )}
                {currentRoundInputMode === 'TAKING' && currentPlayerTakingId === null && currentRoundBidsConfirmed && (
                    `Round complete. Processing next round or results...`
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

