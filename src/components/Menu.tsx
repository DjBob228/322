import type React from 'react';
import { useState, useEffect } from 'react';
import { type Difficulty } from '../types';

interface MenuProps {
  onStartGame: (difficulty: Difficulty) => void;
}

const HIGH_SCORE_KEY = 'durak_high_score';
const GAMES_PLAYED_KEY = 'durak_games_played';
const GAMES_WON_KEY = 'durak_games_won';

export const Menu: React.FC<MenuProps> = ({ onStartGame }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [highScore, setHighScore] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [gamesWon, setGamesWon] = useState(0);

  useEffect(() => {
    setHighScore(parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0'));
    setGamesPlayed(parseInt(localStorage.getItem(GAMES_PLAYED_KEY) || '0'));
    setGamesWon(parseInt(localStorage.getItem(GAMES_WON_KEY) || '0'));
  }, []);

  const difficulties: { key: Difficulty; label: string; emoji: string; desc: string }[] = [
    { key: 'easy', label: 'Легко', emoji: '😊', desc: 'Компьютер иногда ошибается' },
    { key: 'medium', label: 'Средне', emoji: '🤔', desc: 'Сбалансированная игра' },
    { key: 'hard', label: 'Сложно', emoji: '😈', desc: 'Оптимальная стратегия' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-green-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 text-8xl transform rotate-12">♠</div>
        <div className="absolute top-20 right-20 text-8xl transform -rotate-12">♥</div>
        <div className="absolute bottom-20 left-20 text-8xl transform rotate-45">♦</div>
        <div className="absolute bottom-10 right-10 text-8xl transform -rotate-45">♣</div>
      </div>
      {/* Debug indicator */}
      <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-center text-xs py-0.5 z-50 font-bold">
        ✅ МЕНЮ v6 — СОРТИРОВКА
      </div>

      <div className="relative z-10 max-w-md w-full">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 drop-shadow-lg">
            🃏 Дурак
          </h1>
          <p className="text-green-200/70 text-sm sm:text-base">
            Классическая карточная игра
          </p>
        </div>

        {/* Stats */}
        {(highScore > 0 || gamesPlayed > 0) && (
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/10">
            <h3 className="text-white/80 text-sm font-medium mb-2 text-center">📊 Статистика</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-yellow-400 text-xl font-bold">{highScore}</div>
                <div className="text-white/50 text-xs">Рекорд</div>
              </div>
              <div>
                <div className="text-green-400 text-xl font-bold">{gamesWon}</div>
                <div className="text-white/50 text-xs">Побед</div>
              </div>
              <div>
                <div className="text-blue-400 text-xl font-bold">{gamesPlayed}</div>
                <div className="text-white/50 text-xs">Игр</div>
              </div>
            </div>
          </div>
        )}

        {/* Difficulty Selection */}
        <div className="mb-6">
          <h3 className="text-white/80 text-sm font-medium mb-3 text-center">
            Выберите сложность
          </h3>
          <div className="space-y-2">
            {difficulties.map(d => (
              <button
                key={d.key}
                onClick={() => setSelectedDifficulty(d.key)}
                className={`w-full p-3 sm:p-4 rounded-xl text-left transition-all duration-200 border-2
                  ${selectedDifficulty === d.key
                    ? 'bg-green-600/40 border-green-400 shadow-lg shadow-green-500/20'
                    : 'bg-black/20 border-transparent hover:bg-black/30 hover:border-white/20'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{d.emoji}</span>
                  <div>
                    <div className="text-white font-bold text-sm sm:text-base">{d.label}</div>
                    <div className="text-white/50 text-xs">{d.desc}</div>
                  </div>
                  {selectedDifficulty === d.key && (
                    <span className="ml-auto text-green-400 text-lg">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={() => onStartGame(selectedDifficulty)}
          className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400
            text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/30
            transition-all duration-200 active:scale-95 hover:scale-[1.02]"
        >
          🎮 Начать игру
        </button>

        {/* Controls Info */}
        <div className="mt-6 bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <h3 className="text-white/80 text-sm font-medium mb-2 text-center">🎮 Управление</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">1-9</kbd>
              <span>Выбор карты</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">Enter</kbd>
              <span>Подтвердить</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">T</kbd>
              <span>Взять карты</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">P</kbd>
              <span>Бито</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">Esc</kbd>
              <span>Пауза</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">👆</span>
              <span>Касание/Клик</span>
            </div>
          </div>
        </div>

        {/* Rules */}
        <details className="mt-4 bg-black/20 backdrop-blur-sm rounded-xl border border-white/10">
          <summary className="p-3 text-white/80 text-sm font-medium cursor-pointer hover:text-white">
            📖 Правила игры
          </summary>
          <div className="px-4 pb-4 text-white/60 text-xs space-y-2">
            <p>• Колода из 36 карт (от 6 до туза)</p>
            <p>• Козырная масть определяется последней картой колоды</p>
            <p>• Каждый получает 6 карт. Ходит тот, у кого младший козырь</p>
            <p>• Атакующий кладёт карту, защищающийся должен побить</p>
            <p>• Бить можно картой той же масти старше или любым козырем</p>
            <p>• Можно подкидывать карты того же номинала, что на столе</p>
            <p>• Если не можете отбиться — берёте все карты со стола</p>
            <p>• После раунда игроки добирают карты до 6 из колоды</p>
            <p>• Проигрывает тот, у кого остались карты (дурак!)</p>
          </div>
        </details>
      </div>
    </div>
  );
};
