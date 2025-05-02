/**
 * @AI-PROMPT
 * This file implements nested 3D submenu cylinders.
 * When a user selects an item in Carousel3DPro, use this class to pop out submenus around it.
 */

import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
// Removed unused imports: getGlowShaderMaterial, getOpacityFadeMaterial, defaultCarouselStyle
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


// Access GSAP from the global scope
import gsap from 'gsap';

// Cache font to improve performance
let cachedFont = null;

// 🔁 Shared angle generator
export function getItemAngles(itemCount) {
  const angleConfigurations = {
    1: [0],
    2: [0, Math.PI],
    3: [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3],
    4: [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2],
    5: [0, (2 * Math.PI) / 5, (4 * Math.PI) / 5, (6 * Math.PI) / 5, (8 * Math.PI) / 5],
    6: [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3],
    7: [0, Math.PI / 3.5, (2 * Math.PI) / 3.5, (3 * Math.PI) / 3.5, (4 * Math.PI) / 3.5, (5 * Math.PI) / 3.5, (6 * Math.PI) / 3.5],
    8: [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (6 * Math.PI) / 4, (7 * Math.PI) / 4],
    9: [0, Math.PI / 4.5, (2 * Math.PI) / 4.5, (3 * Math.PI) / 4.5, (4 * Math.PI) / 4.5, (5 * Math.PI) / 4.5, (6 * Math.PI) / 4.5, (7 * Math.PI) / 4.5, (8 * Math.PI) / 4.5],
    10: [0, Math.PI / 5, (2 * Math.PI) / 5, (3 * Math.PI) / 5, (4 * Math.PI) / 5, Math.PI, (6 * Math.PI) / 5, (7 * Math.PI) / 5, (8 * Math.PI) / 5, (9 * Math.PI) / 5]
  };
  if (angleConfigurations[itemCount]) {
    return angleConfigurations[itemCount];
  } else {
    const angles = [];
    const angleStep = (2 * Math.PI) / itemCount;
    for (let i = 0; i < itemCount; i++) {
      angles.push(i * angleStep);
    }
    return angles;
  }
}

export class Carousel3DSubmenu extends THREE.Group {
  constructor(parentItem, items = [], config = {}) {
    super();
    this.parentItem = parentItem; // Reference to the parent item that this submenu will be attached to
    this.items = items; // Array of items to display in the submenu
    this.config = config; // Configuration options for the submenu
    this.itemMeshes = []; // Array to store item meshes
    this.currentIndex = 0; // Index of the currently selected item
    this.watermillRadius = 1.2; // Radius of the circular arrangement of items
    this.rotationAngle = 0; // Current rotation angle of the submenu
    this.targetRotation = 0; // Target rotation angle for animations
    this.rotationSpeed = 0.15; // Increased for smoother rotation
    this.isInitialized = false; // Track initialization state
    this.floatingPreview = null; // Reference to the floating preview mesh
    this.isSpinning = false; // Track if the submenu is currently spinning
    this.showingPreview = false; // Track if preview is currently being shown
    this.lastParentRotation = 0; // Initialize to track parent rotation

    this.HOME_ROTATION_Y = 0; // Treat 3 o'clock as 0 radians
    this.EPSILON = 0.01; // Threshold for angle correction
    this.isTransitioning = false; // Prevents multiple simultaneous transitions
    this.selectItemLock = false; // Prevents item selection during transitions
    this.forceSelectLock = false; // Prevents forced selection during transitions
    this.targetRotationLocked = false; // Prevents target rotation changes during transitions
    this.forceLockedIndex = null; // Prevents forced selection during transitions
    this.clickedUniqueId = null; // Unique ID of the clicked item for verification
    this.highlightLock = false; // Prevents highlighting during transitions
    this.intendedClickIndex = null; // Intended index for click verification


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
      this.fontLoader.load('/helvetiker_regular.typeface.json', (font) => {
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
    this.position.copy(this.parentItem.position); // Copy position from parent
    // Move slightly forward from parent item for better visibility
    const forwardDir = new THREE.Vector3(0, 0, 0.2); // Move forward in Z
    forwardDir.applyQuaternion(this.parentItem.quaternion); // Apply parent's rotation
    this.position.add(forwardDir); // Adjust position

    // Create container for fixed UI elements that don't rotate with the wheel
    this.fixedElements = new THREE.Group(); // Create a separate group for fixed elements
    this.add(this.fixedElements); //  Add to the main group

    // Add close button immediately with fixed position - only call once
    this.addCloseButtonPlaceholder(); // Add close button to fixed elements

    const parentWorldRotation = new THREE.Euler().setFromQuaternion(this.parentItem.getWorldQuaternion(new THREE.Quaternion()));
    const parentY = parentWorldRotation.y;

    // When selecting default front-facing item (index 0)
    if (this.itemMeshes.length > 0) {
      const firstItem = this.itemMeshes[0];
      this.itemGroup.rotation.x = -firstItem.userData.angle + parentY;
      this.targetRotation = this.itemGroup.rotation.x;
    }

  }

  addCloseButtonPlaceholder() { // Create a placeholder for the close button
    // Create a red disk with VISIBLE settings
    const baseGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 24); // Cylinder for close button
    const baseMaterial = new THREE.MeshStandardMaterial({ // Use MeshStandardMaterial for better lighting
      color: 0xff3333, // Red color
      transparent: true, // Start with transparent material
      opacity: 0.45, // Start visible immediately
      metalness: 0.5, // Slightly shiny
      roughness: 0.3, // Less rough for a smoother look
      emissive: 0xff0000, // Red emissive glow
      emissiveIntensity: 0.5 // Stronger glow
    });

    this.closeButton = new THREE.Mesh(baseGeometry, baseMaterial);

    // Position the close button
    this.closeButton.position.set(1.8, 1.8, 0.5); // Positioned in top corner
    this.closeButton.scale.set(0.8, 0.8, 0.8); // Start slightly smaller for animation
    this.closeButton.renderOrder = 9999;

    // Set isCloseButton flag
    this.closeButton.userData = { // Set userData for easy access
      isCloseButton: true, // Flag to identify close button
      originalColor: baseMaterial.color.clone(), // Store original color for reset
      hoverColor: new THREE.Color(0xff0000) // Red hover color
    };

    // Add the "X" to the red disk
    this.createCloseButtonX();

    // Add to fixed elements group
    this.fixedElements.add(this.closeButton);
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
    line1.rotation.y = Math.PI / 4; // 45 degrees

    // Second line of X
    const line2 = new THREE.Mesh(lineGeometry2, lineMaterial);
    line2.position.set(0, 0, 0.03); // Raised up from disk surface
    line2.rotation.y = -Math.PI / 4; // -45 degrees

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

    // Use pre-calculated angles instead of dynamic calculation
    const angles = getItemAngles(this.items.length);

    // Calculate even distribution around the wheel
    // const angleStep = (2 * Math.PI) / this.items.length;

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
        depth: 0.02,
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
      const clonedMaterial = material.clone(); // Clone material for isolation
      const mesh = new THREE.Mesh(geometry, clonedMaterial);

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
      let iconMesh = null; // Initialize iconMesh to null
      const iconOffset = Math.max(0.7, textWidth * 0.25); // Calculate offset
      let baseScale = new THREE.Vector3(1, 1, 1); // Default base scale

      if (item === 'Cart') {
        // Load the GLTF cart model asynchronously
        const loader = new GLTFLoader();
        loader.load('/assets/Cart.glb', (gltf) => {
          const model = gltf.scene;

          // ✅ Step 1: Save original scale after loading model
          baseScale.set(0.3, 0.3, 0.3); // Set specific base scale for Cart
          model.scale.copy(baseScale);
          model.userData.originalScale = baseScale.clone(); // Store original scale
          model.position.x = -textWidth / 2 - iconOffset; // Use calculated offset
          model.userData.isCartIcon = true; // Optional tag

          container.add(model); // Add model to container when loaded
          container.userData.iconMesh = model; // Store reference in userData

          model.traverse((child) => {
            if (child.isMesh) {
              child.material = child.material.clone(); // Prevent sharing materials
              child.material.emissive = new THREE.Color(this.getIconColor(index));
              child.material.emissiveIntensity = 0.3;
              // Ensure materials are updated
              child.material.needsUpdate = true;
            }
          });

          // Animate icon scale after loading (only if the submenu is still visible)
          if (!this.isBeingDisposed && this.visible) {
            const isHighlighted = container.userData.index === this.currentIndex;
            const multiplier = isHighlighted ? 1.3 : 1.0;

            gsap.set(model.scale, { x: 0, y: 0, z: 0 }); // Start invisible
            gsap.to(model.scale, {
              x: model.userData.originalScale.x * multiplier, // Use original scale
              y: model.userData.originalScale.y * multiplier,
              z: model.userData.originalScale.z * multiplier,
              duration: 0.5,
              ease: 'elastic.out',
            });

            // If this item is highlighted when loaded, apply spin
            if (isHighlighted && model) { // Add model check
              gsap.killTweensOf(model.rotation);
              gsap.timeline()
                .to(model.rotation, {
                  y: Math.PI * 2, x: Math.PI * 0.8, z: Math.PI * 0.5,
                  duration: 1.0, ease: "power1.inOut"
                })
                .to(model.rotation, {
                  x: 0, z: 0, duration: 0.3, ease: "back.out(2)"
                }, "-=0.1");
            }
          }
        }, undefined, (error) => {
          console.error(`Error loading Cart.glb: ${error}`);
        });

      } else if (isGallerySubmenu && galleryShapes[item]) {
        // Use special Gallery icon (synchronous)
        iconMesh = galleryShapes[item]();
        iconMesh.position.x = -textWidth / 2 - iconOffset;
        iconMesh.userData.originalScale = baseScale.clone(); // Store default base scale (1,1,1)
        container.add(iconMesh);
        container.userData.iconMesh = iconMesh;
        iconMesh.scale.set(0, 0, 0);
      } else {
        // Use regular shape (synchronous)
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
        iconMesh.position.x = -textWidth / 2 - iconOffset;
        iconMesh.userData.originalScale = baseScale.clone(); // Store default base scale (1,1,1)
        container.add(iconMesh);
        container.userData.iconMesh = iconMesh;
        iconMesh.scale.set(0, 0, 0);
      }

      // For longer text items, shift the text slightly right to make more room for the icon
      if (textWidth > 2) {
        // For very long text, shift it more to the right
        mesh.position.x = iconOffset * 0.3; // Shift text slightly right
      }

      // Use pre-calculated angle instead of dynamic calculation
      const angle = angles[index];

      // Position around the parent
      // const angle = angleStep * index;

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
        springDamping: 0.6,
        iconMesh: container.userData.iconMesh || null, // Ensure iconMesh is stored (might be null initially for Cart)
        // Add a unique ID to ensure correct tracking during animations
        uniqueId: `item-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
      };

      // Store original scale with the actual mesh
      mesh.userData = {
        originalScale: mesh.scale.clone(),
        originalColor: material.color.clone()
      };

      // Start text invisible for animation
      mesh.scale.set(0, 0, 0);
      // Icon scale is set to 0 above for non-GLTF items
      hitArea.scale.set(0, 0, 0);

      this.itemMeshes.push(container);
      this.itemGroup.add(container);
    });

    // Highlight first item
    if (this.itemMeshes.length > 0) {
      this.selectItem(0, false);
      // Don't create floating preview automatically
    }

    // At initialization time, after loading any models, traverse all items:
    this.itemMeshes.forEach(container => {
      container.traverse(child => {
        if (child.material) {
          // Force clone each material and assign a unique UUID
          child.material = child.material.clone();
          child.material.uuid = THREE.MathUtils.generateUUID();
        }
      });
    });
  }

  selectItem(index, animate = true, createPreview = true) {
    // Skip if invalid index
    if (index < 0 || index >= this.itemMeshes.length) return;

    // Skip if we're already transitioning (servo lock)
    if (this.isTransitioning) {
      console.log(`🔒 Ignoring selection of item ${index} - transition in progress`);
      return;
    }

    console.log(`🎯 Selecting item ${index}: ${this.items[index]}`);

    // Lock transitions immediately
    this.isTransitioning = true;
    this.selectItemLock = true;
    this.targetRotationLocked = true;

    // Add a timeout-based lock to prevent oscillation
    setTimeout(() => {
      this.isTransitioning = false;
    }, 300); // Lock for 300ms after selection

    // Get previous and new containers
    const previousIndex = this.currentIndex;
    const selectedContainer = this.itemMeshes[index];

    // Guard against invalid container
    if (!selectedContainer || !selectedContainer.userData) {
      this.isTransitioning = false;
      this.selectItemLock = false;
      this.targetRotationLocked = false;
      return;
    }

    // Calculate EXACT target rotation using precomputed angles
    // Use index-based position (like a servo motor) instead of angle calculations
    const targetRotation = -selectedContainer.userData.originalAngle;

    console.log(`⚙️ Servo positioning to index ${index} at angle ${selectedContainer.userData.originalAngle.toFixed(4)}`);
    console.log(`🔄 Target rotation: ${targetRotation.toFixed(4)}`);

    // Store target and set current index immediately
    this.targetRotation = targetRotation;
    this.currentIndex = index;

    // Handle deselection of previous item
    if (previousIndex !== index && previousIndex >= 0 && previousIndex < this.itemMeshes.length) {
      const currentContainer = this.itemMeshes[previousIndex];

      // Guard against missing container or userData
      if (currentContainer && currentContainer.userData) {
        const currentMesh = currentContainer.userData.mesh;
        const currentIcon = currentContainer.userData.iconMesh;

        // Reset text appearance if we have valid mesh and userData
        if (currentMesh && currentMesh.userData && currentMesh.material) {
          currentMesh.material.color.copy(currentMesh.userData.originalColor);
          currentMesh.material.emissive = new THREE.Color(0x000000);

          if (animate) {
            gsap.to(currentMesh.scale, {
              x: currentMesh.userData.originalScale.x,
              y: currentMesh.userData.originalScale.y,
              z: currentMesh.userData.originalScale.z,
              duration: 0.3
            });
          } else {
            currentMesh.scale.copy(currentMesh.userData.originalScale);
          }
        }

        // Reset icon appearance if we have a valid icon
        if (currentIcon && currentIcon.userData) {
          const iconOriginal = currentIcon.userData.originalScale || new THREE.Vector3(1, 1, 1);

          if (animate) {
            gsap.to(currentIcon.scale, {
              x: iconOriginal.x,
              y: iconOriginal.y,
              z: iconOriginal.z,
              duration: 0.3
            });

            gsap.killTweensOf(currentIcon.rotation);
            gsap.set(currentIcon.rotation, { x: 0, y: 0, z: 0 });
          } else {
            currentIcon.scale.copy(iconOriginal);
            currentIcon.rotation.set(0, 0, 0);
          }
        }
      }
    }

    // Apply selection to new item
    const selectedMesh = selectedContainer.userData.mesh;
    const selectedIcon = selectedContainer.userData.iconMesh;

    // Guard against missing mesh
    if (selectedMesh && selectedMesh.userData) {
      // Apply highlight appearance
      selectedMesh.material.color.set(this.config.highlightColor || 0x00ffff);
      selectedMesh.material.emissive = new THREE.Color(0x003333);

      if (animate) {
        gsap.to(selectedMesh.scale, {
          x: selectedMesh.userData.originalScale.x * 1.3,
          y: selectedMesh.userData.originalScale.y * 1.3,
          z: selectedMesh.userData.originalScale.z * 1.3,
          duration: 0.3
        });
      } else {
        selectedMesh.scale.set(
          selectedMesh.userData.originalScale.x * 1.3,
          selectedMesh.userData.originalScale.y * 1.3,
          selectedMesh.userData.originalScale.z * 1.3
        );
      }
    }

    // Handle icon animation if we have a valid icon
    if (selectedIcon && selectedIcon.userData) {
      const iconOriginal = selectedIcon.userData.originalScale || new THREE.Vector3(1, 1, 1);
      const multiplier = 1.3;

      if (animate) {
        gsap.to(selectedIcon.scale, {
          x: iconOriginal.x * multiplier,
          y: iconOriginal.y * multiplier,
          z: iconOriginal.z * multiplier,
          duration: 0.3,
          ease: "back.out"
        });

        gsap.killTweensOf(selectedIcon.rotation);
        gsap.timeline()
          .to(selectedIcon.rotation, {
            y: Math.PI * 2,
            x: Math.PI * 0.8,
            z: Math.PI * 0.5,
            duration: 1.0,
            ease: "power1.inOut"
          })
          .to(selectedIcon.rotation, {
            x: 0,
            z: 0,
            duration: 0.3,
            ease: "back.out(2)"
          }, "-=0.1");
      } else {
        selectedIcon.scale.set(
          iconOriginal.x * multiplier,
          iconOriginal.y * multiplier,
          iconOriginal.z * multiplier
        );
      }
    }

    // Perform rotation with servo-like control
    if (animate) {
      // Cancel any existing animations
      gsap.killTweensOf(this.itemGroup.rotation);

      gsap.to(this.itemGroup.rotation, {
        x: targetRotation,
        duration: 0.6,
        ease: "power2.out",
        onUpdate: () => {
          // Keep text facing forward
          this.itemMeshes.forEach(container => {
            if (container && container.rotation) {
              container.rotation.x = -this.itemGroup.rotation.x;
            }
          });

          // Snap precisely to target when very close
          if (Math.abs(targetRotation - this.itemGroup.rotation.x) < 0.01) {
            this.itemGroup.rotation.x = targetRotation;
          }
        },
        onComplete: () => {
          // Force exact positioning (like a servo returning to a detent)
          this.itemGroup.rotation.x = targetRotation;

          // Verify correct item is highlighted
          this.currentIndex = index;

          // Release all locks
          this.isTransitioning = false;
          this.selectItemLock = false;
          this.targetRotationLocked = false;
          setTimeout(() => {
            this.intendedClickIndex = null;
          }, 100); // Buffer time to avoid timing collision

          console.log(`✅ Rotation complete. Index ${index} now at home position.`);

          // Handle preview creation with slight delay
          if (createPreview) {
            this.showingPreview = true;
            setTimeout(() => {
              this.updateFloatingPreview(index);
            }, 50);
          }
        }
      });
    } else {
      // Immediate positioning without animation
      this.itemGroup.rotation.x = targetRotation;

      // Update text orientation
      this.itemMeshes.forEach(container => {
        if (container && container.rotation) {
          container.rotation.x = -this.itemGroup.rotation.x;
        }
      });

      // Release locks
      this.isTransitioning = false;
      this.selectItemLock = false;
      this.targetRotationLocked = false;

      if (createPreview) {
        this.showingPreview = true;
        this.updateFloatingPreview(index);
      }
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

  // updateFrontItemHighlight() {
  //   // Define front position (3 o'clock)
  //   const frontPosition = 0;


  //   let smallestAngleDiff = Infinity;

  //   // Find the item visually closest to the front position
  //   this.itemMeshes.forEach((container) => {
  //     // Calculate the effective angle accounting for rotation
  //     // Guard against missing userData
  //     if (!container || !container.userData || !this.itemGroup) return;

  //     const originalAngle = container.userData.angle || 0;
  //     const rotationAngle = this.itemGroup.rotation.x || 0;

  //     // Calculate effective angle and ensure it's a valid number
  //     let effectiveAngle = (originalAngle + rotationAngle) % (Math.PI * 2);

  //     // Normalize the angle to [0, 2π) range
  //     const normalizedAngle = effectiveAngle < 0 ?
  //       effectiveAngle + (Math.PI * 2) :
  //       effectiveAngle;

  //     // Calculate the angular difference to the front position
  //     let angleDiff = Math.abs(normalizedAngle - frontPosition);

  //     // Ensure we get the smallest angle (shortest arc)
  //     if (angleDiff > Math.PI) {
  //       angleDiff = (Math.PI * 2) - angleDiff;
  //     }

  //     let closestItem = null;

  //     // Update the closest item if this one is closer
  //     if (angleDiff < smallestAngleDiff) {
  //       smallestAngleDiff = angleDiff;
  //       closestItem = container;
  //       this.currentIndex = container.userData.index;

  //       // If we found a different item to highlight than the current one
  //       if (closestItem && !this.isTransitioning && !this.intendedClickIndex &&
  //         closestItem.userData.index !== this.currentIndex) {

  //         // Deselect current highlighted item if different
  //         if (this.currentIndex >= 0 && this.currentIndex < this.itemMeshes.length) {
  //           const currentContainer = this.itemMeshes[this.currentIndex];
  //           if (currentContainer && currentContainer.userData) {
  //             const currentMesh = currentContainer.userData.mesh;
  //             const currentIcon = currentContainer.userData.iconMesh;

  //             if (currentMesh && currentMesh.userData && currentIcon) {
  //               // Reset to original appearance
  //               currentMesh.material.color.copy(currentMesh.userData.originalColor);
  //               currentMesh.material.emissive = new THREE.Color(0x000000);
  //               currentMesh.scale.copy(currentMesh.userData.originalScale);

  //               const iconOriginal = currentIcon.userData.originalScale || new THREE.Vector3(1, 1, 1);
  //               currentIcon.scale.copy(iconOriginal);

  //               // Cancel any ongoing animations
  //               gsap.killTweensOf(currentIcon.rotation);
  //               gsap.set(currentIcon.rotation, { x: 0, y: 0, z: 0 });
  //             }
  //           }
  //         }

  //         // Highlight the new item
  //         const newIndex = closestItem.userData.index;
  //         const mesh = closestItem.userData.mesh;
  //         const icon = closestItem.userData.iconMesh;

  //         if (mesh && icon) {
  //           // Apply highlight styling
  //           mesh.material.color.set(this.config.highlightColor || 0x00ffff);
  //           mesh.material.emissive = new THREE.Color(0x003333);
  //           mesh.scale.set(
  //             mesh.userData.originalScale.x * 1.3,
  //             mesh.userData.originalScale.y * 1.3,
  //             mesh.userData.originalScale.z * 1.3
  //           );

  //           const iconOriginal = icon.userData.originalScale || new THREE.Vector3(1, 1, 1);
  //           const multiplier = 1.3;
  //           icon.scale.set(
  //             iconOriginal.x * multiplier,
  //             iconOriginal.y * multiplier,
  //             iconOriginal.z * multiplier
  //           );

  //           // Add spin animation
  //           gsap.killTweensOf(icon.rotation);
  //           gsap.timeline()
  //             .to(icon.rotation, {
  //               y: Math.PI * 2,
  //               x: Math.PI * 0.8,
  //               z: Math.PI * 0.5,
  //               duration: 1.0,
  //               ease: "power1.inOut"
  //             })
  //             .to(icon.rotation, {
  //               x: 0,
  //               z: 0,
  //               duration: 0.3,
  //               ease: "back.out(2)"
  //             }, "-=0.1");

  //           this.currentIndex = newIndex;

  //           // Update preview if showing
  //           if (this.showingPreview) {
  //             this.updateFloatingPreview(newIndex);
  //           }
  //         }
  //       }
  //     }
  //   });

  //   // Only highlight if we found an item and it's different from current
  //   // if (closestItem && closestItem.userData.index !== this.currentIndex) {
  //   //   if (this.isTransitioning || this.intendedClickIndex !== null) {
  //   //     // A user click is in progress or we're rotating — skip highlight update
  //   //     return;
  //   //   }

  //   //   // Deselect current item
  //   //   if (this.currentIndex >= 0 && this.currentIndex < this.itemMeshes.length) {
  //   //     const currentContainer = this.itemMeshes[this.currentIndex];
  //   //     if (currentContainer && currentContainer.userData) {
  //   //       const currentMesh = currentContainer.userData.mesh;
  //   //       const currentIcon = currentContainer.userData.iconMesh;

  //   //       if (mesh && icon) {
  //   //         mesh.material.color.set(this.config.highlightColor || 0x00ffff);
  //   //         mesh.material.emissive = new THREE.Color(0x003333);
  //   //         mesh.scale.set(
  //   //           mesh.userData.originalScale.x * 1.3,
  //   //           mesh.userData.originalScale.y * 1.3,
  //   //           mesh.userData.originalScale.z * 1.3
  //   //         );

  //   //         // ✅ Step 2: Update scaling logic
  //   //         const iconOriginal = icon.userData.originalScale || new THREE.Vector3(1, 1, 1);
  //   //         const multiplier = 1.3;
  //   //         icon.scale.set(
  //   //           iconOriginal.x * multiplier,
  //   //           iconOriginal.y * multiplier,
  //   //           iconOriginal.z * multiplier
  //   //         ); // Set instantly using original scale

  //   //         // Add clean geodesic spin animation
  //   //         gsap.killTweensOf(icon.rotation);
  //   //         gsap.timeline()
  //   //           .to(icon.rotation, {
  //   //             y: Math.PI * 2,
  //   //             x: Math.PI * 0.8,
  //   //             z: Math.PI * 0.5,
  //   //             duration: 1.0,
  //   //             ease: "power1.inOut"
  //   //           })
  //   //           .to(icon.rotation, {
  //   //             x: 0,
  //   //             z: 0,
  //   //             duration: 0.3,
  //   //             ease: "back.out(2)"
  //   //           }, "-=0.1");

  //   //         this.currentIndex = newIndex;

  //   //         // Only update if we're already showing a preview
  //   //         if (this.showingPreview) {
  //   //           this.updateFloatingPreview(newIndex);
  //   //         }
  //   //       }
  //   //     }
  //   //   }
  //   // }
  // }

  updateFrontItemHighlight(force = false) {
    // ✅ Check locks at the very beginning to prevent any interference.
    // These flags are set in selectItem to indicate a controlled transition is active.
    // We check all relevant locks to ensure updateFrontItemHighlight doesn't
    // override the selection while selectItem is managing the state.
    if (this.isTransitioning || this.selectItemLock || this.forceLockedIndex !== null || this.highlightLock || this.intendedClickIndex !== null) {
        // console.log("🔒 Highlight update blocked by locks."); // Debug log
        return; // Do nothing if locked by a transition or selectItem
    }
     // If force is true, allow the update regardless of animation state (used by selectItem's onComplete)
    if (this.isAnimating && !force) return;

    // Define the target front position (3 o'clock) in radians.
    // Items are positioned such that angle 0 is at the front when itemGroup.rotation.x is 0.
    const frontPosition = 0; // <-- Variable declared and will be used

    let potentialFrontItemIndex = -1; // Variable to store the index of the item visually closest to the front
    let smallestAngleDiff = Infinity; // Variable to store the smallest angular difference found

    // 1. Iterate through all items to FIND the index of the visually closest item.
    //    DO NOT modify this.currentIndex within this loop.
    this.itemMeshes.forEach((container, index) => {
        // Basic guards for safety
        if (!container || !container.userData || !this.itemGroup) return;

        const originalAngle = container.userData.originalAngle || 0; // The item's angle when the group rotation is 0
        const currentGroupRotationX = this.itemGroup.rotation.x || 0; // The group's current rotation (negative for counterclockwise)

        // Calculate the item's current angle relative to the front position (0 radians).
        // We are calculating the angle of the item relative to the current front position (0).
        // If negative X rotation is counterclockwise, adding a negative rotation value
        // effectively moves the items counterclockwise. The angle of an item originally
        // at 'originalAngle' will be 'originalAngle + currentGroupRotationX' relative to the
        // original front, or 'originalAngle + currentGroupRotationX - frontPosition' relative to the current front.
        let angleRelativeToFront = (originalAngle + currentGroupRotationX - frontPosition); // Angle relative to the front


        // Calculate the shortest angular difference to 0, handling wrap-around.
        // This is a standard and robust way to get the shortest distance on a circle.
        let angleDiff = Math.abs((angleRelativeToFront + Math.PI) % (Math.PI * 2) - Math.PI); // <-- Robust angle diff calculation


        // Use a tolerance for robust comparison, accounting for floating point errors.
        // A smaller tolerance means items must be very close to be considered the 'closest'.
        const TOLERANCE = 0.01; // 0.01 radians is roughly 0.57 degrees. Adjust this value as needed.

        // Update the potentialFrontItemIndex if this item is closer than the current closest OR
        // if it's within tolerance and has a smaller index (for consistent tie-breaking).
        if (angleDiff < smallestAngleDiff - TOLERANCE) {
            // This item is clearly closer than the current closest (outside the tolerance of the current closest)
            smallestAngleDiff = angleDiff;
            potentialFrontItemIndex = index;
        } else if (Math.abs(angleDiff - smallestAngleDiff) <= TOLERANCE) {
            // This item is within the tolerance threshold of the current closest.
            // Use index as a tie-breaker: prefer the item with the smaller index if distances are very similar.
            // This provides stability when two neighbors are almost equally close.
            if (index < potentialFrontItemIndex || potentialFrontItemIndex === -1) { // If current item is at a smaller index or no item has been selected yet
                 smallestAngleDiff = angleDiff; // Update smallestAngleDiff to match this item's diff
                 potentialFrontItemIndex = index;
            }
        }
    });

    // --- Debugging: Log the determined front item ---
    // if (potentialFrontItemIndex !== -1) {
    //     console.log(`🔍 updateFrontItemHighlight found potential closest item: index=${potentialFrontItemIndex}, angleDiff=${smallestAngleDiff.toFixed(4)}`); // Debug log
    // } else {
    //     console.log("🔍 updateFrontItemHighlight: No item found close enough to front position."); // Debug log
    // }
    // --------------------------------------------------


    // 2. If a valid potential front item index is determined AND it's different from
    //    the current highlighted index (this.currentIndex), update the highlight.
    //    This check runs *after* the loop has finished finding the best candidate.
    if (potentialFrontItemIndex !== -1 && potentialFrontItemIndex !== this.currentIndex) {

        console.log(`🔄 updateFrontItemHighlight changing highlight from ${this.currentIndex} to ${potentialFrontItemIndex}`); // Debug log

        // Deselect the current highlighted item
        if (this.currentIndex >= 0 && this.currentIndex < this.itemMeshes.length) {
            const currentContainer = this.itemMeshes[this.currentIndex];
             // Guard against missing container or userData
            if (currentContainer && currentContainer.userData) {
                const currentMesh = currentContainer.userData.mesh;
                const currentIcon = currentContainer.userData.iconMesh;

                // Reset to original appearance if valid mesh/material/icon
                if (currentMesh && currentMesh.userData && currentMesh.userData.originalColor) {
                    currentMesh.material.color.copy(currentMesh.userData.originalColor); // Reset text color
                    currentMesh.material.emissive = new THREE.Color(0x000000); // Reset emissive
                    currentMesh.scale.copy(currentMesh.userData.originalScale); // Reset scale
                }

                // Reset icon scale and rotation if valid icon
                if (currentIcon && currentIcon.userData && currentIcon.userData.originalScale) {
                    const iconOriginal = currentIcon.userData.originalScale || new THREE.Vector3(1, 1, 1);
                    // ✅ Corrected variable name from iconIcon to currentIcon
                    currentIcon.scale.copy(iconOriginal); // Reset icon scale
                     // Kill any ongoing animations and reset rotation immediately
                    gsap.killTweensOf(currentIcon.rotation); // Stop icon rotation tweens
                    gsap.set(currentIcon.rotation, { x: 0, y: 0, z: 0 }); // Ensure non-highlighted icons are upright
                }
            }
        }

        // Highlight the new front item
        const frontContainer = this.itemMeshes[potentialFrontItemIndex];
        // Guard against missing container or userData
        if (frontContainer && frontContainer.userData) {
            const frontMesh = frontContainer.userData.mesh;
            // ✅ Corrected variable name from icon to frontIcon
            const frontIcon = frontContainer.userData.iconMesh;

             // Apply highlight if valid mesh/icon
             if (frontMesh && frontIcon) { // Ensure both mesh and icon exist before highlighting
                // Apply highlight appearance (color, emissive, scale)
                frontMesh.material.color.set(this.config.highlightColor || 0x00ffff); // Set highlight color
                frontMesh.material.emissive = new THREE.Color(0x003333); // Set emissive
                frontMesh.scale.set( // Scale up text
                    frontMesh.userData.originalScale.x * 1.3,
                    frontMesh.userData.originalScale.y * 1.3,
                    frontMesh.userData.originalScale.z * 1.3
                );

                // Apply highlight scale to icon
                if (frontIcon.userData && frontIcon.userData.originalScale) {
                    const iconOriginal = frontIcon.userData.originalScale || new THREE.Vector3(1, 1, 1);
                    const multiplier = 1.3;
                    // ✅ Corrected variable name from icon to frontIcon
                    frontIcon.scale.set( // Scale up icon
                        iconOriginal.x * multiplier,
                        iconOriginal.y * multiplier,
                        iconOriginal.z * multiplier
                    );
                }

                // Add clean geodesic spin animation to the icon
                // ✅ Corrected variable name from icon to frontIcon
                gsap.killTweensOf(frontIcon.rotation); // Kill previous rotation tweens
                gsap.timeline() // Use a timeline for sequential animations
                    .to(frontIcon.rotation, {
                        y: Math.PI * 2, // One full rotation around Y
                        x: Math.PI * 0.8, // Tilt around X for a geodesic path
                        z: Math.PI * 0.5, // Roll around Z for a geodesic path
                        duration: 1.0, // Exactly 1 second for the main spin
                        ease: "power1.inOut" // Smooth acceleration and deceleration
                    })
                    .to(frontIcon.rotation, {
                        x: 0, // Reset X rotation to upright
                        z: 0, // Reset Z rotation to upright
                        duration: 0.3, // Quick snap back to upright
                        ease: "back.out(2)" // Snappy elastic ease
                    }, "-=0.1"); // Overlap the reset with the end of the spin for smoothness

                // ✅ Update current index *after* highlighting
                this.currentIndex = potentialFrontItemIndex;

                // Update floating preview if showing
                if (this.showingPreview) {
                    this.updateFloatingPreview(this.currentIndex);
                }
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
      // Ensure initial highlight uses correct scale if icon is already loaded
      const firstIcon = firstItem.userData.iconMesh;
      if (firstIcon) {
        const iconOriginal = firstIcon.userData.originalScale || new THREE.Vector3(1, 1, 1);
        const multiplier = 1.3; // Highlight multiplier
        firstIcon.scale.set(
          iconOriginal.x * multiplier,
          iconOriginal.y * multiplier,
          iconOriginal.z * multiplier
        );
      }
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
      const iconMesh = container.userData.iconMesh; // Get iconMesh reference from userData
      const hitArea = container.userData.hitArea;

      // Special scaling for the highlighted item (index 0)
      const isHighlighted = i === 0;
      const textMultiplier = isHighlighted ? 1.3 : 1.0; // Multiplier for text

      // Animate text
      gsap.to(mesh.scale, {
        x: mesh.userData.originalScale.x * textMultiplier,
        y: mesh.userData.originalScale.y * textMultiplier,
        z: mesh.userData.originalScale.z * textMultiplier,
        duration: 0.3,
        delay: i * 0.05,
        ease: "back.out"
      });

      if (iconMesh) {
        // ✅ Step 2: Update scaling logic
        const iconOriginal = iconMesh.userData.originalScale || new THREE.Vector3(1, 1, 1);
        const iconMultiplier = isHighlighted ? 1.3 : 1.0; // Multiplier for icon

        // Animate icon scale from 0 to target scale based on original
        gsap.fromTo(iconMesh.scale,
          { x: 0, y: 0, z: 0 }, // Start from 0
          {
            x: iconOriginal.x * iconMultiplier,
            y: iconOriginal.y * iconMultiplier,
            z: iconOriginal.z * iconMultiplier,
            duration: 0.3,
            delay: i * 0.05 + 0.1,
            ease: "elastic.out"
          }
        );

        // Only add geodesic spin to the highlighted icon (index 0)
        if (isHighlighted) {
          gsap.killTweensOf(iconMesh.rotation);
          gsap.timeline()
            .to(iconMesh.rotation, {
              y: Math.PI * 2,
              x: Math.PI * 0.8,
              z: Math.PI * 0.5,
              duration: 1.0,
              delay: i * 0.05 + 0.1, // Keep delay consistent
              ease: "power1.inOut"
            })
            .to(iconMesh.rotation, {
              x: 0,
              z: 0,
              duration: 0.3,
              ease: "back.out(2)"
            }, "-=0.1");
        } else {
          // Ensure non-highlighted items have no rotation initially
          if (!gsap.isTweening(iconMesh.rotation)) {
            iconMesh.rotation.set(0, 0, 0);
          }
        }
      } // End if (iconMesh)

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

      // FIXED: Add null check for iconMesh
      if (iconMesh) {
        gsap.to(iconMesh.scale, {
          x: 0, y: 0, z: 0,
          duration: 0.2,
          delay: i * 0.03,
          ease: "back.in"
        });
      }
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

          // FIXED: Add null check for iconMesh before accessing properties
          // if (!mesh || !iconMesh) return; // Keep this check? Yes, safer.
          if (!mesh) return; // Only mesh is strictly required for text reset

          // Only reset if this isn't already the current item
          if (i !== this.currentIndex) {
            if (mesh.userData && mesh.userData.originalColor) {
              mesh.material.color.copy(mesh.userData.originalColor);
              mesh.material.emissive = new THREE.Color(0x000000);
              mesh.scale.copy(mesh.userData.originalScale);

              if (iconMesh) {
                // ✅ Step 2: Update scaling logic
                const iconOriginal = iconMesh.userData.originalScale || new THREE.Vector3(1, 1, 1);
                iconMesh.scale.copy(iconOriginal); // Reset instantly using original scale

                // Make sure non-highlighted icons stay upright
                if (!gsap.isTweening(iconMesh.rotation)) {
                  iconMesh.rotation.set(0, 0, 0);
                }
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
          if (angleDiff < closestAngleDiff && angleDiff < Math.PI / 4) { // Only within 45 degrees
            closestAngleDiff = angleDiff;
            frontItemIndex = i;
          }

          // Keep text upright regardless of wheel rotation
          container.rotation.x = -this.itemGroup.rotation.x;

          // Reset any Z rotation for consistent appearance
          // container.rotation.z = 0;

          // Reset any Y rotation for consistent appearance
          container.rotation.y = 0;

          // Basic wheel positioning - CORRECTED CALCULATION AND USAGE
          // Calculate the item's angle relative to the front position after group rotation
          const angleRelativeToFront = container.userData.angle - this.itemGroup.rotation.z;

          // Use this calculated angle to set the local position
          // This aims to position the item on the circle correctly by factoring
          // in the group rotation in the calculation used for the continuous update.
          container.position.y = this.watermillRadius * Math.sin(angleRelativeToFront); // <-- CORRECTED TO USE angleRelativeToFront
          container.position.z = this.watermillRadius * Math.cos(angleRelativeToFront); // <-- CORRECTED TO USE angleRelativeToFront

          // Basic wheel positioning
          // container.position.y = this.watermillRadius * Math.sin(container.userData.angle);
          // container.position.z = this.watermillRadius * Math.cos(container.userData.angle);
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

              // FIXED: Add null check for currentIcon
              if (currentMesh && currentMesh.userData && currentIcon) {
                currentMesh.material.color.copy(currentMesh.userData.originalColor);
                currentMesh.material.emissive = new THREE.Color(0x000000);
                currentMesh.scale.copy(currentMesh.userData.originalScale);

                // Determine base scale for deselected item
                const baseScale = currentContainer.userData.item === 'Cart' ? 0.3 : 1.0;
                currentIcon.scale.set(baseScale, baseScale, baseScale);

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

            // FIXED: Add null check for frontIcon
            if (frontMesh && frontIcon) {
              // Apply highlight
              frontMesh.material.color.set(this.config.highlightColor || 0x00ffff);
              frontMesh.material.emissive = new THREE.Color(0x003333);
              frontMesh.scale.set(
                frontMesh.userData.originalScale.x * 1.3,
                frontMesh.userData.originalScale.y * 1.3,
                frontMesh.userData.originalScale.z * 1.3
              );

              // ✅ Step 2: Update scaling logic
              const iconOriginal = frontIcon.userData.originalScale || new THREE.Vector3(1, 1, 1);
              const multiplier = 1.3;
              frontIcon.scale.set(
                iconOriginal.x * multiplier,
                iconOriginal.y * multiplier,
                iconOriginal.z * multiplier
              ); // Set instantly using original scale

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

      if (this.closeButton) {
        const cameraPosWorld = new THREE.Vector3(0, 0, 10); // Where the camera "is"

        // Convert to local space relative to closeButton’s parent
        this.closeButton.parent.worldToLocal(cameraPosWorld);

        // Make the button face that point
        this.closeButton.lookAt(cameraPosWorld);

        // Orient the red disk so its flat face looks forward (Z)
        this.closeButton.rotateZ(Math.PI / 2);

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

    // Add camera check and scene check early
    if (index < 0 || index >= this.itemMeshes.length || !this.camera || !this.scene || !this.config.carousel) { // Added carousel check
      // console.warn("[🍉 Preview] Cannot create floating preview: Invalid index, missing camera, scene, or carousel reference.", {
      //   index,
      //   hasCamera: !!this.camera,
      //   hasScene: !!this.scene,
      //   hasCarousel: !!this.config.carousel // Check for carousel reference
      // });
      return;
    }

    const item = this.items[index];
    const sourceContainer = this.itemMeshes[index];

    // Create a new group for the floating preview
    this.floatingPreview = new THREE.Group();

    // --- Position preview based on carousel center ---
    const center = new THREE.Vector3();
    // Use the injected carousel reference from config
    const carouselItemGroup = this.config.carousel?.itemGroup;

    if (carouselItemGroup) {
      carouselItemGroup.getWorldPosition(center); // Get world position of the main carousel's item group
      this.floatingPreview.position.copy(center);

      // Optional: Nudge slightly towards the camera or adjust Y position
      const offsetDirection = new THREE.Vector3();
      this.camera.getWorldPosition(offsetDirection); // Get camera position
      offsetDirection.sub(center).normalize(); // Get direction from center to camera
      // this.floatingPreview.position.addScaledVector(offsetDirection, 1.5); // Move slightly towards camera (adjust distance as needed)
      // this.floatingPreview.position.y += 0.75; // Float slightly above center
      this.floatingPreview.position.y += 1.2; // <<< FIX 4: Elevate floating preview

      // Make the preview face the camera
      this.floatingPreview.lookAt(this.camera.position);

    } else {
      // console.warn("⚠️ Could not find carousel itemGroup to determine center position. Falling back to camera-relative positioning.");
      // Fallback (original camera-relative positioning - might still be wrong)
      const distanceInFront = 4.5;
      const previewPosition = new THREE.Vector3();
      const cameraDirection = new THREE.Vector3();
      this.camera.getWorldDirection(cameraDirection);
      this.camera.getWorldPosition(previewPosition); // Get camera's world position
      previewPosition.addScaledVector(cameraDirection, distanceInFront); // Move forward
      this.floatingPreview.position.copy(previewPosition);
      this.floatingPreview.rotation.copy(this.camera.rotation); // Face camera (approx)
      this.floatingPreview.position.y += 1.2; // <<< FIX 4: Elevate floating preview (fallback case)
    }
    // --- End Positioning ---


    // Log the calculated position
    // console.warn("Floating Preview Calculated Position:", this.floatingPreview.position);

    // Clone icon from the selected item with larger scale
    const sourceIcon = sourceContainer.userData.iconMesh;
    let previewIcon = null; // Initialize to null

    // <<< ADD DEBUG LOG for Cart cloning >>>
    if (item === 'Cart' && sourceIcon) {
      // console.warn('🧩 Cloning Cart icon:', {
      //   isGroup: sourceIcon instanceof THREE.Group,
      //   childrenCount: sourceIcon.children?.length,
      //   sourceIcon // Log the object itself for inspection
      // });
    }

    // Handle different types of icons (meshes vs groups)
    if (sourceIcon instanceof THREE.Group) {
      // <<< FIX: Clone the entire group structure recursively >>>
      previewIcon = sourceIcon.clone(true); // Use recursive clone
      // <<< FIX: Traverse cloned group to clone materials and set emissive >>>
      previewIcon.traverse(child => {
        if (child.isMesh) {
          // Ensure material exists and is clonable
          if (child.material && typeof child.material.clone === 'function') {
            child.material = child.material.clone(); // Clone material
            // Set emissive properties on the cloned material
            child.material.emissive = new THREE.Color(this.getIconColor(index));
            child.material.emissiveIntensity = 0.3;
            child.material.needsUpdate = true; // Ensure update
          } else {
            // console.warn("[🍉 Preview Clone] Child mesh material missing or not clonable:", child);
          }
        }
      });
    } else if (sourceIcon instanceof THREE.Mesh) { // Check if it's a mesh
      // Clone the mesh
      const clonedGeometry = sourceIcon.geometry.clone();
      const clonedMaterial = sourceIcon.material.clone();

      // Enhance material with emissive and glow for better visibility
      clonedMaterial.emissive = new THREE.Color(this.getIconColor(index));
      clonedMaterial.emissiveIntensity = 0.5;

      previewIcon = new THREE.Mesh(clonedGeometry, clonedMaterial);
    } else {
      // console.warn("[🍉 Preview] Source icon is not a Mesh or Group, cannot clone for preview.");
      // Optionally create a placeholder or return
      // return;
    }

    // Log if previewIcon is null after cloning attempt
    if (!previewIcon) {
      // console.warn("[🍉 Preview] previewIcon is null after cloning attempt.");
    } else {
      // Scale up the icon (4x larger)
      previewIcon.scale.set(4, 4, 4);
      this.floatingPreview.add(previewIcon);
    }


    // Create text label to display above the icon
    let labelString = `Item ${index}`; // Default label
    let textMesh = null; // Initialize to null

    if (this.font) {
      labelString = item.label || item || `Item ${index}`; // Use item itself if label is missing, fallback to index
      // Fallback toa default label if none is provided```javascript
      if (!labelString) {
        // console.warn("[🍉 Preview] No label provided for floating preview, using default.");
        labelString = `Item ${index}`;
      }
      // console.warn("Floating Preview Label:", labelString); // Log the label (moved to combined log)

      // <<< FIX 2: Update TextGeometry parameters
      const textGeometry = new TextGeometry(labelString, {
        font: this.font,
        size: 0.3,
        depth: 0.1, // Reduced depth for better visibility
        height: 0.05, // Keep some depth
        bevelEnabled: true,

        bevelThickness: 0.01, // Smaller bevel
        bevelSize: 0.005,     // Smaller bevel
        bevelOffset: 0,
        bevelSegments: 3,     // Fewer segments
        curveSegments: 8      // Fewer segments
      });

      textGeometry.computeBoundingBox();
      textGeometry.center(); // <<< FIX 2: Ensure centering

      // Log bounding box dimensions (moved to combined log)
      // const bbox = textGeometry.boundingBox;
      // console.warn("Text Geometry Bounding Box:", { ... });

      const textMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x99ccff, // Light blue emissive for better visibility
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9
      });

      textMesh = new THREE.Mesh(textGeometry, textMaterial); // Assign to textMesh

      // Position text above the icon
      textMesh.position.y = 2.2; // Position above the icon

      // <<< FIX 2: Normalize scale and update geometry/matrix
      textMesh.scale.set(0.75, 0.75, 0.75); // Uniform scale
      textMesh.geometry.computeBoundingBox(); // Recompute after scale? Maybe not needed if centered before scale.
      textMesh.geometry.computeBoundingSphere();
      textMesh.updateMatrixWorld(); // Force update

      // <<< FIX 2: Add final bounding box log
      // console.warn('📐 Final TextGeometry BBox:', textMesh.geometry.boundingBox);


      this.floatingPreview.add(textMesh);
    } else {
      // console.warn("[🍉 Preview] Font not loaded, cannot create text label.");
    }

    // Log if textMesh is null after creation attempt
    if (!textMesh) {
      // console.warn("[🍉 Preview] textMesh is null after creation attempt.");
    }

    // Store the index this preview represents
    this.floatingPreview.userData.index = index;

    // Start with zero scale and animate in
    // this.floatingPreview.scale.set(0, 0, 0); // GSAP will handle this
    this.floatingPreview.userData.originalPosition = this.floatingPreview.position.clone();

    // --- Diagnostic Logs ---
    // console.warn("[🍉 Preview Created]", {
    //   label: labelString,
    //   iconExists: !!previewIcon,
    //   textExists: !!textMesh, // Log if text mesh exists
    //   position: this.floatingPreview?.position.clone(), // Clone to log current value
    //   children: this.floatingPreview?.children?.length
    // });
    // Log if this submenu's parent is the scene
    // console.warn("[🍉 Parent Check] Is this.parent the scene?", this.parent === this.scene, "Parent UUID:", this.parent?.uuid);
    // console.warn("[🍉 Scene Check] Scene UUID:", this.scene?.uuid);

    // --- Visibility + Scale Audit ---
    this.floatingPreview.visible = true;
    // this.floatingPreview.scale.set(1, 1, 1); // Let GSAP handle initial scale
    this.floatingPreview.updateMatrixWorld(true); // Force update
    // console.warn("[🍉 Visibility/Scale Audit Before Add]", {
    //   visible: this.floatingPreview.visible,
    //   scale: this.floatingPreview.scale.clone() // Clone to log current value
    // });
    // --- End Audit ---

    // Add to the scene explicitly
    // console.warn("[🍉 Preview] Adding floatingPreview to Scene", this.scene.uuid);
    this.scene.add(this.floatingPreview);
    // console.warn("[🍉 Preview] Added floatingPreview to Scene", this.scene.uuid);

    // Log properties immediately after adding to scene
    // console.warn("[🍉 Preview State After Add]", {
    //   position: this.floatingPreview?.position.clone(),
    //   visible: this.floatingPreview?.visible,
    //   scale: this.floatingPreview?.scale.clone(),
    //   children: this.floatingPreview?.children?.length
    // });

    // Animate in (ensure scale starts from 0 if audit scale is removed later)
    gsap.fromTo(this.floatingPreview.scale,
      { x: 0, y: 0, z: 0 }, // Explicitly start from 0
      {
        x: 1, y: 1, z: 1,
        duration: 0.8,
        ease: "elastic.out(1, 0.5)"
      }
    );

    // Start the slow rotation animation
    this.startFloatingPreviewSpin();

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

    if (this.isTransitioning || this.intendedClickIndex !== null) {
      // A user click is in progress or we're rotating — skip highlight update
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

  isItemInFrontFacing(index) {
    if (index < 0 || index >= this.itemMeshes.length) return false;

    const container = this.itemMeshes[index];
    if (!container || !container.userData) return false;

    // Calculate the current position in the rotation cycle
    const originalAngle = container.userData.originalAngle;
    const currentRotation = this.itemGroup.rotation.x;

    // Calculate effective angle (how far from front position)
    let effectiveAngle = (originalAngle + currentRotation) % (Math.PI * 2); // Normalize to [0, 2π)
    if (effectiveAngle < 0) effectiveAngle += Math.PI * 2; // Ensure positive angle

    // Front is at 0 radians (3 o'clock), check if within 45° of front
    const angleDiff = Math.min(
      effectiveAngle,
      Math.abs(Math.PI * 2 - effectiveAngle)
    );

    // Debug logging for angle calculations
    console.log(`\uD83D\uDCD0 Item ${index}: original angle=${originalAngle.toFixed(2)}, effective=${effectiveAngle.toFixed(2)}, diff=${angleDiff.toFixed(2)}, threshold=${(Math.PI / 4).toFixed(2)}`);

    // Return true if this item is within threshold of front position
    const frontFacingThreshold = Math.PI / 4; // 45 degrees
    return angleDiff <= frontFacingThreshold;
  }

  getFrontFacingItem() {
    let frontIndex = -1;
    let smallestAngleDiff = Infinity;

    this.itemMeshes.forEach((container, index) => {
      if (!container || !container.userData) return;

      const originalAngle = container.userData.originalAngle;
      const currentRotation = this.itemGroup.rotation.x;

      // Calculate effective angle
      let effectiveAngle = (originalAngle + currentRotation) % (Math.PI * 2);
      if (effectiveAngle < 0) effectiveAngle += Math.PI * 2;

      // Calculate distance to front (0 radians)
      const angleDiff = Math.min(
        effectiveAngle,
        Math.abs(Math.PI * 2 - effectiveAngle)
      );

      // Debug logging for front-facing item determination
      console.log(`\uD83D\uDCD0 Checking item ${index}: effective angle=${effectiveAngle.toFixed(2)}, angle diff=${angleDiff.toFixed(2)}`);

      if (angleDiff < smallestAngleDiff) {
        smallestAngleDiff = angleDiff;
        frontIndex = index;
      }
    });

    console.log(`\uD83D\uDCD0 Front-facing item determined: index=${frontIndex}`);
    return frontIndex;
  }

}