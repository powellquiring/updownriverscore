
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import type { Player, GameRoundInfo, PlayerScoreData, RoundScoreEntry, GamePhase, CurrentRoundInputMode } from '@/lib/types';
import { PlayerSetupForm } from './player-setup-form';
import { ScoreInputTable } from './score-input-table';
import { ResultsDisplay } from './results-display';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

// Helper function to generate rounds configuration
const generateGameRounds = (numPlayers: number, maxCardsDealtByUser: number): GameRoundInfo[] => {
  const rounds: GameRoundInfo[] = [];
  // Ensure maxCardsDealtByUser is at least 1, and not more than what's possible with 52 cards.
  const actualMaxCards = Math.max(1, Math.min(maxCardsDealtByUser, numPlayers > 0 ? Math.floor(52 / numPlayers) : maxCardsDealtByUser));

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

const defaultPlayers: Player[] = [
  { id: uuidv4(), name: 'jul' },
  { id: uuidv4(), name: 'jen' },
  { id: uuidv4(), name: 'jak' },
];

export function GameManager() {
  const [players, setPlayers] = useState<Player[]>(defaultPlayers);
  const [gameRounds, setGameRounds] = useState<GameRoundInfo[]>([]);
  const [playersScoreData, setPlayersScoreData] = useState<PlayerScoreData[]>([]);
  const [currentRoundForInput, setCurrentRoundForInput] = useState<number>(1);
  const [gamePhase, setGamePhase] = useState<GamePhase>('SETUP');
  const [firstDealerPlayerId, setFirstDealerPlayerId] = useState<string | null>(null);
  const [currentRoundInputMode, setCurrentRoundInputMode] = useState<CurrentRoundInputMode>('BIDDING');
  const { toast } = useToast();

  useEffect(() => {
    const savedState = localStorage.getItem('updownRiverScorerState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        
        if (state.players && Array.isArray(state.players) && state.players.length > 0) {
          setPlayers(state.players);
        } else {
          setPlayers(defaultPlayers); // Fallback to defaults if no players in saved state
        }
        
        let loadedGamePhase: GamePhase = 'SETUP';
        if (state.gamePhase && typeof state.gamePhase === 'string') {
            loadedGamePhase = state.gamePhase as GamePhase;
            setGamePhase(loadedGamePhase);
        } else {
            setGamePhase('SETUP'); 
        }

        if (loadedGamePhase !== 'SETUP' && state.gameRounds && Array.isArray(state.gameRounds) && state.gameRounds.length > 0 && state.gameRounds[0]?.cardsDealt) {
            setGameRounds(state.gameRounds);
        } else if (loadedGamePhase === 'SETUP') {
            setGameRounds([]); 
        }

        if (state.playersScoreData && Array.isArray(state.playersScoreData)) setPlayersScoreData(state.playersScoreData);
        if (state.currentRoundForInput && typeof state.currentRoundForInput === 'number') setCurrentRoundForInput(state.currentRoundForInput);
        if (state.firstDealerPlayerId && typeof state.firstDealerPlayerId === 'string') setFirstDealerPlayerId(state.firstDealerPlayerId);
        if (state.currentRoundInputMode && (state.currentRoundInputMode === 'BIDDING' || state.currentRoundInputMode === 'TAKING')) {
            setCurrentRoundInputMode(state.currentRoundInputMode);
        } else {
            setCurrentRoundInputMode('BIDDING');
        }
        
      } catch (error) {
        console.error("Failed to load saved state:", error);
        localStorage.removeItem('updownRiverScorerState'); 
        setGamePhase('SETUP'); 
        setFirstDealerPlayerId(null);
        setPlayers(defaultPlayers);
        setGameRounds([]);
        setPlayersScoreData([]);
        setCurrentRoundForInput(1);
        setCurrentRoundInputMode('BIDDING');
      }
    }
  }, []); 

  useEffect(() => {
    if (gamePhase === 'SETUP' && 
        players.length === 3 && players.every((p, i) => p.name === defaultPlayers[i].name) &&
        gameRounds.length === 0 && 
        playersScoreData.length === 0 &&
        currentRoundInputMode === 'BIDDING' &&
        !localStorage.getItem('updownRiverScorerState_gameStartedOnce')) {
      return;
    }

    const stateToSave = {
      players,
      gameRounds,
      playersScoreData,
      currentRoundForInput,
      gamePhase,
      firstDealerPlayerId,
      currentRoundInputMode,
    };
    localStorage.setItem('updownRiverScorerState', JSON.stringify(stateToSave));
    if (gamePhase !== 'SETUP') {
        localStorage.setItem('updownRiverScorerState_gameStartedOnce', 'true');
    }

  }, [players, gameRounds, playersScoreData, currentRoundForInput, gamePhase, firstDealerPlayerId, currentRoundInputMode]);


  const handleAddPlayer = useCallback((name: string) => {
    setPlayers(prev => [...prev, { id: uuidv4(), name }]);
  }, []);

  const handleRemovePlayer = useCallback((id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setPlayersScoreData(prev => prev.filter(ps => ps.playerId !== id));
  }, []);

  const handleStartGame = useCallback((maxCardsDealtByUser: number) => {
    if (players.length < 2) {
      toast({ title: "Not enough players", description: "You need at least 2 players to start.", variant: "destructive" });
      return;
    }
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
    setCurrentRoundInputMode('BIDDING');
    setGamePhase('DEALER_SELECTION');
    toast({ title: "Game Ready!", description: `Please select the dealer for the first round.` });
  }, [players, toast]);

  const handleSelectDealer = useCallback((playerId: string) => {
    setFirstDealerPlayerId(playerId);
    setCurrentRoundInputMode('BIDDING'); // Ensure bidding mode for the first round
    setGamePhase('SCORING');
    const dealerName = players.find(p => p.id === playerId)?.name || 'Selected Player';
    const cardsInFirstRound = gameRounds[0]?.cardsDealt;
    toast({ title: "Dealer Selected", description: `${dealerName} is the dealer. Starting Round 1 with ${cardsInFirstRound} cards. Enter bids.` });
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

  const handleConfirmBids = useCallback(() => {
    const cardsInCurrentRound = gameRounds.find(r => r.roundNumber === currentRoundForInput)?.cardsDealt;
    const allBidsValid = playersScoreData.every(player => {
      const roundEntry = player.scores.find(s => s.roundNumber === currentRoundForInput);
      return roundEntry && 
             roundEntry.bid !== null && 
             roundEntry.bid >= 0 && 
             (cardsInCurrentRound !== undefined && roundEntry.bid <= cardsInCurrentRound);
    });

    if (!allBidsValid) {
      toast({ title: "Invalid Bids", description: `Please enter a valid bid (0 to ${cardsInCurrentRound ?? 'max'}) for all players.`, variant: "destructive" });
      return;
    }
    setCurrentRoundInputMode('TAKING');
    toast({ title: "Bids Confirmed", description: "Please enter tricks taken for each player." });
  }, [playersScoreData, currentRoundForInput, gameRounds, toast]);

  const handleNextRound = useCallback(() => {
    if (currentRoundInputMode === 'BIDDING') {
      toast({ title: "Confirm Bids First", description: "Please confirm all bids for the current round before proceeding.", variant: "destructive" });
      return;
    }

    const currentRoundDataIsValid = playersScoreData.every(player => {
        const roundEntry = player.scores.find(s => s.roundNumber === currentRoundForInput);
        const cardsInCurrentRound = gameRounds.find(r => r.roundNumber === currentRoundForInput)?.cardsDealt;
        // Bid should be valid from confirmBids step, now check taken
        if (!roundEntry || roundEntry.bid === null || roundEntry.taken === null || 
            (cardsInCurrentRound !== undefined && (roundEntry.taken > cardsInCurrentRound || roundEntry.taken < 0))) {
            return false;
        }
        return true;
    });

    if (!currentRoundDataIsValid) {
        toast({ title: "Missing or Invalid Tricks", description: "Please enter valid tricks taken (0 to cards dealt) for all players.", variant: "destructive" });
        return;
    }

    if (currentRoundForInput < gameRounds.length) {
      setCurrentRoundForInput(prev => prev + 1);
      setCurrentRoundInputMode('BIDDING'); // Reset for new round
      toast({ title: `Round ${currentRoundForInput + 1}`, description: `Dealing ${gameRounds.find(r => r.roundNumber === currentRoundForInput + 1)?.cardsDealt} cards. Enter bids.`});
    } else {
      setGamePhase('RESULTS');
      toast({ title: "Game Finished!", description: "All rounds completed. Check out the final scores." });
    }
  }, [currentRoundInputMode, currentRoundForInput, gameRounds, playersScoreData, toast]);

  const handleFinishGame = useCallback(() => {
    if (currentRoundInputMode === 'BIDDING' && gamePhase === 'SCORING') {
         toast({ title: "Complete Current Round", description: "Please confirm bids and enter tricks taken for the current round before finishing.", variant: "destructive" });
        return;
    }
    
    const currentRoundDataIsValid = playersScoreData.every(player => {
        const roundEntry = player.scores.find(s => s.roundNumber === currentRoundForInput);
        const cardsInCurrentRound = gameRounds.find(r => r.roundNumber === currentRoundForInput)?.cardsDealt;
        if (!roundEntry || roundEntry.bid === null || roundEntry.taken === null || 
            (cardsInCurrentRound !== undefined && (roundEntry.taken > cardsInCurrentRound || roundEntry.taken < 0))) {
            return false;
        }
        return true;
    });

    if (!currentRoundDataIsValid && currentRoundForInput <= gameRounds.length && gamePhase === 'SCORING') {
         toast({ title: "Missing or Invalid Scores", description: "Please complete current round's tricks accurately before finishing.", variant: "destructive" });
        return;
    }

    setGamePhase('RESULTS');
    toast({ title: "Game Finished!", description: "Check out the final scores." });
  }, [currentRoundInputMode, toast, playersScoreData, currentRoundForInput, gameRounds, gamePhase]);

  const handlePlayAgain = useCallback(() => {
    setPlayers(defaultPlayers); 
    setGameRounds([]);
    setPlayersScoreData([]);
    setCurrentRoundForInput(1);
    setFirstDealerPlayerId(null);
    setCurrentRoundInputMode('BIDDING');
    setGamePhase('SETUP');
    localStorage.removeItem('updownRiverScorerState'); 
    localStorage.removeItem('updownRiverScorerState_gameStartedOnce');
    toast({ title: "New Game Setup", description: "Configure game and add players to start again." });
  }, [toast]);

  if (gamePhase === 'SETUP') {
    return <PlayerSetupForm players={players} onAddPlayer={handleAddPlayer} onRemovePlayer={handleRemovePlayer} onStartGame={handleStartGame} />;
  }

  if ((gamePhase === 'SCORING' || gamePhase === 'DEALER_SELECTION') && gameRounds.length > 0 ) {
     // Ensure playersScoreData is initialized if game just started, otherwise ScoreInputTable might crash if playersForTable is empty
    const activePlayersScoreData = playersScoreData.length > 0 ? playersScoreData : players.map(p => ({
        playerId: p.id, 
        name: p.name, 
        scores: gameRounds.map(r => ({ roundNumber: r.roundNumber, bid: null, taken: null, roundScore: 0})), 
        totalScore: 0
    }));


    const currentRoundInfo = gameRounds.find(r => r.roundNumber === currentRoundForInput);
    if (!currentRoundInfo && gamePhase === 'SCORING') { 
        console.error("Error: Current round configuration not found during scoring. Resetting to setup.");
        handlePlayAgain(); 
        return <p>Error loading round. Resetting game...</p>;
    }
    return (
      <ScoreInputTable
        playersScoreData={activePlayersScoreData}
        gameRounds={gameRounds}
        currentRoundForInput={currentRoundForInput}
        gamePhase={gamePhase}
        currentRoundInputMode={currentRoundInputMode}
        firstDealerPlayerId={firstDealerPlayerId}
        onUpdateScore={handleUpdateScore}
        onConfirmBids={handleConfirmBids}
        onNextRound={handleNextRound}
        onFinishGame={handleFinishGame}
        onRestartGame={handlePlayAgain}
        onSelectDealer={handleSelectDealer}
        allPlayers={players}
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
