
"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlayerScoreData, GameRoundInfo, GamePhase, Player, CurrentRoundInputMode } from '@/lib/types';
import { ArrowRight, CheckCircle, RefreshCw, UserCheck, Edit3, ShieldCheck, UserCog, Target } from 'lucide-react';

interface ScoreInputTableProps {
  playersScoreData: PlayerScoreData[];
  allPlayers: Player[]; 
  playerOrderForGame: string[];
  gameRounds: GameRoundInfo[];
  currentRoundForInput: number;
  gamePhase: GamePhase;
  currentRoundInputMode: CurrentRoundInputMode;
  firstDealerPlayerId: string | null;
  currentDealerId: string | null;
  currentPlayerBiddingId: string | null;
  onSubmitBid: (playerId: string, bid: string) => void;
  onUpdateTaken: (playerId: string, roundNumber: number, taken: string) => void;
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
  firstDealerPlayerId,
  currentDealerId,
  currentPlayerBiddingId,
  onSubmitBid,
  onUpdateTaken,
  onNextRound,
  onFinishGame,
  onRestartGame,
  onSelectDealer,
}: ScoreInputTableProps) {
  
  const [currentBidValue, setCurrentBidValue] = useState('');

  const currentRoundConfig = gameRounds.find(r => r.roundNumber === currentRoundForInput);
  const playersForDisplay = gamePhase === 'DEALER_SELECTION' ? allPlayers.map(p => ({...p, playerId: p.id, name: p.name })) : playersScoreData;
  
  const currentDealerName = allPlayers.find(p => p.id === currentDealerId)?.name;
  const currentPlayerBiddingName = allPlayers.find(p => p.id === currentPlayerBiddingId)?.name;

  const handleBidInputChange = (value: string) => {
    setCurrentBidValue(value);
  };

  const handleLocalSubmitBid = () => {
    if (currentPlayerBiddingId) {
      onSubmitBid(currentPlayerBiddingId, currentBidValue);
      setCurrentBidValue(''); // Reset for next bidder
    }
  };
  
  const handleTakenChange = (playerId: string, roundNumber: number, value: string) => {
    onUpdateTaken(playerId, roundNumber, value);
  };

  if (gamePhase === 'SCORING' && !currentRoundConfig && gameRounds.length > 0) return <p>Loading round configuration...</p>;

  const isLastRound = currentRoundConfig && gameRounds.length > 0 && currentRoundForInput === gameRounds[gameRounds.length - 1]?.roundNumber;
  
  const roundsToDisplay = gameRounds.filter(roundInfo => roundInfo.roundNumber <= currentRoundForInput);

  const getHeaderTitle = () => {
    if (gamePhase === 'DEALER_SELECTION') {
      return "Select First Dealer";
    }
    if (gamePhase === 'SCORING' && currentRoundConfig) {
      let phaseText = '';
      if (currentRoundInputMode === 'BIDDING') {
        phaseText = currentPlayerBiddingName ? `Bidding: ${currentPlayerBiddingName}'s turn` : 'Enter Bids';
      } else {
        phaseText = 'Enter Tricks Taken';
      }
      const dealerInfo = currentDealerName ? `(Dealer: ${currentDealerName})` : '';
      return `Score Sheet - Round ${currentRoundForInput} of ${gameRounds.length} (Cards: ${currentRoundConfig.cardsDealt}) ${dealerInfo} - ${phaseText}`;
    }
    return "Score Sheet";
  }

  const getTableCaption = () => {
    if (gamePhase === 'DEALER_SELECTION') {
      return "Click on a player's name in the header to select them as the dealer for the first round.";
    }
    if (gamePhase === 'SCORING') {
      if (currentRoundInputMode === 'BIDDING') {
        return `Player ${currentPlayerBiddingName || 'Next'} is bidding. Other bids will be hidden until all bids are in.`;
      }
      return "All bids are in. Enter tricks taken for each player. Scroll down for totals.";
    }
    return "";
  }
  
  const getPlayerColumnSubtitle = (playerId: string) => {
    if (gamePhase !== 'SCORING') return '';
    if (currentRoundInputMode === 'BIDDING') {
      return playerId === currentPlayerBiddingId ? 'Enter Bid' : 'Waiting...';
    }
    return 'Bid / Taken → Score';
  }


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
                <TableHead className="w-[80px] font-semibold">
                  {gamePhase === 'DEALER_SELECTION' ? 'Players' : 'Round'}
                </TableHead>
                <TableHead className="w-[60px] font-semibold">
                  {gamePhase === 'DEALER_SELECTION' ? '' : 'Cards'}
                </TableHead>
                {playersForDisplay.map(player => (
                  <TableHead key={player.playerId} className="min-w-[180px] text-center font-semibold">
                    {gamePhase === 'DEALER_SELECTION' && onSelectDealer ? (
                      <Button 
                        variant="ghost" 
                        className="w-full h-auto p-1 text-base hover:bg-primary/20"
                        onClick={() => onSelectDealer(player.playerId)}
                      >
                        <UserCheck className="mr-2 h-5 w-5 text-accent" /> {player.name}
                         {currentDealerId === player.playerId && <UserCog className="ml-2 h-4 w-4 text-primary" />}
                      </Button>
                    ) : (
                      <>
                        {player.name}
                        {currentDealerId === player.playerId && <UserCog className="ml-2 h-4 w-4 inline text-primary-foreground" title="Dealer" />}
                        {currentPlayerBiddingId === player.playerId && <Target className="ml-2 h-4 w-4 inline text-accent" title="Current Bidder"/>}
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
                       {getPlayerColumnSubtitle(player.playerId)}
                    </TableHead>
                  ))}
                </TableRow>
              )}
            </TableHeader>
            {gamePhase === 'SCORING' && (
              <>
                <TableBody>
                  {roundsToDisplay.map((roundInfo) => {
                    const isCurrentInputRound = roundInfo.roundNumber === currentRoundForInput;
                    return (
                      <TableRow 
                        key={roundInfo.roundNumber} 
                        className={isCurrentInputRound ? 'bg-primary/10' : 'opacity-70'}
                      >
                        <TableCell className="font-medium">{roundInfo.roundNumber}</TableCell>
                        <TableCell>{roundInfo.cardsDealt}</TableCell>
                        {playersScoreData.map(player => {
                          const scoreEntry = player.scores.find(s => s.roundNumber === roundInfo.roundNumber);
                          const isCurrentPlayerBiddingThisPlayer = player.playerId === currentPlayerBiddingId;
                          return (
                            <TableCell key={`${player.playerId}-${roundInfo.roundNumber}`} className="text-center">
                              {isCurrentInputRound && currentRoundInputMode === 'BIDDING' ? (
                                <div className="flex items-center justify-center">
                                  {isCurrentPlayerBiddingThisPlayer ? (
                                    <Input
                                      type="number"
                                      min="0"
                                      max={roundInfo.cardsDealt.toString()}
                                      placeholder="Bid"
                                      aria-label={`Bid for ${player.name} round ${roundInfo.roundNumber}`}
                                      className="w-20 h-8 text-center"
                                      value={currentBidValue}
                                      onChange={(e) => handleBidInputChange(e.target.value)}
                                      autoFocus
                                    />
                                  ) : (
                                    // Display bid if already made, otherwise placeholder
                                    <span>{scoreEntry?.bid !== null ? scoreEntry?.bid : '...'}</span>
                                  )}
                                </div>
                              ) : isCurrentInputRound && currentRoundInputMode === 'TAKING' ? (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex gap-1 items-center">
                                    <span className="w-10 h-8 flex items-center justify-center font-medium text-sm">
                                        {scoreEntry?.bid ?? '-'}
                                    </span>
                                    <span className="text-muted-foreground">/</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      max={roundInfo.cardsDealt.toString()}
                                      placeholder="Taken"
                                      aria-label={`Tricks taken by ${player.name} round ${roundInfo.roundNumber}`}
                                      className="w-16 h-8 text-center"
                                      value={scoreEntry?.taken?.toString() ?? ''}
                                      onChange={(e) => handleTakenChange(player.playerId, roundInfo.roundNumber, e.target.value)}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground">→ {scoreEntry?.roundScore ?? 0}</span>
                                </div>
                              ) : ( // Past rounds or future rounds in 'TAKING' mode (though future not shown)
                                scoreEntry ? `${scoreEntry.bid ?? '-'} / ${scoreEntry.taken ?? '-'} → ${scoreEntry.roundScore}` : '- / - → 0'
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
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
              {currentRoundInputMode === 'BIDDING' ? (
                <Button 
                  onClick={handleLocalSubmitBid} 
                  size="lg" 
                  className="bg-green-500 hover:bg-green-600 text-white flex-grow"
                  disabled={!currentPlayerBiddingId || currentBidValue === ''}
                >
                  <ShieldCheck className="mr-2 h-5 w-5" /> Submit Bid for {currentPlayerBiddingName}
                </Button>
              ) : isLastRound ? (
                <Button onClick={onFinishGame} className="bg-accent text-accent-foreground hover:bg-accent/90 flex-grow" size="lg">
                  <CheckCircle className="mr-2 h-5 w-5" /> Finish & View Results
                </Button>
              ) : (
                <Button onClick={onNextRound} size="lg" className="flex-grow">
                  Next Round <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
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
