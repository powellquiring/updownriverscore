
"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlayerScoreData, GameRoundInfo, GamePhase } from '@/lib/types';
import { ArrowRight, CheckCircle, RefreshCw, UserCheck } from 'lucide-react';

interface ScoreInputTableProps {
  playersScoreData: PlayerScoreData[];
  gameRounds: GameRoundInfo[];
  currentRoundForInput: number;
  gamePhase: GamePhase;
  firstDealerPlayerId: string | null;
  onUpdateScore: (playerId: string, roundNumber: number, bid: string, taken: string) => void;
  onNextRound: () => void;
  onFinishGame: () => void;
  onRestartGame: () => void;
  onSelectDealer?: (playerId: string) => void;
}

export function ScoreInputTable({
  playersScoreData,
  gameRounds,
  currentRoundForInput,
  gamePhase,
  firstDealerPlayerId,
  onUpdateScore,
  onNextRound,
  onFinishGame,
  onRestartGame,
  onSelectDealer,
}: ScoreInputTableProps) {
  
  const currentRoundConfig = gameRounds.find(r => r.roundNumber === currentRoundForInput);

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

  const isLastRound = currentRoundForInput === gameRounds[gameRounds.length - 1]?.roundNumber;
  const roundsToDisplay = gameRounds.filter(roundInfo => roundInfo.roundNumber <= currentRoundForInput);

  const getHeaderTitle = () => {
    if (gamePhase === 'DEALER_SELECTION') {
      return "Select First Dealer";
    }
    if (gamePhase === 'SCORING' && currentRoundConfig) {
      return `Score Sheet - Round ${currentRoundForInput} of ${gameRounds.length} (Cards: ${currentRoundConfig.cardsDealt})`;
    }
    return "Score Sheet";
  }

  const getTableCaption = () => {
    if (gamePhase === 'DEALER_SELECTION') {
      return "Click on a player's name in the header to select them as the dealer for the first round.";
    }
    if (gamePhase === 'SCORING') {
      return "Enter bids and tricks taken for each player. Scroll down for totals.";
    }
    return "";
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-center text-primary-foreground">
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
                {playersScoreData.map(player => (
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
                    <TableHead key={`${player.playerId}-subtitle`} className="text-center text-xs text-muted-foreground">Bid / Taken → Score</TableHead>
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
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex gap-1 items-center">
                                    <Input
                                      type="number"
                                      min="0"
                                      max={roundInfo.cardsDealt.toString()}
                                      placeholder="Bid"
                                      aria-label={`Bid for ${player.name} round ${roundInfo.roundNumber}`}
                                      className="w-16 h-8 text-center"
                                      value={scoreEntry?.bid?.toString() ?? ''}
                                      onChange={(e) => handleScoreChange(player.playerId, roundInfo.roundNumber, 'bid', e.target.value)}
                                    />
                                    <span>/</span>
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
          <div className="mt-8 flex justify-between items-center gap-4">
            <Button onClick={onRestartGame} variant="outline" size="lg">
              <RefreshCw className="mr-2 h-5 w-5" /> Restart Game
            </Button>
            <div className="flex gap-4">
              {isLastRound ? (
                <Button onClick={onFinishGame} className="bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
                  <CheckCircle className="mr-2 h-5 w-5" /> Finish Game & View Results
                </Button>
              ) : (
                <Button onClick={onNextRound} size="lg">
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
