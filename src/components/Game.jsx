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

// Third person camera that follows the character
const ThirdPersonCamera = ({ characterRotation, characterPosition }) => {
  useFrame((state) => {
    const camera = state.camera;
    const cameraDistance = 15;
    
    // Calculate camera position behind the character using consistent math
    const cosX = Math.cos(characterRotation.x);
    const sinX = Math.sin(characterRotation.x);
    const cosY = Math.cos(characterRotation.y);
    const sinY = Math.sin(characterRotation.y);
    
    // Camera position behind character - use the opposite of the forward vector
    // Character forward: (-sinY * cosX, sinX, -cosY * cosX)
    // Camera behind: (sinY * cosX, -sinX, cosY * cosX)
    const cameraX = characterPosition.x + sinY * cosX * cameraDistance;
    const cameraY = characterPosition.y - sinX * cameraDistance;
    const cameraZ = characterPosition.z + cosY * cosX * cameraDistance;
    
    camera.position.set(cameraX, cameraY, cameraZ);
    
    // Look at the character's position
    // This ensures the camera is always looking at the character
    camera.lookAt(characterPosition.x, characterPosition.y, characterPosition.z);
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

// Data provider component that runs inside Canvas
const DataProvider = ({ onDataUpdate, characterRotation, characterPosition }) => {
  useFrame((state) => {
    const camera = state.camera;
    
    // Calculate camera rotation using the exact same math as the camera positioning
    // This ensures perfect consistency between calculated rotation and actual camera behavior
    const cosX = Math.cos(characterRotation.x);
    const sinX = Math.sin(characterRotation.x);
    const cosY = Math.cos(characterRotation.y);
    const sinY = Math.sin(characterRotation.y);
    
    // Camera rotation should match the direction it's looking
    // The camera looks in the direction: (sinY * cosX, sinX, cosY * cosX)
    const cameraRotationX = Math.asin(sinX); // Pitch
    const cameraRotationY = Math.atan2(sinY * cosX, cosY * cosX); // Yaw
    
    const cameraData = {
      position: [
        Math.round(camera.position.x),
        Math.round(camera.position.y),
        Math.round(camera.position.z)
      ],
      rotation: [
        Math.round(cameraRotationX * 180 / Math.PI),
        Math.round(cameraRotationY * 180 / Math.PI),
        0 // No roll
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
        </div>
      </div>

      {/* Camera Monitor */}
      <div className="absolute bottom-4 right-4 z-10 bg-black/70 text-white p-3 rounded-lg font-mono text-xs backdrop-blur-sm border border-white/20">
        <div className="space-y-1">
          <div className="text-green-400 font-semibold">CAMERA MONITOR</div>
          <div>POS: [{data.camera.position[0]}, {data.camera.position[1]}, {data.camera.position[2]}]</div>
          <div>ROT: [{data.camera.rotation[0]}°, {data.camera.rotation[1]}°, {data.camera.rotation[2]}°]</div>
          <div>FOV: {data.camera.fov}°</div>
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
        // Calculate new pitch (X rotation) with bounds
        const newPitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, prev.x - deltaY * sensitivity));
        
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

  // Handle keyboard controls for thrust
  const handleKeyDown = (e) => {
    const thrustPower = 0.5;
    
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
        
        <mesh position={[0, 0, -20]}>
          <sphereGeometry args={[8, 16, 16]} />
          <meshStandardMaterial color="white" />
        </mesh>
        
        <Character rotation={characterRotation} position={characterPosition} />
        <ThirdPersonCamera characterRotation={characterRotation} characterPosition={characterPosition} />
        <DataProvider onDataUpdate={setMonitorData} characterRotation={characterRotation} characterPosition={characterPosition} />
      </Canvas>
      

      
      {/* Combined Monitor */}
      <Monitor data={monitorData} />
    </div>
  );
};

export default Game; 