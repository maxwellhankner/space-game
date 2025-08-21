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
const Character = ({ characterQuaternion }) => {
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
      const finalQuaternion = characterQuaternion.clone();
      
      // Apply the initial model orientation (facing forward)
      const initialQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
      finalQuaternion.multiply(initialQuat);
      
      // Apply the quaternion to the scene
      scene.quaternion.copy(finalQuaternion);
      
      // Keep character at center position
      scene.position.set(0, 0, 0);
    }
  });

  return (
    <group>
      <primitive ref={modelRef} object={scene} />
    </group>
  );
};

// Camera component that follows the character
const Camera = ({ characterQuaternion }) => {
  useFrame((state) => {
    const camera = state.camera;
    
    // Apply the character's quaternion directly to the camera
    camera.quaternion.copy(characterQuaternion);
    
    // Fixed camera position behind the character
    const cameraDistanceBehind = 10;
    const cameraHeightOffset = 2;

    // Create vectors for camera positioning
    const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(characterQuaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(characterQuaternion);
    
    // Calculate camera position by moving backward and up from center
    const cameraPosition = new THREE.Vector3(0, 0, 0);
    
    // Add offset in both directions
    cameraPosition.add(backward.multiplyScalar(cameraDistanceBehind));
    cameraPosition.add(up.multiplyScalar(cameraHeightOffset));
    
    // Set final camera position
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
  });
  
  return null;
};

// Controls component that handles only look-around controls
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
        <Character characterQuaternion={characterQuaternion} />
        <Camera characterQuaternion={characterQuaternion} />
        <Controls 
          onUpdateQuaternion={setCharacterQuaternion}
        />
      </Canvas>
    </div>
  );
};

export default Game;