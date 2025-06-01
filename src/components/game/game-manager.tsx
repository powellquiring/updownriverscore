
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

const calculateRoundScore = (bid: number | null, taken: number | null): number => {
  if (bid === null || taken === null) return 0;
  if (bid === taken) {
    return 10 + bid;
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

  const { toast } = useToast();
  
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
    localStorage.removeItem('updownRiverScorerState'); 
    localStorage.removeItem('updownRiverScorerState_gameStartedOnce');
    toast({ title: "New Game Setup", description: "Configure game and add players to start again." });
  }, [toast]);


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

      } catch (error) {
        console.error("Failed to load saved state:", error);
        localStorage.removeItem('updownRiverScorerState'); 
        setGamePhase('SETUP'); 
        setPlayers(defaultPlayers);
        // Call handlePlayAgain directly if it's already defined and safe to call.
        // If handlePlayAgain itself relies on state that might not be initialized yet during this effect,
        // then a simpler reset or just logging the error and setting default phase/players is safer.
        // For now, assuming it's safe or this effect runs after its definition.
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
        !localStorage.getItem('updownRiverScorerState_gameStartedOnce')) {
      return;
    }

    const stateToSave = {
      players, gameRounds, playersScoreData, currentRoundForInput, gamePhase,
      firstDealerPlayerId, currentRoundInputMode, playerOrderForGame, currentDealerId,
      currentPlayerBiddingId, firstBidderOfRoundId, currentPlayerTakingId, currentRoundBidsConfirmed,
    };
    localStorage.setItem('updownRiverScorerState', JSON.stringify(stateToSave));
    if (gamePhase !== 'SETUP') localStorage.setItem('updownRiverScorerState_gameStartedOnce', 'true');
  }, [players, gameRounds, playersScoreData, currentRoundForInput, gamePhase, firstDealerPlayerId, currentRoundInputMode, playerOrderForGame, currentDealerId, currentPlayerBiddingId, firstBidderOfRoundId, currentPlayerTakingId, currentRoundBidsConfirmed]);


  const handleAddPlayer = useCallback((name: string) => {
    setPlayers(prev => [...prev, { id: uuidv4(), name }]);
  }, []);

  const handleRemovePlayer = useCallback((id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setPlayersScoreData(prev => prev.filter(ps => ps.playerId !== id));
    setPlayerOrderForGame(prevOrder => prevOrder.filter(playerId => playerId !== id));
  }, []);

  const handleStartGame = useCallback((maxCardsDealtByUser: number) => {
    if (players.length < 2) {
      toast({ title: "Not enough players", description: "You need at least 2 players to start.", variant: "destructive" });
      return;
    }
    const roundsConfig = generateGameRounds(players.length, maxCardsDealtByUser);
    if (roundsConfig.length === 0) {
        toast({ title: "Game Configuration Error", description: "Could not generate rounds.", variant: "destructive"});
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
    setGamePhase('DEALER_SELECTION');
    toast({ title: "Game Ready!", description: `Please select the dealer for the first round.` });
  }, [players, toast]);

  const handleSelectDealer = useCallback((playerId: string) => {
    setFirstDealerPlayerId(playerId); setCurrentDealerId(playerId);
    const order = playerOrderForGame.length > 0 ? playerOrderForGame : players.map(p => p.id);
    if (order.length === 0) {
        toast({title: "Error", description: "Player order not set.", variant: "destructive"});
        setGamePhase('SETUP'); return;
    }
    const dealerIndex = order.indexOf(playerId);
    if (dealerIndex === -1) {
        toast({title: "Error", description: "Dealer not found.", variant: "destructive"});
        setGamePhase('SETUP'); return;
    }
    const firstBidder = order[(dealerIndex + 1) % order.length];
    setCurrentPlayerBiddingId(firstBidder); setFirstBidderOfRoundId(firstBidder);
    setCurrentPlayerTakingId(null);
    setCurrentRoundBidsConfirmed(false);
    setCurrentRoundInputMode('BIDDING'); setGamePhase('SCORING');
    const dealerName = players.find(p => p.id === playerId)?.name || 'Selected';
    const firstBidderName = players.find(p => p.id === firstBidder)?.name || 'Next';
    const currentRoundInfo = gameRounds.find(r => r.roundNumber === 1);
    const cardsDealt = currentRoundInfo ? currentRoundInfo.cardsDealt : 'N/A';
    toast({ title: "Dealer Selected", description: `${dealerName} is dealer. Round 1 (${cardsDealt} cards). ${firstBidderName} to bid.` });
  }, [players, gameRounds, toast, playerOrderForGame]);

  const handleSubmitBid = useCallback((playerId: string, bidStr: string) => {
    if (playerId !== currentPlayerBiddingId) {
        toast({title: "Not your turn", description: "Wait for your turn to bid.", variant: "destructive"}); return;
    }
    const bid = parseInt(bidStr, 10);
    const currentRoundInfo = gameRounds.find(r => r.roundNumber === currentRoundForInput);
    const currentRoundCards = currentRoundInfo?.cardsDealt;

    if (isNaN(bid) || bid < 0 || (currentRoundCards !== undefined && bid > currentRoundCards)) {
        toast({title: "Invalid Bid", description: `Bid must be 0 to ${currentRoundCards ?? 'max'}.`, variant: "destructive"}); return;
    }

    // "Screw the Dealer" rule: If this player is the dealer, their bid cannot make the total bids equal cards dealt.
    if (playerId === currentDealerId && currentRoundCards !== undefined) {
        const sumOfOtherPlayerBids = playersScoreData.reduce((sum, pData) => {
            if (pData.playerId !== playerId) { 
                const scoreEntry = pData.scores.find(s => s.roundNumber === currentRoundForInput);
                return sum + (scoreEntry?.bid ?? 0); 
            }
            return sum;
        }, 0);

        if (sumOfOtherPlayerBids + bid === currentRoundCards) {
            toast({
                title: "Invalid Bid for Dealer",
                description: `Total bids (${sumOfOtherPlayerBids + bid}) cannot equal cards dealt (${currentRoundCards}). Please choose another bid.`,
                variant: "destructive",
            });
            return; 
        }
    }
    
    setPlayersScoreData(prevData => 
        prevData.map(pd => pd.playerId === playerId ? {
            ...pd,
            scores: pd.scores.map(s => s.roundNumber === currentRoundForInput ? { ...s, bid: bid, roundScore: calculateRoundScore(bid, s.taken) } : s),
            totalScore: pd.scores.reduce((sum, entry) => sum + (entry.roundNumber === currentRoundForInput ? calculateRoundScore(bid, entry.taken) : entry.roundScore), 0) // Recalculate total score
          } : pd
        )
    );
    const order = playerOrderForGame;
    const currentBidderIndex = order.indexOf(playerId);
    const nextBidderId = order[(currentBidderIndex + 1) % order.length];

    if (nextBidderId === firstBidderOfRoundId) { 
        setCurrentPlayerBiddingId(null); 
        toast({ title: "All Bids In!", description: `All bids submitted for Round ${currentRoundForInput}. Click 'Confirm Bids' to proceed.` });
    } else {
        setCurrentPlayerBiddingId(nextBidderId);
        const nextBidderName = players.find(p => p.id === nextBidderId)?.name || 'Next Player';
        toast({ title: "Bid Submitted", description: `${nextBidderName}, your turn to bid.` });
    }
  }, [currentPlayerBiddingId, currentRoundForInput, gameRounds, playerOrderForGame, firstBidderOfRoundId, players, toast, playersScoreData, currentDealerId]);

  const handleConfirmBidsForRound = useCallback(() => {
    if (currentPlayerBiddingId !== null || currentRoundBidsConfirmed) {
      toast({ title: "Action not allowed", description: "Cannot confirm bids at this time.", variant: "destructive" });
      return;
    }
    setCurrentRoundBidsConfirmed(true);
    setCurrentRoundInputMode('TAKING');
    setCurrentPlayerTakingId(firstBidderOfRoundId); 
    const firstTakerName = players.find(p=> p.id === firstBidderOfRoundId)?.name || 'First Player';
    toast({ title: "Bids Confirmed!", description: `Now enter tricks taken. ${firstTakerName} to start.` });
  }, [currentPlayerBiddingId, currentRoundBidsConfirmed, firstBidderOfRoundId, players, toast]);

  const handleSubmitTaken = useCallback((playerId: string, takenStr: string) => {
    if (playerId !== currentPlayerTakingId || !currentRoundBidsConfirmed) {
        toast({title: "Not your turn or bids not confirmed", description: "Wait for your turn or confirm bids.", variant: "destructive"}); return;
    }
    const taken = parseInt(takenStr, 10);
    const currentRoundInfo = gameRounds.find(r => r.roundNumber === currentRoundForInput);
    const cardsInCurrentRound = currentRoundInfo?.cardsDealt;

    if (isNaN(taken) || taken < 0 || (cardsInCurrentRound !== undefined && taken > cardsInCurrentRound)) {
      toast({ title: "Invalid Taken", description: `Tricks taken must be 0 to ${cardsInCurrentRound}.`, variant: "destructive"});
      return;
    }

    // Additional check for sum of taken tricks (enforced by UI, but good to have server-side)
    if (cardsInCurrentRound !== undefined) {
        let sumOfTakesByPreviousPlayers = 0;
        const order = playerOrderForGame;
        const currentPlayerIndex = order.indexOf(playerId);

        for (let i = 0; i < currentPlayerIndex; i++) {
            const pId = order[i];
            const pData = playersScoreData.find(psd => psd.playerId === pId);
            const scoreEntry = pData?.scores.find(s => s.roundNumber === currentRoundForInput);
            if (scoreEntry?.taken !== null && scoreEntry?.taken !== undefined) {
                 sumOfTakesByPreviousPlayers += scoreEntry.taken;
            }
        }
         if (sumOfTakesByPreviousPlayers + taken > cardsInCurrentRound) {
             toast({ title: "Invalid Taken Count", description: `Total tricks taken cannot exceed ${cardsInCurrentRound}.`, variant: "destructive"});
             return;
         }
         // If this is the last player (dealer), their 'taken' count must make the sum equal cardsInCurrentRound
         if (playerId === currentDealerId) {
            const sumOfOtherPlayersTakes = playersScoreData.reduce((sum, pData) => {
                if (pData.playerId !== playerId) {
                    const scoreEntry = pData.scores.find(s => s.roundNumber === currentRoundForInput);
                    return sum + (scoreEntry?.taken ?? 0);
                }
                return sum;
            }, 0);
             if (sumOfOtherPlayersTakes + taken !== cardsInCurrentRound) {
                 toast({ title: "Invalid Taken for Dealer", description: `Dealer's tricks must make total taken equal ${cardsInCurrentRound}. Current total would be ${sumOfOtherPlayersTakes + taken}.`, variant: "destructive"});
                 return; // This should be prevented by UI if min=max for dealer's NumberInputPad
             }
         }
    }
    
    setPlayersScoreData(prevData =>
      prevData.map(playerData => {
        if (playerData.playerId === playerId) {
          const updatedScores = playerData.scores.map(scoreEntry => {
            if (scoreEntry.roundNumber === currentRoundForInput) {
              return { ...scoreEntry, taken: taken, roundScore: calculateRoundScore(scoreEntry.bid, taken) };
            }
            return scoreEntry;
          });
          const totalScore = updatedScores.reduce((sum, entry) => sum + entry.roundScore, 0);
          return { ...playerData, scores: updatedScores, totalScore };
        }
        return playerData;
      })
    );

    const order = playerOrderForGame;
    const currentTakerIndex = order.indexOf(playerId);
    const nextTakerId = order[(currentTakerIndex + 1) % order.length];

    if (nextTakerId === firstBidderOfRoundId) { 
        setCurrentPlayerTakingId(null); 

        if (currentRoundForInput < gameRounds.length) {
            const newRoundNumber = currentRoundForInput + 1;
            setCurrentRoundForInput(newRoundNumber);
            
            const previousDealerIndex = order.indexOf(currentDealerId!); 
            const newDealerId = order[(previousDealerIndex + 1) % order.length];
            setCurrentDealerId(newDealerId);
            
            const newDealerIndexInOrder = order.indexOf(newDealerId);
            const newFirstBidderId = order[(newDealerIndexInOrder + 1) % order.length];
            setCurrentPlayerBiddingId(newFirstBidderId);
            setFirstBidderOfRoundId(newFirstBidderId);
            
            setCurrentRoundInputMode('BIDDING');
            setCurrentRoundBidsConfirmed(false); 
            
            const dealerName = players.find(p => p.id === newDealerId)?.name || 'New Dealer';
            const firstBidderName = players.find(p => p.id === newFirstBidderId)?.name || 'Next';
            const cardsForNewRound = gameRounds.find(r => r.roundNumber === newRoundNumber)?.cardsDealt;
            toast({ title: `Starting Round ${newRoundNumber}`, description: `${dealerName} is dealer. Dealing ${cardsForNewRound} cards. ${firstBidderName} to bid.`});
        } else { 
            setGamePhase('RESULTS');
            toast({ title: "Game Finished!", description: "All rounds completed. Viewing results." });
        }

    } else {
        setCurrentPlayerTakingId(nextTakerId);
        const nextTakerName = players.find(p => p.id === nextTakerId)?.name || 'Next Player';
        toast({ title: "Tricks Taken Submitted", description: `${nextTakerName}, your turn to enter tricks taken.` });
    }
  }, [
    currentPlayerTakingId, currentRoundBidsConfirmed, currentRoundForInput, gameRounds, 
    playerOrderForGame, firstBidderOfRoundId, players, toast, currentDealerId, playersScoreData
  ]);

  const handleEditHistoricScore = useCallback((
    playerId: string,
    roundNumber: number,
    inputType: 'bid' | 'taken',
    valueStr: string
  ) => {
    const isCurrentRound = roundNumber === currentRoundForInput;
    if (isCurrentRound) {
        if (inputType === 'bid' && playerId === currentPlayerBiddingId && currentRoundInputMode === 'BIDDING') {
             toast({ title: "Cannot Edit Active Bid", description: "Submit bid through normal flow.", variant: "destructive"}); return;
        }
        if (inputType === 'taken' && playerId === currentPlayerTakingId && currentRoundInputMode === 'TAKING' && currentRoundBidsConfirmed) {
            toast({ title: "Cannot Edit Active Take", description: "Submit tricks taken through normal flow.", variant: "destructive"}); return;
        }
        if (inputType === 'taken' && !currentRoundBidsConfirmed && currentRoundInputMode === 'BIDDING') {
             toast({ title: "Cannot Edit Takes Yet", description: "Confirm bids for the round first.", variant: "destructive"}); return;
        }
    }

    const value = parseInt(valueStr, 10);
    const roundConfig = gameRounds.find(r => r.roundNumber === roundNumber);
    const cardsForRound = roundConfig?.cardsDealt;

    if (isNaN(value) || value < 0 || (cardsForRound !== undefined && value > cardsForRound)) {
      toast({ title: "Invalid Edit", description: `Entry must be between 0 and ${cardsForRound ?? 'max'}.`, variant: "destructive" });
      return;
    }
    
    // Historic bid edit: "Screw the Dealer" rule
    if (inputType === 'bid' && cardsForRound !== undefined) {
        const order = playerOrderForGame;
        let historicDealerId = null;
        if (firstDealerPlayerId && order.length > 0) {
            const firstDealerIndex = order.indexOf(firstDealerPlayerId);
            if (firstDealerIndex !== -1) {
                historicDealerId = order[(firstDealerIndex + roundNumber - 1) % order.length];
            }
        }

        if (playerId === historicDealerId) {
            const sumOfOtherPlayerBidsHistoric = playersScoreData.reduce((sum, pData) => {
                if (pData.playerId !== playerId) {
                    const scoreEntry = pData.scores.find(s => s.roundNumber === roundNumber);
                    return sum + (scoreEntry?.bid ?? 0);
                }
                return sum;
            }, 0);

            if (sumOfOtherPlayerBidsHistoric + value === cardsForRound) {
                toast({
                    title: "Invalid Historic Bid Edit",
                    description: `For Round ${roundNumber}, dealer's bid makes total bids (${sumOfOtherPlayerBidsHistoric + value}) equal cards dealt (${cardsForRound}).`,
                    variant: "destructive",
                });
                return;
            }
        }
    }

    // Historic "taken" edit: Ensure sum of taken equals cards dealt
     if (inputType === 'taken' && cardsForRound !== undefined) {
        const sumOfOtherTakesInHistoricRound = playersScoreData.reduce((sum, pData) => {
            if (pData.playerId !== playerId) { // Sum taken by players OTHER than the one being edited
                const scoreEntry = pData.scores.find(s => s.roundNumber === roundNumber);
                return sum + (scoreEntry?.taken ?? 0);
            }
            return sum;
        }, 0);

        // The new value for the edited player, when added to others, MUST equal cardsForRound
        if (sumOfOtherTakesInHistoricRound + value !== cardsForRound) {
            toast({
                title: "Invalid Historic Taken Edit",
                description: `For Round ${roundNumber}, total tricks taken must equal ${cardsForRound}. With this change, total would be ${sumOfOtherTakesInHistoricRound + value}. Adjust other players' taken counts first if needed.`,
                variant: "destructive",
            });
            return; // Prevent the edit if it violates the sum rule
        }
    }


    setPlayersScoreData(prevData =>
      prevData.map(playerData => {
        if (playerData.playerId === playerId) {
          const updatedScores = playerData.scores.map(scoreEntry => {
            if (scoreEntry.roundNumber === roundNumber) {
              let newBid = scoreEntry.bid;
              let newTaken = scoreEntry.taken;

              if (inputType === 'bid') newBid = value;
              else newTaken = value;
              
              const newRoundScore = calculateRoundScore(newBid, newTaken);
              return { ...scoreEntry, bid: newBid, taken: newTaken, roundScore: newRoundScore };
            }
            return scoreEntry; 
          });
          const newTotalScore = updatedScores.reduce((sum, entry) => sum + entry.roundScore, 0);
          return { ...playerData, scores: updatedScores, totalScore: newTotalScore };
        }
        return playerData;
      })
    );
    const playerName = players.find(p => p.id === playerId)?.name || 'Player';
    toast({ title: "Score Corrected", description: `${inputType === 'bid' ? 'Bid' : 'Tricks taken'} for ${playerName} in round ${roundNumber} updated to ${value}.` });
  }, [gameRounds, players, toast, currentRoundForInput, currentPlayerBiddingId, currentPlayerTakingId, currentRoundInputMode, currentRoundBidsConfirmed, playersScoreData, playerOrderForGame, firstDealerPlayerId]);


  const handleFinishGame = useCallback(() => {
    if (currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId !== null && gamePhase === 'SCORING') {
         toast({ title: "Complete Round", description: "Complete bidding first.", variant: "destructive" }); return;
    }
    if (currentRoundInputMode === 'BIDDING' && currentPlayerBiddingId === null && !currentRoundBidsConfirmed && gamePhase === 'SCORING') {
      toast({ title: "Confirm Bids", description: "Please confirm bids for the current round first.", variant: "destructive" }); return;
    }
    if (currentRoundInputMode === 'TAKING' && currentPlayerTakingId !== null && gamePhase === 'SCORING') {
        toast({ title: "Taking in Progress", description: "Complete all tricks taken entries first.", variant: "destructive"}); return;
    }
    
    if (gamePhase === 'SCORING' && currentRoundForInput <= gameRounds.length) {
        const currentRoundDataIsValid = playersScoreData.every(player => {
            const roundEntry = player.scores.find(s => s.roundNumber === currentRoundForInput);
            return roundEntry && roundEntry.bid !== null && roundEntry.taken !== null;
        });
        if (!currentRoundDataIsValid && currentPlayerTakingId === null && currentRoundBidsConfirmed ) { // Check only if taking should be complete
             toast({ title: "Missing Scores", description: "Complete current round's tricks taken first.", variant: "destructive" }); return;
        }
        if (!currentRoundBidsConfirmed && currentPlayerBiddingId === null) { // Bids are in but not confirmed
           toast({ title: "Confirm Bids", description: "Please confirm bids for the current round first before finishing.", variant: "destructive" }); return;
        }
    }

    setGamePhase('RESULTS');
    toast({ title: "Game Finished Early!", description: "Displaying current scores." });
  }, [currentRoundInputMode, currentPlayerBiddingId, currentPlayerTakingId, currentRoundBidsConfirmed, toast, playersScoreData, currentRoundForInput, gameRounds, gamePhase]);

  if (gamePhase === 'SETUP') {
    return <PlayerSetupForm players={players} onAddPlayer={handleAddPlayer} onRemovePlayer={handleRemovePlayer} onStartGame={handleStartGame} />;
  }

  if ((gamePhase === 'SCORING' || gamePhase === 'DEALER_SELECTION') && (gameRounds.length > 0 || gamePhase === 'DEALER_SELECTION' )) {
    const activePlayersScoreData = playersScoreData.length > 0 ? playersScoreData : players.map(p => ({
        playerId: p.id, name: p.name, 
        scores: gameRounds.map(r => ({ roundNumber: r.roundNumber, bid: null, taken: null, roundScore: 0})), 
        totalScore: 0
    }));
    const currentRoundInfo = gameRounds.find(r => r.roundNumber === currentRoundForInput);
    if (!currentRoundInfo && gamePhase === 'SCORING' && gameRounds.length > 0) { 
        handlePlayAgain(); 
        return <p>Error loading round data. Resetting game...</p>;
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
        onSubmitBid={handleSubmitBid}
        onSubmitTaken={handleSubmitTaken}
        onConfirmBidsForRound={handleConfirmBidsForRound}
        onEditHistoricScore={handleEditHistoricScore}
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

