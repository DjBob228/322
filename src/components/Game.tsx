import type React from 'react';
import { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import {
  type Card,
  type Suit,
  type TablePair,
  type Difficulty,
  type Attacker,
  SUIT_SYMBOLS,
} from '../types';
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
} from '../gameLogic';

type GameStatus = 'playing' | 'paused' | 'gameOver' | 'waiting';

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
}

type Action =
  | { type: 'INIT'; deck: Card[]; playerHand: Card[]; computerHand: Card[]; trumpCard: Card; attacker: Attacker; message: string }
  | { type: 'SELECT_CARD'; card: Card | null }
  | { type: 'PLAYER_ATTACK'; card: Card }
  | { type: 'PLAYER_DEFEND'; card: Card; attackId: string }
  | { type: 'COMPUTER_ATTACK'; card: Card }
  | { type: 'COMPUTER_DEFEND'; card: Card; attackId: string }
  | { type: 'COMPUTER_THROW'; card: Card }
  | { type: 'COMPUTER_TAKES' }
  | { type: 'PLAYER_TAKES' }
  | { type: 'END_ROUND'; playerTook: boolean }
  | { type: 'DRAW_CARDS' }
  | { type: 'SET_MESSAGE'; message: string }
  | { type: 'SET_STATUS'; status: GameStatus }
  | { type: 'SET_THINKING'; thinking: boolean }
  | { type: 'SHOW_BUTTONS'; take: boolean; pass: boolean }
  | { type: 'GAME_OVER'; message: string }
  | { type: 'COMPUTER_PASS' };

function drawFromDeck(state: State): State {
  let deck = [...state.deck];
  let pH = [...state.playerHand];
  let cH = [...state.computerHand];

  const drawOrder: Attacker[] =
    state.attacker === 'player' ? ['player', 'computer'] : ['computer', 'player'];

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
  if (state.deck.length > 0) return null;
  if (state.playerHand.length === 0 && state.computerHand.length === 0) {
    return { ...state, status: 'gameOver', gameOverMessage: 'Ничья! Оба игрока избавились от карт.' };
  }
  if (state.playerHand.length === 0) {
    return { ...state, status: 'gameOver', gameOverMessage: '🎉 Вы победили! Компьютер — дурак!' };
  }
  if (state.computerHand.length === 0) {
    return { ...state, status: 'gameOver', gameOverMessage: '😞 Вы проиграли! Вы — дурак!' };
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
      };

    case 'SELECT_CARD':
      return { ...state, selectedCard: action.card };

    case 'PLAYER_ATTACK': {
      const newHand = state.playerHand.filter(c => c.id !== action.card.id);
      const newTable = [...state.table, { attack: action.card, defense: null }];
      return {
        ...state,
        playerHand: newHand,
        table: newTable,
        selectedCard: null,
        showPassButton: false,
        message: 'Компьютер думает...',
      };
    }

    case 'PLAYER_DEFEND': {
      const newHand = state.playerHand.filter(c => c.id !== action.card.id);
      const newTable = state.table.map(p =>
        p.attack.id === action.attackId ? { ...p, defense: action.card } : p
      );
      return {
        ...state,
        playerHand: newHand,
        table: newTable,
        selectedCard: null,
        showTakeButton: false,
        message: 'Компьютер думает...',
        computerThinking: false,
      };
    }

    case 'COMPUTER_ATTACK': {
      const newHand = state.computerHand.filter(c => c.id !== action.card.id);
      const newTable = [...state.table, { attack: action.card, defense: null }];
      return {
        ...state,
        computerHand: newHand,
        table: newTable,
        showTakeButton: true,
        message: 'Компьютер атаковал. Защищайтесь!',
        computerThinking: false,
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
        message: 'Компьютер отбился.',
        computerThinking: false,
      };
    }

    case 'COMPUTER_THROW': {
      const newHand = state.computerHand.filter(c => c.id !== action.card.id);
      const newTable = [...state.table, { attack: action.card, defense: null }];
      return {
        ...state,
        computerHand: newHand,
        table: newTable,
        showTakeButton: true,
        message: 'Компьютер подкидывает. Защищайтесь!',
        computerThinking: false,
      };
    }

    case 'COMPUTER_TAKES': {
      const tableCards = state.table.flatMap(p => [p.attack, ...(p.defense ? [p.defense] : [])]);
      const newHand = [...state.computerHand, ...tableCards];
      const newState = {
        ...state,
        computerHand: newHand,
        table: [],
        showTakeButton: false,
        showPassButton: false,
        message: 'Компьютер берёт карты!',
        computerThinking: false,
      };
      return drawFromDeck(newState);
    }

    case 'PLAYER_TAKES': {
      const tableCards = state.table.flatMap(p => [p.attack, ...(p.defense ? [p.defense] : [])]);
      const newHand = [...state.playerHand, ...tableCards];
      return {
        ...state,
        playerHand: newHand,
        table: [],
        selectedCard: null,
        showTakeButton: false,
        showPassButton: false,
        message: 'Вы взяли карты. Компьютер подкидывает...',
      };
    }

    case 'END_ROUND': {
      const newAttacker: Attacker = action.playerTook
        ? state.attacker
        : (state.attacker === 'player' ? 'computer' : 'player');

      const newState = {
        ...state,
        table: [],
        attacker: newAttacker,
        selectedCard: null,
        showTakeButton: false,
        showPassButton: false,
        roundEnded: true,
      };

      const withCards = drawFromDeck(newState);
      const endCheck = checkGameEnd(withCards);
      if (endCheck) return endCheck;

      return {
        ...withCards,
        message: newAttacker === 'computer' ? 'Компьютер атакует...' : 'Ваш ход! Выберите карту для атаки.',
        roundEnded: false,
      };
    }

    case 'COMPUTER_PASS': {
      const newAttacker: Attacker = state.attacker === 'player' ? 'computer' : 'player';
      const newState = {
        ...state,
        table: [],
        attacker: newAttacker,
        selectedCard: null,
        showTakeButton: false,
        showPassButton: false,
      };
      const withCards = drawFromDeck(newState);
      const endCheck = checkGameEnd(withCards);
      if (endCheck) return endCheck;

      return {
        ...withCards,
        message: newAttacker === 'computer' ? 'Компьютер атакует...' : 'Ваш ход! Выберите карту для атаки.',
      };
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

    default:
      return state;
  }
}

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
};

const HIGH_SCORE_KEY = 'durak_high_score';
const GAMES_PLAYED_KEY = 'durak_games_played';
const GAMES_WON_KEY = 'durak_games_won';

interface GameProps {
  difficulty: Difficulty;
  onBackToMenu: () => void;
}

export const Game: React.FC<GameProps> = ({ difficulty, onBackToMenu }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0'));
  const [gamesPlayed, setGamesPlayed] = useState(() => parseInt(localStorage.getItem(GAMES_PLAYED_KEY) || '0'));
  const [gamesWon, setGamesWon] = useState(() => parseInt(localStorage.getItem(GAMES_WON_KEY) || '0'));

  const computerTimeoutRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Initialize game
  const initGame = useCallback(() => {
    const newDeck = shuffleDeck(createDeck());
    const trump = newDeck[newDeck.length - 1];
    const pHand = newDeck.splice(0, 6);
    const cHand = newDeck.splice(0, 6);
    const firstAttacker = determineFirstAttacker(pHand, cHand, trump.suit);

    dispatch({
      type: 'INIT',
      deck: newDeck,
      playerHand: pHand,
      computerHand: cHand,
      trumpCard: trump,
      attacker: firstAttacker,
      message: firstAttacker === 'computer' ? 'Компьютер ходит первым...' : 'Ваш ход! Выберите карту для атаки.',
    });
    setScore(0);
  }, []);

  useEffect(() => {
    initGame();
    return () => {
      if (computerTimeoutRef.current) clearTimeout(computerTimeoutRef.current);
    };
  }, [initGame]);

  // Computer AI functions
  const computerAttack = useCallback(() => {
    const cs = stateRef.current;
    if (cs.status !== 'playing' || cs.computerThinking) return;
    if (cs.attacker !== 'computer' || cs.table.length !== 0) return;

    dispatch({ type: 'SET_THINKING', thinking: true });
    computerTimeoutRef.current = window.setTimeout(() => {
      const cs2 = stateRef.current;
      if (cs2.status !== 'playing') return;
      
      const card = computerChooseAttack(cs2.computerHand, cs2.table, cs2.trumpSuit, difficulty);
      if (card) {
        dispatch({ type: 'COMPUTER_ATTACK', card });
      } else {
        dispatch({ type: 'END_ROUND', playerTook: false });
      }
    }, 800 + Math.random() * 500);
  }, [difficulty]);

  const computerThrow = useCallback(() => {
    const cs = stateRef.current;
    if (cs.status !== 'playing' || cs.computerThinking) return;
    if (cs.attacker !== 'computer' || cs.table.length === 0) return;
    
    const allDefended = cs.table.every(p => p.defense !== null);
    if (!allDefended || cs.playerHand.length === 0 || cs.table.length >= 6) return;

    dispatch({ type: 'SET_THINKING', thinking: true });
    computerTimeoutRef.current = window.setTimeout(() => {
      const cs2 = stateRef.current;
      if (cs2.status !== 'playing' || cs2.attacker !== 'computer') return;
      
      const card = computerShouldThrow(cs2.computerHand, cs2.table, cs2.trumpSuit, difficulty, cs2.playerHand.length);
      if (card && cs2.table.length < 6) {
        dispatch({ type: 'COMPUTER_THROW', card });
      } else {
        dispatch({ type: 'END_ROUND', playerTook: false });
      }
    }, 600 + Math.random() * 400);
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
        // Wait for state update, then check if player can throw
        setTimeout(() => {
          const cs3 = stateRef.current;
          if (cs3.status !== 'playing') return;
          const canThrow = cs3.playerHand.some(c => canThrowCard(c, cs3.table));
          if (canThrow && cs3.table.length < 6) {
            dispatch({ type: 'SHOW_BUTTONS', take: false, pass: true });
            dispatch({ type: 'SET_MESSAGE', message: 'Подкиньте карту или нажмите "Бито".' });
          } else {
            dispatch({ type: 'END_ROUND', playerTook: false });
          }
        }, 400);
      } else {
        // Computer takes cards
        dispatch({ type: 'COMPUTER_TAKES' });
        setScore(prev => prev + 15);

        // After computer takes, player attacks again
        setTimeout(() => {
          const cs3 = stateRef.current;
          if (cs3.status !== 'playing') return;
          const endCheck = checkGameEnd(cs3);
          if (endCheck) {
            dispatch({ type: 'GAME_OVER', message: endCheck.gameOverMessage });
          } else {
            dispatch({ type: 'SET_MESSAGE', message: 'Ваш ход! Выберите карту для атаки.' });
          }
        }, 500);
      }
    }, 800 + Math.random() * 600);
  }, [difficulty]);

  // Trigger computer actions based on state
  useEffect(() => {
    if (state.status !== 'playing' || state.computerThinking) return;

    if (state.attacker === 'computer' && state.table.length === 0) {
      computerAttack();
    } else if (state.attacker === 'computer' && state.table.length > 0) {
      computerThrow();
    } else if (state.attacker === 'player' && state.table.length > 0) {
      computerDefend();
    }
  }, [state.attacker, state.table, state.status, state.computerThinking, computerAttack, computerThrow, computerDefend]);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (computerTimeoutRef.current) clearTimeout(computerTimeoutRef.current);
    };
  }, []);

  // Player card click
  const handleCardClick = (card: Card) => {
    if (state.status !== 'playing') return;
    if (state.computerThinking) return;

    if (state.attacker === 'player') {
      if (state.table.length === 0 || canThrowCard(card, state.table)) {
        if (state.selectedCard?.id === card.id) {
          // Double-click confirms
          dispatch({ type: 'PLAYER_ATTACK', card });
          dispatch({ type: 'SET_MESSAGE', message: 'Компьютер думает...' });
        } else {
          dispatch({ type: 'SELECT_CARD', card });
        }
      }
    } else if (state.attacker === 'computer') {
      const undefended = state.table.find(p => !p.defense);
      if (undefended && canBeat(undefended.attack, card, state.trumpSuit)) {
        if (state.selectedCard?.id === card.id) {
          // Double-click confirms
          dispatch({ type: 'PLAYER_DEFEND', card, attackId: undefended.attack.id });
          dispatch({ type: 'SET_MESSAGE', message: 'Компьютер думает...' });
        } else {
          dispatch({ type: 'SELECT_CARD', card });
        }
      }
    }
  };

  // Confirm play button
  const confirmPlay = () => {
    if (!state.selectedCard || state.status !== 'playing') return;

    if (state.attacker === 'player') {
      dispatch({ type: 'PLAYER_ATTACK', card: state.selectedCard });
      dispatch({ type: 'SET_MESSAGE', message: 'Компьютер думает...' });
    } else if (state.attacker === 'computer') {
      const undefended = state.table.find(p => !p.defense);
      if (undefended) {
        dispatch({ type: 'PLAYER_DEFEND', card: state.selectedCard, attackId: undefended.attack.id });
        dispatch({ type: 'SET_MESSAGE', message: 'Компьютер думает...' });
      }
    }
  };

  // Player takes cards
  const handleTake = () => {
    if (state.status !== 'playing') return;
    dispatch({ type: 'PLAYER_TAKES' });
    setScore(prev => Math.max(0, prev - 10));
    // After taking, computer (attacker) will attack again automatically via the effect
  };

  // Player passes (bito)
  const handlePass = () => {
    if (state.status !== 'playing') return;
    dispatch({ type: 'END_ROUND', playerTook: false });
    setScore(prev => prev + 5);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state.status === 'paused') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          dispatch({ type: 'SET_STATUS', status: 'playing' });
        }
        return;
      }

      if (state.status === 'gameOver') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          initGame();
        }
        return;
      }

      if (state.status !== 'playing') return;

      if (e.key === 'Escape') {
        dispatch({ type: 'SET_STATUS', status: 'paused' });
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (state.selectedCard) {
          confirmPlay();
        } else if (state.showPassButton) {
          handlePass();
        }
        return;
      }

      if (e.key === 't' || e.key === 'T') {
        if (state.showTakeButton) handleTake();
        return;
      }

      if (e.key === 'p' || e.key === 'P') {
        if (state.showPassButton) handlePass();
        return;
      }

      // Number keys to select cards
      const num = parseInt(e.key);
      if (num >= 1 && num <= state.playerHand.length) {
        handleCardClick(state.playerHand[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.status, state.selectedCard, state.playerHand, state.showTakeButton, state.showPassButton, state.table, state.attacker]);

  // Toggle pause
  const togglePause = () => {
    dispatch({ type: 'SET_STATUS', status: state.status === 'paused' ? 'playing' : 'paused' });
  };

  // Restart game
  const restartGame = () => {
    if (computerTimeoutRef.current) clearTimeout(computerTimeoutRef.current);
    initGame();
  };

  // Save score on game over
  useEffect(() => {
    if (state.status === 'gameOver') {
      const newGP = gamesPlayed + 1;
      setGamesPlayed(newGP);
      localStorage.setItem(GAMES_PLAYED_KEY, String(newGP));

      if (state.gameOverMessage.includes('победили')) {
        const newScore = score + 100;
        setScore(newScore);
        const newHS = Math.max(highScore, newScore);
        setHighScore(newHS);
        const newGW = gamesWon + 1;
        setGamesWon(newGW);
        localStorage.setItem(HIGH_SCORE_KEY, String(newHS));
        localStorage.setItem(GAMES_WON_KEY, String(newGW));
      }
    }
  }, [state.status]);

  // Get playable cards
  const getPlayableCards = (): Set<string> => {
    const playable = new Set<string>();
    if (state.computerThinking) return playable;

    if (state.attacker === 'player') {
      state.playerHand.forEach(c => {
        if (state.table.length === 0 || canThrowCard(c, state.table)) {
          playable.add(c.id);
        }
      });
    } else if (state.attacker === 'computer') {
      const undefended = state.table.find(p => !p.defense);
      if (undefended) {
        state.playerHand.forEach(c => {
          if (canBeat(undefended.attack, c, state.trumpSuit)) {
            playable.add(c.id);
          }
        });
      }
    }
    return playable;
  };

  const playableCards = getPlayableCards();

  return (
    <div className="min-h-screen h-screen bg-gradient-to-b from-green-800 via-green-700 to-green-900 flex flex-col relative overflow-hidden">
      {/* Felt texture */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px] pointer-events-none" />
      {/* Debug indicator */}
      <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-center text-xs py-0.5 z-50 font-bold">
        ✅ ВЕРСИЯ v4 — ИСПРАВЛЕНА
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-2 sm:p-3 bg-black/20 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToMenu}
            className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            ← Меню
          </button>
          <span className="text-white/60 text-xs hidden md:inline">
            {difficulty === 'easy' ? '😊 Легко' : difficulty === 'medium' ? '🤔 Средне' : '😈 Сложно'}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-white text-xs sm:text-sm">
            <span className="text-yellow-300 font-bold">{score}</span>
            <span className="text-white/50 hidden sm:inline"> очков</span>
          </div>
          <div className="text-white/50 text-xs hidden sm:inline">
            🏆 {highScore}
          </div>
          <button
            onClick={togglePause}
            className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors"
          >
            {state.status === 'paused' ? '▶' : '⏸'}
          </button>
          <button
            onClick={restartGame}
            className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Game Board */}
      <div className="relative z-10 flex-1 flex flex-col p-2 sm:p-3 gap-1 sm:gap-2 max-w-5xl mx-auto w-full min-h-0">
        {/* Computer Hand */}
        <div className="flex flex-col items-center shrink-0">
          <div className="text-white/60 text-xs mb-1">
            🤖 Компьютер ({state.computerHand.length})
          </div>
          <div className="flex justify-center">
            {state.computerHand.map((card, i) => (
              <div
                key={card.id}
                className="transition-all duration-300"
                style={{ marginLeft: i > 0 ? '-1.2rem' : '0' }}
              >
                <CardComponent card={card} faceDown className="w-10 sm:w-14 md:w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* Deck & Trump */}
        <div className="flex items-center justify-center gap-3 shrink-0">
          {state.deck.length > 0 && (
            <div className="relative">
              <CardComponent card={state.deck[0]} faceDown className="w-12 sm:w-16" />
              <div className="absolute -top-1 -right-1 bg-white text-green-800 rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] font-bold shadow">
                {state.deck.length}
              </div>
              {state.trumpCard && (
                <div className="absolute top-0 left-0 rotate-90 origin-center" style={{ transform: 'rotate(90deg) translate(30%, 0)' }}>
                  <CardComponent card={state.trumpCard} className="w-10 sm:w-14 opacity-70" />
                </div>
              )}
            </div>
          )}
          {state.trumpSuit && (
            <div className="text-yellow-300 text-sm sm:text-base font-bold">
              Козырь: {SUIT_SYMBOLS[state.trumpSuit]}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 min-h-[100px] sm:min-h-[130px] bg-green-600/20 rounded-xl border-2 border-green-500/20 flex items-center justify-center flex-wrap gap-1 sm:gap-3 p-2 sm:p-3">
          {state.table.length === 0 ? (
            <div className="text-green-300/40 text-xs sm:text-base">
              {state.attacker === 'player' ? 'Выберите карту для атаки' : 'Ожидание...'}
            </div>
          ) : (
            state.table.map((pair, i) => (
              <div key={i} className="relative animate-card-appear">
                <CardComponent card={pair.attack} className="w-12 sm:w-16 md:w-20" />
                {pair.defense && (
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3 animate-card-appear">
                    <CardComponent card={pair.defense} className="w-12 sm:w-16 md:w-20" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-2 shrink-0 min-h-[40px]">
          {state.selectedCard && (
            <button
              onClick={confirmPlay}
              className="px-3 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg font-bold text-sm transition-all animate-bounce-subtle shadow-lg"
            >
              ✓ Подтвердить
            </button>
          )}
          {state.showTakeButton && (
            <button
              onClick={handleTake}
              className="px-3 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-bold text-sm transition-colors shadow-lg"
            >
              📥 Взять (T)
            </button>
          )}
          {state.showPassButton && (
            <button
              onClick={handlePass}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-bold text-sm transition-colors shadow-lg"
            >
              ✓ Бито (P)
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

        {/* Message */}
        <div className="text-center shrink-0">
          <div className="inline-block px-3 py-1 bg-black/30 backdrop-blur-sm rounded-full">
            <span className="text-white text-xs sm:text-sm">
              {state.computerThinking ? '🤔 Компьютер думает...' : state.message}
            </span>
          </div>
        </div>

        {/* Player Hand */}
        <div className="flex flex-col items-center shrink-0">
          <div className="text-white/60 text-xs mb-1">
            🃏 Вы ({state.playerHand.length})
            {state.attacker === 'player' ? ' — Атакуете' : ' — Защищаетесь'}
          </div>
          <div className="flex justify-center flex-wrap">
            {state.playerHand.map((card, i) => (
              <div
                key={card.id}
                className="transition-all duration-200"
                style={{
                  marginLeft: i > 0 ? (state.playerHand.length > 8 ? '-0.6rem' : '-0.4rem') : '0',
                }}
              >
                <CardComponent
                  card={card}
                  isSelected={state.selectedCard?.id === card.id}
                  isPlayable={playableCards.has(card.id)}
                  onClick={() => handleCardClick(card)}
                />
              </div>
            ))}
          </div>
          <div className="text-white/30 text-[10px] mt-1 hidden sm:block">
            1-{state.playerHand.length} — выбор | Enter — подтвердить | T — взять | P — бито | Esc — пауза
          </div>
        </div>
      </div>

      {/* Pause Overlay */}
      {state.status === 'paused' && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="bg-gray-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl border border-gray-600 animate-scale-in">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">⏸ Пауза</h2>
            <div className="space-y-3">
              <button
                onClick={() => dispatch({ type: 'SET_STATUS', status: 'playing' })}
                className="block w-full px-6 py-3 bg-green-500 hover:bg-green-400 text-white rounded-lg font-bold transition-colors"
              >
                ▶ Продолжить
              </button>
              <button
                onClick={restartGame}
                className="block w-full px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-bold transition-colors"
              >
                🔄 Начать заново
              </button>
              <button
                onClick={onBackToMenu}
                className="block w-full px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold transition-colors"
              >
                ← В меню
              </button>
            </div>
            <p className="mt-4 text-gray-400 text-xs">Esc или P — продолжить</p>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {state.status === 'gameOver' && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="bg-gray-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl border border-gray-600 max-w-sm mx-4 animate-scale-in">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Игра окончена</h2>
            <p className="text-base sm:text-lg text-yellow-300 mb-4">{state.gameOverMessage}</p>
            <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
              <div className="bg-gray-700 rounded-lg p-2 sm:p-3">
                <div className="text-gray-400 text-xs">Счёт</div>
                <div className="text-xl sm:text-2xl font-bold text-white">{score}</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-2 sm:p-3">
                <div className="text-gray-400 text-xs">Рекорд</div>
                <div className="text-xl sm:text-2xl font-bold text-yellow-400">{highScore}</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-2 sm:p-3">
                <div className="text-gray-400 text-xs">Побед</div>
                <div className="text-lg font-bold text-green-400">{gamesWon}</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-2 sm:p-3">
                <div className="text-gray-400 text-xs">Игр</div>
                <div className="text-lg font-bold text-blue-400">{gamesPlayed}</div>
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
