import React from 'react';

const StartScreen = ({ onStartGame }) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-black via-purple-900 to-blue-900">
      <div className="text-center space-y-8 p-8 rounded-2xl bg-black/30 backdrop-blur-sm border border-white/20 shadow-2xl">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text">
            SPACE GAME
          </h1>
          <p className="text-xl text-white/80 max-w-md">
            Welcome to the ultimate space adventure! Ready to explore the cosmos?
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={onStartGame}
            className="px-8 py-4 text-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl border border-white/20"
          >
            🚀 START GAME
          </button>
          
          <div className="text-sm text-white/60">
            <p>Use mouse to control camera • Scroll to zoom</p>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="flex justify-center space-x-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default StartScreen; 