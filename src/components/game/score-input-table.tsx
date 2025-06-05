
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlayerScoreData, GameRoundInfo, GamePhase, Player, CurrentRoundInputMode, ScoreInputTableProps } from '@/lib/types';
import { RefreshCw, UserCheck, UserCog, Target, Flag, Award } from 'lucide-react';
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
  onSubmitBid,
  onSubmitTaken,
  onConfirmBidsForRound,
  onAdvanceRoundOrEndGame,
  onFinishGame,
  onRestartGame,
  onSelectDealer,
}: ScoreInputTableProps) {
  const currentRoundConfig = gameRounds.find(r => r.roundNumber === currentRoundForInput);
  const playersForDisplay = gamePhase === 'DEALER_SELECTION' ? allPlayers.map(p => ({ ...p, playerId: p.id, name: p.name, scores: [], totalScore: 0 })) : playersScoreData;

  const isGameReallyOver = gamePhase === 'RESULTS';

  const getIsBidInvalid = useCallback((
    roundConfigForCheck: GameRoundInfo | undefined,
    playerWhosePadIsBeingConfigured: string
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
    playerWhosePadIsBeingConfigured: string
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

    const actualFirstDeclarerId = firstBidderOfRoundId; // For live input, first bidder is first to declare taken
    const actualDealerId = currentDealerId; // For live input, current dealer is the one for this round
    if (!actualFirstDeclarerId || !actualDealerId) return () => false;


    const lastPlayerToDeclareTakenInOrder = actualDealerId; // Dealer is last to declare tricks taken (for "must make total")

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
    if (gamePhase === 'RESULTS') return "Game Over! Final scores are displayed. Press 'Play New Game' to start again.";
    if (gamePhase === 'DEALER_SELECTION') return "Click player's name to select as first dealer.";
    if (gamePhase === 'SCORING') {
      return "Live scores for the current game.";
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
      numPadIsInvalidFn = getIsBidInvalid(currentRoundConfig, currentPlayerBiddingId);
      numPadPlayerName = allPlayers.find(p => p.id === currentPlayerBiddingId)?.name || "";
      numPadActionText = `Bid: ${numPadPlayerName}`;
    } else if (currentRoundInputMode === 'TAKING' && currentPlayerTakingId) { 
      numPadDisabled = false;
      const player = playersScoreData.find(p => p.playerId === currentPlayerTakingId);
      numPadCurrentValue = player?.scores.find(s => s.roundNumber === currentRoundForInput)?.taken ?? null;
      numPadIsInvalidFn = getIsTakenInvalid(currentRoundConfig, currentPlayerTakingId);
      numPadPlayerName = allPlayers.find(p => p.id === currentPlayerTakingId)?.name || "";
      numPadActionText = `Taken: ${numPadPlayerName}`;
    } else if (currentRoundInputMode === 'BIDDING' && !currentPlayerBiddingId && !currentRoundBidsConfirmed) { 
        showConfirmBidsButton = true;
        numPadActionText = ""; 
        numPadDisabled = true;
    } else if (currentRoundInputMode === 'TAKING' && !currentPlayerTakingId && currentRoundBidsConfirmed) { 
        showAdvanceRoundButton = true;
        numPadActionText = ""; 
        numPadDisabled = true;
    } else { 
        numPadDisabled = true;
        numPadActionText = " "; 
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
                            <span className="flex items-center">Bid/Take-&gt;Score</span>
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

                          return (
                            <TableCell key={`${player.playerId}-${roundInfo.roundNumber}`}
                                className={cn(
                                    "text-center align-middle py-0 px-0",
                                    player.playerId === activePlayerIdForColumnHighlight && "bg-secondary/30"
                                )}
                            >
                                  <div
                                    className="py-0 flex items-center justify-center min-h-[24px] relative text-xs"
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
          <div className="flex flex-row items-center justify-start gap-3">
            <div className="flex flex-col items-start">
              {showConfirmBidsButton ? (
                <Button onClick={onConfirmBidsForRound} className="w-auto max-w-[45vw] bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2 text-sm">
                  Enter Tricks
                </Button>
              ) : showAdvanceRoundButton ? (
                <Button onClick={onAdvanceRoundOrEndGame} className="w-auto max-w-[45vw] bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2 text-sm">
                  {currentRoundForInput < gameRounds.length
                    ? `Deal ${gameRounds.find(r => r.roundNumber === currentRoundForInput + 1)?.cardsDealt || ''} cards`
                    : "Show Final Scores"}
                </Button>
              ) : (
                <>
                  <p className="text-sm font-medium text-left mb-1 h-5 truncate max-w-[33vw] md:max-w-xs">
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
                    className="max-w-[66vw] md:max-w-none"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}


      {(gamePhase === 'SCORING' || gamePhase === 'RESULTS') && (
        <div className="px-1 md:px-0 mt-2 pb-2 flex flex-row justify-between items-center gap-1 md:gap-2">
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

