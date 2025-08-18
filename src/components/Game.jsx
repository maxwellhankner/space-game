import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Simplified starfield component using built-in Three.js materials
const Starfield = () => {
  // Create starfield geometry and material
  const { geometry, material } = useMemo(() => {
    const STAR_COUNT = 5000; // Reduced from 10000
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
const Character = ({ rotation, position }) => {
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
      // Create a quaternion for the character's rotation
      const quaternion = new THREE.Quaternion();
      
      // Apply rotations in the same order as the camera calculations
      // First rotate around Y (yaw)
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation.y);
      quaternion.multiply(yawQuat);
      
      // Then rotate around X (pitch) - but in the rotated coordinate system
      const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotation.x);
      quaternion.multiply(pitchQuat);
      
      // Then rotate around Z (roll) - add the missing Z rotation
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotation.z);
      quaternion.multiply(rollQuat);
      
      // Apply the initial model orientation (facing forward)
      const initialQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
      quaternion.multiply(initialQuat);
      
      // Apply the quaternion to the scene
      scene.quaternion.copy(quaternion);
      
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

// Simple component that copies character rotation to camera
const CameraRotationSync = ({ characterRotation, characterPosition }) => {
  useFrame((state) => {
    const camera = state.camera;
    
    // Create a quaternion for the camera's rotation (same as character)
    const quaternion = new THREE.Quaternion();
    
    // Apply rotations in the same order as the character
    // First rotate around Y (yaw)
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), characterRotation.y);
    quaternion.multiply(yawQuat);
    
    // Then rotate around X (pitch)
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), characterRotation.x);
    quaternion.multiply(pitchQuat);
    
    // Then rotate around Z (roll)
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), characterRotation.z);
    quaternion.multiply(rollQuat);
    
    // Apply the quaternion to the camera
    camera.quaternion.copy(quaternion);
    
    // Calculate position to always be behind the character
    // Character's forward direction: (-sinY * cosX, sinX, -cosY * cosX)
    // Camera behind: opposite of forward direction
    const cosY = Math.cos(characterRotation.y);
    const sinY = Math.sin(characterRotation.y);
    const cosX = Math.cos(characterRotation.x);
    const sinX = Math.sin(characterRotation.x);
    
    // Camera distance behind character
    const cameraDistance = 15;
    
    // Calculate backward vector (opposite of forward)
    const backwardX = sinY * cosX;
    const backwardY = -sinX;
    const backwardZ = cosY * cosX;
    
    // Position camera behind character
    const cameraX = characterPosition.x + backwardX * cameraDistance;
    const cameraY = characterPosition.y + backwardY * cameraDistance;
    const cameraZ = characterPosition.z + backwardZ * cameraDistance;
    
    camera.position.set(cameraX, cameraY, cameraZ);
  });
  
  return null;
};

// Component that applies character rotation to cube using quaternions
const CubeRotationSync = ({ characterRotation, characterPosition }) => {
  const cubeRef = useRef();
  
  useFrame(() => {
    if (cubeRef.current) {
      // Create a quaternion for the cube's rotation (same as character)
      const quaternion = new THREE.Quaternion();
      
      // Apply rotations in the same order as the character
      // First rotate around Y (yaw)
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), characterRotation.y);
      quaternion.multiply(yawQuat);
      
      // Then rotate around X (pitch)
      const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), characterRotation.x);
      quaternion.multiply(pitchQuat);
      
      // Then rotate around Z (roll)
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), characterRotation.z);
      quaternion.multiply(rollQuat);
      
      // Apply the quaternion to the cube
      cubeRef.current.quaternion.copy(quaternion);
      
      // Calculate position to always be to the right of the character
      // Character's right vector is perpendicular to their forward direction
      // Forward: (-sinY * cosX, sinX, -cosY * cosX)
      // Right: (cosY, 0, -sinY) - simplified right vector
      const cosY = Math.cos(characterRotation.y);
      const sinY = Math.sin(characterRotation.y);
      
      // Offset distance from character
      const offsetDistance = 3;
      
      // Calculate right vector (perpendicular to forward direction)
      const rightX = cosY;
      const rightZ = -sinY;
      
      // Position cube to the right of character
      const cubeX = characterPosition.x + rightX * offsetDistance;
      const cubeY = characterPosition.y; // Same height as character
      const cubeZ = characterPosition.z + rightZ * offsetDistance;
      
      cubeRef.current.position.set(cubeX, cubeY, cubeZ);
    }
  });
  
  return (
    <mesh ref={cubeRef}>
      <boxGeometry args={[0.5, 5, 5]} />
      <meshStandardMaterial color="#ffaa00" />
    </mesh>
  );
};

// Base component for the two bases
const Base = ({ position, color, size = [40, 20, 40] }) => {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.2} />
    </mesh>
  );
};

// Data provider component that runs inside Canvas
const DataProvider = ({ onDataUpdate, characterRotation, characterPosition }) => {
  useFrame((state) => {
    const camera = state.camera;
    
    // Camera is now stationary, so we can get its fixed position and rotation
    const cameraData = {
      position: [
        Math.round(camera.position.x),
        Math.round(camera.position.y),
        Math.round(camera.position.z)
      ],
      rotation: [
        Math.round(camera.rotation.x * 180 / Math.PI),
        Math.round(camera.rotation.y * 180 / Math.PI),
        Math.round(camera.rotation.z * 180 / Math.PI)
      ],
      fov: Math.round(camera.fov)
    };
    
    // Character position is now dynamic based on movement
    const characterData = {
      position: [
        Math.round(characterPosition.x),
        Math.round(characterPosition.y),
        Math.round(characterPosition.z)
      ],
      rotation: [
        Math.round(characterRotation.x * 180 / Math.PI),
        Math.round(characterRotation.y * 180 / Math.PI),
        Math.round(characterRotation.z * 180 / Math.PI)
      ],
      status: 'ACTIVE'
    };
    
    onDataUpdate({ camera: cameraData, character: characterData });
  });
  
  return null; // This component doesn't render anything
};

// Combined monitor component
const Monitor = ({ data }) => {
  if (!data) return null;
  
  return (
    <>
      {/* Astronaut Monitor */}
      <div className="absolute bottom-4 left-4 z-10 bg-black/70 text-white p-3 rounded-lg font-mono text-xs backdrop-blur-sm border border-white/20">
        <div className="space-y-1">
          <div className="text-blue-400 font-semibold">ASTRONAUT MONITOR</div>
          <div>POS: [{data.character.position[0]}, {data.character.position[1]}, {data.character.position[2]}]</div>
          <div>ROT: [{data.character.rotation[0]}°, {data.character.rotation[1]}°, {data.character.rotation[2]}°]</div>
          <div>STATUS: {data.character.status}</div>
          <div className="text-yellow-400 text-xs">Raw: X:{data.character.rotation[0].toFixed(2)}° Y:{data.character.rotation[1].toFixed(2)}° Z:{data.character.rotation[2].toFixed(2)}°</div>
        </div>
      </div>

      {/* Camera Monitor */}
      <div className="absolute bottom-4 right-4 z-10 bg-black/70 text-white p-3 rounded-lg font-mono text-xs backdrop-blur-sm border border-white/20">
        <div className="space-y-1">
          <div className="text-green-400 font-semibold">CAMERA MONITOR</div>
          <div>POS: [{data.camera.position[0]}, {data.camera.position[1]}, {data.camera.position[2]}]</div>
          <div>ROT: [{data.camera.rotation[0]}°, {data.camera.rotation[1]}°, {data.camera.rotation[2]}°]</div>
          <div>FOV: {data.camera.fov}°</div>
          <div className="text-yellow-400 text-xs">Raw: X:{data.camera.rotation[0].toFixed(2)}° Y:{data.camera.rotation[1].toFixed(2)}° Z:{data.camera.rotation[2].toFixed(2)}°</div>
        </div>
      </div>
    </>
  );
};

const Game = ({ onBackToMenu }) => {
  const [monitorData, setMonitorData] = useState(null);
  const [characterRotation, setCharacterRotation] = useState({ x: 0, y: 0, z: 0 });
  const [characterVelocity, setCharacterVelocity] = useState({ x: 0, y: 0, z: 0 });
  const [characterPosition, setCharacterPosition] = useState({ x: 0, y: 0, z: 0 });
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [lastMouseY, setLastMouseY] = useState(0);

  // Handle mouse controls for character rotation
  const handleMouseDown = (e) => {
    setIsMouseDown(true);
    setLastMouseX(e.clientX);
    setLastMouseY(e.clientY);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e) => {
    if (isMouseDown) {
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;
      const sensitivity = 0.01; // Adjust this for rotation speed
      
      setCharacterRotation(prev => {
        // Calculate new pitch (X rotation) - no bounds, can look up as much as you want!
        const newPitch = prev.x - deltaY * sensitivity;
        
        // For yaw (Y rotation), we need to apply it in the camera's coordinate system
        // This means we need to account for the current pitch when calculating yaw
        const newYaw = prev.y - deltaX * sensitivity;
        
        return {
          x: newPitch,
          y: newYaw,
          z: 0 // No roll
        };
      });
      
      setLastMouseX(e.clientX);
      setLastMouseY(e.clientY);
    }
  };

  // Handle keyboard controls for thrust and rotation
  const handleKeyDown = (e) => {
    const thrustPower = 0.5;
    const rotationSpeed = 0.1; // Adjust this for rotation speed
    
    const cosY = Math.cos(characterRotation.y);
    const sinY = Math.sin(characterRotation.y);
    const cosX = Math.cos(characterRotation.x);
    const sinX = Math.sin(characterRotation.x);
    
    // Direction vectors
    const forward = { x: -sinY * cosX, y: sinX, z: -cosY * cosX };
    const right = { x: forward.z, y: 0, z: -forward.x }; // Simplified right vector
    const up = { x: cosY * sinX, y: -cosX, z: sinY * sinX };
    
    // Thrust multipliers for each direction
    const thrusts = {
      'w': forward,    // Forward
      's': { x: -forward.x, y: -forward.y, z: -forward.z }, // Backward
      'a': right,      // Left
      'd': { x: -right.x, y: -right.y, z: -right.z },       // Right
      'q': up,         // Up
      'e': { x: -up.x, y: -up.y, z: -up.z }                 // Down
    };
    
    const key = e.key.toLowerCase();
    if (thrusts[key]) {
      setCharacterVelocity(prev => ({
        x: prev.x + thrusts[key].x * thrustPower,
        y: prev.y + thrusts[key].y * thrustPower,
        z: prev.z + thrusts[key].z * thrustPower
      }));
    } else if (key === ' ') {
      setCharacterVelocity({ x: 0, y: 0, z: 0 });
    } else if (key === 'r') {
      // R key - roll left (negative Z rotation)
      setCharacterRotation(prev => ({
        ...prev,
        z: prev.z - rotationSpeed
      }));
    } else if (key === 'f') {
      // F key - roll right (positive Z rotation)
      setCharacterRotation(prev => ({
        ...prev,
        z: prev.z + rotationSpeed
      }));
    }
  };

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [characterRotation]);

  // Add mouse event listeners
  useEffect(() => {
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isMouseDown, lastMouseX, lastMouseY]);

  // Physics update loop
  useEffect(() => {
    const physicsInterval = setInterval(() => {
      setCharacterPosition(prev => {
        const newPos = {
          x: prev.x + characterVelocity.x,
          y: prev.y + characterVelocity.y,
          z: prev.z + characterVelocity.z
        };
        
        // Boundary check - prevent character from going too far
        const maxDistance = 400;
        
        return {
          x: Math.max(-maxDistance, Math.min(maxDistance, newPos.x)),
          y: Math.max(-maxDistance, Math.min(maxDistance, newPos.y)),
          z: Math.max(-maxDistance, Math.min(maxDistance, newPos.z))
        };
      });
    }, 16);

    return () => clearInterval(physicsInterval);
  }, [characterVelocity]);

  return (
    <div className="w-full h-full bg-black">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 75, near: 0.1, far: 1000 }}
        className="w-full h-full"
        gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[-100, 50, 0]} intensity={2.0} target-position={[110, 0, 0]} />
        <directionalLight position={[100, 50, 0]} intensity={2.0} target-position={[-110, 0, 0]} />
        
        <Starfield />
        
        <Base position={[-100, 0, 0]} color="#0a4a0a" size={[40, 20, 40]} />
        <Base position={[100, 0, 0]} color="#0a0a4a" size={[40, 20, 40]} />
        
        {/* Left sphere - Red */}
        <mesh position={[-30, 0, 0]}>
          <sphereGeometry args={[8, 16, 16]} />
          <meshStandardMaterial color="#ff4444" />
        </mesh>
        
        {/* Right sphere - Blue */}
        <mesh position={[0, 0, -30]}>
          <sphereGeometry args={[8, 16, 16]} />
          <meshStandardMaterial color="#4444ff" />
        </mesh>
        
        {/* Top sphere - Green */}
        <mesh position={[0, 30, 0]}>
          <sphereGeometry args={[8, 16, 16]} />
          <meshStandardMaterial color="#44ff44" />
        </mesh>
        
        {/* Bottom sphere - Yellow */}
        <mesh position={[0, -30, 0]}>
          <sphereGeometry args={[8, 16, 16]} />
          <meshStandardMaterial color="#ffff44" />
        </mesh>
        
        {/* Front sphere - Purple */}
        <mesh position={[30, 0, 0]}>
          <sphereGeometry args={[8, 16, 16]} />
          <meshStandardMaterial color="#ff44ff" />
        </mesh>
        
        {/* Back sphere - Orange */}
        <mesh position={[0, 0, 30]}>
          <sphereGeometry args={[8, 16, 16]} />
          <meshStandardMaterial color="#ff8844" />
        </mesh>
        
        <Character rotation={characterRotation} position={characterPosition} />
        
        {/* Cube rotation sync using quaternions like the character */}
        <CubeRotationSync characterRotation={characterRotation} characterPosition={characterPosition} />
        
        {/* Camera rotation sync using quaternions like the character */}
        <CameraRotationSync characterRotation={characterRotation} characterPosition={characterPosition} />
        
        <DataProvider onDataUpdate={setMonitorData} characterRotation={characterRotation} characterPosition={characterPosition} />
      </Canvas>
      
      {/* Combined Monitor */}
      <Monitor data={monitorData} />
    </div>
  );
};

export default Game; 