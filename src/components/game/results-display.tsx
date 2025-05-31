"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PlayerScoreData } from '@/lib/types';
import { Award, Trophy, Users, Repeat } from 'lucide-react';

interface ResultsDisplayProps {
  playersScoreData: PlayerScoreData[];
  onPlayAgain: () => void;
}

export function ResultsDisplay({ playersScoreData, onPlayAgain }: ResultsDisplayProps) {
  const sortedPlayers = [...playersScoreData].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="font-headline text-3xl flex items-center justify-center gap-2 text-primary-foreground">
          <Trophy className="h-8 w-8 text-accent" /> Game Over!
        </CardTitle>
        <CardDescription>Here are the final results.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {sortedPlayers.map((player, index) => (
            <li
              key={player.playerId}
              className={`flex items-center justify-between p-4 rounded-lg shadow ${
                index === 0 ? 'bg-accent/20 border-2 border-accent' : 'bg-card'
              }`}
            >
              <div className="flex items-center gap-3">
                {index === 0 && <Award className="h-6 w-6 text-yellow-500" />}
                {index === 1 && <Award className="h-6 w-6 text-slate-400" />}
                {index === 2 && <Award className="h-6 w-6 text-orange-400" />}
                <span className={`text-xl font-medium ${index === 0 ? 'text-accent-foreground font-bold' : 'text-foreground'}`}>
                  {index + 1}. {player.name}
                </span>
              </div>
              <span className={`text-2xl font-bold ${index === 0 ? 'text-accent-foreground' : 'text-primary-foreground'}`}>
                {player.totalScore}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button onClick={onPlayAgain} className="w-full" size="lg">
          <Repeat className="mr-2 h-5 w-5" /> Play Again
        </Button>
      </CardFooter>
    </Card>
  );
}
