
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlayerScoreData, GameRoundInfo, GamePhase, Player, CurrentRoundInputMode, CascadingEditTarget, ScoreInputTableProps, ActivePopoverDetails, PopoverInputType } from '@/lib/types';
import { RefreshCw, UserCheck, UserCog, Target, Edit3, Flag, Award } from 'lucide-react';
import { Popover, PopoverContent } from '@/components/ui/popover';
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
  firstBidderOfRoundId, // Still needed for taken validation logic (knowing who is last)
  firstDealerPlayerId, // Still needed for dealer bid validation
  cascadingEditTarget,
  onCascadedEditOpened,
  onSubmitBid,
  onSubmitTaken,
  onConfirmBidsForRound,
  onAdvanceRoundOrEndGame,
  onEditHistoricScore,
  onFinishGame,
  onRestartGame,
  onSelectDealer,
}: ScoreInputTableProps) {
  const currentRoundConfig = gameRounds.find(r => r.roundNumber === currentRoundForInput);
  const playersForDisplay = gamePhase === 'DEALER_SELECTION' ? allPlayers.map(p => ({ ...p, playerId: p.id, name: p.name, scores: [], totalScore: 0 })) : playersScoreData;
  
  // activePopoverDetails is now primarily for historic edits
  const [activePopoverDetails, setActivePopoverDetails] = useState<ActivePopoverDetails | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // lastLiveTriggerElementRef is no longer needed for live input as it's fixed

  const isGameReallyOver = gamePhase === 'RESULTS';

  const POPOVER_WIDTH_PX = 224; 
  const POPOVER_OFFSET_Y = 32; 

  // Effect to calculate popover position (for historic edits)
  useEffect(() => {
    if (activePopoverDetails && activePopoverDetails.triggerElement && tableWrapperRef.current) {
      const tableWrapperRect = tableWrapperRef.current.getBoundingClientRect();
      const cellRect = activePopoverDetails.triggerElement.getBoundingClientRect();
      const calculatedTop = cellRect.bottom + window.scrollY + POPOVER_OFFSET_Y;
      const calculatedLeft = tableWrapperRect.left + (tableWrapperRect.width / 2) - (POPOVER_WIDTH_PX / 2) + window.scrollX;
      setPopoverPosition({ top: calculatedTop, left: calculatedLeft });
    } else {
      setPopoverPosition(null);
    }
  }, [activePopoverDetails]);


  const getIsBidInvalid = useCallback((
    roundConfigForCheck: GameRoundInfo | undefined, 
    playerWhosePadIsBeingConfigured: string,
    isHistoricEditContext: boolean // this param might become less relevant if all popovers are historic
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
        return false; 
    };
  }, [playersScoreData, firstDealerPlayerId, playerOrderForGame]);

  const getIsTakenInvalid = useCallback((
    roundConfigForCheck: GameRoundInfo | undefined, 
    playerWhosePadIsBeingConfigured: string,        
    isHistoricEditContext: boolean // this param might become less relevant
  ): ((num_on_pad: number) => boolean) => {
    if (!roundConfigForCheck || !firstDealerPlayerId || !firstBidderOfRoundId || playerOrderForGame.length === 0) {
      return () => false; 
    }
    const cardsDealt = roundConfigForCheck.cardsDealt;
    const roundNumForCheck = roundConfigForCheck.roundNumber;
    const order = playerOrderForGame;
    const numPlayers = order.length;

    const firstDealerBaseIndex = order.indexOf(firstDealerPlayerId);
    if (firstDealerBaseIndex === -1) return () => false; 
    
    const dealerIndexForRound = (firstDealerBaseIndex + roundNumForCheck - 1) % numPlayers;
    
    // For "taken" phase, the order of declaration matters.
    // The first *bidder* of the round is usually the first to declare taken,
    // and the dealer is last to declare taken.
    // This assumes firstBidderOfRoundId is correctly set for the *current* round if not historic.
    // For historic context, we'd need to derive first declarer for THAT round.
    // Simplified assumption for now: historic edits don't enforce strict "last player must make sum correct" rule.
    
    // If it's a historic edit, let's be more lenient for now, or this logic needs to find the historic dealer/first declarer.
    // The `firstBidderOfRoundId` passed as prop is for the *current live round*.
    // For historic, we'd need to calculate who *was* the dealer and first bidder for *that* round.
    // This is complex. Let's assume for historic edit, isNumberInvalid for 'taken' is less strict.
    if (isHistoricEditContext) {
        return (num_on_pad: number) => num_on_pad < 0 || num_on_pad > cardsDealt;
    }

    // Logic for live round:
    let actualFirstDeclarerId = firstBidderOfRoundId; // This is the first bidder of the *current* round.
    if (roundNumForCheck !== currentRoundForInput) { // Safety for mismatch, though ideally not hit for live
        // Fallback for historic if not handled above: simple bounds check
        return (num_on_pad: number) => num_on_pad < 0 || num_on_pad > cardsDealt;
    }

    const actualDealerId = currentDealerId; // Dealer of the *current* round.
    if (!actualFirstDeclarerId || !actualDealerId) return () => false;


    const lastPlayerToDeclareTakenInOrder = actualDealerId;

    let sumOfTakesByPlayersBeforeThisOneInOrder = 0;
    const firstDeclarerActualIndex = order.indexOf(actualFirstDeclarerId);
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

      if (playerWhosePadIsBeingConfigured === lastPlayerToDeclareTakenInOrder) { 
        return num_on_pad !== tricksAvailableForAllocationFromThisPlayerOnwards;
      } else { 
        return num_on_pad > tricksAvailableForAllocationFromThisPlayerOnwards;
      }
    };
  }, [playersScoreData, firstDealerPlayerId, playerOrderForGame, firstBidderOfRoundId, currentRoundForInput, currentDealerId]);


  // Effect for cascading edits (historic) - opens a popover
  useEffect(() => {
    if (cascadingEditTarget && onCascadedEditOpened && gameRounds.length > 0) {
      if (activePopoverDetails && !activePopoverDetails.isLive) {
         // A historic/cascade popover is already open, let it finish or be closed by user
         onCascadedEditOpened(); // Acknowledge the cascade target
         return;
      }
      const roundConfigForCascade = gameRounds.find(r => r.roundNumber === cascadingEditTarget.roundNumber);
      if (!roundConfigForCascade) return;

      const cellKeySuffix = cascadingEditTarget.inputType === 'bid' ? 'bid' : 'taken';
      const cellKey = `cell-${cascadingEditTarget.playerId}-${cascadingEditTarget.roundNumber}-${cellKeySuffix}`;
      const triggerElement = cellRefs.current[cellKey];
      const player = allPlayers.find(p => p.id === cascadingEditTarget.playerId);
      const scoreEntry = playersScoreData.find(psd => psd.playerId === cascadingEditTarget.playerId)?.scores.find(s => s.roundNumber === cascadingEditTarget.roundNumber);

      if (triggerElement && player) {
        const onSelectHistoric = (value: number) => {
          onEditHistoricScore(cascadingEditTarget.playerId, cascadingEditTarget.roundNumber, cascadingEditTarget.inputType, value.toString());
          setActivePopoverDetails(null); 
        };
        
        const isInvalidCb = cascadingEditTarget.inputType === 'bid'
          ? getIsBidInvalid(roundConfigForCascade, cascadingEditTarget.playerId, true)
          : getIsTakenInvalid(roundConfigForCascade, cascadingEditTarget.playerId, true);
        
        const currentVal = cascadingEditTarget.inputType === 'bid' ? scoreEntry?.bid : scoreEntry?.taken;
        
        setActivePopoverDetails({
          playerId: cascadingEditTarget.playerId,
          roundNumber: cascadingEditTarget.roundNumber,
          inputType: cascadingEditTarget.inputType,
          cardsForCell: cascadingEditTarget.cardsForCell, 
          triggerElement,
          playerName: player.name,
          isLive: false, 
          onSelectNumber: onSelectHistoric,
          isNumberInvalid: isInvalidCb,
          currentValue: currentVal ?? null,
        });
      }
      onCascadedEditOpened(); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cascadingEditTarget, gameRounds, allPlayers, playersScoreData, onEditHistoricScore, getIsBidInvalid, getIsTakenInvalid]);


  const handleHistoricCellInteraction = useCallback((
    playerId: string,
    roundNumber: number,
    inputTypeToEdit: PopoverInputType, // Now only 'bid' or 'taken'
    cardsDealtForRound: number,
    triggerElem: HTMLDivElement
  ) => {
    // Prevent opening historic edit if it's the cell for live input
    const isCurrentRoundLiveBidding = roundNumber === currentRoundForInput && gamePhase === 'SCORING' &&
                                     inputTypeToEdit === 'bid' && currentRoundInputMode === 'BIDDING' && 
                                     !currentRoundBidsConfirmed && playerId === currentPlayerBiddingId;
    const isCurrentRoundLiveTaking = roundNumber === currentRoundForInput && gamePhase === 'SCORING' &&
                                     inputTypeToEdit === 'taken' && currentRoundInputMode === 'TAKING' &&
                                     currentRoundBidsConfirmed && playerId === currentPlayerTakingId;
    
    if (isCurrentRoundLiveBidding || isCurrentRoundLiveTaking) return; 

    // This check is for trying to edit "taken" for the current round before bids are confirmed
    if (inputTypeToEdit === 'taken' && currentRoundInputMode === 'BIDDING' && roundNumber === currentRoundForInput && !currentRoundBidsConfirmed) return; 

    const player = allPlayers.find(p => p.id === playerId);
    const scoreEntry = playersScoreData.find(psd => psd.playerId === playerId)?.scores.find(s => s.roundNumber === roundNumber);
    const roundConfigForCell = gameRounds.find(r => r.roundNumber === roundNumber);

    if (player && roundConfigForCell) {
      const onSelectHistoric = (value: number) => {
        onEditHistoricScore(playerId, roundNumber, inputTypeToEdit, value.toString());
        setActivePopoverDetails(null); 
      };

      const isInvalidCb = inputTypeToEdit === 'bid' 
        ? getIsBidInvalid(roundConfigForCell, playerId, true) 
        : getIsTakenInvalid(roundConfigForCell, playerId, true);
      
      const currentVal = inputTypeToEdit === 'bid' ? scoreEntry?.bid : scoreEntry?.taken;

      setActivePopoverDetails({
        playerId,
        roundNumber,
        inputType: inputTypeToEdit,
        cardsForCell: cardsDealtForRound,
        triggerElement: triggerElem,
        playerName: player.name,
        isLive: false, 
        onSelectNumber: onSelectHistoric,
        isNumberInvalid: isInvalidCb,
        currentValue: currentVal ?? null,
      });
    }
  }, [
    allPlayers, playersScoreData, gameRounds, onEditHistoricScore, 
    getIsBidInvalid, getIsTakenInvalid, 
    currentRoundForInput, gamePhase, currentRoundInputMode, 
    currentRoundBidsConfirmed, currentPlayerBiddingId, currentPlayerTakingId
  ]);
  
  const currentDealerName = allPlayers.find(p => p.id === currentDealerId)?.name;
  let currentPlayerActiveName = '';
  let activePlayerIdForColumnHighlight: string | null = null;

  if (gamePhase === 'SCORING') {
    if (currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId && !currentRoundBidsConfirmed) {
      currentPlayerActiveName = allPlayers.find(p => p.id === currentPlayerBiddingId)?.name || '';
      activePlayerIdForColumnHighlight = currentPlayerBiddingId;
    } else if (currentRoundInputMode === 'TAKING' && currentPlayerTakingId && currentRoundBidsConfirmed) {
      currentPlayerActiveName = allPlayers.find(p => p.id === currentPlayerTakingId)?.name || '';
      activePlayerIdForColumnHighlight = currentPlayerTakingId;
    }
  }


  if (gamePhase === 'SCORING' && !currentRoundConfig && gameRounds.length > 0 && currentRoundForInput <= gameRounds.length ) return <p>Loading round configuration...</p>;

  const roundsToDisplay = (isGameReallyOver || currentRoundForInput > gameRounds.length) && gameRounds.length > 0 
    ? gameRounds 
    : gameRounds.filter(roundInfo => roundInfo.roundNumber <= currentRoundForInput);


  const getHeaderTitle = () => {
    if (gamePhase === 'RESULTS') return "Game Over - Final Scores";
    if (gamePhase === 'DEALER_SELECTION') return "Select First Dealer";
    if (gamePhase === 'SCORING' && currentRoundConfig) {
      let phaseText = '';
      if (currentRoundInputMode === 'BIDDING') {
        if (currentPlayerBiddingId) {
            phaseText = `Bidding: ${currentPlayerActiveName}'s turn`;
        } else if (!currentRoundBidsConfirmed) {
             phaseText = 'All Bids In! Confirm round to proceed.'; 
        } else { 
            phaseText = 'Bidding Phase Complete'; // Should not happen if control panel is used
        }
      } else if (currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed) {
          if (currentPlayerTakingId) {
            phaseText = `Taking: ${currentPlayerActiveName}'s turn`;
          } else {
             phaseText = `All Tricks In! Confirm round to proceed.`;
          }
      }
      const dealerInfo = currentDealerName ? `(D: ${currentDealerName})` : '';
      return `Scores - R${currentRoundForInput}/${gameRounds.length} (C:${currentRoundConfig.cardsDealt}) ${dealerInfo} - ${phaseText}`;
    }
    return "Score Sheet";
  }

  const getTableCaption = () => {
    if (gamePhase === 'RESULTS') return "Game Over! Final scores are displayed. Double-click score to correct. Press 'Play New Game' to start again.";
    if (gamePhase === 'DEALER_SELECTION') return "Click player's name to select as first dealer.";
    if (gamePhase === 'SCORING') {
      return "Double-click any score to correct past entries.";
    }
    return "";
  }
  
  const isPlayerActiveForBiddingLive = (playerId: string, roundNumber: number) => gamePhase === 'SCORING' && currentRoundInputMode === 'BIDDING' && playerId === currentPlayerBiddingId && !currentRoundBidsConfirmed && roundNumber === currentRoundForInput;
  const isPlayerActiveForTakingLive = (playerId: string, roundNumber: number) => gamePhase === 'SCORING' && currentRoundInputMode === 'TAKING' && playerId === currentPlayerTakingId && currentRoundBidsConfirmed && roundNumber === currentRoundForInput;

  
  const sortedPlayersForResults = gamePhase === 'RESULTS' 
    ? [...playersScoreData].sort((a, b) => b.totalScore - a.totalScore)
    : playersScoreData;

  const getPlayerRank = (playerId: string): number => {
    if (gamePhase !== 'RESULTS') return -1; 
    const playerList = sortedPlayersForResults;
    return playerList.findIndex(p => p.playerId === playerId);
  };

  // Props for the fixed NumberInputPad
  let numPadCurrentValue: number | null = null;
  let numPadIsInvalidFn: ((num: number) => boolean) | undefined = undefined;
  let numPadPlayerName = "";
  let numPadActionText = "";
  let numPadDisabled = true;

  if (gamePhase === 'SCORING' && currentRoundConfig) {
    numPadDisabled = false; // Enable by default during scoring phase
    if (currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId) {
      const player = playersScoreData.find(p => p.playerId === currentPlayerBiddingId);
      numPadCurrentValue = player?.scores.find(s => s.roundNumber === currentRoundForInput)?.bid ?? null;
      numPadIsInvalidFn = getIsBidInvalid(currentRoundConfig, currentPlayerBiddingId, false);
      numPadPlayerName = allPlayers.find(p => p.id === currentPlayerBiddingId)?.name || "";
      numPadActionText = `Bid: ${numPadPlayerName}`;
    } else if (currentRoundInputMode === 'TAKING' && currentPlayerTakingId) {
      const player = playersScoreData.find(p => p.playerId === currentPlayerTakingId);
      numPadCurrentValue = player?.scores.find(s => s.roundNumber === currentRoundForInput)?.taken ?? null;
      numPadIsInvalidFn = getIsTakenInvalid(currentRoundConfig, currentPlayerTakingId, false);
      numPadPlayerName = allPlayers.find(p => p.id === currentPlayerTakingId)?.name || "";
      numPadActionText = `Taken: ${numPadPlayerName}`;
    } else {
      numPadDisabled = true; // Disable pad if no active player for input (i.e. confirmation step)
      if (currentRoundInputMode === 'BIDDING' && !currentPlayerBiddingId && !currentRoundBidsConfirmed) {
        numPadActionText = "Confirm Bids";
      } else if (currentRoundInputMode === 'TAKING' && !currentPlayerTakingId && currentRoundBidsConfirmed) {
        numPadActionText = "Confirm Tricks Taken";
      }
    }
  }


  return (
    <Card className="shadow-xl flex flex-col" style={{ minHeight: 'calc(100vh - 10rem)' }}> {/* Ensure card takes height */}
      <CardHeader className="py-1 sm:py-2">
        <CardTitle className="font-headline text-xs sm:text-sm text-center text-primary-foreground truncate px-1">
          {getHeaderTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0.5 sm:px-1 md:px-1 py-1 sm:py-2 flex-grow overflow-y-auto"> {/* Allow table to scroll */}
        <div className="overflow-x-auto" ref={tableWrapperRef}>
          <Table>
            <TableCaption className="mt-1 mb-1 text-xs">{getTableCaption()}</TableCaption>
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
                      <Button variant="ghost" className="w-full h-auto p-0 text-xs hover:bg-primary/20" onClick={() => onSelectDealer(player.playerId)}>
                        <UserCheck className="mr-0.5 h-3 w-3 text-accent" /> {player.name}
                      </Button>
                    ) : (
                      <>
                        {player.name}
                        {currentDealerId === player.playerId && gamePhase === 'SCORING' && <UserCog className="ml-0.5 h-2 w-2 sm:h-3 sm:w-3 inline text-primary-foreground/80" title="Dealer" />}
                        {(isPlayerActiveForBiddingLive(player.playerId, currentRoundForInput) || isPlayerActiveForTakingLive(player.playerId, currentRoundForInput)) && <Target className="ml-0.5 h-2 w-2 sm:h-3 sm:w-3 inline text-accent" title="Current Turn" />}
                      </>
                    )}
                  </TableHead>
                ))}
              </TableRow>
               {(gamePhase === 'SCORING' || gamePhase === 'RESULTS') && playersScoreData.length > 0 && (
                 <TableRow className="border-b-0">
                    <TableHead 
                        colSpan={1 + playersScoreData.length} 
                        className="text-xs text-muted-foreground py-0 px-0.5 sm:px-1"
                    >
                       <div className="flex justify-between items-center w-full">
                            <span><strong>R</strong>ound/<strong>C</strong>ard</span>
                            <span className="flex items-center">Bid/Take-&gt;Score <Edit3 className="h-3 w-3 inline ml-0.5 opacity-50" title="Double-click scores to edit"/></span>
                        </div>
                    </TableHead>
                </TableRow>
              )}
            </TableHeader>
            {(gamePhase === 'SCORING' || gamePhase === 'RESULTS') && (gameRounds.length > 0 || playersScoreData.length > 0 ) && (
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
                        isCurrentDisplayRound && currentRoundInputMode === 'BIDDING' && !currentRoundBidsConfirmed ? 'bg-primary/10' : '',
                        isCurrentDisplayRound && currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed ? 'bg-secondary/10' : '',
                        ((isProblematicBidSum || isProblematicTakenSum) && (!isCurrentDisplayRound || gamePhase === 'RESULTS' || (isCurrentDisplayRound && currentRoundBidsConfirmed))) ? 'opacity-80 hover:opacity-100 bg-destructive/10' : '',
                        (isProblematicBidSum || isProblematicTakenSum) && (isCurrentDisplayRound && !currentRoundBidsConfirmed && currentRoundInputMode === 'BIDDING' && allBidsEnteredForHighlight) ? 'bg-destructive/10' : ''
                      )}>
                        <TableCell className="font-medium text-xs px-0.5 py-0 text-center">{`${roundInfo.roundNumber}/${roundInfo.cardsDealt}`}</TableCell>
                        {playersScoreData.map(player => {
                          const scoreEntry = player.scores.find(s => s.roundNumber === roundInfo.roundNumber);
                          
                          const isActiveForBidding = isPlayerActiveForBiddingLive(player.playerId, roundInfo.roundNumber);
                          const isActiveForTaking = isPlayerActiveForTakingLive(player.playerId, roundInfo.roundNumber);
                          
                          const bidText = scoreEntry?.bid !== null ? scoreEntry.bid.toString() : '-';
                          const takenText = scoreEntry?.taken !== null ? scoreEntry.taken.toString() : '-';
                          const scoreText = scoreEntry?.roundScore.toString() ?? '0';

                          const bidCellKey = `cell-${player.playerId}-${roundInfo.roundNumber}-bid`;
                          const takenCellKey = `cell-${player.playerId}-${roundInfo.roundNumber}-taken`;

                          return (
                            <TableCell key={`${player.playerId}-${roundInfo.roundNumber}`} 
                                className={cn(
                                    "text-center align-middle py-0 px-0",
                                    player.playerId === activePlayerIdForColumnHighlight && "bg-secondary/30"
                                )}
                            >
                                  <div 
                                    ref={el => {
                                        cellRefs.current[bidCellKey] = el; 
                                        cellRefs.current[takenCellKey] = el; 
                                    }}
                                    className="cursor-pointer py-0 flex items-center justify-center min-h-[24px] relative text-xs"
                                    onDoubleClick={() => {
                                      if(isActiveForBidding || isActiveForTaking) return;

                                      let inputTypeToEdit: PopoverInputType = 'bid';
                                      if (scoreEntry?.bid === null || (isCurrentDisplayRound && !currentRoundBidsConfirmed && currentRoundInputMode === 'BIDDING')) {
                                        inputTypeToEdit = 'bid';
                                      } else if (scoreEntry?.taken === null || (isCurrentDisplayRound && currentRoundBidsConfirmed && currentRoundInputMode === 'TAKING') || (isCurrentDisplayRound && !currentRoundBidsConfirmed && currentRoundInputMode === 'BIDDING' && scoreEntry?.bid !== null)) {
                                         if(isCurrentDisplayRound && !currentRoundBidsConfirmed && currentRoundInputMode === 'BIDDING' && scoreEntry?.bid !== null) {
                                              inputTypeToEdit = (scoreEntry?.taken === null && scoreEntry?.bid !== null) ? 'taken' : 'bid';
                                              if (currentRoundBidsConfirmed) inputTypeToEdit = 'taken';
                                         } else {
                                            inputTypeToEdit = 'taken';
                                         }
                                      }
                                      
                                      if (inputTypeToEdit === 'taken' && currentRoundInputMode === 'BIDDING' && roundInfo.roundNumber === currentRoundForInput && !currentRoundBidsConfirmed) return;

                                      const cellRefForDoubleClick = cellRefs.current[inputTypeToEdit === 'bid' ? bidCellKey : takenCellKey];
                                      if (cellRefForDoubleClick) {
                                         handleHistoricCellInteraction(player.playerId, roundInfo.roundNumber, inputTypeToEdit, roundInfo.cardsDealt, cellRefForDoubleClick);
                                      }
                                    }}
                                  >
                                    {isActiveForBidding && (
                                        <span className="flex items-center justify-center">
                                            B:
                                            <span className={cn(bidText === '-' ? "text-muted-foreground" : "", bidText !== '-' && "px-0.5")}>{bidText}</span>
                                            {takenText !== '-' && <span>/T:<span className={cn(takenText !== '-' && "px-0.5")}>{takenText}</span></span>}
                                            <Target className="h-2 w-2 sm:h-3 sm:w-3 text-accent ml-0.5" title="Your Turn" />
                                        </span>
                                    )}
                                    {isActiveForTaking && (
                                        <span className="flex items-center justify-center">
                                            <span className={cn(bidText === '-' ? "text-muted-foreground" : "", bidText !== '-' && "px-0.5")}>{bidText}</span>
                                            <span>/T:</span>
                                            <span className={cn(takenText === '-' ? "text-muted-foreground" : "", takenText !== '-' && "px-0.5")}>{takenText}</span>
                                            <Target className="h-2 w-2 sm:h-3 sm:w-3 text-accent ml-0.5" title="Your Turn" />
                                        </span>
                                    )}
                                    {!isActiveForBidding && !isActiveForTaking && (
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
                    {sortedPlayersForResults.map(player => {
                      const rank = getPlayerRank(player.playerId);
                      let rankStyle = "text-primary-foreground";
                      let awardIcon = null;
                      if (gamePhase === 'RESULTS') { 
                          if (rank === 0) { rankStyle = "text-yellow-500 font-bold border border-yellow-400 bg-yellow-500/10 rounded"; awardIcon = <Award className="inline-block h-3 w-3 sm:h-4 sm:w-4 ml-0.5 text-yellow-500" />; }
                          else if (rank === 1) { rankStyle = "text-slate-400 font-semibold"; awardIcon = <Award className="inline-block h-3 w-3 sm:h-4 sm:w-4 ml-0.5 text-slate-400" />; }
                          else if (rank === 2) { rankStyle = "text-orange-400 font-semibold"; awardIcon = <Award className="inline-block h-3 w-3 sm:h-4 sm:w-4 ml-0.5 text-orange-400" />; }
                      }
                      return (
                        <TableCell 
                            key={`total-${player.playerId}`} 
                            className={cn(
                                "text-center font-bold text-xs sm:text-sm p-0.5", 
                                rankStyle,
                                player.playerId === activePlayerIdForColumnHighlight && gamePhase === 'SCORING' && "bg-secondary/30"
                            )}
                        >
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
      </CardContent>

      {/* Fixed Control Panel for Scoring */}
      {gamePhase === 'SCORING' && currentRoundConfig && (
        <div className="mt-auto p-3 border-t bg-background sticky bottom-0 shadow-md z-10"> {/* Ensure z-index for sticky */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
            <div className="w-full sm:w-auto">
              <p className="text-sm font-medium text-center sm:text-left mb-1 h-5 truncate">
                {numPadActionText || " "}
              </p>
              <NumberInputPad 
                min={0} 
                max={currentRoundConfig.cardsDealt} 
                onSelectNumber={(value) => {
                  if (currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId) {
                    onSubmitBid(currentPlayerBiddingId, value.toString());
                  } else if (currentRoundInputMode === 'TAKING' && currentPlayerTakingId) {
                    onSubmitTaken(currentPlayerTakingId, value.toString());
                  }
                }}
                currentValue={numPadCurrentValue}
                disabled={numPadDisabled}
                isNumberInvalid={numPadIsInvalidFn}
              />
            </div>
            <div className="w-full sm:flex-grow sm:pl-4 flex items-center justify-center sm:justify-start pt-2 sm:pt-6">
              {currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId === null && !currentRoundBidsConfirmed && (
                <Button onClick={onConfirmBidsForRound} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">Enter Tricks</Button>
              )}
              {currentRoundInputMode === 'TAKING' && currentPlayerTakingId === null && currentRoundBidsConfirmed && (
                <Button onClick={onAdvanceRoundOrEndGame} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                  {currentRoundForInput < gameRounds.length 
                    ? `Deal ${gameRounds.find(r => r.roundNumber === currentRoundForInput + 1)?.cardsDealt || ''} cards` 
                    : "Show Final Scores"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Popover for Historic Edits - Unchanged from previous logic */}
      <Popover
          open={!!activePopoverDetails && !!popoverPosition && !activePopoverDetails.isLive} // Only for non-live (historic)
          onOpenChange={(isOpen) => {
              if (!isOpen) {
                  setActivePopoverDetails(null);
              }
          }}
      >
          <PopoverContent
              className="p-3 w-56 bg-popover shadow-lg rounded-md border"
              style={popoverPosition ? {
                  position: 'fixed',
                  top: `${popoverPosition.top}px`,
                  left: `${popoverPosition.left}px`,
                  zIndex: 100, 
              } : { display: 'none' }}
              onOpenAutoFocus={(e) => e.preventDefault()} 
              onCloseAutoFocus={(e) => e.preventDefault()}
              side="bottom" 
              align="center"
          >
              {activePopoverDetails && (activePopoverDetails.inputType === 'bid' || activePopoverDetails.inputType === 'taken') && activePopoverDetails.onSelectNumber && !activePopoverDetails.isLive ? (
              <>
                  <div className="text-base sm:text-lg font-semibold text-center mb-2 text-popover-foreground h-6 sm:h-8 flex items-center justify-center overflow-hidden truncate">
                      {activePopoverDetails.inputType === 'bid' ? 'Edit Bid: ' : 'Edit Taken: '}
                      {activePopoverDetails.playerName}
                  </div>
                  <NumberInputPad 
                      min={0} 
                      max={activePopoverDetails.cardsForCell ?? 0} 
                      onSelectNumber={activePopoverDetails.onSelectNumber}
                      currentValue={activePopoverDetails.currentValue}
                      isNumberInvalid={activePopoverDetails.isNumberInvalid}
                  />
              </>
              ) : null}
          </PopoverContent>
      </Popover>

      {/* Buttons for Restart/Finish Game (Outside fixed panel, inside main card content for layout) */}
      {(gamePhase === 'SCORING' || gamePhase === 'RESULTS') && (
        <div className="px-1 sm:px-0 mt-2 pb-2 flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-2">
          <Button onClick={onRestartGame} variant="outline" size="sm" className="w-full sm:w-auto text-xs">
            <RefreshCw className="mr-1 h-3 w-3" /> {gamePhase === 'RESULTS' ? "Play New Game" : "Restart Game"}
          </Button>
          
          {gamePhase === 'SCORING' && ( 
            <Button 
                onClick={onFinishGame} 
                variant="destructive" 
                size="sm" 
                className="w-full sm:w-auto text-xs"
                disabled={ // Disable if a player is actively inputting
                    (currentRoundInputMode === 'BIDDING' && !!currentPlayerBiddingId) ||
                    (currentRoundInputMode === 'TAKING' && !!currentPlayerTakingId && currentRoundBidsConfirmed)
                }
            >
                <Flag className="mr-1 h-3 w-3" /> Finish Early
            </Button>
          )}
        </div>
      )}
      {gamePhase === 'DEALER_SELECTION' && (
        <div className="mt-4 px-1 sm:px-0 pb-2 flex justify-end items-center gap-4">
          <Button onClick={onRestartGame} variant="outline" size="default">
            <RefreshCw className="mr-1 h-4 w-4" /> Back to Setup
          </Button>
        </div>
      )}
    </Card>
  );
}
