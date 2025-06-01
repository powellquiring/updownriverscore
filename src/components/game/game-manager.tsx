
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import type { Player, GameRoundInfo, PlayerScoreData, RoundScoreEntry, GamePhase } from '@/lib/types';
import { PlayerSetupForm } from './player-setup-form';
import { ScoreInputTable } from './score-input-table';
import { ResultsDisplay } from './results-display';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

// Helper function to generate rounds configuration
const generateGameRounds = (numPlayers: number, maxCardsDealtByUser: number): GameRoundInfo[] => {
  const rounds: GameRoundInfo[] = [];
  const actualMaxCards = Math.max(1, Math.min(maxCardsDealtByUser, Math.floor(52 / numPlayers)));

  // Rounds starting from actualMaxCards down to 1
  for (let i = actualMaxCards; i >= 1; i--) {
    rounds.push({ roundNumber: rounds.length + 1, cardsDealt: i, isUpRound: false });
  }
  // Rounds going up from 2 to actualMaxCards
  if (actualMaxCards > 1) {
    for (let i = 2; i <= actualMaxCards; i++) {
      rounds.push({ roundNumber: rounds.length + 1, cardsDealt: i, isUpRound: true });
    }
  }
  
  if (rounds.length === 0 && actualMaxCards === 1) { 
    rounds.push({ roundNumber: 1, cardsDealt: 1, isUpRound: false });
  }

  return rounds;
};

export function GameManager() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameRounds, setGameRounds] = useState<GameRoundInfo[]>([]);
  const [playersScoreData, setPlayersScoreData] = useState<PlayerScoreData[]>([]);
  const [currentRoundForInput, setCurrentRoundForInput] = useState<number>(1);
  const [gamePhase, setGamePhase] = useState<GamePhase>('SETUP');
  const [firstDealerPlayerId, setFirstDealerPlayerId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedState = localStorage.getItem('updownRiverScorerState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.players && Array.isArray(state.players)) setPlayers(state.players);
        
        let loadedGamePhase: GamePhase = 'SETUP';
        if (state.gamePhase && typeof state.gamePhase === 'string') {
            loadedGamePhase = state.gamePhase as GamePhase;
            setGamePhase(loadedGamePhase);
        } else {
            setGamePhase('SETUP');
        }

        if (loadedGamePhase !== 'SETUP' && state.gameRounds && Array.isArray(state.gameRounds) && state.gameRounds.length > 0 && state.gameRounds[0]?.cardsDealt) {
            setGameRounds(state.gameRounds);
        }

        if (state.playersScoreData && Array.isArray(state.playersScoreData)) setPlayersScoreData(state.playersScoreData);
        if (state.currentRoundForInput && typeof state.currentRoundForInput === 'number') setCurrentRoundForInput(state.currentRoundForInput);
        if (state.firstDealerPlayerId && typeof state.firstDealerPlayerId === 'string') setFirstDealerPlayerId(state.firstDealerPlayerId);
        
      } catch (error) {
        console.error("Failed to load saved state:", error);
        localStorage.removeItem('updownRiverScorerState'); 
        setGamePhase('SETUP'); 
        setFirstDealerPlayerId(null);
      }
    }
  }, []);

  useEffect(() => {
    if (gamePhase === 'SETUP' && players.length === 0 && gameRounds.length === 0) {
        if (localStorage.getItem('updownRiverScorerState') && playersScoreData.length === 0) {
            return;
        }
    }

    const stateToSave = {
      players,
      gameRounds,
      playersScoreData,
      currentRoundForInput,
      gamePhase,
      firstDealerPlayerId,
    };
    localStorage.setItem('updownRiverScorerState', JSON.stringify(stateToSave));
  }, [players, gameRounds, playersScoreData, currentRoundForInput, gamePhase, firstDealerPlayerId]);


  const handleAddPlayer = useCallback((name: string) => {
    setPlayers(prev => [...prev, { id: uuidv4(), name }]);
  }, []);

  const handleRemovePlayer = useCallback((id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setPlayersScoreData(prev => prev.filter(ps => ps.playerId !== id));
  }, []);

  const handleStartGame = useCallback((maxCardsDealtByUser: number) => {
    const roundsConfig = generateGameRounds(players.length, maxCardsDealtByUser);
    if (roundsConfig.length === 0) {
        toast({ title: "Game Configuration Error", description: "Could not generate rounds. Ensure player count and max cards are valid.", variant: "destructive"});
        setGamePhase('SETUP'); 
        return;
    }
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
    setFirstDealerPlayerId(null);
    setGamePhase('DEALER_SELECTION');
    toast({ title: "Game Ready!", description: `Please select the dealer for the first round.` });
  }, [players, toast]);

  const handleSelectDealer = useCallback((playerId: string) => {
    setFirstDealerPlayerId(playerId);
    setGamePhase('SCORING');
    const dealerName = players.find(p => p.id === playerId)?.name || 'Selected Player';
    toast({ title: "Dealer Selected", description: `${dealerName} is the dealer. Starting Round 1 with ${gameRounds[0]?.cardsDealt} cards.` });
  }, [players, gameRounds, toast]);

  const calculateRoundScore = (bid: number | null, taken: number | null): number => {
    if (bid === null || taken === null) return 0;
    if (bid === taken) {
      return 10 + bid;
    }
    return 0; 
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
    const currentRoundDataIsValid = playersScoreData.every(player => {
        const roundEntry = player.scores.find(s => s.roundNumber === currentRoundForInput);
        const cardsInCurrentRound = gameRounds.find(r => r.roundNumber === currentRoundForInput)?.cardsDealt;
        if (!roundEntry || roundEntry.bid === null || roundEntry.taken === null || 
            (cardsInCurrentRound !== undefined && (roundEntry.bid > cardsInCurrentRound || roundEntry.taken > cardsInCurrentRound || roundEntry.bid < 0 || roundEntry.taken < 0))) {
            return false;
        }
        return true;
    });

    if (!currentRoundDataIsValid) {
        toast({ title: "Missing or Invalid Scores", description: "Please enter valid bids and tricks (0 to cards dealt) for all players.", variant: "destructive" });
        return;
    }

    if (currentRoundForInput < gameRounds.length) {
      setCurrentRoundForInput(prev => prev + 1);
      toast({ title: `Round ${currentRoundForInput + 1}`, description: `Dealing ${gameRounds.find(r => r.roundNumber === currentRoundForInput + 1)?.cardsDealt} cards.`});
    } else {
      setGamePhase('RESULTS');
      toast({ title: "Game Finished!", description: "All rounds completed. Check out the final scores." });
    }
  }, [currentRoundForInput, gameRounds, playersScoreData, toast]);

  const handleFinishGame = useCallback(() => {
    const currentRoundDataIsValid = playersScoreData.every(player => {
        const roundEntry = player.scores.find(s => s.roundNumber === currentRoundForInput);
        const cardsInCurrentRound = gameRounds.find(r => r.roundNumber === currentRoundForInput)?.cardsDealt;
        if (!roundEntry || roundEntry.bid === null || roundEntry.taken === null || 
            (cardsInCurrentRound !== undefined && (roundEntry.bid > cardsInCurrentRound || roundEntry.taken > cardsInCurrentRound || roundEntry.bid < 0 || roundEntry.taken < 0))) {
            return false;
        }
        return true;
    });

    if (!currentRoundDataIsValid && currentRoundForInput <= gameRounds.length && gamePhase === 'SCORING') {
         toast({ title: "Missing or Invalid Scores", description: "Please complete current round's scores accurately before finishing.", variant: "destructive" });
        return;
    }

    setGamePhase('RESULTS');
    toast({ title: "Game Finished!", description: "Check out the final scores." });
  }, [toast, playersScoreData, currentRoundForInput, gameRounds, gamePhase]);

  const handlePlayAgain = useCallback(() => {
    setPlayers([]); 
    setGameRounds([]);
    setPlayersScoreData([]);
    setCurrentRoundForInput(1);
    setFirstDealerPlayerId(null);
    setGamePhase('SETUP');
    localStorage.removeItem('updownRiverScorerState'); 
    toast({ title: "New Game Setup", description: "Configure game and add players to start again." });
  }, [toast]);

  if (gamePhase === 'SETUP') {
    return <PlayerSetupForm players={players} onAddPlayer={handleAddPlayer} onRemovePlayer={handleRemovePlayer} onStartGame={handleStartGame} />;
  }

  if ((gamePhase === 'SCORING' || gamePhase === 'DEALER_SELECTION') && gameRounds.length > 0 && playersScoreData.length > 0) {
    const currentRoundInfo = gameRounds.find(r => r.roundNumber === currentRoundForInput);
    if (!currentRoundInfo && gamePhase === 'SCORING') { // Only critical if scoring, dealer selection doesn't need round info yet.
        console.error("Error: Current round configuration not found during scoring. Resetting to setup.");
        handlePlayAgain(); 
        return <p>Error loading round. Resetting game...</p>;
    }
    return (
      <ScoreInputTable
        playersScoreData={playersScoreData}
        gameRounds={gameRounds}
        currentRoundForInput={currentRoundForInput}
        gamePhase={gamePhase}
        firstDealerPlayerId={firstDealerPlayerId}
        onUpdateScore={handleUpdateScore}
        onNextRound={handleNextRound}
        onFinishGame={handleFinishGame}
        onRestartGame={handlePlayAgain}
        onSelectDealer={handleSelectDealer}
      />
    );
  }

  if (gamePhase === 'RESULTS') {
    return <ResultsDisplay playersScoreData={playersScoreData} onPlayAgain={handlePlayAgain} />;
  }

  return (
    <div className="flex justify-center items-center h-64">
        <p className="text-lg text-muted-foreground">Loading game setup... If this persists, please refresh.</p>
    </div>
  );
}
