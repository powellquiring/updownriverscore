"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, UserMinus, Users } from 'lucide-react';
import type { Player } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface PlayerSetupFormProps {
  players: Player[];
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onStartGame: () => void;
}

export function PlayerSetupForm({ players, onAddPlayer, onRemovePlayer, onStartGame }: PlayerSetupFormProps) {
  const [playerName, setPlayerName] = useState('');
  const { toast } = useToast();

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim() === '') {
      toast({ title: "Player name cannot be empty.", variant: "destructive" });
      return;
    }
    if (players.length >= 6) { // Max 6 players for better table display
        toast({ title: "Maximum of 6 players allowed.", variant: "destructive" });
        return;
    }
    onAddPlayer(playerName.trim());
    setPlayerName('');
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Users className="h-6 w-6 text-primary-foreground" /> Player Setup
        </CardTitle>
        <CardDescription>Add players to start the game. Minimum 2 players.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddPlayer} className="flex gap-2 mb-6">
          <Input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter player name"
            aria-label="Player name"
            className="flex-grow"
          />
          <Button type="submit" aria-label="Add player">
            <PlusCircle className="h-5 w-5 mr-2" /> Add
          </Button>
        </form>

        {players.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2 text-foreground">Players:</h3>
            <ul className="space-y-2">
              {players.map((player) => (
                <li key={player.id} className="flex items-center justify-between bg-secondary p-3 rounded-md">
                  <span className="text-secondary-foreground">{player.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemovePlayer(player.id)}
                    aria-label={`Remove ${player.name}`}
                  >
                    <UserMinus className="h-5 w-5 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={onStartGame}
          disabled={players.length < 2}
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          size="lg"
        >
          Start Game
        </Button>
      </CardFooter>
    </Card>
  );
}
