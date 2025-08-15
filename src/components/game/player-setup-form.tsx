
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PlusCircle, UserMinus, Users, Settings, Gamepad2 } from 'lucide-react';
import type { Player } from '@/lib/types';
// import { useToast } from '@/hooks/use-toast'; // Removed
import { DEFAULT_MAX_CARDS_DEALT, DEFAULT_BID_POINTS, STORAGE_KEY_GAME_STATE, STORAGE_KEY_GAME_CONFIG } from '@/lib/constants';

interface PlayerSetupFormProps {
  players: Player[];
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onStartGame: (maxCardsInHand: number, bidPoints: number) => void;
  isResuming?: boolean;
}

export function PlayerSetupForm({ players, onAddPlayer, onRemovePlayer, onStartGame, isResuming = false }: PlayerSetupFormProps) {
  const [playerName, setPlayerName] = useState('');
  // Get saved values from localStorage or use defaults
  const [maxCardsInHand, setMaxCardsInHand] = useState(() => {
    // Check if code is running in browser
    if (typeof window === 'undefined') {
      return DEFAULT_MAX_CARDS_DEALT.toString();
    }
    
    // First try to get from the dedicated config storage
    const savedConfig = localStorage.getItem(STORAGE_KEY_GAME_CONFIG);
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (typeof config.maxCardsDealtByUser === 'number') {
          return config.maxCardsDealtByUser.toString();
        }
      } catch (error) {
        console.error("Failed to parse saved config:", error);
      }
    }
    
    // Fall back to the full state if available
    const savedState = localStorage.getItem(STORAGE_KEY_GAME_STATE);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (typeof state.maxCardsDealtByUser === 'number') {
          return state.maxCardsDealtByUser.toString();
        }
      } catch (error) {
        console.error("Failed to parse saved max cards value:", error);
      }
    }
    return DEFAULT_MAX_CARDS_DEALT.toString();
  });
  
  const [bidPoints, setBidPoints] = useState(() => {
    // Check if code is running in browser
    if (typeof window === 'undefined') {
      return DEFAULT_BID_POINTS.toString();
    }
    
    // First try to get from the dedicated config storage
    const savedConfig = localStorage.getItem(STORAGE_KEY_GAME_CONFIG);
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (typeof config.bidPoints === 'number') {
          return config.bidPoints.toString();
        }
      } catch (error) {
        console.error("Failed to parse saved config:", error);
      }
    }
    
    // Fall back to the full state if available
    const savedState = localStorage.getItem(STORAGE_KEY_GAME_STATE);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (typeof state.bidPoints === 'number') {
          return state.bidPoints.toString();
        }
      } catch (error) {
        console.error("Failed to parse saved bid points value:", error);
      }
    }
    return DEFAULT_BID_POINTS.toString();
  });
  // const { toast } = useToast(); // Removed
  const startGameButtonRef = useRef<HTMLButtonElement>(null);
  const maxCardsInputRef = useRef<HTMLInputElement>(null);
  const bidPointsInputRef = useRef<HTMLInputElement>(null);

  const isStartGameButtonDisabled = () => {
    const numMaxCards = parseInt(maxCardsInHand, 10);
    const numBidPoints = parseInt(bidPoints, 10);
    if (isNaN(numMaxCards) || numMaxCards < 1 || numMaxCards > 7) {
        return true;
    }
    if (isNaN(numBidPoints) || numBidPoints < 0 || numBidPoints > 20) {
        return true;
    }
    if (players.length < 2) {
        return true;
    }
    return false;
  };

  useEffect(() => {
    const canStart = !isStartGameButtonDisabled();
    if (canStart && startGameButtonRef.current) {
      const activeElement = document.activeElement;
      if (
        !(activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) &&
        activeElement !== startGameButtonRef.current
      ) {
        // startGameButtonRef.current.focus(); 
      }
    }
  }, [players, maxCardsInHand, bidPoints]);


  const handleAddPlayerFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim() === '') {
      // toast({ title: "Player name cannot be empty.", variant: "destructive" }); // Removed
      console.warn("Player name cannot be empty.");
      return;
    }
    if (players.length >= 7) { 
        // toast({ title: "Maximum of 7 players allowed.", variant: "destructive" }); // Removed
        console.warn("Maximum of 7 players allowed.");
        return;
    }
    onAddPlayer(playerName.trim());
    setPlayerName('');
  };

  const handleInitiateGame = () => {
    const numMaxCards = parseInt(maxCardsInHand, 10);
    const numBidPoints = parseInt(bidPoints, 10);
    if (isNaN(numMaxCards) || numMaxCards < 1 || numMaxCards > 7) {
      console.warn("Invalid Max Cards. Max cards per hand must be a number between 1 and 7.");
      return;
    }
    if (isNaN(numBidPoints) || numBidPoints < 0 || numBidPoints > 20) {
      console.warn("Invalid Bid Points. Points for making bid must be a number between 0 and 20.");
      return;
    }
    if (players.length < 2) {
      console.warn("Need at least 2 players to start.");
      return;
    }
    onStartGame(numMaxCards, numBidPoints);
  };
  
  const handleMaxCardsKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isStartGameButtonDisabled()) {
      event.preventDefault();
      handleInitiateGame();
    }
  };

  const handlePlayerNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (playerName.trim() === '' && !isStartGameButtonDisabled()) {
        event.preventDefault(); // Prevent form submission (which would try to add an empty player)
        handleInitiateGame();
      }
      // If playerName is not empty, the form's onSubmit will handle adding the player.
      // If playerName is empty but game cannot be started, the form's onSubmit will trigger,
      // and handleAddPlayerFormSubmit will show its "name cannot be empty" toast.
    }
  };

  const handleBidPointsKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isStartGameButtonDisabled()) {
      event.preventDefault();
      handleInitiateGame();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl text-primary-foreground">
          <Gamepad2 className="h-6 w-6 text-accent" /> Game Setup
        </CardTitle>
        <CardDescription>Configure your game and add players to begin.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center gap-2 text-foreground">
            <Settings className="h-5 w-5 text-primary-foreground" />
            Game Configuration
          </h3>
          <div className="space-y-2">
            <Label htmlFor="max-cards" className="text-sm font-medium text-foreground">Max Cards per Hand</Label>
            <Input
              ref={maxCardsInputRef}
              id="max-cards"
              type="number"
              value={maxCardsInHand}
              onChange={(e) => setMaxCardsInHand(e.target.value)}
              onKeyDown={handleMaxCardsKeyDown}
              min="1"
              max="7"
              placeholder="e.g., 7"
              className="w-full"
              aria-describedby="max-cards-description"
            />
            <p id="max-cards-description" className="text-xs text-muted-foreground">
              Determines rounds. E.g., 7 means 13 rounds (7 down to 1, then 2 up to 7). Actual max may be lower with many players.
            </p>
          </div>

          <div className="space-y-2 mt-4">
            <Label htmlFor="bid-points" className="text-sm font-medium text-foreground">Points for Making Bid</Label>
            <Input
              id="bid-points"
              type="number"
              value={bidPoints}
              onChange={(e) => setBidPoints(e.target.value)}
              onKeyDown={handleBidPointsKeyDown}
              min="0"
              max="20"
              placeholder="e.g., 10"
              className="w-full"
              aria-describedby="bid-points-description"
            />
            <p id="bid-points-description" className="text-xs text-muted-foreground">
              Base points awarded when a player makes their bid exactly. Default is 10.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5 text-primary-foreground" />
            Player Setup
          </h3>
          <form onSubmit={handleAddPlayerFormSubmit} className="flex gap-2 mb-4">
            <Input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={handlePlayerNameKeyDown} // Added this line
              placeholder="Enter player name"
              aria-label="Player name"
              className="flex-grow"
            />
            <Button type="submit" aria-label="Add player" disabled={players.length >= 7}>
              <PlusCircle className="h-5 w-5 mr-2" /> Add Player
            </Button>
          </form>

          {players.length > 0 && (
            <div>
              <h4 className="text-md font-medium mb-2 text-foreground">Current Players ({players.length}/7):</h4>
              <ul className="space-y-2">
                {players.map((player) => (
                  <li key={player.id} className="flex items-center justify-between bg-secondary p-3 rounded-md shadow-sm">
                    <span className="text-secondary-foreground">{player.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemovePlayer(player.id)}
                      aria-label={`Remove ${player.name}`}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <UserMinus className="h-5 w-5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          ref={startGameButtonRef}
          onClick={handleInitiateGame}
          disabled={isStartGameButtonDisabled()}
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          size="lg"
        >
          {isResuming ? 'Resume Game' : 'Start Game'}
        </Button>
      </CardFooter>
    </Card>
  );
}
