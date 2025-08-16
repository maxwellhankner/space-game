import React, { useState } from 'react';
import StartScreen from './components/StartScreen';
import Game from './components/Game';

function App() {
  const [gameStarted, setGameStarted] = useState(false);

  const handleStartGame = () => {
    setGameStarted(true);
  };

  const handleBackToMenu = () => {
    setGameStarted(false);
  };

  return (
    <div className="w-full h-full">
      {!gameStarted ? (
        <StartScreen onStartGame={handleStartGame} />
      ) : (
        <Game onBackToMenu={handleBackToMenu} />
      )}
    </div>
  );
}

export default App;
