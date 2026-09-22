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

// Оценка позиции для минимакса
function evaluatePosition(
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

export function computerChooseAttack(
  hand: Card[],
  table: TablePair[],
  trumpSuit: Suit | null,
  difficulty: Difficulty,
  defenderHand?: Card[]
): Card | null {
  const playable = hand.filter(c => canThrowCard(c, table));
  if (playable.length === 0) return null;

  // Определяем глубину расчета в зависимости от сложности
  const depth = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 7 : 10;
  
  // Если у нас есть информация о руке защитника, используем минимакс
  if (defenderHand && defenderHand.length > 0) {
    let bestCard: Card | null = null;
    let bestScore = -Infinity;
    
    for (const card of playable) {
      const newTable = [...table, { attack: card, defense: null }];
      const newHand = hand.filter(c => c.id !== card.id);
      const score = minimax(newHand, defenderHand, newTable, trumpSuit, depth, false);
      
      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }
    
    return bestCard;
  }
  
  // Если нет информации о руке защитника, используем простую логику
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
  difficulty: Difficulty,
  table?: TablePair[],
  attackerHand?: Card[]
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

  // Определяем глубину расчета в зависимости от сложности
  const depth = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 7 : 10;
  
  // Если у нас есть информация о столе и руке атакующего, используем минимакс
  if (table && attackerHand && attackerHand.length > 0) {
    let bestCard: Card | null = null;
    let bestScore = Infinity;
    
    for (const card of options) {
      const newTable = table.map(p => 
        p.attack.id === attackCard.id ? { ...p, defense: card } : p
      );
      const newHand = hand.filter(c => c.id !== card.id);
      const score = minimax(attackerHand, newHand, newTable, trumpSuit, depth, true);
      
      if (score < bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }
    
    return bestCard;
  }
  
  // Если нет информации, используем простую логику
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
  defenderHand?: Card[]
): Card | null {
  if (table.length >= 6) return null;

  const playable = hand.filter(c => canThrowCard(c, table));
  if (playable.length === 0) return null;

  // Определяем глубину расчета в зависимости от сложности
  const depth = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 7 : 10;
  
  // Если у нас есть информация о руке защитника, используем минимакс
  if (defenderHand && defenderHand.length > 0) {
    // Оцениваем текущую позицию без подкидывания
    const currentScore = evaluatePosition(hand, defenderHand, table, trumpSuit);
    
    let bestCard: Card | null = null;
    let bestScore = currentScore; // Подкидываем только если это улучшит позицию
    
    for (const card of playable) {
      const newTable = [...table, { attack: card, defense: null }];
      const newHand = hand.filter(c => c.id !== card.id);
      const score = minimax(newHand, defenderHand, newTable, trumpSuit, depth, false);
      
      // Подкидываем только если это значительно улучшит позицию
      if (score > bestScore + 5) {
        bestScore = score;
        bestCard = card;
      }
    }
    
    return bestCard;
  }
  
  // Если нет информации о руке защитника, используем простую логику
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
    
    // Козыри в конце
    if (aIsTrump !== bIsTrump) {
      return bIsTrump - aIsTrump;
    }
    
    // Сортировка по масти
    if (a.suit !== b.suit) {
      return a.suit.localeCompare(b.suit);
    }
    
    // Сортировка по рангу (от младшего к старшему)
    return RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
  });
}
