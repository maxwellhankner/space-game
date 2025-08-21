import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Simplified starfield component using built-in Three.js materials
const Starfield = () => {
  // Create starfield geometry and material
  const { geometry, material } = useMemo(() => {
    const STAR_COUNT = 3000; // Reduced from 10000
    const R_INNER = 500;
    const R_OUTER = 1000;

    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);

    // Generate stars in a spherical shell
    for (let i = 0; i < STAR_COUNT; i++) {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = Math.cbrt(Math.random()) * (R_OUTER - R_INNER) + R_INNER;
      const s = Math.sqrt(1 - u * u);
      
      positions[i * 3] = r * s * Math.cos(t);
      positions[i * 3 + 1] = r * s * Math.sin(t);
      positions[i * 3 + 2] = r * u;
      
      // Simplified brightness - all stars same brightness
      const brightness = 0.9;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Simplified material
    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    return { geometry, material };
  }, []);

  return <points geometry={geometry} material={material} />;
};

// Character component that will be the center focal point
const Character = ({ quaternion, position }) => {
  const { scene } = useGLTF('/models/astronaut-1.glb');
  const modelRef = useRef();
  
  useMemo(() => {
    if (scene) {
      scene.scale.setScalar(1);
      scene.position.set(0, 0, 0);
      scene.rotation.y = Math.PI;
    }
  }, [scene]);

  useFrame(() => {
    if (modelRef.current && scene) {
      // Create a quaternion that combines the character's rotation with the initial model orientation
      const finalQuaternion = quaternion.clone();
      
      // Apply the initial model orientation (facing forward)
      const initialQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
      finalQuaternion.multiply(initialQuat);
      
      // Apply the quaternion to the scene
      scene.quaternion.copy(finalQuaternion);
      
      // Set position
      scene.position.set(position.x, position.y, position.z);
    }
  });

  return (
    <group>
      <primitive ref={modelRef} object={scene} />
    </group>
  );
};

// Camera component that follows the character
const Camera = ({ characterQuaternion, characterPosition }) => {
  useFrame((state) => {
    const camera = state.camera;
    
    // Apply the character's quaternion directly to the camera
    camera.quaternion.copy(characterQuaternion);
    
    // Calculate position to always be behind the character
    // Extract Euler angles from quaternion for position calculations
    const euler = new THREE.Euler();
    euler.setFromQuaternion(characterQuaternion, 'YXZ');
    
    // Camera distances
    const cameraDistanceBehind = 10;
    const cameraHeightOffset = 2;

    // Create vectors for camera positioning
    const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(characterQuaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(characterQuaternion);
    
    // Calculate camera position by moving backward and up from character position
    const cameraPosition = new THREE.Vector3(
      characterPosition.x,
      characterPosition.y,
      characterPosition.z
    );
    
    // Add offset in both directions
    cameraPosition.add(backward.multiplyScalar(cameraDistanceBehind));
    cameraPosition.add(up.multiplyScalar(cameraHeightOffset));
    
    // Set final camera position
    const cameraX = cameraPosition.x;
    const cameraY = cameraPosition.y;
    const cameraZ = cameraPosition.z;
    
    camera.position.set(cameraX, cameraY, cameraZ);
  });
  
  return null;
};

// Controls component that handles input and movement
const Controls = ({ onBackToMenu, onUpdatePosition, onUpdateQuaternion }) => {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const mousePos = useRef({ x: 0, y: 0 });
  const pressedKeys = useRef(new Set());
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const characterQuaternion = useRef(new THREE.Quaternion());
  const characterPosition = useRef(new THREE.Vector3(0, 0, 0));

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

  const handleKeyDown = (e) => {
    const key = e.key.toLowerCase();
    if (key === 'escape') {
      onBackToMenu();
      return;
    }
    pressedKeys.current.add(key);
  };

  const handleKeyUp = (e) => {
    pressedKeys.current.delete(e.key.toLowerCase());
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', () => setIsMouseDown(false));
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', () => setIsMouseDown(false));
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isMouseDown]);

  useFrame(() => {
    // Handle movement
    const thrustPower = 0.01;
    
    if (pressedKeys.current.has(' ')) {
      // Full stop
      velocity.current.set(0, 0, 0);
    } else if (pressedKeys.current.size > 0) {
      const moveDir = new THREE.Vector3();
      
      if (pressedKeys.current.has('w')) moveDir.z -= 1;
      if (pressedKeys.current.has('s')) moveDir.z += 1;
      if (pressedKeys.current.has('d')) moveDir.x += 1;
      if (pressedKeys.current.has('a')) moveDir.x -= 1;
      if (pressedKeys.current.has('e')) moveDir.y += 1;
      if (pressedKeys.current.has('q')) moveDir.y -= 1;

      if (moveDir.length() > 0) {
        moveDir.normalize().multiplyScalar(thrustPower);
        moveDir.applyQuaternion(characterQuaternion.current);
        velocity.current.add(moveDir);
      }
    }

    // Update position
    const newPos = characterPosition.current.clone().add(velocity.current);
    const maxRadius = 400;
    const distance = newPos.length();
    
    if (distance > maxRadius) {
      newPos.normalize().multiplyScalar(maxRadius);
      // Bounce off the boundary a bit
      velocity.current.multiplyScalar(-0.5);
    }
    
    characterPosition.current.copy(newPos);
    onUpdatePosition(characterPosition.current);

    // Handle roll
    if (pressedKeys.current.has('r') || pressedKeys.current.has('f')) {
      const rollPower = 0.02;
      const direction = pressedKeys.current.has('r') ? 1 : -1;
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        rollPower * direction
      );
      characterQuaternion.current.multiply(rollQuat);
      onUpdateQuaternion(characterQuaternion.current);
    }
  });

  return null;
};

const Game = ({ onBackToMenu }) => {
  const [characterQuaternion, setCharacterQuaternion] = useState(new THREE.Quaternion());
  const [characterPosition, setCharacterPosition] = useState(new THREE.Vector3(0, 0, 0));

  return (
    <div className="w-full h-full bg-black">
      <Canvas
        id="game-canvas"
        camera={{ position: [0, 0, 15], fov: 75, near: 0.1, far: 4000 }}
        className="w-full h-full"
        gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[-200, 50, 0]} intensity={2.0} target-position={[210, 0, 0]} />
        <directionalLight position={[200, 50, 0]} intensity={2.0} target-position={[-210, 0, 0]} />
        
        <Starfield />
        <Character quaternion={characterQuaternion} position={characterPosition} />
        <Camera characterQuaternion={characterQuaternion} characterPosition={characterPosition} />
        <Controls 
          onBackToMenu={onBackToMenu}
          onUpdatePosition={setCharacterPosition}
          onUpdateQuaternion={setCharacterQuaternion}
        />
      </Canvas>
    </div>
  );
};

export default Game;