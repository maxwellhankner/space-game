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
      <div className="fixed top-4 left-8 z-50">
        <AudioPlayer />
      </div>
      
      {/* Back to Menu Button - positioned on the right */}
      {gameStarted && (
        <div className="fixed top-4 right-8 z-50 h-10 flex items-center">
          <button
            onClick={handleBackToMenu}
            className="text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer"
            style={{ color: '#008f11' }}
          >
            MENU
          </button>
        </div>
      )}
      
      {gameStarted ? (
        <Game onBackToMenu={handleBackToMenu} />
      ) : (
        <StartScreen onStartGame={handleStartGame} />
      )}
    </div>
  );
}

export default App;
