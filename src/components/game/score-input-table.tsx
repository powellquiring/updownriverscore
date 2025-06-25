"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlayerScoreData, GameRoundInfo, GamePhase, Player, CurrentRoundInputMode, ScoreInputTableProps, RoundScoreEntry } from '@/lib/types';
import { RefreshCw, UserCheck, UserCog, Target, Flag, Award, Edit, Edit2, MessageSquare, Hand } from 'lucide-react';
import { NumberInputPad } from './number-input-pad';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  bidPoints,
  onSubmitBid,
  onSubmitTaken,
  onConfirmBidsForRound,
  onAdvanceRoundOrEndGame,
  onFinishGame,
  onRestartGame,
  onSelectDealer,
  // Edit mode props
  isEditingCurrentRound,
  editingPlayerId,
  isPlayerValueUnderActiveEdit,
  onToggleEditMode,
  onKeepPlayerValue,
  onSetActiveEditPlayerValue,
  onEditSpecificRound,
  onUndoPreviousPlayer,
  isGameOver,
}: ScoreInputTableProps) {
  // Add state for the confirmation dialog
  const [showRestartConfirmation, setShowRestartConfirmation] = useState(false);
  
  // Add a handler for the restart button click
  const handleRestartClick = useCallback(() => {
    setShowRestartConfirmation(true);
  }, []);

  // Add a handler for confirming restart
  const handleConfirmRestart = useCallback(() => {
    setShowRestartConfirmation(false);
    onRestartGame();
  }, [onRestartGame]);
  
  // Add a direct restart handler for the "Back to Setup" button
  const handleDirectRestart = useCallback(() => {
    onRestartGame();
  }, [onRestartGame]);

  const isDealerForRound = useCallback((
    playerId: string,
    roundNumber: number,
    firstDealerId: string | null,
    playerOrder: string[]
  ): boolean => {
    if (roundNumber === 1 && playerId === firstDealerId) {
      return true;
    }

    if (!firstDealerId || playerOrder.length === 0) {
      return false;
    }

    const firstDealerIndex = playerOrder.indexOf(firstDealerId);
    if (firstDealerIndex === -1) return false;

    const dealerIndexForRound = (firstDealerIndex + (roundNumber - 1)) % playerOrder.length;
    return playerId === playerOrder[dealerIndexForRound];
  }, []);

  const currentRoundConfig = gameRounds.find(r => r.roundNumber === currentRoundForInput);
  const playersForDisplay = gamePhase === 'DEALER_SELECTION' ? allPlayers.map(p => ({ ...p, playerId: p.id, name: p.name, scores: [], totalScore: 0 })) : playersScoreData;

  const getIsBidInvalid = useCallback((
    roundConfigForCheck: GameRoundInfo | undefined,
    playerWhosePadIsBeingConfigured: string
  ): ((num_on_pad: number) => boolean) => {
    if (!roundConfigForCheck || playerOrderForGame.length === 0) {
      return () => false;
    }
    const cardsDealt = roundConfigForCheck.cardsDealt;
    const roundNumForCheck = roundConfigForCheck.roundNumber;

    const dealerForRelevantRoundId = currentDealerId;
    if (!dealerForRelevantRoundId) return () => false;

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
        return false;
    };
  }, [playersScoreData, playerOrderForGame, currentDealerId]);

  function idToOrder (playerId: string): number {
      return playerOrderForGame.indexOf(playerId);
  }
  
  // retrieve the RoundScoreEntries for all players in the bidding order up to but not including the player whose pad is being configured
  function previousRoundScoreEntries( roundConfigForCheck: GameRoundInfo, player: string, firstInRound: string) : RoundScoreEntry[] {
      const order = playerOrderForGame;
      const startIndex = order.indexOf(firstInRound);
      const roundNumForCheck = roundConfigForCheck.roundNumber;
      let ret: RoundScoreEntry[] = []
      for (let i = 0; i < order.length; i++) {
        const currentIndexInOrder = (startIndex + i) % order.length;
        const currentPlayerInSequenceId = order[currentIndexInOrder];

        if (currentPlayerInSequenceId === player) {
          break; 
        }

        const scoreEntry = playersScoreData
          .find(pData => pData.playerId === currentPlayerInSequenceId) ?.scores.find(s => s.roundNumber === roundNumForCheck);
        
        if (scoreEntry) {
          ret.push(scoreEntry)
        }
      }
      return ret
  }

  const getIsTakenInvalid = useCallback((
    roundConfigForCheck: GameRoundInfo | undefined,
    playerWhosePadIsBeingConfigured: string
  ): ((num_on_pad: number) => boolean) => {
    if (!roundConfigForCheck || playerOrderForGame.length === 0 || !currentDealerId || !firstBidderOfRoundId) {
      return () => false;
    }
    const cardsDealt = roundConfigForCheck.cardsDealt;
    const dealerForThisRound = currentDealerId;

    let sumOfTakenByPrecedingPlayersInTurnOrder = 0;
    for (const scoreEntry of previousRoundScoreEntries( roundConfigForCheck, playerWhosePadIsBeingConfigured, firstBidderOfRoundId)) {
          sumOfTakenByPrecedingPlayersInTurnOrder += (scoreEntry.taken ?? 0);
    }

    return (num_on_pad: number) => {
        if (num_on_pad < 0) return true;
        const totalIfCurrentPlayerTakesNumOnPad = sumOfTakenByPrecedingPlayersInTurnOrder + num_on_pad;
        if (playerWhosePadIsBeingConfigured === dealerForThisRound) {
            return sumOfTakenByPrecedingPlayersInTurnOrder + num_on_pad !== cardsDealt;
        } else {
        return totalIfCurrentPlayerTakesNumOnPad > cardsDealt;
        }
    };
  }, [playersScoreData, playerOrderForGame, currentDealerId, firstBidderOfRoundId]);

  const currentDealerName = allPlayers.find(p => p.id === currentDealerId)?.name;
  let currentPlayerActiveName = '';
  let activePlayerIdForColumnHighlight: string | null = null;

  if (gamePhase === 'SCORING') {
    if (isEditingCurrentRound && editingPlayerId) {
        currentPlayerActiveName = allPlayers.find(p => p.id === editingPlayerId)?.name || '';
        activePlayerIdForColumnHighlight = editingPlayerId;
    } else if (currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId && !currentRoundBidsConfirmed) {
      currentPlayerActiveName = allPlayers.find(p => p.id === currentPlayerBiddingId)?.name || '';
      activePlayerIdForColumnHighlight = currentPlayerBiddingId;
    } else if (currentRoundInputMode === 'TAKING' && currentPlayerTakingId && currentRoundBidsConfirmed) {
      currentPlayerActiveName = allPlayers.find(p => p.id === currentPlayerTakingId)?.name || '';
      activePlayerIdForColumnHighlight = currentPlayerTakingId;
    }
  }


  if (gamePhase === 'SCORING' && !currentRoundConfig && gameRounds.length > 0 && currentRoundForInput <= gameRounds.length ) return <p>Loading round configuration...</p>;

  const roundsToDisplay = (isGameOver && gameRounds.length > 0)
    ? gameRounds
    : gameRounds.filter(roundInfo => roundInfo.roundNumber <= currentRoundForInput);


  const getHeaderTitle = () => {
    if (gamePhase === 'DEALER_SELECTION') {
      return "Select First Dealer";
    }

    if (gamePhase === 'SCORING') {
      if (isGameOver && gameRounds.length > 0) {
        return "Final Scores";
      }

      if (!currentRoundConfig) {
        return "Loading Round...";
      }

      const cardsDealt = currentRoundConfig.cardsDealt;
      let playerCurrentValue: string | number | null = null;

      if (isEditingCurrentRound && editingPlayerId) {
        const playerBeingEditedName = allPlayers.find(p => p.id === editingPlayerId)?.name || "Player";
        const editType = currentRoundInputMode === 'BIDDING' ? "Bid" : "Tricks";
        const scoreEntry = playersScoreData.find(p => p.playerId === editingPlayerId)
          ?.scores.find(s => s.roundNumber === currentRoundForInput);
        if (currentRoundInputMode === 'BIDDING') {
          playerCurrentValue = (typeof scoreEntry?.bid === 'number' ? scoreEntry.bid : null);
        } else {
          playerCurrentValue = (typeof scoreEntry?.taken === 'number' ? scoreEntry.taken : null);
        }
        return `Editing ${editType} for ${playerBeingEditedName} - ${cardsDealt} cards / ${playerCurrentValue ?? '-'}`;
      }

      if (currentRoundInputMode === 'BIDDING') {
        if (currentPlayerBiddingId && firstBidderOfRoundId) {
          const currentBidTotal = previousRoundScoreEntries( currentRoundConfig, currentPlayerBiddingId, firstBidderOfRoundId).reduce((sum, scoreEntry) => sum + (scoreEntry.bid ?? 0), 0);
          return `Bidding: ${currentPlayerActiveName} - bids left: ${cardsDealt - currentBidTotal}`;
        } else if (!currentRoundBidsConfirmed) {
          return `Bids Complete - ${cardsDealt} cards. Ready for Tricks.`;
        }
      } else if (currentRoundInputMode === 'TAKING') {
        if (currentPlayerTakingId && firstBidderOfRoundId) {
          const currentTakeTotal = previousRoundScoreEntries( currentRoundConfig, currentPlayerTakingId, firstBidderOfRoundId).reduce((sum, scoreEntry) => sum + (scoreEntry.taken ?? 0), 0);
          return `Taking: ${currentPlayerActiveName} - tricks left: ${cardsDealt - currentTakeTotal}`;
        } else if (currentRoundBidsConfirmed) {
          const isLastRound = currentRoundForInput === gameRounds.length;
          const nextActionText = isLastRound ? "Ready for Final Scores." : "Ready for Next Round.";
          return `Tricks Complete - ${cardsDealt} cards. ${nextActionText}`;
        }
      }
      
      if (currentRoundInputMode === 'BIDDING' && !currentPlayerBiddingId && !currentRoundBidsConfirmed) {
          return `Bids Complete - ${cardsDealt} cards. Ready for Tricks.`;
      }
      if (currentRoundInputMode === 'TAKING' && !currentPlayerTakingId && currentRoundBidsConfirmed) {
          const isLastRound = currentRoundForInput === gameRounds.length;
          const nextActionText = isLastRound ? "Ready for Final Scores." : "Ready for Next Round.";
          return `Tricks Complete - ${cardsDealt} cards. ${nextActionText}`;
      }
      return `Round ${currentRoundForInput} (${cardsDealt} cards)`;
    }
    return "Score Sheet";
  };


  const getTableCaption = () => {
    if (isGameOver && gameRounds.length > 0) return "Game Over! Final scores are displayed. Press 'Restart Game' to play again.";
    if (gamePhase === 'DEALER_SELECTION') return "Click player's name to select as first dealer.";
    if (gamePhase === 'SCORING') {
      if (isEditingCurrentRound && !isPlayerValueUnderActiveEdit && editingPlayerId) {
        return `Reviewing entry for ${allPlayers.find(p=>p.id === editingPlayerId)?.name}. Choose Keep, Edit, or Cancel.`;
      }
      return "Live scores for the current game.";
    }
    return "";
  }

  const isPlayerActiveForBiddingLive = (playerId: string, roundNumber: number) => gamePhase === 'SCORING' && !isEditingCurrentRound && currentRoundInputMode === 'BIDDING' && playerId === currentPlayerBiddingId && !currentRoundBidsConfirmed && roundNumber === currentRoundForInput;
  const isPlayerActiveForTakingLive = (playerId: string, roundNumber: number) => gamePhase === 'SCORING' && !isEditingCurrentRound && currentRoundInputMode === 'TAKING' && playerId === currentPlayerTakingId && currentRoundBidsConfirmed && roundNumber === currentRoundForInput;
  const isPlayerActiveForEditingLive = (playerId: string, roundNumber: number) => gamePhase === 'SCORING' && isEditingCurrentRound && isPlayerValueUnderActiveEdit && playerId === editingPlayerId && roundNumber === currentRoundForInput;


  const sortedPlayersForDisplay = [...playersScoreData].sort((a, b) => b.totalScore - a.totalScore);

  const getPlayerRank = (playerId: string): number => {
    const playerList = sortedPlayersForDisplay;
    return playerList.findIndex(p => p.playerId === playerId);
  };

  let numPadCurrentValue: number | null = null;
  let numPadIsInvalidFn: ((num: number) => boolean) | undefined = undefined;
  let numPadActionText = "";
  let numPadPlayerName = "";
  let numPadDisabledGlobally = true;

  let showConfirmBidsButton = false;
  let showAdvanceRoundButton = false;
  let mainActionButtonText = "";

  let activeEditingPlayerName = "";
  let activeEditingPlayerCurrentValue: number | string = "N/A";

  const disableKeepAndNextDueToRuleViolation = (): boolean => {
    if (!isEditingCurrentRound || isPlayerValueUnderActiveEdit || !editingPlayerId || !currentRoundConfig) {
      return false;
    }

    if (currentRoundInputMode === 'BIDDING' && editingPlayerId === currentDealerId) {
      let sumOfBidsIfKept = 0;
      playersScoreData.forEach(pData => {
        const currentRoundScoreEntry = pData.scores.find(s => s.roundNumber === currentRoundForInput);
        sumOfBidsIfKept += (currentRoundScoreEntry?.bid ?? 0);
      });
      return sumOfBidsIfKept === currentRoundConfig.cardsDealt;
    }
    else if (currentRoundInputMode === 'TAKING') {
      if (!firstBidderOfRoundId) return false;
      const currentTakeTotal = previousRoundScoreEntries( currentRoundConfig, editingPlayerId, firstBidderOfRoundId).reduce((sum, scoreEntry) => sum + (scoreEntry.taken ?? 0), 0);
      if (editingPlayerId === currentDealerId) {
        return currentTakeTotal  + (activeEditingPlayerCurrentValue as number) !== currentRoundConfig.cardsDealt;
      } else {
        return currentTakeTotal  + (activeEditingPlayerCurrentValue as number) > currentRoundConfig.cardsDealt;
      }
    }
    return false;
  };

  const getNextDealerName = useCallback(() => {
    if (!currentDealerId || playerOrderForGame.length === 0) return "";
    const currentDealerIndex = playerOrderForGame.indexOf(currentDealerId);
    if (currentDealerIndex === -1) return "";
    const nextDealerIndex = (currentDealerIndex + 1) % playerOrderForGame.length;
    const nextDealerId = playerOrderForGame[nextDealerIndex];
    return allPlayers.find(p => p.id === nextDealerId)?.name || "";
  }, [currentDealerId, playerOrderForGame, allPlayers]);

  if (gamePhase === 'SCORING' && currentRoundConfig) {
    if (isEditingCurrentRound && editingPlayerId && onKeepPlayerValue && onSetActiveEditPlayerValue && onToggleEditMode) {
      numPadDisabledGlobally = !isPlayerValueUnderActiveEdit;
      const player = playersScoreData.find(p => p.playerId === editingPlayerId);
      activeEditingPlayerName = allPlayers.find(p => p.id === editingPlayerId)?.name || "";
      const scoreEntry = player?.scores.find(s => s.roundNumber === currentRoundForInput);

      if (currentRoundInputMode === 'BIDDING') {
        activeEditingPlayerCurrentValue = (typeof scoreEntry?.bid === 'number' ? scoreEntry.bid : '-');
        numPadActionText = `Editing Bid for ${activeEditingPlayerName}`;
        numPadCurrentValue = (typeof scoreEntry?.bid === 'number' ? scoreEntry.bid : null);
        numPadIsInvalidFn = getIsBidInvalid(currentRoundConfig, editingPlayerId);
      } else {
        activeEditingPlayerCurrentValue = (typeof scoreEntry?.taken === 'number' ? scoreEntry.taken : '-');
        numPadActionText = `Editing Tricks for ${activeEditingPlayerName}`;
        numPadCurrentValue = (typeof scoreEntry?.taken === 'number' ? scoreEntry.taken : null);
        numPadIsInvalidFn = getIsTakenInvalid(currentRoundConfig, editingPlayerId);
      }

    } else if (currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId) {
      numPadDisabledGlobally = false;
      const player = playersScoreData.find(p => p.playerId === currentPlayerBiddingId);
      const bidValue = player?.scores.find(s => s.roundNumber === currentRoundForInput)?.bid;
      numPadCurrentValue = (typeof bidValue === 'number' ? bidValue : null);
      numPadIsInvalidFn = getIsBidInvalid(currentRoundConfig, currentPlayerBiddingId);
      numPadPlayerName = allPlayers.find(p => p.id === currentPlayerBiddingId)?.name || "";
      // numPadActionText = `Bid: ${numPadPlayerName}`;
      numPadActionText = getHeaderTitle();
    } else if (currentRoundInputMode === 'TAKING' && currentPlayerTakingId) {
      numPadDisabledGlobally = false;
      const player = playersScoreData.find(p => p.playerId === currentPlayerTakingId);
      const takenValue = player?.scores.find(s => s.roundNumber === currentRoundForInput)?.taken;
      numPadCurrentValue = (typeof takenValue === 'number' ? takenValue : null);
      numPadIsInvalidFn = getIsTakenInvalid(currentRoundConfig, currentPlayerTakingId);
      numPadPlayerName = allPlayers.find(p => p.id === currentPlayerTakingId)?.name || "";
      numPadActionText = getHeaderTitle();
    } else if (currentRoundInputMode === 'BIDDING' && !currentPlayerBiddingId && !currentRoundBidsConfirmed) {
        showConfirmBidsButton = true;
        mainActionButtonText = "Enter Tricks";
        numPadActionText = "";
        numPadDisabledGlobally = true;
    } else if (currentRoundInputMode === 'TAKING' && !currentPlayerTakingId && currentRoundBidsConfirmed) {
        // Only show advance round button if not game over
        if (currentRoundForInput < gameRounds.length) {
          showAdvanceRoundButton = true;
          const nextDealerName = getNextDealerName();
          const cardsDealtNextRound = gameRounds.find(r => r.roundNumber === currentRoundForInput + 1)?.cardsDealt || '';
          mainActionButtonText = `${nextDealerName}: Deal ${cardsDealtNextRound} cards`;
        } else {
          showAdvanceRoundButton = false;
          mainActionButtonText = '';
        }
        numPadActionText = "";
        numPadDisabledGlobally = true;
    } else {
        numPadDisabledGlobally = true;
        numPadActionText = " ";
    }
  }


  return (
    <Card className="shadow-xl flex flex-col" style={{ minHeight: 'calc(100vh - 10rem)' }}>
      <CardContent className="px-0.5 sm:px-1 md:px-1 py-1 sm:py-2 flex-grow overflow-y-auto">
        <div className="overflow-x-auto">
          <Table>
             <TableCaption
              className={cn(
                "mt-1 mb-1",
                gamePhase === 'DEALER_SELECTION'
                  ? "text-xl text-primary-foreground font-semibold"
                  : "text-xs text-muted-foreground"
              )}
            >
              {getTableCaption()}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[10px] sm:w-[15px] font-semibold px-0.5 py-0.5 text-xs text-center">{gamePhase === 'DEALER_SELECTION' ? 'Players' : 'R/C'}</TableHead>
                {playersForDisplay.map(player => (
                  <TableHead
                    key={player.playerId}
                    className={cn(
                        "min-w-[15px] sm:min-w-[25px] text-center font-semibold px-0.5 py-0.5 text-xs truncate",
                        player.playerId === activePlayerIdForColumnHighlight && "bg-secondary/30"
                    )}
                   >
                    {gamePhase === 'DEALER_SELECTION' && onSelectDealer ? (
                      <Button 
                        variant="outline" 
                        className="w-full h-auto py-2 px-3 text-sm font-medium hover:bg-primary/20 hover:text-primary" 
                        onClick={() => onSelectDealer(player.playerId)}
                      >
                        <UserCheck className="mr-1 h-4 w-4 text-accent" /> {player.name}
                      </Button>
                    ) : (
                      <>
                        {player.name}
                        {currentDealerId === player.playerId && gamePhase === 'SCORING' && <UserCog className="ml-0.5 h-2 w-2 sm:h-3 sm:w-3 inline text-primary-foreground/80" />}
                        {(isPlayerActiveForBiddingLive(player.playerId, currentRoundForInput) || isPlayerActiveForTakingLive(player.playerId, currentRoundForInput) || isPlayerActiveForEditingLive(player.playerId, currentRoundForInput)) && <Target className="ml-0.5 h-2 w-2 sm:h-3 sm:w-3 inline text-accent" />}
                      </>
                    )}
                  </TableHead>
                ))}
              </TableRow>
               {(gamePhase === 'SCORING' || (isGameOver && gameRounds.length > 0)) && playersScoreData.length > 0 && (
                 <TableRow className="border-b-0">
                    <TableHead
                        className="text-xs text-left text-muted-foreground py-0 px-0.5 sm:px-1"
                    >
                        <span><strong>R</strong>ound/<strong>C</strong>ard</span>
                    </TableHead>
                    <TableHead
                        colSpan={playersScoreData.length}
                        className="text-xs text-center text-muted-foreground py-0 px-0.5 sm:px-1"
                    >
                        <span className="flex items-center justify-center">Bid/Take-&gt;Score</span>
                    </TableHead>
                </TableRow>
              )}
            </TableHeader>
            {(gamePhase === 'SCORING' || (isGameOver && gameRounds.length > 0)) && (gameRounds.length > 0 || playersScoreData.length > 0 ) && (
              <>
                <TableBody>
                  {roundsToDisplay.map((roundInfo) => {
                    const isCurrentDisplayRound = gamePhase === 'SCORING' && roundInfo.roundNumber === currentRoundForInput;

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
                        isCurrentDisplayRound && currentRoundInputMode === 'BIDDING' && !currentRoundBidsConfirmed && !isEditingCurrentRound ? 'bg-primary/10' : '',
                        isCurrentDisplayRound && currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed && !isEditingCurrentRound ? 'bg-secondary/10' : '',
                        isCurrentDisplayRound && isEditingCurrentRound ? 'bg-yellow-500/10' : '',
                        ((isProblematicBidSum || isProblematicTakenSum) && (!isCurrentDisplayRound || (isCurrentDisplayRound && currentRoundBidsConfirmed && !isEditingCurrentRound ))) ? 'opacity-80 hover:opacity-100 bg-destructive/10' : '',
                        (isProblematicBidSum || isProblematicTakenSum) && (isCurrentDisplayRound && !currentRoundBidsConfirmed && currentRoundInputMode === 'BIDDING' && allBidsEnteredForHighlight && !isEditingCurrentRound) ? 'bg-destructive/10' : ''
                      )}>
                        <TableCell className="font-medium text-xs px-0.5 py-0 text-center">
                           <div className="flex items-center justify-center gap-0.5">
                            {`${roundInfo.roundNumber}/${roundInfo.cardsDealt}`}
                            {gamePhase === 'SCORING' &&
                              onEditSpecificRound &&
                              !isEditingCurrentRound &&
                              roundInfo.roundNumber <= currentRoundForInput &&
                              currentRoundForInput <= gameRounds.length && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 p-0 opacity-70 hover:opacity-100"
                                    aria-label={`Edit round ${roundInfo.roundNumber}`}
                                  >
                                    <Edit2 className="h-2.5 w-2.5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2">
                                  <div className="flex flex-col gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex items-center justify-start text-xs"
                                      onClick={() => onEditSpecificRound(roundInfo.roundNumber, 'BIDDING')}
                                    >
                                      <MessageSquare className="h-3 w-3 mr-1" /> Edit Bids
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex items-center justify-start text-xs"
                                      onClick={() => onEditSpecificRound(roundInfo.roundNumber, 'TAKING')}
                                    >
                                      <Hand className="h-3 w-3 mr-1" /> Edit Tricks
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        </TableCell>
                        {playersScoreData.map(player => {
                          const scoreEntry = player.scores.find(s => s.roundNumber === roundInfo.roundNumber);
                          if (scoreEntry === undefined) {
                            console.error(`Error: Score entry not found for player ${player.playerId} in round ${roundInfo.roundNumber}`);
                            return null;
                          }

                          const dealerForThisSpecificRound = isDealerForRound(player.playerId, roundInfo.roundNumber, firstDealerPlayerId, playerOrderForGame);
                          let isPreviousDealer = false;
                          if (roundInfo.roundNumber > 1 && firstDealerPlayerId && playerOrderForGame.length > 0) {
                            const firstDealerIndex = playerOrderForGame.indexOf(firstDealerPlayerId);
                            const prevDealerIndex = (firstDealerIndex + (roundInfo.roundNumber - 2)) % playerOrderForGame.length;
                            const prevDealerId = playerOrderForGame[prevDealerIndex];
                            isPreviousDealer = player.playerId === prevDealerId && !dealerForThisSpecificRound;
                          }

                          const isActiveForBidding = isPlayerActiveForBiddingLive(player.playerId, roundInfo.roundNumber);
                          const isActiveForTaking = isPlayerActiveForTakingLive(player.playerId, roundInfo.roundNumber);
                          const isActiveForEditing = isPlayerActiveForEditingLive(player.playerId, roundInfo.roundNumber);

                          const bidText = scoreEntry?.bid !== null ? scoreEntry.bid.toString() : '-';
                          const takenText = scoreEntry?.taken !== null ? scoreEntry.taken.toString() : '-';
                          const scoreText = scoreEntry?.roundScore.toString() ?? '0';

                          return (
                            <TableCell key={`${player.playerId}-${roundInfo.roundNumber}`}
                                className={cn(
                                    "text-center align-middle py-0 px-0",
                                    player.playerId === activePlayerIdForColumnHighlight && "bg-secondary/30",
                                    dealerForThisSpecificRound && "bg-primary/20 border-l border-r border-primary/30",
                                    isPreviousDealer && "bg-primary/40 border-l border-r border-primary/40"
                                )}
                            >
                                  <div
                                    className="py-0 flex items-center justify-center min-h-[24px] relative text-xs"
                                  >
                                    {(isActiveForBidding || (isActiveForEditing && currentRoundInputMode === 'BIDDING')) && (
                                        <span className="flex items-center justify-center">
                                            B:
                                            <span className={cn(bidText === '-' ? "text-muted-foreground" : "", bidText !== '-' && "px-0.5")}>{bidText}</span>
                                            {takenText !== '-' && <span>/T:<span className={cn(takenText !== '-' && "px-0.5")}>{takenText}</span></span>}
                                            <Target className="h-2 w-2 sm:h-3 sm:w-3 text-accent ml-0.5" />
                                        </span>
                                    )}
                                    {(isActiveForTaking || (isActiveForEditing && currentRoundInputMode === 'TAKING')) && !isActiveForBidding && !(isActiveForEditing && currentRoundInputMode === 'BIDDING') && (
                                        <span className="flex items-center justify-center">
                                            <span className={cn(bidText === '-' ? "text-muted-foreground" : "", bidText !== '-' && "px-0.5")}>{bidText}</span>
                                            <span>/T:</span>
                                            <span className={cn(takenText === '-' ? "text-muted-foreground" : "", takenText !== '-' && "px-0.5")}>{takenText}</span>
                                            <Target className="h-2 w-2 sm:h-3 sm:w-3 text-accent ml-0.5"/>
                                        </span>
                                    )}
                                    {!isActiveForBidding && !isActiveForTaking && !isActiveForEditing && (
                                        <span className="flex items-center justify-center">
                                            <span className={cn(bidText === '-' ? "text-muted-foreground" : "", bidText !== '-' && "px-0.5")}>{bidText}</span>
                                            <span>/</span>
                                            <span className={cn(takenText === '-' ? "text-muted-foreground" : "", takenText !== '-' && "px-0.5")}>{takenText}</span>
                                            <span>→{scoreText}</span>
                                        </span>
                                    )}
                                  </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-card border-t-2 border-primary">
                    <TableCell className="font-bold text-xs sm:text-sm text-right px-0.5 py-0.5">Total</TableCell>
                    {playersScoreData.map(player => {
                      const rank = getPlayerRank(player.playerId);
                      
                      // Calculate score difference as percentage of top score
                      const topScore = sortedPlayersForDisplay[0]?.totalScore || 0;
                      const playerScore = player.totalScore;
                      const scoreDifference = topScore > 0 ? (topScore - playerScore) / topScore : 0;

                      // Use algebra to determine the shade number (600 to 100)
                      // Formula: 600 - (scoreDifference * 500)
                      // This gives 600 for 0% difference and 100 for 100% difference
                      const shadeNumber = Math.max(100, Math.min(600, Math.round(600 - (scoreDifference * 500))));

                      // Map the calculated shade to specific Tailwind classes
                      let bgColorClass = "";
                      if (shadeNumber >= 600) bgColorClass = "bg-emerald-600";
                      else if (shadeNumber >= 500) bgColorClass = "bg-emerald-500";
                      else if (shadeNumber >= 400) bgColorClass = "bg-emerald-400";
                      else if (shadeNumber >= 300) bgColorClass = "bg-emerald-300";
                      else if (shadeNumber >= 200) bgColorClass = "bg-emerald-200";
                      else bgColorClass = "bg-emerald-100";

                      return (
                        <TableCell
                          key={`total-${player.playerId}`}
                          className={cn(
                            "text-center font-bold p-0.5",
                            bgColorClass
                          )}
                        >
                          <span className="inline-block bg-white text-foreground px-2 py-0.5 rounded-sm text-xs sm:text-sm">
                            {player.totalScore}
                          </span>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableFooter>
              </>
            )}
          </Table>
        </div>
      </CardContent>

      {gamePhase === 'SCORING' && (
        <div id="control-panel-sticky-footer" className="mt-auto p-1 sm:p-2 md:p-3 border-t bg-background sticky bottom-0 shadow-md z-10">
           <div id="control-panel-main-flex-container" className="flex flex-row items-center justify-start gap-3 w-full">

                <div id="action-button-or-numpad-container" className={cn(
                    (showConfirmBidsButton || showAdvanceRoundButton || (isEditingCurrentRound && !isPlayerValueUnderActiveEdit))
                        ? 'w-full' 
                        : 'flex flex-col items-start w-full md:w-auto'
                )}>
                    {(showConfirmBidsButton && onConfirmBidsForRound) || (showAdvanceRoundButton && onAdvanceRoundOrEndGame) ? (
                        <div className="flex w-full items-center justify-between gap-1 sm:gap-2">
                            <div className="flex flex-col w-full">
                                <p className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-left mb-1">
                                    {getHeaderTitle()}
                                </p>
                                <Button
                                    onClick={showConfirmBidsButton ? onConfirmBidsForRound : onAdvanceRoundOrEndGame}
                                    className="bg-accent hover:bg-accent/90 text-accent-foreground px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm max-w-[45vw] md:max-w-xs text-base sm:text-lg md:text-xl"
                                >
                                   {mainActionButtonText}
                                </Button>
                            </div>
                            {onToggleEditMode && (
                                <div className="ml-auto">
                                    <Button onClick={onToggleEditMode} variant="outline" size="sm" className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm">
                                        <Edit className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-4 sm:w-4" /> Edit Entries
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : isEditingCurrentRound && editingPlayerId && onKeepPlayerValue && onSetActiveEditPlayerValue && onToggleEditMode && !isPlayerValueUnderActiveEdit ? (
                        <div className="flex flex-col items-start w-full">
                        <p className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-left mb-1 h-auto truncate max-w-[70vw] sm:max-w-[60vw] md:max-w-md">
                            {isPlayerValueUnderActiveEdit
                            ? `${numPadActionText}`
                            : `Reviewing ${currentRoundInputMode === 'BIDDING' ? 'Bid' : 'Tricks'} for ${activeEditingPlayerName}: ${activeEditingPlayerCurrentValue === 'N/A' ? '-' : activeEditingPlayerCurrentValue}`
                            }
                        </p>
                        {isPlayerValueUnderActiveEdit && currentRoundConfig ? (
                            <NumberInputPad
                                min={0}
                                max={currentRoundConfig.cardsDealt}
                                onSelectNumber={(value) => {
                                    if (currentRoundInputMode === 'BIDDING') {
                                    onSubmitBid(editingPlayerId, value.toString());
                                    } else {
                                    onSubmitTaken(editingPlayerId, value.toString());
                                    }
                                }}
                                currentValue={numPadCurrentValue}
                                disabled={numPadDisabledGlobally}
                                isNumberInvalid={numPadIsInvalidFn}
                                className="max-w-[75vw] sm:max-w-[66vw] md:max-w-none"
                            />
                        ) : (
                            <div className="flex w-full items-center justify-between gap-1 sm:gap-2">
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <Button
                                        onClick={onKeepPlayerValue}
                                        variant="outline"
                                        size="sm"
                                        className="px-2 sm:px-3 text-xs sm:text-sm"
                                        disabled={disableKeepAndNextDueToRuleViolation()}
                                    >
                                        Keep & Next
                                    </Button>
                                    <Button onClick={() => onSetActiveEditPlayerValue && onSetActiveEditPlayerValue(true)} size="sm" className="px-2 sm:px-3 text-xs sm:text-sm">Edit Value</Button>
                                </div>
                                <div className="ml-auto">
                                  <Button onClick={onToggleEditMode} variant="ghost" size="sm" className="text-destructive hover:text-destructive/80 px-2 sm:px-3 text-xs sm:text-sm">Cancel Edit</Button>
                                </div>
                            </div>
                        )}
                        </div>
                    ) : (
                        isGameOver || !currentRoundConfig ? (
                          <div className="flex flex-col items-center w-full justify-center py-4 gap-2">
                            <p className="text-2xl font-bold text-center text-destructive mb-2">Game Over</p>
                            <div className="flex flex-row gap-2 items-center justify-center">
                              {onUndoPreviousPlayer && (
                                <Button 
                                  onClick={() => {
                                    console.log("Undo button clicked");
                                    onUndoPreviousPlayer();
                                  }} 
                                  variant="outline" 
                                  size="sm"
                                  className="mb-1"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 h-3 w-3">
                                    <path d="M9 14 4 9l5-5"/>
                                    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>
                                  </svg>
                                  Undo
                                </Button>
                              )}
                              {onToggleEditMode && (
                                <Button onClick={onToggleEditMode} variant="outline" size="sm" className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm">
                                  <Edit className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-4 sm:w-4" /> Edit Entries
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                        <>
                            <div className="flex justify-between items-center w-full">
                                <p className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-left mb-1 h-auto truncate max-w-[70vw] sm:max-w-[60vw] md:max-w-md">
                                    {numPadActionText || " "}
                                </p>
                                {((currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId) || 
                                  (currentRoundInputMode === 'TAKING' && currentPlayerTakingId)) && 
                                  !isEditingCurrentRound && onUndoPreviousPlayer && (
                                    <Button 
                                        onClick={() => {
                                          console.log("Undo button clicked");
                                          onUndoPreviousPlayer();
                                        }} 
                                        variant="outline" 
                                        size="sm" 
                                        className="mb-1"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 h-3 w-3">
                                            <path d="M9 14 4 9l5-5"/>
                                            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>
                                        </svg>
                                        Undo
                                    </Button>
                                )}
                            </div>
                            {currentRoundConfig && !isGameOver ? (
                              <NumberInputPad
                                min={0}
                                max={currentRoundConfig.cardsDealt}
                                onSelectNumber={(value) => {
                                  const activePlayerIdForSubmission = isEditingCurrentRound && editingPlayerId 
                                    ? editingPlayerId 
                                    : (currentRoundInputMode === 'BIDDING' ? currentPlayerBiddingId : currentPlayerTakingId);
                                  if (activePlayerIdForSubmission) {
                                    if (currentRoundInputMode === 'BIDDING') {
                                      onSubmitBid(activePlayerIdForSubmission, value.toString());
                                    } else {
                                      onSubmitTaken(activePlayerIdForSubmission, value.toString());
                                    }
                                  }
                                }}
                                currentValue={
                                  currentRoundInputMode === 'TAKING' && numPadCurrentValue === null
                                    ? playersScoreData.find(p => p.playerId === (isEditingCurrentRound ? editingPlayerId : currentPlayerTakingId))
                                        ?.scores.find(s => s.roundNumber === currentRoundForInput)?.bid ?? null
                                    : numPadCurrentValue
                                }
                                disabled={numPadDisabledGlobally}
                                isNumberInvalid={numPadIsInvalidFn}
                                className="max-w-[75vw] sm:max-w-[66vw] md:max-w-none"
                              />
                            ) : null}
                        </>
                        )
                    )}
                </div>
           </div>
        </div>
      )}


      {(gamePhase === 'SCORING' || (isGameOver && gameRounds.length > 0)) && (
        <div className="px-1 md:px-0 mt-2 pb-2 flex flex-row justify-between items-center gap-1 md:gap-2">
          <Button onClick={handleRestartClick} variant="outline" size="sm" className="w-full max-w-full md:max-w-[33vw] text-xs">
            <RefreshCw className="mr-1 h-3 w-3" /> Restart Game
          </Button>
        </div>
      )}
      {gamePhase === 'DEALER_SELECTION' && (
        <div className="mt-4 px-1 sm:px-0 pb-2 flex justify-end items-center gap-4">
          <Button onClick={handleDirectRestart} variant="outline" size="default">
            <RefreshCw className="mr-1 h-4 w-4" /> Back to Setup
          </Button>
        </div>
      )}
      
      {/* Add the AlertDialog for confirmation */}
      <AlertDialog open={showRestartConfirmation} onOpenChange={setShowRestartConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to restart?</AlertDialogTitle>
            <AlertDialogDescription>
              This will destroy the current game and all scores will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestart} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Restart Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

