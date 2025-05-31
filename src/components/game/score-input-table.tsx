"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlayerScoreData, GameRoundInfo } from '@/lib/types';
import { ArrowRight, CheckCircle, RefreshCw } from 'lucide-react';

interface ScoreInputTableProps {
  playersScoreData: PlayerScoreData[];
  gameRounds: GameRoundInfo[];
  currentRoundForInput: number;
  onUpdateScore: (playerId: string, roundNumber: number, bid: string, taken: string) => void;
  onNextRound: () => void;
  onFinishGame: () => void;
}

export function ScoreInputTable({
  playersScoreData,
  gameRounds,
  currentRoundForInput,
  onUpdateScore,
  onNextRound,
  onFinishGame,
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

  if (!currentRoundConfig) return <p>Loading round configuration...</p>;

  const isLastRound = currentRoundForInput === gameRounds[gameRounds.length - 1].roundNumber;

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-center text-primary-foreground">
          Score Sheet - Round {currentRoundForInput} of {gameRounds.length} (Cards: {currentRoundConfig.cardsDealt})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>Enter bids and tricks taken for each player.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] font-semibold">Round</TableHead>
                <TableHead className="w-[60px] font-semibold">Cards</TableHead>
                {playersScoreData.map(player => (
                  <TableHead key={player.playerId} className="min-w-[180px] text-center font-semibold">{player.name}</TableHead>
                ))}
              </TableRow>
              <TableRow>
                <TableHead></TableHead>
                <TableHead></TableHead>
                {playersScoreData.map(player => (
                  <TableHead key={`${player.playerId}-subtitle`} className="text-center text-xs text-muted-foreground">Bid / Taken → Score</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {gameRounds.map((roundInfo) => {
                const isCurrentInputRound = roundInfo.roundNumber === currentRoundForInput;
                const isPastRound = roundInfo.roundNumber < currentRoundForInput;
                return (
                  <TableRow key={roundInfo.roundNumber} className={isCurrentInputRound ? 'bg-primary/10' : isPastRound ? 'opacity-70' : ''}>
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
          </Table>
        </div>
        <div className="mt-8 flex justify-end gap-4">
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
      </CardContent>
    </Card>
  );
}
