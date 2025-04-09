/**
 * @AI-PROMPT
 * This file implements nested 3D submenu cylinders.
 * When a user selects an item in Carousel3DPro, use this class to pop out submenus around it.
 */

import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
// Removed unused imports: getGlowShaderMaterial, getOpacityFadeMaterial, defaultCarouselStyle

// Access GSAP from the global scope
const gsap = window.gsap;

// Cache font to improve performance
let cachedFont = null;

export class Carousel3DSubmenu extends THREE.Group {
  constructor(parentItem, items = [], config = {}) {
    super();
    this.parentItem = parentItem;
    this.items = items;
    this.config = config;
    this.itemMeshes = [];
    this.currentIndex = 0;
    this.watermillRadius = 1.2;
    this.rotationAngle = 0;
    this.targetRotation = 0;
    this.rotationSpeed = 0.15; // Increased for smoother rotation
    this.isInitialized = false; // Track initialization state
    this.floatingPreview = null;
    this.isSpinning = false;
    this.showingPreview = false; // Track if preview is currently being shown
    this.lastParentRotation = 0; // Initialize to track parent rotation
    
    // Create container for items to rotate
    this.itemGroup = new THREE.Group();
    this.add(this.itemGroup);
    
    // Load font from CDN directly
    this.fontLoader = new FontLoader();

    // Try to use cached font first for instant creation
    if (cachedFont) {
      this.font = cachedFont;
      this.createItems();
      this.isInitialized = true;
      
      // Position wheel so first item is at front
      if (this.itemMeshes.length > 0) {
        const firstItem = this.itemMeshes[0];
        this.itemGroup.rotation.x = -firstItem.userData.angle + 0;
        this.targetRotation = this.itemGroup.rotation.x;
      }
    } else {
      // Load font if not cached
      this.fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
        cachedFont = font; // Cache for future use
        this.font = font;
        this.createItems();
        this.isInitialized = true;
        
        // Position wheel
        if (this.itemMeshes.length > 0) {
          const firstItem = this.itemMeshes[0];
          this.itemGroup.rotation.x = -firstItem.userData.angle + 0;
          this.targetRotation = this.itemGroup.rotation.x;
        }
      });
    }
    
    // Position directly in front of parent item (not just centered on it)
    this.position.copy(this.parentItem.position);
    // Move slightly forward from parent item for better visibility
    const forwardDir = new THREE.Vector3(0, 0, 0.2); // Move forward in Z
    forwardDir.applyQuaternion(this.parentItem.quaternion);
    this.position.add(forwardDir);
    
    // Create container for fixed UI elements that don't rotate with the wheel
    this.fixedElements = new THREE.Group();
    this.add(this.fixedElements);
    
    // Add close button immediately with fixed position - only call once
    this.addCloseButtonPlaceholder();
  }
  
  addCloseButtonPlaceholder() {
    // Create a red disk with VISIBLE settings
    const baseGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 24); // Cylinder for close button
    const baseMaterial = new THREE.MeshStandardMaterial({ // Use MeshStandardMaterial for better lighting
      color: 0xff3333, // Red color
      transparent: true, // Start with transparent material
      opacity: 0.95, // Start visible immediately
      metalness: 0.5, // Slightly shiny
      roughness: 0.3, // Less rough for a smoother look
      emissive: 0xff0000, // Red emissive glow
      emissiveIntensity: 0.5 // Stronger glow
    });

    this.closeButton = new THREE.Mesh(baseGeometry, baseMaterial);
    this.closeButton.rotation.set(0, 0, 0);
    this.fixedElements.rotation.set(0, 0, 0);
    this.closeButton.rotation.set(Math.PI / 2, 0, 0); // Example: 90 degrees along X-axis
    this.closeButton.rotation.set(0, Math.PI / 2, 0); // Example: 90 degrees along Y-axis
    this.closeButton.rotation.set(0, 0, Math.PI / 2); // Example: 90 degrees along Z-axis
    this.closeButton.position.set(1.8, 1.8, 0.5); // Positioned in top corner
    this.closeButton.scale.set(0.8, 0.8, 0.8); // Start slightly smaller for animation
    this.closeButton.renderOrder = 9999;
    
    // Set isCloseButton flag
    this.closeButton.userData = { // Set userData for easy access
      isCloseButton: true, // Flag to identify close button
      originalColor: baseMaterial.color.clone(), // Store original color for reset
      hoverColor: new THREE.Color(0xff0000) // Red hover color
    };
    
    // Add X with proper orientation
    this.createCloseButtonX(); // Create X shape
    
    // Add to fixed elements group
    this.fixedElements.add(this.closeButton); // Add to fixed elements group
  }

  createCloseButtonX() {
    // Use thinner BoxGeometry for the X
    const lineGeometry1 = new THREE.BoxGeometry(0.22, 0.03, 0.03);
    const lineGeometry2 = new THREE.BoxGeometry(0.22, 0.03, 0.03);

    const lineMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.8
    });

    // First line of X - properly aligned to disk surface
    const line1 = new THREE.Mesh(lineGeometry1, lineMaterial);
    line1.position.set(0, 0, 0.03); // Raised up from disk surface
    line1.rotation.z = Math.PI / 4; // 45 degrees
    
    // Second line of X
    const line2 = new THREE.Mesh(lineGeometry2, lineMaterial);
    line2.position.set(0, 0, 0.03); // Raised up from disk surface
    line2.rotation.z = -Math.PI / 4; // -45 degrees
    
    // Store lines in userData for easy access
    this.closeButton.userData.xLines = [line1, line2];
    
    // Set isCloseButton on the X parts too
    line1.userData = { isCloseButton: true };
    line2.userData = { isCloseButton: true };

    this.closeButton.add(line1);
    this.closeButton.add(line2);
  }
  
  getIconColor(index) {
    // Create a palette of colors to use for icons
    const colors = [
      0x4285F4, // Google Blue
      0xEA4335, // Google Red
      0xFBBC05, // Google Yellow
      0x34A853, // Google Green
      0xFF9900, // Amazon Orange
      0x00ADEF, // Microsoft Blue
      0x7FBA00, // Microsoft Green
      0xF25022  // Microsoft Red
    ];
    
    return colors[index % colors.length];
  }

  createItems() {
    if (!this.font) return;
    
    // Special handling for Gallery items - create more elaborate 3D models
    const isGallerySubmenu = this.parentItem.userData?.item === 'Gallery';
    
    // Calculate even distribution around the wheel
    const angleStep = (2 * Math.PI) / this.items.length;
    
    // Define shapes for icons with more elaborate options for Gallery
    const regularShapes = [
      () => new THREE.SphereGeometry(0.1, 16, 16),
      () => new THREE.BoxGeometry(0.15, 0.15, 0.15),
      () => new THREE.ConeGeometry(0.1, 0.2, 16),
      () => new THREE.TorusGeometry(0.1, 0.04, 16, 32),
      () => new THREE.TetrahedronGeometry(0.12),
      () => new THREE.OctahedronGeometry(0.12),
      () => new THREE.DodecahedronGeometry(0.12),
      () => new THREE.IcosahedronGeometry(0.12)
    ];
    
    // Special shapes for Gallery items
    const galleryShapes = {
      'Photos': () => {
        const group = new THREE.Group();
        // Photo frame
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.16, 0.01),
          new THREE.MeshStandardMaterial({ color: 0xdddddd })
        );
        // Photo inside
        const photo = new THREE.Mesh(
          new THREE.PlaneGeometry(0.18, 0.14),
          new THREE.MeshBasicMaterial({ color: 0x2299ff })
        );
        photo.position.z = 0.006;
        group.add(frame);
        group.add(photo);
        return group;
      },
      'Videos': () => {
        const group = new THREE.Group();
        // Video screen
        const screen = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.12, 0.02),
          new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        // Play button
        const playBtn = new THREE.Mesh(
          new THREE.CircleGeometry(0.04, 16),
          new THREE.MeshBasicMaterial({ color: 0xff3333 })
        );
        playBtn.position.z = 0.011;
        group.add(screen);
        group.add(playBtn);
        return group;
      },
      '3D Models': () => {
        const group = new THREE.Group();
        // Base cube
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.1, 0.1),
          new THREE.MeshStandardMaterial({ color: 0x66cc99, wireframe: true })
        );
        // Sphere inside
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0x99ff66 })
        );
        group.add(cube);
        group.add(sphere);
        return group;
      },
      'Artwork': () => {
        const group = new THREE.Group();
        // Canvas
        const canvas = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.18, 0.01),
          new THREE.MeshStandardMaterial({ color: 0xf5f5f5 })
        );
        // Add some colored squares as "art"
        const colors = [0xff3333, 0x3333ff, 0x33ff33, 0xffff33];
        for (let i = 0; i < 4; i++) {
          const size = 0.06;
          const x = (i % 2) * 0.08 - 0.04;
          const y = Math.floor(i / 2) * 0.08 - 0.04;
          const square = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size),
            new THREE.MeshBasicMaterial({ color: colors[i] })
          );
          square.position.set(x, y, 0.006);
          group.add(square);
        }
        group.add(canvas);
        return group;
      },
      'Animations': () => {
        const group = new THREE.Group();
        // Film reel
        const reel = new THREE.Mesh(
          new THREE.TorusGeometry(0.08, 0.02, 16, 32),
          new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        // Add spokes
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const spoke = new THREE.Mesh(
            new THREE.CylinderGeometry(0.005, 0.005, 0.16),
            new THREE.MeshStandardMaterial({ color: 0x999999 })
          );
          spoke.rotation.z = angle;
          group.add(spoke);
        }
        group.add(reel);
        return group;
      },
      'Virtual Tours': () => {
        const group = new THREE.Group();
        // VR headset simplified
        const headset = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.1, 0.1),
          new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        // Lenses
        const leftLens = new THREE.Mesh(
          new THREE.CircleGeometry(0.03, 16),
          new THREE.MeshBasicMaterial({ color: 0x3399ff })
        );
        leftLens.position.set(-0.05, 0, 0.051);
        const rightLens = leftLens.clone();
        rightLens.position.set(0.05, 0, 0.051);
        group.add(headset);
        group.add(leftLens);
        group.add(rightLens);
        return group;
      }
    };
    
    this.items.forEach((item, index) => {
      // Create text geometry
      const geometry = new TextGeometry(item.toString(), {
        font: this.font,
        size: 0.25,
        height: 0.05,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelOffset: 0,
        bevelSegments: 5
      });
      
      geometry.computeBoundingBox();
      geometry.center();
      
      // Get text dimensions
      const textWidth = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
      const textHeight = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
      
      // Create material for text
      const material = new THREE.MeshStandardMaterial({ 
        color: this.config.textColor || 0xffffff,
        transparent: true,
        opacity: 0.9,
        emissive: this.config.textEmissive || 0x222222,
        emissiveIntensity: 0.2
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Create a container for the mesh
      const container = new THREE.Group();
      container.add(mesh);
      
      // Add robust 3D hit area (box instead of plane, covers entire text)
      const hitAreaWidth = textWidth + 1.2; // Increased width to allow more space for icon
      const hitAreaHeight = Math.max(textHeight, 0.6); // Taller for easier clicking
      const hitAreaDepth = 0.3; // Add significant depth for better 3D hit detection

      const hitAreaGeometry = new THREE.BoxGeometry(hitAreaWidth, hitAreaHeight, hitAreaDepth);
      const hitAreaMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.01, // Nearly invisible but still clickable
        depthWrite: false 
      });

      const hitArea = new THREE.Mesh(hitAreaGeometry, hitAreaMaterial);
      hitArea.position.z = -0.1; // Positioned to extend both in front and behind text
      container.add(hitArea);
      
      // Determine which shape/icon to use
      let iconMesh;
      
      if (isGallerySubmenu && galleryShapes[item]) {
        // Use special Gallery icon
        iconMesh = galleryShapes[item]();
      } else {
        // Use regular shape
        const shapeIndex = index % regularShapes.length;
        const shapeGeometry = regularShapes[shapeIndex]();
        const shapeMaterial = new THREE.MeshStandardMaterial({
          color: this.getIconColor(index),
          metalness: 0.3,
          roughness: 0.4,
          emissive: this.getIconColor(index),
          emissiveIntensity: 0.2
        });
        
        iconMesh = new THREE.Mesh(shapeGeometry, shapeMaterial);
      }
      
      // Position icon to the left with more spacing - ensure it doesn't overlap with text
      // Calculate distance based on text width to prevent overlap with longer words
      const iconOffset = Math.max(0.7, textWidth * 0.25); // Increased minimum offset and scaling factor
      iconMesh.position.x = -textWidth/2 - iconOffset;
      
      // For longer text items, shift the text slightly right to make more room for the icon
      if (textWidth > 2) {
        // For very long text, shift it more to the right
        mesh.position.x = iconOffset * 0.3; // Shift text slightly right
      }
      
      // Add to container
      container.add(iconMesh);
      
      // Position around the parent
      const angle = angleStep * index;
      
      // Position in a circle around the parent
      container.position.y = this.watermillRadius * Math.sin(angle);
      container.position.z = this.watermillRadius * Math.cos(angle);
      
      // Store data with the container
      container.userData = { 
        index, 
        isSubmenuItem: true,
        item,
        angle,
        mesh,
        hitArea,
        originalAngle: angle,
        springVelocity: 0,
        springTarget: 0,
        springStrength: 0.1,
        springDamping: 0.6
      };
      
      // Store original scale with the actual mesh
      mesh.userData = {
        originalScale: mesh.scale.clone(),
        originalColor: material.color.clone()
      };
      
      // Store icon reference for animations
      container.userData.iconMesh = iconMesh;
      
      // Start invisible for animation
      mesh.scale.set(0, 0, 0);
      iconMesh.scale.set(0, 0, 0);
      hitArea.scale.set(0, 0, 0);
      
      this.itemMeshes.push(container);
      this.itemGroup.add(container);
    });
    
    // Highlight first item
    if (this.itemMeshes.length > 0) {
      this.selectItem(0, false);
      // Don't create floating preview automatically
    }
  }

  selectItem(index, animate = true, createPreview = false) {
    if (index < 0 || index >= this.itemMeshes.length) return;
    
    // Deselect current
    if (this.currentIndex !== index && this.itemMeshes[this.currentIndex]) {
      const currentContainer = this.itemMeshes[this.currentIndex];
      const currentMesh = currentContainer.userData.mesh;
      const currentIcon = currentContainer.userData.iconMesh;
      
      // Reset appearance
      currentMesh.material.color.copy(currentMesh.userData.originalColor);
      currentMesh.material.emissive = new THREE.Color(0x000000);
      
      if (animate) {
        gsap.to(currentMesh.scale, {
          x: currentMesh.userData.originalScale.x,
          y: currentMesh.userData.originalScale.y,
          z: currentMesh.userData.originalScale.z,
          duration: 0.3
        });
        
        // Reset icon scale
        gsap.to(currentIcon.scale, {
          x: 1, y: 1, z: 1,
          duration: 0.3
        });
        
        // Reset rotation to upright immediately without animation
        gsap.killTweensOf(currentIcon.rotation);
        gsap.set(currentIcon.rotation, { x: 0, y: 0, z: 0 });
      } else {
        currentMesh.scale.copy(currentMesh.userData.originalScale);
        currentIcon.scale.set(1, 1, 1);
        currentIcon.rotation.set(0, 0, 0); // Reset rotation immediately
      }
    }
    
    // Select new
    const selectedContainer = this.itemMeshes[index];
    const selectedMesh = selectedContainer.userData.mesh;
    const selectedIcon = selectedContainer.userData.iconMesh;
    
    // Apply highlight appearance
    selectedMesh.material.color.set(this.config.highlightColor || 0x00ffff);
    selectedMesh.material.emissive = new THREE.Color(0x003333);
    
    if (animate) {
      // Scale up text
      gsap.to(selectedMesh.scale, {
        x: selectedMesh.userData.originalScale.x * 1.3,
        y: selectedMesh.userData.originalScale.y * 1.3,
        z: selectedMesh.userData.originalScale.z * 1.3,
        duration: 0.3
      });
      
      // Scale up icon
      gsap.to(selectedIcon.scale, {
        x: 1.3, y: 1.3, z: 1.3,
        duration: 0.3,
        ease: "back.out"
      });
      
      // Add a clean 1-second geodesic spin animation to the icon
      gsap.killTweensOf(selectedIcon.rotation);
      gsap.timeline()
        .to(selectedIcon.rotation, {
          y: Math.PI * 2, // One full rotation around Y axis
          x: Math.PI * 0.8, // Add tilt for geodesic effect
          z: Math.PI * 0.5, // Add roll for geodesic effect
          duration: 1.0, // Exactly 1 second
          ease: "power1.inOut"
        })
        .to(selectedIcon.rotation, {
          x: 0, // Reset to upright
          z: 0, // Reset to upright
          duration: 0.3, // Quick snap back
          ease: "back.out(2)" // Snappy elastic ease
        }, "-=0.1"); // Slight overlap for smoother transition
      
      // Position the item at the front (3 o'clock position)
      // The value 0 corresponds to the 3 o'clock position
      this.targetRotation = -selectedContainer.userData.angle + 0;
      
      // Smoother animation with less bounce for better navigation
      gsap.to(this.itemGroup.rotation, {
        x: this.targetRotation,
        duration: 0.6,
        ease: "power2.out" // Changed to power2 for smoother motion
      });
    } else {
      // Instant scale without animation
      selectedMesh.scale.set(
        selectedMesh.userData.originalScale.x * 1.3,
        selectedMesh.userData.originalScale.y * 1.3,
        selectedMesh.userData.originalScale.z * 1.3
      );
      
      selectedIcon.scale.set(1.3, 1.3, 1.3);
      
      // Set initial rotation to front position without animation
      this.itemGroup.rotation.x = -selectedContainer.userData.angle + 0;
      this.targetRotation = this.itemGroup.rotation.x;
    }
    
    this.currentIndex = index;

    // Only update floating preview when explicitly requested
    if (createPreview) {
      this.showingPreview = true;
      this.updateFloatingPreview(index);
    }
  }

  scrollSubmenu(delta) {
    // Calculate angle step between items
    const angleStep = (2 * Math.PI) / this.itemMeshes.length;

    // Smooth and more controlled scrolling
    this.targetRotation += delta > 0 ? -angleStep : angleStep;
    
    // Animate to the new position with improved easing
    gsap.to(this.itemGroup.rotation, {
      x: this.targetRotation,
      duration: 0.5, // Slightly longer for smoother motion
      ease: "power3.out", // Better deceleration curve
      onUpdate: () => {
        // Update the highlight during the animation
        this.updateFrontItemHighlight();
      },
      onComplete: () => {
        // Don't automatically update floating preview when scrolling
        // Only update existing preview if we already have one visible
        if (this.showingPreview) {
          this.updateFloatingPreview(this.currentIndex);
        }
      }
    });
  }

  updateFrontItemHighlight() {
    // Define front position (3 o'clock)
    const frontPosition = 0;
    
    let closestItem = null;
    let smallestAngleDiff = Infinity;
    
    // Find the item visually closest to the front position
    this.itemMeshes.forEach((container) => {
      // Calculate the effective angle accounting for rotation
      // Guard against missing userData
      if (!container || !container.userData || !this.itemGroup) return;
      
      const originalAngle = container.userData.angle || 0;
      const rotationAngle = this.itemGroup.rotation.x || 0;
      
      // Calculate effective angle and ensure it's a valid number
      let effectiveAngle = (originalAngle + rotationAngle) % (Math.PI * 2);
      
      // Normalize the angle to [0, 2π) range
      const normalizedAngle = effectiveAngle < 0 ? 
                             effectiveAngle + (Math.PI * 2) : 
                            effectiveAngle;
      
      // Calculate the angular difference to the front position
      let angleDiff = Math.abs(normalizedAngle - frontPosition);
      
      // Ensure we get the smallest angle (shortest arc)
      if (angleDiff > Math.PI) {
        angleDiff = (Math.PI * 2) - angleDiff;
      }
      
      // Update the closest item if this one is closer
      if (angleDiff < smallestAngleDiff) {
        smallestAngleDiff = angleDiff;
        closestItem = container;
      }
    });

    // Only highlight if we found an item and it's different from current
    if (closestItem && closestItem.userData.index !== this.currentIndex) {
      // Deselect current item
      if (this.currentIndex >= 0 && this.currentIndex < this.itemMeshes.length) {
        const currentContainer = this.itemMeshes[this.currentIndex];
        if (currentContainer && currentContainer.userData) {
          const currentMesh = currentContainer.userData.mesh;
          const currentIcon = currentContainer.userData.iconMesh;
          
          if (currentMesh && currentMesh.userData && currentIcon) {
            // Reset to original appearance
            currentMesh.material.color.copy(currentMesh.userData.originalColor);
            currentMesh.material.emissive = new THREE.Color(0x000000);
            currentMesh.scale.copy(currentMesh.userData.originalScale);
            currentIcon.scale.set(1, 1, 1);
            
            // Cancel any ongoing animations and reset rotation immediately
            gsap.killTweensOf(currentIcon.rotation);
            gsap.set(currentIcon.rotation, { x: 0, y: 0, z: 0 });
          }
        }
      }
      
      // Highlight the new item
      const newIndex = closestItem.userData.index;
      const mesh = closestItem.userData.mesh;
      const icon = closestItem.userData.iconMesh;
      
      if (mesh && icon) {
        mesh.material.color.set(this.config.highlightColor || 0x00ffff);
        mesh.material.emissive = new THREE.Color(0x003333);
        mesh.scale.set(
          mesh.userData.originalScale.x * 1.3,
          mesh.userData.originalScale.y * 1.3,
          mesh.userData.originalScale.z * 1.3
        );
        icon.scale.set(1.3, 1.3, 1.3);
        
        // Add clean geodesic spin animation
        gsap.killTweensOf(icon.rotation);
        gsap.timeline()
          .to(icon.rotation, {
            y: Math.PI * 2,
            x: Math.PI * 0.8,
            z: Math.PI * 0.5,
            duration: 1.0,
            ease: "power1.inOut"
          })
          .to(icon.rotation, {
            x: 0,
            z: 0,
            duration: 0.3,
            ease: "back.out(2)"
          }, "-=0.1");
        
        this.currentIndex = newIndex;
        
        // Only update if we're already showing a preview
        if (this.showingPreview) {
          this.updateFloatingPreview(newIndex);
        }
      }
    }
  }

  show() {
    this.visible = true;
    
    // Make sure close button is fully visible from the start
    if (this.closeButton) {
      // Reset to full scale immediately before any animations
      this.closeButton.scale.set(1, 1, 1);
      
      // Make sure X is visible
      if (this.closeButton.userData.xLines) {
        this.closeButton.userData.xLines.forEach(line => {
          line.scale.set(1, 1, 1);
          line.visible = true;
          
          // Force update of material
          if (line.material) {
            line.material.needsUpdate = true;
          }
        });
      }
      
      // Then apply the show animation
      gsap.fromTo(this.closeButton.scale, 
        { x: 0.5, y: 0.5, z: 0.5 }, // Start from half scale
        { 
          x: 1, y: 1, z: 1,   // End at full scale
          duration: 0.3,
          delay: 0.2,
          ease: "back.out"
        }
      );
    }
    
    // CRITICAL: First select and position the first item BEFORE any animations
    if (this.itemMeshes.length > 0) {
      // Position wheel so first item is directly in front
      const firstItem = this.itemMeshes[0];
      // Position at 3 o'clock
      this.itemGroup.rotation.x = -firstItem.userData.angle + 0;
      this.targetRotation = this.itemGroup.rotation.x;
      
      // Highlight the first item
      this.currentIndex = 0;
      const selectedMesh = firstItem.userData.mesh;
      const selectedIcon = this.itemMeshes[this.currentIndex]?.userData?.iconMesh;
        if (selectedIcon) {
          console.warn("✅ Selected icon ready for use:", selectedIcon);
        }
      
      // Apply highlight colors
selectedMesh.material.color.set(this.config.highlightColor || 0x00ffff);
      selectedMesh.material.emissive = new THREE.Color(0x003333);
    }
    
    // Make sure entire submenu appears with a smooth animation
    if (this.itemGroup) {
      // Start with a smaller scale
      this.itemGroup.scale.set(0.1, 0.1, 0.1);
      
      // Animate to full size
      gsap.to(this.itemGroup.scale, {
        x: 1, y: 1, z: 1,
        duration: 0.5,
        ease: "back.out(1.7)"
      });
      
      // Also animate rotation for a nice effect
      gsap.from(this.itemGroup.rotation, {
        y: Math.PI,
        duration: 0.6,
        ease: "power2.out"
      });
    }
    
    // Then animate all items appearing
    this.itemMeshes.forEach((container, i) => {
      const mesh = container.userData.mesh;
      const iconMesh = container.userData.iconMesh;
      const hitArea = container.userData.hitArea;
      
      // Special scaling for the highlighted item (index 0)
      const isHighlighted = i === 0;
      const targetScaleMultiplier = isHighlighted ? 1.3 : 1.0;
      
      // Animate text
      gsap.to(mesh.scale, {
        x: mesh.userData.originalScale.x * targetScaleMultiplier,
        y: mesh.userData.originalScale.y * targetScaleMultiplier,
        z: mesh.userData.originalScale.z * targetScaleMultiplier,
        duration: 0.3,
        delay: i * 0.05,
        ease: "back.out"
      });
      
      // Animate icon
      gsap.to(iconMesh.scale, {
        x: isHighlighted ? 1.3 : 1.0,
        y: isHighlighted ? 1.3 : 1.0,
        z: isHighlighted ? 1.3 : 1.0,
        duration: 0.3,
        delay: i * 0.05 + 0.1,
        ease: "elastic.out"
      });
      
      // Only add geodesic spin to the highlighted icon (index 0)
      if (isHighlighted) {
        gsap.killTweensOf(iconMesh.rotation);
        gsap.timeline()
          .to(iconMesh.rotation, {
            y: Math.PI * 2,
            x: Math.PI * 0.8,
            z: Math.PI * 0.5,
            duration: 1.0,
            delay: i * 0.05 + 0.1,
            ease: "power1.inOut"
          })
          .to(iconMesh.rotation, {
            x: 0,
            z: 0,
            duration: 0.3,
            ease: "back.out(2)"
          }, "-=0.1");
      } else {
        // Ensure non-highlighted items have no rotation
        iconMesh.rotation.set(0, 0, 0);
      }
      
      // Show hit area
      if (hitArea) {
        gsap.to(hitArea.scale, {
          x: 1, y: 1, z: 1,
          duration: 0.1,
          delay: i * 0.05
        });
      }
    });
  }

  hide() {
    // Close floating preview first with a nice animation
    if (this.floatingPreview) {
      this.closeFloatingPreview();
    }
    
    this.itemMeshes.forEach((container, i) => {
      const mesh = container.userData.mesh;
      const iconMesh = container.userData.iconMesh;
      
      gsap.to(mesh.scale, {
        x: 0, y: 0, z: 0,
        duration: 0.2,
        delay: i * 0.03,
        ease: "back.in"
      });
      
      gsap.to(iconMesh.scale, {
        x: 0, y: 0, z: 0,
        duration: 0.2,
        delay: i * 0.03,
        ease: "back.in"
      });
    });
    
    // Scale out the close button
    if (this.closeButton) {
      gsap.to(this.closeButton.scale, {
        x: 0, y: 0, z: 0,
        duration: 0.2,
        ease: "back.in"
      });
    }
  }
  
  update() {
    try {
      // Smooth rotation with improved damping for fluid motion
      if (this.targetRotation !== undefined && this.itemGroup) {
        const rotationDiff = this.targetRotation - this.itemGroup.rotation.x;
        if (Math.abs(rotationDiff) > 0.001) { // More sensitive threshold
          // Apply ease-out style damping for smoother deceleration
          const dampingFactor = Math.min(1, Math.max(0.05, Math.abs(rotationDiff) * 0.8));
          this.itemGroup.rotation.x += rotationDiff * dampingFactor * this.rotationSpeed;
        } else {
          // Snap exactly to target when very close
          this.itemGroup.rotation.x = this.targetRotation;
        }
      }
      
      // Position submenu correctly relative to parent item
      if (this.parentItem && this.parentItem.parent) {
        try {
          // Check if parent has valid matrices before trying to get world position
          if (this.parentItem.matrixWorld && this.parentItem.matrixWorld.elements) {
            // Get parent world position safely
            const parentWorldPos = new THREE.Vector3();
            this.parentItem.getWorldPosition(parentWorldPos);
            
            // Only copy position if we got valid coordinates
            if (!isNaN(parentWorldPos.x) && !isNaN(parentWorldPos.y) && !isNaN(parentWorldPos.z)) {
              this.position.copy(parentWorldPos);
            }
          }
          
          // Match parent Y rotation only if it's a valid number
          if (this.parentItem.rotation && !isNaN(this.parentItem.rotation.y)) {
            this.rotation.y = this.parentItem.rotation.y;
            
            // Also match parent's parent rotation (the carousel) with safeguards
            if (this.parentItem.parent.rotation && !isNaN(this.parentItem.parent.rotation.y)) {
              this.rotation.y = this.parentItem.parent.rotation.y + this.parentItem.rotation.y;
            }
          }
        } catch (positionError) {
          console.warn("Error positioning submenu:", positionError);
          // Continue execution despite positioning error
        }
      }
      
      // Find which item is at the front position (3 o'clock)
      const frontPosition = 0; // 3 o'clock position
      
      // Only process items if the arrays are valid
      if (this.itemMeshes && this.itemMeshes.length > 0) {
        let frontItemIndex = -1;
        let closestAngleDiff = Math.PI; // Initialize with largest possible value
      
        // First reset all items to non-highlighted state
        this.itemMeshes.forEach((container, i) => {
          if (!container || !container.userData) return;
          
          const mesh = container.userData.mesh;
          const iconMesh = container.userData.iconMesh;
          
          if (!mesh || !iconMesh) return;
          
          // Only reset if this isn't already the current item
          if (i !== this.currentIndex) {
            if (mesh.userData && mesh.userData.originalColor) {
              mesh.material.color.copy(mesh.userData.originalColor);
              mesh.material.emissive = new THREE.Color(0x000000);
              mesh.scale.copy(mesh.userData.originalScale);
              iconMesh.scale.set(1, 1, 1);
              
              // Make sure non-highlighted icons stay upright
              if (!gsap.isTweening(iconMesh.rotation)) {
                iconMesh.rotation.set(0, 0, 0);
              }
            }
          }
          
          // Calculate current angle of this item in the wheel
          const currentAngle = (container.userData.angle - this.itemGroup.rotation.x) % (Math.PI * 2);
          
          // Find distance to front position (handling wrap-around)
          let angleDiff = Math.abs(currentAngle - frontPosition);
          if (angleDiff > Math.PI) {
            angleDiff = Math.PI * 2 - angleDiff;
          }
          
          // If this is the closest item to front position so far
          if (angleDiff < closestAngleDiff && angleDiff < Math.PI/4) { // Only within 45 degrees
            closestAngleDiff = angleDiff;
            frontItemIndex = i;
          }
          
          // Keep text upright regardless of wheel rotation
          container.rotation.x = -this.itemGroup.rotation.x;
          
          // Reset any Y rotation for consistent appearance
          container.rotation.y = 0;
          
          // Basic wheel positioning
          container.position.y = this.watermillRadius * Math.sin(container.userData.angle);
          container.position.z = this.watermillRadius * Math.cos(container.userData.angle);
        });
        
        // If we found an item at the front position, highlight it
        if (frontItemIndex >= 0 && frontItemIndex !== this.currentIndex && 
            frontItemIndex < this.itemMeshes.length) {
          
          // Deselect the current item if it's different
          if (this.currentIndex >= 0 && this.currentIndex < this.itemMeshes.length) {
            const currentContainer = this.itemMeshes[this.currentIndex];
            if (currentContainer && currentContainer.userData) {
              const currentMesh = currentContainer.userData.mesh;
              const currentIcon = currentContainer.userData.iconMesh;
              
              if (currentMesh && currentMesh.userData && currentIcon) {
                currentMesh.material.color.copy(currentMesh.userData.originalColor);
                currentMesh.material.emissive = new THREE.Color(0x000000);
                currentMesh.scale.copy(currentMesh.userData.originalScale);
                currentIcon.scale.set(1, 1, 1);
                
                // Cancel any ongoing animations and reset rotation
                gsap.killTweensOf(currentIcon.rotation);
                gsap.set(currentIcon.rotation, { x: 0, y: 0, z: 0 });
              }
            }
          }
          
          // Highlight the new front item
          const frontContainer = this.itemMeshes[frontItemIndex];
          if (frontContainer && frontContainer.userData) {
            const frontMesh = frontContainer.userData.mesh;
            const frontIcon = frontContainer.userData.iconMesh;
            
            if (frontMesh && frontIcon) {
              // Apply highlight
              frontMesh.material.color.set(this.config.highlightColor || 0x00ffff);
              frontMesh.material.emissive = new THREE.Color(0x003333);
              frontMesh.scale.set(
                frontMesh.userData.originalScale.x * 1.3,
                frontMesh.userData.originalScale.y * 1.3,
                frontMesh.userData.originalScale.z * 1.3
              );
              frontIcon.scale.set(1.3, 1.3, 1.3);
              
              // Add clean 1-second geodesic spin animation only for newly highlighted item
              gsap.killTweensOf(frontIcon.rotation);
              gsap.timeline()
                .to(frontIcon.rotation, {
                  y: Math.PI * 2, // One full rotation
                  x: Math.PI * 0.8, // Tilt for geodesic path
                  z: Math.PI * 0.5, // Roll for geodesic path
                  duration: 1.0, // Exactly 1 second
                  ease: "power1.inOut" // Smooth acceleration and deceleration
                })
                .to(frontIcon.rotation, {
                  x: 0, // Reset to upright
                  z: 0, // Reset to upright
                  duration: 0.3, // Quick snap back
                  ease: "back.out(2)" // Snappy elastic ease
                }, "-=0.1");
              
              // Update current index
              this.currentIndex = frontItemIndex;
            }
          }
        }
      }
      
      // Handle close button - make it properly face camera
      if (this.closeButton) {
        // Make close button face camera by keeping it perpendicular to view
        this.closeButton.lookAt(0, 0, 10); // Look at camera position
        
        // Keep Z rotation at 0 to ensure X is oriented correctly
        this.closeButton.rotation.z = 0;
        
        // Keep it slightly forward of other elements
        this.closeButton.position.z = 0.5;
      }

      // Update floating preview position based on parent carousel rotation
      if (this.floatingPreview && this.parentItem && this.parentItem.parent) {
        // If parent carousel is rotating, stop the automatic spin
        if (this.parentItem.parent.rotation.y !== this.lastParentRotation) {
          if (this.isSpinning) {
            this.stopFloatingPreviewSpin();
          }
          
          // Match the parent's rotation for the floating preview
          this.floatingPreview.rotation.y = this.parentItem.parent.rotation.y;
        } else if (!this.isSpinning) {
          // If parent stopped moving and we're not spinning, restart the spin
          this.startFloatingPreviewSpin();
        }
        
        // Store last rotation for comparison
        this.lastParentRotation = this.parentItem.parent.rotation.y;

        // Make sure the preview reflects the current highlighted item
        if (this.floatingPreview.userData.index !== this.currentIndex) {
          this.updateFloatingPreview(this.currentIndex);
        }
      }
    } catch (error) {
      console.error("Error in Carousel3DSubmenu update:", error);
      // Prevent further errors by setting a safe state
      this.isErrorState = true;
    }
  }
// Floating Preview Methods
  createFloatingPreview(index) {
    // Remove any existing preview
    if (this.floatingPreview) {
      if (this.floatingPreview.parent) {
        this.floatingPreview.parent.remove(this.floatingPreview);
      }
      this.floatingPreview = null;
    }
    
    if (index < 0 || index >= this.itemMeshes.length) return;
    
    const item = this.items[index];
    const sourceContainer = this.itemMeshes[index];
    
    // Create a new group for the floating preview
    this.floatingPreview = new THREE.Group();
    
    // Position it in the center, a bit forward from the parent item
    // Move it further back for better visibility
    this.floatingPreview.position.set(0, 0, -4.5);
    
    // Clone icon from the selected item with larger scale
    const sourceIcon = sourceContainer.userData.iconMesh;
    let previewIcon;
    
    // Handle different types of icons (meshes vs groups)
    if (sourceIcon instanceof THREE.Group) {
      // Clone the group structure
      previewIcon = new THREE.Group();
      sourceIcon.children.forEach(child => {
        if (child.isMesh) {
          const clonedGeometry = child.geometry.clone();
          const clonedMaterial = child.material.clone();
          const clonedMesh = new THREE.Mesh(clonedGeometry, clonedMaterial);
          
          // Copy position, rotation, and scale
          clonedMesh.position.copy(child.position);
          clonedMesh.rotation.copy(child.rotation);
          clonedMesh.scale.copy(child.scale);
          
          previewIcon.add(clonedMesh);
        }
      });
    } else {
      // Clone the mesh
      const clonedGeometry = sourceIcon.geometry.clone();
      const clonedMaterial = sourceIcon.material.clone();
      
      // Enhance material with emissive and glow for better visibility
      clonedMaterial.emissive = new THREE.Color(this.getIconColor(index));
      clonedMaterial.emissiveIntensity = 0.5;
      
      previewIcon = new THREE.Mesh(clonedGeometry, clonedMaterial);
    }
    
    // Scale up the icon (4x larger)
    previewIcon.scale.set(4, 4, 4);
    this.floatingPreview.add(previewIcon);
    
    // Create text label to display above the icon
    if (this.font) {
      const textGeometry = new TextGeometry(item.toString(), {
        font: this.font,
        size: 0.3, // Larger text
        height: 0.05,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelOffset: 0,
        bevelSegments: 5
      });
      
      textGeometry.computeBoundingBox();
      textGeometry.center();
      
      const textMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        emissive: 0x99ccff, // Light blue emissive for better visibility
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9
      });
      
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      
      // Position text above the icon
      textMesh.position.y = 2.2; // Position above the icon
      this.floatingPreview.add(textMesh);
    }
    
    // Store the index this preview represents
    this.floatingPreview.userData.index = index;
    
    // Start with zero scale and animate in
    this.floatingPreview.scale.set(0, 0, 0);
    this.floatingPreview.userData.originalPosition = this.floatingPreview.position.clone();
    
    // Add to the scene, making it a sibling of the submenu (not a child)
    if (this.parent) {
      this.parent.add(this.floatingPreview);
      
      // Animate in
      gsap.to(this.floatingPreview.scale, {
        x: 1, y: 1, z: 1,
        duration: 0.8,
        ease: "elastic.out(1, 0.5)"
      });
      
      // Start the slow rotation animation
      this.startFloatingPreviewSpin();
    }
  }
  
  startFloatingPreviewSpin() {
    if (!this.floatingPreview) return;
    
    this.isSpinning = true;
    
    // Create a continuous slow rotation animation
    gsap.to(this.floatingPreview.rotation, {
      y: Math.PI * 2,
      duration: 20, // Very slow rotation - 20 seconds for full rotation
      ease: "none",
      repeat: -1, // Infinite repeats
      onComplete: () => {
        this.floatingPreview.rotation.y = 0; // Reset to avoid growing values
      }
    });
  }
  
  stopFloatingPreviewSpin() {
    if (!this.floatingPreview) return;
    
    this.isSpinning = false;
    gsap.killTweensOf(this.floatingPreview.rotation);
  }
  
  updateFloatingPreview(index) {
    // Don't update if the preview already shows this index
    if (this.floatingPreview && this.floatingPreview.userData.index === index) {
      return;
    }
    
    if (index < 0 || index >= this.itemMeshes.length) return;
    
    // Fade out current preview
    if (this.floatingPreview) {
      gsap.to(this.floatingPreview.scale, {
        x: 0, y: 0, z: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          // Remove old preview
          if (this.floatingPreview && this.floatingPreview.parent) {
            this.floatingPreview.parent.remove(this.floatingPreview);
          }
          
          // Create new preview
          this.createFloatingPreview(index);
        }
      });
    } else {
      this.createFloatingPreview(index);
    }
  }
  
  closeFloatingPreview() {
    if (!this.floatingPreview) return;
    
    // Stop the spinning animation
    this.stopFloatingPreviewSpin();
    this.showingPreview = false;
    
    // Animate out
    gsap.to(this.floatingPreview.scale, {
      x: 0, y: 0, z: 0,
      duration: 0.4,
      ease: "back.in",
      onComplete: () => {
        // Remove from parent
        if (this.floatingPreview && this.floatingPreview.parent) {
          this.floatingPreview.parent.remove(this.floatingPreview);
        }
        
        // Dispose resources
        if (this.floatingPreview) {
          this.floatingPreview.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
              } else {
                obj.material.dispose();
              }
            }
          });
          
          this.floatingPreview = null;
        }
      }
    });
  }
  
  // Clean disposal method to prevent memory leaks
  dispose() {
    // Mark as being disposed to prevent further updates
    this.isBeingDisposed = true;
    
    // Complete any running animations
    gsap.killTweensOf(this.itemGroup.rotation);
    
    if (this.itemMeshes) {
      this.itemMeshes.forEach(container => {
        if (!container) return;
        
        // Kill any ongoing animations
        if (container.userData && container.userData.mesh) {
          gsap.killTweensOf(container.userData.mesh.scale);
          gsap.killTweensOf(container.userData.mesh.material);
        }
        
        if (container.userData && container.userData.iconMesh) {
          gsap.killTweensOf(container.userData.iconMesh.scale);
          gsap.killTweensOf(container.userData.iconMesh.rotation);
        }
        
        // Remove from parent
        if (container.parent) {
          container.parent.remove(container);
        }
        
        // Dispose geometries and materials
        if (container.children) {
          container.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
              } else {
                child.material.dispose();
              }
            }
          });
        }
      });
    }
    
    // Clear arrays
    this.itemMeshes = [];
    
    // Dispose close button
    if (this.closeButton) {
      gsap.killTweensOf(this.closeButton.scale);
      
      if (this.closeButton.children) {
        this.closeButton.children.forEach(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
      
      if (this.closeButton.parent) {
        this.closeButton.parent.remove(this.closeButton);
      }
      
      // Clear reference to close button
      this.closeButton = null;
    }
    
    // Remove from scene if parent exists
    if (this.parent) {
      this.parent.remove(this);
    }
    
    // Ensure matrix cleanup to prevent cascading errors
    if (this.matrix) this.matrix.identity();
    if (this.matrixWorld) this.matrixWorld.identity();
    
    // Clear other references
    this.currentIndex = -1;
    this.parentItem = null;
    this.itemGroup = null;
    this.fixedElements = null;
    
    // Set flag to indicate this object has been disposed
    this.isDisposed = true;

    // Stop floating preview animations and remove it
    if (this.floatingPreview) {
      gsap.killTweensOf(this.floatingPreview.rotation);
      gsap.killTweensOf(this.floatingPreview.scale);
      
      if (this.floatingPreview.parent) {
        this.floatingPreview.parent.remove(this.floatingPreview);
      }
      
      // Dispose resources
      this.floatingPreview.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      
      this.floatingPreview = null;
    }
  }
}