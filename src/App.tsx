import { useState } from 'react';
import { Menu } from './components/Menu';
import { Game } from './components/Game';
import { type Difficulty, type DeckSize } from './types';

type Screen = 'menu' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [deckSize, setDeckSize] = useState<DeckSize>(36);
  const [gameKey, setGameKey] = useState(0);

  const handleStartGame = (diff: Difficulty, deck: DeckSize) => {
    setDifficulty(diff);
    setDeckSize(deck);
    setGameKey(prev => prev + 1);
    setScreen('game');
  };

  const handleBackToMenu = () => {
    setScreen('menu');
  };

  return (
    <div className="w-full h-full min-h-screen overflow-x-hidden overflow-y-auto">
      {screen === 'menu' && (
        <Menu onStartGame={handleStartGame} />
      )}
      {screen === 'game' && (
        <Game
          key={gameKey}
          difficulty={difficulty}
          deckSize={deckSize}
          onBackToMenu={handleBackToMenu}
        />
      )}
    </div>
  );
}

export default App;
