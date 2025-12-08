/**
 * CartHUDIcon3D - 3D Shopping Cart Icon for Camera HUD
 * Displays cart count, animates on cart events, and dispatches click events
 * for cart drawer integration.
 * 
 * @module CartHUDIcon3D
 * @example
 * const cartIcon = new CartHUDIcon3D({ glowColor: 0x00ffcc });
 * cameraHUD.addElement('cart', cartIcon, { slot: HUD_SLOTS.CART, onClick: () => toggleCart() });
 */

import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Default configuration for cart icon
 */
const DEFAULT_CONFIG = {
  size: 0.15,
  color: 0xffffff,
  glowColor: 0x00ffcc,
  emissiveIntensity: 0.4,
  badgeColor: 0xff3366,
  badgeTextColor: 0xffffff,
  animateOnAdd: true,
  pulseOnHover: true,
};

/**
 * CartHUDIcon3D - A 3D cart icon for the camera HUD
 */
export class CartHUDIcon3D extends THREE.Group {
  /**
   * Create a new CartHUDIcon3D
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    super();
    
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cartCount = 0;
    this.badge = null;
    this.badgeText = null;
    this.isAnimating = false;
    
    this.createCartIcon();
    this.createBadge();
    this.setupEventListeners();
    
    this.name = 'CartHUDIcon3D';
    this.userData.hudElement = true;
    this.userData.elementName = 'cart';
    
    console.log('[🍉 CartHUDIcon3D] Initialized');
  }
  
  /**
   * Create the main cart icon geometry
   */
  createCartIcon() {
    const size = this.config.size;
    
    // Create cart body (basket shape using BoxGeometry + slight transform)
    const bodyGeometry = new THREE.BoxGeometry(size * 0.8, size * 0.5, size * 0.3);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.config.color,
      emissive: this.config.glowColor,
      emissiveIntensity: this.config.emissiveIntensity,
      metalness: 0.3,
      roughness: 0.4,
      transparent: true,
      opacity: 0.95,
    });
    
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.position.y = size * 0.15;
    this.add(this.body);
    
    // Create handle (torus arc)
    const handleGeometry = new THREE.TorusGeometry(size * 0.3, size * 0.04, 8, 12, Math.PI);
    const handleMaterial = bodyMaterial.clone();
    this.handle = new THREE.Mesh(handleGeometry, handleMaterial);
    this.handle.position.y = size * 0.45;
    this.handle.rotation.z = Math.PI;
    this.add(this.handle);
    
    // Create wheels (small spheres)
    const wheelGeometry = new THREE.SphereGeometry(size * 0.08, 8, 6);
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.6,
      roughness: 0.3,
    });
    
    this.wheelLeft = new THREE.Mesh(wheelGeometry, wheelMaterial);
    this.wheelLeft.position.set(-size * 0.25, -size * 0.15, size * 0.1);
    this.add(this.wheelLeft);
    
    this.wheelRight = new THREE.Mesh(wheelGeometry, wheelMaterial);
    this.wheelRight.position.set(size * 0.25, -size * 0.15, size * 0.1);
    this.add(this.wheelRight);
    
    // Store for hover effects
    this.material = bodyMaterial;
    this.userData.originalScale = this.scale.clone();
  }
  
  /**
   * Create the count badge
   */
  createBadge() {
    const size = this.config.size;
    
    // Badge circle
    const badgeGeometry = new THREE.CircleGeometry(size * 0.2, 16);
    const badgeMaterial = new THREE.MeshBasicMaterial({
      color: this.config.badgeColor,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    
    this.badge = new THREE.Mesh(badgeGeometry, badgeMaterial);
    this.badge.position.set(size * 0.4, size * 0.5, size * 0.2);
    this.add(this.badge);
    
    // Badge text will be created dynamically when count > 0
    this.badgeMaterial = badgeMaterial;
  }
  
  /**
   * Setup event listeners for cart updates
   */
  setupEventListeners() {
    if (typeof window === 'undefined') return;
    
    // Listen for cart updates from cart-ui context
    window.addEventListener('cart-updated', this.handleCartUpdate.bind(this));
    window.addEventListener('cart-item-added', this.handleItemAdded.bind(this));
    window.addEventListener('cart-item-removed', this.handleItemRemoved.bind(this));
    
    // Listen for direct count updates
    window.addEventListener('cart-count-update', (e) => {
      if (typeof e.detail?.count === 'number') {
        this.setCount(e.detail.count, e.detail.animate !== false);
      }
    });
  }
  
  /**
   * Handle cart update event
   * @param {CustomEvent} event
   */
  handleCartUpdate(event) {
    const count = event.detail?.totalQuantity || event.detail?.count || 0;
    this.setCount(count, false);
  }
  
  /**
   * Handle item added event
   * @param {CustomEvent} event
   */
  handleItemAdded(event) {
    const newCount = event.detail?.totalQuantity || this.cartCount + 1;
    this.setCount(newCount, true);
    
    if (this.config.animateOnAdd) {
      this.playAddAnimation();
    }
  }
  
  /**
   * Handle item removed event
   * @param {CustomEvent} event
   */
  handleItemRemoved(event) {
    const newCount = event.detail?.totalQuantity || Math.max(0, this.cartCount - 1);
    this.setCount(newCount, true);
    
    this.playRemoveAnimation();
  }
  
  /**
   * Set the cart count
   * @param {number} count - New cart count
   * @param {boolean} animate - Whether to animate the change
   */
  setCount(count, animate = true) {
    const prevCount = this.cartCount;
    this.cartCount = count;
    
    if (count > 0) {
      // Show badge
      gsap.to(this.badgeMaterial, {
        opacity: 1,
        duration: animate ? 0.3 : 0,
        ease: 'power2.out'
      });
      
      // Animate badge bounce if count increased
      if (animate && count > prevCount) {
        gsap.fromTo(this.badge.scale, 
          { x: 1.5, y: 1.5, z: 1 },
          { x: 1, y: 1, z: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' }
        );
      }
    } else {
      // Hide badge
      gsap.to(this.badgeMaterial, {
        opacity: 0,
        duration: animate ? 0.2 : 0,
        ease: 'power2.in'
      });
    }
    
    // Update badge number (using a simple approach without text geometry for perf)
    // The badge color intensity indicates count ranges
    if (count > 0) {
      // Intensify badge color based on count
      const intensity = Math.min(1, count / 10);
      this.badge.material.color.setHex(
        THREE.MathUtils.lerp(0xff6688, 0xff0033, intensity)
      );
    }
    
    console.log(`[🍉 CartHUDIcon3D] Count updated: ${prevCount} -> ${count}`);
  }
  
  /**
   * Play add-to-cart animation
   */
  playAddAnimation() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    
    // Bounce and glow effect
    const tl = gsap.timeline({
      onComplete: () => { this.isAnimating = false; }
    });
    
    // Quick scale up
    tl.to(this.scale, {
      x: 1.3,
      y: 1.3,
      z: 1.3,
      duration: 0.15,
      ease: 'power2.out'
    });
    
    // Glow boost
    tl.to(this.material, {
      emissiveIntensity: 1.0,
      duration: 0.15
    }, '<');
    
    // Bounce back
    tl.to(this.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.4,
      ease: 'elastic.out(1, 0.4)'
    });
    
    // Restore glow
    tl.to(this.material, {
      emissiveIntensity: this.config.emissiveIntensity,
      duration: 0.3
    }, '<0.2');
    
    // Subtle rotation wobble
    tl.to(this.rotation, {
      z: 0.1,
      duration: 0.1,
      yoyo: true,
      repeat: 3,
      ease: 'sine.inOut'
    }, 0);
  }
  
  /**
   * Play remove from cart animation
   */
  playRemoveAnimation() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    
    const tl = gsap.timeline({
      onComplete: () => { this.isAnimating = false; }
    });
    
    // Subtle shrink and shake
    tl.to(this.scale, {
      x: 0.9,
      y: 0.9,
      z: 0.9,
      duration: 0.1,
      ease: 'power2.in'
    });
    
    tl.to(this.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.3,
      ease: 'power2.out'
    });
    
    // Quick shake
    tl.to(this.position, {
      x: '+=0.01',
      duration: 0.05,
      yoyo: true,
      repeat: 4,
      ease: 'sine.inOut'
    }, 0);
  }
  
  /**
   * Trigger cart toggle event
   */
  triggerCartToggle() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cart-toggle-clicked'));
      console.log('[🍉 CartHUDIcon3D] Cart toggle triggered');
    }
  }
  
  /**
   * Update method for animation loop
   */
  update() {
    // Subtle idle animation - gentle floating
    if (!this.isAnimating) {
      this.position.y = Math.sin(Date.now() * 0.002) * 0.005;
    }
  }
  
  /**
   * Get current cart count
   * @returns {number}
   */
  getCount() {
    return this.cartCount;
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('cart-updated', this.handleCartUpdate);
      window.removeEventListener('cart-item-added', this.handleItemAdded);
      window.removeEventListener('cart-item-removed', this.handleItemRemoved);
    }
    
    // Dispose geometries and materials
    this.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m?.dispose?.());
        } else {
          obj.material.dispose?.();
        }
      }
    });
    
    console.log('[🍉 CartHUDIcon3D] Disposed');
  }
}

/**
 * Factory function to create a cart icon for the HUD
 * @param {Object} config - Configuration options
 * @returns {CartHUDIcon3D}
 */
export function createCartHUDIcon(config = {}) {
  return new CartHUDIcon3D(config);
}

export default CartHUDIcon3D;
