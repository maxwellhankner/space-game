import React from 'react';
import { useAudio } from '../context/AudioContext';

const AudioPlayer = () => {
  const { isPlaying, volume, togglePlay, handleVolumeChange } = useAudio();

  return (
    <div className="flex items-center justify-center space-x-4">
      <span className="text-sm font-medium" style={{ color: '#008f11' }}>MUSIC</span>
      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center"
      >
        {isPlaying ? (
          <div className="flex space-x-1">
            <div className="w-1 h-4" style={{ backgroundColor: '#008f11' }}></div>
            <div className="w-1 h-4" style={{ backgroundColor: '#008f11' }}></div>
          </div>
        ) : (
          <div className="w-0 h-0 border-l-[12px] border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent ml-1" style={{ borderLeftColor: '#008f11' }}></div>
        )}
      </button>
      
      <div className="flex items-center space-x-2">
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          className="w-20 h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:bg-[#008f11]"
          style={{ backgroundColor: '#1a1a1a' }}
        />
      </div>
    </div>
  );
};

export default AudioPlayer; 