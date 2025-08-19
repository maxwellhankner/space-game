import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
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
    offset: {
      back: 15,
      up: 5
    }
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

const Character = ({ rigidBodyRef }) => {
  const { scene } = useGLTF('/models/astronaut-1.glb');
  const modelRef = useRef();
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [lastMouseY, setLastMouseY] = useState(0);
  // Control settings
  const sensitivity = 0.003; // Mouse look sensitivity
  const velocityIncrement = 2.0; // Speed change per key press
  const [isBraking, setIsBraking] = useState(false);
  const brakeForce = 0.95; // How quickly velocity decreases (0-1)
  
  useMemo(() => {
    if (scene) {
      scene.scale.setScalar(1);
      scene.position.set(0, 0, 0);
      scene.rotation.y = Math.PI;
    }
  }, [scene]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!rigidBodyRef.current) return;

      const key = e.key.toLowerCase();
      if (key === ' ') {
        setIsBraking(true);
        return;
      }
      if (!['w', 's', 'a', 'd', 'e', 'q'].includes(key)) return;

      // Get current velocity and rotation
      const currentVel = rigidBodyRef.current.linvel();
      const rotation = rigidBodyRef.current.rotation();
      const quat = new THREE.Quaternion(
        rotation.x,
        rotation.y,
        rotation.z,
        rotation.w
      );

      // Calculate direction vectors based on current rotation
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
      
      // Get current velocity as Vector3
      const velocity = new THREE.Vector3(currentVel.x, currentVel.y, currentVel.z);
      
      // Add velocity in the appropriate direction
      switch(key) {
        case 'w':
          velocity.add(forward.multiplyScalar(velocityIncrement));
          break;
        case 's':
          velocity.add(forward.multiplyScalar(-velocityIncrement));
          break;
        case 'd':
          velocity.add(right.multiplyScalar(velocityIncrement));
          break;
        case 'a':
          velocity.add(right.multiplyScalar(-velocityIncrement));
          break;
        case 'e':
          velocity.add(up.multiplyScalar(velocityIncrement));
          break;
        case 'q':
          velocity.add(up.multiplyScalar(-velocityIncrement));
          break;
      }

      // Apply the new velocity
      rigidBodyRef.current.setLinvel(velocity, true);
    };

    const handleKeyUp = (e) => {
      if (e.key === ' ') {
        setIsBraking(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [velocityIncrement]);

  // Handle braking
  useFrame(() => {
    if (isBraking && rigidBodyRef.current) {
      // Get current velocities
      const currentVel = rigidBodyRef.current.linvel();
      const currentAngVel = rigidBodyRef.current.angvel();

      // Apply braking to linear velocity
      const newVel = new THREE.Vector3(
        currentVel.x * brakeForce,
        currentVel.y * brakeForce,
        currentVel.z * brakeForce
      );

      // Apply braking to angular velocity
      const newAngVel = new THREE.Vector3(
        currentAngVel.x * brakeForce,
        currentAngVel.y * brakeForce,
        currentAngVel.z * brakeForce
      );

      // Apply the reduced velocities
      rigidBodyRef.current.setLinvel(newVel, true);
      rigidBodyRef.current.setAngvel(newAngVel, true);

      // If velocities are very small, stop completely
      if (newVel.lengthSq() < 0.001 && newAngVel.lengthSq() < 0.001) {
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
  });

  const handleMouseDown = (e) => {
    const canvas = document.getElementById('game-canvas');
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
    if (isMouseDown && rigidBodyRef.current) {
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;
      
      const sensitivity = 0.003;
      
      // Get current rotation
      const currentRotation = rigidBodyRef.current.rotation();
      const currentQuat = new THREE.Quaternion(
        currentRotation.x,
        currentRotation.y,
        currentRotation.z,
        currentRotation.w
      );

      // Create rotation quaternions
      const pitchQuat = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        -deltaY * sensitivity
      );
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        -deltaX * sensitivity
      );
      
      // Apply rotations in sequence
      const newQuat = currentQuat.multiply(yawQuat).multiply(pitchQuat);
      
      // Update rigid body rotation
      rigidBodyRef.current.setRotation({
        x: newQuat.x,
        y: newQuat.y,
        z: newQuat.z,
        w: newQuat.w
      });
      
      setLastMouseX(e.clientX);
      setLastMouseY(e.clientY);
    }
  };

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

  return (
    <RigidBody 
      ref={rigidBodyRef} 
      position={[0, 0, 0]} 
      type="dynamic"
    >
      <primitive ref={modelRef} object={scene} />
      <CuboidCollider args={[0.5, 1, 0.5]} />
    </RigidBody>
  );
};

const BaseStructure = ({ position, color }) => {
  return (
    <RigidBody type="fixed" position={position}>
      <group>
        {/* Main building - base color */}
        <mesh position={[0, 10, 0]}>
          <boxGeometry args={[40, 20, 40]} />
          <meshStandardMaterial color={color} />
        </mesh>

        {/* Central tower - lighter */}
        <mesh position={[0, 35, 0]}>
          <boxGeometry args={[10, 30, 10]} />
          <meshStandardMaterial color={color === "#0a4a0a" ? "#0c6c0c" : "#ffae35"} />
        </mesh>

        {/* Side modules - each different */}
        <mesh position={[27.5, 5, 0]}>
          <boxGeometry args={[15, 10, 15]} />
          <meshStandardMaterial color={color === "#0a4a0a" ? "#084408" : "#ff7700"} />
        </mesh>
        <mesh position={[-27.5, 5, 0]}>
          <boxGeometry args={[15, 10, 15]} />
          <meshStandardMaterial color={color === "#0a4a0a" ? "#0c6e0c" : "#ffa01f"} />
        </mesh>
        <mesh position={[0, 5, 27.5]}>
          <boxGeometry args={[15, 10, 15]} />
          <meshStandardMaterial color={color === "#0a4a0a" ? "#073f07" : "#ff6b00"} />
        </mesh>
        <mesh position={[0, 5, -27.5]}>
          <boxGeometry args={[15, 10, 15]} />
          <meshStandardMaterial color={color === "#0a4a0a" ? "#0b5f0b" : "#ff9815"} />
        </mesh>

        {/* Landing pads - darker */}
        <mesh position={[35, 1, 20]}>
          <boxGeometry args={[20, 2, 20]} />
          <meshStandardMaterial color={color === "#0a4a0a" ? "#063606" : "#ff5500"} />
        </mesh>
        <mesh position={[-35, 1, -20]}>
          <boxGeometry args={[20, 2, 20]} />
          <meshStandardMaterial color={color === "#0a4a0a" ? "#063606" : "#ff5500"} />
        </mesh>
      </group>
    </RigidBody>
  );
};

const Asteroid = ({ position }) => {
  return (
    <RigidBody type="fixed" position={position}>
      <mesh>
        <sphereGeometry args={[10, 32, 32]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
    </RigidBody>
  );
};

const FollowCamera = ({ characterRef }) => {
  const cameraOffset = useMemo(() => new THREE.Vector3(0, CONFIG.camera.offset.up, CONFIG.camera.offset.back), []);
  const worldUp = useMemo(() => new THREE.Vector3(0, 1, 0), []); // World up vector for reference
  
  useFrame((state) => {
    if (!characterRef.current) return;

    const camera = state.camera;
    const rigidBody = characterRef.current;
    
    // Get character position and rotation
    const physicsPosition = rigidBody.translation();
    const physicsRotation = rigidBody.rotation();
    
    // Create quaternion from physics rotation
    const characterQuat = new THREE.Quaternion(
      physicsRotation.x,
      physicsRotation.y,
      physicsRotation.z,
      physicsRotation.w
    );
    
    // Calculate camera position based on character orientation
    const rotatedOffset = cameraOffset.clone().applyQuaternion(characterQuat);
    const targetPosition = new THREE.Vector3(
      physicsPosition.x + rotatedOffset.x,
      physicsPosition.y + rotatedOffset.y,
      physicsPosition.z + rotatedOffset.z
    );
    
    // Directly set camera position
    camera.position.copy(targetPosition);
    
    // Calculate character's up vector
    const characterUp = worldUp.clone().applyQuaternion(characterQuat);
    
    // Create target look position (character position)
    const targetLook = new THREE.Vector3(
      physicsPosition.x,
      physicsPosition.y,
      physicsPosition.z
    );
    
    // Calculate rotation matrix
    const targetMatrix = new THREE.Matrix4();
    
    // Forward vector (from camera to character)
    const forward = targetLook.clone().sub(camera.position).normalize();
    // Right vector (cross product of world up and forward)
    const right = forward.clone().cross(characterUp).normalize();
    // Recalculate up vector to ensure orthogonal basis
    const up = right.clone().cross(forward).normalize();
    
    // Build rotation matrix from orthogonal vectors and directly apply it
    targetMatrix.makeBasis(right, up, forward.negate());
    camera.quaternion.setFromRotationMatrix(targetMatrix);
  });
  
  return null;
};

const Game = ({ onBackToMenu }) => {
  const characterRigidBodyRef = useRef();

  return (
    <div className="w-full h-full bg-black">
      <Canvas
        id="game-canvas"
        camera={{
          position: [0, 0, 15],
          fov: CONFIG.camera.fov,
          near: CONFIG.camera.near,
          far: CONFIG.camera.far
        }}
        className="w-full h-full"
        gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace }}
      >
        <Physics gravity={[0, 0, 0]}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[-200, 50, 0]} intensity={2.0} target-position={[210, 0, 0]} />
          <directionalLight position={[200, 50, 0]} intensity={2.0} target-position={[-210, 0, 0]} />
          
          <Starfield />
          <BaseStructure position={[0, 0, 100]} color="#0a4a0a" /> {/* Green base */}
          <BaseStructure position={[0, 0, -100]} color="#ff8800" /> {/* Orange base */}
          <Character rigidBodyRef={characterRigidBodyRef} />
          <FollowCamera characterRef={characterRigidBodyRef} />
        </Physics>
      </Canvas>
    </div>
  );
};

export default Game;