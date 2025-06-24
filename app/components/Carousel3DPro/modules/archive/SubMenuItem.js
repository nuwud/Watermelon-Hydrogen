// app/components/Carousel3DPro/modules/SubMenuItem.js

import * as THREE from 'three';
import gsap from 'gsap';

export class SubMenuItem {
  constructor(config = {}) {
    // Core identification
    this.id = config.id || `subitem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.label = config.label || 'Unnamed Item';
    this.index = config.index;
    
    // Three.js objects (will be populated during creation)
    this.container = null;
    this.textMesh = null;
    this.iconMesh = null;
    this.hitArea = null;
    
    // Shopify-specific properties (for future use)
    this.shopifyData = config.shopifyData || null;
    this.url = config.url || null;
    this.type = config.type || 'default';
    
    // Positioning and state
    this.angle = 0;
    this.isHighlighted = false;
    this.isAnimating = false;
    
    // Appearance customization
    this.iconType = config.iconType || null;
    this.customColor = config.customColor || null;
    
    // Other configuration
    this.parent = config.parent || null; // Reference to the parent submenu
  }
  
  // Check if a Three.js object belongs to this item
  ownsObject(object) {
    if (!this.container) return false;
    
    // Direct ownership
    if (object === this.container || 
        object === this.textMesh || 
        object === this.iconMesh || 
        object === this.hitArea) {
      return true;
    }
    
    // Check parent chain
    let current = object;
    while (current && current !== this.container.parent) {
      if (current === this.container) return true;
      current = current.parent;
    }
    
    return false;
  }
  
  // Highlight this item
  highlight(animate = true) {
    if (!this.container || !this.textMesh || this.isAnimating) return;
    
    this.isHighlighted = true;
    this.isAnimating = animate;
    
    // Set highlight color
    if (this.textMesh && this.textMesh.material) {
      this.textMesh.material.color.set(this.parent?.config?.highlightColor || 0x00ffff);
      this.textMesh.material.emissive = new THREE.Color(0x003333);
    }
    
    // Animation for text
    if (animate && this.textMesh) {
      gsap.to(this.textMesh.scale, {
        x: this.textMesh.userData.originalScale.x * 1.3,
        y: this.textMesh.userData.originalScale.y * 1.3,
        z: this.textMesh.userData.originalScale.z * 1.3,
        duration: 0.3,
        onComplete: () => {
          this.isAnimating = false;
        }
      });
    } else if (this.textMesh && this.textMesh.userData.originalScale) {
      this.textMesh.scale.set(
        this.textMesh.userData.originalScale.x * 1.3,
        this.textMesh.userData.originalScale.y * 1.3,
        this.textMesh.userData.originalScale.z * 1.3
      );
    }
    
    // Animation for icon
    if (this.iconMesh) {
      const iconOriginal = this.iconMesh.userData?.originalScale || new THREE.Vector3(1, 1, 1);
      
      if (animate) {
        gsap.to(this.iconMesh.scale, {
          x: iconOriginal.x * 1.3,
          y: iconOriginal.y * 1.3,
          z: iconOriginal.z * 1.3,
          duration: 0.3,
          ease: "back.out"
        });
        
        // Add geodesic spin
        gsap.killTweensOf(this.iconMesh.rotation);
        gsap.timeline()
          .to(this.iconMesh.rotation, {
            y: Math.PI * 2,
            x: Math.PI * 0.8,
            z: Math.PI * 0.5,
            duration: 1.0,
            ease: "power1.inOut"
          })
          .to(this.iconMesh.rotation, {
            x: 0,
            z: 0,
            duration: 0.3,
            ease: "back.out(2)"
          }, "-=0.1");
      } else {
        this.iconMesh.scale.set(
          iconOriginal.x * 1.3,
          iconOriginal.y * 1.3,
          iconOriginal.z * 1.3
        );
      }
    }
  }
  
  // Unhighlight this item
  unhighlight(animate = true) {
    if (!this.container || !this.textMesh) return;
    
    this.isHighlighted = false;
    this.isAnimating = animate;
    
    // Reset text material
    if (this.textMesh && this.textMesh.material && this.textMesh.userData) {
      this.textMesh.material.color.copy(this.textMesh.userData.originalColor || new THREE.Color(0xffffff));
      this.textMesh.material.emissive = new THREE.Color(0x000000);
    }
    
    // Animation for text
    if (animate && this.textMesh && this.textMesh.userData) {
      gsap.to(this.textMesh.scale, {
        x: this.textMesh.userData.originalScale?.x || 1,
        y: this.textMesh.userData.originalScale?.y || 1,
        z: this.textMesh.userData.originalScale?.z || 1,
        duration: 0.3,
        onComplete: () => {
          this.isAnimating = false;
        }
      });
    } else if (this.textMesh && this.textMesh.userData) {
      this.textMesh.scale.copy(this.textMesh.userData.originalScale || new THREE.Vector3(1, 1, 1));
    }
    
    // Reset icon
    if (this.iconMesh && this.iconMesh.userData) {
      const iconOriginal = this.iconMesh.userData.originalScale || new THREE.Vector3(1, 1, 1);
      
      if (animate) {
        gsap.to(this.iconMesh.scale, {
          x: iconOriginal.x,
          y: iconOriginal.y,
          z: iconOriginal.z,
          duration: 0.3
        });
        
        // Reset rotation
        gsap.killTweensOf(this.iconMesh.rotation);
        gsap.set(this.iconMesh.rotation, { x: 0, y: 0, z: 0 });
      } else {
        this.iconMesh.scale.copy(iconOriginal);
        this.iconMesh.rotation.set(0, 0, 0);
      }
    }
  }
  
  // For debug purposes
  toString() {
    return `SubMenuItem: ${this.label} (index: ${this.index}, id: ${this.id})`;
  }
}