
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
  
  const [playerOrderForGame, setPlayerOrderForGame] = useState<string[]>([]);
  const [currentDealerId, setCurrentDealerId] = useState<string | null>(null);
  const [currentPlayerBiddingId, setCurrentPlayerBiddingId] = useState<string | null>(null);
  const [firstBidderOfRoundId, setFirstBidderOfRoundId] = useState<string | null>(null);


  const { toast } = useToast();

  useEffect(() => {
    const savedState = localStorage.getItem('updownRiverScorerState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        
        if (state.players && Array.isArray(state.players) && state.players.length > 0) {
          setPlayers(state.players);
        } else {
          setPlayers(defaultPlayers); 
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
        
        if (state.playerOrderForGame && Array.isArray(state.playerOrderForGame)) setPlayerOrderForGame(state.playerOrderForGame);
        if (state.currentDealerId && typeof state.currentDealerId === 'string') setCurrentDealerId(state.currentDealerId);
        if (state.currentPlayerBiddingId && typeof state.currentPlayerBiddingId === 'string') setCurrentPlayerBiddingId(state.currentPlayerBiddingId);
        if (state.firstBidderOfRoundId && typeof state.firstBidderOfRoundId === 'string') setFirstBidderOfRoundId(state.firstBidderOfRoundId);

      } catch (error) {
        console.error("Failed to load saved state:", error);
        localStorage.removeItem('updownRiverScorerState'); 
        setGamePhase('SETUP'); 
        setPlayers(defaultPlayers);
        setGameRounds([]);
        setPlayersScoreData([]);
        setCurrentRoundForInput(1);
        setFirstDealerPlayerId(null);
        setCurrentRoundInputMode('BIDDING');
        setPlayerOrderForGame([]);
        setCurrentDealerId(null);
        setCurrentPlayerBiddingId(null);
        setFirstBidderOfRoundId(null);
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
      playerOrderForGame,
      currentDealerId,
      currentPlayerBiddingId,
      firstBidderOfRoundId,
    };
    localStorage.setItem('updownRiverScorerState', JSON.stringify(stateToSave));
    if (gamePhase !== 'SETUP') {
        localStorage.setItem('updownRiverScorerState_gameStartedOnce', 'true');
    }

  }, [players, gameRounds, playersScoreData, currentRoundForInput, gamePhase, firstDealerPlayerId, currentRoundInputMode, playerOrderForGame, currentDealerId, currentPlayerBiddingId, firstBidderOfRoundId]);


  const handleAddPlayer = useCallback((name: string) => {
    setPlayers(prev => [...prev, { id: uuidv4(), name }]);
  }, []);

  const handleRemovePlayer = useCallback((id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setPlayersScoreData(prev => prev.filter(ps => ps.playerId !== id));
    // Also adjust playerOrderForGame if the removed player was in it
    setPlayerOrderForGame(prevOrder => prevOrder.filter(playerId => playerId !== id));
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
    setPlayerOrderForGame(players.map(p => p.id)); // Set player order based on current players array

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
    setCurrentDealerId(null);
    setCurrentPlayerBiddingId(null);
    setFirstBidderOfRoundId(null);
    setCurrentRoundInputMode('BIDDING');
    setGamePhase('DEALER_SELECTION');
    toast({ title: "Game Ready!", description: `Please select the dealer for the first round.` });
  }, [players, toast]);

  const handleSelectDealer = useCallback((playerId: string) => {
    setFirstDealerPlayerId(playerId);
    setCurrentDealerId(playerId);
    
    const order = playerOrderForGame.length > 0 ? playerOrderForGame : players.map(p => p.id);
    if (order.length === 0) {
        console.error("Player order not set during dealer selection.");
        toast({title: "Error", description: "Player order not set. Please restart setup.", variant: "destructive"});
        setGamePhase('SETUP');
        return;
    }
    
    const dealerIndex = order.indexOf(playerId);
    if (dealerIndex === -1) {
        console.error("Selected dealer not found in player order.");
        toast({title: "Error", description: "Dealer not found. Please restart setup.", variant: "destructive"});
        setGamePhase('SETUP');
        return;
    }

    const firstBidder = order[(dealerIndex + 1) % order.length];
    setCurrentPlayerBiddingId(firstBidder);
    setFirstBidderOfRoundId(firstBidder);

    setCurrentRoundInputMode('BIDDING'); 
    setGamePhase('SCORING');
    const dealerName = players.find(p => p.id === playerId)?.name || 'Selected Player';
    const firstBidderName = players.find(p => p.id === firstBidder)?.name || 'Next Player';
    const cardsInFirstRound = gameRounds[0]?.cardsDealt;
    toast({ title: "Dealer Selected", description: `${dealerName} is the dealer. Round 1 (${cardsInFirstRound} cards). ${firstBidderName}, please enter your bid.` });
  }, [players, gameRounds, toast, playerOrderForGame]);

  const calculateRoundScore = (bid: number | null, taken: number | null): number => {
    if (bid === null || taken === null) return 0;
    if (bid === taken) {
      return 10 + bid;
    }
    return 0; 
  };

  const handleSubmitBid = useCallback((playerId: string, bidStr: string) => {
    if (playerId !== currentPlayerBiddingId) {
        toast({title: "Not your turn", description: "Please wait for your turn to bid.", variant: "destructive"});
        return;
    }
    const bid = parseInt(bidStr, 10);
    const currentRoundCards = gameRounds.find(r => r.roundNumber === currentRoundForInput)?.cardsDealt;

    if (isNaN(bid) || bid < 0 || (currentRoundCards !== undefined && bid > currentRoundCards)) {
        toast({title: "Invalid Bid", description: `Bid must be a number between 0 and ${currentRoundCards ?? 'max'}.`, variant: "destructive"});
        return;
    }

    setPlayersScoreData(prevData => 
        prevData.map(playerData => 
            playerData.playerId === playerId 
            ? {
                ...playerData,
                scores: playerData.scores.map(scoreEntry =>
                    scoreEntry.roundNumber === currentRoundForInput
                    ? { ...scoreEntry, bid: bid, roundScore: calculateRoundScore(bid, scoreEntry.taken) }
                    : scoreEntry
                ),
                totalScore: playerData.scores.reduce((sum, entry) => sum + (entry.roundNumber === currentRoundForInput ? calculateRoundScore(bid, entry.taken) : entry.roundScore) , 0) // Recalculate total score
              }
            : playerData
        )
    );
    
    const order = playerOrderForGame;
    const currentBidderIndex = order.indexOf(playerId);
    const nextBidderId = order[(currentBidderIndex + 1) % order.length];

    if (nextBidderId === firstBidderOfRoundId) { // All players have bid
        setCurrentRoundInputMode('TAKING');
        setCurrentPlayerBiddingId(null); // No one is actively bidding
        toast({ title: "All Bids In!", description: "Please enter tricks taken for each player." });
    } else {
        setCurrentPlayerBiddingId(nextBidderId);
        const nextBidderName = players.find(p => p.id === nextBidderId)?.name || 'Next Player';
        toast({ title: "Bid Submitted", description: `${nextBidderName}, it's your turn to bid.` });
    }

  }, [currentPlayerBiddingId, currentRoundForInput, gameRounds, playerOrderForGame, firstBidderOfRoundId, players, toast]);


  const handleUpdateScore = useCallback((playerId: string, roundNumber: number, takenStr: string) => {
    // This function now only handles 'taken' updates, bids are handled by handleSubmitBid
    setPlayersScoreData(prevData => {
      return prevData.map(playerData => {
        if (playerData.playerId === playerId) {
          const taken = takenStr === '' ? null : parseInt(takenStr, 10);
          
          const updatedScores = playerData.scores.map(scoreEntry => {
            if (scoreEntry.roundNumber === roundNumber) {
              return {
                ...scoreEntry,
                taken: isNaN(taken as number) ? null : taken,
                roundScore: calculateRoundScore(scoreEntry.bid, taken),
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
    if (currentRoundInputMode === 'BIDDING') {
      toast({ title: "Bidding in Progress", description: "Please complete all bids for the current round before proceeding.", variant: "destructive" });
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

    if (!currentRoundDataIsValid) {
        toast({ title: "Missing or Invalid Tricks", description: "Please enter valid tricks taken (0 to cards dealt) for all players.", variant: "destructive" });
        return;
    }

    if (currentRoundForInput < gameRounds.length) {
      const newRoundNumber = currentRoundForInput + 1;
      setCurrentRoundForInput(newRoundNumber);
      
      const order = playerOrderForGame;
      const previousDealerIndex = order.indexOf(currentDealerId!); // currentDealerId should be set
      const newDealerId = order[(previousDealerIndex + 1) % order.length];
      setCurrentDealerId(newDealerId);

      const newDealerIndexInOrder = order.indexOf(newDealerId);
      const newFirstBidderId = order[(newDealerIndexInOrder + 1) % order.length];
      setCurrentPlayerBiddingId(newFirstBidderId);
      setFirstBidderOfRoundId(newFirstBidderId);
      
      setCurrentRoundInputMode('BIDDING'); 

      const dealerName = players.find(p => p.id === newDealerId)?.name || 'New Dealer';
      const firstBidderName = players.find(p => p.id === newFirstBidderId)?.name || 'Next Player';
      toast({ title: `Round ${newRoundNumber}`, description: `${dealerName} is now dealer. Dealing ${gameRounds.find(r => r.roundNumber === newRoundNumber)?.cardsDealt} cards. ${firstBidderName}, please bid.`});
    } else {
      setGamePhase('RESULTS');
      toast({ title: "Game Finished!", description: "All rounds completed. Check out the final scores." });
    }
  }, [currentRoundInputMode, currentRoundForInput, gameRounds, playersScoreData, playerOrderForGame, currentDealerId, players, toast]);

  const handleFinishGame = useCallback(() => {
    if (currentRoundInputMode === 'BIDDING' && gamePhase === 'SCORING') {
         toast({ title: "Complete Current Round", description: "Please complete bidding and enter tricks taken for the current round before finishing.", variant: "destructive" });
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
    setPlayerOrderForGame([]);
    setCurrentDealerId(null);
    setCurrentPlayerBiddingId(null);
    setFirstBidderOfRoundId(null);
    localStorage.removeItem('updownRiverScorerState'); 
    localStorage.removeItem('updownRiverScorerState_gameStartedOnce');
    toast({ title: "New Game Setup", description: "Configure game and add players to start again." });
  }, [toast]);

  if (gamePhase === 'SETUP') {
    return <PlayerSetupForm players={players} onAddPlayer={handleAddPlayer} onRemovePlayer={handleRemovePlayer} onStartGame={handleStartGame} />;
  }

  if ((gamePhase === 'SCORING' || gamePhase === 'DEALER_SELECTION') && (gameRounds.length > 0 || gamePhase === 'DEALER_SELECTION' )) {
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
        allPlayers={players}
        playerOrderForGame={playerOrderForGame}
        gameRounds={gameRounds}
        currentRoundForInput={currentRoundForInput}
        gamePhase={gamePhase}
        currentRoundInputMode={currentRoundInputMode}
        firstDealerPlayerId={firstDealerPlayerId}
        currentDealerId={currentDealerId}
        currentPlayerBiddingId={currentPlayerBiddingId}
        onSubmitBid={handleSubmitBid}
        onUpdateTaken={handleUpdateScore} // Renamed for clarity, was onUpdateScore
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
