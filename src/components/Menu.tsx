import React, { useState } from 'react';

import { Difficulty, DeckSize } from '../types';
import { themes, getNextTheme, type Theme } from '../themes';

interface MenuProps {
  onStartGame: (difficulty: Difficulty, deckSize: DeckSize) => void;
}

export const Menu: React.FC<MenuProps> = ({ onStartGame }) => {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [deckSize, setDeckSize] = useState<DeckSize>(36);
  const [showSettings, setShowSettings] = useState(false);
  const [sortMode, setSortMode] = useState('suit');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => 
    (localStorage.getItem('durak_theme') as Theme) || 'green'
  );

  const theme = themes[currentTheme];

  const changeTheme = () => {
    const nextTheme = getNextTheme(currentTheme);
    setCurrentTheme(nextTheme);
    localStorage.setItem('durak_theme', nextTheme);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b ${theme.background} flex flex-col items-center justify-center p-4 relative overflow-hidden`}>
      {/* Декоративные масти по краям экрана */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Большие масти по углам */}
        <div className="absolute top-10 left-10 text-9xl opacity-15 drop-shadow-lg" style={{ color: theme.textColor }}>♠</div>
        <div className="absolute top-10 right-10 text-9xl opacity-15 drop-shadow-lg text-red-500">♥</div>
        <div className="absolute bottom-10 left-10 text-9xl opacity-15 drop-shadow-lg text-red-500">♦</div>
        <div className="absolute bottom-10 right-10 text-9xl opacity-15 drop-shadow-lg" style={{ color: theme.textColor }}>♣</div>
        
        {/* Дополнительные масти в середине */}
        <div className="absolute top-1/4 left-1/4 text-6xl opacity-10" style={{ color: theme.textColor }}>♠</div>
        <div className="absolute top-1/3 right-1/3 text-6xl opacity-10 text-red-500">♥</div>
        <div className="absolute bottom-1/3 left-1/3 text-6xl opacity-10 text-red-500">♦</div>
        <div className="absolute bottom-1/4 right-1/4 text-6xl opacity-10" style={{ color: theme.textColor }}>♣</div>
        
        {/* Диагональные линии */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, ${theme.tableBorder} 35px, ${theme.tableBorder} 70px)`
        }}></div>
      </div>

      <div className="max-w-md w-full relative z-10">
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
              { key: 'easy' as Difficulty, label: 'Легкая', emoji: '😊', desc: 'Анализ на 4 полухода' },
              { key: 'medium' as Difficulty, label: 'Средняя', emoji: '🤔', desc: 'Анализ на 7 полуходов' },
              { key: 'hard' as Difficulty, label: 'Сложная', emoji: '😈', desc: 'Анализ на 10 полуходов' }
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

        {/* Start Button and Settings */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => onStartGame(difficulty, deckSize)}
            className="flex-1 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400
              text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/30
              transition-all duration-200 active:scale-95 hover:scale-[1.02]"
          >
            🎮 Начать игру
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
            title="Настройки"
          >
            ⚙️
          </button>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`bg-gradient-to-b ${theme.background} rounded-2xl p-4 max-w-md w-full max-h-[80vh] overflow-y-auto border-2 ${theme.tableBorder} shadow-2xl`}>
              <h2 className="text-xl font-bold text-white mb-3 text-center">⚙️ Настройки</h2>
              
              <div className="space-y-2">
                {/* Settings Buttons with descriptions */}
                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      const modes = ['suit', 'rank', 'rank-trump'];
                      const currentIndex = modes.indexOf(sortMode);
                      const newMode = modes[(currentIndex + 1) % modes.length];
                      setSortMode(newMode);
                      localStorage.setItem('durak_sort', newMode);
                    }}
                    className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium text-xs transition-colors flex items-center gap-2"
                  >
                    <span className="text-xl">🃏</span>
                    <div className="text-left">
                      <div className="font-bold text-xs">Сортировка карт</div>
                      <div className="text-[10px] text-white/70">{sortMode === 'suit' ? 'По масти (по умолчанию)' : sortMode === 'rank' ? 'По рангу' : 'По рангу + козыри'}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      const newValue = !soundEnabled;
                      setSoundEnabled(newValue);
                      localStorage.setItem('durak_sound', String(newValue));
                    }}
                    className={`w-full py-2 px-3 rounded-lg font-medium text-xs transition-colors flex items-center gap-2 ${
                      soundEnabled
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        : 'bg-gray-600 hover:bg-gray-500 text-white/80'
                    }`}
                  >
                    <span className="text-xl">{soundEnabled ? '🔊' : '🔇'}</span>
                    <div className="text-left">
                      <div className="font-bold text-xs">Звуковые эффекты</div>
                      <div className="text-[10px] text-white/70">{soundEnabled ? 'Включены' : 'Выключены'}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      const newValue = !hintsEnabled;
                      setHintsEnabled(newValue);
                      localStorage.setItem('durak_hints', String(newValue));
                    }}
                    className={`w-full py-2 px-3 rounded-lg font-medium text-xs transition-colors flex items-center gap-2 ${
                      hintsEnabled
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-gray-600 hover:bg-gray-500 text-white/80'
                    }`}
                  >
                    <span className="text-xl">{hintsEnabled ? '💡' : '🚫'}</span>
                    <div className="text-left">
                      <div className="font-bold text-xs">Подсказки карт</div>
                      <div className="text-[10px] text-white/70">{hintsEnabled ? 'Доступные карты подсвечиваются' : 'Подсказки отключены'}</div>
                    </div>
                  </button>
                  <button
                    onClick={changeTheme}
                    className="w-full py-2 px-3 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-medium text-xs transition-colors flex items-center gap-2"
                  >
                    <span className="text-xl">{theme.emoji}</span>
                    <div className="text-left">
                      <div className="font-bold text-xs">Цветовая тема</div>
                      <div className="text-[10px] text-white/70">{theme.name}</div>
                    </div>
                  </button>
                </div>

                {/* How to Play */}
                <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                  <div className="space-y-2 text-white/90 text-xs">
                    <div>
                      <h4 className="font-bold text-green-300 mb-1 text-center">🎯 Цель игры</h4>
                      <p className="text-[11px]">Дурак — популярная карточная игра. Задача — первым освободиться от всех карт на руках. Игроки по очереди атакуют соперника, а тот отбивается. Когда колода добора закончится, побеждает тот, у кого раньше всех опустеют руки. Тот, кто останется с картами последним, и есть «дурак». В партии на двоих возможна и ничья — если оба остаются без карт одновременно.</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full mt-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500
                  text-white font-bold text-sm rounded-lg transition-all duration-200 active:scale-95"
              >
                Понятно!
              </button>
            </div>
          </div>
        )}

        {/* Version Info */}
        <div className="mt-4 text-center text-white/40 text-xs">
          v0.32
        </div>
      </div>
    </div>
  );
};
