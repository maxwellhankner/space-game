import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Starfield component
const Starfield = () => {
  const stars = useMemo(() => {
    const STAR_COUNT = 3000;
    const positions = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = Math.cbrt(Math.random()) * 500 + 500, s = Math.sqrt(1 - u * u);
      positions.push(r * s * Math.cos(t), r * s * Math.sin(t), r * u);
    }
    return positions;
  }, []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={stars.length / 3} array={new Float32Array(stars)} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={2} color="white" transparent opacity={0.9} sizeAttenuation />
    </points>
  );
};

// Character component
const Character = ({ characterQuaternion }) => {
  const { scene } = useGLTF('/models/astronaut-1.glb');
  const modelRef = useRef();

  useFrame(() => {
    if (scene) {
      scene.quaternion.copy(characterQuaternion);
    }
  });

  return (
    <group>
      <primitive ref={modelRef} object={scene} />
    </group>
  );
};

// Camera component
const Camera = ({ characterQuaternion }) => {
  useFrame((state) => {
    const camera = state.camera;
    camera.quaternion.copy(characterQuaternion);
    // Approach the character from behind and above
    const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(characterQuaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(characterQuaternion);
    
    camera.position.set(
      backward.x * 10 + up.x * 2,
      backward.y * 10 + up.y * 2,
      backward.z * 10 + up.z * 2
    );
  });
  
  return null;
};

// Controls component
const Controls = ({ onUpdateQuaternion }) => {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const mousePos = useRef({ x: 0, y: 0 });
  const characterQuaternion = useRef(new THREE.Quaternion());

  const handleMouseDown = (e) => {
    const canvas = document.getElementById('game-canvas');
    if (canvas && (e.target === canvas || canvas.contains(e.target))) {
      setIsMouseDown(true);
      mousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e) => {
    if (isMouseDown) {
      const deltaX = e.clientX - mousePos.current.x;
      const deltaY = e.clientY - mousePos.current.y;
      const sensitivity = 0.003;
      
      const pitchQuat = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0), 
        -deltaY * sensitivity
      );
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0), 
        -deltaX * sensitivity
      );
      
      characterQuaternion.current
        .multiply(pitchQuat)
        .multiply(yawQuat)
        .normalize();
      
      onUpdateQuaternion(characterQuaternion.current);
      mousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', () => setIsMouseDown(false));
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', () => setIsMouseDown(false));
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isMouseDown]);

  return null;
};

const Game = () => {
  const [characterQuaternion, setCharacterQuaternion] = useState(new THREE.Quaternion());

  return (
    <div className="w-full h-full bg-black">
      <Canvas
        id="game-canvas"
        camera={{ fov: 75, near: 0.1, far: 4000 }}
        className="w-full h-full"
        gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }}
      >
        <ambientLight intensity={.6} />
        <directionalLight position={[-200, 50, 0]} intensity={2.0} target-position={[210, 0, 0]} />
        <directionalLight position={[200, 50, 0]} intensity={2.0} target-position={[-210, 0, 0]} />
        <Starfield />
        <Character characterQuaternion={characterQuaternion} />
        <Camera characterQuaternion={characterQuaternion} />
        <Controls onUpdateQuaternion={setCharacterQuaternion} />
      </Canvas>
    </div>
  );
};

export default Game;