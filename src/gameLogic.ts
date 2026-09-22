import { Card, Suit, TablePair, RANK_VALUES, Difficulty } from './types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS_36 = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANKS_52 = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck(deckSize: number = 36): Card[] {
  const deck: Card[] = [];
  const ranks = deckSize === 52 ? RANKS_52 : RANKS_36;
  
  for (const suit of SUITS) {
    for (const rank of ranks) {
      deck.push({ suit, rank: rank as any, id: `${rank}_${suit}` });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function canBeat(attackCard: Card, defenseCard: Card, trumpSuit: Suit | null): boolean {
  if (defenseCard.suit === attackCard.suit) {
    return RANK_VALUES[defenseCard.rank] > RANK_VALUES[attackCard.rank];
  }
  if (defenseCard.suit === trumpSuit && attackCard.suit !== trumpSuit) {
    return true;
  }
  return false;
}

export function canThrowCard(card: Card, table: TablePair[]): boolean {
  if (table.length === 0) return true;
  const ranks = new Set<string>();
  for (const pair of table) {
    ranks.add(pair.attack.rank);
    if (pair.defense) {
      ranks.add(pair.defense.rank);
    }
  }
  return ranks.has(card.rank);
}

export function findLowestTrump(hand: Card[], trumpSuit: Suit | null): Card | null {
  if (!trumpSuit) return null;
  const trumpCards = hand.filter(c => c.suit === trumpSuit);
  if (trumpCards.length === 0) return null;
  return trumpCards.reduce((lowest, card) => 
    RANK_VALUES[card.rank] < RANK_VALUES[lowest.rank] ? card : lowest
  );
}

export function determineFirstAttacker(
  playerHand: Card[],
  computerHand: Card[],
  trumpSuit: Suit | null
): 'player' | 'computer' {
  const playerLowest = findLowestTrump(playerHand, trumpSuit);
  const computerLowest = findLowestTrump(computerHand, trumpSuit);

  if (!playerLowest && !computerLowest) return Math.random() > 0.5 ? 'player' : 'computer';
  if (!playerLowest) return 'computer';
  if (!computerLowest) return 'player';

  return RANK_VALUES[playerLowest.rank] <= RANK_VALUES[computerLowest.rank]
    ? 'player'
    : 'computer';
}

export function computerChooseAttack(
  hand: Card[],
  table: TablePair[],
  trumpSuit: Suit | null,
  difficulty: Difficulty
): Card | null {
  const playable = hand.filter(c => canThrowCard(c, table));
  if (playable.length === 0) return null;

  const sorted = [...playable].sort((a, b) => {
    const aIsTrump = a.suit === trumpSuit ? 1 : 0;
    const bIsTrump = b.suit === trumpSuit ? 1 : 0;
    if (aIsTrump !== bIsTrump) return aIsTrump - bIsTrump;
    return RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
  });

  return sorted[0];
}

export function computerChooseDefense(
  hand: Card[],
  attackCard: Card,
  trumpSuit: Suit | null,
  difficulty: Difficulty
): Card | null {
  // Чит-режим: бот может бить любой картой
  const isBotCheat = typeof window !== 'undefined' && (window as any).__botCheatMode === true;
  
  let options: Card[];
  if (isBotCheat) {
    options = [...hand];
  } else {
    options = hand.filter(c => canBeat(attackCard, c, trumpSuit));
  }
  
  if (options.length === 0) return null;

  const sorted = [...options].sort((a, b) => {
    const aIsTrump = a.suit === trumpSuit ? 1 : 0;
    const bIsTrump = b.suit === trumpSuit ? 1 : 0;
    if (aIsTrump !== bIsTrump) return aIsTrump - bIsTrump;
    return RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
  });

  return sorted[0];
}

export function computerShouldThrow(
  hand: Card[],
  table: TablePair[],
  trumpSuit: Suit | null,
  difficulty: Difficulty,
  defenderHandSize: number
): Card | null {
  if (table.length >= 6) return null;

  const playable = hand.filter(c => canThrowCard(c, table));
  if (playable.length === 0) return null;

  const sorted = [...playable].sort((a, b) => {
    const aIsTrump = a.suit === trumpSuit ? 1 : 0;
    const bIsTrump = b.suit === trumpSuit ? 1 : 0;
    if (aIsTrump !== bIsTrump) return aIsTrump - bIsTrump;
    return RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
  });

  return sorted[0];
}

export function sortHand(hand: Card[], trumpSuit: Suit | null): Card[] {
  return [...hand].sort((a, b) => {
    const aIsTrump = a.suit === trumpSuit ? 1 : 0;
    const bIsTrump = b.suit === trumpSuit ? 1 : 0;
    
    if (aIsTrump !== bIsTrump) {
      return aIsTrump - bIsTrump;
    }
    
    if (a.suit !== b.suit) {
      return a.suit.localeCompare(b.suit);
    }
    
    return RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
  });
}
