import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider, CylinderCollider, BallCollider } from '@react-three/rapier';
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

const Character = ({ rigidBodyRef, gravityType, currentAsteroid }) => {
  // Model setup
  const { scene } = useGLTF('/models/astronaut-1.glb');
  const modelRef = useRef();

  // Mouse control states
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [lastMouseY, setLastMouseY] = useState(0);
  
  // Store yaw rotation for sphere gravity
  const yawRotationRef = useRef(0);

  // Constants
  const CONTROLS = {
    sensitivity: 0.003,    // Mouse look sensitivity
    moveSpeed: 2.0,       // Movement speed
    gravity: 0.1,         // Gravity strength
    jumpForce: 5.0,       // Jump strength
  };

  // Reference vectors
  const worldUp = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  // Gravity zone handlers
  const gravityHandlers = {
    box: {
      enter: () => {
        yawRotationRef.current = 0; // Reset yaw when entering box gravity
        setGravityType('box');
      },
      exit: () => setGravityType('zero')
    },
    sphere: {
      enter: (asteroidData) => {
        yawRotationRef.current = 0; // Reset yaw when entering sphere gravity
        setCurrentAsteroid(asteroidData);
        setGravityType('sphere');
      },
      exit: () => {
        yawRotationRef.current = 0; // Reset yaw when exiting sphere gravity
        setCurrentAsteroid(null);
        setGravityType('zero');
      }
    }
  };
  
  useMemo(() => {
    if (scene) {
      scene.scale.setScalar(1);
      scene.position.set(0, 0, 0);
      scene.rotation.y = Math.PI;
    }
  }, [scene]);

  // Change character color based on gravity type
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh && child.material) {
          const color = gravityType === 'sphere' ? '#ff0000' : 
                       gravityType === 'box' ? '#0000ff' : 
                       '#ffffff';
          child.material.color.setHex(color.replace('#', '0x'));
        }
      });
    }
  }, [scene, gravityType]);



  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!rigidBodyRef.current) return;

      const key = e.key.toLowerCase();
      
      // Handle spacebar as brake/stop in all gravity types
      if (key === ' ') {
        // Immediate stop in all gravity types
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        return;
      }

      // Handle E key for jump in box and sphere gravity
      if (key === 'e' && (gravityType === 'box' || gravityType === 'sphere')) {
        if (gravityType === 'box') {
          // Jump in box gravity (upward)
          const currentVel = rigidBodyRef.current.linvel();
          rigidBodyRef.current.setLinvel({ 
            x: currentVel.x, 
            y: CONTROLS.jumpForce, 
            z: currentVel.z 
          }, true);
        } else if (gravityType === 'sphere' && currentAsteroid) {
          // Jump in sphere gravity (away from asteroid center)
          const characterPos = rigidBodyRef.current.translation();
          const asteroidPos = currentAsteroid.position;
          
          // Vector from asteroid to character (jump direction)
          const jumpDirection = new THREE.Vector3(
            characterPos.x - asteroidPos[0],
            characterPos.y - asteroidPos[1],
            characterPos.z - asteroidPos[2]
          ).normalize();
          
          // Apply jump force away from asteroid
          const currentVel = rigidBodyRef.current.linvel();
          const jumpVel = jumpDirection.multiplyScalar(CONTROLS.jumpForce);
          rigidBodyRef.current.setLinvel({ 
            x: currentVel.x + jumpVel.x, 
            y: currentVel.y + jumpVel.y, 
            z: currentVel.z + jumpVel.z 
          }, true);
        }
        return;
      }

      // Handle movement keys based on gravity state
      if (gravityType === 'box') {
        // In box gravity: WASD for ground movement, E handled separately above
        if (!['w', 's', 'a', 'd'].includes(key)) return;

        // Get current velocity and rotation
        const currentVel = rigidBodyRef.current.linvel();
        const rotation = rigidBodyRef.current.rotation();
        const quat = new THREE.Quaternion(
          rotation.x,
          rotation.y,
          rotation.z,
          rotation.w
        );

        // Calculate horizontal movement directions
        const forward = new THREE.Vector3(0, 0, -2).applyQuaternion(quat);
        forward.y = 0; // Keep movement horizontal
        forward.normalize();
        
        const right = new THREE.Vector3(2, 0, 0).applyQuaternion(quat);
        right.y = 0; // Keep movement horizontal
        right.normalize();
        
        // Get current velocity as Vector3, preserving vertical component
        const velocity = new THREE.Vector3(currentVel.x, currentVel.y, currentVel.z);
        
        // Add velocity in the appropriate direction while preserving existing momentum
        let movementVector = new THREE.Vector3(0, 0, 0);
        
        switch(key) {
          case 'w':
            movementVector.add(forward.multiplyScalar(CONTROLS.moveSpeed));
            break;
          case 's':
            movementVector.add(forward.multiplyScalar(-CONTROLS.moveSpeed));
            break;
          case 'd':
            movementVector.add(right.multiplyScalar(CONTROLS.moveSpeed));
            break;
          case 'a':
            movementVector.add(right.multiplyScalar(-CONTROLS.moveSpeed));
            break;
        }

        // Add new movement to existing velocity
        velocity.x += movementVector.x;
        velocity.z += movementVector.z;

        // Apply the new velocity
        rigidBodyRef.current.setLinvel(velocity, true);
      } else if (gravityType === 'sphere') {
        // In sphere gravity: WASD for surface movement, E handled separately above
        if (!['w', 's', 'a', 'd'].includes(key)) return;

        // Get current velocity and rotation
        const currentVel = rigidBodyRef.current.linvel();
        const rotation = rigidBodyRef.current.rotation();
        const quat = new THREE.Quaternion(
          rotation.x,
          rotation.y,
          rotation.z,
          rotation.w
        );

        // Calculate movement directions based on current rotation (similar to platform movement)
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
        
        // Get current velocity as Vector3
        const velocity = new THREE.Vector3(currentVel.x, currentVel.y, currentVel.z);
        
        // Add velocity in the appropriate direction while preserving existing momentum
        let movementVector = new THREE.Vector3(0, 0, 0);
        
        switch(key) {
          case 'w':
            movementVector.add(forward.multiplyScalar(CONTROLS.moveSpeed));
            break;
          case 's':
            movementVector.add(forward.multiplyScalar(-CONTROLS.moveSpeed));
            break;
          case 'd':
            movementVector.add(right.multiplyScalar(CONTROLS.moveSpeed));
            break;
          case 'a':
            movementVector.add(right.multiplyScalar(-CONTROLS.moveSpeed));
            break;
        }

        // Add new movement to existing velocity
        velocity.add(movementVector);

        // Apply the new velocity
        rigidBodyRef.current.setLinvel(velocity, true);
      } else {
        // In zero gravity: Full 6DOF movement
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
            velocity.add(forward.multiplyScalar(CONTROLS.moveSpeed));
            break;
          case 's':
            velocity.add(forward.multiplyScalar(-CONTROLS.moveSpeed));
            break;
          case 'd':
            velocity.add(right.multiplyScalar(CONTROLS.moveSpeed));
            break;
          case 'a':
            velocity.add(right.multiplyScalar(-CONTROLS.moveSpeed));
            break;
          case 'e':
            velocity.add(up.multiplyScalar(CONTROLS.moveSpeed));
            break;
          case 'q':
            velocity.add(up.multiplyScalar(-CONTROLS.moveSpeed));
            break;
        }

        // Apply the new velocity
        rigidBodyRef.current.setLinvel(velocity, true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [CONTROLS.moveSpeed, gravityType]);

  // Handle gravity and orientation
  useFrame(() => {
    if (!rigidBodyRef.current) return;

    // Get current velocity
    const currentVel = rigidBodyRef.current.linvel();
    let newVel = new THREE.Vector3(currentVel.x, currentVel.y, currentVel.z);

    // Handle gravity based on type
    if (gravityType === 'sphere' && currentAsteroid) {
      // In asteroid zone: apply gravity toward asteroid center and orient character
      const characterPos = rigidBodyRef.current.translation();
      const asteroidPos = currentAsteroid.position;
      
      // Vector from character to asteroid center (this becomes the character's "down" direction)
      const toAsteroid = new THREE.Vector3(
        asteroidPos[0] - characterPos.x,
        asteroidPos[1] - characterPos.y,
        asteroidPos[2] - characterPos.z
      ).normalize();
      
      // Apply gravity force toward asteroid center
      const gravityForce = toAsteroid.clone().multiplyScalar(CONTROLS.gravity * 2); // Stronger than platform gravity
      newVel.add(gravityForce);
      
      // Create quaternion that points character's down direction (negative Y) toward asteroid
      const uprightQuat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, -1, 0), // character's default down direction (feet)
        toAsteroid // new down direction (toward asteroid)
      );
      
      // For proper left/right rotation on the surface, we need to:
      // 1. Get the character's current forward direction after upright orientation
      // 2. Calculate the right vector (perpendicular to both up and forward)
      // 3. Rotate around the up vector using the right vector as reference
      
      // Get character's forward direction after upright orientation is applied
      const defaultForward = new THREE.Vector3(0, 0, -1); // Character's default forward
      const uprightForward = defaultForward.clone().applyQuaternion(uprightQuat);
      
      // Calculate the right vector (cross product of up and forward)
      const characterUp = toAsteroid.clone().negate(); // Character's up (away from asteroid)
      const rightVector = uprightForward.clone().cross(characterUp).normalize();
      
      // Create yaw rotation around the up vector
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(
        characterUp,
        yawRotationRef.current
      );
      
      // Apply yaw rotation to the upright quaternion
      const finalQuat = yawQuat.multiply(uprightQuat);
      
      // Apply the orientation
      rigidBodyRef.current.setRotation({
        x: finalQuat.x,
        y: finalQuat.y,
        z: finalQuat.z,
        w: finalQuat.w
      });
    } else if (gravityType === 'box') {
      // Regular downward gravity for platforms
      newVel.y -= CONTROLS.gravity;
    }

    // Apply the final velocity
    rigidBodyRef.current.setLinvel(newVel, true);
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
      
      // Get current rotation
      const currentRotation = rigidBodyRef.current.rotation();
      const currentQuat = new THREE.Quaternion(
        currentRotation.x,
        currentRotation.y,
        currentRotation.z,
        currentRotation.w
      );

      if (gravityType === 'box') {
        // In box gravity, only allow yaw rotation around world up axis
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(
          worldUp,
          -deltaX * CONTROLS.sensitivity
        );
        
        // Apply yaw rotation while maintaining upright orientation
        const newQuat = currentQuat.multiply(yawQuat);
        
        // Ensure character stays upright by aligning with world up
        const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(newQuat);
        const alignmentQuat = new THREE.Quaternion().setFromUnitVectors(currentUp, worldUp);
        newQuat.premultiply(alignmentQuat);
        
        rigidBodyRef.current.setRotation({
          x: newQuat.x,
          y: newQuat.y,
          z: newQuat.z,
          w: newQuat.w
        });
      } else if (gravityType === 'sphere') {
        // In sphere gravity, only allow yaw rotation (left/right)
        // Update the stored yaw rotation
        yawRotationRef.current += -deltaX * CONTROLS.sensitivity;
        
        // The orientation will be applied in the useFrame hook with the updated yaw
      } else {
        // In zero-g, allow full rotation
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          -deltaY * CONTROLS.sensitivity
        );
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          -deltaX * CONTROLS.sensitivity
        );
        
        // Apply rotations in sequence
        const newQuat = currentQuat.multiply(yawQuat).multiply(pitchQuat);
        
        rigidBodyRef.current.setRotation({
          x: newQuat.x,
          y: newQuat.y,
          z: newQuat.z,
          w: newQuat.w
        });
      }
      
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

  // Handle box gravity orientation
  useFrame(() => {
    if (!rigidBodyRef.current || gravityType !== 'box') return;

    // Get current rotation
    const currentRotation = rigidBodyRef.current.rotation();
    const currentQuat = new THREE.Quaternion(
      currentRotation.x,
      currentRotation.y,
      currentRotation.z,
      currentRotation.w
    );

    // Extract just the yaw rotation (rotation around Y axis)
    const euler = new THREE.Euler().setFromQuaternion(currentQuat, 'YXZ');
    euler.x = 0; // Zero out pitch
    euler.z = 0; // Zero out roll
    
    // Convert back to quaternion with only yaw preserved
    const uprightQuat = new THREE.Quaternion().setFromEuler(euler);
    
    // Directly set the rotation without interpolation
    rigidBodyRef.current.setRotation({
      x: uprightQuat.x,
      y: uprightQuat.y,
      z: uprightQuat.z,
      w: uprightQuat.w
    });
  });

  return (
    <RigidBody 
      ref={rigidBodyRef} 
      position={[0, 0, 0]} 
      type="dynamic"
      friction={0}
      linearDamping={0}

    >
      <primitive ref={modelRef} object={scene} />
      {/* Small center point sensor for gravity zone detection */}
      <CuboidCollider args={[0.1, 0.1, 0.1]} sensor />

      {/* Base cylinder collider for stable footing */}
      <CylinderCollider args={[0.5, 1]} position={[0, -4, 0]} />
      <mesh position={[0, -4, 0]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshBasicMaterial wireframe color="#00ff00" />
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
    
    // Use character's current up vector
    const characterUp = new THREE.Vector3(0, 1, 0).applyQuaternion(characterQuat);
    
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

const FollowCube = ({ characterRef, gravityType, currentAsteroid }) => {
  const cubeRef = useRef();
  const cubeOffset = useMemo(() => new THREE.Vector3(3, 0, 0), []); // 3 units to the right
  
  useFrame(() => {
    if (!characterRef.current || !cubeRef.current) return;

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
    
    // Calculate cube position based on character orientation
    const rotatedOffset = cubeOffset.clone().applyQuaternion(characterQuat);
    const targetPosition = new THREE.Vector3(
      physicsPosition.x + rotatedOffset.x,
      physicsPosition.y + rotatedOffset.y,
      physicsPosition.z + rotatedOffset.z
    );
    
    // Set cube position
    cubeRef.current.position.copy(targetPosition);
    
    // Set cube orientation based on gravity type
    if (gravityType === 'sphere' && currentAsteroid) {
      // In asteroid zone: orient cube to point toward asteroid center
      const asteroidPos = currentAsteroid.position;
      const cubePos = targetPosition;
      
      // Vector from cube to asteroid center
      const toAsteroid = new THREE.Vector3(
        asteroidPos[0] - cubePos.x,
        asteroidPos[1] - cubePos.y,
        asteroidPos[2] - cubePos.z
      ).normalize();
      
      // Create quaternion that points cube's up direction toward asteroid
      const cubeQuat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), // cube's default up direction
        toAsteroid // new up direction (toward asteroid)
      );
      
      cubeRef.current.quaternion.copy(cubeQuat);
    } else {
      // In other zones: match character orientation
      cubeRef.current.quaternion.copy(characterQuat);
    }
  });
  
  return (
    <mesh ref={cubeRef}>
      <boxGeometry args={[0.5, 2, 0.5]} /> {/* Small and tall cube */}
      <meshStandardMaterial color="#ffff00" /> {/* Yellow color */}
    </mesh>
  );
};

const Platform = ({ position, onEnterGravityZone, onExitGravityZone }) => {
  return (
    <>
      <RigidBody type="fixed" position={position}>
        {/* Platform mesh */}
        <mesh>
          <boxGeometry args={[20, 2, 20]} />
          <meshStandardMaterial color="#666666" />
        </mesh>
      </RigidBody>
      {/* Separate gravity zone */}
      <group position={[position[0], position[1] + 2, position[2]]}> {/* Position at top of platform */}
        {/* Visual representation only - no physics */}
        <mesh position={[0, 5.5, 0]}> {/* Move up by half height minus 1 */}
          <boxGeometry args={[20, 13, 20]} />
          <meshBasicMaterial color="#0094f4" transparent opacity={0.08} depthWrite={false} />
        </mesh>
        {/* Sensor-only collider */}
        <RigidBody type="fixed" colliders={false} sensor>
          <CuboidCollider 
            args={[10, 6.5, 10]}
            position={[0, 5.5, 0]}
            sensor
            onIntersectionEnter={onEnterGravityZone}
            onIntersectionExit={onExitGravityZone}
          />
        </RigidBody>
      </group>
    </>
  );
};

const Asteroid = ({ position, onEnterGravityZone, onExitGravityZone }) => {
  const radius = 25;
  const gravityRadius = radius * 1.75;

  return (
    <group position={position}>
      {/* Physical asteroid */}
      <RigidBody type="fixed">
        <mesh>
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial color="#666666" />
        </mesh>
        {/* Collider matches visual sphere exactly */}
        <BallCollider args={[radius]} />
      </RigidBody>

      {/* Gravity field visualization */}
      <mesh>
        <sphereGeometry args={[gravityRadius, 32, 32]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.08} depthWrite={false} />
      </mesh>

      {/* Gravity field sensor */}
      <RigidBody type="fixed" colliders={false} sensor>
        <BallCollider 
          args={[gravityRadius]}
          sensor
          onIntersectionEnter={() => onEnterGravityZone({ position, radius })}
          onIntersectionExit={onExitGravityZone}
        />
      </RigidBody>
    </group>
  );
};

const Game = ({ onBackToMenu }) => {
  const characterRigidBodyRef = useRef();
  const [gravityType, setGravityType] = useState('zero');
  const [currentAsteroid, setCurrentAsteroid] = useState(null);

  // Gravity zone handlers
  const gravityHandlers = {
    box: {
      enter: () => setGravityType('box'),
      exit: () => setGravityType('zero')
    },
    sphere: {
      enter: (asteroidData) => {
        setCurrentAsteroid(asteroidData);
        setGravityType('sphere');
      },
      exit: () => {
        setCurrentAsteroid(null);
        setGravityType('zero');
      }
    }
  };

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
          <Platform 
            position={[0, -8, -15]}
            onEnterGravityZone={gravityHandlers.box.enter}
            onExitGravityZone={gravityHandlers.box.exit}
          />
          <Asteroid 
            position={[60, 0, 0]}
            onEnterGravityZone={gravityHandlers.sphere.enter}
            onExitGravityZone={gravityHandlers.sphere.exit}
          />
          <Character 
            rigidBodyRef={characterRigidBodyRef}
            gravityType={gravityType}
            currentAsteroid={currentAsteroid}
          />
          <FollowCamera characterRef={characterRigidBodyRef} />
          <FollowCube 
            characterRef={characterRigidBodyRef} 
            gravityType={gravityType}
            currentAsteroid={currentAsteroid}
          />
        </Physics>
      </Canvas>
    </div>
  );
};

export default Game;
