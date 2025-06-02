
"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlayerScoreData, GameRoundInfo, GamePhase, Player, CurrentRoundInputMode, ScoreInputTableProps, CascadingEditTarget } from '@/lib/types';
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
    if (cascadingEditTarget && onCascadedEditOpened && !isGameReallyOver) {
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
  }, [cascadingEditTarget, onCascadedEditOpened, editingCellDetails, isGameReallyOver]);


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
    if (isGameReallyOver) return; // Prevent edits if game is over

    const isCurrentActiveBidCell = roundNumber === currentRoundForInput && inputType === 'bid' && playerId === currentPlayerBiddingId && currentRoundInputMode === 'BIDDING';
    const isCurrentActiveTakeCell = roundNumber === currentRoundForInput && inputType === 'taken' && playerId === currentPlayerTakingId && currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed;
    
    if (isCurrentActiveBidCell || isCurrentActiveTakeCell) return; 
    if (roundNumber === currentRoundForInput && inputType === 'taken' && !currentRoundBidsConfirmed) return;

    setEditingCellDetails({ 
        playerId, 
        roundNumber, 
        inputType, 
        cardsForCell,
    });
  };
  
  const closeEditPopover = () => setEditingCellDetails(null);

  if (gamePhase === 'SCORING' && !currentRoundConfig && gameRounds.length > 0 && currentRoundForInput <= gameRounds.length ) return <p>Loading round configuration...</p>;

  const roundsToDisplay = gamePhase === 'RESULTS' ? gameRounds : gameRounds.filter(roundInfo => roundInfo.roundNumber <= currentRoundForInput);

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
      const dealerInfo = currentDealerName ? `(Dealer: ${currentDealerName})` : '';
      return `Score Sheet - Round ${currentRoundForInput} of ${gameRounds.length} (Cards: ${currentRoundConfig.cardsDealt}) ${dealerInfo} - ${phaseText}`;
    }
    return "Score Sheet";
  }

  const getTableCaption = () => {
    if (isGameReallyOver) return "Game Over! Final scores are displayed. Press 'Restart Game' to play again.";
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
    
    if (playerWhosePadIsBeingConfigured !== dealerForRelevantRoundId && !isHistoricEditContext) { 
        return (num_on_pad: number) => num_on_pad < 0 || num_on_pad > cardsDealt;
    }
    if (playerWhosePadIsBeingConfigured !== dealerForRelevantRoundId && isHistoricEditContext) {
        // For historic non-dealer edits, only basic boundary, cascade will handle sum issue
        return (num_on_pad: number) => num_on_pad < 0 || num_on_pad > cardsDealt;
    }


    // This player IS the dealer for the round in question (live or historic)
    // OR it's a historic edit, and we need to check if this edit by a non-dealer causes a sum problem.
    // The cascade for historic bids handles the *next* player if a non-dealer causes a sum issue.
    // The dealer themselves is directly restricted.
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
        // For historic non-dealer: if this edit makes sum === cardsDealt, it's fine for THIS player,
        // but the cascade will then target the next player (or the dealer with a restriction).
        // So, for this cell, it's only invalid if out of bounds.
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

    let sumOfTakesByPriorPlayersInOrder = 0;
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
      sumOfTakesByPriorPlayersInOrder += (scoreEntry?.taken ?? 0);
    }
    
    const tricksAvailableForAllocationFromThisPlayerOnwards = cardsDealt - sumOfTakesByPriorPlayersInOrder;

    return (num_on_pad: number) => {
      if (num_on_pad < 0 || num_on_pad > cardsDealt) return true; 

      if (isHistoricEditContext) {
        return false; // For historic edits, allow temporary imbalance which triggers cascade. Only basic bounds.
      }

      // Live input validation:
      if (playerWhosePadIsBeingConfigured === dealerForThisRound) { 
        return num_on_pad !== tricksAvailableForAllocationFromThisPlayerOnwards;
      } else {
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
                  <TableHead key={player.playerId} className="min-w-[120px] sm:min-w-[150px] text-center font-semibold">
                    {gamePhase === 'DEALER_SELECTION' && onSelectDealer ? (
                      <Button variant="ghost" className="w-full h-auto p-1 text-base hover:bg-primary/20" onClick={() => onSelectDealer(player.playerId)}>
                        <UserCheck className="mr-2 h-5 w-5 text-accent" /> {player.name}
                      </Button>
                    ) : (
                      <>
                        {player.name}
                        {!isGameReallyOver && currentDealerId === player.playerId && gamePhase === 'SCORING' && <UserCog className="ml-1 h-3 w-3 sm:h-4 sm:w-4 inline text-primary-foreground" title="Dealer" />}
                        {!isGameReallyOver && (isPlayerActiveForBidding(player.playerId) || isPlayerActiveForTaking(player.playerId)) && <Target className="ml-1 h-3 w-3 sm:h-4 sm:w-4 inline text-accent" title="Current Turn" />}
                      </>
                    )}
                  </TableHead>
                ))}
              </TableRow>
               {(gamePhase === 'SCORING' || gamePhase === 'RESULTS') && playersScoreData.length > 0 && (
                <TableRow className="border-b-0">
                  <TableHead className="py-1"></TableHead> {}
                  <TableHead className="py-1"></TableHead> {}
                  <TableHead 
                    colSpan={playersScoreData.length} 
                    className="text-center text-xs text-muted-foreground py-1 px-0"
                  >
                    Bid / Taken → Score 
                    {!isGameReallyOver && <Edit3 className="h-3 w-3 inline ml-1 opacity-50" title="Double-click past scores to edit"/>}
                  </TableHead>
                </TableRow>
              )}
            </TableHeader>
            {(gamePhase === 'SCORING' || gamePhase === 'RESULTS') && (currentRoundConfig || isGameReallyOver) && (
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
                        <TableCell className="font-medium">{roundInfo.roundNumber}</TableCell>
                        <TableCell>{roundInfo.cardsDealt}</TableCell>
                        {playersScoreData.map(player => {
                          const scoreEntry = player.scores.find(s => s.roundNumber === roundInfo.roundNumber);
                          const cellKey = `${player.playerId}-${roundInfo.roundNumber}`;
                          
                          const isActiveForBiddingLive = isCurrentDisplayRound && isPlayerActiveForBidding(player.playerId);
                          const isActiveForTakingLive = isCurrentDisplayRound && isPlayerActiveForTaking(player.playerId);
                          const showLiveInputPopover = isActiveForBiddingLive || isActiveForTakingLive;

                          const isEditingThisCellForHistoric = editingCellDetails?.playerId === player.playerId && editingCellDetails.roundNumber === roundInfo.roundNumber;
                          const isEditingHistoricBid = isEditingThisCellForHistoric && editingCellDetails.inputType === 'bid';
                          const isEditingHistoricTake = isEditingThisCellForHistoric && editingCellDetails.inputType === 'taken';
                          
                          const isBidInvalidCallback = getIsBidInvalid(roundInfo, player.playerId, isEditingHistoricBid);
                          const isTakenInvalidCallback = getIsTakenInvalid(roundInfo, player.playerId, isEditingHistoricTake);
                          
                          return (
                            <TableCell key={cellKey} className="text-center align-middle py-1 px-1 sm:px-2">
                              {showLiveInputPopover ? (
                                <Popover 
                                  open={showLiveInputPopover} 
                                  onOpenChange={(isOpen) => {
                                    if (!isOpen && showLiveInputPopover) { /* Managed by GameManager state */ }
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <div className="cursor-pointer py-2 flex flex-col items-center justify-center min-h-[50px] relative">
                                      {isActiveForBiddingLive && (
                                        <>
                                          <span className="text-xs sm:text-sm">Bid: {scoreEntry?.bid ?? '-'}</span>
                                          <span className="text-xs text-muted-foreground">Taken: -</span>
                                        </>
                                      )}
                                      {isActiveForTakingLive && (
                                        <>
                                          <span className="text-xs sm:text-sm">Bid: {scoreEntry?.bid ?? '-'}</span>
                                          <span className="text-xs sm:text-sm">Taken: {scoreEntry?.taken ?? '-'}</span>
                                        </>
                                      )}
                                       <Target className="h-3 w-3 sm:h-4 sm:w-4 text-accent absolute top-0 right-0 sm:relative sm:top-auto sm:right-auto sm:mt-0.5" title="Your Turn" />
                                    </div>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="center" side="bottom">
                                    <NumberInputPad 
                                      min={0} max={roundInfo.cardsDealt} 
                                      onSelectNumber={(val) => {
                                        if (isActiveForBiddingLive) onSubmitBid(player.playerId, val.toString());
                                        else if (isActiveForTakingLive) onSubmitTaken(player.playerId, val.toString());
                                      }}
                                      currentValue={isActiveForBiddingLive ? scoreEntry?.bid : scoreEntry?.taken}
                                      isNumberInvalid={isActiveForBiddingLive ? isBidInvalidCallback : isTakenInvalidCallback}
                                    />
                                  </PopoverContent>
                                </Popover>
                              ) : ( 
                                <div className="text-center text-xs sm:text-sm py-1">
                                  <Popover open={!isGameReallyOver && isEditingHistoricBid} onOpenChange={(isOpen) => { if (!isOpen) closeEditPopover(); }}>
                                    <PopoverTrigger asChild disabled={isGameReallyOver}>
                                      <span
                                        className={cn("cursor-pointer hover:bg-muted/50 px-0.5 sm:px-1 py-0.5 rounded-sm", isGameReallyOver && "cursor-default hover:bg-transparent")}
                                        onDoubleClick={!isGameReallyOver ? () => handleOpenEditPopover(player.playerId, roundInfo.roundNumber, 'bid', roundInfo.cardsDealt) : undefined}
                                      >
                                        {scoreEntry?.bid ?? '-'}
                                      </span>
                                    </PopoverTrigger>
                                    {editingCellDetails && isEditingHistoricBid && (
                                    <PopoverContent className="w-auto p-0" align="center" side="bottom">
                                      <NumberInputPad
                                        min={0} 
                                        max={editingCellDetails.cardsForCell} 
                                        currentValue={scoreEntry?.bid}
                                        isNumberInvalid={isBidInvalidCallback}
                                        onSelectNumber={(val) => {
                                          onEditHistoricScore(player.playerId, roundInfo.roundNumber, 'bid', val.toString());
                                          closeEditPopover();
                                        }}
                                      />
                                    </PopoverContent>
                                    )}
                                  </Popover>
                                  
                                  <span className="text-muted-foreground mx-0.5">/</span>
                                  
                                  <Popover open={!isGameReallyOver && isEditingHistoricTake} onOpenChange={(isOpen) => { if (!isOpen) closeEditPopover(); }}>
                                    <PopoverTrigger asChild disabled={isGameReallyOver}>
                                      <span
                                        className={cn("cursor-pointer hover:bg-muted/50 px-0.5 sm:px-1 py-0.5 rounded-sm", isGameReallyOver && "cursor-default hover:bg-transparent")}
                                        onDoubleClick={!isGameReallyOver ? () => {
                                           if (!(isCurrentDisplayRound && currentRoundInputMode === 'BIDDING' && !currentRoundBidsConfirmed)) {
                                              handleOpenEditPopover(player.playerId, roundInfo.roundNumber, 'taken', roundInfo.cardsDealt)
                                            }
                                        } : undefined}
                                      >
                                        {(isCurrentDisplayRound && currentRoundInputMode === 'BIDDING' && !currentRoundBidsConfirmed) ? '-' : (scoreEntry?.taken ?? '-')}
                                      </span>
                                    </PopoverTrigger>
                                    {editingCellDetails && isEditingHistoricTake && (
                                    <PopoverContent className="w-auto p-0" align="center" side="bottom">
                                      <NumberInputPad
                                        min={0} 
                                        max={editingCellDetails.cardsForCell} 
                                        currentValue={scoreEntry?.taken}
                                        isNumberInvalid={isTakenInvalidCallback} 
                                        onSelectNumber={(val) => {
                                          onEditHistoricScore(player.playerId, roundInfo.roundNumber, 'taken', val.toString());
                                          closeEditPopover();
                                        }}
                                      />
                                    </PopoverContent>
                                    )}
                                  </Popover>
                                  <span className="text-muted-foreground mx-0.5">→</span>
                                  <span className="font-medium">{scoreEntry?.roundScore ?? 0}</span>
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {!isGameReallyOver && isCurrentDisplayRound && gamePhase === 'SCORING' && currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId === null && !currentRoundBidsConfirmed && (
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
                    {playersScoreData.map(player => {
                      const rank = getPlayerRank(player.playerId);
                      let rankStyle = "text-primary-foreground";
                      let awardIcon = null;
                      if (isGameReallyOver) {
                          if (rank === 0) { rankStyle = "text-yellow-500 font-bold border-2 border-yellow-400 bg-yellow-500/10 rounded-md"; awardIcon = <Award className="inline-block h-5 w-5 ml-1 text-yellow-500" />; }
                          else if (rank === 1) { rankStyle = "text-slate-400 font-semibold"; }
                          else if (rank === 2) { rankStyle = "text-orange-400 font-semibold"; }
                      }
                      return (
                        <TableCell key={`total-${player.playerId}`} className={cn("text-center font-bold text-lg p-2", rankStyle)}>
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
          <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <Button onClick={onRestartGame} variant="outline" size="lg" className="w-full sm:w-auto">
              <RefreshCw className="mr-2 h-5 w-5" /> {isGameReallyOver ? "Play New Game" : "Restart Game"}
            </Button>
            
            {!isGameReallyOver && gamePhase === 'SCORING' && (
              <Button 
                  onClick={onFinishGame} 
                  variant="destructive" 
                  size="lg" 
                  className="w-full sm:w-auto"
                  disabled={
                    (currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId !== null && !currentRoundBidsConfirmed) || 
                    (currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId === null && !currentRoundBidsConfirmed) || 
                    (currentRoundInputMode === 'TAKING' && currentPlayerTakingId !== null && currentRoundBidsConfirmed) 
                  }
              >
                  <Flag className="mr-2 h-5 w-5" /> Finish Game Early
              </Button>
            )}
            
            {!isGameReallyOver && (
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
                      `All tricks taken for Round ${currentRoundForInput}. Processing...`
                  )}
                  {currentRoundInputMode === 'TAKING' && currentPlayerTakingId === null && currentRoundBidsConfirmed && currentRoundForInput > gameRounds.length && (
                      `Game Finished! View Results.`
                  )}
              </div>
            )}
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

