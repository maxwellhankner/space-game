import React from 'react';

const StartScreen = ({ onStartGame }) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="text-center space-y-8 p-8 rounded-2xl bg-black shadow-2xl max-w-lg" style={{ border: '2px solid #008f11', borderTop: '6px solid #008f11' }}>
        <div className="space-y-4">
          <h1 className="text-6xl font-bold" style={{ color: '#008f11' }}>
            LOST GRAVITY
          </h1>
          <p className="text-xl max-w-md mx-auto" style={{ color: '#008f11', fontFamily: 'Courier New, monospace' }}>
            operation: navigate through an asteroid field in zero-gravity and destroy all enemies.
          </p>
        </div>
        
        <div className="pt-4">
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