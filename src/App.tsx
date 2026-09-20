import { useState } from 'react';
import { Menu } from './components/Menu';
import { Game } from './components/Game';

type Screen = 'menu' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [difficulty, setDifficulty] = useState('easy');
  const [deckSize, setDeckSize] = useState(36);
  const [gameKey, setGameKey] = useState(0);

  const handleStartGame = (diff: string, deck: number) => {
    setDifficulty(diff);
    setDeckSize(deck);
    setGameKey(prev => prev + 1);
    setScreen('game');
  };

  const handleBackToMenu = () => {
    setScreen('menu');
  };

  return (
    <div className="w-full h-full min-h-screen">
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
