import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Physics } from '@react-three/rapier';

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

// Base structure component for the two bases
const BaseStructure = ({ position, color }) => {
  const mainBaseSize = [40, 20, 40];
  const commandTowerSize = [10, 30, 10];
  const modulesSize = [15, 10, 15];
  const landingPadSize = [20, 2, 20];
  const walkwaySize = [5, 3, 15];

  return (
    <group position={position}>
      {/* Main base building */}
      <mesh position={[0, mainBaseSize[1]/2, 0]}>
        <boxGeometry args={mainBaseSize} />
        <meshStandardMaterial color={color} roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Command tower */}
      <mesh position={[0, mainBaseSize[1] + commandTowerSize[1]/2, 0]}>
        <boxGeometry args={commandTowerSize} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Surrounding modules */}
      {[
        [mainBaseSize[0]/2 + modulesSize[0]/2, modulesSize[1]/2, 0], // Right module
        [-mainBaseSize[0]/2 - modulesSize[0]/2, modulesSize[1]/2, 0], // Left module
        [0, modulesSize[1]/2, mainBaseSize[2]/2 + modulesSize[2]/2], // Front module
        [0, modulesSize[1]/2, -mainBaseSize[2]/2 - modulesSize[2]/2], // Back module
      ].map((modulePos, index) => (
        <mesh key={index} position={modulePos}>
          <boxGeometry args={modulesSize} />
          <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
        </mesh>
      ))}

      {/* Landing pads */}
      {[
        [mainBaseSize[0]/2 + landingPadSize[0]/2 + 10, landingPadSize[1]/2, mainBaseSize[2]/2], // Right pad
        [-mainBaseSize[0]/2 - landingPadSize[0]/2 - 10, landingPadSize[1]/2, -mainBaseSize[2]/2], // Left pad
      ].map((padPos, index) => (
        <mesh key={index} position={padPos}>
          <boxGeometry args={landingPadSize} />
          <meshStandardMaterial color={color} roughness={0.9} metalness={0.1} />
        </mesh>
      ))}

      {/* Connecting walkways */}
      {[
        [mainBaseSize[0]/2 + walkwaySize[0]/2, walkwaySize[1]/2, 0], // Right walkway
        [-mainBaseSize[0]/2 - walkwaySize[0]/2, walkwaySize[1]/2, 0], // Left walkway
        [0, walkwaySize[1]/2, mainBaseSize[2]/2 + walkwaySize[2]/2], // Front walkway
        [0, walkwaySize[1]/2, -mainBaseSize[2]/2 - walkwaySize[2]/2], // Back walkway
      ].map((walkwayPos, index) => (
        <mesh key={index} position={walkwayPos}>
          <boxGeometry args={walkwaySize} />
          <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
};

// Collidable asteroid component
const Asteroid = ({ position, radius = 15, segments = 16, onCollision, characterPosition }) => {
  const asteroidRef = useRef();
  const collisionRadius = radius * 1.2; // Slightly larger collision sphere
  
  // Collision check function
  const checkCollision = (characterPosition) => {
    if (asteroidRef.current) {
      const asteroidPos = asteroidRef.current.position;
      const distance = Math.sqrt(
        Math.pow(characterPosition.x - asteroidPos.x, 2) +
        Math.pow(characterPosition.y - asteroidPos.y, 2) +
        Math.pow(characterPosition.z - asteroidPos.z, 2)
      );
      return distance < collisionRadius;
    }
    return false;
  };

  // Simple collision check
  useFrame(() => {
    if (asteroidRef.current && onCollision && characterPosition) {
      // Always provide collision data for position checking
      onCollision(asteroidRef.current.position, collisionRadius);
    }
  });

  return (
    <group position={position} ref={asteroidRef}>
      {/* Visible asteroid */}
      <mesh>
        <sphereGeometry args={[radius, segments, segments]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} metalness={0.2} />
      </mesh>
      
      {/* Collision sphere (semi-transparent for debugging) */}
      <mesh>
        <sphereGeometry args={[collisionRadius, segments, segments]} />
        <meshStandardMaterial color="#ff0000" transparent opacity={0.1} wireframe />
      </mesh>
    </group>
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

// Custom hook for movement controls
const useMovementControls = (onBackToMenu) => {
  const [characterQuaternion, setCharacterQuaternion] = useState(new THREE.Quaternion());
  const [characterVelocity, setCharacterVelocity] = useState({ x: 0, y: 0, z: 0 });
  const [characterPosition, setCharacterPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotationalVelocity, setRotationalVelocity] = useState(new THREE.Vector3(0, 0, 0));
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [lastMouseY, setLastMouseY] = useState(0);
  const [collisionPoint, setCollisionPoint] = useState(null);
  const [collisionRadius, setCollisionRadius] = useState(0);

  const calculateDirectionVectors = (quaternion) => {
    const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
    const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
    const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);

    return {
      forward: { x: forwardVector.x, y: forwardVector.y, z: forwardVector.z },
      backward: { x: -forwardVector.x, y: -forwardVector.y, z: -forwardVector.z },
      right: { x: rightVector.x, y: rightVector.y, z: rightVector.z },
      left: { x: -rightVector.x, y: -rightVector.y, z: -rightVector.z },
      up: { x: upVector.x, y: upVector.y, z: upVector.z },
      down: { x: -upVector.x, y: -upVector.y, z: -upVector.z }
    };
  };

  const handleMouseDown = (e) => {
    // Find the canvas element
    const canvas = document.getElementById('game-canvas');
    // Check if the click target is the canvas or a child of the canvas
    if (canvas && (e.target === canvas || canvas.contains(e.target))) {
      setIsMouseDown(true);
      setLastMouseX(e.clientX);
      setLastMouseY(e.clientY);
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e) => {
    if (isMouseDown) {
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;
      
      // Reduced sensitivity for smoother movement
      const sensitivity = 0.003;
      
      setCharacterQuaternion(prev => {
        const newQuaternion = prev.clone();
        
        // Create and normalize rotation quaternions
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0), 
          -deltaY * sensitivity
        );
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0), 
          -deltaX * sensitivity
        );
        
        // Apply rotations in sequence and normalize
        newQuaternion.multiply(pitchQuat).multiply(yawQuat).normalize();
        return newQuaternion;
      });
      
      setLastMouseX(e.clientX);
      setLastMouseY(e.clientY);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onBackToMenu();
      return;
    }

    const thrustPower = 0.25;
    const key = e.key.toLowerCase();
    const directions = calculateDirectionVectors(characterQuaternion);
    
    // Map keys to direction names
    const keyMap = {
      'w': 'forward',
      's': 'backward',
      'd': 'right',
      'a': 'left',
      'e': 'up',
      'q': 'down'
    };
    
    if (keyMap[key]) {
      const thrustDirection = directions[keyMap[key]];
      setCharacterVelocity(prev => ({
        x: prev.x + thrustDirection.x * thrustPower,
        y: prev.y + thrustDirection.y * thrustPower,
        z: prev.z + thrustDirection.z * thrustPower
      }));
    } else if (key === ' ') {
      setCharacterVelocity({ x: 0, y: 0, z: 0 });
      setRotationalVelocity(new THREE.Vector3(0, 0, 0));
    } else if (key === 'r' || key === 'f') {
      const rollPower = 0.02;
      const maxSpeed = 0.1;
      const direction = key === 'r' ? 1 : -1;
      
      setRotationalVelocity(prev => {
        const newZ = Math.max(-maxSpeed, Math.min(maxSpeed, prev.z + rollPower * direction));
        return new THREE.Vector3(0, 0, newZ);
      });
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [characterQuaternion]);

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

  useEffect(() => {
    const physicsInterval = setInterval(() => {
      setCharacterPosition(prev => {
        const newPos = {
          x: prev.x + characterVelocity.x,
          y: prev.y + characterVelocity.y,
          z: prev.z + characterVelocity.z
        };
        
        const maxRadius = 400;
        // Calculate distance from center
        const distance = Math.sqrt(
          newPos.x * newPos.x + 
          newPos.y * newPos.y + 
          newPos.z * newPos.z
        );
        
        let boundedPos = { ...newPos };
        
        // If outside sphere, scale position back to sphere surface
        if (distance > maxRadius) {
          const scale = maxRadius / distance;
          boundedPos = {
            x: newPos.x * scale,
            y: newPos.y * scale,
            z: newPos.z * scale
          };
        }

        if (collisionPoint) {
          const newDistance = Math.sqrt(
            Math.pow(boundedPos.x - collisionPoint.x, 2) +
            Math.pow(boundedPos.y - collisionPoint.y, 2) +
            Math.pow(boundedPos.z - collisionPoint.z, 2)
          );
          
          if (newDistance < collisionRadius) {
            setCharacterVelocity({ x: 0, y: 0, z: 0 });
            return prev;
          }
        }
        
        return boundedPos;
      });

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

  return {
    characterQuaternion,
    characterPosition,
    setCollisionPoint,
    setCollisionRadius
  };
};

const Game = ({ onBackToMenu }) => {
  const [monitorData, setMonitorData] = useState(null);
  const {
    characterQuaternion,
    characterPosition,
    setCollisionPoint,
    setCollisionRadius
  } = useMovementControls(onBackToMenu);

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
        <Physics configuration={{ debug: true, gravity: [0, 0, 0] }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[-200, 50, 0]} intensity={2.0} target-position={[210, 0, 0]} />
          <directionalLight position={[200, 50, 0]} intensity={2.0} target-position={[-210, 0, 0]} />
          
          <Starfield />
          <BaseStructure position={[-200, 0, 0]} color="#0a4a0a" />
          <BaseStructure position={[200, 0, 0]} color="#ff8c00" />
          
          <Asteroid 
            position={[0, 0, -50]} 
            characterPosition={characterPosition}
            onCollision={(point, radius) => {
              setCollisionPoint(point);
              setCollisionRadius(radius);
            }}
          />
          
          <Character quaternion={characterQuaternion} position={characterPosition} />
          <CameraRotationSync characterQuaternion={characterQuaternion} characterPosition={characterPosition} />
          <DataProvider onDataUpdate={setMonitorData} characterQuaternion={characterQuaternion} characterPosition={characterPosition} />
        </Physics>
      </Canvas>
      
      <Monitor data={monitorData} />
    </div>
  );
};

export default Game;