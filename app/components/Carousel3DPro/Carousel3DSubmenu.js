/**
 * @AI-PROMPT
 * This file implements nested 3D submenu cylinders.
 * When a user selects an item in Carousel3DPro, use this class to pop out submenus around it.
 */

import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // GLTF is for loading 3D models

// Access GSAP from the global scope
import gsap from 'gsap'; // Ensure GSAP is available globally, GSAP is for animation

// Cache font to improve performance
let cachedFont = null; // Cache for font to avoid loading multiple times

export class Carousel3DSubmenu extends THREE.Group {
  constructor(parentItem, items = [], config = {}) { // Initialize the parent class
    super(); // Call the parent class constructor
    this.parentItem = parentItem; // Reference to the parent item
    this.items = items; // Array of items for the submenu
    this.config = config; // Configuration options for the submenu
    this.itemMeshes = []; // Array to hold item meshes
    this.currentIndex = 0; // Index of the currently selected item
    this.watermillRadius = 1.2; // Radius of the watermill effect
    this.rotationAngle = 0; // Current rotation angle of the submenu 
    this.targetRotation = 0; // Target rotation angle of the submenu
    this.rotationSpeed = 0.15; // Increased for smoother rotation
    this.isInitialized = false; // Track initialization state
    this.floatingPreview = null; // Reference to the floating preview mesh
    this.isSpinning = false; // Track if submenu is currently spinning
    this.showingPreview = false; // Track if preview is currently being shown
    this.lastParentRotation = 0; // Initialize to track parent rotation
    // this.isForceHighlightLocked = false; // Keep commented or remove if selectItemLock replaces it
    this.selectItemLock = false; // <<< FIX 1: Add selectItemLock flag
    this.forceLockedIndex = null; // <<< FIX 1: Add forceLockedIndex flag
    this.targetRotationLocked = false; // <<< BONUS FIX: Add targetRotation lock flag
    this.isTransitioning = false; // Global flag to track any selection or transition animation
    this.forceSelectLock = false; // Add lock property
    this.clickedUniqueId = null; // 🛡️ New: Track clicked submenu unique ID
    this.highlightLock = false; // ✅ New: Lock to prevent mid-animation highlight updates
    this.intendedClickIndex = null; // Track which item user clicked

    // Create container for items to rotate
    this.itemGroup = new THREE.Group(); // Create a separate group for items
    this.add(this.itemGroup); // Add to the main group

    // Load font from CDN directly
    this.fontLoader = new FontLoader(); // Try to use cached font first for instant creation

    // Try to use cached font first for instant creation
    if (cachedFont) { // Font is cached
      this.font = cachedFont; // Use cached font
      this.createItems(); // Create items immediately
      this.isInitialized = true; // Track initialization state

      // Position wheel so first item is at front
      if (this.itemMeshes.length > 0) {  // Check if items were created
        const firstItem = this.itemMeshes[0]; // Get the first item mesh
        this.itemGroup.rotation.x = -firstItem.userData.angle + 0; // Position wheel so first item is at front
        this.targetRotation = this.itemGroup.rotation.x; // Set target rotation to match
      } // End of cached font block
    } else { 
      // Load font if not cached
      this.fontLoader.load('/helvetiker_regular.typeface.json', (font) => { // Load font from CDN
        cachedFont = font; // Cache for future use
        this.font = font; //  Use loaded font
        this.createItems(); // Create items immediately
        this.isInitialized = true; // Track initialization state

        // Position wheel
        if (this.itemMeshes.length > 0) { // Check if items were created
          const firstItem = this.itemMeshes[0]; // Get the first item mesh
          this.itemGroup.rotation.x = -firstItem.userData.angle + 0; // Position wheel so first item is at front
          this.targetRotation = this.itemGroup.rotation.x;  // Set target rotation to match
        } // End of font loading block
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

    this.closeButton = new THREE.Mesh(baseGeometry, baseMaterial); // Create the close button mesh

    // Position the close button
    this.closeButton.position.set(1.8, 1.8, 0.5); // Positioned in top corner - the coordinates represent the position in 3D space
    this.closeButton.scale.set(0.8, 0.8, 0.8); // Start slightly smaller for animation - thr coordinates represent the scale in 3D space
    this.closeButton.renderOrder = 9999; // Ensure it renders on top of other elements - the coordinates represent the render order in 3D space

    // Set isCloseButton flag
    this.closeButton.userData = { // Set userData for easy access
      isCloseButton: true, // Flag to identify close button
      originalColor: baseMaterial.color.clone(), // Store original color for reset
      hoverColor: new THREE.Color(0xff0000) // Red hover color
    };

    // Add the "X" to the red disk
    this.createCloseButtonX(); // Create the "X" shape for the close button

    // Add to fixed elements group
    this.fixedElements.add(this.closeButton); // Add close button to fixed elements group
  }

  createCloseButtonX() { // Create the "X" shape for the close button
    // Use thinner BoxGeometry for the X
    const lineGeometry1 = new THREE.BoxGeometry(0.22, 0.03, 0.03); // Thinner line for the first part of the X
    const lineGeometry2 = new THREE.BoxGeometry(0.22, 0.03, 0.03); // Thinner line for the second part of the X

    const lineMaterial = new THREE.MeshStandardMaterial({ // Use MeshStandardMaterial for better lighting
      color: 0xffffff, // White color for the X
      emissive: 0xffffff, // White emissive glow
      emissiveIntensity: 0.8 // Stronger glow
    });

    // First line of X - properly aligned to disk surface
    const line1 = new THREE.Mesh(lineGeometry1, lineMaterial); // Create the first line of the X
    line1.position.set(0, 0, 0.03); // Raised up from disk surface
    line1.rotation.y = Math.PI / 4; // 45 degrees

    // Second line of X
    const line2 = new THREE.Mesh(lineGeometry2, lineMaterial); // Create the second line of the X
    line2.position.set(0, 0, 0.03); // Raised up from disk surface
    line2.rotation.y = -Math.PI / 4; // -45 degrees

    // Store lines in userData for easy access
    this.closeButton.userData.xLines = [line1, line2]; // Store both lines in userData

    // Set isCloseButton on the X parts too
    line1.userData = { isCloseButton: true }; // Set flag on first line
    line2.userData = { isCloseButton: true }; // Set flag on second line

    this.closeButton.add(line1); // Add first line to close button
    this.closeButton.add(line2); // Add second line to close button
  }

  getIconColor(index) { // Function to get a color based on the index
    // Create a palette of colors to use for icons
    const colors = [ // Google Colors and Amazon Colors and Microsoft Colors
      0x4285F4, // Google Blue
      0xEA4335, // Google Red
      0xFBBC05, // Google Yellow
      0x34A853, // Google Green
      0xFF9900, // Amazon Orange
      0x00ADEF, // Microsoft Blue
      0x7FBA00, // Microsoft Green
      0xF25022  // Microsoft Red
    ];

    return colors[index % colors.length]; // Return color based on index
  }

  createItems() { // Check if font is loaded
    if (!this.font) return; // Font not loaded yet, exit early

    // Special handling for Gallery items - create more elaborate 3D models
    const isGallerySubmenu = this.parentItem.userData?.item === 'Gallery'; // Check if parent item is Gallery

    // Calculate even distribution around the wheel
    const angleStep = (2 * Math.PI) / this.items.length;

    let normalizedRotation = this.itemGroup.rotation.y % (2 * Math.PI); // Normalize rotation to be within 0 to 2π
    if (normalizedRotation < 0) normalizedRotation += 2 * Math.PI; // Ensure rotation is positive

    // Old code (wrong): const rawIndex = Math.round(normalizedRotation / angleStep);

    // ✅ Corrected code:
    // const rawIndex = Math.round(normalizedRotation / angleStep); // Calculate raw index based on current rotation
    // const correctedIndex = (this.items.length - rawIndex) % this.items.length; // Correct the index to match the current rotation

    // Use `correctedIndex` instead of rawIndex!

    // Define shapes for icons with more elaborate options for Gallery
    const regularShapes = [ // Array of functions to create regular shapes
      () => new THREE.SphereGeometry(0.1, 16, 16), // Sphere
      () => new THREE.BoxGeometry(0.15, 0.15, 0.15), // Box
      () => new THREE.ConeGeometry(0.1, 0.2, 16), // Cone
      () => new THREE.TorusGeometry(0.1, 0.04, 16, 32), // Torus
      () => new THREE.TetrahedronGeometry(0.12), // Tetrahedron
      () => new THREE.OctahedronGeometry(0.12), // Octahedron
      () => new THREE.DodecahedronGeometry(0.12), // Dodecahedron
      () => new THREE.IcosahedronGeometry(0.12) // Icosahedron
    ];

    // Special shapes for Gallery items
    const galleryShapes = { // Array of functions to create special shapes for Gallery items
      'Photos': () => { // Create a group for the photo frame and photo
        const group = new THREE.Group(); // 
        // Photo frame
        const frame = new THREE.Mesh( // Create the photo frame mesh
          new THREE.BoxGeometry(0.2, 0.16, 0.01), // Create a box geometry for the frame
          new THREE.MeshStandardMaterial({ color: 0xdddddd }) // Create a standard material for the frame
        );
        // Photo inside
        const photo = new THREE.Mesh( // Create the photo mesh
          new THREE.PlaneGeometry(0.18, 0.14), // Create a plane geometry for the photo
          new THREE.MeshBasicMaterial({ color: 0x2299ff }) // Create a basic material for the photo
        );
        photo.position.z = 0.006; // Position the photo slightly in front of the frame
        group.add(frame); // Add the frame to the group
        group.add(photo); // Add the photo to the group
        return group; // Return the group containing the frame and photo
      },
      'Videos': () => { // Create a group for the video screen and play button
        const group = new THREE.Group(); 
        // Video screen
        const screen = new THREE.Mesh( // Create the video screen mesh
          new THREE.BoxGeometry(0.2, 0.12, 0.02), // Create a box geometry for the screen
          new THREE.MeshStandardMaterial({ color: 0x222222 }) // Create a standard material for the screen
        );
        // Play button
        const playBtn = new THREE.Mesh( // Create the play button mesh
          new THREE.CircleGeometry(0.04, 16), // Create a circle geometry for the play button
          new THREE.MeshBasicMaterial({ color: 0xff3333 }) // Create a basic material for the play button
        );
        playBtn.position.z = 0.011; // Position the play button slightly in front of the screen
        group.add(screen); // Add the screen to the group
        group.add(playBtn); // Add the play button to the group
        return group; // Return the group containing the screen and play button
      }, 
      '3D Models': () => { // Create a group for the 3D model and base
        const group = new THREE.Group(); // Base
        // Base cube
        const cube = new THREE.Mesh( // Create the base cube mesh
          new THREE.BoxGeometry(0.1, 0.1, 0.1), // Create a box geometry for the base cube
          new THREE.MeshStandardMaterial({ color: 0x66cc99, wireframe: true }) // Create a standard material for the base cube
        );
        // Sphere inside
        const sphere = new THREE.Mesh( // Create the sphere mesh
          new THREE.SphereGeometry(0.06, 12, 12), // Create a sphere geometry for the sphere
          new THREE.MeshStandardMaterial({ color: 0x99ff66 }) // Create a standard material for the sphere
        );
        group.add(cube); // Add the base cube to the group
        group.add(sphere); // Add the sphere to the group
        return group; // Return the group containing the base cube and sphere
      },
      'Artwork': () => { // Create a group for the artwork canvas and colored squares
        const group = new THREE.Group(); 
        // Canvas
        const canvas = new THREE.Mesh( // Create the canvas mesh
          new THREE.BoxGeometry(0.18, 0.18, 0.01), // Create a box geometry for the canvas
          new THREE.MeshStandardMaterial({ color: 0xf5f5f5 }) // Create a standard material for the canvas
        );
        // Add some colored squares as "art"
        const colors = [0xff3333, 0x3333ff, 0x33ff33, 0xffff33]; // Array of colors for the squares
        for (let i = 0; i < 4; i++) { // Loop through the colors array
          const size = 0.06; // Size of each square
          const x = (i % 2) * 0.08 - 0.04; // Calculate x position based on index
          const y = Math.floor(i / 2) * 0.08 - 0.04; // Calculate y position based on index
          const square = new THREE.Mesh( // Create the square mesh
            new THREE.PlaneGeometry(size, size), // Create a plane geometry for the square
            new THREE.MeshBasicMaterial({ color: colors[i] }) // Create a basic material for the square
          );
          square.position.set(x, y, 0.006); // Position the square slightly in front of the canvas
          group.add(square); // Add the square to the group
        }
        group.add(canvas); // Add the canvas to the group
        return group; // Return the group containing the canvas and squares
      },
      'Animations': () => { // Create a group for the animation gears
        const group = new THREE.Group();
        // Film reel
        const reel = new THREE.Mesh( // Create the film reel mesh
          new THREE.TorusGeometry(0.08, 0.02, 16, 32), // Create a torus geometry for the film reel
          new THREE.MeshStandardMaterial({ color: 0x333333 }) // Create a standard material for the film reel
        );
        // Add spokes
        for (let i = 0; i < 6; i++) { // Loop through to create spokes
          const angle = (i / 6) * Math.PI * 2; // Calculate angle for each spoke
          const spoke = new THREE.Mesh( // Create the spoke mesh
            new THREE.CylinderGeometry(0.005, 0.005, 0.16), // Create a cylinder geometry for the spoke
            new THREE.MeshStandardMaterial({ color: 0x999999 }) // Create a standard material for the spoke
          );
          spoke.rotation.z = angle; // Rotate spoke to align with reel
          group.add(spoke); // Add spoke to the group
        }
        group.add(reel); // Add the reel to the group
        return group; // Return the group containing the reel and spokes
      },
      'Virtual Tours': () => { // Create a group for the VR headset
        const group = new THREE.Group(); 
        // VR headset simplified
        const headset = new THREE.Mesh( // Create the headset mesh
          new THREE.BoxGeometry(0.2, 0.1, 0.1), // Create a box geometry for the headset
          new THREE.MeshStandardMaterial({ color: 0x222222 }) // Create a standard material for the headset
        );
        // Lenses
        const leftLens = new THREE.Mesh( // Create the left lens mesh
          new THREE.CircleGeometry(0.03, 16), // Create a circle geometry for the left lens
          new THREE.MeshBasicMaterial({ color: 0x3399ff }) // Create a basic material for the left lens
        );
        leftLens.position.set(-0.05, 0, 0.051); // Position the left lens slightly in front of the headset
        const rightLens = leftLens.clone(); // Create the right lens mesh
        rightLens.position.set(0.05, 0, 0.051); // Position the right lens slightly in front of the headset
        group.add(headset); // Add the headset to the group
        group.add(leftLens); // Add the left lens to the group
        group.add(rightLens); // Add the right lens to the group
        return group; // Return the group containing the headset and lenses
      }
    };

    this.items.forEach((item, index) => { // Loop through each item in the submenu
      // Create text geometry
      const geometry = new TextGeometry(item.toString(), { // Create text geometry for the item
        font: this.font, // Use the loaded font
        size: 0.25, // Size of the text
        height: 0.05, // Height of the text extrusion
        depth: 0.02, // Depth of the text extrusion 
        curveSegments: 12, // Number of segments for curved text
        bevelEnabled: true, // Enable bevel for the text
        bevelThickness: 0.02, // Bevel thickness
        bevelSize: 0.01, // Bevel size
        bevelOffset: 0, //  Bevel offset
        bevelSegments: 5 // Number of bevel segments
      });

      geometry.computeBoundingBox(); // Compute bounding box for text geometry
      geometry.center(); // Center the text geometry

      // Get text dimensions
      const textWidth = geometry.boundingBox.max.x - geometry.boundingBox.min.x; // Calculate width of the text
      const textHeight = geometry.boundingBox.max.y - geometry.boundingBox.min.y; // Calculate height of the text

      // Create material for text
      const material = new THREE.MeshStandardMaterial({ // Create a standard material for the text
        color: this.config.textColor || 0xffffff, // Default text color
        transparent: true,  // Enable transparency
        opacity: 0.9, // Default opacity
        emissive: this.config.textEmissive || 0x222222, // Default emissive color
        emissiveIntensity: 0.2 // Default emissive intensity
      });

      const mesh = new THREE.Mesh(geometry, material); // Create the text mesh

      // Create a container for the mesh
      const container = new THREE.Group(); // Create a container for the mesh
      container.add(mesh); // Add the text mesh to the container

      // Add robust 3D hit area (box instead of plane, covers entire text)
      const hitAreaWidth = textWidth + 1.2; // Increased width to allow more space for icon
      const hitAreaHeight = Math.max(textHeight, 0.6); // Taller for easier clicking
      const hitAreaDepth = 0.3; // Add significant depth for better 3D hit detection

      const hitAreaGeometry = new THREE.BoxGeometry(hitAreaWidth, hitAreaHeight, hitAreaDepth); // Create a box geometry for the hit area
      const hitAreaMaterial = new THREE.MeshBasicMaterial({ // Create a basic material for the hit area
        color: 0xffffff, // Color doesn't matter since it's transparent
        transparent: true, // Enable transparency
        opacity: 0.01, // Nearly invisible but still clickable
        depthWrite: false // Disable depth writing to avoid interfering with other objects
      });

      const hitArea = new THREE.Mesh(hitAreaGeometry, hitAreaMaterial); // Create the hit area mesh
      hitArea.position.z = -0.1; // Positioned to extend both in front and behind text
      container.add(hitArea); // Add hit area to the container

      // Determine which shape/icon to use
      let iconMesh = null; // Initialize iconMesh to null
      const iconOffset = Math.max(0.7, textWidth * 0.25); // Calculate offset, ensuring it's at least 0.7 units
      let baseScale = new THREE.Vector3(1, 1, 1); // Default base scale

      if (item === 'Cart') { // Special case for Cart icon
        // Load the GLTF cart model asynchronously
        const loader = new GLTFLoader(); // Create a new GLTFLoader instance
        loader.load('/assets/Cart.glb', (gltf) => { // Load the GLTF model
          const model = gltf.scene; // Get the loaded model from the GLTF

          // ✅ Step 1: Save original scale after loading model
          baseScale.set(0.3, 0.3, 0.3); // Set specific base scale for Cart
          model.scale.copy(baseScale); // Set initial scale to base scale
          model.userData.originalScale = baseScale.clone(); // Store original scale
          model.position.x = -textWidth / 2 - iconOffset; // Use calculated offset
          model.userData.isCartIcon = true; // Optional tag

          container.add(model); // Add model to container when loaded
          container.userData.iconMesh = model; // Store reference in userData

          model.traverse((child) => { // Traverse the model's children
            if (child.isMesh) { // Check if the child is a mesh
              child.material = child.material.clone(); // Prevent sharing materials
              child.material.emissive = new THREE.Color(this.getIconColor(index)); // Set emissive color based on index
              child.material.emissiveIntensity = 0.3; // Set emissive intensity
              // Ensure materials are updated
              child.material.needsUpdate = true; // Mark material as needing update
            }
          });

          // Animate icon scale after loading (only if the submenu is still visible)
          if (!this.isBeingDisposed && this.visible) { // Check if submenu is still visible
            const isHighlighted = container.userData.index === this.currentIndex; // Check if this item is currently highlighted
            const multiplier = isHighlighted ? 1.3 : 1.0; // Highlight multiplier

            gsap.set(model.scale, { x: 0, y: 0, z: 0 }); // Start invisible
            gsap.to(model.scale, { // Scale up the model
              x: model.userData.originalScale.x * multiplier, // Use original scale
              y: model.userData.originalScale.y * multiplier, // Use original scale
              z: model.userData.originalScale.z * multiplier, // Use original scale
              duration: 0.5, // Duration of the scale animation
              ease: 'elastic.out', // Easing function for a smooth effect
            });

            // If this item is highlighted when loaded, apply spin
            if (isHighlighted && model) { // Add model check - ensure model is loaded
              gsap.killTweensOf(model.rotation); // Stop any existing rotation animations
              gsap.timeline() // Create a new timeline for animations
                .to(model.rotation, { // Rotate the model
                  y: Math.PI * 2, x: Math.PI * 0.8, z: Math.PI * 0.5, // Rotate to a specific angle
                  duration: 1.0, ease: "power1.inOut" // Easing function for smooth rotation
                })
                .to(model.rotation, { // Reset rotation to upright position
                  x: 0, z: 0, duration: 0.3, ease: "back.out(2)" // Easing function for smooth reset
                }, "-=0.1"); // Overlap the reset with the end of the rotation
            }
          }
        }, undefined, (error) => { // Handle errors during model loading
          console.error(`Error loading Cart.glb: ${error}`); // Log error if model fails to load
        });

      } else if (isGallerySubmenu && galleryShapes[item]) { // Special case for Gallery items
        // Use special Gallery icon (synchronous)
        iconMesh = galleryShapes[item](); // Create the special Gallery icon mesh
        iconMesh.position.x = -textWidth / 2 - iconOffset; // Use calculated offset
        iconMesh.userData.originalScale = baseScale.clone(); // Store default base scale (1,1,1)
        container.add(iconMesh); // Add the icon mesh to the container
        container.userData.iconMesh = iconMesh; // Store reference in userData
        iconMesh.scale.set(0, 0, 0); // Start invisible
      } else {
        // Use regular shape (synchronous)
        const shapeIndex = index % regularShapes.length; // Cycle through regular shapes based on index
        const shapeGeometry = regularShapes[shapeIndex](); // Create the regular shape geometry
        const shapeMaterial = new THREE.MeshStandardMaterial({ // Create a standard material for the shape
          color: this.getIconColor(index), // Set color based on index
          metalness: 0.3, // Slightly metallic for a more realistic look
          roughness: 0.4, // Slightly rough for a more realistic look
          emissive: this.getIconColor(index), // Set emissive color based on index
          emissiveIntensity: 0.2 // Set emissive intensity
        });

        iconMesh = new THREE.Mesh(shapeGeometry, shapeMaterial); // Create the icon mesh
        iconMesh.position.x = -textWidth / 2 - iconOffset; // Use calculated offset
        iconMesh.userData.originalScale = baseScale.clone(); // Store default base scale (1,1,1)
        container.add(iconMesh); // Add the icon mesh to the container
        container.userData.iconMesh = iconMesh; // Store reference in userData
        iconMesh.scale.set(0, 0, 0); // Start invisible
      }

      // For longer text items, shift the text slightly right to make more room for the icon
      if (textWidth > 2) {
        // For very long text, shift it more to the right
        mesh.position.x = iconOffset * 0.3; // Shift text slightly right
      }

      // Position around the parent
      const angle = angleStep * index;
      container.position.y = this.watermillRadius * Math.sin(angle); 
      container.position.z = this.watermillRadius * Math.cos(angle);
      container.userData.angle = angle; // Store for later rotation targeting 

      // Generate a unique ID for click tracking
      const uniqueId = `submenu-item-${index}-${Date.now()}-${Math.floor(Math.random() * 1000)}`; // Generate a unique ID for this item
      
      // Store data with the container
      container.userData = { // Store user data with the container
        index, // Index of the item in the submenu
        isSubmenuItem: true, // Flag to identify submenu items
        item, // Item name
        angle, // Angle of the item in radians
        mesh, // Mesh for the text
        hitArea, // Hit area mesh for interaction
        originalAngle: angle, // Original angle of the item in radians
        springVelocity: 0, // Velocity for spring animation
        springTarget: 0, // Target position for spring animation
        springStrength: 0.1, // Strength of the spring animation
        springDamping: 0.6, // Damping factor for spring animation
        iconMesh: container.userData.iconMesh || null, // Ensure iconMesh is stored (might be null initially for Cart)
        uniqueId, // Unique identifier for click tracking
      };

      // Store original scale with the actual mesh
      mesh.userData = { // Store user data with the mesh
        originalScale: mesh.scale.clone(), // Store original scale of the mesh
        originalColor: material.color.clone() // Store original color of the mesh
      };

      // Start text invisible for animation
      mesh.scale.set(0, 0, 0); // Start text invisible for animation
      // Icon scale is set to 0 above for non-GLTF items
      hitArea.scale.set(0, 0, 0); // Start hit area invisible for animation

      this.itemMeshes.push(container); // Add the container to the itemMeshes array
      this.itemGroup.add(container); // Add the container to the itemGroup
    });

    // Highlight first item
    if (this.itemMeshes.length > 0) { // Check if items were created
      this.selectItem(0, false); // <--- The call
      // Don't create floating preview automatically
    }
  }

  selectItem(index, animate = true, createPreview = false) { // Function to select an item in the submenu
    if (index < 0 || index >= this.itemMeshes.length) return; // Check if index is valid

    this.highlightLock = true; // ✅ Lock highlight updates during selection
    this.forceLockedIndex = index; // <<< FIX 1: Lock the index immediately
    this.clickedUniqueId = this.itemMeshes[index]?.userData?.uniqueId || null; // 🛡️ Track the clicked item's unique ID
    this.intendedClickIndex = index; // Store the intended click index

    // Deselect current
    if (this.currentIndex !== index && this.itemMeshes[this.currentIndex]) { // Check if current index is different and valid
      const currentContainer = this.itemMeshes[this.currentIndex]; // Get the current container
      const currentMesh = currentContainer.userData.mesh; // Get the current mesh
      const currentIcon = currentContainer.userData.iconMesh; // Get the current icon mesh

      // Reset appearance
      currentMesh.material.color.copy(currentMesh.userData.originalColor); // Reset color to original
      currentMesh.material.emissive = new THREE.Color(0x000000); // Reset emissive color

      if (animate) { // Animate scale down text
        gsap.to(currentMesh.scale, { // Animate scale down text
          x: currentMesh.userData.originalScale.x, // Reset to original x
          y: currentMesh.userData.originalScale.y, // Reset to original y
          z: currentMesh.userData.originalScale.z, // Reset to original z
          duration: 0.3 // Duration of the scale animation
        });

        if (currentIcon) {  
          // ✅ Step 2: Update scaling logic
          const iconOriginal = currentIcon.userData.originalScale || new THREE.Vector3(1, 1, 1); // Get original scale of the icon
          // Reset icon scale using original scale
          gsap.to(currentIcon.scale, { // Animate scale down icon
            x: iconOriginal.x, // Reset to original x
            y: iconOriginal.y, // Reset to original y
            z: iconOriginal.z, // Reset to original z
            duration: 0.3 // Duration of the scale animation
          });

          // Reset rotation to upright immediately without animation
          gsap.killTweensOf(currentIcon.rotation); // Stop any existing rotation animations
          gsap.set(currentIcon.rotation, { x: 0, y: 0, z: 0 }); // Reset rotation to upright immediately
        }
      } else {
        currentMesh.scale.copy(currentMesh.userData.originalScale); // Reset scale instantly using original scale
        if (currentIcon) { 
          // ✅ Step 2: Update scaling logic
          const iconOriginal = currentIcon.userData.originalScale || new THREE.Vector3(1, 1, 1); // Get original scale of the icon
          currentIcon.scale.copy(iconOriginal); // Reset instantly using original scale
          currentIcon.rotation.set(0, 0, 0); // Reset rotation immediately
        }
      }
    }

    // Select new
    console.log(`🍉 [Carousel3DSubmenu.js] selectItem() called: targetIndex=${index}, animate=${animate}, createPreview=${createPreview}`); // Log the selection details
    console.log(`🍉 [Carousel3DSubmenu.js] Current before select: ${this.currentIndex}`); // Log the current index before selection
    const selectedContainer = this.itemMeshes[index]; // Get the selected container
    const selectedMesh = selectedContainer.userData.mesh; // Get the selected mesh
    const selectedIcon = selectedContainer.userData.iconMesh; // Get the selected icon mesh

    // Apply highlight appearance
    selectedMesh.material.color.set(this.config.highlightColor || 0x00ffff); // Set highlight color
    selectedMesh.material.emissive = new THREE.Color(0x003333); // Set emissive color for highlight

    if (animate) {  // Animate scale up text
      // Scale up text
      gsap.to(selectedMesh.scale, { // Animate scale up text
        x: selectedMesh.userData.originalScale.x * 1.3, // Reset to original x scaled up
        y: selectedMesh.userData.originalScale.y * 1.3, // Reset to original y scaled up
        z: selectedMesh.userData.originalScale.z * 1.3, // Reset to original z scaled up
        duration: 0.3 // Duration of the scale animation
      });

      if (selectedIcon) { // Check if selected icon exists
        // ✅ Step 2: Update scaling logic
        const iconOriginal = selectedIcon.userData.originalScale || new THREE.Vector3(1, 1, 1); // Get original scale of the icon
        const multiplier = 1.3; // Highlight multiplier

        // Scale up icon using original scale
        gsap.to(selectedIcon.scale, { // Animate scale up icon
          x: iconOriginal.x * multiplier, // Reset to original x scaled up
          y: iconOriginal.y * multiplier, // Reset to original y scaled up
          z: iconOriginal.z * multiplier, // Reset to original z scaled up
          duration: 0.3, // Duration of the scale animation
          ease: "back.out" // Easing function for a smooth effect
        });

        // Add a clean 1-second geodesic spin animation to the icon
        gsap.killTweensOf(selectedIcon.rotation); // Stop any existing rotation animations
        gsap.timeline() // Create a new timeline for animations
          .to(selectedIcon.rotation, { // Rotate the icon
            y: Math.PI * 2, x: Math.PI * 0.8, z: Math.PI * 0.5, // Rotate to a specific angle
            duration: 1.0, ease: "power1.inOut" // Easing function for smooth rotation
          })
          .to(selectedIcon.rotation, { // Reset rotation to upright position
            x: 0, z: 0, duration: 0.3, ease: "back.out(2)" // Easing function for smooth reset
          }, "-=0.1"); // Overlap the reset with the end of the rotation
      }

      // Position the item at the front (3 o'clock position)
      // The value 0 corresponds to the 3 o'clock position
      this.targetRotation = -selectedContainer.userData.angle + 0;
      this.targetRotationLocked = true;

      // Store the intended uniqueId for verification after rotation completes
      this.intendedUniqueId = selectedContainer.userData.uniqueId;
      this.intendedClickIndex = index;

      // Log intention for debugging
      console.log(`🎯 Setting rotation target for item ${index} with uniqueId: ${this.intendedUniqueId}`);

      this.isTransitioning = true; // <<< SET TRANSITION FLAG
      this.selectItemLock = true; // <<< FIX 1: Lock before animation starts
      this.forceSelectLock = true; // 2. Set lock before animation
      gsap.to(this.itemGroup.rotation, { // Animate the rotation of the itemGroup
        x: this.targetRotation, // Rotate to the target rotation
        duration: 0.6, // Duration of the rotation animation
        ease: "power2.out",
        
        // Add update callback to continuously check alignment
        onUpdate: () => {
          // Calculate remaining rotation distance
          const remainingRotation = Math.abs(this.targetRotation - this.itemGroup.rotation.x);
          
          // If very close to target, snap precisely to prevent float errors
          if (remainingRotation < 0.01) {
            this.itemGroup.rotation.x = this.targetRotation;
          }
        },
        
        onComplete: () => { // Animation complete callback
          // Force exact alignment
          this.itemGroup.rotation.x = this.targetRotation;
          
          // Use the intendedClickIndex to force correct highlighting
          this.currentIndex = this.intendedClickIndex; // Force correct index
          this.highlightItem(this.intendedClickIndex); // Manually apply highlight
          this.intendedClickIndex = null; // Reset for next click
          
          // Reset all the locks
          this.isTransitioning = false;
          this.selectItemLock = false;
          this.forceLockedIndex = null;
          this.targetRotationLocked = false;
          this.forceSelectLock = false;
          this.clickedUniqueId = null;
          this.highlightLock = false;
          
          console.log(`✅ Rotation finished. Index=${index} is now highlighted`);
        }
      });
    } else {
      // Instant scale without animation
      selectedMesh.scale.set( // Reset instantly using original scale
        selectedMesh.userData.originalScale.x * 1.3, // Reset to original x scaled up
        selectedMesh.userData.originalScale.y * 1.3, // Reset to original y scaled up
        selectedMesh.userData.originalScale.z * 1.3 // Reset to original z scaled up
      );

      if (selectedIcon) { // Check if selected icon exists
        // ✅ Step 2: Update scaling logic
        const iconOriginal = selectedIcon.userData.originalScale || new THREE.Vector3(1, 1, 1); // Get original scale of the icon
        const multiplier = 1.3; // Highlight multiplier
        selectedIcon.scale.set( 
          iconOriginal.x * multiplier, // Set instantly using original scale
          iconOriginal.y * multiplier, // Set instantly using original scale
          iconOriginal.z * multiplier // Set instantly using original scale
        ); // Set instantly using original scale
      }

      // Set initial rotation to front position without animation
      this.itemGroup.rotation.x = -selectedContainer.userData.angle + 0; // <<< FIX 1: Set targetRotation immediately
      this.targetRotation = this.itemGroup.rotation.x; // <<< FIX 1: Set targetRotation immediately
      // <<< FIX 1: Release lock immediately if not animating
      this.forceLockedIndex = null; // <<< FIX 1: Release lock immediately if not animating
      this.forceSelectLock = false; // 2. Unlock if not animating
    }

    this.currentIndex = index; // Update current index

    // Only update floating preview when explicitly requested
    if (createPreview) { // Create floating preview if requested
      this.showingPreview = true; // Track that we are showing a preview
      this.updateFloatingPreview(index); // Update the floating preview with the selected index
    }
  }

  scrollSubmenu(delta) { // Function to scroll the submenu
    // <<< FIX 1 & BONUS FIX & NEW TRANSITION CHECK >>>
    if (this.selectItemLock || this.forceLockedIndex !== null || this.isTransitioning) { // <<< FIX 1: Check if selectItem is locked
      console.warn("🚫 scrollSubmenu blocked during selectItem animation or transition."); // Updated log
      return; // Do nothing if selectItem is animating, forcing index, or transitioning
    }
    if (this.targetRotationLocked) { // <<< BONUS FIX: Check if targetRotation is locked
      console.warn("⛔️ scrollSubmenu blocked due to locked targetRotation."); // Updated log
      return; // Do nothing if targetRotation is locked by selectItem
    }
    // <<< END LOCK CHECKS >>>

    // Calculate angle step between items
    const angleStep = (2 * Math.PI) / this.itemMeshes.length; // Calculate angle step based on number of items

    // Smooth and more controlled scrolling
    this.targetRotation += delta > 0 ? -angleStep : angleStep; // Adjust target rotation based on scroll direction

    // Animate to the new position with improved easing
    gsap.to(this.itemGroup.rotation, { // Animate the rotation of the itemGroup
      x: this.targetRotation, // Rotate to the target rotation
      duration: 0.5, // Slightly longer for smoother motion
      ease: "power3.out", // Better deceleration curve
      //onUpdate: () => { 
        // Update the highlight during the animation
      //  this.updateFrontItemHighlight(); // <- allow it now
      //},
      onComplete: () => { //<<< FIX 1: Clear transition flag and locks >>>
        this.isAnimating = false; // <<< FIX 1: Clear transition flag
        this.updateFrontItemHighlight(true); // <- allow it now
        // Don't automatically update floating preview when scrolling
        // Only update existing preview if we already have one visible
        if (this.showingPreview) { // Only update if we are already showing a preview
          this.updateFloatingPreview(this.currentIndex); // <<< FIX 1: Use currentIndex here
        }
      }
    });
  }

  updateFrontItemHighlight(force = false) { // Function to update the highlight of the front item
    if (this.highlightLock) { // <<< FIX 1: Check if highlightLock is active
      console.warn("🚫 Highlight update blocked during highlightLock."); // Updated log
      return; // Do nothing if highlightLock is active
    }

    // 🛡️ Skip recalculating if we have a clickedUniqueId still active
    if (this.clickedUniqueId) {
      console.warn("🛡️ Skipping highlight recalculation due to active clickedUniqueId.");
      return;
    }

    // <<< ADD isTransitioning CHECK & CONSOLIDATE LOCKS >>>
    if (this.isTransitioning || this.selectItemLock || this.forceLockedIndex !== null) { // <<< FIX 1: Check if selectItem is locked
      // console.warn("🛑 updateFrontItemHighlight skipped during locked state."); // Optional debug
      return; // Skip highlight update if transitioning or locked
    }
    // <<< REMOVED REDUNDANT CHECKS >>>

    if ((this.isAnimating && !force)) return; // Keep existing isAnimating check too
    // Define front position (3 o'clock)
    // const frontPosition = 0;

    let closestItem = null; // <<< FIX 1: Initialize closestItem here
    let smallestAngleDiff = Infinity; // <<< FIX 1: Initialize smallestAngleDiff
    let newIndex = -1; // <<< FIX 1: Initialize newIndex

    // Find the item visually closest to the front position
    this.itemMeshes.forEach((container, index) => { // Iterate over each item in the submenu
      if (!container || !container.userData || !this.itemGroup) return; // Skip if container or userData is missing

      const originalAngle = container.userData.angle || 0; // Get the original angle of the item
      const rotationAngle = this.itemGroup.rotation.x || 0; // Get the current rotation angle of the itemGroup

      // Calculate angular difference
      const angleDiff = Math.abs((originalAngle - rotationAngle + Math.PI) % (Math.PI * 2) - Math.PI); // Calculate the absolute difference between the original angle and the current rotation angle, normalized to [-π, π]
      const TOLERANCE = Math.PI / 12; // 15 degrees tolerance


      // Update the closest item if this one is closer or within the tolerance
      if (
        angleDiff < smallestAngleDiff - TOLERANCE || // Clearly closer
        (Math.abs(angleDiff - smallestAngleDiff) <= TOLERANCE && index < newIndex) // Within tolerance, use index as tiebreaker
      ) {
        smallestAngleDiff = angleDiff;
        closestItem = container;
        newIndex = index;
      }
    });

    // <<< FIX 1: Override closestItem and newIndex if forceLockedIndex is set
    if (this.forceLockedIndex !== null && this.forceLockedIndex >= 0 && this.forceLockedIndex < this.itemMeshes.length) {
      // Lock highlight strictly to selected item
      closestItem = this.itemMeshes[this.forceLockedIndex];
      newIndex = this.forceLockedIndex;
      // console.warn(`Highlight locked to index: ${newIndex}`); // Optional debug
    } else if (closestItem) {
      newIndex = closestItem.userData.index; // Get index from the found closest item
    }


    // Only highlight if we found an item and it's different from current
    console.log(`🔄 [Carousel3DSubmenu.js] updateFrontItemHighlight() triggered. Force=${force}`);
    //console.log(`🔄 [Carousel3DSubmenu.js] Current index before update: ${this.currentIndex}`);
    if (closestItem && newIndex !== this.currentIndex) { // <<< FIX 1: Use newIndex here
      // Deselect current item
      if (this.currentIndex >= 0 && this.currentIndex < this.itemMeshes.length) {
        const currentContainer = this.itemMeshes[this.currentIndex];
        if (currentContainer && currentContainer.userData) {
          const currentMesh = currentContainer.userData.mesh;
          const currentIcon = currentContainer.userData.iconMesh;

          if (currentMesh && currentMesh.userData && currentMesh.userData.originalColor) {
            currentMesh.material.color.copy(currentMesh.userData.originalColor);
            currentMesh.material.emissive = new THREE.Color(0x000000);
            currentMesh.scale.copy(currentMesh.userData.originalScale);
          }

          if (currentIcon && currentIcon.userData && currentIcon.userData.originalScale) {
            currentIcon.scale.copy(currentIcon.userData.originalScale);
            if (!gsap.isTweening(currentIcon.rotation)) {
              currentIcon.rotation.set(0, 0, 0);
            }
          }
        }
      }

      // Highlight the new item
      // const newIndex = closestItem.userData.index; // <<< FIX 1: Moved index assignment up
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

        // ✅ Step 2: Update scaling logic
        const iconOriginal = icon.userData.originalScale || new THREE.Vector3(1, 1, 1);
        const multiplier = 1.3;
        icon.scale.set(
          iconOriginal.x * multiplier,
          iconOriginal.y * multiplier,
          iconOriginal.z * multiplier
        ); // Set instantly using original scale

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

        this.currentIndex = newIndex; // <<< FIX 1: Use newIndex here

        // Only update if we're already showing a preview
        if (this.showingPreview) {
          this.updateFloatingPreview(newIndex); // <<< FIX 1: Use newIndex here
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
          if (!mesh) return; // Only mesh is strictly required

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

          // Reset any Y rotation for consistent appearance
          container.rotation.y = 0;

          // Basic wheel positioning
          // container.position.y = this.watermillRadius * Math.sin(container.userData.angle);
          // container.position.z = this.watermillRadius * Math.cos(container.userData.angle);
        });

        // --- DEBUG LOGGING ---
        // const locksActive = this.selectItemLock || this.forceLockedIndex !== null || this.isTransitioning;
        // if (frontItemIndex >= 0 && frontItemIndex !== this.currentIndex) {
          // console.warn(`[🧪 Update Check] FrontIdx: ${frontItemIndex}, CurrentIdx: ${this.currentIndex}, Locks Active: ${locksActive}`);
        // }
        // --- END DEBUG LOGGING ---

        // If we found an item at the front position, highlight it
        if (frontItemIndex >= 0 && frontItemIndex !== this.currentIndex &&
          !(this.selectItemLock || this.forceLockedIndex !== null || this.isTransitioning)) {
          // console.warn(`[⚠️ Hijack] Front item index (${frontItemIndex}) overriding current (${this.currentIndex})`);
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

                // Cancel any ongoing animations and reset rotation immediately
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

              // Add clean geodesic spin animation only for newly highlighted item
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
      labelString = item.label || item ||`Item ${index}`; // Use item itself if label is missing, fallback to index
      // Fallback toa default label if none is provided```javascript
      if (!labelString) {
        // console.warn("[🍉 Preview] No label provided for floating preview, using default.");
        labelString = `Item ${index}`;
      }
      // console.warn("Floating Preview Label:", labelString); // Log the label (moved to combined log)

      // <<< FIX 2: Update TextGeometry parameters
      const textGeometry = new TextGeometry(labelString, {
        font: this.font,
        size:0.3,
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

  // <<< FIX 3: Replace startFloatingPreviewSpin
  startFloatingPreviewSpin() {
    if (!this.floatingPreview) return;

    // Kill any existing rotation tweens first
    gsap.killTweensOf(this.floatingPreview.rotation);

    this.isSpinning = true;
    this.floatingPreview.rotation.set(0, 0, 0); // Reset rotation before starting

    // Spin only around Y axis, relative to current rotation
    gsap.to(this.floatingPreview.rotation, {
      y: "+=" + Math.PI * 2, // Use relative rotation
      duration: 12,          // Slower spin
      repeat: -1,            // Infinite loop
      ease: "none"           // Linear spin
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
      this.floatingPreview.traverse(obj => { // Traverse the floating preview group
        if (obj.geometry) obj.geometry.dispose(); // Dispose geometry
        if (obj.material) { // Check if material exists
          if (Array.isArray(obj.material)) { // Dispose array of materials
            obj.material.forEach(m => m.dispose()); // Dispose array of materials
          } else { 
            obj.material.dispose(); // Dispose single material
          }
        }
      });

      this.floatingPreview = null; // Clear reference to floating preview
    }
  }

  updateCurrentItemFromRotation() { // This method updates the current item index based on the rotation of the itemGroup
    // Skip update if lock is active
    if (this.forceSelectLock) { // this.forceSelectLock is the lock for selectItem
      // console.warn('[🔒] Skipping updateCurrentItemFromRotation during selectItem animation.');
      return;
    }

    // Check if required properties exist
    if (!this.itemGroup) { 
      // console.warn("itemGroup is not defined, cannot update current item.");
      return;
    }

    if (this.targetRotation === undefined) { 
      // console.warn("targetRotation is not defined, cannot update current item.");
      return;
    }

    if (!this.itemMeshes || this.itemMeshes.length === 0) { 
      // console.warn("itemMeshes is not defined or empty, cannot update current item.");
      return;
    }

    // Calculate the rotation of the itemGroup
    const itemGroupRotation = this.itemGroup.rotation.x; // Get the current rotation of the itemGroup

    // Calculate the difference between targetRotation and itemGroupRotation
    const rotationDiff = this.targetRotation - itemGroupRotation; 

    // Normalize the rotation difference to be within -PI and PI
    const normalizedRotationDiff = ((rotationDiff + Math.PI) % (Math.PI * 2)) - Math.PI; // Normalize to range [-PI, PI]

    // Check if the absolute value of the rotation difference is greater than a threshold
    if (Math.abs(normalizedRotationDiff) > 0.1) { // Adjust threshold as needed
      // Calculate the new rotation based on the itemGroup's rotation
      const newRotation = itemGroupRotation + normalizedRotationDiff; // Normalize the new rotation to be within -PI and PI

      // Normalize the new rotation to be within 0 and 2*PI
      const normalizedNewRotation = ((newRotation + Math.PI) % (Math.PI * 2)) - Math.PI; 

      // Calculate the index of the item based on the normalized rotation
      const indexFromNewRotation = Math.floor((normalizedNewRotation + Math.PI) / (Math.PI * 2) * this.itemMeshes.length); 

      // Ensure the index is within bounds
      const clampedIndexFromNewRotation = Math.max(0, Math.min(indexFromNewRotation, this.itemMeshes.length - 1)); 

      // Update current item index if it has changed
      if (clampedIndexFromNewRotation !== this.currentItemIndex) { 
        this.currentItemIndex = clampedIndexFromNewRotation; 
        // console.log(`Current item index updated to: ${this.currentItemIndex}`);
      }

      // Normalize the target rotation to be within 0 and 2*PI
      const normalizedRotation = ((this.targetRotation + Math.PI) % (Math.PI * 2)) - Math.PI; 

      // Calculate the index based on the normalized target rotation
      const indexFromTargetRotation = Math.floor((normalizedRotation + Math.PI) / (Math.PI * 2) * this.itemMeshes.length); 

      // Ensure the index is within bounds
      const clampedIndexFromTargetRotation = Math.max(0, Math.min(indexFromTargetRotation, this.itemMeshes.length - 1)); 

      // Update current item index if it has changed
      if (clampedIndexFromTargetRotation !== this.currentItemIndex) { 
        this.currentItemIndex = clampedIndexFromTargetRotation; 
        // console.log(`Current item index updated to: ${this.currentItemIndex}`);
      }
    }
  }

  // 🆕 Add robust click handler for submenu items
  handleSubmenuClick(event, camera) { // Ensure camera is provided

    console.groupCollapsed('🖱️ Submenu Click Trace');

    console.log(`- Submenu Name: ${this.submenuName || 'Unknown'}`);
    let clickedUniqueId = null; // Declare and initialize clickedUniqueId
    const clickedItemIndex = this.itemMeshes.findIndex(m => m.userData.uniqueId === clickedUniqueId);
    console.log(`- Clicked Item Index: ${clickedItemIndex}`);
    let clickedObj = null; // Declare and initialize clickedObj
    console.log(`- Clicked Item Label: ${clickedObj?.userData?.label || 'Unknown Label'}`);
    console.log(`- Clicked Item UniqueID: ${clickedUniqueId || 'Unknown UniqueId'}`);
    console.log(`- Current Highlighted Index: ${this.currentIndex}`);
    console.log(`- Intended Target Rotation: ${this.targetRotation?.toFixed(3) || 'n/a'} radians`);
    console.log(`- Current Rotation X: ${this.itemGroup?.rotation?.x.toFixed(3) || 'n/a'} radians`);
    console.log(`- Time: ${new Date().toLocaleTimeString()}`);

    console.groupEnd();

    const raycaster = new THREE.Raycaster(); // Create a new raycaster instance
    const mouse = new THREE.Vector2( // Calculate mouse position in normalized device coordinates
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera); // Set raycaster from mouse position

    // Intersect with all children of itemMeshes (deep search)
    const allMeshes = this.itemMeshes.flatMap(g => g.children ? [g, ...g.children] : [g]); // Flatten the array to include all children
    const intersects = raycaster.intersectObjects(allMeshes, true); // Use true for recursive search

    if (intersects.length > 0) { // An object was clicked
        let clickedObj = intersects[0].object; // Get the first intersected object
        while (clickedObj && !clickedObj.userData.uniqueId && clickedObj.parent) { // Traverse up the hierarchy to find userData
            clickedObj = clickedObj.parent; // Traverse up the hierarchy to find userData
        }
        const clickedUniqueId = clickedObj?.userData?.uniqueId; // Get the unique ID of the clicked object
        if (clickedUniqueId) { // Valid unique ID found
            console.log(`[Carousel3DSubmenu] Submenu item clicked: UniqueId=${clickedUniqueId}`); // Log clicked unique ID
            const clickedItemIndex = this.itemMeshes.findIndex(m => m.userData.uniqueId === clickedUniqueId); // Find index of clicked item
            if (clickedItemIndex !== -1) { // Valid index found
                console.log(`[Carousel3DSubmenu] Clicked item index: ${clickedItemIndex}`); // Log clicked item index
                console.log(`[Carousel3DSubmenu] Current highlighted index: ${this.currentIndex}`); // Log current highlighted index
                this.selectItem(clickedItemIndex, true, true); // Show floating preview on click
            }
        }
    }
    console.debug("Item Meshes:", this.itemMeshes); // Debugging: Log all item meshes
    console.debug("Current Index:", this.currentIndex); // Debugging: Log current index
  }
}