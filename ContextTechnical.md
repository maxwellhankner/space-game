# LOST GRAVITY - Technical Implementation Plan

## Architecture Overview

### Core Systems
- **Rapier Physics World**: Single physics world managing all rigid bodies
- **GameContext**: State management for gravity modes and game state
- **Physics Components**: Modular physics bodies for character and world objects
- **Gravity Controllers**: State-specific physics behavior controllers

## Physics Implementation Strategy

### 1. Rapier World Setup
```jsx
// In Game.jsx - wrap Canvas with Physics provider
<Physics debug={false} gravity={[0, 0, 0]}>
  <GameWorld />
</Physics>
```

### 2. Character Physics Body
- **Base Rigid Body**: Dynamic body with mass and inertia
- **Collision Shape**: Capsule or cylinder for astronaut model
- **State Controllers**: Different physics behaviors per gravity mode

### 3. Gravity State Implementation

#### Zero-Gravity State
- **Physics**: Full dynamic body with physics collision responses
- **Movement**: Thruster-based propulsion (apply forces)
- **Rotation**: Quaternion-based look around (free rotation on all axes)
- **Gravity**: No gravity force applied
- **Character Behavior**: Floats freely, responds to all physics interactions
- **Control Scheme**: Mouse for rotation, keys for thruster activation

#### Box-Gravity State
- **Physics**: Dynamic body with NO physics collision responses
- **Movement**: Classic WASD walking with jumping
- **Rotation**: Euler angle look around (constrained to upright orientation)
- **Gravity**: Constant downward force (-Y direction)
- **Character Behavior**: Always upright, ground-based movement
- **Control Scheme**: Mouse for look around, WASD for movement

#### Sphere-Gravity State
- **Physics**: Dynamic body with NO physics collision responses
- **Movement**: Classic WASD walking with jumping (on curved surface)
- **Rotation**: Euler angle look around (constrained to spherical upright)
- **Gravity**: Radial force toward sphere center
- **Character Behavior**: Always "feet down" relative to sphere surface
- **Control Scheme**: Mouse for look around, WASD for movement

## Critical Technical Differences Between Gravity States

### Fundamental Control & Physics Differences

#### Zero-Gravity vs Box/Sphere-Gravity
- **Control System**: Completely different input handling
  - Zero-Gravity: Quaternion rotation + thruster forces
  - Box/Sphere: Euler angle look + WASD movement
- **Physics Response**: 
  - Zero-Gravity: Full physics collision responses
  - Box/Sphere: No physics collision responses (kinematic-like behavior)
- **Character Orientation**:
  - Zero-Gravity: Free-floating, any orientation
  - Box/Sphere: Constrained upright orientation

#### Box-Gravity vs Sphere-Gravity
- **Similarities**: Same control scheme, same physics behavior
- **Differences**: Only in how "upright" is calculated
  - Box: Vertical upright (Y-axis)
  - Sphere: Radial upright (toward sphere center)

## Technical Challenges & Solutions

### Challenge 1: Seamless State Transitions
- **Problem**: Completely different control systems and physics behaviors
- **Solution**: State machine with smooth transitions
- **Implementation**: 
  - Gradual constraint application/removal
  - Control system switching with interpolation
  - Physics body type switching (dynamic ↔ kinematic)

### Challenge 2: Character Orientation Management
- **Solution**: Quaternion-based orientation constraints
- **Implementation**: Use Rapier's joint constraints for box-gravity, custom logic for sphere-gravity

### Challenge 3: Collision Detection
- **Solution**: Different collision layers per gravity state
- **Implementation**: Rapier collision groups and masks

### Challenge 4: Performance Optimization
- **Solution**: Physics body pooling and LOD system
- **Implementation**: Only simulate nearby physics bodies

### Challenge 5: Zone Detection & State Switching
- **Problem**: Detecting when character enters/exits different gravity zones
- **Solution**: Invisible trigger volumes with physics sensors
- **Implementation**: 
  - Rapier sensor bodies for zone detection
  - Smooth state transitions with interpolation
  - Control system switching during transitions

### Challenge 6: Control System Switching
- **Problem**: Completely different input handling between states
- **Solution**: State-based input handlers with transition smoothing
- **Implementation**:
  - Separate input handlers per gravity state
  - Gradual control system switching
  - Input buffering during transitions

## Component Structure

### GameContext.jsx
```jsx
const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [gravityState, setGravityState] = useState('zero');
  const [characterBody, setCharacterBody] = useState(null);
  
  // State transition logic
  const transitionToState = (newState) => { ... };
  
  // Physics state management
  const updatePhysicsState = () => { ... };
};
```

### PhysicsCharacter.jsx
```jsx
const PhysicsCharacter = ({ gravityState, onStateChange }) => {
  const { scene } = useGLTF('/models/astronaut-1.glb');
  const rigidBodyRef = useRef();
  
  // Different physics behaviors per state
  useEffect(() => {
    if (rigidBodyRef.current) {
      updatePhysicsForState(gravityState);
    }
  }, [gravityState]);
  
  return (
    <RigidBody ref={rigidBodyRef}>
      <primitive object={scene} />
    </RigidBody>
  );
};
```

### GravityControllers/
- **ZeroGravityController.jsx**: Free movement and rotation
- **BoxGravityController.jsx**: Ground-based movement with constraints
- **SphereGravityController.jsx**: Spherical surface movement

### Transition System
- **ZoneDetector.jsx**: Invisible trigger volumes for gravity zones
- **StateTransitionManager.jsx**: Handles smooth transitions between states
- **ControlSystemSwitcher.jsx**: Manages input system changes during transitions

### Zone System
- **GravityZone.jsx**: Base class for all gravity zones
- **ZeroGravityZone.jsx**: Open space areas
- **BoxGravityZone.jsx**: Base/station areas with vertical gravity
- **SphereGravityZone.jsx**: Asteroid areas with radial gravity

## Implementation Approach - Avoiding Restarts

### Key Insight: Modular State System
Instead of trying to build one unified system, we'll create **completely separate systems** that can be switched between seamlessly. This prevents the complexity from building up and causing restarts.

### Phase 1: Foundation (Zero-Gravity Only)
- [ ] Set up Rapier physics world
- [ ] Create basic GameContext
- [ ] Convert character to physics body
- [ ] Implement zero-gravity state ONLY
- [ ] Test and refine zero-gravity before moving on

### Phase 2: Box-Gravity (Separate System)
- [ ] Create completely separate box-gravity system
- [ ] Implement box-gravity controls and physics
- [ ] Test box-gravity independently
- [ ] Create zone detection for box-gravity areas

### Phase 3: Sphere-Gravity (Extend Box System)
- [ ] Extend box-gravity system for spherical surfaces
- [ ] Add radial gravity calculations
- [ ] Test sphere-gravity independently

### Phase 4: Integration & Transitions
- [ ] Implement zone detection system
- [ ] Add state transition logic
- [ ] Smooth transitions between systems
- [ ] Final integration testing
