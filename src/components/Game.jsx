import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Game Configuration
const CONFIG = {
  starfield: {
    count: 3000,
    innerRadius: 500,
    outerRadius: 1000,
    brightness: 0.9,
    size: 2
  },
  camera: {
    fov: 75,
    near: 0.1,
    far: 4000,
    cameraBack: 10,
    cameraUp: 2
  },
  movement: {
    thrustPower: 0.25,
    rollPower: 0.02,
    maxRollSpeed: 0.1,
    mouseSensitivity: 0.003,
    maxRadius: 400
  }
};

const Starfield = () => {
  const { geometry, material } = useMemo(() => {
    const { count, innerRadius, outerRadius, brightness, size } = CONFIG.starfield;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = Math.cbrt(Math.random()) * (outerRadius - innerRadius) + innerRadius;
      const s = Math.sqrt(1 - u * u);
      
      const index = i * 3;
      positions[index] = r * s * Math.cos(t);
      positions[index + 1] = r * s * Math.sin(t);
      positions[index + 2] = r * u;
      
      colors[index] = colors[index + 1] = colors[index + 2] = brightness;
    }

    const geometry = new THREE.BufferGeometry()
      .setAttribute('position', new THREE.BufferAttribute(positions, 3))
      .setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return {
      geometry,
      material: new THREE.PointsMaterial({
        size,
        vertexColors: true,
        transparent: true,
        opacity: brightness,
        sizeAttenuation: true
      })
    };
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
    
    // Create vectors for camera positioning
    const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(characterQuaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(characterQuaternion);
    
    // Calculate camera position by moving backward and up from character position
    const cameraPosition = new THREE.Vector3(
      characterPosition.x,
      characterPosition.y,
      characterPosition.z
    );
    
    // Add offset in both directions using CONFIG values
    cameraPosition.add(backward.multiplyScalar(CONFIG.camera.cameraBack));
    cameraPosition.add(up.multiplyScalar(CONFIG.camera.cameraUp));
    
    // Set final camera position
    const cameraX = cameraPosition.x;
    const cameraY = cameraPosition.y;
    const cameraZ = cameraPosition.z;
    
    camera.position.set(cameraX, cameraY, cameraZ);
  });
  
  return null;
};

const BaseStructure = ({ position, color }) => {
  // Base structure dimensions
  const BASE_CONFIG = {
    main: [40, 20, 40],
    tower: [10, 30, 10],
    module: [15, 10, 15],
    landingPad: [20, 2, 20],
    walkway: [5, 3, 15]
  };
  
  const { main, tower, module, landingPad, walkway } = BASE_CONFIG;
  
  const structures = [
    {
      type: 'main',
      size: main,
      position: [0, main[1]/2, 0],
      material: { roughness: 0.8, metalness: 0.2 }
    },
    {
      type: 'tower',
      size: tower,
      position: [0, main[1] + tower[1]/2, 0],
      material: { roughness: 0.6, metalness: 0.4 }
    },
    // Modules
    ...['right', 'left', 'front', 'back'].map((side, i) => {
      const isHorizontal = i < 2;
      const sign = i % 2 === 0 ? 1 : -1;
      return {
        type: `module-${side}`,
        size: module,
        position: [
          isHorizontal ? sign * (main[0]/2 + module[0]/2) : 0,
          module[1]/2,
          !isHorizontal ? sign * (main[2]/2 + module[2]/2) : 0
        ],
        material: { roughness: 0.7, metalness: 0.3 }
      };
    }),
    // Landing pads
    ...['right', 'left'].map((side, i) => ({
      type: `pad-${side}`,
      size: landingPad,
      position: [
        (i === 0 ? 1 : -1) * (main[0]/2 + landingPad[0]/2 + 10),
        landingPad[1]/2,
        (i === 0 ? 1 : -1) * main[2]/2
      ],
      material: { roughness: 0.9, metalness: 0.1 }
    })),
    // Walkways
    ...['right', 'left', 'front', 'back'].map((side, i) => {
      const isHorizontal = i < 2;
      const sign = i % 2 === 0 ? 1 : -1;
      return {
        type: `walkway-${side}`,
        size: walkway,
        position: [
          isHorizontal ? sign * (main[0]/2 + walkway[0]/2) : 0,
          walkway[1]/2,
          !isHorizontal ? sign * (main[2]/2 + walkway[2]/2) : 0
        ],
        material: { roughness: 0.7, metalness: 0.3 }
      };
    })
  ];

  return (
    <group position={position}>
      {structures.map(({ type, size, position, material }) => (
        <mesh key={type} position={position}>
          <boxGeometry args={size} />
          <meshStandardMaterial color={color} {...material} />
        </mesh>
      ))}
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

// Displays real-time data about the character and camera positions
const Monitor = ({ data }) => {
  if (!data) return null;

  const renderPanel = (title, data, position, titleColor) => (
    <div className={`absolute bottom-4 ${position} z-10 bg-black/70 text-white p-3 rounded-lg font-mono text-xs backdrop-blur-sm border border-white/20`}>
      <div className="space-y-1">
        <div className={`${titleColor} font-semibold`}>{title}</div>
        <div>POS: [{data.position.join(', ')}]</div>
        <div>ROT: [{data.rotation.map(r => `${r}°`).join(', ')}]</div>
        {data.status && <div>STATUS: {data.status}</div>}
        {data.fov && <div>FOV: {data.fov}°</div>}
        <div className="text-yellow-400 text-xs">
          Euler: X:{data.rotation[0].toFixed(2)}° Y:{data.rotation[1].toFixed(2)}° Z:{data.rotation[2].toFixed(2)}°
        </div>
        <div className="text-purple-400 text-xs">
          Quat: [{data.quaternion.join(', ')}]
        </div>
      </div>
    </div>
  );
  
  return (
    <>
      {renderPanel("ASTRONAUT MONITOR", data.character, "left-4", "text-blue-400")}
      {renderPanel("CAMERA MONITOR", data.camera, "right-4", "text-green-400")}
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
    characterPosition
  };
};

const Game = ({ onBackToMenu }) => {
  const [monitorData, setMonitorData] = useState(null);
  const {
    characterQuaternion,
    characterPosition
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
        <ambientLight intensity={0.6} />
        <directionalLight position={[-200, 50, 0]} intensity={2.0} target-position={[210, 0, 0]} />
        <directionalLight position={[200, 50, 0]} intensity={2.0} target-position={[-210, 0, 0]} />
        
        <Starfield />
        <BaseStructure position={[-200, 0, 0]} color="#0a4a0a" />
        <BaseStructure position={[200, 0, 0]} color="#ff8c00" />
        
        <Character quaternion={characterQuaternion} position={characterPosition} />
        <CameraRotationSync characterQuaternion={characterQuaternion} characterPosition={characterPosition} />
        <DataProvider onDataUpdate={setMonitorData} characterQuaternion={characterQuaternion} characterPosition={characterPosition} />
      </Canvas>
      
      <Monitor data={monitorData} />
    </div>
  );
};

export default Game;