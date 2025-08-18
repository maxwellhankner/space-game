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

// Simple component that copies character rotation to camera
const CameraRotationSync = ({ characterQuaternion, characterPosition }) => {
  useFrame((state) => {
    const camera = state.camera;
    
    // Apply the character's quaternion directly to the camera
    camera.quaternion.copy(characterQuaternion);
    
    // Calculate position to always be behind the character
    // Extract Euler angles from quaternion for position calculations
    const euler = new THREE.Euler();
    euler.setFromQuaternion(characterQuaternion, 'YXZ');
    
    const cosY = Math.cos(euler.y);
    const sinY = Math.sin(euler.y);
    const cosX = Math.cos(euler.x);
    const sinX = Math.sin(euler.x);
    
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

// Base component for the two bases
const Base = ({ position, color, size = [40, 20, 40] }) => {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.2} />
    </mesh>
  );
};

// Asteroid component for navigation markers
const Asteroid = ({ position, color, radius = 8, segments = 16 }) => {
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, segments, segments]} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.2} />
    </mesh>
  );
};

// Data provider component that runs inside Canvas
const DataProvider = ({ onDataUpdate, characterQuaternion, characterPosition }) => {
  useFrame((state) => {
    const camera = state.camera;
    
    // Convert quaternion to Euler angles for display using the same rotation order as CameraRotationSync
    const euler = new THREE.Euler();
    euler.setFromQuaternion(camera.quaternion, 'YXZ'); // Y (yaw) → X (pitch) → Z (roll)
    
    const cameraData = {
      position: [
        Math.round(camera.position.x),
        Math.round(camera.position.y),
        Math.round(camera.position.z)
      ],
      rotation: [
        Math.round(euler.x * 180 / Math.PI),
        Math.round(euler.y * 180 / Math.PI),
        Math.round(euler.z * 180 / Math.PI)
      ],
      quaternion: [
        camera.quaternion.x.toFixed(3),
        camera.quaternion.y.toFixed(3),
        camera.quaternion.z.toFixed(3),
        camera.quaternion.w.toFixed(3)
      ],
      fov: Math.round(camera.fov)
    };
    
    // Character position is now dynamic based on movement
    // Extract Euler angles from quaternion for display
    const characterEuler = new THREE.Euler();
    characterEuler.setFromQuaternion(characterQuaternion, 'YXZ');
    
    const characterData = {
      position: [
        Math.round(characterPosition.x),
        Math.round(characterPosition.y),
        Math.round(characterPosition.z)
      ],
      rotation: [
        Math.round(characterEuler.x * 180 / Math.PI),
        Math.round(characterEuler.y * 180 / Math.PI),
        Math.round(characterEuler.z * 180 / Math.PI)
      ],
      quaternion: [
        characterQuaternion.x.toFixed(3),
        characterQuaternion.y.toFixed(3),
        characterQuaternion.z.toFixed(3),
        characterQuaternion.w.toFixed(3)
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
          <div className="text-yellow-400 text-xs">Euler: X:{data.character.rotation[0].toFixed(2)}° Y:{data.character.rotation[1].toFixed(2)}° Z:{data.character.rotation[2].toFixed(2)}°</div>
          <div className="text-purple-400 text-xs">Quat: [{data.character.quaternion[0]}, {data.character.quaternion[1]}, {data.character.quaternion[2]}, {data.character.quaternion[3]}]</div>
        </div>
      </div>

      {/* Camera Monitor */}
      <div className="absolute bottom-4 right-4 z-10 bg-black/70 text-white p-3 rounded-lg font-mono text-xs backdrop-blur-sm border border-white/20">
        <div className="space-y-1">
          <div className="text-green-400 font-semibold">CAMERA MONITOR</div>
          <div>POS: [{data.camera.position[0]}, {data.camera.position[1]}, {data.camera.position[2]}]</div>
          <div>ROT: [{data.camera.rotation[0]}°, {data.camera.rotation[1]}°, {data.camera.rotation[2]}°]</div>
          <div>FOV: {data.camera.fov}°</div>
          <div className="text-yellow-400 text-xs">Euler: X:{data.camera.rotation[0].toFixed(2)}° Y:{data.camera.rotation[1].toFixed(2)}° Z:{data.camera.rotation[2].toFixed(2)}°</div>
          <div className="text-purple-400 text-xs">Quat: [{data.camera.quaternion[0]}, {data.camera.quaternion[1]}, {data.camera.quaternion[2]}, {data.camera.quaternion[3]}]</div>
        </div>
      </div>
    </>
  );
};

const Game = ({ onBackToMenu }) => {
  const [monitorData, setMonitorData] = useState(null);
  const [characterQuaternion, setCharacterQuaternion] = useState(new THREE.Quaternion());
  const [characterVelocity, setCharacterVelocity] = useState({ x: 0, y: 0, z: 0 });
  const [characterPosition, setCharacterPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotationalVelocity, setRotationalVelocity] = useState(new THREE.Vector3(0, 0, 0));
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
      
      setCharacterQuaternion(prev => {
        // Create a new quaternion for the rotation changes
        const newQuaternion = prev.clone();
        
        // Create rotation quaternions for pitch (X) and yaw (Y)
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -deltaY * sensitivity);
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -deltaX * sensitivity);
        
        // Apply pitch first, then yaw (same order as before)
        newQuaternion.multiply(pitchQuat);
        newQuaternion.multiply(yawQuat);
        
        return newQuaternion;
      });
      
      setLastMouseX(e.clientX);
      setLastMouseY(e.clientY);
    }
  };

  // Handle keyboard controls for thrust and rotation
  const handleKeyDown = (e) => {
    // Handle Escape key
    if (e.key === 'Escape') {
      onBackToMenu();
      return;
    }

    const thrustPower = 0.25;
    const rotationSpeed = 0.1; // Adjust this for rotation speed
    
    // Extract Euler angles from quaternion for direction calculations
    const euler = new THREE.Euler();
    euler.setFromQuaternion(characterQuaternion, 'YXZ');
    
    const cosY = Math.cos(euler.y);
    const sinY = Math.sin(euler.y);
    const cosX = Math.cos(euler.x);
    const sinX = Math.sin(euler.x);
    const cosZ = Math.cos(euler.z);
    const sinZ = Math.sin(euler.z);
    
    // Calculate forward/backward vectors using quaternion
    const forwardVector = new THREE.Vector3(0, 0, -1);
    forwardVector.applyQuaternion(characterQuaternion);
    const forward = {
      x: forwardVector.x,
      y: forwardVector.y,
      z: forwardVector.z
    };
    
    const backward = {
      x: -forwardVector.x,
      y: -forwardVector.y,
      z: -forwardVector.z
    };
    
    // Calculate right vector using quaternion
    const rightVector = new THREE.Vector3(1, 0, 0);
    rightVector.applyQuaternion(characterQuaternion);
    const right = {
      x: rightVector.x,
      y: rightVector.y,
      z: rightVector.z
    };

    // Calculate up vector using quaternion
    const upVector = new THREE.Vector3(0, 1, 0);
    upVector.applyQuaternion(characterQuaternion);
    const up = {
      x: upVector.x,
      y: upVector.y,
      z: upVector.z
    };

    // Down is negative of up
    const down = {
      x: -upVector.x,
      y: -upVector.y,
      z: -upVector.z
    };
    
    // Left is negative of right
    const left = {
      x: -right.x,
      y: -right.y,
      z: -right.z
    };
    
    // Thrust multipliers for all directions
    const thrusts = {
      'w': forward,    // Forward
      's': backward,   // Backward
      'd': right,      // Right
      'a': left,       // Left
      'e': up,         // Up
      'q': down        // Down
    };
    
    const key = e.key.toLowerCase();
    if (thrusts[key]) {
      setCharacterVelocity(prev => ({
        x: prev.x + thrusts[key].x * thrustPower,
        y: prev.y + thrusts[key].y * thrustPower,
        z: prev.z + thrusts[key].z * thrustPower
      }));
    } else if (key === ' ') {
      // Space key - stop all motion
      setCharacterVelocity({ x: 0, y: 0, z: 0 });
      setRotationalVelocity(new THREE.Vector3(0, 0, 0));
    } else if (key === 'r') {
      // R key - add right roll velocity (positive Z rotation)
      const rollPower = 0.02; // Much slower roll speed
      setRotationalVelocity(prev => {
        // Add positive roll power, but don't exceed max speed
        const maxSpeed = 0.1;
        const newZ = Math.max(-maxSpeed, Math.min(maxSpeed, prev.z + rollPower));
        return new THREE.Vector3(0, 0, newZ);
      });
    } else if (key === 'f') {
      // F key - add left roll velocity (negative Z rotation)
      const rollPower = 0.02; // Much slower roll speed
      setRotationalVelocity(prev => {
        // Add negative roll power, but don't exceed max speed
        const maxSpeed = 0.1;
        const newZ = Math.max(-maxSpeed, Math.min(maxSpeed, prev.z - rollPower));
        return new THREE.Vector3(0, 0, newZ);
      });
    }
  };

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [characterQuaternion]);

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
      // Update position
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

      // Update rotation
      if (rotationalVelocity.x !== 0 || rotationalVelocity.y !== 0 || rotationalVelocity.z !== 0) {
        setCharacterQuaternion(prev => {
          const newQuaternion = prev.clone();
          const rotationQuat = new THREE.Quaternion();
          rotationQuat.setFromEuler(new THREE.Euler(
            rotationalVelocity.x,
            rotationalVelocity.y,
            rotationalVelocity.z,
            'XYZ'
          ));
          newQuaternion.multiply(rotationQuat);
          return newQuaternion;
        });
      }
    }, 16);

    return () => clearInterval(physicsInterval);
  }, [characterVelocity, rotationalVelocity]);

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
        
        {/* Navigation asteroids using the Asteroid component */}
        <Asteroid position={[-30, 0, 0]} color="#ff4444" />
        <Asteroid position={[0, 0, -30]} color="#4444ff" />
        <Asteroid position={[0, 30, 0]} color="#44ff44" />
        <Asteroid position={[0, -30, 0]} color="#ffff44" />
        <Asteroid position={[30, 0, 0]} color="#ff44ff" />
        <Asteroid position={[0, 0, 30]} color="#ff8844" />
        
        <Character quaternion={characterQuaternion} position={characterPosition} />
        
        {/* Camera rotation sync using quaternions like the character */}
        <CameraRotationSync characterQuaternion={characterQuaternion} characterPosition={characterPosition} />
        
        <DataProvider onDataUpdate={setMonitorData} characterQuaternion={characterQuaternion} characterPosition={characterPosition} />
      </Canvas>
      
      {/* Combined Monitor */}
      <Monitor data={monitorData} />
    </div>
  );
};

export default Game;