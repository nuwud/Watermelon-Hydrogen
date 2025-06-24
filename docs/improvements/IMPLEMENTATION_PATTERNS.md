# 🎯 Implementation Patterns & Best Practices

## Overview

This document provides concrete implementation patterns and best practices for common scenarios in the Watermelon Hydrogen 3D submenu system. These patterns are derived from successful implementations observed in the current codebase and represent battle-tested approaches.

## Core Implementation Patterns

### 1. State Management Pattern

#### The Guard-Protected Operation Pattern
```javascript
// Pattern: Guard-Protected Operation
class ProtectedOperation {
  constructor(guard, operation) {
    this.guard = guard;
    this.operation = operation;
  }
  
  async execute(context) {
    if (!this.guard.canExecute(context)) {
      throw new OperationBlockedError('Operation blocked by guard');
    }
    
    const unlock = this.guard.lock(context);
    try {
      return await this.operation(context);
    } finally {
      unlock();
    }
  }
}

// Usage Example
const scrollOperation = new ProtectedOperation(
  selectionGuard,
  (context) => {
    // Scroll implementation
    this.targetRotation += context.delta * this.angleStep;
    return this.animateToTarget();
  }
);
```

**When to Use**: Any operation that could conflict with other operations
**Benefits**: Prevents race conditions, clear error reporting, automatic cleanup

#### The State Transition Pattern
```javascript
// Pattern: Explicit State Transitions
class StateAwareComponent {
  constructor() {
    this.state = 'idle';
    this.transitions = {
      idle: ['animating', 'selecting'],
      animating: ['idle'],
      selecting: ['animating', 'idle']
    };
  }
  
  transitionTo(newState, context = {}) {
    if (!this.canTransitionTo(newState)) {
      console.warn(`Invalid transition: ${this.state} -> ${newState}`);
      return false;
    }
    
    this.emit('stateChange', { from: this.state, to: newState, context });
    this.state = newState;
    return true;
  }
  
  canTransitionTo(state) {
    return this.transitions[this.state]?.includes(state) ?? false;
  }
}
```

**When to Use**: Components with complex state interactions
**Benefits**: Predictable state changes, easier debugging, prevents invalid states

### 2. Memory Management Pattern

#### The Disposable Resource Pattern
```javascript
// Pattern: Disposable Resource Management
class DisposableResource {
  constructor() {
    this.resources = new Set();
    this.isDisposed = false;
  }
  
  addResource(resource) {
    if (this.isDisposed) {
      throw new Error('Cannot add resource to disposed object');
    }
    this.resources.add(resource);
    return resource;
  }
  
  dispose() {
    if (this.isDisposed) return;
    
    this.isDisposed = true;
    
    for (const resource of this.resources) {
      try {
        if (resource.dispose) {
          resource.dispose();
        } else if (resource.geometry) {
          resource.geometry.dispose();
        }
        if (resource.material) {
          if (Array.isArray(resource.material)) {
            resource.material.forEach(m => m.dispose());
          } else {
            resource.material.dispose();
          }
        }
      } catch (error) {
        console.warn('Error disposing resource:', error);
      }
    }
    
    this.resources.clear();
  }
}
```

**When to Use**: Any component managing Three.js resources
**Benefits**: Prevents memory leaks, centralized cleanup, error safety

#### The Resource Pool Pattern
```javascript
// Pattern: Object Pooling for Performance
class ResourcePool {
  constructor(factory, resetFn, maxSize = 50) {
    this.factory = factory;
    this.reset = resetFn;
    this.maxSize = maxSize;
    this.available = [];
    this.inUse = new WeakSet();
  }
  
  acquire() {
    let resource;
    
    if (this.available.length > 0) {
      resource = this.available.pop();
    } else {
      resource = this.factory();
    }
    
    this.inUse.add(resource);
    return resource;
  }
  
  release(resource) {
    if (!this.inUse.has(resource)) {
      console.warn('Releasing resource not from this pool');
      return;
    }
    
    this.inUse.delete(resource);
    
    if (this.available.length < this.maxSize) {
      this.reset(resource);
      this.available.push(resource);
    } else {
      // Pool is full, dispose the resource
      if (resource.dispose) resource.dispose();
    }
  }
}

// Usage Example
const meshPool = new ResourcePool(
  () => new THREE.Mesh(),
  (mesh) => {
    mesh.geometry = null;
    mesh.material = null;
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
  }
);
```

**When to Use**: Frequently created/destroyed objects
**Benefits**: Reduces GC pressure, improves performance, controls memory usage

### 3. Animation Coordination Pattern

#### The Animation Pipeline Pattern
```javascript
// Pattern: Sequenced Animation Pipeline
class AnimationPipeline {
  constructor() {
    this.stages = [];
    this.isRunning = false;
  }
  
  addStage(name, animation) {
    this.stages.push({ name, animation, completed: false });
    return this;
  }
  
  async execute() {
    if (this.isRunning) {
      throw new Error('Pipeline already running');
    }
    
    this.isRunning = true;
    
    try {
      for (const stage of this.stages) {
        await stage.animation();
        stage.completed = true;
        this.emit('stageComplete', stage.name);
      }
    } finally {
      this.isRunning = false;
      this.stages.forEach(stage => stage.completed = false);
    }
  }
  
  stop() {
    this.stages.forEach(stage => {
      if (stage.animation.stop) {
        stage.animation.stop();
      }
    });
    this.isRunning = false;
  }
}

// Usage Example
const showSubmenuPipeline = new AnimationPipeline()
  .addStage('scaleIn', () => gsap.to(submenu.scale, { x: 1, y: 1, z: 1, duration: 0.3 }))
  .addStage('fadeIn', () => gsap.to(submenu.material, { opacity: 1, duration: 0.2 }))
  .addStage('itemsAppear', () => animateItemsIn(submenu.items));
```

**When to Use**: Complex multi-stage animations
**Benefits**: Clear sequencing, easy to modify, reusable stages

#### The Animation State Sync Pattern
```javascript
// Pattern: Animation synchronized with component state
class StateSyncAnimation {
  constructor(component, property, targetValue, options = {}) {
    this.component = component;
    this.property = property;
    this.targetValue = targetValue;
    this.options = options;
  }
  
  async play() {
    if (!this.component.canAnimate()) {
      throw new Error('Component cannot animate in current state');
    }
    
    this.component.setAnimationState(true);
    
    try {
      await new Promise(resolve => {
        gsap.to(this.component[this.property], {
          ...this.targetValue,
          ...this.options,
          onComplete: resolve,
          onUpdate: () => {
            this.component.onAnimationUpdate?.();
          }
        });
      });
    } finally {
      this.component.setAnimationState(false);
    }
  }
}
```

**When to Use**: Animations that need to coordinate with component state
**Benefits**: Prevents animation conflicts, consistent state management

### 4. Event Management Pattern

#### The Event Bus Pattern
```javascript
// Pattern: Centralized Event Management
class ComponentEventBus {
  constructor() {
    this.listeners = new Map();
    this.middleware = [];
  }
  
  use(middleware) {
    this.middleware.push(middleware);
  }
  
  on(event, handler, options = {}) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    const wrappedHandler = options.once 
      ? (...args) => { handler(...args); this.off(event, wrappedHandler); }
      : handler;
    
    this.listeners.get(event).push(wrappedHandler);
    
    return () => this.off(event, wrappedHandler);
  }
  
  emit(event, ...args) {
    // Process through middleware
    const processedArgs = this.middleware.reduce(
      (acc, middleware) => middleware(event, acc),
      args
    );
    
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(...processedArgs);
      } catch (error) {
        console.error(`Error in event handler for '${event}':`, error);
      }
    });
  }
  
  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
}
```

**When to Use**: Components that need to communicate without tight coupling
**Benefits**: Loose coupling, middleware support, error isolation

### 5. Async Operation Pattern

#### The Operation Queue Pattern
```javascript
// Pattern: Serialized Async Operations
class OperationQueue {
  constructor(concurrency = 1) {
    this.queue = [];
    this.running = 0;
    this.concurrency = concurrency;
  }
  
  async add(operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        operation,
        resolve,
        reject
      });
      
      this.process();
    });
  }
  
  async process() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }
    
    this.running++;
    const { operation, resolve, reject } = this.queue.shift();
    
    try {
      const result = await operation();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process(); // Process next operation
    }
  }
}

// Usage Example
const submenuOperations = new OperationQueue(1); // Serialize submenu operations

// Safe submenu operations
submenuOperations.add(() => openSubmenu('gallery'));
submenuOperations.add(() => closeCurrentSubmenu());
submenuOperations.add(() => openSubmenu('services'));
```

**When to Use**: Operations that must not run concurrently
**Benefits**: Prevents race conditions, maintains operation order, handles errors gracefully

### 6. Component Factory Pattern

#### The Configurable Factory Pattern
```javascript
// Pattern: Component Factory with Configuration
class ComponentFactory {
  constructor() {
    this.constructors = new Map();
    this.defaultConfigs = new Map();
    this.instances = new Map(); // For singletons
  }
  
  register(type, constructor, defaultConfig = {}, options = {}) {
    this.constructors.set(type, constructor);
    this.defaultConfigs.set(type, defaultConfig);
    
    if (options.singleton) {
      this.instances.set(type, null);
    }
  }
  
  create(type, config = {}, dependencies = {}) {
    const Constructor = this.constructors.get(type);
    if (!Constructor) {
      throw new Error(`Component type '${type}' not registered`);
    }
    
    // Check for singleton
    if (this.instances.has(type)) {
      const existing = this.instances.get(type);
      if (existing) return existing;
    }
    
    const mergedConfig = {
      ...this.defaultConfigs.get(type),
      ...config
    };
    
    const instance = new Constructor(mergedConfig, dependencies);
    
    // Store singleton
    if (this.instances.has(type)) {
      this.instances.set(type, instance);
    }
    
    return instance;
  }
}

// Usage Example
const factory = new ComponentFactory();

factory.register('submenu', Carousel3DSubmenu, {
  radius: 2,
  itemCount: 8,
  animationDuration: 0.3
});

factory.register('guard', SelectionGuard, {
  debugMode: false,
  autoRepairTimeout: 5000
}, { singleton: true });

const submenu = factory.create('submenu', { radius: 3 });
const guard = factory.create('guard'); // Same instance every time
```

**When to Use**: Creating configured component instances
**Benefits**: Centralized configuration, dependency injection, singleton support

## Best Practices

### 1. Error Handling

#### Always Use Try-Catch in Async Operations
```javascript
// Good: Comprehensive error handling
async function safeOperation() {
  try {
    const result = await riskyOperation();
    return result;
  } catch (error) {
    console.error('Operation failed:', error);
    // Graceful degradation
    return fallbackValue;
  } finally {
    // Cleanup regardless of success/failure
    cleanup();
  }
}
```

#### Validate Inputs Early
```javascript
// Good: Early validation
function selectItem(index) {
  if (typeof index !== 'number' || index < 0 || index >= this.items.length) {
    throw new Error(`Invalid index: ${index}`);
  }
  
  // Implementation continues...
}
```

### 2. Performance Optimization

#### Use Object Pooling for Frequent Allocations
```javascript
// Good: Reuse expensive objects
const geometryPool = new ResourcePool(
  () => new THREE.BoxGeometry(1, 1, 1),
  (geometry) => { /* reset geometry */ }
);

// Acquire/release instead of new/dispose
const geometry = geometryPool.acquire();
// Use geometry...
geometryPool.release(geometry);
```

#### Batch Operations When Possible
```javascript
// Good: Batch DOM/Three.js operations
function updateMultipleItems(updates) {
  // Batch all updates
  updates.forEach(({ item, properties }) => {
    Object.assign(item, properties);
  });
  
  // Single render trigger
  this.requestRender();
}
```

### 3. State Management

#### Make State Changes Explicit
```javascript
// Good: Clear state transitions
function startAnimation() {
  if (!this.canStartAnimation()) {
    throw new Error('Cannot start animation in current state');
  }
  
  this.setState('animating');
  // Animation logic...
}
```

#### Use Immutable Updates Where Possible
```javascript
// Good: Immutable state updates
function updateItem(index, changes) {
  const newItems = [...this.items];
  newItems[index] = { ...newItems[index], ...changes };
  this.items = newItems;
}
```

### 4. Memory Management

#### Always Dispose Three.js Resources
```javascript
// Good: Comprehensive disposal
dispose() {
  // Stop animations first
  gsap.killTweensOf(this);
  
  // Dispose Three.js resources
  this.traverse(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
  
  // Clear references
  this.items = null;
  this.parent?.remove(this);
}
```

#### Use WeakMap/WeakSet for Temporary Associations
```javascript
// Good: Automatic cleanup of temporary data
const itemMetadata = new WeakMap();

function setItemMetadata(item, data) {
  itemMetadata.set(item, data);
}

// When item is garbage collected, metadata is automatically removed
```

### 5. Testing Patterns

#### Use Dependency Injection for Testability
```javascript
// Good: Testable component
class TestableComponent {
  constructor(dependencies = {}) {
    this.eventBus = dependencies.eventBus || new EventBus();
    this.renderer = dependencies.renderer || new THREE.WebGLRenderer();
    this.timer = dependencies.timer || Date;
  }
}

// Easy to test with mocks
const mockEventBus = { emit: jest.fn(), on: jest.fn() };
const component = new TestableComponent({ eventBus: mockEventBus });
```

#### Create Test Utilities
```javascript
// Good: Reusable test utilities
class TestUtils {
  static createMockSubmenu(config = {}) {
    return {
      items: config.items || [],
      selectItem: jest.fn(),
      dispose: jest.fn(),
      ...config
    };
  }
  
  static async waitForAnimation(duration = 300) {
    return new Promise(resolve => setTimeout(resolve, duration));
  }
}
```

## Anti-Patterns to Avoid

### 1. Manual State Coordination
```javascript
// Bad: Manual flag coordination
if (this.isAnimating && !this.isSelecting && !this.isTransitioning) {
  // Complex conditions are error-prone
}

// Good: Use state machine or guard objects
if (this.guard.canOperate()) {
  // Clear, testable condition
}
```

### 2. Scattered Resource Management
```javascript
// Bad: Resources disposed in multiple places
dispose() {
  this.mesh.geometry.dispose(); // What about materials?
}

// Good: Centralized resource tracking
dispose() {
  this.resources.forEach(resource => resource.dispose());
}
```

### 3. Callback Hell
```javascript
// Bad: Nested callbacks
animate(() => {
  fadeIn(() => {
    scaleUp(() => {
      // Difficult to read and maintain
    });
  });
});

// Good: Promise chain or async/await
async function animate() {
  await this.fadeIn();
  await this.scaleUp();
  // Clear sequence
}
```

## Conclusion

These patterns represent battle-tested approaches for common scenarios in 3D web development. They balance performance, maintainability, and correctness while being practical to implement and understand.

The key principles underlying these patterns are:
- **Explicit over implicit**: Make behavior clear and predictable
- **Composition over inheritance**: Build complex behavior from simple parts
- **Fail fast**: Catch errors early and provide clear messages
- **Resource consciousness**: Always consider memory and performance impact
- **Testability**: Design for easy testing and debugging

Following these patterns will result in more maintainable, reliable, and performant 3D applications.
