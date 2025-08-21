import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
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
  // Reusable vectors to avoid creating new ones every frame
  const backward = useRef(new THREE.Vector3(0, 0, 1));
  const up = useRef(new THREE.Vector3(0, 1, 0));
  
  useFrame((state) => {
    const camera = state.camera;
    camera.quaternion.copy(characterQuaternion);
    
    // Update existing vectors instead of creating new ones
    backward.current.set(0, 0, 1).applyQuaternion(characterQuaternion);
    up.current.set(0, 1, 0).applyQuaternion(characterQuaternion);
    
    camera.position.set(
      backward.current.x * 10 + up.current.x * 2,
      backward.current.y * 10 + up.current.y * 2,
      backward.current.z * 10 + up.current.z * 2
    );
  });
  
  return null;
};

// Controls component
const Controls = ({ onUpdateQuaternion }) => {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const mousePos = useRef({ x: 0, y: 0 });
  const [quaternion, setQuaternion] = useState(new THREE.Quaternion());
  
  // Reusable quaternions and vectors to avoid creating new ones every frame
  const pitchQuat = useRef(new THREE.Quaternion());
  const yawQuat = useRef(new THREE.Quaternion());
  const tempQuat = useRef(new THREE.Quaternion());
  const xAxis = useRef(new THREE.Vector3(1, 0, 0));
  const yAxis = useRef(new THREE.Vector3(0, 1, 0));

  const handleMouseDown = (e) => {
    if (e.target.closest('#game-canvas')) {
      setIsMouseDown(true);
      mousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown) return;
    
    const deltaX = e.clientX - mousePos.current.x;
    const deltaY = e.clientY - mousePos.current.y;
    const sensitivity = 0.003;
    
    // Update existing quaternions instead of creating new ones
    pitchQuat.current.setFromAxisAngle(xAxis.current, -deltaY * sensitivity);
    yawQuat.current.setFromAxisAngle(yAxis.current, -deltaX * sensitivity);
    
    // Use temp quaternion to avoid mutating the original
    tempQuat.current.copy(quaternion)
      .multiply(pitchQuat.current)
      .multiply(yawQuat.current)
      .normalize();
    
    setQuaternion(tempQuat.current);
    onUpdateQuaternion(tempQuat.current);
    mousePos.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const handleMouseUp = () => setIsMouseDown(false);
    
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isMouseDown, quaternion]);

  return null;
};

// Fixed platform below the player
const Platform = ({ position }) => {
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CuboidCollider args={[5, 0.25, 5]} />
      <mesh receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[10, 0.5, 10]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
    </RigidBody>
  );
};

// Game component
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
        <Physics gravity={[0, 0, 0]} debug>
          <ambientLight intensity={.6} />
          <directionalLight position={[-200, 50, 0]} intensity={2.0} target-position={[210, 0, 0]} />
          <directionalLight position={[200, 50, 0]} intensity={2.0} target-position={[-210, 0, 0]} />
          <Starfield />
          <Platform position={[0, -5, 0]} />
          <Character characterQuaternion={characterQuaternion} />
          <Camera characterQuaternion={characterQuaternion} />
          <Controls onUpdateQuaternion={setCharacterQuaternion} />
        </Physics>
      </Canvas>
    </div>
  );
};

export default Game;