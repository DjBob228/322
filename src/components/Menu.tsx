import type React from 'react';
import { useState, useEffect } from 'react';
import { type Difficulty, type DeckSize } from '../types';

interface MenuProps {
  onStartGame: (difficulty: Difficulty, deckSize: DeckSize) => void;
}

const HIGH_SCORE_KEY = 'durak_high_score';
const GAMES_PLAYED_KEY = 'durak_games_played';
const GAMES_WON_KEY = 'durak_games_won';

export const Menu: React.FC<MenuProps> = ({ onStartGame }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('casual');
  const [selectedDeckSize, setSelectedDeckSize] = useState<DeckSize>(36);
  const [highScore, setHighScore] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [gamesWon, setGamesWon] = useState(0);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    setHighScore(parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0'));
    setGamesPlayed(parseInt(localStorage.getItem(GAMES_PLAYED_KEY) || '0'));
    setGamesWon(parseInt(localStorage.getItem(GAMES_WON_KEY) || '0'));
  }, []);

  const difficulties: { key: Difficulty; label: string; emoji: string; desc: string }[] = [
    { key: 'casual', label: 'Легкая', emoji: '🎯', desc: 'С подсказками, редко подкидывает' },
    { key: 'easy', label: 'Обычная', emoji: '😊', desc: 'Иногда ошибается, редко подкидывает' },
    { key: 'medium', label: 'Средняя', emoji: '🤔', desc: 'Запоминает козыри, обдумывает ходы' },
    { key: 'hard', label: 'Сложная', emoji: '😈', desc: 'Запоминает все, всегда подкидывает' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-green-950 flex flex-col items-center justify-center p-4 relative overflow-y-auto">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 text-8xl transform rotate-12">♠</div>
        <div className="absolute top-20 right-20 text-8xl transform -rotate-12">♥</div>
        <div className="absolute bottom-20 left-20 text-8xl transform rotate-45">♦</div>
        <div className="absolute bottom-10 right-10 text-8xl transform -rotate-45">♣</div>
      </div>

      <div className="relative z-10 max-w-md w-full">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
            🃏 Дурак
          </h1>
          <p className="text-green-200/70 text-base">
            Классическая карточная игра
          </p>
        </div>

        {/* Stats */}
        {(highScore > 0 || gamesPlayed > 0) && (
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/10">
            <h3 className="text-white/80 text-sm font-medium mb-2 text-center">Статистика</h3>
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
                className={`w-full p-4 rounded-xl text-left transition-all duration-200 border-2
                  ${selectedDifficulty === d.key
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
                  {selectedDifficulty === d.key && (
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
              onClick={() => setSelectedDeckSize(36)}
              className={`p-4 rounded-xl transition-all duration-200 border-2
                ${selectedDeckSize === 36
                  ? 'bg-green-600/40 border-green-400 shadow-lg shadow-green-500/20'
                  : 'bg-black/20 border-transparent hover:bg-black/30 hover:border-white/20'
                }`}
            >
              <div className="text-white font-bold text-lg mb-1">36 карт</div>
              <div className="text-white/50 text-xs">Классическая игра</div>
              <div className="text-white/40 text-xs mt-1">от 6 до туза</div>
            </button>
            <button
              onClick={() => setSelectedDeckSize(52)}
              className={`p-4 rounded-xl transition-all duration-200 border-2
                ${selectedDeckSize === 52
                  ? 'bg-green-600/40 border-green-400 shadow-lg shadow-green-500/20'
                  : 'bg-black/20 border-transparent hover:bg-black/30 hover:border-white/20'
                }`}
            >
              <div className="text-white font-bold text-lg mb-1">52 карты</div>
              <div className="text-white/50 text-xs">Расширенная игра</div>
              <div className="text-white/40 text-xs mt-1">от 2 до туза</div>
            </button>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={() => onStartGame(selectedDifficulty, selectedDeckSize)}
          className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400
            text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/30
            transition-all duration-200 active:scale-95 hover:scale-[1.02]"
        >
          🎮 Начать игру
        </button>

        {/* How to Play Button */}
        <button
          onClick={() => setShowHowToPlay(true)}
          className="w-full mt-3 py-2 bg-white/10 hover:bg-white/20 text-white/80 text-sm rounded-lg
            transition-all duration-200 border border-white/20"
        >
          📖 Как играть
        </button>

        {/* How to Play Modal */}
        {showHowToPlay && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gradient-to-b from-green-800 to-green-900 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto border-2 border-green-600/50 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">📖 Как играть</h2>
              
              <div className="space-y-4 text-white/90 text-sm">
                <div>
                  <h3 className="font-bold text-green-300 mb-2">🎯 Цель игры</h3>
                  <p>Избавиться от всех карт раньше противника. Проигрывает тот, у кого остались карты (дурак!)</p>
                </div>

                <div>
                  <h3 className="font-bold text-green-300 mb-2">🃏 Правила</h3>
                  <ul className="space-y-1 text-white/80">
                    <li>• Колода из 36 карт (от 6 до туза) или 52 карт (от 2 до туза)</li>
                    <li>• Козырная масть определяется последней картой колоды</li>
                    <li>• Каждый получает 6 карт. Ходит тот, у кого младший козырь</li>
                    <li>• Атакующий кладёт карту, защищающийся должен побить</li>
                    <li>• Бить можно картой той же масти старше или любым козырем</li>
                    <li>• Можно подкидывать карты того же номинала, что на столе</li>
                    <li>• Если не можете отбиться — берёте все карты со стола</li>
                    <li>• После раунда игроки добирают карты до 6 из колоды</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-green-300 mb-2">⭐ Особенности</h3>
                  <ul className="space-y-1 text-white/80">
                    <li>• Подсветка доступных карт в казуальном режиме</li>
                    <li>• Система "погонов" — если проигравший остался с 5+ картами</li>
                    <li>• Глазик над картой показывает, что противник знает эту карту</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-green-300 mb-2">👁️ Что знает противник</h3>
                  <ul className="space-y-1 text-white/80">
                    <li>• <strong>Легкая/Обычная:</strong> Ваш козырь в начале + козыри в конце игры</li>
                    <li>• <strong>Средняя:</strong> Ваш козырь в начале + козыри, которые вы забираете + все козыри в конце</li>
                    <li>• <strong>Сложная:</strong> Ваш козырь в начале + все карты, которые вы забираете + все карты в конце</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-green-300 mb-2">🎲 Подкидывание карт</h3>
                  <ul className="space-y-1 text-white/80">
                    <li>• <strong>Легкая:</strong> 60% шанс подкинуть</li>
                    <li>• <strong>Обычная:</strong> 50% шанс подкинуть</li>
                    <li>• <strong>Средняя:</strong> 75% шанс подкинуть</li>
                    <li>• <strong>Сложная:</strong> Всегда подкидывает</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setShowHowToPlay(false)}
                className="w-full mt-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500
                  text-white font-bold rounded-lg transition-all duration-200 active:scale-95"
              >
                Понятно!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
