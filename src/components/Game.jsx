import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Sophisticated starfield component using custom shaders
const Starfield = () => {
  const starMaterialRef = useRef();
  const starsRef = useRef();
  
  // Create starfield geometry and material
  const { geometry, material } = useMemo(() => {
    const STAR_COUNT = 10000;  // Reduced from 50000 for better performance
    const R_INNER = 200;  // Further back
    const R_OUTER = 1000;  // Further back

    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const phases = new Float32Array(STAR_COUNT);

    // Random points in a spherical shell
    for (let i = 0; i < STAR_COUNT; i++) {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = Math.cbrt(Math.random()) * (R_OUTER - R_INNER) + R_INNER;
      const s = Math.sqrt(1 - u * u);
      const x = r * s * Math.cos(t);
      const y = r * s * Math.sin(t);
      const z = r * u;

      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      sizes[i] = 1.0 + Math.random() * 0.2;  // Slightly bigger stars
      phases[i] = Math.random() * Math.PI * 2.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    // Custom shader material for stars
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: /* glsl */`
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float size = aSize * 2.0;
          float twinkle = 0.75 + 0.25 * sin(uTime * 1.5 + aPhase);
          gl_PointSize = size * twinkle * uPixelRatio * (300.0 / -mvPosition.z);
          vAlpha = 0.9 * twinkle;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */`
        varying float vAlpha;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float d = dot(p, p);
          float mask = step(0.0, 0.5 - d); // Maximum sharpness - stars are perfect circles
          gl_FragColor = vec4(vec3(1.0), vAlpha * mask);
        }
      `
    });

    return { geometry, material };
  }, []);

  // Animation loop
  useFrame((state) => {
    // Removed twinkling animation - stars stay static
    // if (starMaterialRef.current) {
    //   starMaterialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    // }
    
    // Keep stars in fixed position instead of following camera
    // if (starsRef.current) {
    //   starsRef.current.position.copy(state.camera.position);
    // }
  });

  return (
    <points ref={starsRef} geometry={geometry}>
      <primitive object={material} ref={starMaterialRef} />
    </points>
  );
};

// GLB Model component
const AstronautModel = () => {
  const { scene } = useGLTF('/models/astronaut-1.glb');
  
  // Clone the scene to avoid issues with multiple instances
  const modelRef = useRef();
  
  useMemo(() => {
    if (scene) {
      // Scale and position the model appropriately
      scene.scale.setScalar(1); // Adjust scale as needed
      scene.position.set(0, 0, 0);
      scene.rotation.y = Math.PI; // Rotate 180 degrees
    }
  }, [scene]);

  return <primitive ref={modelRef} object={scene} />;
};

// Asteroid component
const Asteroid = ({ position, rotation, scale, index }) => {
  const { scene } = useGLTF('/models/asteroid.glb');
  
  const clonedScene = useMemo(() => {
    if (scene) {
      const clone = scene.clone();
      clone.position.set(...position);
      clone.rotation.set(...rotation);
      clone.scale.setScalar(scale);
      
      // Ensure all meshes in the scene have materials
      clone.traverse((child) => {
        if (child.isMesh) {
          // Force all meshes to use our white material
          child.material = new THREE.MeshStandardMaterial({ 
            color: 'white', 
            roughness: 0.8,
            metalness: 0.1
          });
        }
      });
      
      console.log(`Asteroid ${index} loaded at:`, position, 'scale:', scale);
      return clone;
    }
    return null;
  }, [scene, position, rotation, scale, index]);

  if (!clonedScene) return null;
  
  return <primitive object={clonedScene} />;
};

// Base component for the two bases
const Base = ({ position, color, size = [40, 20, 40] }) => {
  console.log(`Creating base at position:`, position, `with color:`, color);
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.2} />
    </mesh>
  );
};

// Asteroid field component
const AsteroidField = () => {
  const asteroids = useMemo(() => {
    const asteroidCount = 15;
    const asteroids = [];
    
    console.log('Generating asteroid positions...');
    
    for (let i = 0; i < asteroidCount; i++) {
      const x = (Math.random() - 0.5) * 150;
      const y = (Math.random() - 0.5) * 150;
      const z = (Math.random() - 0.5) * 150;
      const scale = 4 + Math.random() * 5;
      const rotationX = Math.random() * Math.PI * 2;
      const rotationY = Math.random() * Math.PI * 2;
      const rotationZ = Math.random() * Math.PI * 2;
      
      asteroids.push({
        position: [x, y, z],
        rotation: [rotationX, rotationY, rotationZ],
        scale: scale
      });
      
      console.log(`Asteroid ${i}: pos [${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}], scale: ${scale.toFixed(1)}`);
    }
    
    return asteroids;
  }, []);

  return (
    <>
      {asteroids.map((asteroid, index) => (
        <Asteroid 
          key={index}
          index={index}
          position={asteroid.position}
          rotation={asteroid.rotation}
          scale={asteroid.scale}
        />
      ))}
    </>
  );
};

// Camera with GLB model child
const CameraWithModel = () => {
  const cameraRef = useRef();
  
  useFrame((state) => {
    if (cameraRef.current) {
      // Update the model position to always be in front of camera
      const camera = state.camera;
      const distance = 15;
      
      // Calculate position in front of camera
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(camera.quaternion);
      
      cameraRef.current.position.copy(camera.position);
      cameraRef.current.position.add(direction.multiplyScalar(distance));
      
      // Make the model face the same direction as the camera
      cameraRef.current.rotation.copy(camera.rotation);
    }
  });

  return (
    <group ref={cameraRef}>
      {/* GLB model as child of camera */}
      <AstronautModel />
    </group>
  );
};

const Game = ({ onBackToMenu }) => {
  return (
    <div className="w-full h-full bg-black">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 75, near: 0.1, far: 1000 }}
        className="w-full h-full"
        gl={{ 
          antialias: true,
          outputColorSpace: THREE.SRGBColorSpace 
        }}
        onCreated={({ gl, camera }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }}
      >
        {/* Lighting to see the white box */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[-100, 50, 0]} intensity={2.0} target-position={[110, 0, 0]} />
        <directionalLight position={[100, 50, 0]} intensity={2.0} target-position={[-110, 0, 0]} />
        
        {/* Sophisticated starfield with custom shaders */}
        <Starfield />
        
        {/* Asteroid field */}
        <AsteroidField />
        
        {/* Two bases at opposite ends */}
        <Base position={[-100, 0, 0]} color="#0a4a0a" size={[40, 20, 40]} />
        <Base position={[100, 0, 0]} color="#0a0a4a" size={[40, 20, 40]} />
        
        {/* Camera with GLB model child */}
        <CameraWithModel />
        
        {/* Simple orbit controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={100}
        />
      </Canvas>
      
      {/* Back to Menu Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onBackToMenu}
          className="px-4 py-2 text-sm font-medium text-white bg-black/50 hover:bg-black/70 rounded-lg transition-all duration-200 border border-white/20 backdrop-blur-sm"
        >
          ← Back to Menu
        </button>
      </div>
      
      {/* Simple Controls Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 text-center">
        <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">
          Left click + drag: Rotate • Right click + drag: Pan • Scroll: Zoom
        </p>
      </div>
    </div>
  );
};

export default Game; 