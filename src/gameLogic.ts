import { Card, Suit, Rank, TablePair, RANK_VALUES, Attacker } from './types';

export function createDeck(size: number = 36): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = size === 36 
    ? ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
    : ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  
  const deck: Card[] = [];
  let id = 0;
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ id: `card_${id++}`, suit, rank });
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

export function canBeat(attack: Card, defense: Card, trumpSuit: Suit | null): boolean {
  if (defense.suit === attack.suit) {
    return RANK_VALUES[defense.rank] > RANK_VALUES[attack.rank];
  }
  if (defense.suit === trumpSuit && attack.suit !== trumpSuit) {
    return true;
  }
  return false;
}

export function canThrowCard(card: Card, table: TablePair[]): boolean {
  if (table.length === 0) return true;
  const ranks = new Set<string>();
  table.forEach(pair => {
    ranks.add(pair.attack.rank);
    if (pair.defense) ranks.add(pair.defense.rank);
  });
  return ranks.has(card.rank);
}

export function findLowestTrump(hand: Card[], trumpSuit: Suit | null): Card | null {
  if (!trumpSuit) return null;
  const trumps = hand.filter(c => c.suit === trumpSuit);
  if (trumps.length === 0) return null;
  return trumps.reduce((lowest, card) => 
    RANK_VALUES[card.rank] < RANK_VALUES[lowest.rank] ? card : lowest
  );
}

export function determineFirstAttacker(
  playerHand: Card[],
  computerHand: Card[],
  trumpSuit: Suit | null
): Attacker {
  const playerLowest = findLowestTrump(playerHand, trumpSuit);
  const computerLowest = findLowestTrump(computerHand, trumpSuit);
  
  if (!playerLowest && !computerLowest) return Math.random() > 0.5 ? 'player' : 'computer';
  if (!playerLowest) return 'computer';
  if (!computerLowest) return 'player';
  
  return RANK_VALUES[playerLowest.rank] <= RANK_VALUES[computerLowest.rank] ? 'player' : 'computer';
}

export function computerChooseAttack(
  hand: Card[],
  table: TablePair[],
  trumpSuit: Suit | null,
  difficulty: string
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
  difficulty: string
): Card | null {
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
  difficulty: string,
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
