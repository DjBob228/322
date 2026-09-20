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
  // Чит-режим: бот может бить любой картой
  const isBotCheat = typeof window !== 'undefined' && (window as any).__botCheatMode === true;
  
  let options: Card[];
  if (isBotCheat) {
    // В чит-режиме бот может использовать любую карту
    options = [...hand];
  } else {
    options = hand.filter(c => canBeat(attackCard, c, trumpSuit));
  }
  
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

// Оценивает позицию для атакующего (чем выше, тем лучше для атакующего)
export function evaluatePosition(
  attackerHand: Card[],
  defenderHand: Card[],
  table: TablePair[],
  trumpSuit: Suit | null
): number {
  let score = 0;
  
  // Количество карт (меньше = лучше для атакующего)
  score += (defenderHand.length - attackerHand.length) * 10;
  
  // Козыри в руке (больше козырей у атакующего = лучше)
  const attackerTrumps = attackerHand.filter(c => c.suit === trumpSuit).length;
  const defenderTrumps = defenderHand.filter(c => c.suit === trumpSuit).length;
  score += (attackerTrumps - defenderTrumps) * 5;
  
  // Старшие карты (тузы, короли)
  const highCards = ['A', 'K', 'Q'];
  const attackerHigh = attackerHand.filter(c => highCards.includes(c.rank)).length;
  const defenderHigh = defenderHand.filter(c => highCards.includes(c.rank)).length;
  score += (attackerHigh - defenderHigh) * 3;
  
  // Карты на столе (незащищенные карты - хорошо для атакующего)
  const undefended = table.filter(p => !p.defense).length;
  score += undefended * 8;
  
  return score;
}

// Минимакс-алгоритм для расчета полуходов
function minimax(
  attackerHand: Card[],
  defenderHand: Card[],
  table: TablePair[],
  trumpSuit: Suit | null,
  depth: number,
  isAttackerTurn: boolean
): number {
  // Базовый случай: конец игры или достигнута максимальная глубина
  if (depth === 0 || attackerHand.length === 0 || defenderHand.length === 0) {
    return evaluatePosition(attackerHand, defenderHand, table, trumpSuit);
  }
  
  if (isAttackerTurn) {
    // Атакующий выбирает лучшее действие
    let bestScore = -Infinity;
    
    // Вариант 1: Атаковать картой
    const playable = attackerHand.filter(c => canThrowCard(c, table));
    for (const card of playable) {
      const newTable = [...table, { attack: card, defense: null }];
      const newHand = attackerHand.filter(c => c.id !== card.id);
      const score = minimax(newHand, defenderHand, newTable, trumpSuit, depth - 1, false);
      bestScore = Math.max(bestScore, score);
    }
    
    // Вариант 2: Не атаковать (если стол не пуст)
    if (table.length > 0) {
      bestScore = Math.max(bestScore, evaluatePosition(attackerHand, defenderHand, table, trumpSuit));
    }
    
    return bestScore;
  } else {
    // Защищающийся выбирает лучшее действие (минимизирует счет)
    let bestScore = Infinity;
    
    const undefended = table.find(p => !p.defense);
    if (undefended) {
      // Вариант 1: Защищаться картой
      const playable = defenderHand.filter(c => canBeat(undefended.attack, c, trumpSuit));
      for (const card of playable) {
        const newTable = table.map(p => 
          p.attack.id === undefended.attack.id ? { ...p, defense: card } : p
        );
        const newHand = defenderHand.filter(c => c.id !== card.id);
        const score = minimax(attackerHand, newHand, newTable, trumpSuit, depth - 1, true);
        bestScore = Math.min(bestScore, score);
      }
      
      // Вариант 2: Взять карты
      const tableCards = table.flatMap(p => [p.attack, ...(p.defense ? [p.defense] : [])]);
      const newHand = [...defenderHand, ...tableCards];
      const score = evaluatePosition(attackerHand, newHand, [], trumpSuit);
      bestScore = Math.min(bestScore, score);
    }
    
    return bestScore;
  }
}

export function computerShouldThrow(
  hand: Card[],
  table: TablePair[],
  trumpSuit: Suit | null,
  difficulty: Difficulty,
  defenderHand: Card[]
): Card | null {
  const playable = hand.filter(c => canThrowCard(c, table));
  if (playable.length === 0) return null;

  // Don't throw if defender has no cards to take
  const maxCards = Math.min(6, defenderHand.length);
  const undefended = table.filter(p => !p.defense).length;
  if (undefended >= maxCards) return null;

  // Определяем глубину расчета в зависимости от сложности
  const depth = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 7 : 10;

  // Оцениваем каждое возможное подкидывание
  let bestCard: Card | null = null;
  let bestScore = -Infinity;

  for (const card of playable) {
    const newTable = [...table, { attack: card, defense: null }];
    const newHand = hand.filter(c => c.id !== card.id);
    
    // Используем минимакс для оценки этого действия
    const score = minimax(newHand, defenderHand, newTable, trumpSuit, depth, false);
    
    if (score > bestScore) {
      bestScore = score;
      bestCard = card;
    }
  }

  // Оцениваем вариант не подкидывать
  const noThrowScore = evaluatePosition(hand, defenderHand, table, trumpSuit);
  
  // Подкидываем только если это улучшает позицию
  if (bestScore > noThrowScore && bestCard) {
    return bestCard;
  }
  
  return null;
}
