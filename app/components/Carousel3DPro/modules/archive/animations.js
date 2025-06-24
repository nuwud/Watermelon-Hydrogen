import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Sets up reusable animations for the carousel and its elements
 * @returns {Object} - Animation utility functions
 */
export function setupAnimations() {
  /**
   * Creates a simple pulsing glow mesh
   * @param {THREE.Scene} scene - The scene to add the glow to
   * @param {Object} options - Configuration options
   * @returns {THREE.Mesh} - The created glow mesh
   */
  function createPulsingGlow(scene, options = {}) {
    const {
      color = 0xffffff,
      initialOpacity = 0.7,
      minOpacity = 0.2,
      duration = 1.0,
      geometry = new THREE.PlaneGeometry(1, 1)
    } = options;
    
    // Create material with transparency
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: initialOpacity
    });
    
    // Create mesh
    const glowMesh = new THREE.Mesh(geometry, glowMaterial);
    scene.add(glowMesh);
    
    // Add pulsing animation
    gsap.to(glowMaterial, {
      opacity: minOpacity,
      duration,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
      onUpdate: () => {
        glowMaterial.needsUpdate = true;
      }
    });
    
    return glowMesh;
  }
  
  /**
   * Creates a spinning animation for an object
   * @param {THREE.Object3D} object - The object to spin
   * @param {Object} options - Configuration options
   * @returns {gsap.core.Tween} - The GSAP tween instance
   */
  function createSpinningAnimation(object, options = {}) {
    const {
      axis = 'y',
      duration = 4,
      ease = "linear"
    } = options;
    
    const rotationTarget = {};
    rotationTarget[axis] = Math.PI * 2;
    
    return gsap.to(object.rotation, {
      ...rotationTarget,
      duration,
      repeat: -1,
      ease,
      overwrite: true
    });
  }
  
  /**
   * Creates a bounce scale animation for an object
   * @param {THREE.Object3D} object - The object to animate
   * @param {Object} options - Configuration options
   * @returns {gsap.core.Tween} - The GSAP tween instance
   */
  function createBounceAnimation(object, options = {}) {
    const {
      scaleMultiplier = 1.2,
      duration = 0.15,
      repeat = 1,
      onComplete = null
    } = options;
    
    return gsap.to(object.scale, {
      x: scaleMultiplier,
      y: scaleMultiplier,
      z: scaleMultiplier,
      duration,
      yoyo: true,
      repeat,
      ease: "power1.inOut",
      onComplete: () => {
        object.scale.set(1, 1, 1);
        if (onComplete) onComplete();
      }
    });
  }
  
  /**
   * Animates a material's opacity for fade effects
   * @param {THREE.Material} material - The material to animate
   * @param {Object} options - Configuration options
   * @returns {gsap.core.Tween} - The GSAP tween instance
   */
  function animateOpacity(material, options = {}) {
    const {
      to = 0,
      duration = 0.5,
      ease = "power2.inOut",
      onComplete = null
    } = options;
    
    if (!material.transparent) {
      material.transparent = true;
    }
    
    return gsap.to(material, {
      opacity: to,
      duration,
      ease,
      onComplete,
      onUpdate: () => {
        material.needsUpdate = true;
      }
    });
  }
  
  return {
    createPulsingGlow,
    createSpinningAnimation,
    createBounceAnimation,
    animateOpacity
  };
}