
"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlayerScoreData, GameRoundInfo, GamePhase, Player, CurrentRoundInputMode } from '@/lib/types';
import { ArrowRight, CheckCircle, RefreshCw, UserCheck, Edit3, ShieldCheck } from 'lucide-react';

interface ScoreInputTableProps {
  playersScoreData: PlayerScoreData[];
  allPlayers: Player[]; 
  gameRounds: GameRoundInfo[];
  currentRoundForInput: number;
  gamePhase: GamePhase;
  currentRoundInputMode: CurrentRoundInputMode;
  firstDealerPlayerId: string | null;
  onUpdateScore: (playerId: string, roundNumber: number, bid: string, taken: string) => void;
  onConfirmBids: () => void;
  onNextRound: () => void;
  onFinishGame: () => void;
  onRestartGame: () => void;
  onSelectDealer?: (playerId: string) => void;
}

export function ScoreInputTable({
  playersScoreData,
  allPlayers,
  gameRounds,
  currentRoundForInput,
  gamePhase,
  currentRoundInputMode,
  firstDealerPlayerId,
  onUpdateScore,
  onConfirmBids,
  onNextRound,
  onFinishGame,
  onRestartGame,
  onSelectDealer,
}: ScoreInputTableProps) {
  
  const currentRoundConfig = gameRounds.find(r => r.roundNumber === currentRoundForInput);
  // Use allPlayers for dealer selection, otherwise use playersScoreData which has scoring info
  const playersForDisplay = gamePhase === 'DEALER_SELECTION' ? allPlayers.map(p => ({...p, playerId: p.id})) : playersScoreData;


  const handleScoreChange = (playerId: string, roundNumber: number, field: 'bid' | 'taken', value: string) => {
    const playerScore = playersScoreData.find(p => p.playerId === playerId);
    const roundScore = playerScore?.scores.find(s => s.roundNumber === roundNumber);
    
    let bid = roundScore?.bid?.toString() ?? '';
    let taken = roundScore?.taken?.toString() ?? '';

    if (field === 'bid') bid = value;
    if (field === 'taken') taken = value;
    
    onUpdateScore(playerId, roundNumber, bid, taken);
  };

  if (gamePhase === 'SCORING' && !currentRoundConfig) return <p>Loading round configuration...</p>;

  const isLastRound = currentRoundConfig && gameRounds.length > 0 && currentRoundForInput === gameRounds[gameRounds.length - 1]?.roundNumber;
  
  // Only display rows for rounds up to and including the current input round
  const roundsToDisplay = gameRounds.filter(roundInfo => roundInfo.roundNumber <= currentRoundForInput);

  const getHeaderTitle = () => {
    if (gamePhase === 'DEALER_SELECTION') {
      return "Select First Dealer";
    }
    if (gamePhase === 'SCORING' && currentRoundConfig) {
      const phaseText = currentRoundInputMode === 'BIDDING' ? 'Enter Bids' : 'Enter Tricks Taken';
      return `Score Sheet - Round ${currentRoundForInput} of ${gameRounds.length} (Cards: ${currentRoundConfig.cardsDealt}) - ${phaseText}`;
    }
    return "Score Sheet";
  }

  const getTableCaption = () => {
    if (gamePhase === 'DEALER_SELECTION') {
      return "Click on a player's name in the header to select them as the dealer for the first round.";
    }
    if (gamePhase === 'SCORING') {
      if (currentRoundInputMode === 'BIDDING') {
        return "Enter bids for each player for the current round. Confirm bids to proceed.";
      }
      return "Bids confirmed. Enter tricks taken for each player. Scroll down for totals.";
    }
    return "";
  }
  
  const getPlayerColumnSubtitle = () => {
    if (gamePhase !== 'SCORING') return '';
    return currentRoundInputMode === 'BIDDING' ? 'Enter Bid' : 'Bid / Taken → Score';
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-xl sm:text-2xl text-center text-primary-foreground">
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
                      </Button>
                    ) : (
                      player.name
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
                       {getPlayerColumnSubtitle()}
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
                          return (
                            <TableCell key={`${player.playerId}-${roundInfo.roundNumber}`} className="text-center">
                              {isCurrentInputRound ? (
                                currentRoundInputMode === 'BIDDING' ? (
                                  <div className="flex items-center justify-center">
                                    <Input
                                      type="number"
                                      min="0"
                                      max={roundInfo.cardsDealt.toString()}
                                      placeholder="Bid"
                                      aria-label={`Bid for ${player.name} round ${roundInfo.roundNumber}`}
                                      className="w-20 h-8 text-center"
                                      value={scoreEntry?.bid?.toString() ?? ''}
                                      onChange={(e) => handleScoreChange(player.playerId, roundInfo.roundNumber, 'bid', e.target.value)}
                                    />
                                  </div>
                                ) : ( // currentRoundInputMode === 'TAKING'
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
                                        onChange={(e) => handleScoreChange(player.playerId, roundInfo.roundNumber, 'taken', e.target.value)}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground">→ {scoreEntry?.roundScore ?? 0}</span>
                                  </div>
                                )
                              ) : (
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
                <Button onClick={onConfirmBids} size="lg" className="bg-green-500 hover:bg-green-600 text-white flex-grow">
                  <ShieldCheck className="mr-2 h-5 w-5" /> Confirm Bids
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
