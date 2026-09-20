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
import { t } from '../i18n';

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
  computerJustTook: boolean; // Компьютер только что взял карты, игрок может подкидывать
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
  | { type: 'PLAYER_THROW_AFTER_COMPUTER_TAKES'; card: Card }
  | { type: 'COMPUTER_ATTACK'; card: Card }
  | { type: 'COMPUTER_DEFEND'; card: Card; attackId: string }
  | { type: 'COMPUTER_THROW'; card: Card }
  | { type: 'COMPUTER_THROW_AFTER_TAKE'; card: Card }
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
    return { ...state, status: 'gameOver', gameOverMessage: t('draw') };
  }
  
  if (state.deck.length > 0) return null;
  
  // Check for pogony (погоны) conditions
  const checkPogony = (loserHand: Card[], attacker: Attacker, defender: Attacker): boolean => {
    // Pogony conditions:
    // 1. Attacker's last attack was with non-trump sixes (any number)
    // 2. Defender has cards left
    // Погоны нельзя отбивать - если выложены, они автоматически засчитываются
    
    if (loserHand.length === 0) return false;
    
    // Check if last attack contained non-trump sixes
    const lastAttack = state.lastAttackCards;
    if (lastAttack.length === 0) return false;
    
    const allNonTrumpSixes = lastAttack.every(card => 
      card.rank === '6' && card.suit !== state.trumpSuit
    );
    
    return allNonTrumpSixes;
  };
  
  if (state.playerHand.length === 0) {
    // Player won, check if computer got pogony
    const hasPogony = checkPogony(state.computerHand, 'player', 'computer');
    const message = hasPogony
      ? `${t('youWin')} ${t('withPogony')}` 
      : t('youWin');
    return { ...state, status: 'gameOver', gameOverMessage: message };
  }
  if (state.computerHand.length === 0) {
    // Computer won, check if player got pogony
    const hasPogony = checkPogony(state.playerHand, 'computer', 'player');
    const message = hasPogony
      ? `${t('youLose')} ${t('withPogony')}` 
      : t('youLose');
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
        computerJustTook: false,
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
        message: t('waiting'),
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

    case 'PLAYER_THROW_AFTER_COMPUTER_TAKES': {
      // Игрок подкидывает карту после того, как компьютер взял карты
      const newHand = state.playerHand.filter(c => c.id !== action.card.id);
      // Карта идёт на стол, а не сразу в руку компьютера
      const newTable = [...state.table, { attack: action.card, defense: null }];
      
      // Обновляем lastTableRanks
      const newRanks = new Set(state.lastTableRanks);
      newRanks.add(action.card.rank);
      
      // Computer sees this card
      const newCardsShown = new Set(state.cardsShownToComputer);
      newCardsShown.add(action.card.id);
      
      return {
        ...state,
        playerHand: newHand,
        table: newTable,
        selectedCard: null,
        showPassButton: true, // Оставляем кнопку "Бито"
        message: t('playerThrowsAfterComputerTakes'),
        lastTableRanks: newRanks,
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
        message: t('computerAttacks'),
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
        message: t('waiting'),
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
        message: t('computerThrows'),
        computerThinking: false,
        lastTableRanks: newRanks,
      };
    }

    case 'COMPUTER_TAKES': {
      // Сохраняем ранги карт со стола для возможности подкидывания игроком
      const ranks = new Set<string>();
      state.table.forEach(p => {
        ranks.add(p.attack.rank);
        if (p.defense) ranks.add(p.defense.rank);
      });
      
      // НЕ очищаем стол и НЕ добавляем карты в руку компьютера сразу
      // Карты остаются на столе до нажатия "Бито"
      return {
        ...state,
        showTakeButton: false,
        showPassButton: true, // Показываем кнопку "Бито" для игрока
        message: t('computerTakes'),
        computerThinking: false,
        playerJustTook: false,
        computerJustTook: true, // Компьютер только что взял карты
        lastTableRanks: ranks, // Сохраняем ранги для подкидывания
        // Не завершаем раунд сразу - даём игроку время подкинуть карты
      };
    }

    case 'COLLECT_CARDS_FOR_COMPUTER': {
      // Собираем карты со стола в руку компьютера и очищаем стол
      const tableCards = state.table.flatMap(p => [p.attack, ...(p.defense ? [p.defense] : [])]);
      const newHand = [...state.computerHand, ...tableCards];
      
      return {
        ...state,
        computerHand: newHand,
        table: [], // Очищаем стол
        computerJustTook: false,
        lastTableRanks: new Set<string>(),
      };
    }

    case 'PLAYER_TAKES': {
      // НЕ очищаем стол сразу - бот должен подкинуть карты на стол
      // Сохраняем ранги карт со стола для возможности подкидывания
      const ranks = new Set<string>();
      state.table.forEach(p => {
        ranks.add(p.attack.rank);
        if (p.defense) ranks.add(p.defense.rank);
      });
      
      const newState = {
        ...state,
        selectedCard: null,
        showTakeButton: false,
        showPassButton: false,
        message: t('playerTakes'),
        computerThinking: false,
        playerJustTook: true, // Помечаем, что игрок взял карты
        lastTableRanks: ranks, // Сохраняем ранги для подкидывания
      };
      
      // Проверяем, не закончилась ли игра
      const endCheck = checkGameEnd(newState);
      if (endCheck) return endCheck;
      
      return newState;
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
      
      const newState = {
        ...state,
        playerHand: newHand,
        table: [], // Очищаем стол
        playerJustTook: false,
        computerJustTook: false,
        lastTableRanks: new Set<string>(),
        cardsShownToComputer: newCardsShown,
      };
      
      // Проверяем, не закончилась ли игра
      const endCheck = checkGameEnd(newState);
      if (endCheck) return endCheck;
      
      return newState;
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
        computerJustTook: false, // Сбрасываем флаг
        lastTableRanks: new Set<string>(), // Сбрасываем ранги
        lastAttackCards: [],
        lastAttackWasSixes: false,
      };

      const withCards = drawFromDeck(newState);
      const endCheck = checkGameEnd(withCards);
      if (endCheck) return endCheck;

      return {
        ...withCards,
        message: newAttacker === 'computer' ? t('computerAttacks') : t('yourTurn'),
        roundEnded: false,
        computerThinking: false,
        playerJustTook: false,
        computerJustTook: false,
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
        computerJustTook: false,
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
        computerJustTook: false,
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
  computerJustTook: false,
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
  const [hintsEnabled, setHintsEnabled] = useState(() => localStorage.getItem('durak_hints') !== 'false');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showFirstTurnMessage, setShowFirstTurnMessage] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [firstTurnMessageText, setFirstTurnMessageText] = useState('');
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [isTaking, setIsTaking] = useState(false);
  
  const theme = themes[currentTheme];
  
  // Audio context for sounds
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Initialize audio context lazily
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {
          // Ignore errors
        }
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
    const pHand = newDeck.splice(0, 6);
    const cHand = newDeck.splice(0, 6);
    const trump = newDeck.splice(newDeck.length - 1, 1)[0]; // Берём последнюю карту и удаляем её из колоды
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
      message = t('computerAttacks');
      firstTurnText = `🤖 Компьютер ходит первым\nМеньший козырь: ${computerLowestTrump?.rank || 'нет'} ${computerLowestTrump ? SUIT_SYMBOLS[computerLowestTrump.suit] : ''}`;
      computerKnownTrump = computerLowestTrump;
    } else {
      // Игрок ходит первым - запоминаем его наименьший козырь
      message = t('yourTurn');
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
    // Убираем проверку attacker и table.length, потому что useEffect уже проверяет эти условия
    // if (cs.attacker !== 'computer' || cs.table.length !== 0) return;

    dispatch({ type: 'SET_THINKING', thinking: true });
    computerTimeoutRef.current = window.setTimeout(() => {
      const cs2 = stateRef.current;
      if (cs2.status !== 'playing') return;
      if (cs2.attacker !== 'computer') return; // Проверяем еще раз внутри setTimeout
      
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
    
    // Если все карты отбиты, проверяем можно ли подкинуть или завершаем раунд
    if (allDefended) {
      // Если на столе 6 карт или у игрока нет карт, завершаем раунд
      if (cs.table.length >= 6 || cs.playerHand.length === 0) {
        dispatch({ type: 'END_ROUND', playerTook: false, computerTook: false });
        return;
      }
      
      // Пытаемся подкинуть карту
      dispatch({ type: 'SET_THINKING', thinking: true });
      computerTimeoutRef.current = window.setTimeout(() => {
        const cs2 = stateRef.current;
        if (cs2.status !== 'playing' || cs2.attacker !== 'computer') return;
        
        const card = computerShouldThrow(cs2.computerHand, cs2.table, cs2.trumpSuit, difficulty, cs2.playerHand);
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
        // Wait for state update, then show "Бито" button
        setTimeout(() => {
          const cs3 = stateRef.current;
          if (cs3.status !== 'playing') return;
          dispatch({ type: 'SHOW_BUTTONS', take: false, pass: true });
          dispatch({ type: 'SET_MESSAGE', message: t('computerThrows') });
        }, 400);
      } else {
        // Computer takes cards - show message first
        dispatch({ type: 'SET_MESSAGE', message: t('computerTakes') });
        setScore(prev => prev + 15);

        // Wait before marking as taken (no animation yet)
        setTimeout(() => {
          dispatch({ type: 'COMPUTER_TAKES' });
          playSound('collect'); // Звук подбора карт как у игрока
          // Не вызываем END_ROUND здесь - даём игроку время подкинуть карты или нажать "Бито"
        }, 500);
      }
    }, 800 + Math.random() * 600);
  }, [difficulty]);

  // Trigger computer actions based on state
  useEffect(() => {
    if (state.status !== 'playing' || state.computerThinking) return;

    // Добавляем небольшую задержку, чтобы state полностью обновился
    const timeoutId = setTimeout(() => {
      // Не вызываем действия бота, если компьютер только что взял карты (ждём игрока)
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

    // Особый случай: компьютер взял карты, игрок может подкинуть
    if (state.attacker === 'player' && state.computerJustTook) {
      // Проверяем, можно ли подкинуть эту карту (используем lastTableRanks)
      if (state.lastTableRanks.has(card.rank)) {
        if (state.selectedCard?.id === card.id) {
          // Двойной клик - подкидываем карту
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
          // Double-click confirms
          dispatch({ type: 'PLAYER_ATTACK', card });
          dispatch({ type: 'SET_MESSAGE', message: t('waiting') });
          playSound('place');
        } else {
          dispatch({ type: 'SELECT_CARD', card });
        }
      }
    } else if (state.attacker === 'computer') {
      const undefended = state.table.find(p => !p.defense);
      if (undefended && canBeat(undefended.attack, card, state.trumpSuit)) {
        // Проверка на погоны: если это последний ход и атакующая карта - некозырная шестерка, отбивать нельзя
        const isPogony = state.deck.length === 0 && 
                         undefended.attack.rank === '6' && 
                         undefended.attack.suit !== state.trumpSuit;
        
        if (isPogony) {
          // Погоны нельзя отбивать - показываем сообщение
          dispatch({ type: 'SET_MESSAGE', message: 'Погоны нельзя отбить!' });
          return;
        }
        
        if (state.selectedCard?.id === card.id) {
          // Double-click confirms
          dispatch({ type: 'PLAYER_DEFEND', card, attackId: undefended.attack.id });
          dispatch({ type: 'SET_MESSAGE', message: t('waiting') });
          playSound('beat');
        } else {
          dispatch({ type: 'SELECT_CARD', card });
        }
      }
    }
  };

  // Confirm play button
  const confirmPlay = () => {
    if (!state.selectedCard || state.status !== 'playing') return;

    // Особый случай: компьютер взял карты, игрок может подкинуть
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
        // Проверка на погоны: если это последний ход и атакующая карта - некозырная шестерка, отбивать нельзя
        const isPogony = state.deck.length === 0 && 
                         undefended.attack.rank === '6' && 
                         undefended.attack.suit !== state.trumpSuit;
        
        if (isPogony) {
          // Погоны нельзя отбивать - показываем сообщение
          dispatch({ type: 'SET_MESSAGE', message: 'Погоны нельзя отбить!' });
          return;
        }
        
        dispatch({ type: 'PLAYER_DEFEND', card: state.selectedCard, attackId: undefended.attack.id });
        dispatch({ type: 'SET_MESSAGE', message: t('waiting') });
      }
    }
  };

  // Player takes cards
  const handleTake = () => {
    if (state.status !== 'playing') return;
    if (isTaking) return; // Защита от множественных нажатий
    
    setIsTaking(true);
    playSound('collect'); // Сразу воспроизводим звук
    
    // Даём боту время подкинуть карты (2 секунды)
    // В это время карты остаются на столе
    setTimeout(() => {
      // Теперь запускаем анимацию для всех карт на столе (включая подкинутые)
      dispatch({ type: 'SET_ANIMATING', animation: 'player-takes' });
      
      // Ждём завершения анимации
      setTimeout(() => {
        dispatch({ type: 'PLAYER_TAKES' });
        dispatch({ type: 'SET_ANIMATING', animation: null });
        setScore(prev => Math.max(0, prev - 10));
        
        // Сбрасываем флаг после завершения
        setTimeout(() => {
          setIsTaking(false);
        }, 500);
      }, 800);
    }, 2000); // Даём боту 2 секунды на подкидывание карт
  };

  // Player passes (bito)
  const handlePass = () => {
    if (state.status !== 'playing') return;
    
    playSound('pass'); // Спокойный звук бито
    
    // Если компьютер только что взял карты и игрок нажимает "Бито" - ход остается у игрока
    if (state.computerJustTook) {
      // Start animation - cards fly to computer
      dispatch({ type: 'SET_ANIMATING', animation: 'computer-takes' });
      
      // Wait for animation, then collect cards
      setTimeout(() => {
        dispatch({ type: 'COLLECT_CARDS_FOR_COMPUTER' });
        dispatch({ type: 'SET_ANIMATING', animation: null });
        // Затем завершаем раунд
        dispatch({ type: 'END_ROUND', playerTook: false, computerTook: true });
        setScore(prev => prev + 5);
      }, 800);
      return;
    }
    
    // Обычный случай - бито, ход переходит к другому игроку
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
        const newGW = gamesWon + 1;
        setGamesWon(newGW);
        localStorage.setItem(GAMES_WON_KEY, String(newGW));
        playSound('win');
      } else if (state.gameOverMessage.includes('проиграли')) {
        playSound('lose');
      }
    }
  }, [state.status]);

  // Handle Esc key to open exit confirmation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.status === 'playing') {
        setShowExitConfirm(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.status]);

  // Handle Esc key to open exit confirmation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.status === 'playing') {
        setShowExitConfirm(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
  const playSound = async (type: 'card' | 'win' | 'lose' | 'take' | 'place' | 'beat' | 'collect' | 'pass') => {
    if (!soundEnabled) return;
    
    try {
      // Lazy initialization of AudioContext
      if (!audioContextRef.current && typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        }
      }
      
      if (!audioContextRef.current) return;
      
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
      } else if (type === 'place' || type === 'beat') {
        // Одинаковый звук для кладки и удара карты
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
      } else if (type === 'take') {
        oscillator.frequency.value = 300;
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } else if (type === 'collect') {
        // Резкий звук ошибки Windows (забирание карт)
        oscillator.frequency.value = 150;
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
      } else if (type === 'pass') {
        // Звук бито (похож на place, но выше тональностью)
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

  // Get playable cards
  const getPlayableCards = (): Set<string> => {
    const playable = new Set<string>();
    // Подсветка только если включены подсказки
    if (!hintsEnabled) return playable;
    if (state.computerThinking) return playable;

    if (state.attacker === 'player') {
      state.playerHand.forEach(c => {
        // Если компьютер только что взял карты, проверяем lastTableRanks
        if (state.computerJustTook) {
          if (state.lastTableRanks.has(c.rank)) {
            playable.add(c.id);
          }
        } else if (state.table.length === 0 || canThrowCard(c, state.table)) {
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
    
    if (difficulty === 'easy') {
      // Легкая: противник знает козырь игрока в начале (если игрок ходит первым)
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
    <div className={`min-h-screen h-screen bg-gradient-to-b ${theme.background} flex flex-col relative overflow-x-hidden overflow-y-auto pb-4`}>
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
            {t('menu')}
          </button>
          <span className="text-white/60 text-sm">
            {difficulty === 'easy' ? '😊 Легкая' : difficulty === 'medium' ? '🤔 Средняя' : '😈 Сложная'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-white text-sm">
            <span className="text-yellow-300 font-bold">{score}</span>
            <span className="text-white/50"> {t('points')}</span>
          </div>
          <div className="text-white/50 text-sm">
            🏆 {highScore}
          </div>
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
        </div>
      </div>

      {/* Game Board */}
      <div className="relative z-10 flex-1 flex flex-col p-3 gap-2 w-full min-h-0">
        {/* Computer Hand */}
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
          
          {/* Deck & Trump - positioned at right center of table */}
          {state.deck.length > 0 && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 z-20">
              {state.trumpCard && (
                <div 
                  style={{ transform: 'rotate(90deg)' }}
                >
                  <CardComponent card={state.trumpCard} className="w-20" />
                </div>
              )}
              <div className="relative" style={{ width: '5rem', height: '7rem' }}>
                {/* 3D stack effect - 4 layers with visible borders, tilted up-right */}
                {Array.from({ length: 4 }, (_, i) => (
                  <div 
                    key={i}
                    className="absolute inset-0 rounded-lg"
                    style={{ 
                      transform: `translate(${(i + 1) * 2}px, -${(i + 1) * 2}px)`,
                      background: `linear-gradient(135deg, hsl(220, 70%, ${45 - i * 5}%) 0%, hsl(220, 70%, ${35 - i * 5}%) 100%)`,
                      border: '2px solid hsl(220, 60%, 60%)',
                      boxShadow: '2px -2px 4px rgba(0,0,0,0.5)'
                    }}
                  ></div>
                ))}
                
                {/* Top card */}
                <CardComponent card={state.deck[0]} faceDown className="w-20 relative z-10" />
                <div className="absolute -top-1 -right-1 bg-white text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow z-20">
                  {state.deck.length}
                </div>
              </div>
            </div>
          )}
          
          <div 
            className="flex flex-wrap gap-1 items-center justify-center relative z-10"
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
                {state.attacker === 'player' ? t('chooseCard') : t('waiting')}
              </div>
            ) : (
              state.table.map((pair, i) => {
                // Анимация взятия карт
                let attackAnimationClass = '';
                let defenseAnimationClass = '';
                
                if (state.animatingCards === 'player-takes') {
                  attackAnimationClass = 'animate-card-fly-to-player';
                  defenseAnimationClass = 'animate-card-fly-to-player';
                } else if (state.animatingCards === 'computer-takes') {
                  // Обе карты анимируются одинаково
                  attackAnimationClass = 'animate-card-fly-to-computer';
                  defenseAnimationClass = 'animate-card-fly-to-computer';
                }
                
                return (
                  <div 
                    key={i} 
                    className="relative animate-card-appear"
                    style={{ width: '7rem', height: '8rem' }}
                  >
                    {/* Attack card (underneath) with drop shadow */}
                    <div className={`${attackAnimationClass} absolute top-4 left-4`} style={{ filter: pair.defense ? 'drop-shadow(4px 4px 6px rgba(0,0,0,0.5))' : 'none' }}>
                      <CardComponent card={pair.attack} className="w-20" />
                    </div>
                    {/* Defense card (on top) - positioned right and down */}
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

        {/* Action Buttons */}
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
              {t('take')}
            </button>
          )}
          {state.showPassButton && (
            <button
              onClick={handlePass}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-bold text-sm transition-colors shadow-lg"
            >
              {t('pass')}
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
            <h2 className="text-3xl font-bold text-white mb-2">{t('gameOver')}</h2>
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
                {t('playAgain')}
              </button>
              <button
                onClick={onBackToMenu}
                className="block w-full px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold transition-colors"
              >
                {t('backToMenu')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="bg-gray-800 rounded-2xl p-6 text-center shadow-2xl border border-gray-600 animate-scale-in max-w-sm mx-4">
            <h2 className="text-xl font-bold text-white mb-4">{t('exitConfirm')}</h2>
            <p className="text-gray-300 text-sm mb-6">{t('exitText')}</p>
            <div className="space-y-2">
              <button
                onClick={onBackToMenu}
                className="block w-full px-6 py-3 bg-red-500 hover:bg-red-400 text-white rounded-lg font-bold transition-colors"
              >
                {t('yes')}
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="block w-full px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold transition-colors"
              >
                {t('no')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
