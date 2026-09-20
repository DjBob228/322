import type React from 'react';
import { useState, useEffect } from 'react';
import { type Difficulty, type DeckSize } from '../types';
import { type Theme, themes, getNextTheme } from '../themes';
import { t } from '../i18n';

type SortMode = 'suit' | 'rank' | 'rank-trump';

interface MenuProps {
  onStartGame: (difficulty: Difficulty, deckSize: DeckSize) => void;
}

const HIGH_SCORE_KEY = 'durak_high_score';
const GAMES_PLAYED_KEY = 'durak_games_played';
const GAMES_WON_KEY = 'durak_games_won';

export const Menu: React.FC<MenuProps> = ({ onStartGame }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('easy');
  const [selectedDeckSize, setSelectedDeckSize] = useState<DeckSize>(36);
  const [highScore, setHighScore] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [gamesWon, setGamesWon] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(() => localStorage.getItem('durak_hints') !== 'false');
  const [sortMode, setSortMode] = useState<SortMode>(() => 
    (localStorage.getItem('durak_sort') as SortMode) || 'suit'
  );
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('durak_sound') !== 'false');
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => 
    (localStorage.getItem('durak_theme') as Theme) || 'green'
  );
  const theme = themes[currentTheme];

  const changeSortMode = () => {
    const modes: SortMode[] = ['suit', 'rank', 'rank-trump'];
    const currentIndex = modes.indexOf(sortMode);
    const newMode = modes[(currentIndex + 1) % modes.length];
    setSortMode(newMode);
    localStorage.setItem('durak_sort', newMode);
  };

  const changeSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('durak_sound', String(newValue));
  };

  const changeTheme = () => {
    const nextTheme = getNextTheme(currentTheme);
    setCurrentTheme(nextTheme);
    localStorage.setItem('durak_theme', nextTheme);
  };

  useEffect(() => {
    setHighScore(parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0'));
    setGamesPlayed(parseInt(localStorage.getItem(GAMES_PLAYED_KEY) || '0'));
    setGamesWon(parseInt(localStorage.getItem(GAMES_WON_KEY) || '0'));
  }, []);

  const difficulties = [
    { key: 'easy' as Difficulty, label: t('easy'), emoji: '😊', desc: t('easyDesc') },
    { key: 'medium' as Difficulty, label: t('medium'), emoji: '🤔', desc: t('mediumDesc') },
    { key: 'hard' as Difficulty, label: t('hard'), emoji: '😈', desc: t('hardDesc') },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-b ${theme.background} flex flex-col items-center justify-center p-4 relative overflow-y-auto overflow-x-hidden`}>
      {/* Background decoration with pattern */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        {/* Main suit symbols - larger and more prominent */}
        <div className="absolute top-10 left-10 text-9xl transform rotate-12 text-white drop-shadow-lg">♠</div>
        <div className="absolute top-20 right-20 text-9xl transform -rotate-12 text-white drop-shadow-lg">♥</div>
        <div className="absolute bottom-20 left-20 text-9xl transform rotate-45 text-white drop-shadow-lg">♦</div>
        <div className="absolute bottom-10 right-10 text-9xl transform -rotate-45 text-white drop-shadow-lg">♣</div>
        
        {/* Additional decorative pattern - smaller suits scattered */}
        <div className="absolute top-1/3 left-1/4 text-6xl transform rotate-12 opacity-30">♠</div>
        <div className="absolute top-1/4 right-1/3 text-6xl transform -rotate-20 opacity-30">♥</div>
        <div className="absolute bottom-1/3 right-1/4 text-6xl transform rotate-25 opacity-30">♦</div>
        <div className="absolute bottom-1/4 left-1/3 text-6xl transform -rotate-15 opacity-30">♣</div>
        
        {/* Decorative lines pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 41px),
            repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 41px)
          `
        }} />
      </div>

      <div className="relative z-10 max-w-md w-full">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg flex items-center justify-center gap-2">
            <span className="text-black">♠</span>
            <span className="text-red-500">♦</span>
            <span>{t('gameTitle').replace('🃏 ', '')}</span>
            <span className="text-black">♣</span>
            <span className="text-red-500">♥</span>
          </h1>
          <p className="text-green-200/70 text-base text-center">
            {t('subtitle')}
          </p>
        </div>

        {/* Stats */}
        {(highScore > 0 || gamesPlayed > 0) && (
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/10">
            <h3 className="text-white/80 text-sm font-medium mb-2 text-center">{t('statistics')}</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-yellow-400 text-xl font-bold">{highScore}</div>
                <div className="text-white/50 text-xs">{t('record')}</div>
              </div>
              <div>
                <div className="text-green-400 text-xl font-bold">{gamesWon}</div>
                <div className="text-white/50 text-xs">{t('wins')}</div>
              </div>
              <div>
                <div className="text-blue-400 text-xl font-bold">{gamesPlayed}</div>
                <div className="text-white/50 text-xs">{t('games')}</div>
              </div>
            </div>
          </div>
        )}

        {/* Difficulty Selection */}
        <div className="mb-6">
          <h3 className="text-white/80 text-sm font-medium mb-3 text-center">
            {t('difficulty')}
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
            {t('cardCount')}
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
              <div className="text-white font-bold text-lg mb-1">{t('cards36')}</div>
              <div className="text-white/50 text-xs">{t('classicGame')}</div>
              <div className="text-white/40 text-xs mt-1">{t('from6ToAce')}</div>
            </button>
            <button
              onClick={() => setSelectedDeckSize(52)}
              className={`p-4 rounded-xl transition-all duration-200 border-2
                ${selectedDeckSize === 52
                  ? 'bg-green-600/40 border-green-400 shadow-lg shadow-green-500/20'
                  : 'bg-black/20 border-transparent hover:bg-black/30 hover:border-white/20'
                }`}
            >
              <div className="text-white font-bold text-lg mb-1">{t('cards52')}</div>
              <div className="text-white/50 text-xs">{t('expandedGame')}</div>
              <div className="text-white/40 text-xs mt-1">{t('from2ToAce')}</div>
            </button>
          </div>
        </div>

        {/* Start Button and Settings */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => onStartGame(selectedDifficulty, selectedDeckSize)}
            className="flex-1 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400
              text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/30
              transition-all duration-200 active:scale-95 hover:scale-[1.02]"
          >
            {t('startGame')}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
            title="Настройки"
          >
            ⚙️
          </button>
        </div>

        {/* Version Info */}
        <div className="mt-4 text-center text-white/40 text-xs">
          v1.2
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
                    onClick={changeSortMode}
                    className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium text-xs transition-colors flex items-center gap-2"
                  >
                    <span className="text-xl">🃏</span>
                    <div className="text-left">
                      <div className="font-bold text-xs">Сортировка карт</div>
                      <div className="text-[10px] text-white/70">{sortMode === 'suit' ? 'По масти (по умолчанию)' : sortMode === 'rank' ? 'По рангу' : 'По рангу + козыри'}</div>
                    </div>
                  </button>
                  <button
                    onClick={changeSound}
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
                      <h4 className="font-bold text-green-300 mb-1 text-center">{t('goal')}</h4>
                      <p className="text-[11px]">{t('goalText')}</p>
                    </div>

                    <div>
                      <h4 className="font-bold text-green-300 mb-1 text-center">{t('pogonySystem')}</h4>
                      <p className="text-white/80 text-[11px]">{t('pogonyText')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full mt-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500
                  text-white font-bold text-sm rounded-lg transition-all duration-200 active:scale-95"
              >
                {t('understand')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
