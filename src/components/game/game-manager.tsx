
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import type { Player, GameRoundInfo, PlayerScoreData, RoundScoreEntry, GamePhase } from '@/lib/types';
import { PlayerSetupForm } from './player-setup-form';
import { ScoreInputTable } from './score-input-table';
import { ResultsDisplay } from './results-display';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

// Helper function to generate rounds configuration
const generateGameRounds = (numPlayers: number, maxCardsDealtPerPlayer: number): GameRoundInfo[] => {
  const rounds: GameRoundInfo[] = [];
  // Cap maxCards if too many players for a standard 52 card deck, or less than the config.
  const actualMaxCards = Math.min(maxCardsDealtPerPlayer, Math.floor(52 / numPlayers));

  // Rounds starting from actualMaxCards down to 1
  for (let i = actualMaxCards; i >= 1; i--) {
    rounds.push({ roundNumber: rounds.length + 1, cardsDealt: i, isUpRound: false });
  }
  // Rounds going up from 2 to actualMaxCards
  // (Start from 2 because 1 card round is already covered in the "down" sequence,
  //  and this loop won't run if actualMaxCards is 1)
  for (let i = 2; i <= actualMaxCards; i++) {
    rounds.push({ roundNumber: rounds.length + 1, cardsDealt: i, isUpRound: true });
  }
  return rounds;
};

const MAX_CARDS_DEALT_CONFIG = 7; // Max cards dealt in a single hand, e.g., 7 for shorter game

export function GameManager() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameRounds, setGameRounds] = useState<GameRoundInfo[]>([]);
  const [playersScoreData, setPlayersScoreData] = useState<PlayerScoreData[]>([]);
  const [currentRoundForInput, setCurrentRoundForInput] = useState<number>(1);
  const [gamePhase, setGamePhase] = useState<GamePhase>('SETUP');
  const { toast } = useToast();

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('updownRiverScorerState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        // Basic validation to ensure loaded data structure is somewhat expected
        // This won't catch all stale data issues but can help prevent crashes
        if (state.players && Array.isArray(state.players)) setPlayers(state.players);
        if (state.gameRounds && Array.isArray(state.gameRounds) && state.gameRounds.length > 0) {
           // If gamePhase is SETUP, don't load old rounds, let new ones generate.
           // Or if the rounds structure seems invalid (e.g. no cardsDealt)
           if (state.gamePhase === 'SETUP' || !state.gameRounds[0]?.cardsDealt) {
            // Potentially stale rounds for a SETUP phase, or malformed.
            // Rely on handleStartGame to generate fresh rounds.
           } else {
            setGameRounds(state.gameRounds);
           }
        }
        if (state.playersScoreData && Array.isArray(state.playersScoreData)) setPlayersScoreData(state.playersScoreData);
        if (state.currentRoundForInput && typeof state.currentRoundForInput === 'number') setCurrentRoundForInput(state.currentRoundForInput);
        if (state.gamePhase && typeof state.gamePhase === 'string') setGamePhase(state.gamePhase as GamePhase);
        else {
          setGamePhase('SETUP'); // Default to setup if phase is missing/invalid
        }

      } catch (error) {
        console.error("Failed to load saved state:", error);
        localStorage.removeItem('updownRiverScorerState'); // Clear corrupted state
        setGamePhase('SETUP'); // Reset to setup
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    // Avoid saving an empty/initial state immediately on load if nothing has happened.
    if (gamePhase === 'SETUP' && players.length === 0 && gameRounds.length === 0) {
        // If localStorage exists, it means there was a previous game. Don't overwrite it with an empty state
        // until a new game is explicitly started or players are added.
        if (localStorage.getItem('updownRiverScorerState')) {
            return;
        }
    }

    const stateToSave = {
      players,
      gameRounds,
      playersScoreData,
      currentRoundForInput,
      gamePhase,
    };
    localStorage.setItem('updownRiverScorerState', JSON.stringify(stateToSave));
  }, [players, gameRounds, playersScoreData, currentRoundForInput, gamePhase]);


  const handleAddPlayer = useCallback((name: string) => {
    setPlayers(prev => [...prev, { id: uuidv4(), name }]);
  }, []);

  const handleRemovePlayer = useCallback((id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    // If all players are removed, consider resetting part of the game state or not
  }, []);

  const handleStartGame = useCallback(() => {
    if (players.length < 2) {
      toast({ title: "Need at least 2 players to start.", variant: "destructive" });
      return;
    }
    // Crucially, new rounds are generated here, overriding any loaded from localStorage for a *new* game.
    const roundsConfig = generateGameRounds(players.length, MAX_CARDS_DEALT_CONFIG);
    setGameRounds(roundsConfig);

    const initialScores: PlayerScoreData[] = players.map(player => ({
      playerId: player.id,
      name: player.name,
      scores: roundsConfig.map(r => ({
        roundNumber: r.roundNumber,
        bid: null,
        taken: null,
        roundScore: 0,
      })),
      totalScore: 0,
    }));
    setPlayersScoreData(initialScores);
    setCurrentRoundForInput(1);
    setGamePhase('SCORING');
    toast({ title: "Game Started!", description: `Playing ${roundsConfig.length} rounds.` });
  }, [players, toast]);

  const calculateRoundScore = (bid: number | null, taken: number | null): number => {
    if (bid === null || taken === null) return 0;
    if (bid === taken) {
      return 10 + bid;
    }
    return 0; // Or -Math.abs(bid - taken) or other penalty rules
  };

  const handleUpdateScore = useCallback((playerId: string, roundNumber: number, bidStr: string, takenStr: string) => {
    setPlayersScoreData(prevData => {
      return prevData.map(playerData => {
        if (playerData.playerId === playerId) {
          const bid = bidStr === '' ? null : parseInt(bidStr, 10);
          const taken = takenStr === '' ? null : parseInt(takenStr, 10);
          
          const updatedScores = playerData.scores.map(scoreEntry => {
            if (scoreEntry.roundNumber === roundNumber) {
              return {
                ...scoreEntry,
                bid: isNaN(bid as number) ? null : bid,
                taken: isNaN(taken as number) ? null : taken,
                roundScore: calculateRoundScore(bid, taken),
              };
            }
            return scoreEntry;
          });
          const totalScore = updatedScores.reduce((sum, entry) => sum + entry.roundScore, 0);
          return { ...playerData, scores: updatedScores, totalScore };
        }
        return playerData;
      });
    });
  }, []);

  const handleNextRound = useCallback(() => {
    // Validate current round inputs before proceeding
    const currentRoundDataIsValid = playersScoreData.every(player => {
        const roundEntry = player.scores.find(s => s.roundNumber === currentRoundForInput);
        return roundEntry && roundEntry.bid !== null && roundEntry.taken !== null;
    });

    if (!currentRoundDataIsValid) {
        toast({ title: "Missing Scores", description: "Please enter bid and tricks taken for all players in the current round.", variant: "destructive" });
        return;
    }

    if (currentRoundForInput < gameRounds.length) {
      setCurrentRoundForInput(prev => prev + 1);
    } else {
      // This case should ideally be handled by the "Finish Game" button
      // but as a fallback, if NextRound is called on the last round, transition to results.
      setGamePhase('RESULTS');
      toast({ title: "Game Finished!", description: "All rounds completed. Check out the final scores." });
    }
  }, [currentRoundForInput, gameRounds.length, playersScoreData, toast]);

  const handleFinishGame = useCallback(() => {
     const currentRoundDataIsValid = playersScoreData.every(player => {
        const roundEntry = player.scores.find(s => s.roundNumber === currentRoundForInput);
        // For the last round, it's okay if it's not fully filled if user wants to finish early,
        // but ideally, it should be. We'll allow finishing.
        // Consider if strict validation is needed here as well.
        return roundEntry; // Simpler check: just ensure entry exists. Stricter: check bid/taken not null.
    });

    // If scoring is ongoing and current round isn't valid (optional strict check)
    // if (!currentRoundDataIsValid && gamePhase === 'SCORING') {
    //     toast({ title: "Missing Scores", description: "Please enter bid and tricks taken for all players in the final round.", variant: "destructive" });
    //     return;
    // }
    setGamePhase('RESULTS');
    toast({ title: "Game Finished!", description: "Check out the final scores." });
  }, [playersScoreData, currentRoundForInput, gamePhase, toast]);

  const handlePlayAgain = useCallback(() => {
    setPlayers([]);
    setGameRounds([]);
    setPlayersScoreData([]);
    setCurrentRoundForInput(1);
    setGamePhase('SETUP');
    localStorage.removeItem('updownRiverScorerState'); // Clear saved state for new game
    toast({ title: "New Game Setup", description: "Add players to start again." });
  }, [toast]);

  if (gamePhase === 'SETUP') {
    return <PlayerSetupForm players={players} onAddPlayer={handleAddPlayer} onRemovePlayer={handleRemovePlayer} onStartGame={handleStartGame} />;
  }

  if (gamePhase === 'SCORING' && gameRounds.length > 0 && playersScoreData.length > 0) {
    const currentRoundInfo = gameRounds.find(r => r.roundNumber === currentRoundForInput);
    if (!currentRoundInfo) {
        // This might happen if currentRoundForInput is out of sync with gameRounds, e.g. after bad localStorage load
        // Attempt to reset or handle gracefully
        console.error("Error: Current round configuration not found. Resetting to setup.");
        handlePlayAgain(); // Force reset
        return <p>Error loading round. Resetting game...</p>;
    }
    return (
      <ScoreInputTable
        playersScoreData={playersScoreData}
        gameRounds={gameRounds}
        currentRoundForInput={currentRoundForInput}
        onUpdateScore={handleUpdateScore}
        onNextRound={handleNextRound}
        onFinishGame={handleFinishGame}
      />
    );
  }

  if (gamePhase === 'RESULTS') {
    return <ResultsDisplay playersScoreData={playersScoreData} onPlayAgain={handlePlayAgain} />;
  }

  // Fallback or initial loading state, especially if localStorage load is async and hasn't completed.
  // Or if gamePhase is somehow invalid.
  return <p>Loading game... If this persists, try refreshing or starting a new game.</p>;
}
