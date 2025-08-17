import React, { useState } from 'react';
import StartScreen from './components/StartScreen';
import Game from './components/Game';
import AudioPlayer from './components/AudioPlayer';

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
      {/* Persistent Audio Player - stays mounted across all game states */}
      <div className="fixed top-4 left-4 z-50">
        <AudioPlayer />
      </div>
      
      {gameStarted ? (
        <Game onBackToMenu={handleBackToMenu} />
      ) : (
        <StartScreen onStartGame={handleStartGame} />
      )}
    </div>
  );
}

export default App;
