import { Card, Suit, Rank, TablePair, RANK_VALUES, Difficulty, DeckSize } from './types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS_36: Rank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANKS_52: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck(deckSize: DeckSize = 36): Card[] {
  const deck: Card[] = [];
  const ranks = deckSize === 52 ? RANKS_52 : RANKS_36;
  for (const suit of SUITS) {
    for (const rank of ranks) {
      deck.push({ suit, rank, id: `${rank}_${suit}` });
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

export function getTableRanks(table: TablePair[]): Set<string> {
  const ranks = new Set<string>();
  for (const pair of table) {
    ranks.add(pair.attack.rank);
    if (pair.defense) {
      ranks.add(pair.defense.rank);
    }
  }
  return ranks;
}

export function canThrowCard(card: Card, table: TablePair[]): boolean {
  if (table.length === 0) return true;
  const ranks = getTableRanks(table);
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

  // Если ни у кого нет козыря, ходит игрок
  if (!playerLowest && !computerLowest) return 'player';
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

  if (difficulty === 'easy') {
    return playable[Math.floor(Math.random() * playable.length)];
  }

  // Sort: non-trump first, then by rank ascending
  const sorted = [...playable].sort((a, b) => {
    const aIsTrump = a.suit === trumpSuit ? 1 : 0;
    const bIsTrump = b.suit === trumpSuit ? 1 : 0;
    if (aIsTrump !== bIsTrump) return aIsTrump - bIsTrump;
    return RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
  });

  if (difficulty === 'medium') {
    // Sometimes play higher cards
    if (Math.random() > 0.6) {
      return sorted[Math.floor(Math.random() * Math.min(3, sorted.length))];
    }
    return sorted[0];
  }

  // Hard: strategic play
  // If opponent has few cards, play higher
  return sorted[0];
}

export function computerChooseDefense(
  hand: Card[],
  attackCard: Card,
  trumpSuit: Suit | null,
  difficulty: Difficulty
): Card | null {
  const options = hand.filter(c => canBeat(attackCard, c, trumpSuit));
  if (options.length === 0) return null;

  if (difficulty === 'easy') {
    // Sometimes don't defend even if can
    if (Math.random() > 0.7 && options.length > 0) return null;
    return options[Math.floor(Math.random() * options.length)];
  }

  // Sort by value: prefer same suit, then lowest
  const sorted = [...options].sort((a, b) => {
    const aIsTrump = a.suit === trumpSuit ? 1 : 0;
    const bIsTrump = b.suit === trumpSuit ? 1 : 0;
    if (aIsTrump !== bIsTrump) return aIsTrump - bIsTrump;
    return RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
  });

  if (difficulty === 'medium') {
    return sorted[0];
  }

  // Hard: always defend optimally
  return sorted[0];
}

export function sortHand(hand: Card[], trumpSuit: Suit | null): Card[] {
  return [...hand].sort((a, b) => {
    const aIsTrump = a.suit === trumpSuit;
    const bIsTrump = b.suit === trumpSuit;

    // Козыри идут первыми
    if (aIsTrump && !bIsTrump) return -1;
    if (!aIsTrump && bIsTrump) return 1;

    // Если обе козыри или обе не козыри - сортируем по масти, затем по рангу
    if (a.suit !== b.suit) {
      return a.suit.localeCompare(b.suit);
    }

    // Одна масть - сортируем по рангу (6 первый, туз последний)
    return RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
  });
}

export function computerShouldThrow(
  hand: Card[],
  table: TablePair[],
  trumpSuit: Suit | null,
  difficulty: Difficulty,
  defenderHandSize: number
): Card | null {
  const playable = hand.filter(c => canThrowCard(c, table));
  if (playable.length === 0) return null;

  // Don't throw if defender has no cards to take
  const maxCards = Math.min(6, defenderHandSize);
  const undefended = table.filter(p => !p.defense).length;
  if (undefended >= maxCards) return null;

  const sorted = [...playable].sort((a, b) => {
    const aIsTrump = a.suit === trumpSuit ? 1 : 0;
    const bIsTrump = b.suit === trumpSuit ? 1 : 0;
    if (aIsTrump !== bIsTrump) return aIsTrump - bIsTrump;
    return RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
  });

  // Легкая сложность: 40% шанс НЕ подкидывать
  if (difficulty === 'easy') {
    if (Math.random() > 0.6) return null;
  }

  // Средняя сложность: 20% шанс НЕ подкидывать
  if (difficulty === 'medium') {
    if (Math.random() > 0.8) return null;
  }

  if (difficulty === 'hard') {
    // Throw low non-trump cards
    const lowNonTrump = sorted.filter(c => c.suit !== trumpSuit && RANK_VALUES[c.rank] <= 9);
    if (lowNonTrump.length > 0) return lowNonTrump[0];
    if (sorted[0] && sorted[0].suit !== trumpSuit) return sorted[0];
    return null;
  }

  // Для easy и medium - подкидываем не-козырные карты
  if (sorted[0] && sorted[0].suit !== trumpSuit) return sorted[0];
  return null;
}
