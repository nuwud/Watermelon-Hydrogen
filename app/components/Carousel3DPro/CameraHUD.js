/**
 * CameraHUD - 3D HUD elements that orbit around the camera
 * Creates an invisible sphere around the camera where HUD elements are mounted.
 * Elements stay in fixed screen positions relative to the camera view.
 * 
 * @module CameraHUD
 * @example
 * const hud = new CameraHUD(camera, { radius: 2.5, opacity: 0.9 });
 * hud.addElement('cart', cartIcon3D, { theta: Math.PI / 4, phi: Math.PI / 6 });
 * scene.add(hud);
 * 
 * // In animation loop:
 * hud.update(deltaTime);
 */

import * as THREE from 'three';
import gsap from 'gsap';

/**
 * HUD slot positions (named presets for common UI positions)
 * Coordinates are spherical: theta (horizontal), phi (vertical)
 * Center of view is theta=0, phi=Math.PI/2
 */
export const HUD_SLOTS = {
  // Corners
  TOP_LEFT: { theta: -Math.PI / 5, phi: Math.PI / 3 },
  TOP_RIGHT: { theta: Math.PI / 5, phi: Math.PI / 3 },
  BOTTOM_LEFT: { theta: -Math.PI / 5, phi: 2 * Math.PI / 3 },
  BOTTOM_RIGHT: { theta: Math.PI / 5, phi: 2 * Math.PI / 3 },
  
  // Edges
  TOP_CENTER: { theta: 0, phi: Math.PI / 4 },
  BOTTOM_CENTER: { theta: 0, phi: 3 * Math.PI / 4 },
  LEFT_CENTER: { theta: -Math.PI / 4, phi: Math.PI / 2 },
  RIGHT_CENTER: { theta: Math.PI / 4, phi: Math.PI / 2 },
  
  // Cart icon default (top-right, slightly inward)
  CART: { theta: Math.PI / 6, phi: Math.PI / 4.5 },
  
  // Navigation helpers
  NAV_LEFT: { theta: -Math.PI / 3, phi: Math.PI / 2 },
  NAV_RIGHT: { theta: Math.PI / 3, phi: Math.PI / 2 },
  NAV_UP: { theta: 0, phi: Math.PI / 5 },
  NAV_DOWN: { theta: 0, phi: 4 * Math.PI / 5 },
};

/**
 * Default HUD configuration
 */
const DEFAULT_CONFIG = {
  radius: 2.5, // Distance from camera to HUD elements
  opacity: 0.95,
  fadeInDuration: 0.4,
  fadeOutDuration: 0.25,
  hoverScale: 1.15,
  clickScale: 0.9,
  glowIntensity: 0.3,
  enabled: true,
  mobileScaleFactor: 1.2, // Larger touch targets on mobile
  showDebugSphere: false, // Visualize the mounting sphere
};

export class CameraHUD extends THREE.Group {
  /**
   * Create a new CameraHUD
   * @param {THREE.Camera} camera - The camera to attach HUD to
   * @param {Object} config - Configuration options
   */
  constructor(camera, config = {}) {
    super();
    
    this.camera = camera;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.elements = new Map(); // name -> { mesh, slot, config }
    this.raycaster = new THREE.Raycaster();
    this.pointerPosition = new THREE.Vector2();
    this.hoveredElement = null;
    this.isVisible = true;
    
    // Create debug visualization if enabled
    if (this.config.showDebugSphere) {
      this.createDebugSphere();
    }
    
    // Detect mobile for touch-friendly sizing
    this.isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    
    // Bind event handlers
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    
    this.setupEventListeners();
    
    console.log('[🍉 CameraHUD] Initialized with radius:', this.config.radius);
  }
  
  /**
   * Create debug sphere visualization
   */
  createDebugSphere() {
    const geometry = new THREE.SphereGeometry(this.config.radius, 16, 12);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    this.debugSphere = new THREE.Mesh(geometry, material);
    this.add(this.debugSphere);
  }
  
  /**
   * Setup pointer event listeners
   */
  setupEventListeners() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointerup', this.handlePointerUp);
    
    // Listen for visibility toggle events
    window.addEventListener('hud-toggle', (e) => {
      if (e.detail?.visible !== undefined) {
        this.setVisible(e.detail.visible);
      } else {
        this.toggleVisible();
      }
    });
  }
  
  /**
   * Convert spherical coordinates to Cartesian position on HUD sphere
   * @param {number} theta - Horizontal angle (0 = forward)
   * @param {number} phi - Vertical angle (PI/2 = horizon)
   * @returns {THREE.Vector3} Position on sphere
   */
  sphericalToCartesian(theta, phi) {
    const r = this.config.radius;
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
      -r * Math.sin(phi) * Math.cos(theta) // Negative Z = forward
    );
  }
  
  /**
   * Add an element to the HUD
   * @param {string} name - Unique identifier for the element
   * @param {THREE.Object3D} mesh - The 3D object to add
   * @param {Object} options - Position and behavior options
   * @returns {THREE.Object3D} The added mesh
   */
  addElement(name, mesh, options = {}) {
    const slot = options.slot || HUD_SLOTS.TOP_RIGHT;
    const elementConfig = {
      slot,
      interactive: options.interactive !== false,
      onClick: options.onClick || null,
      onHover: options.onHover || null,
      onHoverEnd: options.onHoverEnd || null,
      fixedScale: options.fixedScale || null,
      label: options.label || name,
      visible: options.visible !== false,
    };
    
    // Calculate position from slot
    const theta = typeof slot === 'object' ? slot.theta : HUD_SLOTS[slot]?.theta || 0;
    const phi = typeof slot === 'object' ? slot.phi : HUD_SLOTS[slot]?.phi || Math.PI / 2;
    const position = this.sphericalToCartesian(theta, phi);
    
    mesh.position.copy(position);
    
    // Make element face toward camera (center of sphere)
    mesh.lookAt(0, 0, 0);
    
    // Apply mobile scaling if needed
    if (this.isMobile && !elementConfig.fixedScale) {
      mesh.scale.multiplyScalar(this.config.mobileScaleFactor);
    }
    
    // Store original scale for hover effects
    mesh.userData.originalScale = mesh.scale.clone();
    mesh.userData.hudElement = true;
    mesh.userData.elementName = name;
    
    // Add to HUD group
    this.add(mesh);
    
    // Store reference
    this.elements.set(name, { mesh, ...elementConfig });
    
    // Animate entrance if HUD is visible
    if (this.isVisible && elementConfig.visible) {
      this.animateElementIn(mesh);
    } else if (!elementConfig.visible) {
      mesh.visible = false;
    }
    
    console.log(`[🍉 CameraHUD] Added element: ${name}`);
    return mesh;
  }
  
  /**
   * Remove an element from the HUD
   * @param {string} name - Element identifier
   * @param {boolean} animate - Whether to animate removal
   */
  removeElement(name, animate = true) {
    const element = this.elements.get(name);
    if (!element) return;
    
    if (animate) {
      gsap.to(element.mesh.scale, {
        x: 0, y: 0, z: 0,
        duration: this.config.fadeOutDuration,
        ease: 'back.in(2)',
        onComplete: () => {
          this.remove(element.mesh);
          if (element.mesh.geometry) element.mesh.geometry.dispose();
          if (element.mesh.material) {
            if (Array.isArray(element.mesh.material)) {
              element.mesh.material.forEach(m => m?.dispose?.());
            } else {
              element.mesh.material.dispose?.();
            }
          }
        }
      });
    } else {
      this.remove(element.mesh);
    }
    
    this.elements.delete(name);
  }
  
  /**
   * Get an element by name
   * @param {string} name - Element identifier
   * @returns {Object|null} Element data or null
   */
  getElement(name) {
    return this.elements.get(name) || null;
  }
  
  /**
   * Show a specific element
   * @param {string} name - Element identifier
   */
  showElement(name) {
    const element = this.elements.get(name);
    if (!element) return;
    
    element.mesh.visible = true;
    element.visible = true;
    this.animateElementIn(element.mesh);
  }
  
  /**
   * Hide a specific element
   * @param {string} name - Element identifier
   */
  hideElement(name) {
    const element = this.elements.get(name);
    if (!element) return;
    
    element.visible = false;
    gsap.to(element.mesh.scale, {
      x: 0, y: 0, z: 0,
      duration: this.config.fadeOutDuration,
      ease: 'power2.in',
      onComplete: () => {
        element.mesh.visible = false;
      }
    });
  }
  
  /**
   * Animate element entrance
   * @param {THREE.Object3D} mesh - Element to animate
   */
  animateElementIn(mesh) {
    const targetScale = mesh.userData.originalScale.clone();
    mesh.scale.set(0, 0, 0);
    mesh.visible = true;
    
    gsap.to(mesh.scale, {
      x: targetScale.x,
      y: targetScale.y,
      z: targetScale.z,
      duration: this.config.fadeInDuration,
      ease: 'back.out(1.5)'
    });
  }
  
  /**
   * Move element to a new slot
   * @param {string} name - Element identifier
   * @param {Object|string} newSlot - New slot position
   * @param {boolean} animate - Whether to animate movement
   */
  moveElement(name, newSlot, animate = true) {
    const element = this.elements.get(name);
    if (!element) return;
    
    const slot = typeof newSlot === 'string' ? HUD_SLOTS[newSlot] : newSlot;
    if (!slot) return;
    
    const newPosition = this.sphericalToCartesian(slot.theta, slot.phi);
    element.slot = slot;
    
    if (animate) {
      gsap.to(element.mesh.position, {
        x: newPosition.x,
        y: newPosition.y,
        z: newPosition.z,
        duration: 0.4,
        ease: 'power2.out',
        onUpdate: () => {
          element.mesh.lookAt(0, 0, 0);
        }
      });
    } else {
      element.mesh.position.copy(newPosition);
      element.mesh.lookAt(0, 0, 0);
    }
  }
  
  /**
   * Handle pointer move for hover detection
   * @param {PointerEvent} event
   */
  handlePointerMove(event) {
    if (!this.config.enabled || !this.isVisible) return;
    
    // Convert to normalized device coordinates
    this.pointerPosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointerPosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Raycast against HUD elements
    this.raycaster.setFromCamera(this.pointerPosition, this.camera);
    
    const interactiveElements = Array.from(this.elements.values())
      .filter(e => e.interactive && e.visible)
      .map(e => e.mesh);
    
    const intersects = this.raycaster.intersectObjects(interactiveElements, true);
    
    if (intersects.length > 0) {
      // Find the parent HUD element
      let target = intersects[0].object;
      while (target && !target.userData.hudElement) {
        target = target.parent;
      }
      
      if (target && target !== this.hoveredElement) {
        // Unhover previous
        if (this.hoveredElement) {
          this.onElementHoverEnd(this.hoveredElement);
        }
        
        this.hoveredElement = target;
        this.onElementHover(target);
      }
    } else if (this.hoveredElement) {
      this.onElementHoverEnd(this.hoveredElement);
      this.hoveredElement = null;
    }
  }
  
  /**
   * Handle pointer down
   */
  handlePointerDown() {
    if (!this.config.enabled || !this.isVisible || !this.hoveredElement) return;
    
    const name = this.hoveredElement.userData.elementName;
    const element = this.elements.get(name);
    if (!element) return;
    
    // Click animation
    gsap.to(this.hoveredElement.scale, {
      x: element.mesh.userData.originalScale.x * this.config.clickScale,
      y: element.mesh.userData.originalScale.y * this.config.clickScale,
      z: element.mesh.userData.originalScale.z * this.config.clickScale,
      duration: 0.1,
      ease: 'power2.in'
    });
  }
  
  /**
   * Handle pointer up (click complete)
   */
  handlePointerUp() {
    if (!this.config.enabled || !this.isVisible || !this.hoveredElement) return;
    
    const name = this.hoveredElement.userData.elementName;
    const element = this.elements.get(name);
    if (!element) return;
    
    // Restore scale with bounce
    gsap.to(this.hoveredElement.scale, {
      x: element.mesh.userData.originalScale.x * this.config.hoverScale,
      y: element.mesh.userData.originalScale.y * this.config.hoverScale,
      z: element.mesh.userData.originalScale.z * this.config.hoverScale,
      duration: 0.2,
      ease: 'back.out(2)'
    });
    
    // Trigger click callback
    if (element.onClick) {
      element.onClick(name, element);
    }
    
    // Dispatch custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hud-element-click', {
        detail: { name, element }
      }));
    }
  }
  
  /**
   * Handle element hover start
   * @param {THREE.Object3D} mesh
   */
  onElementHover(mesh) {
    const name = mesh.userData.elementName;
    const element = this.elements.get(name);
    if (!element) return;
    
    // Scale up with spring effect
    gsap.to(mesh.scale, {
      x: mesh.userData.originalScale.x * this.config.hoverScale,
      y: mesh.userData.originalScale.y * this.config.hoverScale,
      z: mesh.userData.originalScale.z * this.config.hoverScale,
      duration: 0.2,
      ease: 'back.out(2)'
    });
    
    // Glow effect if material supports it
    if (mesh.material?.emissiveIntensity !== undefined) {
      gsap.to(mesh.material, {
        emissiveIntensity: this.config.glowIntensity + 0.5,
        duration: 0.2
      });
    }
    
    // Custom hover callback
    if (element.onHover) {
      element.onHover(name, element);
    }
    
    // Change cursor
    document.body.style.cursor = 'pointer';
  }
  
  /**
   * Handle element hover end
   * @param {THREE.Object3D} mesh
   */
  onElementHoverEnd(mesh) {
    const name = mesh.userData.elementName;
    const element = this.elements.get(name);
    if (!element) return;
    
    // Restore original scale
    gsap.to(mesh.scale, {
      x: mesh.userData.originalScale.x,
      y: mesh.userData.originalScale.y,
      z: mesh.userData.originalScale.z,
      duration: 0.15,
      ease: 'power2.out'
    });
    
    // Restore glow
    if (mesh.material?.emissiveIntensity !== undefined) {
      gsap.to(mesh.material, {
        emissiveIntensity: this.config.glowIntensity,
        duration: 0.15
      });
    }
    
    // Custom hover end callback
    if (element.onHoverEnd) {
      element.onHoverEnd(name, element);
    }
    
    // Restore cursor
    document.body.style.cursor = 'auto';
  }
  
  /**
   * Toggle HUD visibility
   */
  toggleVisible() {
    this.setVisible(!this.isVisible);
  }
  
  /**
   * Set HUD visibility
   * @param {boolean} visible
   */
  setVisible(visible) {
    this.isVisible = visible;
    
    this.elements.forEach((element) => {
      if (visible && element.visible) {
        this.animateElementIn(element.mesh);
      } else {
        gsap.to(element.mesh.scale, {
          x: 0, y: 0, z: 0,
          duration: this.config.fadeOutDuration,
          ease: 'power2.in',
          onComplete: () => {
            if (!this.isVisible) {
              element.mesh.visible = false;
            }
          }
        });
      }
    });
    
    console.log(`[🍉 CameraHUD] Visibility: ${visible}`);
  }
  
  /**
   * Update HUD position to follow camera
   * Call this in the animation loop
   */
  update() {
    if (!this.config.enabled) return;
    
    // HUD follows camera position but uses its own rotation
    // This keeps elements fixed relative to the view
    this.position.copy(this.camera.position);
    this.quaternion.copy(this.camera.quaternion);
  }
  
  /**
   * Update configuration
   * @param {Object} newConfig - New configuration values
   */
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    
    // Update radius if changed
    if (newConfig.radius !== undefined) {
      this.elements.forEach((element) => {
        const theta = element.slot.theta;
        const phi = element.slot.phi;
        const newPos = this.sphericalToCartesian(theta, phi);
        element.mesh.position.copy(newPos);
        element.mesh.lookAt(0, 0, 0);
      });
      
      if (this.debugSphere) {
        this.debugSphere.geometry.dispose();
        this.debugSphere.geometry = new THREE.SphereGeometry(this.config.radius, 16, 12);
      }
    }
    
    console.log('[🍉 CameraHUD] Config updated:', newConfig);
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', this.handlePointerMove);
      window.removeEventListener('pointerdown', this.handlePointerDown);
      window.removeEventListener('pointerup', this.handlePointerUp);
    }
    
    // Dispose all elements
    this.elements.forEach((element, name) => {
      this.removeElement(name, false);
    });
    
    // Dispose debug sphere
    if (this.debugSphere) {
      this.debugSphere.geometry.dispose();
      this.debugSphere.material.dispose();
    }
    
    console.log('[🍉 CameraHUD] Disposed');
  }
}

export default CameraHUD;
