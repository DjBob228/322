import React, { useState, useEffect } from 'react';
import { Card, TablePair, Attacker, Suit } from '../types';
import { CardComponent } from './Card';
import { 
  createDeck, 
  shuffleDeck, 
  canBeat, 
  canThrowCard, 
  determineFirstAttacker,
  computerChooseAttack,
  computerChooseDefense,
  computerShouldThrow
} from '../gameLogic';

interface HistoryEntry {
  actor: 'player' | 'computer';
  action: 'attack' | 'defend' | 'take' | 'pass';
  card?: Card;
}

interface GameState {
  deck: Card[];
  playerHand: Card[];
  computerHand: Card[];
  table: TablePair[];
  trumpCard: Card | null;
  trumpSuit: Suit | null;
  attacker: Attacker;
  selectedCard: Card | null;
  message: string;
  status: 'playing' | 'gameOver';
  gameOverMessage: string;
  showTakeButton: boolean;
  showPassButton: boolean;
  computerThinking: boolean;
  discardPile: Card[];
  history: HistoryEntry[];
}

const initialState: GameState = {
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
  discardPile: [],
  history: []
};

interface GameProps {
  difficulty: string;
  deckSize: number;
  onBackToMenu: () => void;
}

export const Game: React.FC<GameProps> = ({ difficulty, deckSize, onBackToMenu }) => {
  const [state, setState] = useState<GameState>(initialState);

  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    const newDeck = shuffleDeck(createDeck(deckSize));
    const trump = newDeck[newDeck.length - 1];
    const pHand = newDeck.splice(0, 6);
    const cHand = newDeck.splice(0, 6);
    const firstAttacker = determineFirstAttacker(pHand, cHand, trump.suit);

    setState({
      ...initialState,
      deck: newDeck,
      playerHand: pHand,
      computerHand: cHand,
      trumpCard: trump,
      trumpSuit: trump.suit,
      attacker: firstAttacker,
      message: firstAttacker === 'computer' ? 'Компьютер атакует...' : 'Ваш ход!'
    });
  };

  const addHistory = (actor: 'player' | 'computer', action: 'attack' | 'defend' | 'take' | 'pass', card?: Card) => {
    setState(prev => ({
      ...prev,
      history: [...prev.history, { actor, action, card }]
    }));
  };

  const handleCardClick = (card: Card) => {
    if (state.status !== 'playing' || state.computerThinking) return;

    if (state.attacker === 'player') {
      if (state.table.length === 0 || canThrowCard(card, state.table)) {
        if (state.selectedCard?.id === card.id) {
          // Attack
          setState(prev => ({
            ...prev,
            playerHand: prev.playerHand.filter(c => c.id !== card.id),
            table: [...prev.table, { attack: card, defense: null }],
            selectedCard: null,
            message: 'Ожидание...'
          }));
          addHistory('player', 'attack', card);
        } else {
          setState(prev => ({ ...prev, selectedCard: card }));
        }
      }
    } else if (state.attacker === 'computer') {
      const undefended = state.table.find(p => !p.defense);
      if (undefended && canBeat(undefended.attack, card, state.trumpSuit)) {
        if (state.selectedCard?.id === card.id) {
          // Defend
          setState(prev => ({
            ...prev,
            playerHand: prev.playerHand.filter(c => c.id !== card.id),
            table: prev.table.map(p => 
              p.attack.id === undefended.attack.id ? { ...p, defense: card } : p
            ),
            selectedCard: null,
            message: 'Ожидание...'
          }));
          addHistory('player', 'defend', card);
        } else {
          setState(prev => ({ ...prev, selectedCard: card }));
        }
      }
    }
  };

  const handleTake = () => {
    if (state.status !== 'playing') return;
    
    const tableCards = state.table.flatMap(p => [p.attack, ...(p.defense ? [p.defense] : [])]);
    setState(prev => ({
      ...prev,
      playerHand: [...prev.playerHand, ...tableCards],
      table: [],
      showTakeButton: false,
      message: 'Вы взяли карты'
    }));
    addHistory('player', 'take');
  };

  const handlePass = () => {
    if (state.status !== 'playing') return;
    
    const tableCards = state.table.flatMap(p => [p.attack, ...(p.defense ? [p.defense] : [])]);
    setState(prev => ({
      ...prev,
      table: [],
      discardPile: [...prev.discardPile, ...tableCards],
      showPassButton: false,
      attacker: prev.attacker === 'player' ? 'computer' : 'player',
      message: prev.attacker === 'player' ? 'Компьютер атакует...' : 'Ваш ход!'
    }));
    addHistory('player', 'pass');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 via-green-700 to-green-900 flex">
      {/* History Panel */}
      <div className="w-64 bg-black/30 p-4 overflow-y-auto">
        <h3 className="text-white font-bold mb-2">История ходов</h3>
        <div className="space-y-1 text-xs">
          {state.history.map((entry, i) => (
            <div key={i} className="text-white/80">
              {entry.actor === 'player' ? 'Ваш ход' : 'AI 1'} — 
              {entry.action === 'attack' && ` Атаковать (${entry.card?.rank} ${entry.card?.suit})`}
              {entry.action === 'defend' && ` Бить (${entry.card?.rank} ${entry.card?.suit})`}
              {entry.action === 'take' && ' Взять'}
              {entry.action === 'pass' && ' Пас'}
            </div>
          ))}
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={onBackToMenu} className="px-3 py-2 bg-gray-700 text-white rounded">
            ← Меню
          </button>
          <div className="text-white">
            Отбой: {state.discardPile.length} карт
          </div>
        </div>

        {/* Computer Hand */}
        <div className="mb-4">
          <div className="text-white mb-2">🤖 Компьютер ({state.computerHand.length})</div>
          <div className="flex gap-1">
            {state.computerHand.map(card => (
              <CardComponent key={card.id} card={card} faceDown className="w-12" />
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 bg-green-600/20 rounded-xl p-4 mb-4">
          <div className="flex flex-wrap gap-4">
            {state.table.map((pair, i) => (
              <div key={i} className="relative">
                <CardComponent card={pair.attack} className="w-16" />
                {pair.defense && (
                  <div className="absolute top-4 left-4">
                    <CardComponent card={pair.defense} className="w-16" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="text-center text-white mb-4">{state.message}</div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-2 mb-4">
          {state.showTakeButton && (
            <button onClick={handleTake} className="px-4 py-2 bg-orange-500 text-white rounded">
              🖐 Взять
            </button>
          )}
          {state.showPassButton && (
            <button onClick={handlePass} className="px-4 py-2 bg-blue-500 text-white rounded">
              ✓ Бито
            </button>
          )}
        </div>

        {/* Player Hand */}
        <div>
          <div className="text-white mb-2">🃏 Вы ({state.playerHand.length})</div>
          <div className="flex gap-1 flex-wrap">
            {state.playerHand.map(card => (
              <CardComponent
                key={card.id}
                card={card}
                isSelected={state.selectedCard?.id === card.id}
                onClick={() => handleCardClick(card)}
                className="w-16"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
