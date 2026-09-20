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
  const [showHowToPlay, setShowHowToPlay] = useState(false);
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
          <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
            {t('gameTitle')}
          </h1>
          <p className="text-green-200/70 text-base">
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

        {/* Start Button */}
        <button
          onClick={() => onStartGame(selectedDifficulty, selectedDeckSize)}
          className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400
            text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/30
            transition-all duration-200 active:scale-95 hover:scale-[1.02] mb-4"
        >
          {t('startGame')}
        </button>

        {/* Settings Buttons */}
        <div className="grid grid-cols-4 gap-2 mb-4 w-full">
          <button
            onClick={changeSortMode}
            className="py-2 px-1 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs transition-colors truncate"
            title={sortMode === 'suit' ? t('sortBySuit') : sortMode === 'rank' ? t('sortByRank') : t('sortByRankTrump')}
          >
            {sortMode === 'suit' ? '🎨' : sortMode === 'rank' ? '🔢' : '🃏'}
          </button>
          <button
            onClick={changeSound}
            className={`py-2 px-1 rounded-xl font-bold text-xs transition-colors ${
              soundEnabled
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : 'bg-gray-600 hover:bg-gray-500 text-white/80'
            }`}
            title={soundEnabled ? t('soundOn') : t('soundOff')}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <button
            onClick={() => {
              const newValue = !hintsEnabled;
              setHintsEnabled(newValue);
              localStorage.setItem('durak_hints', String(newValue));
            }}
            className={`py-2 px-1 rounded-xl font-bold text-xs transition-colors ${
              hintsEnabled
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-gray-600 hover:bg-gray-500 text-white/80'
            }`}
            title={hintsEnabled ? t('hintsOn') : t('hintsOff')}
          >
            {hintsEnabled ? '💡' : '🚫'}
          </button>
          <button
            onClick={changeTheme}
            className="py-2 px-1 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center"
            title={`${t('theme')}: ${theme.name}`}
          >
            {theme.emoji}
          </button>
        </div>

        {/* How to Play Button */}
        <button
          onClick={() => setShowHowToPlay(true)}
          className="w-full mt-3 py-2 bg-white/10 hover:bg-white/20 text-white/80 text-sm rounded-lg
            transition-all duration-200 border border-white/20"
        >
          {t('howToPlay')}
        </button>

        {/* Version Info */}
        <div className="mt-4 text-center text-white/40 text-xs">
          v0.4
        </div>

        {/* How to Play Modal */}
        {showHowToPlay && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gradient-to-b from-green-800 to-green-900 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto border-2 border-green-600/50 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">{t('howToPlay')}</h2>
              
              <div className="space-y-4 text-white/90 text-sm">
                <div>
                  <h3 className="font-bold text-green-300 mb-2">{t('goal')}</h3>
                  <p>{t('goalText')}</p>
                </div>

                <div>
                  <h3 className="font-bold text-green-300 mb-2">{t('rules')}</h3>
                  <ul className="space-y-1 text-white/80">
                    <li>{t('rule1')}</li>
                    <li>{t('rule2')}</li>
                    <li>{t('rule3')}</li>
                    <li>{t('rule4')}</li>
                    <li>{t('rule5')}</li>
                    <li>{t('rule6')}</li>
                    <li>{t('rule7')}</li>
                    <li>{t('rule8')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-green-300 mb-2">{t('features')}</h3>
                  <ul className="space-y-1 text-white/80">
                    <li>{t('feature1')}</li>
                    <li>{t('feature2')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-green-300 mb-2">{t('whatBotKnows')}</h3>
                  <ul className="space-y-1 text-white/80">
                    <li>{t('whatBotKnows1')}</li>
                    <li>{t('whatBotKnows2')}</li>
                    <li>{t('whatBotKnows3')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-green-300 mb-2">{t('pogonySystem')}</h3>
                  <div className="text-white/80 text-sm space-y-2">
                    <p>{t('pogonyText')}</p>
                    <p className="text-white/60 text-xs">{t('pogonyCondition')}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowHowToPlay(false)}
                className="w-full mt-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500
                  text-white font-bold rounded-lg transition-all duration-200 active:scale-95"
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
