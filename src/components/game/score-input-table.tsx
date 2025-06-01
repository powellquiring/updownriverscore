
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
    padMin: number;
    padMax: number;
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
    const roundInfoForEdit = gameRounds.find(r => r.roundNumber === roundNumber);
    if (!roundInfoForEdit) return;
    const cardsDealtForEdit = roundInfoForEdit.cardsDealt;

    const isCurrentActiveBidCell = roundNumber === currentRoundForInput && inputType === 'bid' && playerId === currentPlayerBiddingId && currentRoundInputMode === 'BIDDING';
    const isCurrentActiveTakeCell = roundNumber === currentRoundForInput && inputType === 'taken' && playerId === currentPlayerTakingId && currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed;
    
    if (isCurrentActiveBidCell || isCurrentActiveTakeCell) return; 
    if (roundNumber === currentRoundForInput && inputType === 'taken' && !currentRoundBidsConfirmed) return;

    let padMin = 0;
    let padMax = cardsDealtForEdit;
    let excludeNumber: number | null = null;

    if (inputType === 'bid') {
        // Check for "Screw the Dealer" for historic bid edits
        const order = playerOrderForGame;
        let historicDealerId = null;
        if (firstDealerPlayerId && order.length > 0) {
            const firstDealerIndex = order.indexOf(firstDealerPlayerId);
            if (firstDealerIndex !== -1) {
                historicDealerId = order[(firstDealerIndex + roundNumber - 1) % order.length];
            }
        }
        if (playerId === historicDealerId) {
            const sumOfOtherPlayerBidsHistoric = playersScoreData.reduce((sum, pData) => {
                if (pData.playerId !== playerId) {
                    const scoreEntry = pData.scores.find(s => s.roundNumber === roundNumber);
                    return sum + (scoreEntry?.bid ?? 0);
                }
                return sum;
            }, 0);
            const forbiddenBid = cardsDealtForEdit - sumOfOtherPlayerBidsHistoric;
            if (forbiddenBid >= 0 && forbiddenBid <= cardsDealtForEdit) {
                excludeNumber = forbiddenBid; // Will be passed to NumberInputPad
            }
        }
    } else if (inputType === 'taken') {
        // For historic 'taken' edits, the edited value must make the sum of taken equal cardsDealtForEdit
        let sumOfOtherTakesInHistoricRound = 0;
        playersScoreData.forEach(pData => {
            if (pData.playerId !== playerId) {
                const scoreEntry = pData.scores.find(s => s.roundNumber === roundNumber);
                sumOfOtherTakesInHistoricRound += (scoreEntry?.taken ?? 0);
            }
        });
        const requiredTakeForThisPlayer = cardsDealtForEdit - sumOfOtherTakesInHistoricRound;
        if (requiredTakeForThisPlayer >= 0 && requiredTakeForThisPlayer <= cardsDealtForEdit) {
            padMin = requiredTakeForThisPlayer;
            padMax = requiredTakeForThisPlayer;
        } else {
            // This implies an inconsistent state or an impossible edit under the rule.
            // For now, we'll allow editing within 0 to cardsDealt, but the GameManager will re-validate.
            // Better would be to prevent this popover or show an error.
            // For simplicity, let the GameManager handle the final validation.
             // To prevent bad state, we could disallow edit if it implies negativity:
            padMin = 0; // fallback
            padMax = cardsDealtForEdit; // fallback
        }
    }

    setEditingCellDetails({ playerId, roundNumber, inputType, padMin, padMax });
  };
  
  const closeEditPopover = () => setEditingCellDetails(null);

  if (gamePhase === 'SCORING' && !currentRoundConfig && gameRounds.length > 0) return <p>Loading round configuration...</p>;

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
        phaseText = currentPlayerTakingId ? `Taking: ${currentPlayerActiveName}'s turn` : 'All Tricks Taken! Processing...';
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
        return `All tricks taken for Round ${currentRoundForInput} are entered. Game will proceed automatically. Double-click any score to correct.`;
      }
      return "Double-click any score to correct past entries.";
    }
    return "";
  }
  
  const isPlayerActiveForBidding = (playerId: string) => currentRoundInputMode === 'BIDDING' && playerId === currentPlayerBiddingId && !currentRoundBidsConfirmed;
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
                          
                          const showBidInputDirectly = isCurrentDisplayRound && isPlayerActiveForBidding(player.playerId);
                          const showTakeInputDirectly = isCurrentDisplayRound && isPlayerActiveForTaking(player.playerId);

                          const isEditingThisCell = editingCellDetails?.playerId === player.playerId && editingCellDetails.roundNumber === roundInfo.roundNumber;
                          const isEditingBid = isEditingThisCell && editingCellDetails.inputType === 'bid';
                          const isEditingTake = isEditingThisCell && editingCellDetails.inputType === 'taken';
                          
                          let excludeNumberForBidPad: number | null = null;
                          if (showBidInputDirectly && player.playerId === currentDealerId) {
                              const sumOfOtherPlayerBids = playersScoreData.reduce((sum, pData) => {
                                  if (pData.playerId !== player.playerId) {
                                      const otherScoreEntry = pData.scores.find(s => s.roundNumber === roundInfo.roundNumber);
                                      return sum + (otherScoreEntry?.bid ?? 0);
                                  }
                                  return sum;
                              }, 0);
                              const forbiddenBid = cardsForThisRound - sumOfOtherPlayerBids;
                              if (forbiddenBid >= 0 && forbiddenBid <= cardsForThisRound) {
                                  excludeNumberForBidPad = forbiddenBid;
                              }
                          }

                          let takeInputPadMin = 0;
                          let takeInputPadMax = cardsForThisRound;
                          if (showTakeInputDirectly) {
                              let sumOfTakesByPreviousPlayersThisRound = 0;
                              const currentPlayerOrderIndex = playerOrderForGame.indexOf(player.playerId);
                              const firstTakerOrderIndex = playerOrderForGame.indexOf(firstBidderOfRoundId!);

                              // Determine players who have already taken in this round before the current player
                              for (let i = 0; i < playerOrderForGame.length; i++) {
                                  const pIdInOrder = playerOrderForGame[(firstTakerOrderIndex + i) % playerOrderForGame.length];
                                  if (pIdInOrder === player.playerId) break; // Stop when we reach the current player

                                  const pData = playersScoreData.find(psd => psd.playerId === pIdInOrder);
                                  const pScoreEntry = pData?.scores.find(s => s.roundNumber === roundInfo.roundNumber);
                                  if (pScoreEntry?.taken !== null && pScoreEntry?.taken !== undefined) {
                                      sumOfTakesByPreviousPlayersThisRound += pScoreEntry.taken;
                                  }
                              }
                              
                              const tricksAvailableForCurrentAndSubsequent = cardsForThisRound - sumOfTakesByPreviousPlayersThisRound;
                              takeInputPadMax = Math.max(0, tricksAvailableForCurrentAndSubsequent);

                              if (player.playerId === currentDealerId) { // Dealer is last to take
                                  takeInputPadMin = Math.max(0, tricksAvailableForCurrentAndSubsequent);
                                  takeInputPadMax = takeInputPadMin; // Force dealer's take
                              }
                          }


                          return (
                            <TableCell key={cellKey} className="text-center align-top pt-2 sm:align-middle sm:pt-4">
                              {showBidInputDirectly ? (
                                <div className="min-h-[60px]">
                                  <NumberInputPad 
                                    min={0} max={cardsForThisRound} 
                                    onSelectNumber={(val) => onSubmitBid(player.playerId, val.toString())}
                                    currentValue={scoreEntry?.bid}
                                    excludeNumber={excludeNumberForBidPad}
                                  />
                                  <div className="text-xs text-muted-foreground mt-1">Taken: -</div>
                                </div>
                              ) : showTakeInputDirectly ? (
                                <div className="min-h-[60px]"> 
                                  <div className="text-sm mb-1">Bid: {scoreEntry?.bid ?? '-'}</div>
                                  <NumberInputPad 
                                    min={takeInputPadMin} 
                                    max={takeInputPadMax} 
                                    onSelectNumber={(val) => onSubmitTaken(player.playerId, val.toString())}
                                    currentValue={scoreEntry?.taken} 
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
                                        min={editingCellDetails.padMin} 
                                        max={editingCellDetails.padMax} 
                                        currentValue={scoreEntry?.bid}
                                        excludeNumber={inputType === 'bid' && player.playerId === currentDealerId ? excludeNumberForBidPad : null}
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
                                        min={editingCellDetails.padMin} 
                                        max={editingCellDetails.padMax} 
                                        currentValue={scoreEntry?.taken}
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
            
            {gamePhase === 'SCORING' && (
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
            )}
            
            <div className="flex-grow text-center p-2 text-muted-foreground h-11 items-center justify-center flex">
                {currentPlayerBiddingId !== null && currentRoundInputMode === 'BIDDING' && !currentRoundBidsConfirmed && (
                    currentPlayerActiveName ? `${currentPlayerActiveName} is bidding...` : `Waiting for bids...`
                )}
                {currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId === null && !currentRoundBidsConfirmed && (
                    `Confirm bids in the table above to proceed...`
                )}
                {currentPlayerTakingId !== null && currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed && (
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

