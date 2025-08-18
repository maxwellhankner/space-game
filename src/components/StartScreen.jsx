import React, { useState } from 'react';
import AudioPlayer from './AudioPlayer';

const FullscreenIcon = ({ isFullscreen }) => {
  return (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className="cursor-pointer hover:opacity-80 transition-opacity"
    >
      {isFullscreen ? (
        // Exit fullscreen icon
        <>
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
        </>
      ) : (
        // Enter fullscreen icon
        <>
          <path d="M3 8V3h5m9 0h5v5M3 16v5h5m13-5v5h-5" />
        </>
      )}
    </svg>
  );
};

const StartScreen = ({ onStartGame }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Update fullscreen state when it changes outside our control (e.g., Esc key)
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="text-center space-y-6 p-8 rounded-2xl bg-black shadow-2xl max-w-lg relative" style={{ border: '2px solid #008f11', borderTop: '6px solid #008f11' }}>
        {/* Fullscreen button in top-right corner */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4"
          style={{ color: '#008f11' }}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          <FullscreenIcon isFullscreen={isFullscreen} />
        </button>

        <div className="space-y-4">
          <h1 className="text-6xl font-bold" style={{ color: '#008f11' }}>
            LOST GRAVITY
          </h1>
          <p className="text-xl max-w-md mx-auto" style={{ color: '#008f11', fontFamily: 'Courier New, monospace' }}>
            operation: navigate through an asteroid field in zero-gravity and destroy all enemies.
          </p>
        </div>
        
        <div className="flex flex-col items-center space-y-6">
          <AudioPlayer />
          
          <button
            onClick={onStartGame}
            className="text-2xl font-semibold cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: '#008f11' }}
          >
            [START]
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartScreen; 