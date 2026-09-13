export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface TablePair {
  attack: Card;
  defense: Card | null;
}

export type Difficulty = 'easy' | 'medium' | 'hard';
export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameOver';
export type TurnPhase = 'attacking' | 'defending' | 'taking' | 'adding';
export type Attacker = 'player' | 'computer';

export interface GameState {
  deck: Card[];
  playerHand: Card[];
  computerHand: Card[];
  table: TablePair[];
  trumpCard: Card | null;
  trumpSuit: Suit | null;
  attacker: Attacker;
  turnPhase: TurnPhase;
  selectedCard: Card | null;
  message: string;
  score: number;
  highScore: number;
  gamesPlayed: number;
  gamesWon: number;
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const SUIT_COLORS: Record<Suit, string> = {
  hearts: '#dc2626',
  diamonds: '#dc2626',
  clubs: '#1f2937',
  spades: '#1f2937',
};

export const RANK_VALUES: Record<Rank, number> = {
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};
