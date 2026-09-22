import React, { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { Card, Suit, TablePair, Difficulty, DeckSize, Attacker, SUIT_SYMBOLS } from '../types';
import { CardComponent } from './Card';
import {
  createDeck,
  shuffleDeck,
  canBeat,
  canThrowCard,
  determineFirstAttacker,
  computerChooseAttack,
  computerChooseDefense,
  computerShouldThrow,
  sortHand,
  findLowestTrump
} from '../gameLogic';
import { RANK_VALUES } from '../types';
import { isPlayerCheatEnabled } from '../cheats';

type GameStatus = 'playing' | 'paused' | 'gameOver' | 'waiting';
type SortMode = 'suit' | 'rank' | 'rank-trump';

interface State {
  deck: Card[];
  playerHand: Card[];
  computerHand: Card[];
  table: TablePair[];
  trumpCard: Card | null;
  trumpSuit: Suit | null;
  attacker: Attacker;
  selectedCard: Card | null;
  message: string;
  status: GameStatus;
  gameOverMessage: string;
  showTakeButton: boolean;
  showPassButton: boolean;
  computerThinking: boolean;
  roundEnded: boolean;
  playerJustTook: boolean;
  computerJustTook: boolean;
  lastTableRanks: Set<string>;
  lastAttackCards: Card[];
  animatingCards: 'player-takes' | 'computer-takes' | null;
  computerKnownTrump: Card | null;
  playerKnownTrump: Card | null;
  cardsShownToComputer: Set<string>;
}

type Action =
  | { type: 'INIT'; deck: Card[]; playerHand: Card[]; computerHand: Card[]; trumpCard: Card; attacker: Attacker; message: string }
  | { type: 'SELECT_CARD'; card: Card | null }
  | { type: 'PLAYER_ATTACK'; card: Card }
  | { type: 'PLAYER_DEFEND'; card: Card; attackId: string }
  | { type: 'PLAYER_THROW_AFTER_COMPUTER_TAKES'; card: Card }
  | { type: 'COMPUTER_ATTACK'; card: Card }
  | { type: 'COMPUTER_DEFEND'; card: Card; attackId: string }
  | { type: 'COMPUTER_THROW'; card: Card }
  | { type: 'COMPUTER_TAKES' }
  | { type: 'COLLECT_CARDS_FOR_COMPUTER' }
  | { type: 'PLAYER_TAKES' }
  | { type: 'PLAYER_COLLECT_ALL' }
  | { type: 'END_ROUND'; playerTook: boolean; computerTook: boolean }
  | { type: 'DRAW_CARDS' }
  | { type: 'CLEAR_TABLE_AND_DRAW' }
  | { type: 'SET_MESSAGE'; message: string }
  | { type: 'SET_STATUS'; status: GameStatus }
  | { type: 'SET_THINKING'; thinking: boolean }
  | { type: 'SHOW_BUTTONS'; take: boolean; pass: boolean }
  | { type: 'GAME_OVER'; message: string }
  | { type: 'SET_ANIMATING'; animation: 'player-takes' | 'computer-takes' | null }
  | { type: 'SET_KNOWN_TRUMPS'; computerTrump: Card | null; playerTrump: Card | null }
  | { type: 'SET_CARDS_SHOWN_TO_COMPUTER'; cards: Set<string> }
  | { type: 'SET_DECK_SIZE'; size: number }
  | { type: 'GIVE_CARD'; rank: string; suit: string }
  | { type: 'CLEAR_PLAYER_HAND' }
  | { type: 'CLEAR_BOT_HAND' }
  | { type: 'WIN_GAME' }
  | { type: 'LOSE_GAME' };

const initialState: State = {
  deck: [],
  playerHand: [],
  computerHand: [],
  table: [],
  trumpCard: null,
  trumpSuit: null,
  attacker: 'player',
  selectedCard: null,
  message: '',
  status: 'playing',
  gameOverMessage: '',
  showTakeButton: false,
  showPassButton: false,
  computerThinking: false,
  roundEnded: false,
  playerJustTook: false,
  computerJustTook: false,
  lastTableRanks: new Set<string>(),
  lastAttackCards: [],
  animatingCards: null,
  computerKnownTrump: null,
  playerKnownTrump: null,
  cardsShownToComputer: new Set()
};

function drawFromDeck(state: State): State {
  let deck = [...state.deck];
  let pH = [...state.playerHand];
  let cH = [...state.computerHand];

  const drawOrder: Attacker[] = state.attacker === 'player' ? ['player', 'computer'] : ['computer', 'player'];

  for (const who of drawOrder) {
    const hand = who === 'player' ? pH : cH;
    while (hand.length < 6 && deck.length > 0) {
      hand.push(deck.pop()!);
    }
    if (who === 'player') pH = hand;
    else cH = hand;
  }

  return { ...state, deck, playerHand: pH, computerHand: cH };
}

function checkGameEnd(state: State): State | null {
  if (state.playerHand.length === 0 && state.computerHand.length === 0) {
    return { ...state, status: 'gameOver', gameOverMessage: 'Ничья!' };
  }
  
  if (state.deck.length > 0) return null;
  
  if (state.playerHand.length === 0) {
    return { ...state, status: 'gameOver', gameOverMessage: '🎉 Вы победили!' };
  }
  if (state.computerHand.length === 0) {
    return { ...state, status: 'gameOver', gameOverMessage: '😞 Вы проиграли!' };
  }
  return null;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INIT':
      return {
        ...state,
        deck: action.deck,
        playerHand: action.playerHand,
        computerHand: action.computerHand,
        trumpCard: action.trumpCard,
        trumpSuit: action.trumpCard.suit,
        attacker: action.attacker,
        table: [],
        selectedCard: null,
        message: action.message,
        status: 'playing',
        gameOverMessage: '',
        showTakeButton: false,
        showPassButton: false,
        computerThinking: false,
        roundEnded: false,
        playerJustTook: false,
        computerJustTook: false,
        lastTableRanks: new Set(),
        lastAttackCards: [],
        animatingCards: null,
        computerKnownTrump: null,
        playerKnownTrump: null,
        cardsShownToComputer: new Set()
      };

    case 'SELECT_CARD':
      return { ...state, selectedCard: action.card };

    case 'PLAYER_ATTACK': {
      const newHand = state.playerHand.filter(c => c.id !== action.card.id);
      const newTable = [...state.table, { attack: action.card, defense: null }];
      const newLastAttackCards = [...state.lastAttackCards, action.card];
      const newCardsShown = new Set(state.cardsShownToComputer);
      newCardsShown.add(action.card.id);
      return {
        ...state,
        playerHand: newHand,
        table: newTable,
        selectedCard: null,
        showPassButton: false,
        message: 'Ожидание...',
        lastAttackCards: newLastAttackCards,
        cardsShownToComputer: newCardsShown
      };
    }

    case 'PLAYER_DEFEND': {
      const newHand = state.playerHand.filter(c => c.id !== action.card.id);
      const newTable = state.table.map(p =>
        p.attack.id === action.attackId ? { ...p, defense: action.card } : p
      );
      const newCardsShown = new Set(state.cardsShownToComputer);
      newCardsShown.add(action.card.id);
      return {
        ...state,
        playerHand: newHand,
        table: newTable,
        selectedCard: null,
        showTakeButton: false,
        message: 'Ожидание...',
        computerThinking: false,
        cardsShownToComputer: newCardsShown
      };
    }

    case 'PLAYER_THROW_AFTER_COMPUTER_TAKES': {
      if (state.table.length >= 6) {
        return state;
      }
      
      const newHand = state.playerHand.filter(c => c.id !== action.card.id);
      const newTable = [...state.table, { attack: action.card, defense: null }];
      const newRanks = new Set(state.lastTableRanks);
      newRanks.add(action.card.rank);
      const newCardsShown = new Set(state.cardsShownToComputer);
      newCardsShown.add(action.card.id);
      
      return {
        ...state,
        playerHand: newHand,
        table: newTable,
        selectedCard: null,
        showPassButton: true,
        message: 'Подкиньте ещё или нажмите "Бито"',
        lastTableRanks: newRanks,
        cardsShownToComputer: newCardsShown
      };
    }

    case 'COMPUTER_ATTACK': {
      const newHand = state.computerHand.filter(c => c.id !== action.card.id);
      const newTable = [...state.table, { attack: action.card, defense: null }];
      const newLastAttackCards = [...state.lastAttackCards, action.card];
      return {
        ...state,
        computerHand: newHand,
        table: newTable,
        showTakeButton: true,
        message: 'Компьютер атаковал. Защищайтесь!',
        computerThinking: false,
        lastAttackCards: newLastAttackCards
      };
    }

    case 'COMPUTER_DEFEND': {
      const newHand = state.computerHand.filter(c => c.id !== action.card.id);
      const newTable = state.table.map(p =>
        p.attack.id === action.attackId ? { ...p, defense: action.card } : p
      );
      return {
        ...state,
        computerHand: newHand,
        table: newTable,
        showTakeButton: false,
        message: 'Ожидание...',
        computerThinking: false
      };
    }

    case 'COMPUTER_THROW': {
      const newHand = state.computerHand.filter(c => c.id !== action.card.id);
      const newTable = [...state.table, { attack: action.card, defense: null }];
      const newLastAttackCards = [...state.lastAttackCards, action.card];
      return {
        ...state,
        computerHand: newHand,
        table: newTable,
        showTakeButton: state.playerJustTook ? false : true,
        message: state.playerJustTook ? 'Компьютер подкидывает...' : 'Компьютер подкидывает. Защищайтесь!',
        computerThinking: state.playerJustTook ? true : false,
        lastAttackCards: newLastAttackCards
      };
    }

    case 'COMPUTER_TAKES': {
      const ranks = new Set<string>();
      state.table.forEach(p => {
        ranks.add(p.attack.rank);
        if (p.defense) ranks.add(p.defense.rank);
      });
      
      return {
        ...state,
        showTakeButton: false,
        showPassButton: true,
        message: 'Компьютер берёт карты',
        computerThinking: false,
        playerJustTook: false,
        computerJustTook: true,
        lastTableRanks: ranks
      };
    }

    case 'COLLECT_CARDS_FOR_COMPUTER': {
      const tableCards = state.table.flatMap(p => [p.attack, ...(p.defense ? [p.defense] : [])]);
      const newHand = [...state.computerHand, ...tableCards];
      
      return {
        ...state,
        computerHand: newHand,
        table: [],
        computerJustTook: false,
        lastTableRanks: new Set<string>()
      };
    }

    case 'PLAYER_TAKES': {
      const ranks = new Set<string>();
      state.table.forEach(p => {
        ranks.add(p.attack.rank);
        if (p.defense) ranks.add(p.defense.rank);
      });
      
      return {
        ...state,
        selectedCard: null,
        showTakeButton: false,
        showPassButton: false,
        message: 'Вы взяли карты. Компьютер подкидывает...',
        computerThinking: false,
        playerJustTook: true,
        lastTableRanks: ranks
      };
    }

    case 'PLAYER_COLLECT_ALL': {
      const tableCards = state.table.flatMap(p => [p.attack, ...(p.defense ? [p.defense] : [])]);
      const newHand = [...state.playerHand, ...tableCards];
      const newCardsShown = new Set(state.cardsShownToComputer);
      tableCards.forEach(card => {
        newCardsShown.add(card.id);
      });
      
      return {
        ...state,
        playerHand: newHand,
        table: [],
        playerJustTook: false,
        lastTableRanks: new Set<string>(),
        cardsShownToComputer: newCardsShown
      };
    }

    case 'END_ROUND': {
      let newAttacker: Attacker;
      
      if (action.playerTook) {
        newAttacker = 'computer';
      } else if (action.computerTook) {
        newAttacker = 'player';
      } else {
        newAttacker = state.attacker === 'player' ? 'computer' : 'player';
      }

      const newState = {
        ...state,
        table: [],
        attacker: newAttacker,
        selectedCard: null,
        showTakeButton: false,
        showPassButton: false,
        roundEnded: true,
        computerThinking: false,
        playerJustTook: false,
        computerJustTook: false,
        lastTableRanks: new Set<string>(),
        lastAttackCards: []
      };

      const withCards = drawFromDeck(newState);
      const endCheck = checkGameEnd(withCards);
      if (endCheck) return endCheck;

      return {
        ...withCards,
        message: newAttacker === 'computer' ? 'Компьютер атакует...' : 'Ваш ход! Выберите карту для атаки.',
        roundEnded: false,
        computerThinking: false,
        playerJustTook: false,
        computerJustTook: false
      };
    }

    case 'DRAW_CARDS':
      return drawFromDeck(state);

    case 'CLEAR_TABLE_AND_DRAW': {
      const clearedState = { 
        ...state, 
        table: [], 
        computerThinking: false,
        playerJustTook: false,
        computerJustTook: false,
        lastTableRanks: new Set<string>()
      };
      return drawFromDeck(clearedState);
    }

    case 'SET_MESSAGE':
      return { ...state, message: action.message };

    case 'SET_STATUS':
      return { ...state, status: action.status };

    case 'SET_THINKING':
      return { ...state, computerThinking: action.thinking };

    case 'SHOW_BUTTONS':
      return { ...state, showTakeButton: action.take, showPassButton: action.pass };

    case 'GAME_OVER':
      return { ...state, status: 'gameOver', gameOverMessage: action.message };

    case 'SET_ANIMATING':
      return { ...state, animatingCards: action.animation };

    case 'SET_KNOWN_TRUMPS':
      return { 
        ...state, 
        computerKnownTrump: action.computerTrump,
        playerKnownTrump: action.playerTrump
      };

    case 'SET_CARDS_SHOWN_TO_COMPUTER':
      return {
        ...state,
        cardsShownToComputer: action.cards
      };

    case 'SET_DECK_SIZE': {
      const currentDeckSize = state.deck.length;
      const targetSize = action.size;
      
      if (targetSize > currentDeckSize) {
        const newCards: Card[] = [];
        for (let i = 0; i < targetSize - currentDeckSize; i++) {
          newCards.push({
            id: `cheat_${Date.now()}_${i}`,
            suit: 'hearts',
            rank: '6'
          });
        }
        return {
          ...state,
          deck: [...state.deck, ...newCards]
        };
      } else if (targetSize < currentDeckSize) {
        return {
          ...state,
          deck: state.deck.slice(0, targetSize)
        };
      }
      return state;
    }

    case 'GIVE_CARD': {
      const newCard: Card = {
        id: `cheat_card_${Date.now()}`,
        suit: action.suit as any,
        rank: action.rank as any
      };
      return {
        ...state,
        playerHand: [...state.playerHand, newCard]
      };
    }

    case 'CLEAR_PLAYER_HAND':
      return {
        ...state,
        playerHand: []
      };

    case 'CLEAR_BOT_HAND':
      return {
        ...state,
        computerHand: []
      };

    case 'WIN_GAME':
      return {
        ...state,
        status: 'gameOver',
        gameOverMessage: '🏆 Победа (чит-код)'
      };

    case 'LOSE_GAME':
      return {
        ...state,
        status: 'gameOver',
        gameOverMessage: '💀 Поражение (чит-код)'
      };

    default:
      return state;
  }
}

interface GameProps {
  difficulty: Difficulty;
  deckSize: DeckSize;
  onBackToMenu: () => void;
}

export const Game: React.FC<GameProps> = ({ difficulty, deckSize, onBackToMenu }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [gamesWon, setGamesWon] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>('suit');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  
  const computerTimeoutRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isTaking, setIsTaking] = useState(false);
  
  stateRef.current = state;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
      }
    }
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const playSound = async (type: 'card' | 'win' | 'lose' | 'take' | 'place' | 'beat' | 'collect' | 'pass') => {
    if (!soundEnabled || !audioContextRef.current) return;
    
    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (type === 'card' || type === 'place' || type === 'beat') {
        oscillator.frequency.value = 400;
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
      } else if (type === 'win') {
        oscillator.frequency.value = 523;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } else if (type === 'lose') {
        oscillator.frequency.value = 200;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } else if (type === 'take' || type === 'collect') {
        oscillator.frequency.value = 300;
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } else if (type === 'pass') {
        oscillator.frequency.value = 500;
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
      }
    } catch (e) {
      console.error('Sound error:', e);
    }
  };

  const initGame = useCallback(() => {
    setIsTaking(false);
    const newDeck = shuffleDeck(createDeck(deckSize));
    const pHand = newDeck.splice(0, 6);
    const cHand = newDeck.splice(0, 6);
    const trump = newDeck.splice(newDeck.length - 1, 1)[0];
    const firstAttacker = determineFirstAttacker(pHand, cHand, trump.suit);

    const playerLowestTrump = findLowestTrump(pHand, trump.suit);
    const computerLowestTrump = findLowestTrump(cHand, trump.suit);

    let message = '';
    let computerKnownTrump: Card | null = null;
    let playerKnownTrump: Card | null = null;

    if (firstAttacker === 'computer') {
      message = 'Компьютер атакует...';
      computerKnownTrump = computerLowestTrump;
    } else {
      message = 'Ваш ход! Выберите карту для атаки.';
      playerKnownTrump = playerLowestTrump;
    }

    dispatch({
      type: 'INIT',
      deck: newDeck,
      playerHand: pHand,
      computerHand: cHand,
      trumpCard: trump,
      attacker: firstAttacker,
      message
    });

    if (computerKnownTrump || playerKnownTrump) {
      setTimeout(() => {
        dispatch({ type: 'SET_KNOWN_TRUMPS', computerTrump: computerKnownTrump, playerTrump: playerKnownTrump });
      }, 0);
    }

    setScore(0);
  }, [deckSize]);

  useEffect(() => {
    initGame();
    return () => {
      if (computerTimeoutRef.current) clearTimeout(computerTimeoutRef.current);
    };
  }, [initGame]);

  // Handle cheat codes
  useEffect(() => {
    const checkCheats = () => {
      if ((window as any).__setDeckSize !== undefined) {
        const size = (window as any).__setDeckSize;
        dispatch({ type: 'SET_DECK_SIZE', size });
        (window as any).__setDeckSize = undefined;
      }

      if ((window as any).__giveCard !== undefined) {
        const { rank, suit } = (window as any).__giveCard;
        dispatch({ type: 'GIVE_CARD', rank, suit });
        (window as any).__giveCard = undefined;
      }

      if ((window as any).__clearPlayerHand) {
        dispatch({ type: 'CLEAR_PLAYER_HAND' });
        (window as any).__clearPlayerHand = false;
      }

      if ((window as any).__clearBotHand) {
        dispatch({ type: 'CLEAR_BOT_HAND' });
        (window as any).__clearBotHand = false;
      }

      if ((window as any).__winGame) {
        dispatch({ type: 'WIN_GAME' });
        (window as any).__winGame = false;
      }

      if ((window as any).__loseGame) {
        dispatch({ type: 'LOSE_GAME' });
        (window as any).__loseGame = false;
      }
    };

    const interval = setInterval(checkCheats, 100);
    return () => clearInterval(interval);
  }, []);

  const computerAttack = useCallback(() => {
    const cs = stateRef.current;
    if (cs.status !== 'playing' || cs.computerThinking) return;

    dispatch({ type: 'SET_THINKING', thinking: true });
    computerTimeoutRef.current = window.setTimeout(() => {
      const cs2 = stateRef.current;
      if (cs2.status !== 'playing') return;
      if (cs2.attacker !== 'computer') return;
      
      const card = computerChooseAttack(cs2.computerHand, cs2.table, cs2.trumpSuit, difficulty);
      if (card) {
        dispatch({ type: 'COMPUTER_ATTACK', card });
        playSound('place');
      } else {
        dispatch({ type: 'END_ROUND', playerTook: false, computerTook: false });
      }
    }, 800 + Math.random() * 500);
  }, [difficulty]);

  const computerThrow = useCallback(() => {
    const cs = stateRef.current;
    if (cs.status !== 'playing' || cs.computerThinking) return;
    if (cs.attacker !== 'computer') return;
    
    if (cs.playerJustTook) {
      const throwableCards = cs.computerHand.filter(c => cs.lastTableRanks.has(c.rank));
      
      if (throwableCards.length === 0 || cs.table.length >= 6) {
        dispatch({ type: 'PLAYER_COLLECT_ALL' });
        dispatch({ type: 'END_ROUND', playerTook: true, computerTook: false });
        return;
      }

      dispatch({ type: 'SET_THINKING', thinking: true });
      computerTimeoutRef.current = window.setTimeout(() => {
        const cs2 = stateRef.current;
        if (cs2.status !== 'playing' || cs2.attacker !== 'computer') return;
        
        if (cs2.table.length >= 6) {
          dispatch({ type: 'PLAYER_COLLECT_ALL' });
          dispatch({ type: 'END_ROUND', playerTook: true, computerTook: false });
          return;
        }
        
        const throwable = cs2.computerHand
          .filter(c => cs2.lastTableRanks.has(c.rank))
          .sort((a, b) => {
            const aIsTrump = a.suit === cs2.trumpSuit ? 1 : 0;
            const bIsTrump = b.suit === cs2.trumpSuit ? 1 : 0;
            if (aIsTrump !== bIsTrump) return aIsTrump - bIsTrump;
            return RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
          });
        
        if (throwable.length > 0 && cs2.table.length < 6) {
          const card = throwable[0];
          dispatch({ type: 'COMPUTER_THROW', card });
          setTimeout(() => {
            dispatch({ type: 'SET_THINKING', thinking: false });
          }, 800);
        } else {
          dispatch({ type: 'PLAYER_COLLECT_ALL' });
          dispatch({ type: 'END_ROUND', playerTook: true, computerTook: false });
        }
      }, 600 + Math.random() * 200);
      return;
    }
    
    if (cs.table.length === 0) return;
    
    const allDefended = cs.table.every(p => p.defense !== null);
    
    if (allDefended) {
      if (cs.table.length >= 6 || cs.playerHand.length === 0) {
        dispatch({ type: 'END_ROUND', playerTook: false, computerTook: false });
        return;
      }
      
      dispatch({ type: 'SET_THINKING', thinking: true });
      computerTimeoutRef.current = window.setTimeout(() => {
        const cs2 = stateRef.current;
        if (cs2.status !== 'playing' || cs2.attacker !== 'computer') return;
        
        const card = computerShouldThrow(cs2.computerHand, cs2.table, cs2.trumpSuit, difficulty, cs2.playerHand.length);
        if (card && cs2.table.length < 6) {
          dispatch({ type: 'COMPUTER_THROW', card });
        } else {
          dispatch({ type: 'END_ROUND', playerTook: false, computerTook: false });
        }
      }, 600 + Math.random() * 400);
    }
  }, [difficulty]);

  const computerDefend = useCallback(() => {
    const cs = stateRef.current;
    if (cs.status !== 'playing' || cs.computerThinking) return;
    if (cs.attacker !== 'player' || cs.table.length === 0) return;
    
    const undefended = cs.table.find(p => !p.defense);
    if (!undefended) return;

    dispatch({ type: 'SET_THINKING', thinking: true });
    computerTimeoutRef.current = window.setTimeout(() => {
      const cs2 = stateRef.current;
      if (cs2.status !== 'playing' || cs2.attacker !== 'player') return;
      
      const currentUndefended = cs2.table.find(p => !p.defense);
      if (!currentUndefended) return;
      
      const defenseCard = computerChooseDefense(cs2.computerHand, currentUndefended.attack, cs2.trumpSuit, difficulty);
      if (defenseCard) {
        dispatch({ type: 'COMPUTER_DEFEND', card: defenseCard, attackId: currentUndefended.attack.id });
        playSound('beat');
        setTimeout(() => {
          const cs3 = stateRef.current;
          if (cs3.status !== 'playing') return;
          const canThrow = cs3.playerHand.some(c => canThrowCard(c, cs3.table));
          if (canThrow && cs3.table.length < 6) {
            dispatch({ type: 'SHOW_BUTTONS', take: false, pass: true });
            dispatch({ type: 'SET_MESSAGE', message: 'Подкиньте карту или нажмите "Бито".' });
          } else {
            dispatch({ type: 'END_ROUND', playerTook: false, computerTook: false });
          }
        }, 400);
      } else {
        dispatch({ type: 'SET_MESSAGE', message: 'Компьютер берёт карты' });
        setScore(prev => prev + 15);

        setTimeout(() => {
          dispatch({ type: 'COMPUTER_TAKES' });
          playSound('collect');
        }, 500);
      }
    }, 800 + Math.random() * 600);
  }, [difficulty]);

  useEffect(() => {
    if (state.status !== 'playing' || state.computerThinking) return;

    const timeoutId = setTimeout(() => {
      if (state.computerJustTook) return;
      
      if (state.attacker === 'computer' && state.table.length === 0 && !state.playerJustTook) {
        computerAttack();
      } else if (state.attacker === 'computer' && (state.table.length > 0 || state.playerJustTook)) {
        computerThrow();
      } else if (state.attacker === 'player' && state.table.length > 0) {
        computerDefend();
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [state.attacker, state.table, state.status, state.computerThinking, state.playerJustTook, state.computerJustTook, state.roundEnded, computerAttack, computerThrow, computerDefend]);

  const handleCardClick = (card: Card) => {
    if (state.status !== 'playing') return;
    if (state.computerThinking) return;

    if (state.attacker === 'player' && state.computerJustTook) {
      if (state.lastTableRanks.has(card.rank)) {
        if (state.selectedCard?.id === card.id) {
          dispatch({ type: 'PLAYER_THROW_AFTER_COMPUTER_TAKES', card });
          playSound('place');
        } else {
          dispatch({ type: 'SELECT_CARD', card });
        }
      }
      return;
    }

    if (state.attacker === 'player') {
      if (state.table.length === 0 || canThrowCard(card, state.table)) {
        if (state.selectedCard?.id === card.id) {
          dispatch({ type: 'PLAYER_ATTACK', card });
          dispatch({ type: 'SET_MESSAGE', message: 'Ожидание...' });
          playSound('place');
        } else {
          dispatch({ type: 'SELECT_CARD', card });
        }
      }
    } else if (state.attacker === 'computer') {
      const undefended = state.table.find(p => !p.defense);
      if (undefended) {
        // Чит-режим: игрок может бить любой картой
        const canBeatCard = isPlayerCheatEnabled() || canBeat(undefended.attack, card, state.trumpSuit);
        if (canBeatCard) {
          if (state.selectedCard?.id === card.id) {
            dispatch({ type: 'PLAYER_DEFEND', card, attackId: undefended.attack.id });
            dispatch({ type: 'SET_MESSAGE', message: 'Ожидание...' });
            playSound('beat');
          } else {
            dispatch({ type: 'SELECT_CARD', card });
          }
        }
      }
    }
  };

  const confirmPlay = () => {
    if (!state.selectedCard || state.status !== 'playing') return;

    if (state.attacker === 'player' && state.computerJustTook) {
      if (state.lastTableRanks.has(state.selectedCard.rank)) {
        dispatch({ type: 'PLAYER_THROW_AFTER_COMPUTER_TAKES', card: state.selectedCard });
        playSound('place');
        return;
      }
    }

    if (state.attacker === 'player') {
      dispatch({ type: 'PLAYER_ATTACK', card: state.selectedCard });
      dispatch({ type: 'SET_MESSAGE', message: 'Ожидание...' });
    } else if (state.attacker === 'computer') {
      const undefended = state.table.find(p => !p.defense);
      if (undefended) {
        // Чит-режим: игрок может бить любой картой
        const canBeatCard = isPlayerCheatEnabled() || canBeat(undefended.attack, state.selectedCard, state.trumpSuit);
        
        if (!canBeatCard) {
          dispatch({ type: 'SET_MESSAGE', message: 'Этой картой нельзя отбить!' });
          return;
        }
        
        dispatch({ type: 'PLAYER_DEFEND', card: state.selectedCard, attackId: undefended.attack.id });
        dispatch({ type: 'SET_MESSAGE', message: 'Ожидание...' });
      }
    }
  };

  const handleTake = () => {
    if (state.status !== 'playing') return;
    if (isTaking) return;
    
    setIsTaking(true);
    playSound('collect');
    
    setTimeout(() => {
      const currentState = stateRef.current;
      
      dispatch({ type: 'SET_ANIMATING', animation: 'player-takes' });
      
      setTimeout(() => {
        dispatch({ type: 'PLAYER_TAKES' });
        dispatch({ type: 'SET_ANIMATING', animation: null });
        setScore(prev => Math.max(0, prev - 10));
        
        setTimeout(() => {
          setIsTaking(false);
        }, 300);
      }, 600);
    }, 1500);
  };

  const handlePass = () => {
    if (state.status !== 'playing') return;
    
    playSound('pass');
    
    if (state.computerJustTook) {
      dispatch({ type: 'SET_ANIMATING', animation: 'computer-takes' });
      
      setTimeout(() => {
        dispatch({ type: 'COLLECT_CARDS_FOR_COMPUTER' });
        dispatch({ type: 'SET_ANIMATING', animation: null });
        dispatch({ type: 'END_ROUND', playerTook: false, computerTook: true });
        setScore(prev => prev + 5);
      }, 800);
      return;
    }
    
    dispatch({ type: 'END_ROUND', playerTook: false, computerTook: false });
    setScore(prev => prev + 5);
  };

  const restartGame = () => {
    if (computerTimeoutRef.current) clearTimeout(computerTimeoutRef.current);
    setIsTaking(false);
    initGame();
  };

  const sortCards = (hand: Card[]): Card[] => {
    if (sortMode === 'suit') {
      return sortHand(hand, state.trumpSuit);
    } else if (sortMode === 'rank') {
      return [...hand].sort((a, b) => {
        const rankOrder = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
      });
    } else {
      // По рангу + козыри (козыри в конце)
      return [...hand].sort((a, b) => {
        const aIsTrump = a.suit === state.trumpSuit ? 1 : 0;
        const bIsTrump = b.suit === state.trumpSuit ? 1 : 0;
        // Козыри в конце
        if (aIsTrump !== bIsTrump) return aIsTrump - bIsTrump;
        const rankOrder = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
      });
    }
  };

  const getPlayableCards = (): Set<string> => {
    const playable = new Set<string>();
    if (!hintsEnabled) return playable;
    if (state.computerThinking) return playable;

    if (state.attacker === 'player') {
      if (state.computerJustTook) {
        state.playerHand.forEach(c => {
          if (state.lastTableRanks.has(c.rank)) {
            playable.add(c.id);
          }
        });
      } else {
        state.playerHand.forEach(c => {
          if (state.table.length === 0 || canThrowCard(c, state.table)) {
            playable.add(c.id);
          }
        });
      }
    } else if (state.attacker === 'computer') {
      const undefended = state.table.find(p => !p.defense);
      if (undefended) {
        state.playerHand.forEach(c => {
          // Чит-режим: все карты можно использовать для защиты
          if (isPlayerCheatEnabled() || canBeat(undefended.attack, c, state.trumpSuit)) {
            playable.add(c.id);
          }
        });
      }
    }
    return playable;
  };

  const getComputerKnownCards = (): Set<string> => {
    const known = new Set<string>();
    
    if (difficulty === 'easy') {
      state.playerHand.forEach(card => {
        if (card.suit === state.trumpSuit && state.cardsShownToComputer.has(card.id)) {
          known.add(card.id);
        }
      });
      if (state.deck.length === 0) {
        state.playerHand.forEach(card => {
          if (card.suit === state.trumpSuit) {
            known.add(card.id);
          }
        });
      }
    } else if (difficulty === 'medium') {
      state.playerHand.forEach(card => {
        if (card.suit === state.trumpSuit && state.cardsShownToComputer.has(card.id)) {
          known.add(card.id);
        }
      });
      if (state.deck.length === 0) {
        state.playerHand.forEach(card => {
          if (card.suit === state.trumpSuit) {
            known.add(card.id);
          }
        });
      }
    } else if (difficulty === 'hard') {
      state.playerHand.forEach(card => {
        if (state.cardsShownToComputer.has(card.id)) {
          known.add(card.id);
        }
      });
      if (state.deck.length === 0) {
        state.playerHand.forEach(card => {
          known.add(card.id);
        });
      }
    }
    
    return known;
  };

  const playableCards = getPlayableCards();
  const computerKnownCards = getComputerKnownCards();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.status === 'playing') {
        setShowExitConfirm(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.status]);

  useEffect(() => {
    if (state.status === 'gameOver') {
      const newGP = gamesPlayed + 1;
      setGamesPlayed(newGP);

      if (state.gameOverMessage.includes('победили')) {
        const newScore = score + 100;
        setScore(newScore);
        const newHS = Math.max(highScore, newScore);
        setHighScore(newHS);
        const newGW = gamesWon + 1;
        setGamesWon(newGW);
        playSound('win');
      } else if (state.gameOverMessage.includes('проиграли')) {
        playSound('lose');
      }
    }
  }, [state.status]);

  return (
    <div className="min-h-screen h-screen bg-gradient-to-b from-green-800 via-green-700 to-green-900 flex flex-col relative overflow-y-auto pb-4">
      <div className="relative z-10 flex items-center justify-between p-3 bg-black/20 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            ← Меню
          </button>
          <span className="text-white/60 text-sm">
            {difficulty === 'easy' ? '😊 Легкая' : difficulty === 'medium' ? '🤔 Средняя' : '😈 Сложная'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-white text-sm">
            <span className="text-yellow-300 font-bold">{score}</span>
            <span className="text-white/50"> очков</span>
          </div>
          <div className="text-white/50 text-sm">
            🏆 {highScore}
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col p-3 gap-2 max-w-5xl mx-auto w-full min-h-0">
        <div className="flex flex-col items-center shrink-0">
          <div className="text-white/90 text-lg font-bold mb-1 flex items-center gap-2">
            <span>🤖 Компьютер ({state.computerHand.length})</span>
            <span className="text-sm font-normal text-white/70">
              {state.attacker === 'computer' ? '⚔️ Атакует' : '🛡️ Защищается'}
            </span>
          </div>
          <div className="flex justify-center max-w-full px-2 overflow-visible">
            <div 
              className="flex"
              style={{
                transform: state.computerHand.length > 8 
                  ? `scale(${Math.max(0.5, 1 - (state.computerHand.length - 8) * 0.05)})`
                  : undefined,
                transformOrigin: 'center',
                transition: 'transform 0.3s ease'
              }}
            >
              {state.computerHand.map((card, i) => (
                <div
                  key={card.id}
                  className="transition-all duration-300"
                  style={{ 
                    marginLeft: i > 0 ? '-1.2rem' : '0',
                  }}
                >
                  <CardComponent card={card} faceDown className="w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-[130px] bg-green-600/20 rounded-xl border-2 border-green-500/20 flex items-center justify-center p-3 relative overflow-hidden">
          {state.deck.length > 0 && (
            <div className="absolute right-4 top-4 flex items-center gap-2 z-20">
              {state.trumpCard && (
                <div style={{ transform: 'rotate(90deg)' }}>
                  <CardComponent card={state.trumpCard} className="w-20" />
                </div>
              )}
              <div className="relative" style={{ width: '5rem', height: '7rem' }}>
                {(() => {
                  const layerCount = state.deck.length === 1 ? 0 : Math.min(4, Math.max(1, Math.ceil(state.deck.length / 6)));
                  return Array.from({ length: layerCount }, (_, i) => (
                    <div 
                      key={i}
                      className="absolute inset-0 rounded-lg"
                      style={{ 
                        transform: `translate(${(i + 1) * 2}px, -${(i + 1) * 2}px)`,
                        background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)',
                        border: '2px solid #3b82f6',
                        boxShadow: '2px -2px 4px rgba(0,0,0,0.5)'
                      }}
                    ></div>
                  ));
                })()}
                
                <CardComponent card={state.deck[0]} faceDown className="w-20 relative z-10" />
                <div className="absolute -top-1 -right-1 bg-white text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow z-20">
                  {state.deck.length}
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-1 items-center justify-center relative z-10">
            {state.table.length === 0 ? (
              <div className="text-green-300/60 text-base font-medium">
                {state.attacker === 'player' ? 'Выберите карту для атаки' : 'Ожидание...'}
              </div>
            ) : (
              state.table.map((pair, i) => {
                let attackAnimationClass = '';
                let defenseAnimationClass = '';
                
                if (state.animatingCards === 'player-takes') {
                  attackAnimationClass = 'animate-card-fly-to-player';
                  defenseAnimationClass = 'animate-card-fly-to-player';
                } else if (state.animatingCards === 'computer-takes') {
                  attackAnimationClass = 'animate-card-fly-to-computer';
                  defenseAnimationClass = 'animate-card-fly-to-computer';
                }
                
                return (
                  <div 
                    key={i} 
                    className="relative animate-card-appear"
                    style={{ width: '7rem', height: '8rem' }}
                  >
                    <div className={`${attackAnimationClass} absolute top-4 left-4`} style={{ filter: pair.defense ? 'drop-shadow(4px 4px 6px rgba(0,0,0,0.5))' : 'none' }}>
                      <CardComponent card={pair.attack} className="w-20" />
                    </div>
                    {pair.defense && (
                      <div className={`${defenseAnimationClass} absolute top-10 left-10`} style={{ transform: 'rotate(8deg)', filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))' }}>
                        <CardComponent card={pair.defense} className="w-20" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-center gap-2 shrink-0 min-h-[40px]">
          {state.selectedCard && (
            <button
              onClick={confirmPlay}
              className="px-3 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg font-bold text-sm transition-all animate-bounce-subtle shadow-lg"
            >
              {state.computerJustTook ? '🃏 Подкинуть' : '✓ Подтвердить'}
            </button>
          )}
          {state.showTakeButton && (
            <button
              onClick={handleTake}
              disabled={isTaking}
              className={`px-3 py-2 text-white rounded-lg font-bold text-sm transition-colors shadow-lg ${
                isTaking 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-orange-500 hover:bg-orange-400'
              }`}
            >
              🖐 Взять
            </button>
          )}
          {state.showPassButton && (
            <button
              onClick={handlePass}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-bold text-sm transition-colors shadow-lg"
            >
              ✓ Бито
            </button>
          )}
          {state.attacker === 'player' && state.table.length > 0 && !state.showPassButton && !state.selectedCard && !state.computerThinking && !state.computerJustTook && (
            <button
              onClick={handlePass}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-bold text-sm transition-colors shadow-lg"
            >
              ✓ Бито
            </button>
          )}
          {state.selectedCard && (
            <button
              onClick={() => dispatch({ type: 'SELECT_CARD', card: null })}
              className="px-3 py-2 bg-gray-500 hover:bg-gray-400 text-white rounded-lg font-bold text-sm transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-col items-center shrink-0 mt-2 w-full">
          <div className="flex justify-center w-full px-4">
            {sortCards(state.playerHand).map((card, i) => {
              const cardCount = state.playerHand.length;
              const cardWidth = 80; // w-20 = 5rem = 80px
              const availableWidth = screenWidth - 64;
              const totalCardsWidth = cardCount * cardWidth;
              
              let marginLeft = '0';
              
              if (i > 0) {
                if (totalCardsWidth <= availableWidth) {
                  // Карты помещаются без перекрытия
                  marginLeft = '0';
                } else {
                  // Рассчитываем необходимое перекрытие в пикселях
                  const overlapNeeded = totalCardsWidth - availableWidth;
                  const overlapPerCard = overlapNeeded / (cardCount - 1);
                  
                  // Ограничиваем максимальное перекрытие до 40px (50% от ширины карты)
                  const maxOverlapPx = 40;
                  const finalOverlapPx = Math.min(overlapPerCard, maxOverlapPx);
                  marginLeft = `-${finalOverlapPx}px`;
                }
              }
              
              const cardSize = 'w-20';
              
              return (
              <div
                key={card.id}
                className="transition-all duration-200 flex-shrink-0"
                style={{ marginLeft }}
              >
                <CardComponent
                  card={card}
                  isSelected={state.selectedCard?.id === card.id}
                  isPlayable={playableCards.has(card.id)}
                  isTrump={card.suit === state.trumpSuit}
                  isKnownByComputer={computerKnownCards.has(card.id)}
                  onClick={() => handleCardClick(card)}
                  className={cardSize}
                />
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {showExitConfirm && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="bg-gray-800 rounded-2xl p-6 text-center shadow-2xl border border-gray-600 animate-scale-in max-w-sm mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Выйти в меню?</h2>
            <p className="text-gray-300 text-sm mb-6">Текущая игра будет потеряна</p>
            <div className="space-y-2">
              <button
                onClick={onBackToMenu}
                className="block w-full px-6 py-3 bg-red-500 hover:bg-red-400 text-white rounded-lg font-bold transition-colors"
              >
                ✓ Да, выйти
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="block w-full px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold transition-colors"
              >
                ✕ Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {state.status === 'gameOver' && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="bg-gray-800 rounded-2xl p-8 text-center shadow-2xl border border-gray-600 max-w-sm mx-4 animate-scale-in">
            <h2 className="text-3xl font-bold text-white mb-2">Игра окончена</h2>
            <p className="text-lg text-yellow-300 mb-4">{state.gameOverMessage}</p>
            <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-gray-400 text-xs">Счёт</div>
                <div className="text-2xl font-bold text-white">{score}</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-gray-400 text-xs">Рекорд</div>
                <div className="text-2xl font-bold text-yellow-400">{highScore}</div>
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={restartGame}
                className="block w-full px-6 py-3 bg-green-500 hover:bg-green-400 text-white rounded-lg font-bold transition-colors"
              >
                🔄 Играть снова
              </button>
              <button
                onClick={onBackToMenu}
                className="block w-full px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold transition-colors"
              >
                ← В меню
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
