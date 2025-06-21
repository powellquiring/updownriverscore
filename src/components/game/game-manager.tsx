
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import type { Player, GameRoundInfo, PlayerScoreData, RoundScoreEntry, GamePhase, CurrentRoundInputMode } from '@/lib/types';
import { PlayerSetupForm } from './player-setup-form';
import { ScoreInputTable } from './score-input-table';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

// Helper function to generate rounds configuration
const generateGameRounds = (numPlayers: number, maxCardsDealtByUser: number): GameRoundInfo[] => {
  const rounds: GameRoundInfo[] = [];
  const actualMaxCards = Math.max(1, Math.min(maxCardsDealtByUser, numPlayers > 0 ? Math.floor(52 / numPlayers) : maxCardsDealtByUser));

  for (let i = actualMaxCards; i >= 1; i--) {
    rounds.push({ roundNumber: rounds.length + 1, cardsDealt: i, isUpRound: false });
  }
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

const calculateRoundScore = (bid: number | null, taken: number | null, bidPoints: number): number => {
  if (bid === null || taken === null) return 0;
  if (bid === taken) {
    return bidPoints + bid;
  }
  return 0; 
};

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
  const [currentPlayerTakingId, setCurrentPlayerTakingId] = useState<string | null>(null);
  const [currentRoundBidsConfirmed, setCurrentRoundBidsConfirmed] = useState<boolean>(false);

  // State for "Edit Entries" mode
  const [isEditingCurrentRound, setIsEditingCurrentRound] = useState<boolean>(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [isPlayerValueUnderActiveEdit, setIsPlayerValueUnderActiveEdit] = useState<boolean>(false);

  // Add a new state to store the original game state
  const [tempGameState, setTempGameState] = useState<{
    originalRound: number;
    originalMode: CurrentRoundInputMode;
    originalBidsConfirmed: boolean;
  } | null>(null);
  
  // Add bidPoints state
  const [bidPoints, setBidPoints] = useState<number>(10);
  
  const handlePlayAgain = useCallback(() => {
    setPlayers(prevPlayers => prevPlayers.length > 0 ? prevPlayers : defaultPlayers);
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
    setCurrentPlayerTakingId(null);
    setCurrentRoundBidsConfirmed(false);
    setIsEditingCurrentRound(false);
    setEditingPlayerId(null);
    setIsPlayerValueUnderActiveEdit(false);
    setBidPoints(10); // Reset to default
    localStorage.removeItem('updownRiverScorerState'); 
    localStorage.removeItem('updownRiverScorerState_gameStartedOnce');
  }, []);


  useEffect(() => {
    const savedState = localStorage.getItem('updownRiverScorerState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.players && Array.isArray(state.players) && state.players.length > 0) setPlayers(state.players);
        else setPlayers(defaultPlayers);
        
        let loadedGamePhase: GamePhase = 'SETUP';
        if (state.gamePhase && typeof state.gamePhase === 'string') {
            loadedGamePhase = state.gamePhase as GamePhase;
            setGamePhase(loadedGamePhase);
        } else setGamePhase('SETUP'); 

        if (loadedGamePhase !== 'SETUP' && state.gameRounds && Array.isArray(state.gameRounds) && state.gameRounds.length > 0 && state.gameRounds[0]?.cardsDealt) {
            setGameRounds(state.gameRounds);
        } else if (loadedGamePhase === 'SETUP') setGameRounds([]);

        if (state.playersScoreData && Array.isArray(state.playersScoreData)) setPlayersScoreData(state.playersScoreData);
        if (state.currentRoundForInput && typeof state.currentRoundForInput === 'number') setCurrentRoundForInput(state.currentRoundForInput);
        if (state.firstDealerPlayerId && typeof state.firstDealerPlayerId === 'string') setFirstDealerPlayerId(state.firstDealerPlayerId);
        
        setCurrentRoundInputMode(state.currentRoundInputMode === 'TAKING' ? 'TAKING' : 'BIDDING');
        
        if (state.playerOrderForGame && Array.isArray(state.playerOrderForGame)) setPlayerOrderForGame(state.playerOrderForGame);
        if (state.currentDealerId && typeof state.currentDealerId === 'string') setCurrentDealerId(state.currentDealerId);
        if (state.currentPlayerBiddingId && typeof state.currentPlayerBiddingId === 'string') setCurrentPlayerBiddingId(state.currentPlayerBiddingId);
        if (state.firstBidderOfRoundId && typeof state.firstBidderOfRoundId === 'string') setFirstBidderOfRoundId(state.firstBidderOfRoundId);
        if (state.currentPlayerTakingId && typeof state.currentPlayerTakingId === 'string') setCurrentPlayerTakingId(state.currentPlayerTakingId);
        setCurrentRoundBidsConfirmed(state.currentRoundBidsConfirmed === true);

        setIsEditingCurrentRound(state.isEditingCurrentRound === true);
        setEditingPlayerId(state.editingPlayerId && typeof state.editingPlayerId === 'string' ? state.editingPlayerId : null);
        setIsPlayerValueUnderActiveEdit(state.isPlayerValueUnderActiveEdit === true);


      } catch (error) {
        console.error("Failed to load saved state:", error);
        localStorage.removeItem('updownRiverScorerState'); 
        setGamePhase('SETUP'); 
        setPlayers(defaultPlayers);
        handlePlayAgain(); 
      }
    }
  }, [handlePlayAgain]); 

  useEffect(() => {
    if (gamePhase === 'SETUP' && 
        players.length === 3 && players.every((p, i) => p.name === defaultPlayers[i].name) &&
        gameRounds.length === 0 && 
        playersScoreData.length === 0 &&
        currentRoundInputMode === 'BIDDING' &&
        !currentRoundBidsConfirmed &&
        !isEditingCurrentRound &&
        !localStorage.getItem('updownRiverScorerState_gameStartedOnce')) {
      return;
    }

    const stateToSave = {
      players, gameRounds, playersScoreData, currentRoundForInput, gamePhase,
      firstDealerPlayerId, currentRoundInputMode, playerOrderForGame, currentDealerId,
      currentPlayerBiddingId, firstBidderOfRoundId, currentPlayerTakingId, currentRoundBidsConfirmed,
      isEditingCurrentRound, editingPlayerId, isPlayerValueUnderActiveEdit, bidPoints, // Add bidPoints
    };
    localStorage.setItem('updownRiverScorerState', JSON.stringify(stateToSave));
    if (gamePhase !== 'SETUP') localStorage.setItem('updownRiverScorerState_gameStartedOnce', 'true');
  }, [players, gameRounds, playersScoreData, currentRoundForInput, gamePhase, firstDealerPlayerId, currentRoundInputMode, playerOrderForGame, currentDealerId, currentPlayerBiddingId, firstBidderOfRoundId, currentPlayerTakingId, currentRoundBidsConfirmed, isEditingCurrentRound, editingPlayerId, isPlayerValueUnderActiveEdit, bidPoints]);


  const handleAddPlayer = useCallback((name: string) => {
    setPlayers(prev => [...prev, { id: uuidv4(), name }]);
  }, []);

  const handleRemovePlayer = useCallback((id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setPlayersScoreData(prev => prev.filter(ps => ps.playerId !== id));
    setPlayerOrderForGame(prevOrder => prevOrder.filter(playerId => playerId !== id));
  }, []);

  const handleStartGame = useCallback((maxCardsDealtByUser: number, bidPointsValue: number) => {
    if (players.length < 2) {
      console.warn("Not enough players. You need at least 2 players to start.");
      return;
    }
    
    setBidPoints(bidPointsValue);
    
    const roundsConfig = generateGameRounds(players.length, maxCardsDealtByUser);
    if (roundsConfig.length === 0) {
        console.warn("Game Configuration Error: Could not generate rounds.");
        setGamePhase('SETUP'); return;
    }
    setGameRounds(roundsConfig);
    
    const currentPlayers = players.length > 0 ? players : defaultPlayers;
    const orderedPlayerIds = currentPlayers.map(p => p.id);
    setPlayerOrderForGame(orderedPlayerIds);

    const initialScores: PlayerScoreData[] = currentPlayers.map(player => ({
      playerId: player.id, name: player.name,
      scores: roundsConfig.map(r => ({ roundNumber: r.roundNumber, bid: null, taken: null, roundScore: 0 })),
      totalScore: 0,
    }));
    setPlayersScoreData(initialScores);
    setCurrentRoundForInput(1);
    setFirstDealerPlayerId(null); setCurrentDealerId(null);
    setCurrentPlayerBiddingId(null); setFirstBidderOfRoundId(null); setCurrentPlayerTakingId(null);
    setCurrentRoundBidsConfirmed(false);
    setCurrentRoundInputMode('BIDDING');
    setIsEditingCurrentRound(false); setEditingPlayerId(null); setIsPlayerValueUnderActiveEdit(false);
    setGamePhase('DEALER_SELECTION');
    console.log("Game Ready! Please select the dealer for the first round.");
  }, [players]);

  const handleSelectDealer = useCallback((playerId: string) => {
    setFirstDealerPlayerId(playerId); setCurrentDealerId(playerId);
    const order = playerOrderForGame.length > 0 ? playerOrderForGame : players.map(p => p.id);
    if (order.length === 0) {
        console.error("Error: Player order not set.");
        setGamePhase('SETUP'); return;
    }
    const dealerIndex = order.indexOf(playerId);
    if (dealerIndex === -1) {
        console.error("Error: Dealer not found.");
        setGamePhase('SETUP'); return;
    }
    const firstBidder = order[(dealerIndex + 1) % order.length];
    setCurrentPlayerBiddingId(firstBidder); setFirstBidderOfRoundId(firstBidder);
    setCurrentPlayerTakingId(null); 
    setCurrentRoundBidsConfirmed(false);
    setCurrentRoundInputMode('BIDDING'); 
    setIsEditingCurrentRound(false); setEditingPlayerId(null); setIsPlayerValueUnderActiveEdit(false);
    setGamePhase('SCORING');
    console.log("Dealer Selected. Bidding for Round 1 begins.");
  }, [players, playerOrderForGame]);

  const handleSubmitBid = useCallback((playerId: string, bidStr: string) => {
    const activePlayerId = isEditingCurrentRound ? editingPlayerId : currentPlayerBiddingId;
    if (playerId !== activePlayerId) {
        console.warn("Not your turn to bid or edit bid.");
        return;
    }

    const bid = parseInt(bidStr, 10);
    const currentRoundInfo = gameRounds.find(r => r.roundNumber === currentRoundForInput);
    const currentRoundCards = currentRoundInfo?.cardsDealt;

    if (isNaN(bid) || bid < 0 || (currentRoundCards !== undefined && bid > currentRoundCards)) {
        console.warn(`Invalid Bid. Bid must be 0 to ${currentRoundCards ?? 'max'}.`);
        return;
    }
    
    const dealerForThisRound = currentDealerId; // In edit mode, currentDealerId is the dealer for the round being edited.
    if (playerId === dealerForThisRound && currentRoundCards !== undefined) {
        const sumOfOtherPlayerBids = playersScoreData.reduce((sum, pData) => {
            if (pData.playerId !== playerId) { 
                const scoreEntry = pData.scores.find(s => s.roundNumber === currentRoundForInput);
                return sum + (scoreEntry?.bid ?? 0); 
            }
            return sum;
        }, 0);

        if (sumOfOtherPlayerBids + bid === currentRoundCards) {
            console.warn(`Invalid Bid for Dealer. Total bids (${sumOfOtherPlayerBids + bid}) cannot equal cards dealt (${currentRoundCards}). Please choose another bid.`);
            return; 
        }
    }
    
    setPlayersScoreData(prevData => 
        prevData.map(pd => pd.playerId === playerId ? {
            ...pd,
            scores: pd.scores.map(s => s.roundNumber === currentRoundForInput ? { ...s, bid: bid, roundScore: calculateRoundScore(bid, s.taken, bidPoints) } : s),
          } : pd
        ).map(p => ({ 
            ...p,
            totalScore: p.scores.reduce((total, score) => total + score.roundScore, 0)
        }))
    );

    if (isEditingCurrentRound && editingPlayerId === playerId) {
        setIsPlayerValueUnderActiveEdit(false); // Go back to review state for this player
    } else if (!isEditingCurrentRound) {
        const order = playerOrderForGame;
        const currentBidderIndex = order.indexOf(playerId);
        const nextBidderId = order[(currentBidderIndex + 1) % order.length];

        if (nextBidderId === firstBidderOfRoundId) { 
            setCurrentPlayerBiddingId(null); 
            console.log(`All bids submitted for Round ${currentRoundForInput}. Click 'Enter Tricks' to proceed.`);
        } else {
            setCurrentPlayerBiddingId(nextBidderId);
        }
    }
  }, [currentPlayerBiddingId, currentRoundForInput, gameRounds, playerOrderForGame, firstBidderOfRoundId, playersScoreData, currentDealerId, isEditingCurrentRound, editingPlayerId, bidPoints]);

  const handleConfirmBidsForRound = useCallback(() => {
    if (currentPlayerBiddingId !== null || currentRoundBidsConfirmed || isEditingCurrentRound) {
      console.warn("Cannot confirm bids at this time.");
      return;
    }
    setCurrentRoundBidsConfirmed(true);
    setCurrentRoundInputMode('TAKING');
    setCurrentPlayerTakingId(firstBidderOfRoundId); 
    console.log("Bids Confirmed! Now enter tricks taken.");
  }, [currentPlayerBiddingId, currentRoundBidsConfirmed, firstBidderOfRoundId, isEditingCurrentRound]);


  const handleAdvanceRoundOrEndGame = useCallback(() => {
    if (isEditingCurrentRound) {
      console.warn("Finish or cancel editing before advancing round.");
      return;
    }
    if (currentRoundForInput < gameRounds.length) {
      const newRoundNumber = currentRoundForInput + 1;
      setCurrentRoundForInput(newRoundNumber);
      
      const order = playerOrderForGame;
      const previousDealerIndex = order.indexOf(currentDealerId!); 
      const newDealerId = order[(previousDealerIndex + 1) % order.length];
      setCurrentDealerId(newDealerId);
      
      const newDealerIndexInOrder = order.indexOf(newDealerId);
      const newFirstBidderId = order[(newDealerIndexInOrder + 1) % order.length];
      setCurrentPlayerBiddingId(newFirstBidderId);
      setFirstBidderOfRoundId(newFirstBidderId);
      
      setCurrentRoundInputMode('BIDDING');
      setCurrentRoundBidsConfirmed(false); 
      
      console.log(`Starting Round ${newRoundNumber}.`);
    } else { 
      // Game is complete but we stay in SCORING phase
      setCurrentPlayerBiddingId(null);
      setCurrentPlayerTakingId(null);
      setCurrentRoundInputMode('BIDDING'); 
      setCurrentRoundBidsConfirmed(false);
      console.log("Game Finished! All rounds completed. Final scores are displayed.");
    }
  }, [currentRoundForInput, gameRounds, playerOrderForGame, currentDealerId, isEditingCurrentRound]);


  const handleSubmitTaken = useCallback((playerId: string, takenStr: string) => {
    const activePlayerId = isEditingCurrentRound ? editingPlayerId : currentPlayerTakingId;
    if (playerId !== activePlayerId || (!currentRoundBidsConfirmed && !isEditingCurrentRound)) {
        console.warn("Not your turn or bids not confirmed / not in edit mode.");
        return;
    }
    const taken = parseInt(takenStr, 10);
    const currentRoundInfo = gameRounds.find(r => r.roundNumber === currentRoundForInput);
    const cardsInCurrentRound = currentRoundInfo?.cardsDealt;

    if (isNaN(taken) || taken < 0 || (cardsInCurrentRound !== undefined && taken > cardsInCurrentRound)) {
      console.warn(`Invalid Taken. Tricks taken must be 0 to ${cardsInCurrentRound}.`);
      return;
    }
    
    let currentSumOfTakenThisRound = 0;
    playersScoreData.forEach(pData => {
        if (pData.playerId !== playerId) { // Sum taken by OTHERS
            const scoreEntry = pData.scores.find(s => s.roundNumber === currentRoundForInput);
            currentSumOfTakenThisRound += (scoreEntry?.taken ?? 0);
        }
    });
    currentSumOfTakenThisRound += taken; // Add current player's proposed taken

    const order = playerOrderForGame;
    // For validation, "last player" means the dealer of the current round.
    const dealerForThisRound = currentDealerId; 
    const isThisPlayerTheDealer = playerId === dealerForThisRound;


    if (isThisPlayerTheDealer && cardsInCurrentRound !== undefined && currentSumOfTakenThisRound !== cardsInCurrentRound) {
        console.warn(`Invalid Total Taken. For dealer, total tricks taken (${currentSumOfTakenThisRound}) must equal cards dealt (${cardsInCurrentRound}). Adjust entry.`);
        return; 
    }
    if (!isThisPlayerTheDealer && cardsInCurrentRound !== undefined && currentSumOfTakenThisRound > cardsInCurrentRound) {
         // Only perform this validation for non-editing mode
         // In edit mode, we allow temporary excess as players' values will be adjusted later
         if (!isEditingCurrentRound) {
             // Check if sum of *all* players' 'taken' (including this proposed one) exceeds cards dealt.
             let tempTotalTakenForAll = 0;
             playersScoreData.forEach(pData => {
                const scoreEntry = pData.scores.find(s => s.roundNumber === currentRoundForInput);
                if (pData.playerId === playerId) {
                    tempTotalTakenForAll += taken;
                } else {
                    tempTotalTakenForAll += (scoreEntry?.taken ?? 0);
                }
             });
             if (tempTotalTakenForAll > cardsInCurrentRound) {
                console.warn(`Invalid Taken Count. Total tricks taken so far by all players (${tempTotalTakenForAll}) would exceed cards dealt (${cardsInCurrentRound}).`);
                return;
             }
         }
    }
    
    setPlayersScoreData(prevData =>
      prevData.map(playerData => {
        if (playerData.playerId === playerId) {
          const updatedScores = playerData.scores.map(scoreEntry => {
            if (scoreEntry.roundNumber === currentRoundForInput) {
              return { ...scoreEntry, taken: taken, roundScore: calculateRoundScore(scoreEntry.bid, taken, bidPoints) };
            }
            return scoreEntry;
          });
          return { ...playerData, scores: updatedScores }; 
        }
        return playerData;
      }).map(p => ({ 
        ...p,
        totalScore: p.scores.reduce((total, score) => total + score.roundScore, 0)
      }))
    );

    if (isEditingCurrentRound && editingPlayerId === playerId) {
        setIsPlayerValueUnderActiveEdit(false); // Go back to review state
    } else if (!isEditingCurrentRound) {
        const currentTakerIndex = order.indexOf(playerId);
        const nextTakerId = order[(currentTakerIndex + 1) % order.length];
        if (nextTakerId === firstBidderOfRoundId) { 
            setCurrentPlayerTakingId(null); 
            console.log(`Tricks taken submitted. All tricks for Round ${currentRoundForInput} recorded.`);
        } else {
            setCurrentPlayerTakingId(nextTakerId);
        }
    }
  }, [
    currentPlayerTakingId, currentRoundBidsConfirmed, currentRoundForInput, gameRounds, 
    playerOrderForGame, firstBidderOfRoundId, playersScoreData, isEditingCurrentRound, editingPlayerId, currentDealerId, bidPoints
  ]);

  // Add a dummy function to replace handleFinishGameEarly
  const handleFinishGameEarly = useCallback(() => {
    // This is a placeholder function that does nothing
    // We keep it to avoid breaking the interface with ScoreInputTable
    console.log("Finish game early functionality has been removed");
  }, []);

  // Handlers for "Edit Entries" mode
  const handleToggleEditMode = useCallback(() => {
    if (isEditingCurrentRound) { // If currently editing, this means cancel
        setIsEditingCurrentRound(false);
        setEditingPlayerId(null);
        setIsPlayerValueUnderActiveEdit(false);
    } else { // If not editing, this means start editing
        const canStartEditingBids = currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId === null && !currentRoundBidsConfirmed;
        const canStartEditingTaken = currentRoundInputMode === 'TAKING' && currentPlayerTakingId === null && currentRoundBidsConfirmed;

        if (canStartEditingBids || canStartEditingTaken) {
            setIsEditingCurrentRound(true);
            setEditingPlayerId(firstBidderOfRoundId); 
            setIsPlayerValueUnderActiveEdit(false); 
        } else {
            console.warn("Cannot enter edit mode at this stage. Bids/Tricks must be fully submitted for the round first.");
        }
    }
  }, [isEditingCurrentRound, currentRoundInputMode, currentPlayerBiddingId, currentRoundBidsConfirmed, currentPlayerTakingId, firstBidderOfRoundId]);

  const handleKeepPlayerValue = useCallback(() => {
    if (!isEditingCurrentRound || !editingPlayerId || playerOrderForGame.length === 0) return;

    const order = playerOrderForGame;
    const currentEditingPlayerIndex = order.indexOf(editingPlayerId);
    if (currentEditingPlayerIndex === -1) {
      setIsEditingCurrentRound(false);
      setEditingPlayerId(null);
      return;
    }

    const nextEditingPlayerIndex = (currentEditingPlayerIndex + 1) % order.length;
    const nextPlayerId = order[nextEditingPlayerIndex];

    if (nextPlayerId === firstBidderOfRoundId) { // Cycled through all players
      setIsEditingCurrentRound(false);
      setEditingPlayerId(null);
      setIsPlayerValueUnderActiveEdit(false);
      
      // Restore original game state if we were editing a past round
      if (tempGameState && tempGameState.originalRound !== currentRoundForInput) {
        setCurrentRoundForInput(tempGameState.originalRound);
        setCurrentRoundInputMode(tempGameState.originalMode);
        setCurrentRoundBidsConfirmed(tempGameState.originalBidsConfirmed);
        setTempGameState(null);
      }
      
      console.log("Finished editing entries for the round.");
    } else {
      setEditingPlayerId(nextPlayerId);
      setIsPlayerValueUnderActiveEdit(false);
    }
  }, [isEditingCurrentRound, editingPlayerId, playerOrderForGame, firstBidderOfRoundId, tempGameState, currentRoundForInput]);

  const handleSetActiveEditPlayerValue = useCallback((active: boolean) => {
    if (!isEditingCurrentRound || !editingPlayerId) return;
    setIsPlayerValueUnderActiveEdit(active);
  }, [isEditingCurrentRound, editingPlayerId]);

  const handleEditSpecificRound = useCallback((roundNumber: number, mode: CurrentRoundInputMode) => {
    if (roundNumber > currentRoundForInput || isEditingCurrentRound) {
      return; // Can't edit future rounds or while already editing
    }
    
    // Calculate the dealer for the specific round being edited
    const firstDealerIndex = playerOrderForGame.indexOf(firstDealerPlayerId || "");
    if (firstDealerIndex === -1 && playerOrderForGame.length > 0) {
      console.error("First dealer not found in player order");
      return;
    }
    
    // Calculate dealer for the round being edited
    const dealerIndexForRound = (firstDealerIndex + (roundNumber - 1)) % playerOrderForGame.length;
    const dealerForRound = playerOrderForGame[dealerIndexForRound];
    
    // Calculate first bidder for the round (player after dealer)
    const firstBidderIndexForRound = (dealerIndexForRound + 1) % playerOrderForGame.length;
    const firstBidderForRound = playerOrderForGame[firstBidderIndexForRound];
    
    // Store the current game state to restore after editing
    setTempGameState({
      originalRound: currentRoundForInput,
      originalMode: currentRoundInputMode,
      originalBidsConfirmed: currentRoundBidsConfirmed
    });
    
    // Set up the editing state
    setCurrentRoundForInput(roundNumber);
    setCurrentRoundInputMode(mode);
    setCurrentDealerId(dealerForRound);
    setFirstBidderOfRoundId(firstBidderForRound);
    setIsEditingCurrentRound(true);
    setEditingPlayerId(firstBidderForRound);
    setIsPlayerValueUnderActiveEdit(false);
    
  }, [currentRoundForInput, currentRoundInputMode, currentRoundBidsConfirmed, isEditingCurrentRound, 
      firstDealerPlayerId, playerOrderForGame]);

  if (gamePhase === 'SETUP') {
    return <PlayerSetupForm players={players} onAddPlayer={handleAddPlayer} onRemovePlayer={handleRemovePlayer} onStartGame={handleStartGame} />;
  }

  if ((gamePhase === 'DEALER_SELECTION' || gamePhase === 'SCORING') && (gameRounds.length > 0 || gamePhase === 'DEALER_SELECTION')) {
    const activePlayersScoreData = playersScoreData.length > 0 ? playersScoreData : players.map(p => ({
      playerId: p.id, name: p.name, 
      scores: gameRounds.map(r => ({ roundNumber: r.roundNumber, bid: null, taken: null, roundScore: 0})), 
      totalScore: 0
    }));

    let currentRoundInfo = gameRounds.find(r => r.roundNumber === currentRoundForInput);
    
    if (!currentRoundInfo && gamePhase === 'SCORING' && gameRounds.length > 0) { 
      console.error("Error: Could not find current round info. Game state might be corrupted.");
      handlePlayAgain(); 
      return <p>Error loading round data. Resetting game to setup...</p>; 
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
        currentDealerId={currentDealerId}
        currentPlayerBiddingId={currentPlayerBiddingId}
        currentPlayerTakingId={currentPlayerTakingId}
        currentRoundBidsConfirmed={currentRoundBidsConfirmed}
        firstBidderOfRoundId={firstBidderOfRoundId}
        firstDealerPlayerId={firstDealerPlayerId}
        bidPoints={bidPoints}
        onSubmitBid={handleSubmitBid}
        onSubmitTaken={handleSubmitTaken}
        onConfirmBidsForRound={handleConfirmBidsForRound}
        onAdvanceRoundOrEndGame={handleAdvanceRoundOrEndGame}
        onFinishGame={handleFinishGameEarly} // Now using the placeholder function
        onRestartGame={handlePlayAgain}
        onSelectDealer={handleSelectDealer}
        // Pass new state and handlers for edit mode
        isEditingCurrentRound={isEditingCurrentRound}
        editingPlayerId={editingPlayerId}
        isPlayerValueUnderActiveEdit={isPlayerValueUnderActiveEdit}
        onToggleEditMode={handleToggleEditMode}
        onKeepPlayerValue={handleKeepPlayerValue}
        onSetActiveEditPlayerValue={handleSetActiveEditPlayerValue}
        onEditSpecificRound={handleEditSpecificRound}
      />
    );
  }

  return (
    <div className="flex justify-center items-center h-64">
        <p className="text-lg text-muted-foreground">Loading game setup... If this persists, please refresh.</p>
    </div>
  );
}

