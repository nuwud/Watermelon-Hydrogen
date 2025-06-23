import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Manages floating 3D previews that appear when items are selected in a carousel.
 * This module handles creation, animation, positioning, and lifecycle of preview elements.
 */
export class FloatingPreview {
  /**
   * Creates a new floating preview manager
   * @param {Object} config - Configuration options
   * @param {THREE.Scene} config.scene - The Three.js scene to add previews to
   * @param {THREE.Camera} config.camera - The camera for positioning and orientation
   * @param {THREE.Object3D} [config.anchorObject] - Object to use as anchor point for positioning (in world space)
   * @param {Function} config.getPreviewContent - Function that returns preview content for an index
   */
  constructor(config) {
    if (!config.scene || !config.camera || !config.getPreviewContent) {
      throw new Error('FloatingPreview requires scene, camera, and getPreviewContent function');
    }

    this.scene = config.scene;
    this.camera = config.camera;
    // Use the provided anchor object or fallback to scene
    this.anchorObject = config.anchorObject || this.scene;
    this.getPreviewContent = config.getPreviewContent;
    
    // Create a container for the floating preview
    this.group = null;
    this.currentIndex = -1;
    this.isSpinning = false;
    this.position = new THREE.Vector3(); // For storing calculated world position
  }

  /**
   * Creates a floating preview for the specified index
   * @param {number} index - Index of item to create preview for
   */
  create(index) {
    // Clean up existing preview if any
    this.dispose();
    
    // Get content for this index
    const content = this.getPreviewContent(index);
    if (!content) return;
    
    // Create a new group for this preview
    this.group = new THREE.Group();
    this.group.name = `FloatingPreview_${index}`;
    
    // Add content to the group
    if (content.icon) {
      content.icon.scale.set(4, 4, 4); // Scale up for visibility
      this.group.add(content.icon);
    }
    
    if (content.text) {
      // Position text above the icon
      content.text.position.y = 2.2;
      this.group.add(content.text);
    }
    
    // Store the index
    this.group.userData.index = index;
    this.currentIndex = index;
    
    // Get world position from the anchor object for stable positioning
    this.anchorObject.getWorldPosition(this.position);
    
    // Position the preview at the anchor's world position
    this.group.position.copy(this.position);
    
    // Adjust Y position upward for better visibility
    this.group.position.y += 1.2;
    
    // Make sure the preview faces the camera
    const cameraPos = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPos);
    this.group.lookAt(cameraPos);
    
    // Ensure correct initial scale and visibility
    this.group.scale.set(0, 0, 0);
    this.group.visible = true;
    
    // Add to scene
    this.scene.add(this.group);
    
    // Animate in
    gsap.to(this.group.scale, {
      x: 1, y: 1, z: 1,
      duration: 0.8,
      ease: "elastic.out(1, 0.5)"
    });
    
    // Start spinning animation
    this.startSpin();
  }

  /**
   * Updates the preview to show a different item
   * @param {number} index - New index to show
   */
  update(index) {
    if (this.currentIndex === index || !this.group) return;
    
    // Fade out current preview
    gsap.to(this.group.scale, {
      x: 0, y: 0, z: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        // Create new preview once fade out is complete
        this.create(index);
      }
    });
  }

  /**
   * Updates the rotation of the preview to match the provided rotation
   * @param {number} rotation - Y rotation to apply
   */
  updateRotation(rotation) {
    if (!this.group) return;
    
    // Stop automatic spinning temporarily
    this.stopSpin();
    
    // Apply the rotation
    this.group.rotation.y = rotation;
  }

  /**
   * Starts a continuous spinning animation
   */
  startSpin() {
    if (!this.group || this.isSpinning) return;
    
    // Kill any existing rotation animations
    gsap.killTweensOf(this.group.rotation);
    
    // Reset rotation first to avoid jumps
    this.group.rotation.set(0, 0, 0);
    
    // Start continuous spinning
    gsap.to(this.group.rotation, {
      y: '+=' + Math.PI * 2,
      duration: 12,
      repeat: -1,
      ease: "none"
    });
    
    this.isSpinning = true;
  }

  /**
   * Stops the spinning animation
   */
  stopSpin() {
    if (!this.group || !this.isSpinning) return;
    
    // Kill the spinning animation
    gsap.killTweensOf(this.group.rotation);
    
    this.isSpinning = false;
  }

  /**
   * Disposes of the preview and cleans up resources
   */
  dispose() {
    if (!this.group) return;
    
    // Stop any animations
    this.stopSpin();
    gsap.killTweensOf(this.group.scale);
    
    // Remove from scene
    this.scene.remove(this.group);
    
    // Clean up resources
    this.group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    
    // Clear references
    this.group = null;
    this.currentIndex = -1;
    this.isSpinning = false;
  }
}
