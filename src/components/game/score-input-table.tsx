
"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlayerScoreData, GameRoundInfo, GamePhase, Player, CurrentRoundInputMode, ScoreInputTableProps, CascadingEditTarget } from '@/lib/types';
import { CheckCircle, RefreshCw, UserCheck, UserCog, Target, Edit3, Flag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NumberInputPad } from './number-input-pad';
import { cn } from '@/lib/utils';


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
  cascadingEditTarget,
  onCascadedEditOpened,
  onSubmitBid,
  onSubmitTaken,
  onConfirmBidsForRound,
  onEditHistoricScore,
  onFinishGame,
  onRestartGame,
  onSelectDealer,
}: ScoreInputTableProps) {
  const currentRoundConfig = gameRounds.find(r => r.roundNumber === currentRoundForInput);
  const playersForDisplay = gamePhase === 'DEALER_SELECTION' ? allPlayers.map(p => ({ ...p, playerId: p.id, name: p.name, scores: [], totalScore: 0 })) : playersScoreData;
  
  const [editingCellDetails, setEditingCellDetails] = useState<{
    playerId: string;
    roundNumber: number;
    inputType: 'bid' | 'taken';
    cardsForCell: number;
  } | null>(null);

  useEffect(() => {
    if (cascadingEditTarget && onCascadedEditOpened) {
      if (
        !editingCellDetails ||
        editingCellDetails.playerId !== cascadingEditTarget.playerId ||
        editingCellDetails.roundNumber !== cascadingEditTarget.roundNumber ||
        editingCellDetails.inputType !== cascadingEditTarget.inputType
      ) {
        setEditingCellDetails({
          playerId: cascadingEditTarget.playerId,
          roundNumber: cascadingEditTarget.roundNumber,
          inputType: cascadingEditTarget.inputType,
          cardsForCell: cascadingEditTarget.cardsForCell,
        });
      }
      // Call onCascadedEditOpened to signal consumption, GameManager will clear it
      // This should ideally be called *after* the popover is visually open or effect has run.
      // For simplicity, calling it here. If GameManager clears too fast, could cause issues.
      // A small timeout in GameManager before clearing or a different signal might be more robust.
      onCascadedEditOpened(); 
    }
  }, [cascadingEditTarget, onCascadedEditOpened, editingCellDetails]);


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
    cardsForCell: number
  ) => {
    const isCurrentActiveBidCell = roundNumber === currentRoundForInput && inputType === 'bid' && playerId === currentPlayerBiddingId && currentRoundInputMode === 'BIDDING';
    const isCurrentActiveTakeCell = roundNumber === currentRoundForInput && inputType === 'taken' && playerId === currentPlayerTakingId && currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed;
    
    if (isCurrentActiveBidCell || isCurrentActiveTakeCell) return; 
    if (roundNumber === currentRoundForInput && inputType === 'taken' && !currentRoundBidsConfirmed) return;

    setEditingCellDetails({ playerId, roundNumber, inputType, cardsForCell });
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
            phaseText = 'All Bids In! Confirm below.';
        } else { 
            phaseText = 'Bidding Phase Complete';
        }
      } else if (currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed) {
        phaseText = currentPlayerTakingId ? `Taking: ${currentPlayerActiveName}'s turn` : `Processing Round ${currentRoundForInput}...`;
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
        if (currentPlayerBiddingId) return `Player ${currentPlayerActiveName || 'Next'} is bidding.`;
        if (!currentRoundBidsConfirmed) return `All bids for Round ${currentRoundForInput} are recorded. Click the green button below to confirm.`;
      }
      if (currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed) {
        if (currentPlayerTakingId) return `Player ${currentPlayerActiveName || 'Next'} is entering tricks taken.`;
        return `All tricks taken for Round ${currentRoundForInput} are entered. Game will proceed. Double-click score to correct.`;
      }
      return "Double-click any score to correct past entries.";
    }
    return "";
  }
  
  const isPlayerActiveForBidding = (playerId: string) => currentRoundInputMode === 'BIDDING' && playerId === currentPlayerBiddingId && !currentRoundBidsConfirmed;
  const isPlayerActiveForTaking = (playerId: string) => currentRoundInputMode === 'TAKING' && playerId === currentPlayerTakingId && currentRoundBidsConfirmed;

  const getIsBidInvalidForDealer = (
    roundConfigForCheck: GameRoundInfo | undefined, 
    playerWhosePadIsBeingConfigured: string,
    isHistoricEditContext: boolean
  ): ((num_on_pad: number) => boolean) | undefined => {
    if (!roundConfigForCheck || !firstDealerPlayerId || playerOrderForGame.length === 0) {
      return undefined; 
    }
    const cardsDealt = roundConfigForCheck.cardsDealt;
    const roundNumForCheck = roundConfigForCheck.roundNumber;
    const order = playerOrderForGame;
    const numPlayers = order.length;

    let dealerForRelevantRoundId = null;

    // Determine the dealer for the specific round being checked (current or historic)
    const firstDealerBaseIndex = order.indexOf(firstDealerPlayerId);
    if (firstDealerBaseIndex === -1) return undefined; // Should not happen if game setup is complete
    
    // For live input (not historic), currentDealerId is the authority
    // For historic, calculate based on firstDealerPlayerId and roundNumber
    if (!isHistoricEditContext && currentDealerId) {
        dealerForRelevantRoundId = currentDealerId;
    } else { // Historic context or if currentDealerId is somehow null during live bidding for dealer
        dealerForRelevantRoundId = order[(firstDealerBaseIndex + roundNumForCheck - 1) % numPlayers];
    }
    
    if (playerWhosePadIsBeingConfigured !== dealerForRelevantRoundId) {
      return undefined; // Rule only applies to the dealer
    }

    const sumOfOtherPlayerBids = playersScoreData.reduce((sum, pData) => {
        if (pData.playerId !== playerWhosePadIsBeingConfigured) { 
            const scoreEntry = pData.scores.find(s => s.roundNumber === roundNumForCheck);
            return sum + (scoreEntry?.bid ?? 0); 
        }
        return sum;
    }, 0);

    return (num_on_pad: number) => sumOfOtherPlayerBids + num_on_pad === cardsDealt;
  };

  const getIsTakenInvalid = (
    roundConfigForCheck: GameRoundInfo | undefined, 
    playerWhosePadIsBeingConfigured: string,        
    isHistoricEditContext: boolean
  ): ((num_on_pad: number) => boolean) | undefined => {
    if (!roundConfigForCheck || !firstDealerPlayerId || playerOrderForGame.length === 0) {
      return undefined; 
    }
    const cardsDealt = roundConfigForCheck.cardsDealt;
    const roundNumForCheck = roundConfigForCheck.roundNumber;
    const order = playerOrderForGame;
    const numPlayers = order.length;

    if (isHistoricEditContext) {
        // For historic edits of "taken", allow any number between 0 and cardsDealt.
        // The GameManager will handle row highlighting and cascading edits if the sum is off.
        return (num_on_pad: number) => num_on_pad < 0 || num_on_pad > cardsDealt;
    }

    // Live input for "taken"
    const firstDealerBaseIndex = order.indexOf(firstDealerPlayerId);
    if (firstDealerBaseIndex === -1 && currentDealerId) { // Should have currentDealerId for live input
        return undefined; 
    }
    
    let dealerForThisRound: string | null = null;
    let firstDeclarerForThisRoundId: string | null = null;

    // Determine dealer and first declarer for THIS specific round (current live round)
    const dealerIndexOffset = (firstDealerBaseIndex + roundNumForCheck - 1);
    const dealerIndexForRound = dealerIndexOffset % numPlayers;
    dealerForThisRound = order[dealerIndexForRound];
    firstDeclarerForThisRoundId = order[(dealerIndexForRound + 1) % numPlayers];
    
    if (!firstDeclarerForThisRoundId) return undefined; // Should be set

    let sumOfTakesByPriorPlayersInOrder = 0;
    let foundPlayerWhosePad = false;

    // Iterate based on the declaration order for *this specific round*
    const firstDeclarerActualIndex = order.indexOf(firstDeclarerForThisRoundId);
    if (firstDeclarerActualIndex === -1) return undefined;

    for (let i = 0; i < numPlayers; i++) {
      const currentPlayerInSequenceIndex = (firstDeclarerActualIndex + i) % numPlayers;
      const currentPlayerInSequenceId = order[currentPlayerInSequenceIndex];

      if (currentPlayerInSequenceId === playerWhosePadIsBeingConfigured) {
        foundPlayerWhosePad = true;
        break; 
      }
      const pData = playersScoreData.find(ps => ps.playerId === currentPlayerInSequenceId);
      const scoreEntry = pData?.scores.find(s => s.roundNumber === roundNumForCheck);
      sumOfTakesByPriorPlayersInOrder += (scoreEntry?.taken ?? 0);
    }
    
    if (!foundPlayerWhosePad) return undefined;

    const tricksAvailableForAllocationFromThisPlayerOnwards = cardsDealt - sumOfTakesByPriorPlayersInOrder;

    return (num_on_pad: number) => {
      if (num_on_pad < 0 || num_on_pad > cardsDealt) return true; // Basic boundary

      if (playerWhosePadIsBeingConfigured === dealerForThisRound) { // Current player is the dealer for THIS round
        return num_on_pad !== tricksAvailableForAllocationFromThisPlayerOnwards;
      } else {
        return num_on_pad > tricksAvailableForAllocationFromThisPlayerOnwards;
      }
    };
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
                    
                    let sumOfTakenThisRoundForHighlight = 0;
                    if (!isCurrentDisplayRound || (isCurrentDisplayRound && currentRoundBidsConfirmed)) { // Only calculate sum for past rounds or current round if bids confirmed
                        playersScoreData.forEach(pData => {
                            const scoreEntry = pData.scores.find(s => s.roundNumber === roundInfo.roundNumber);
                            sumOfTakenThisRoundForHighlight += (scoreEntry?.taken ?? 0);
                        });
                    }
                    const isTakenSumIncorrect = !isCurrentDisplayRound && sumOfTakenThisRoundForHighlight !== roundInfo.cardsDealt && playersScoreData.some(p => p.scores.find(s => s.roundNumber === roundInfo.roundNumber)?.taken !== null);


                    return (
                    <React.Fragment key={roundInfo.roundNumber}>
                      <TableRow className={cn(
                        isCurrentDisplayRound && currentRoundInputMode === 'BIDDING' && !currentRoundBidsConfirmed ? 'bg-primary/10' : '',
                        isCurrentDisplayRound && currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed ? 'bg-secondary/10' : '',
                        !isCurrentDisplayRound ? 'opacity-80 hover:opacity-100' : '',
                        isTakenSumIncorrect ? 'bg-destructive/10' : ''
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
                          
                          const isBidInvalidCallbackForLive = getIsBidInvalidForDealer(roundInfo, player.playerId, false);
                          const isBidInvalidCallbackForHistoric = getIsBidInvalidForDealer(roundInfo, player.playerId, true);
                          
                          const isTakenInvalidCallbackForLive = getIsTakenInvalid(roundInfo, player.playerId, false);
                          const isTakenInvalidCallbackForHistoric = getIsTakenInvalid(roundInfo, player.playerId, true);

                          return (
                            <TableCell key={cellKey} className="text-center align-top pt-2 sm:align-middle sm:pt-4">
                              {showBidInputDirectly ? (
                                <div className="min-h-[60px]">
                                  <NumberInputPad 
                                    min={0} max={roundInfo.cardsDealt} 
                                    onSelectNumber={(val) => onSubmitBid(player.playerId, val.toString())}
                                    currentValue={scoreEntry?.bid}
                                    isNumberInvalid={isBidInvalidCallbackForLive}
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
                                        onDoubleClick={() => handleOpenEditPopover(player.playerId, roundInfo.roundNumber, 'bid', roundInfo.cardsDealt)}
                                      >
                                        Bid: {scoreEntry?.bid ?? '-'}
                                      </span>
                                    </PopoverTrigger>
                                    {editingCellDetails && isEditingBid && (
                                    <PopoverContent className="w-auto p-0" align="center">
                                      <NumberInputPad
                                        min={0} 
                                        max={editingCellDetails.cardsForCell} 
                                        currentValue={scoreEntry?.bid}
                                        isNumberInvalid={isBidInvalidCallbackForHistoric}
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
                                        onDoubleClick={() => handleOpenEditPopover(player.playerId, roundInfo.roundNumber, 'taken', roundInfo.cardsDealt)}
                                      >
                                        Taken: {(isCurrentDisplayRound && currentRoundInputMode === 'BIDDING' && !currentRoundBidsConfirmed) ? '-' : (scoreEntry?.taken ?? '-')}
                                      </span>
                                    </PopoverTrigger>
                                    {editingCellDetails && isEditingTake && (
                                    <PopoverContent className="w-auto p-0" align="center">
                                      <NumberInputPad
                                        min={0} 
                                        max={editingCellDetails.cardsForCell} // Use cardsDealt for the round being edited
                                        currentValue={scoreEntry?.taken}
                                        isNumberInvalid={isTakenInvalidCallbackForHistoric} // This will now be simpler for historic taken
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
                          <TableCell colSpan={2 + playersScoreData.length} className="text-center py-2 px-1">
                            <Button
                              onClick={onConfirmBidsForRound}
                              className="w-full max-w-md mx-auto bg-green-500 hover:bg-green-600 text-white text-sm font-semibold"
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
            
            <div className="flex-grow text-center p-2 text-muted-foreground h-11 items-center justify-center flex text-sm">
                {currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId !== null && !currentRoundBidsConfirmed && (
                    currentPlayerActiveName ? `${currentPlayerActiveName} is bidding...` : `Waiting for bids...`
                )}
                {currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId === null && !currentRoundBidsConfirmed && (
                    `Confirm bids in the table above to proceed...`
                )}
                {currentRoundInputMode === 'TAKING' && currentPlayerTakingId !== null && currentRoundBidsConfirmed && (
                    currentPlayerActiveName ? `${currentPlayerActiveName} is entering tricks...` : `Waiting for tricks taken...`
                )}
                {currentRoundInputMode === 'TAKING' && currentPlayerTakingId === null && currentRoundBidsConfirmed && currentRoundForInput <= gameRounds.length && (
                    `Processing Round ${currentRoundForInput}...`
                )}
                 {currentRoundInputMode === 'TAKING' && currentPlayerTakingId === null && currentRoundBidsConfirmed && currentRoundForInput > gameRounds.length && (
                    `Game Finished! View Results.`
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

