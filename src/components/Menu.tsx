import React, { useState } from 'react';

import { Difficulty, DeckSize } from '../types';

interface MenuProps {
  onStartGame: (difficulty: Difficulty, deckSize: DeckSize) => void;
}

export const Menu: React.FC<MenuProps> = ({ onStartGame }) => {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [deckSize, setDeckSize] = useState<DeckSize>(36);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-green-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        <h1 className="text-5xl font-bold text-white mb-2 text-center">
          <span className="text-black">♠</span>
          <span className="text-red-500">♦</span>
          {' '}Дурак{' '}
          <span className="text-black">♣</span>
          <span className="text-red-500">♥</span>
        </h1>
        <p className="text-green-200/70 text-base text-center mb-8">
          Классическая карточная игра
        </p>

        {/* Difficulty Selection */}
        <div className="mb-6">
          <h3 className="text-white/80 text-sm font-medium mb-3 text-center">
            Выберите сложность
          </h3>
          <div className="space-y-2">
            {[
              { key: 'easy' as Difficulty, label: 'Легкая', emoji: '😊', desc: 'Компьютер иногда ошибается' },
              { key: 'medium' as Difficulty, label: 'Средняя', emoji: '🤔', desc: 'Сбалансированная игра' },
              { key: 'hard' as Difficulty, label: 'Сложная', emoji: '😈', desc: 'Оптимальная стратегия' }
            ].map(d => (
              <button
                key={d.key}
                onClick={() => setDifficulty(d.key)}
                className={`w-full p-4 rounded-xl text-left transition-all duration-200 border-2
                  ${difficulty === d.key
                    ? 'bg-green-600/40 border-green-400 shadow-lg shadow-green-500/20'
                    : 'bg-black/20 border-transparent hover:bg-black/30 hover:border-white/20'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{d.emoji}</span>
                  <div>
                    <div className="text-white font-bold text-base">{d.label}</div>
                    <div className="text-white/50 text-xs">{d.desc}</div>
                  </div>
                  {difficulty === d.key && (
                    <span className="ml-auto text-green-400 text-lg">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Deck Size Selection */}
        <div className="mb-6">
          <h3 className="text-white/80 text-sm font-medium mb-3 text-center">
            Количество карт
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDeckSize(36 as DeckSize)}
              className={`p-4 rounded-xl transition-all duration-200 border-2
                ${deckSize === 36
                  ? 'bg-green-600/40 border-green-400 shadow-lg shadow-green-500/20'
                  : 'bg-black/20 border-transparent hover:bg-black/30 hover:border-white/20'
                }`}
            >
              <div className="text-white font-bold text-lg mb-1">36 карт</div>
              <div className="text-white/50 text-xs">Классическая игра</div>
            </button>
            <button
              onClick={() => setDeckSize(52 as DeckSize)}
              className={`p-4 rounded-xl transition-all duration-200 border-2
                ${deckSize === 52
                  ? 'bg-green-600/40 border-green-400 shadow-lg shadow-green-500/20'
                  : 'bg-black/20 border-transparent hover:bg-black/30 hover:border-white/20'
                }`}
            >
              <div className="text-white font-bold text-lg mb-1">52 карты</div>
              <div className="text-white/50 text-xs">Расширенная игра</div>
            </button>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={() => onStartGame(difficulty, deckSize)}
          className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400
            text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/30
            transition-all duration-200 active:scale-95 hover:scale-[1.02]"
        >
          🎮 Начать игру
        </button>

        {/* Version Info */}
        <div className="mt-4 text-center text-white/40 text-xs">
          v0.21
        </div>
      </div>
    </div>
  );
};
