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
  sortHand,
  findLowestTrump,
} from '../gameLogic';
import { RANK_VALUES, type DeckSize } from '../types';
import { type Theme, themes, getNextTheme } from '../themes';

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
  playerJustTook: boolean; // Игрок только что взял карты, компьютер может подкидывать
  lastTableRanks: Set<string>; // Ранги карт, которые были на столе (для подкидывания после взятия)
  lastAttackCards: Card[];
  lastAttackWasSixes: boolean;
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
  | { type: 'COMPUTER_ATTACK'; card: Card }
  | { type: 'COMPUTER_DEFEND'; card: Card; attackId: string }
  | { type: 'COMPUTER_THROW'; card: Card }
  | { type: 'COMPUTER_THROW_AFTER_TAKE'; card: Card }
  | { type: 'COMPUTER_TAKES' }
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
  | { type: 'COMPUTER_PASS' }
  | { type: 'SET_ANIMATING'; animation: 'player-takes' | 'computer-takes' | null }
  | { type: 'SET_KNOWN_TRUMPS'; computerTrump: Card | null; playerTrump: Card | null }
  | { type: 'SET_CARDS_SHOWN_TO_COMPUTER'; cards: Set<string> };

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
  // Проверяем ничью даже если колода пуста
  if (state.playerHand.length === 0 && state.computerHand.length === 0) {
    return { ...state, status: 'gameOver', gameOverMessage: 'Ничья! Оба игрока избавились от карт.' };
  }
  
  if (state.deck.length > 0) return null;
  
  // Check for pogony (погоны) conditions
  const checkPogony = (loserHand: Card[], attacker: Attacker, defender: Attacker): boolean => {
    // Pogony conditions:
    // 1. Attacker's last attack was with non-trump sixes
    // 2. Defender couldn't beat them
    // 3. Defender has cards left
    
    if (loserHand.length === 0) return false;
    
    // Check if last attack was all non-trump sixes
    const lastAttack = state.lastAttackCards;
    if (lastAttack.length === 0) return false;
    
    const allNonTrumpSixes = lastAttack.every(card => 
      card.rank === '6' && card.suit !== state.trumpSuit
    );
    
    if (!allNonTrumpSixes) return false;
    
    // Check if defender had cards and couldn't beat
    // If defender had cards and could beat, pogony doesn't count
    // We check if any defense was successful
    const allDefended = state.table.every(pair => pair.defense !== null);
    if (allDefended) return false; // Defender beat the cards, no pogony
    
    return true;
  };
  
  if (state.playerHand.length === 0) {
    // Player won, check if computer got pogony
    const hasPogony = checkPogony(state.computerHand, 'player', 'computer');
    const message = hasPogony
      ? '🎉 Вы победили! Компьютер — дурак с погонами!' 
      : '🎉 Вы победили! Компьютер — дурак!';
    return { ...state, status: 'gameOver', gameOverMessage: message };
  }
  if (state.computerHand.length === 0) {
    // Computer won, check if player got pogony
    const hasPogony = checkPogony(state.playerHand, 'computer', 'player');
    const message = hasPogony
      ? '😞 Вы проиграли! Вы — дурак с погонами!' 
      : '😞 Вы проиграли! Вы — дурак!';
    return { ...state, status: 'gameOver', gameOverMessage: message };
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
        lastTableRanks: new Set(),
        lastAttackCards: [],
        lastAttackWasSixes: false,
        computerKnownTrump: null,
        playerKnownTrump: null,
        cardsShownToComputer: new Set(),
      };

    case 'SELECT_CARD':
      return { ...state, selectedCard: action.card };

    case 'PLAYER_ATTACK': {
      const newHand = state.playerHand.filter(c => c.id !== action.card.id);
      const newTable = [...state.table, { attack: action.card, defense: null }];
      // Track last attack cards for pogony check
      const newLastAttackCards = [...state.lastAttackCards, action.card];
      // Computer sees this card
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
        cardsShownToComputer: newCardsShown,
      };
    }

    case 'PLAYER_DEFEND': {
      const newHand = state.playerHand.filter(c => c.id !== action.card.id);
      const newTable = state.table.map(p =>
        p.attack.id === action.attackId ? { ...p, defense: action.card } : p
      );
      // Computer sees this card
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
        cardsShownToComputer: newCardsShown,
      };
    }

    case 'COMPUTER_ATTACK': {
      const newHand = state.computerHand.filter(c => c.id !== action.card.id);
      const newTable = [...state.table, { attack: action.card, defense: null }];
      // Track last attack cards for pogony check
      const newLastAttackCards = [...state.lastAttackCards, action.card];
      return {
        ...state,
        computerHand: newHand,
        table: newTable,
        showTakeButton: true,
        message: 'Компьютер атаковал. Защищайтесь!',
        computerThinking: false,
        lastAttackCards: newLastAttackCards,
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
      // Track last attack cards for pogony check
      const newLastAttackCards = [...state.lastAttackCards, action.card];
      return {
        ...state,
        computerHand: newHand,
        table: newTable,
        showTakeButton: state.playerJustTook ? false : true, // Если игрок взял карты, не показываем кнопку "Взять"
        message: state.playerJustTook ? 'Компьютер подкидывает...' : 'Компьютер подкидывает. Защищайтесь!',
        computerThinking: state.playerJustTook ? true : false, // Если игрок взял карты, держим computerThinking=true чтобы предотвратить немедленный повторный вызов
        lastAttackCards: newLastAttackCards,
      };
    }

    case 'COMPUTER_THROW_AFTER_TAKE': {
      // Компьютер подкидывает карту после того, как игрок взял карты
      // Карта идет прямо в руку игрока
      const newCompHand = state.computerHand.filter(c => c.id !== action.card.id);
      const newPlayerHand = [...state.playerHand, action.card];
      
      // Обновляем lastTableRanks чтобы можно было подкинуть еще
      const newRanks = new Set(state.lastTableRanks);
      newRanks.add(action.card.rank);
      
      return {
        ...state,
        computerHand: newCompHand,
        playerHand: newPlayerHand,
        message: 'Компьютер подкидывает...',
        computerThinking: false,
        lastTableRanks: newRanks,
      };
    }

    case 'COMPUTER_TAKES': {
      const tableCards = state.table.flatMap(p => [p.attack, ...(p.defense ? [p.defense] : [])]);
      const newHand = [...state.computerHand, ...tableCards];
      // Очищаем стол и добираем карты
      const newState = {
        ...state,
        computerHand: newHand,
        table: [],
        showTakeButton: false,
        showPassButton: false,
        message: 'Ожидание...',
        computerThinking: false,
        playerJustTook: false,
        lastTableRanks: new Set<string>(),
      };
      return drawFromDeck(newState);
    }

    case 'PLAYER_TAKES': {
      // НЕ очищаем стол сразу - бот должен подкинуть карты на стол
      // Сохраняем ранги карт со стола для возможности подкидывания
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
        playerJustTook: true, // Помечаем, что игрок взял карты
        lastTableRanks: ranks, // Сохраняем ранги для подкидывания
      };
    }

    case 'PLAYER_COLLECT_ALL': {
      // Забираем все карты со стола в руку игрока
      const tableCards = state.table.flatMap(p => [p.attack, ...(p.defense ? [p.defense] : [])]);
      const newHand = [...state.playerHand, ...tableCards];
      
      // Бот видит карты, которые игрок забирает
      const newCardsShown = new Set(state.cardsShownToComputer);
      tableCards.forEach(card => {
        newCardsShown.add(card.id);
      });
      
      return {
        ...state,
        playerHand: newHand,
        table: [], // Очищаем стол
        playerJustTook: false,
        lastTableRanks: new Set<string>(),
        cardsShownToComputer: newCardsShown,
      };
    }

    case 'END_ROUND': {
      // Логика передачи хода:
      // - Если защитник взял карты → атакующий остаётся тем же
      // - Если никто не взял карты (бито) → атакующий меняется
      let newAttacker: Attacker;
      
      if (action.playerTook) {
        // Игрок взял карты - если он защищался, то компьютер атаковал, и ход остаётся у компьютера
        newAttacker = 'computer';
      } else if (action.computerTook) {
        // Компьютер взял карты - если он защищался, то игрок атаковал, и ход остаётся у игрока
        newAttacker = 'player';
      } else {
        // Никто не взял карты (бито) - ход переходит к другому игроку
        newAttacker = state.attacker === 'player' ? 'computer' : 'player';
      }

      const newState = {
        ...state,
        table: [], // Очищаем стол
        attacker: newAttacker,
        selectedCard: null,
        showTakeButton: false,
        showPassButton: false,
        roundEnded: true,
        computerThinking: false,
        playerJustTook: false, // Сбрасываем флаг
        lastTableRanks: new Set<string>(), // Сбрасываем ранги
        lastAttackCards: [],
        lastAttackWasSixes: false,
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
        lastTableRanks: new Set<string>(),
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
        playerJustTook: false,
        lastTableRanks: new Set<string>(),
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

    case 'DRAW_CARDS':
      return drawFromDeck(state);

    case 'CLEAR_TABLE_AND_DRAW': {
      // Очищаем стол и добираем карты
      const clearedState = { 
        ...state, 
        table: [], 
        computerThinking: false,
        playerJustTook: false,
        lastTableRanks: new Set<string>()
      };
      return drawFromDeck(clearedState);
    }

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
  playerJustTook: false,
  lastTableRanks: new Set(),
  lastAttackCards: [],
  lastAttackWasSixes: false,
  animatingCards: null,
  computerKnownTrump: null,
  playerKnownTrump: null,
  cardsShownToComputer: new Set(),
};

const HIGH_SCORE_KEY = 'durak_high_score';
const GAMES_PLAYED_KEY = 'durak_games_played';
const GAMES_WON_KEY = 'durak_games_won';

interface GameProps {
  difficulty: Difficulty;
  deckSize: DeckSize;
  onBackToMenu: () => void;
}

export const Game: React.FC<GameProps> = ({ difficulty, deckSize, onBackToMenu }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0'));
  const [gamesPlayed, setGamesPlayed] = useState(() => parseInt(localStorage.getItem(GAMES_PLAYED_KEY) || '0'));
  const [gamesWon, setGamesWon] = useState(() => parseInt(localStorage.getItem(GAMES_WON_KEY) || '0'));
  const [sortMode, setSortMode] = useState<SortMode>('suit');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('durak_sound') !== 'false');
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => 
    (localStorage.getItem('durak_theme') as Theme) || 'green'
  );
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showFirstTurnMessage, setShowFirstTurnMessage] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [firstTurnMessageText, setFirstTurnMessageText] = useState('');
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [isTaking, setIsTaking] = useState(false);
  
  const theme = themes[currentTheme];
  
  // Audio context for sounds
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Initialize audio context once
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

  // Track screen width for responsive card sizing
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Change theme
  const changeTheme = () => {
    const nextTheme = getNextTheme(currentTheme);
    setCurrentTheme(nextTheme);
    localStorage.setItem('durak_theme', nextTheme);
  };

  const computerTimeoutRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Initialize game
  const initGame = useCallback(() => {
    setIsTaking(false);
    const newDeck = shuffleDeck(createDeck(deckSize));
    const trump = newDeck[newDeck.length - 1];
    const pHand = newDeck.splice(0, 6);
    const cHand = newDeck.splice(0, 6);
    const firstAttacker = determineFirstAttacker(pHand, cHand, trump.suit);

    // Находим наименьшие козыри
    const playerLowestTrump = findLowestTrump(pHand, trump.suit);
    const computerLowestTrump = findLowestTrump(cHand, trump.suit);

    let message = '';
    let firstTurnText = '';
    let computerKnownTrump: Card | null = null;
    let playerKnownTrump: Card | null = null;

    if (firstAttacker === 'computer') {
      // Компьютер ходит первым - показываем его наименьший козырь
      message = 'Компьютер атакует...';
      firstTurnText = `🤖 Компьютер ходит первым\nМеньший козырь: ${computerLowestTrump?.rank || 'нет'} ${computerLowestTrump ? SUIT_SYMBOLS[computerLowestTrump.suit] : ''}`;
      computerKnownTrump = computerLowestTrump;
    } else {
      // Игрок ходит первым - запоминаем его наименьший козырь
      message = 'Ваш ход! Выберите карту для атаки.';
      firstTurnText = `🎯 Вы ходите первым\nМеньший козырь: ${playerLowestTrump?.rank || 'нет'} ${playerLowestTrump ? SUIT_SYMBOLS[playerLowestTrump.suit] : ''}`;
      playerKnownTrump = playerLowestTrump;
      
      // Во всех сложностях бот запоминает козырь игрока, если игрок ходит первым
      if (playerLowestTrump) {
        const initialKnownCards = new Set<string>();
        initialKnownCards.add(playerLowestTrump.id);
        setTimeout(() => {
          dispatch({ 
            type: 'SET_CARDS_SHOWN_TO_COMPUTER', 
            cards: initialKnownCards 
          });
        }, 0);
      }
    }

    dispatch({
      type: 'INIT',
      deck: newDeck,
      playerHand: pHand,
      computerHand: cHand,
      trumpCard: trump,
      attacker: firstAttacker,
      message,
    });

    // Устанавливаем известные козыри через отдельное действие
    if (computerKnownTrump || playerKnownTrump) {
      setTimeout(() => {
        dispatch({ type: 'SET_KNOWN_TRUMPS', computerTrump: computerKnownTrump, playerTrump: playerKnownTrump });
      }, 0);
    }

    // Показываем модальное окно с информацией о первом ходе
    setFirstTurnMessageText(firstTurnText);
    setShowFirstTurnMessage(true);
    setIsFadingOut(false);
    
    // Начинаем плавное исчезновение через 3.5 секунды
    setTimeout(() => {
      setIsFadingOut(true);
    }, 3500);
    
    // Полностью скрываем через 4.5 секунды (после анимации)
    setTimeout(() => {
      setShowFirstTurnMessage(false);
      setIsFadingOut(false);
    }, 4500);

    setScore(0);
  }, [deckSize]);

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
        dispatch({ type: 'END_ROUND', playerTook: false, computerTook: false });
      }
    }, 800 + Math.random() * 500);
  }, [difficulty]);

  const computerThrow = useCallback(() => {
    const cs = stateRef.current;
    if (cs.status !== 'playing' || cs.computerThinking) return;
    if (cs.attacker !== 'computer') return;
    
    // Если игрок только что взял карты, компьютер подкидывает карты ПО ОДНОЙ
    if (cs.playerJustTook) {
      // Проверяем, можно ли подкинуть (максимум 6 карт на столе)
      const throwableCards = cs.computerHand.filter(c => cs.lastTableRanks.has(c.rank));
      
      if (throwableCards.length === 0 || cs.table.length >= 6) {
        // Нечего подкидывать или стол полон - забираем все карты со стола
        dispatch({ type: 'PLAYER_COLLECT_ALL' });
        dispatch({ type: 'END_ROUND', playerTook: true, computerTook: false });
        return;
      }

      dispatch({ type: 'SET_THINKING', thinking: true });
      computerTimeoutRef.current = window.setTimeout(() => {
        const cs2 = stateRef.current;
        if (cs2.status !== 'playing' || cs2.attacker !== 'computer') return;
        
        // Выбираем ОДНУ карту для подкидывания (не козырь, самая младшая)
        const throwable = cs2.computerHand
          .filter(c => cs2.lastTableRanks.has(c.rank))
          .sort((a, b) => {
            const aIsTrump = a.suit === cs2.trumpSuit ? 1 : 0;
            const bIsTrump = b.suit === cs2.trumpSuit ? 1 : 0;
            if (aIsTrump !== bIsTrump) return aIsTrump - bIsTrump;
            return RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
          });
        
        // Обдумываем полезность подкидывания в зависимости от сложности
        let shouldThrow = true;
        
        if (difficulty === 'easy') {
          // Легкая: 50% шанс НЕ подкидывать
          shouldThrow = Math.random() > 0.5;
        } else if (difficulty === 'casual') {
          // Казуальная: 40% шанс НЕ подкидывать
          shouldThrow = Math.random() > 0.4;
        } else if (difficulty === 'medium') {
          // Средняя: 25% шанс НЕ подкидывать
          shouldThrow = Math.random() > 0.25;
        }
        // Сложная: всегда подкидывает
        
        if (throwable.length > 0 && cs2.table.length < 6 && shouldThrow) {
          // Подкидываем ОДНУ карту на стол
          const card = throwable[0];
          dispatch({ type: 'COMPUTER_THROW', card });
          // После COMPUTER_THROW computerThinking=true (если playerJustTook)
          // Ждем 1.5 секунды чтобы игрок увидел карту, затем сбрасываем computerThinking
          setTimeout(() => {
            dispatch({ type: 'SET_THINKING', thinking: false });
            // useEffect снова сработает и вызовет computerThrow
            // Если можно еще подкинуть - подкинем, если нет - заберем карты
          }, 1500);
        } else {
          // Нечего подкидывать или решили не подкидывать, забираем все карты со стола
          dispatch({ type: 'PLAYER_COLLECT_ALL' });
          dispatch({ type: 'END_ROUND', playerTook: true, computerTook: false });
        }
      }, 1200 + Math.random() * 400); // Пауза 1.2-1.6 секунды между подкидываниями
      return;
    }
    
    // Обычная логика подкидывания
    if (cs.table.length === 0) return;
    
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
        dispatch({ type: 'END_ROUND', playerTook: false, computerTook: false });
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
        // Wait for state update, then show "Бито" button
        setTimeout(() => {
          const cs3 = stateRef.current;
          if (cs3.status !== 'playing') return;
          dispatch({ type: 'SHOW_BUTTONS', take: false, pass: true });
          dispatch({ type: 'SET_MESSAGE', message: 'Подкиньте карту или нажмите "Бито".' });
        }, 400);
      } else {
        // Computer takes cards - show message first
        dispatch({ type: 'SET_MESSAGE', message: 'Компьютер берёт карты' });
        setScore(prev => prev + 15);

        // Start animation
        dispatch({ type: 'SET_ANIMATING', animation: 'computer-takes' });

        // Wait before adding cards to hand
        setTimeout(() => {
          dispatch({ type: 'COMPUTER_TAKES' });
          dispatch({ type: 'SET_ANIMATING', animation: null });
          
          // After computer takes, end round and transfer turn to player
          setTimeout(() => {
            dispatch({ type: 'END_ROUND', playerTook: false, computerTook: true });
          }, 800);
        }, 1000);
      }
    }, 800 + Math.random() * 600);
  }, [difficulty]);

  // Trigger computer actions based on state
  useEffect(() => {
    if (state.status !== 'playing' || state.computerThinking) return;

    if (state.attacker === 'computer' && state.table.length === 0 && !state.playerJustTook) {
      computerAttack();
    } else if (state.attacker === 'computer' && (state.table.length > 0 || state.playerJustTook)) {
      computerThrow();
    } else if (state.attacker === 'player' && state.table.length > 0) {
      computerDefend();
    }
  }, [state.attacker, state.table, state.status, state.computerThinking, state.playerJustTook, computerAttack, computerThrow, computerDefend]);

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
          dispatch({ type: 'SET_MESSAGE', message: 'Ожидание...' });
          playSound('card');
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
          dispatch({ type: 'SET_MESSAGE', message: 'Ожидание...' });
          playSound('card');
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
      dispatch({ type: 'SET_MESSAGE', message: 'Ожидание...' });
    } else if (state.attacker === 'computer') {
      const undefended = state.table.find(p => !p.defense);
      if (undefended) {
        dispatch({ type: 'PLAYER_DEFEND', card: state.selectedCard, attackId: undefended.attack.id });
        dispatch({ type: 'SET_MESSAGE', message: 'Ожидание...' });
      }
    }
  };

  // Player takes cards
  const handleTake = () => {
    if (state.status !== 'playing') return;
    if (isTaking) return; // Защита от множественных нажатий
    
    setIsTaking(true);
    
    // Start animation
    dispatch({ type: 'SET_ANIMATING', animation: 'player-takes' });
    
    setTimeout(() => {
      dispatch({ type: 'PLAYER_TAKES' });
      dispatch({ type: 'SET_ANIMATING', animation: null });
      setScore(prev => Math.max(0, prev - 10));
      playSound('take');
      
      // НЕ вызываем END_ROUND сразу - даём компьютеру возможность подкинуть карты
      // computerThrow автоматически обработает playerJustTook и подкинет карты или закончит раунд
      
      // Сбрасываем флаг после завершения анимации и подкидывания
      setTimeout(() => {
        setIsTaking(false);
      }, 2000);
    }, 800);
  };

  // Player passes (bito)
  const handlePass = () => {
    if (state.status !== 'playing') return;
    dispatch({ type: 'END_ROUND', playerTook: false, computerTook: false });
    setScore(prev => prev + 5);
  };



  // Restart game
  const restartGame = () => {
    if (computerTimeoutRef.current) clearTimeout(computerTimeoutRef.current);
    setIsTaking(false);
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
        playSound('win');
      } else if (state.gameOverMessage.includes('проиграли')) {
        playSound('lose');
      }
    }
  }, [state.status]);

  // Sort cards by mode
  const sortCards = (hand: Card[]): Card[] => {
    if (sortMode === 'suit') {
      return sortHand(hand, state.trumpSuit);
    } else if (sortMode === 'rank') {
      return [...hand].sort((a, b) => {
        const rankOrder = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
      });
    } else {
      // rank-trump: козыри первыми, потом по рангу
      return [...hand].sort((a, b) => {
        const aIsTrump = a.suit === state.trumpSuit ? 0 : 1;
        const bIsTrump = b.suit === state.trumpSuit ? 0 : 1;
        if (aIsTrump !== bIsTrump) return aIsTrump - bIsTrump;
        const rankOrder = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
      });
    }
  };

  // Play sound
  const playSound = async (type: 'card' | 'win' | 'lose' | 'take') => {
    if (!soundEnabled || !audioContextRef.current) return;
    
    try {
      // Resume audio context if suspended (required by browsers after user interaction)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (type === 'card') {
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
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
      } else if (type === 'take') {
        oscillator.frequency.value = 300;
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      }
    } catch (e) {
      console.error('Sound error:', e);
    }
  };

  // Get playable cards
  const getPlayableCards = (): Set<string> => {
    const playable = new Set<string>();
    // Подсветка только в казуальном режиме
    if (difficulty !== 'casual') return playable;
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

  // Получаем карты, которые знает противник в зависимости от сложности
  const getComputerKnownCards = (): Set<string> => {
    const known = new Set<string>();
    
    if (difficulty === 'casual' || difficulty === 'easy') {
      // Легкая и Обычная: противник знает козырь игрока в начале (если игрок ходит первым)
      // и козырные карты в конце игры
      state.playerHand.forEach(card => {
        if (card.suit === state.trumpSuit && state.cardsShownToComputer.has(card.id)) {
          known.add(card.id);
        }
      });
      // В конце игры знает все козыри
      if (state.deck.length === 0) {
        state.playerHand.forEach(card => {
          if (card.suit === state.trumpSuit) {
            known.add(card.id);
          }
        });
      }
    } else if (difficulty === 'medium') {
      // Средняя: противник знает козыри, которые игрок забирает
      state.playerHand.forEach(card => {
        if (card.suit === state.trumpSuit && state.cardsShownToComputer.has(card.id)) {
          known.add(card.id);
        }
      });
      // В конце игры знает только козыри игрока
      if (state.deck.length === 0) {
        state.playerHand.forEach(card => {
          if (card.suit === state.trumpSuit) {
            known.add(card.id);
          }
        });
      }
    } else if (difficulty === 'hard') {
      // Сложная: противник знает ВСЕ карты, которые игрок забирает
      state.playerHand.forEach(card => {
        if (state.cardsShownToComputer.has(card.id)) {
          known.add(card.id);
        }
      });
      // В конце игры знает ВСЕ карты игрока
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

  return (
    <div className={`min-h-screen h-screen bg-gradient-to-b ${theme.background} flex flex-col relative overflow-y-auto pb-4`}>
      {/* Felt texture with pattern */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 1px, transparent 1px),
          repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.08) 15px, rgba(255,255,255,0.08) 16px),
          repeating-linear-gradient(-45deg, transparent, transparent 15px, rgba(255,255,255,0.08) 15px, rgba(255,255,255,0.08) 16px)
        `,
        backgroundSize: '20px 20px, 30px 30px, 30px 30px'
      }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-3 bg-black/30 shrink-0" style={{ transform: 'translateZ(0)' }}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            ← Меню
          </button>
          <span className="text-white/60 text-sm">
            {difficulty === 'casual' ? '🎯 Легкая' : difficulty === 'easy' ? '😊 Обычная' : difficulty === 'medium' ? '🤔 Средняя' : '😈 Сложная'}
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
            onClick={() => {
              const modes: SortMode[] = ['suit', 'rank', 'rank-trump'];
              const currentIndex = modes.indexOf(sortMode);
              setSortMode(modes[(currentIndex + 1) % modes.length]);
            }}
            className="px-3 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
            title={sortMode === 'suit' ? 'По масти' : sortMode === 'rank' ? 'По рангу' : 'По рангу + козыри'}
          >
            {sortMode === 'suit' ? '🎨' : sortMode === 'rank' ? '🔢' : '🃏'}
          </button>
          <button
            onClick={() => {
              const newValue = !soundEnabled;
              setSoundEnabled(newValue);
              localStorage.setItem('durak_sound', String(newValue));
            }}
            className="px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <button
            onClick={changeTheme}
            className="px-3 py-2 text-sm bg-pink-600 hover:bg-pink-500 text-white rounded-lg transition-colors"
            title={`Тема: ${theme.name}`}
          >
            {theme.emoji}
          </button>
        </div>
      </div>

      {/* Game Board */}
      <div className="relative z-10 flex-1 flex flex-col p-3 gap-2 w-full min-h-0">
        {/* Computer Hand */}
        <div className="flex flex-col items-center shrink-0">
          <div className="text-white/60 text-xs mb-1">
            🤖 Компьютер ({state.computerHand.length})
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
                  <CardComponent card={card} faceDown className="w-14" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Deck & Trump */}
        <div className="flex items-center justify-center gap-4 shrink-0">
          {state.deck.length > 0 && (
            <div className="relative flex items-center">
              {state.trumpCard && (
                <div 
                  className="absolute right-full mr-3"
                  style={{ zIndex: 0, transform: 'rotate(90deg)' }}
                >
                  <CardComponent card={state.trumpCard} className="w-14 opacity-80" />
                </div>
              )}
              <div className="relative" style={{ zIndex: 1 }}>
                <CardComponent card={state.deck[0]} faceDown className="w-16" />
                <div className="absolute -top-1 -right-1 bg-white text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow">
                  {state.deck.length}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className={`flex-1 min-h-[130px] ${theme.tableBg} rounded-xl border-2 ${theme.tableBorder} flex items-center justify-center p-3 relative overflow-hidden`}>
          {/* Table pattern */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.15) 20px, rgba(255,255,255,0.15) 21px),
              repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(255,255,255,0.15) 20px, rgba(255,255,255,0.15) 21px),
              radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 2px, transparent 2px)
            `,
            backgroundSize: '40px 40px, 40px 40px, 30px 30px'
          }} />
          <div 
            className="flex flex-wrap gap-3 items-center justify-center relative z-10"
            style={{
              transform: state.table.length > 4 
                ? `scale(${Math.max(0.6, 1 - (state.table.length - 4) * 0.08)})`
                : undefined,
              transformOrigin: 'center',
              transition: 'transform 0.3s ease'
            }}
          >
            {state.table.length === 0 ? (
              <div className={`${theme.textColor} text-base font-medium`}>
                {state.attacker === 'player' ? 'Выберите карту для атаки' : 'Ожидание...'}
              </div>
            ) : (
              state.table.map((pair, i) => {
                // Анимация взятия карт
                let animationClass = '';
                if (state.animatingCards === 'player-takes') {
                  animationClass = 'animate-card-fly-to-player';
                } else if (state.animatingCards === 'computer-takes') {
                  animationClass = 'animate-card-fly-to-computer';
                }
                
                return (
                  <div 
                    key={i} 
                    className="relative animate-card-appear"
                    style={{ width: '4.5rem', height: '6.5rem' }}
                  >
                    <div className={animationClass}>
                      <CardComponent card={pair.attack} className="w-16" />
                    </div>
                    {pair.defense && (
                      <div className="absolute top-8 left-8 animate-card-appear">
                        <div className={animationClass}>
                          <CardComponent card={pair.defense} className="w-16" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
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
              disabled={isTaking}
              className={`px-3 py-2 text-white rounded-lg font-bold text-sm transition-colors shadow-lg ${
                isTaking 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-orange-500 hover:bg-orange-400'
              }`}
            >
              📥 Взять
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
          {/* Показываем кнопку "Бито" когда игрок атакует и есть карты на столе */}
          {state.attacker === 'player' && state.table.length > 0 && !state.showPassButton && !state.selectedCard && !state.computerThinking && (
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

        {/* Message */}
        <div className="text-center shrink-0">
          <div className="inline-block px-3 py-1 bg-black/30 backdrop-blur-sm rounded-full">
            <span className="text-white text-sm">
              {state.message}
            </span>
          </div>
        </div>

        {/* Player Hand */}
        <div className="flex flex-col items-center shrink-0 mt-2 w-full">
          <div className="flex justify-center w-full px-4">
            {sortCards(state.playerHand).map((card, i) => {
              const cardCount = state.playerHand.length;
              const cardWidth = 80; // w-20 = 5rem = 80px
              const availableWidth = screenWidth - 64; // minus padding (px-4 = 32px * 2)
              const totalCardsWidth = cardCount * cardWidth;
              
              // Calculate if we need overlap
              let marginLeft = '0';
              
              if (i > 0) {
                // If cards fit without overlap, no margin
                if (totalCardsWidth <= availableWidth) {
                  marginLeft = '0';
                } else {
                  // Calculate overlap needed in pixels
                  const overlapNeeded = totalCardsWidth - availableWidth;
                  const overlapPerCard = overlapNeeded / (cardCount - 1);
                  
                  // Limit maximum overlap to 36px (45% of 80px card width)
                  const maxOverlapPx = 36;
                  const finalOverlapPx = Math.min(overlapPerCard, maxOverlapPx);
                  marginLeft = `-${finalOverlapPx}px`;
                }
              }
              
              const cardSize = 'w-20'; // Always use full size
              
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

      {/* First Turn Message - small notification in top-right */}
      {showFirstTurnMessage && (
        <div className={`absolute top-20 right-4 z-50 pointer-events-none transition-opacity duration-1000 ${
          isFadingOut ? 'opacity-0' : 'opacity-100 animate-slide-in-right'
        }`}>
          <div className={`bg-gradient-to-br ${theme.background} rounded-xl p-4 shadow-2xl border-2 ${theme.tableBorder} max-w-xs`}>
            <div className="text-white text-sm font-bold whitespace-pre-line leading-relaxed">
              {firstTurnMessageText}
            </div>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
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
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-gray-400 text-xs">Побед</div>
                <div className="text-lg font-bold text-green-400">{gamesWon}</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-3">
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

      {/* Exit Confirmation Modal */}
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
    </div>
  );
};
