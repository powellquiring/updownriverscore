
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
  firstBidderOfRoundId, 
  firstDealerPlayerId, 
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
  
  const [activePopoverDetails, setActivePopoverDetails] = useState<ActivePopoverDetails | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  const isGameReallyOver = gamePhase === 'RESULTS';

  const POPOVER_WIDTH_PX = 224; 
  const POPOVER_OFFSET_Y = 32; 

  useEffect(() => {
    if (activePopoverDetails && activePopoverDetails.triggerElement && tableWrapperRef.current && !activePopoverDetails.isLive) {
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
        return false; 
    };
  }, [playersScoreData, firstDealerPlayerId, playerOrderForGame]);

  const getIsTakenInvalid = useCallback((
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
    
    if (isHistoricEditContext) {
        return (num_on_pad: number) => num_on_pad < 0 || num_on_pad > cardsDealt;
    }

    const actualFirstDeclarerId = firstBidderOfRoundId; 
    const actualDealerId = currentDealerId; 
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
  }, [playersScoreData, firstDealerPlayerId, playerOrderForGame, firstBidderOfRoundId, currentDealerId]);


  useEffect(() => {
    if (activePopoverDetails && !activePopoverDetails.isLive) {
      return;
    }

    if (cascadingEditTarget && onCascadedEditOpened && gameRounds.length > 0) {
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
  }, [cascadingEditTarget, onCascadedEditOpened, gameRounds, allPlayers, playersScoreData, onEditHistoricScore, getIsBidInvalid, getIsTakenInvalid, activePopoverDetails]);


  const handleHistoricCellInteraction = useCallback((
    playerId: string,
    roundNumber: number,
    initialInputTypeToEdit: PopoverInputType, 
    cardsDealtForRound: number,
    triggerElem: HTMLDivElement
  ) => {
    
    const isCurrentRoundLiveBidding = roundNumber === currentRoundForInput && gamePhase === 'SCORING' &&
                                     initialInputTypeToEdit === 'bid' && currentRoundInputMode === 'BIDDING' && 
                                     !currentRoundBidsConfirmed && playerId === currentPlayerBiddingId;
    const isCurrentRoundLiveTaking = roundNumber === currentRoundForInput && gamePhase === 'SCORING' &&
                                     initialInputTypeToEdit === 'taken' && currentRoundInputMode === 'TAKING' &&
                                     currentRoundBidsConfirmed && playerId === currentPlayerTakingId;
    
    if (isCurrentRoundLiveBidding || isCurrentRoundLiveTaking) return; 

    if (initialInputTypeToEdit === 'taken' && currentRoundInputMode === 'BIDDING' && roundNumber === currentRoundForInput && !currentRoundBidsConfirmed) return; 

    const player = allPlayers.find(p => p.id === playerId);
    const scoreEntry = playersScoreData.find(psd => psd.playerId === playerId)?.scores.find(s => s.roundNumber === roundNumber);
    const roundConfigForCell = gameRounds.find(r => r.roundNumber === roundNumber);

    if (player && roundConfigForCell) {
      const onSelectHistoric = (value: number) => {
        onEditHistoricScore(playerId, roundNumber, initialInputTypeToEdit, value.toString());
        setActivePopoverDetails(null); 
      };

      const isInvalidCb = initialInputTypeToEdit === 'bid' 
        ? getIsBidInvalid(roundConfigForCell, playerId, true) 
        : getIsTakenInvalid(roundConfigForCell, playerId, true);
      
      const currentVal = initialInputTypeToEdit === 'bid' ? scoreEntry?.bid : scoreEntry?.taken;

      setActivePopoverDetails({
        playerId,
        roundNumber,
        inputType: initialInputTypeToEdit,
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
             phaseText = 'All Bids In! Click "Enter Tricks" to proceed.'; 
        } 
      } else if (currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed) {
          if (currentPlayerTakingId) {
            phaseText = `Taking: ${currentPlayerActiveName}'s turn`;
          } else {
             phaseText = `All Tricks In! Click button below to proceed.`;
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

  let numPadCurrentValue: number | null = null;
  let numPadIsInvalidFn: ((num: number) => boolean) | undefined = undefined;
  let numPadPlayerName = "";
  let numPadActionText = "";
  let numPadDisabled = true;
  let showConfirmBidsButton = false;
  let showAdvanceRoundButton = false;

  if (gamePhase === 'SCORING' && currentRoundConfig) {
    if (currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId) {
      numPadDisabled = false;
      const player = playersScoreData.find(p => p.playerId === currentPlayerBiddingId);
      numPadCurrentValue = player?.scores.find(s => s.roundNumber === currentRoundForInput)?.bid ?? null;
      numPadIsInvalidFn = getIsBidInvalid(currentRoundConfig, currentPlayerBiddingId, false);
      numPadPlayerName = allPlayers.find(p => p.id === currentPlayerBiddingId)?.name || "";
      numPadActionText = `Bid: ${numPadPlayerName}`;
    } else if (currentRoundInputMode === 'TAKING' && currentPlayerTakingId) {
      numPadDisabled = false;
      const player = playersScoreData.find(p => p.playerId === currentPlayerTakingId);
      numPadCurrentValue = player?.scores.find(s => s.roundNumber === currentRoundForInput)?.taken ?? null;
      numPadIsInvalidFn = getIsTakenInvalid(currentRoundConfig, currentPlayerTakingId, false);
      numPadPlayerName = allPlayers.find(p => p.id === currentPlayerTakingId)?.name || "";
      numPadActionText = `Taken: ${numPadPlayerName}`;
    } else {
      numPadDisabled = true; 
      if (currentRoundInputMode === 'BIDDING' && !currentPlayerBiddingId && !currentRoundBidsConfirmed) {
        numPadActionText = "Confirm Bids";
        showConfirmBidsButton = true;
      } else if (currentRoundInputMode === 'TAKING' && !currentPlayerTakingId && currentRoundBidsConfirmed) {
        numPadActionText = "Confirm Tricks Taken";
        showAdvanceRoundButton = true;
      }
    }
  }


  return (
    <Card className="shadow-xl flex flex-col" style={{ minHeight: 'calc(100vh - 10rem)' }}>
      <CardHeader className="py-1 sm:py-2">
        <CardTitle className="font-headline text-xs sm:text-sm text-center text-primary-foreground truncate px-1">
          {getHeaderTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0.5 sm:px-1 md:px-1 py-1 sm:py-2 flex-grow overflow-y-auto">
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
                                      
                                      const isCurrentDisplayRoundForDoubleClick = gamePhase === 'SCORING' && roundInfo.roundNumber === currentRoundForInput;
                                      let inputTypeToEdit: 'bid' | 'taken' = 'bid'; // Default to 'bid'

                                      if (scoreEntry?.bid === null || (isCurrentDisplayRoundForDoubleClick && !currentRoundBidsConfirmed && currentRoundInputMode === 'BIDDING')) {
                                        inputTypeToEdit = 'bid';
                                      } else if (scoreEntry?.taken === null || (isCurrentDisplayRoundForDoubleClick && currentRoundBidsConfirmed && currentRoundInputMode === 'TAKING')) {
                                        inputTypeToEdit = 'taken';
                                      } else if (isCurrentDisplayRoundForDoubleClick && !currentRoundBidsConfirmed && currentRoundInputMode === 'BIDDING' && scoreEntry?.bid !== null) {
                                          // If bids are confirmed for the current round, but we are still in BIDDING mode (meaning editing a historic bid of the current round)
                                          // and the 'taken' for this cell is null, default to editing 'taken'
                                          inputTypeToEdit = (scoreEntry?.taken === null) ? 'taken' : 'bid'; 
                                      } else if (scoreEntry?.taken !== null) { // If taken is not null, prefer editing taken
                                          inputTypeToEdit = 'taken';
                                      } else if (scoreEntry?.bid !== null) { // If bid is not null (and taken is null), prefer editing bid
                                          inputTypeToEdit = 'bid';
                                      }
                                      // Final check: if we decided on 'taken' but round bids aren't confirmed for CURRENT round, and it IS the current round, switch back to 'bid'
                                      if (inputTypeToEdit === 'taken' && currentRoundInputMode === 'BIDDING' && roundInfo.roundNumber === currentRoundForInput && !currentRoundBidsConfirmed) {
                                          inputTypeToEdit = 'bid'; // Cannot edit 'taken' if bids for current round aren't confirmed
                                      }


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

      {gamePhase === 'SCORING' && currentRoundConfig && (
        <div className="mt-auto p-3 border-t bg-background sticky bottom-0 shadow-md z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
            <div className="w-full max-w-[66vw] md:w-auto md:max-w-none">
              <p className="text-sm font-medium text-center md:text-left mb-1 h-5 truncate">
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
            <div className="w-full flex justify-center md:justify-end items-center pt-2 md:pt-6 md:pl-4">
              {showConfirmBidsButton && (
                <Button onClick={onConfirmBidsForRound} className="w-auto max-w-[33vw] bg-accent hover:bg-accent/90 text-accent-foreground">Enter Tricks</Button>
              )}
              {showAdvanceRoundButton && (
                <Button onClick={onAdvanceRoundOrEndGame} className="w-auto max-w-[33vw] bg-accent hover:bg-accent/90 text-accent-foreground">
                  {currentRoundForInput < gameRounds.length 
                    ? `Deal ${gameRounds.find(r => r.roundNumber === currentRoundForInput + 1)?.cardsDealt || ''} cards` 
                    : "Show Final Scores"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <Popover
          open={!!activePopoverDetails && !!popoverPosition && !activePopoverDetails.isLive} 
          onOpenChange={(isOpen) => {
              if (!isOpen) {
                if (activePopoverDetails && !activePopoverDetails.isLive) { 
                  setActivePopoverDetails(null);
                }
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

      {(gamePhase === 'SCORING' || gamePhase === 'RESULTS') && (
        <div className="px-1 md:px-0 mt-2 pb-2 flex flex-col md:flex-row justify-between items-center gap-1 md:gap-2">
          <Button onClick={onRestartGame} variant="outline" size="sm" className="w-auto max-w-[33vw] text-xs">
            <RefreshCw className="mr-1 h-3 w-3" /> {gamePhase === 'RESULTS' ? "Play New Game" : "Restart Game"}
          </Button>
          
          {gamePhase === 'SCORING' && ( 
            <Button 
                onClick={onFinishGame} 
                variant="destructive" 
                size="sm" 
                className="w-auto max-w-[33vw] text-xs"
                disabled={ 
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

