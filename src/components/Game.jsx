import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';

const Game = ({ onBackToMenu }) => {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        {/* Stars background */}
        <Stars radius={100} depth={50} count={5000} factor={4} />
        
        {/* Simple rotating cube */}
        <mesh rotation={[0.5, 0.5, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="orange" />
        </mesh>
        
        <OrbitControls />
      </Canvas>
      
      {/* Game UI Overlay */}
      <div className="absolute top-4 left-4 text-white z-10">
        <h1 className="text-2xl font-bold mb-2">Space Game</h1>
        <p className="text-sm opacity-80">Use mouse to rotate camera</p>
      </div>
      
      {/* Back to Menu Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onBackToMenu}
          className="px-4 py-2 text-sm font-medium text-white bg-black/50 hover:bg-black/70 rounded-lg transition-all duration-200 border border-white/20 backdrop-blur-sm"
        >
          ← Back to Menu
        </button>
      </div>
    </div>
  );
};

export default Game; 