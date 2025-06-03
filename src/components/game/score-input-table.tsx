
"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlayerScoreData, GameRoundInfo, GamePhase, Player, CurrentRoundInputMode, CascadingEditTarget, ScoreInputTableProps } from '@/lib/types';
import { CheckCircle, RefreshCw, UserCheck, UserCog, Target, Edit3, Flag, Award } from 'lucide-react';
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

  const isGameReallyOver = gamePhase === 'RESULTS';

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
    if (isGameReallyOver && inputType === 'bid' && currentRoundInputMode === 'BIDDING' && playerId === currentPlayerBiddingId && !currentRoundBidsConfirmed && roundNumber === currentRoundForInput) return;
    if (isGameReallyOver && inputType === 'taken' && currentRoundInputMode === 'TAKING' && playerId === currentPlayerTakingId && currentRoundBidsConfirmed && roundNumber === currentRoundForInput) return;
    if (!isGameReallyOver && roundNumber === currentRoundForInput && inputType === 'taken' && !currentRoundBidsConfirmed) return;


    setEditingCellDetails({ 
        playerId, 
        roundNumber, 
        inputType, 
        cardsForCell,
    });
  };
  
  const closeEditPopover = () => setEditingCellDetails(null);

  if (gamePhase === 'SCORING' && !currentRoundConfig && gameRounds.length > 0 && currentRoundForInput <= gameRounds.length ) return <p>Loading round configuration...</p>;

  const roundsToDisplay = (isGameReallyOver || currentRoundForInput > gameRounds.length) && gameRounds.length > 0 
    ? gameRounds 
    : gameRounds.filter(roundInfo => roundInfo.roundNumber <= currentRoundForInput);


  const getHeaderTitle = () => {
    if (isGameReallyOver) return "Game Over - Final Scores";
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
        phaseText = currentPlayerTakingId ? `Taking: ${currentPlayerActiveName}'s turn` : `All Tricks Taken for Round ${currentRoundForInput}. Processing...`;
      }
      const dealerInfo = currentDealerName ? `(D: ${currentDealerName})` : '';
      return `Scores - R${currentRoundForInput}/${gameRounds.length} (C:${currentRoundConfig.cardsDealt}) ${dealerInfo} - ${phaseText}`;
    }
    return "Score Sheet";
  }

  const getTableCaption = () => {
    if (isGameReallyOver) return "Game Over! Final scores are displayed. Double-click score to correct. Press 'Restart Game' to play again.";
    if (gamePhase === 'DEALER_SELECTION') return "Click player's name to select as first dealer.";
    if (gamePhase === 'SCORING') {
      if (currentRoundInputMode === 'BIDDING') {
        if (currentPlayerBiddingId) return `Player ${currentPlayerActiveName || 'Next'} is bidding.`;
        if (!currentRoundBidsConfirmed) return `All bids for Round ${currentRoundForInput} are recorded. Click the green button below to confirm.`;
      }
      if (currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed) {
        if (currentPlayerTakingId) return `Player ${currentPlayerActiveName || 'Next'} is entering tricks taken.`;
        return `All tricks taken for Round ${currentRoundForInput} are entered. Game will proceed to next round or results. Double-click score to correct.`;
      }
      return "Double-click any score to correct past entries.";
    }
    return "";
  }
  
  const isPlayerActiveForBidding = (playerId: string) => !isGameReallyOver && currentRoundInputMode === 'BIDDING' && playerId === currentPlayerBiddingId && !currentRoundBidsConfirmed;
  const isPlayerActiveForTaking = (playerId: string) => !isGameReallyOver && currentRoundInputMode === 'TAKING' && playerId === currentPlayerTakingId && currentRoundBidsConfirmed;

  const getIsBidInvalid = (
    roundConfigForCheck: GameRoundInfo | undefined, 
    playerWhosePadIsBeingConfigured: string,
    isHistoricEditContext: boolean
  ): ((num_on_pad: number) => boolean) => {
    if (!roundConfigForCheck || !firstDealerPlayerId || playerOrderForGame.length === 0) {
      return () => false; 
    }
    const cardsDealt = roundConfigForCheck.cardsDealt;
    const roundNumForCheck = roundConfigForCheck.roundNumber;
    const order = playerOrderForGame;
    const numPlayers = order.length;

    let dealerForRelevantRoundId = null;
    const firstDealerBaseIndex = order.indexOf(firstDealerPlayerId);
    if (firstDealerBaseIndex === -1) return () => false; 
    
    dealerForRelevantRoundId = order[(firstDealerBaseIndex + roundNumForCheck - 1) % numPlayers];
    
    const sumOfOtherPlayerBids = playersScoreData.reduce((sum, pData) => {
        if (pData.playerId !== playerWhosePadIsBeingConfigured) { 
            const scoreEntry = pData.scores.find(s => s.roundNumber === roundNumForCheck);
            return sum + (scoreEntry?.bid ?? 0); 
        }
        return sum;
    }, 0);

    return (num_on_pad: number) => {
        if (num_on_pad < 0 || num_on_pad > cardsDealt) return true; 
        if (playerWhosePadIsBeingConfigured === dealerForRelevantRoundId) {
            return sumOfOtherPlayerBids + num_on_pad === cardsDealt; 
        }
        // For historic non-dealer edits, allow sum to be cardsDealt to trigger cascade
        // For live non-dealer bids, they are not the last, so this is fine (no specific rule violation for them alone)
        return false; 
    };
  };

  const getIsTakenInvalid = (
    roundConfigForCheck: GameRoundInfo | undefined, 
    playerWhosePadIsBeingConfigured: string,        
    isHistoricEditContext: boolean
  ): ((num_on_pad: number) => boolean) => {
    if (!roundConfigForCheck || !firstDealerPlayerId || playerOrderForGame.length === 0) {
      return () => false; 
    }
    const cardsDealt = roundConfigForCheck.cardsDealt;
    const roundNumForCheck = roundConfigForCheck.roundNumber;
    const order = playerOrderForGame;
    const numPlayers = order.length;

    const firstDealerBaseIndex = order.indexOf(firstDealerPlayerId);
    if (firstDealerBaseIndex === -1) return () => false; 
    
    const dealerIndexForRound = (firstDealerBaseIndex + roundNumForCheck - 1) % numPlayers;
    const dealerForThisRound = order[dealerIndexForRound];
    const firstDeclarerForThisRoundId = order[(dealerIndexForRound + 1) % numPlayers];
    
    if (!firstDeclarerForThisRoundId) return () => false; 

    let sumOfTakesByPlayersBeforeThisOneInOrder = 0;
    const firstDeclarerActualIndex = order.indexOf(firstDeclarerForThisRoundId);
    if (firstDeclarerActualIndex === -1) return () => false;

    for (let i = 0; i < numPlayers; i++) {
      const currentPlayerInSequenceIndex = (firstDeclarerActualIndex + i) % numPlayers;
      const currentPlayerInSequenceId = order[currentPlayerInSequenceIndex];

      if (currentPlayerInSequenceId === playerWhosePadIsBeingConfigured) {
        break; 
      }
      const pData = playersScoreData.find(ps => ps.playerId === currentPlayerInSequenceId);
      const scoreEntry = pData?.scores.find(s => s.roundNumber === roundNumForCheck);
      sumOfTakesByPlayersBeforeThisOneInOrder += (scoreEntry?.taken ?? 0);
    }
    
    const tricksAvailableForAllocationFromThisPlayerOnwards = cardsDealt - sumOfTakesByPlayersBeforeThisOneInOrder;

    return (num_on_pad: number) => {
      if (num_on_pad < 0 || num_on_pad > cardsDealt) return true; 

      if (isHistoricEditContext) {
         // For historic edits, only check basic bounds. Cascade handles sum.
         // The original request was *not* to prevent for historic, so this should be true only for out of bounds
         return false; // This effectively means only num_on_pad < 0 || num_on_pad > cardsDealt from above can make it true
      }

      // Live input validation:
      if (playerWhosePadIsBeingConfigured === dealerForThisRound) { // Last player to take
        return num_on_pad !== tricksAvailableForAllocationFromThisPlayerOnwards;
      } else { // Not the last player to take
        return num_on_pad > tricksAvailableForAllocationFromThisPlayerOnwards;
      }
    };
  };
  
  const sortedPlayersForResults = isGameReallyOver 
    ? [...playersScoreData].sort((a, b) => b.totalScore - a.totalScore)
    : playersScoreData;

  const getPlayerRank = (playerId: string): number => {
    if (!isGameReallyOver) return -1;
    return sortedPlayersForResults.findIndex(p => p.playerId === playerId);
  };


  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-base sm:text-lg text-center text-primary-foreground truncate px-2">
          {getHeaderTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-1 sm:px-2 md:px-4">
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>{getTableCaption()}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px] sm:w-[35px] font-semibold px-1 py-2 text-xs sm:text-sm">{gamePhase === 'DEALER_SELECTION' ? 'Players' : 'R/C'}</TableHead>
                {playersForDisplay.map(player => (
                  <TableHead key={player.playerId} className="min-w-[45px] sm:min-w-[55px] text-center font-semibold px-1 py-2 text-xs sm:text-sm truncate">
                    {gamePhase === 'DEALER_SELECTION' && onSelectDealer ? (
                      <Button variant="ghost" className="w-full h-auto p-0.5 text-xs sm:text-sm hover:bg-primary/20" onClick={() => onSelectDealer(player.playerId)}>
                        <UserCheck className="mr-1 h-4 w-4 text-accent" /> {player.name}
                      </Button>
                    ) : (
                      <>
                        {player.name}
                        {!isGameReallyOver && currentDealerId === player.playerId && gamePhase === 'SCORING' && <UserCog className="ml-0.5 h-3 w-3 inline text-primary-foreground" title="Dealer" />}
                        {!isGameReallyOver && (isPlayerActiveForBidding(player.playerId) || isPlayerActiveForTaking(player.playerId)) && <Target className="ml-0.5 h-3 w-3 inline text-accent" title="Current Turn" />}
                      </>
                    )}
                  </TableHead>
                ))}
              </TableRow>
               {(gamePhase === 'SCORING' || gamePhase === 'RESULTS') && playersScoreData.length > 0 && (
                <TableRow className="border-b-0">
                  <TableHead className="py-0.5 px-1"></TableHead> 
                  <TableHead 
                    colSpan={playersScoreData.length} 
                    className="text-center text-xs text-muted-foreground py-0.5 px-0"
                  >
                    B/T→S
                    {(gamePhase === 'SCORING' || gamePhase === 'RESULTS') && <Edit3 className="h-3 w-3 inline ml-0.5 opacity-50" title="Double-click scores to edit"/>}
                  </TableHead>
                </TableRow>
              )}
            </TableHeader>
            {(gamePhase === 'SCORING' || gamePhase === 'RESULTS') && (gameRounds.length > 0 || playersScoreData.length > 0 ) && (
              <>
                <TableBody>
                  {roundsToDisplay.map((roundInfo) => {
                    const isCurrentDisplayRound = !isGameReallyOver && roundInfo.roundNumber === currentRoundForInput;
                    
                    let sumOfTakenThisRoundForHighlight = 0;
                    let allTakesEnteredForHighlight = playersScoreData.every(pData => pData.scores.find(s => s.roundNumber === roundInfo.roundNumber)?.taken !== null);
                    if (allTakesEnteredForHighlight) {
                        playersScoreData.forEach(pData => {
                            const scoreEntry = pData.scores.find(s => s.roundNumber === roundInfo.roundNumber);
                            sumOfTakenThisRoundForHighlight += (scoreEntry?.taken ?? 0);
                        });
                    }
                    const isProblematicTakenSum = allTakesEnteredForHighlight && sumOfTakenThisRoundForHighlight !== roundInfo.cardsDealt;
                    
                    let sumOfBidsThisRoundForHighlight = 0;
                    let allBidsEnteredForHighlight = playersScoreData.every(pData => pData.scores.find(s => s.roundNumber === roundInfo.roundNumber)?.bid !== null);
                    if (allBidsEnteredForHighlight) {
                        playersScoreData.forEach(pData => {
                            const scoreEntry = pData.scores.find(s => s.roundNumber === roundInfo.roundNumber);
                            sumOfBidsThisRoundForHighlight += (scoreEntry?.bid ?? 0);
                        });
                    }
                    const isProblematicBidSum = allBidsEnteredForHighlight && sumOfBidsThisRoundForHighlight === roundInfo.cardsDealt;


                    return (
                    <React.Fragment key={roundInfo.roundNumber}>
                      <TableRow className={cn(
                        isCurrentDisplayRound && currentRoundInputMode === 'BIDDING' && !currentRoundBidsConfirmed ? 'bg-primary/10' : '',
                        isCurrentDisplayRound && currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed ? 'bg-secondary/10' : '',
                        !isCurrentDisplayRound && !isGameReallyOver ? 'opacity-80 hover:opacity-100' : '',
                        (isProblematicBidSum || isProblematicTakenSum) ? 'bg-destructive/10' : ''
                      )}>
                        <TableCell className="font-medium text-xs sm:text-sm px-1 py-0.5">{`${roundInfo.roundNumber}/${roundInfo.cardsDealt}`}</TableCell>
                        {playersScoreData.map(player => {
                          const scoreEntry = player.scores.find(s => s.roundNumber === roundInfo.roundNumber);
                          const cellKey = `${player.playerId}-${roundInfo.roundNumber}`;
                          
                          const isActiveForBiddingLive = isPlayerActiveForBidding(player.playerId) && roundInfo.roundNumber === currentRoundForInput;
                          const isActiveForTakingLive = isPlayerActiveForTaking(player.playerId) && roundInfo.roundNumber === currentRoundForInput;
                          const showLiveInputPopover = isActiveForBiddingLive || isActiveForTakingLive;

                          const isEditingThisCellForHistoric = editingCellDetails?.playerId === player.playerId && editingCellDetails.roundNumber === roundInfo.roundNumber;
                          const isEditingHistoricBid = isEditingThisCellForHistoric && editingCellDetails.inputType === 'bid';
                          const isEditingHistoricTake = isEditingThisCellForHistoric && editingCellDetails.inputType === 'taken';
                          
                          const isCellHistoricContext = roundInfo.roundNumber < currentRoundForInput || isGameReallyOver || 
                                                        (isCurrentDisplayRound && currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed && isEditingHistoricBid) || 
                                                        (isCurrentDisplayRound && currentRoundBidsConfirmed && isEditingHistoricTake && !isActiveForTakingLive); 


                          const isBidInvalidCallback = getIsBidInvalid(roundInfo, player.playerId, isCellHistoricContext);
                          const isTakenInvalidCallback = getIsTakenInvalid(roundInfo, player.playerId, isCellHistoricContext);
                          
                          return (
                            <TableCell key={cellKey} className="text-center align-middle py-0.5 px-0.5 sm:px-1">
                              <Popover 
                                open={showLiveInputPopover || (isEditingThisCellForHistoric ?? false)} 
                                onOpenChange={(isOpen) => {
                                  if (!isOpen) {
                                    if (showLiveInputPopover) { /* Managed by GameManager state */ }
                                    else if (isEditingThisCellForHistoric) closeEditPopover();
                                  }
                                }}
                              >
                                <PopoverTrigger asChild>
                                  <div 
                                    className="cursor-pointer py-1 flex flex-col items-center justify-center min-h-[38px] relative text-xs sm:text-sm"
                                    onDoubleClick={() => {
                                      if (!showLiveInputPopover && !(isCurrentDisplayRound && currentRoundInputMode === 'BIDDING' && !currentRoundBidsConfirmed && editingCellDetails?.inputType === 'taken')) {
                                        // Default to opening bid edit if not live and nothing else is set
                                        const typeToEdit = (isCurrentDisplayRound && currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed) || (scoreEntry?.bid !== null && scoreEntry?.taken === null && !isCurrentDisplayRound && !isGameReallyOver) ? 'taken' : 'bid';
                                        handleOpenEditPopover(player.playerId, roundInfo.roundNumber, typeToEdit, roundInfo.cardsDealt);
                                      }
                                    }}
                                  >
                                    {isActiveForBiddingLive && (
                                      <>
                                        <span>B:{scoreEntry?.bid ?? '-'}</span>
                                        <span className="text-muted-foreground">T:-</span>
                                      </>
                                    )}
                                    {isActiveForTakingLive && (
                                      <>
                                        <span>B:{scoreEntry?.bid ?? '-'}</span>
                                        <span>T:{scoreEntry?.taken ?? '-'}</span>
                                      </>
                                    )}
                                    {!showLiveInputPopover && (
                                      <>
                                        <span
                                          className={cn("cursor-pointer hover:bg-muted/50 px-0.5 py-0 rounded-sm", isEditingHistoricBid && "font-bold")}
                                          onDoubleClick={(e) => { e.stopPropagation(); handleOpenEditPopover(player.playerId, roundInfo.roundNumber, 'bid', roundInfo.cardsDealt);}}
                                        >
                                          {scoreEntry?.bid ?? '-'}
                                        </span>
                                        <span className="text-muted-foreground mx-0">/</span>
                                        <span
                                          className={cn("cursor-pointer hover:bg-muted/50 px-0.5 py-0 rounded-sm", isEditingHistoricTake && "font-bold")}
                                          onDoubleClick={(e) => { 
                                            e.stopPropagation();
                                            if (!(isCurrentDisplayRound && currentRoundInputMode === 'BIDDING' && !currentRoundBidsConfirmed)) {
                                               handleOpenEditPopover(player.playerId, roundInfo.roundNumber, 'taken', roundInfo.cardsDealt)
                                             }
                                          }}
                                        >
                                          {(isCurrentDisplayRound && currentRoundInputMode === 'BIDDING' && !currentRoundBidsConfirmed) ? '-' : (scoreEntry?.taken ?? '-')}
                                        </span>
                                        <span className="text-muted-foreground mx-0">→</span>
                                        <span className="font-medium">{scoreEntry?.roundScore ?? 0}</span>
                                      </>
                                    )}
                                     {showLiveInputPopover && <Target className="h-3 w-3 text-accent absolute top-0 right-0" title="Your Turn" />}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="center" side="bottom">
                                  <NumberInputPad 
                                    min={0} max={showLiveInputPopover ? roundInfo.cardsDealt : (editingCellDetails?.cardsForCell ?? roundInfo.cardsDealt)} 
                                    onSelectNumber={(val) => {
                                      if (isActiveForBiddingLive) onSubmitBid(player.playerId, val.toString());
                                      else if (isActiveForTakingLive) onSubmitTaken(player.playerId, val.toString());
                                      else if (editingCellDetails) {
                                        onEditHistoricScore(player.playerId, roundInfo.roundNumber, editingCellDetails.inputType, val.toString());
                                        closeEditPopover();
                                      }
                                    }}
                                    currentValue={
                                      isActiveForBiddingLive ? scoreEntry?.bid :
                                      isActiveForTakingLive ? scoreEntry?.taken :
                                      isEditingHistoricBid ? scoreEntry?.bid :
                                      isEditingHistoricTake ? scoreEntry?.taken : null
                                    }
                                    isNumberInvalid={
                                      isActiveForBiddingLive ? isBidInvalidCallback :
                                      isActiveForTakingLive ? isTakenInvalidCallback :
                                      isEditingHistoricBid ? getIsBidInvalid(roundInfo, player.playerId, true) :
                                      isEditingHistoricTake ? getIsTakenInvalid(roundInfo, player.playerId, true) : undefined
                                    }
                                  />
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {!isGameReallyOver && isCurrentDisplayRound && gamePhase === 'SCORING' && currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId === null && !currentRoundBidsConfirmed && (
                        <TableRow className="bg-card border-t border-b border-border">
                          <TableCell colSpan={1 + playersScoreData.length} className="text-center py-1 px-1">
                            <Button
                              onClick={onConfirmBidsForRound}
                              className="w-full max-w-xs mx-auto bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm font-semibold"
                              size="sm"
                            >
                              <CheckCircle className="mr-1 h-4 w-4" /> Confirm Bids &amp; Enter Tricks
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
                    <TableCell className="font-bold text-base sm:text-lg text-right px-1 py-1">Total</TableCell>
                    {playersScoreData.map(player => {
                      const rank = getPlayerRank(player.playerId);
                      let rankStyle = "text-primary-foreground";
                      let awardIcon = null;
                      if (isGameReallyOver) {
                          if (rank === 0) { rankStyle = "text-yellow-500 font-bold border border-yellow-400 bg-yellow-500/10 rounded"; awardIcon = <Award className="inline-block h-4 w-4 ml-0.5 text-yellow-500" />; }
                          else if (rank === 1) { rankStyle = "text-slate-400 font-semibold"; }
                          else if (rank === 2) { rankStyle = "text-orange-400 font-semibold"; }
                      }
                      return (
                        <TableCell key={`total-${player.playerId}`} className={cn("text-center font-bold text-base sm:text-lg p-1", rankStyle)}>
                          {player.totalScore} {awardIcon}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableFooter>
              </>
            )}
          </Table>
        </div>
        {(gamePhase === 'SCORING' || gamePhase === 'RESULTS') && (
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
            <Button onClick={onRestartGame} variant="outline" size="default" className="w-full sm:w-auto text-xs sm:text-sm">
              <RefreshCw className="mr-1 h-4 w-4" /> {isGameReallyOver ? "Play New Game" : "Restart Game"}
            </Button>
            
            {!isGameReallyOver && gamePhase === 'SCORING' && (
              <Button 
                  onClick={onFinishGame} 
                  variant="destructive" 
                  size="default" 
                  className="w-full sm:w-auto text-xs sm:text-sm"
                  disabled={
                    (currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId !== null && !currentRoundBidsConfirmed) || 
                    (currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId === null && !currentRoundBidsConfirmed) || 
                    (currentRoundInputMode === 'TAKING' && currentPlayerTakingId !== null && currentRoundBidsConfirmed) 
                  }
              >
                  <Flag className="mr-1 h-4 w-4" /> Finish Early
              </Button>
            )}
            
            {!isGameReallyOver && (
              <div className="flex-grow text-center p-1 text-muted-foreground h-9 items-center justify-center flex text-xs sm:text-sm">
                  {currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId !== null && !currentRoundBidsConfirmed && (
                      currentPlayerActiveName ? `${currentPlayerActiveName} bidding...` : `Waiting for bids...`
                  )}
                  {currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId === null && !currentRoundBidsConfirmed && (
                      `Confirm bids in the table to proceed...`
                  )}
                  {currentRoundInputMode === 'TAKING' && currentPlayerTakingId !== null && currentRoundBidsConfirmed && (
                      currentPlayerActiveName ? `${currentPlayerActiveName} entering tricks...` : `Waiting for tricks...`
                  )}
                  {currentRoundInputMode === 'TAKING' && currentPlayerTakingId === null && currentRoundBidsConfirmed && currentRoundForInput <= gameRounds.length && (
                      `Processing R${currentRoundForInput}...`
                  )}
                  {currentRoundInputMode === 'TAKING' && currentPlayerTakingId === null && currentRoundBidsConfirmed && currentRoundForInput > gameRounds.length && (
                      `Game Finished! View Results.`
                  )}
              </div>
            )}
          </div>
        )}
        {gamePhase === 'DEALER_SELECTION' && (
          <div className="mt-4 flex justify-end items-center gap-4">
            <Button onClick={onRestartGame} variant="outline" size="default">
              <RefreshCw className="mr-1 h-4 w-4" /> Back to Setup
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

