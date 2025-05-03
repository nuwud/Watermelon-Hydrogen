/**
 * Class that creates and manages a D submenu cylinder that spawns from a parent carousel item.
 * When a user selects an item in the parent Carousel3DPro, this component creates a submenu that
 * rotates its items in a cylindrical formation.
 * 
 * @class
 * @extends THREE.Group
 * @classdesc Creates a 3D submenu with items positioned in a cylindrical formation around a parent item.
 * Handles item positioning, rotation, highlighting, and animated transitions.
 * 
 * @param {THREE.Object3D} parentItem - The parent item from which this submenu spawns
 * @param {Array<string|Object>} items - Array of items to display in the submenu
 * @param {Object} config - Configuration options for the submenu
 * @param {number} [config.textColor=0xffffff] - Color for the item text
 * @param {number} [config.textEmissive=0x222222] - Emissive color for text
 * @param {number} [config.highlightColor=0x00ffff] - Color for highlighted items
 * @param {THREE.Camera} config.camera - The camera used for rendering
 * @param {THREE.Scene} config.scene - The scene to add elements to
 * @param {Object} config.carousel - Reference to the parent carousel
 * 
 * @property {THREE.Object3D} parentItem - The parent item this submenu is attached to
 * @property {Array} items - Array of items in the submenu
 * @property {Object} config - Configuration options
 * @property {Array} itemMeshes - Array of THREE.Group containers for each item
 * @property {number} currentIndex - Currently selected item index
 * @property {number} watermillRadius - Radius of the submenu cylinder
 * @property {number} rotationAngle - Current rotation angle
 * @property {number} targetRotation - Target rotation angle
 * @property {number} rotationSpeed - Speed of rotation animation
 * @property {boolean} isTransitioning - Flag indicating if submenu is in transition
 * @property {boolean} selectItemLock - Flag to prevent selection during animation
 * @property {number|null} forceLockedIndex - Forced index override during transitions
 * @property {THREE.Group} itemGroup - Container for all rotatable items
 * @property {THREE.Group} fixedElements - Container for UI elements that don't rotate
 * @property {THREE.Mesh} closeButton - Close button mesh
 * @property {THREE.Group} floatingPreview - Preview that appears when an item is selected
 */
/**
 * @AI-PROMPT
 * This file defines a 3D submenu cylinder that spawns from an item on the parent Carousel3DPro.
 * This file implements nested 3D submenu cylinders.
 * When a user selects an item in Carousel3DPro, use this class to pop out submenus around it.
 * 
 * Each submenu rotates its items around a cylinder, using `getItemAngles()` from carouselAngleUtils.js to determine layout.
 * 
 * 🎯 OBJECTIVE
 * Ensure the submenu highlights the clicked item, rotates it to the 3 o’clock position, and maintains smooth animations without overriding selection state.:
 *
 * 🧠 ROLE:
 * This class creates and manages the 3D submenu ring that appears when a parent item is selected.
 * It controls submenu geometry, item positioning, rotation, highlighting, and animation flow.
 *
 * 🔍 CRITICAL RULES:
 * - The clicked item must rotate into the 3 o’clock (front-facing) position.
 * - `selectItem(index)` must set the selected item without being overridden post-animation.
 * - `update()` and `updateFrontItemHighlight()` MUST NOT override selection during transitions.
 * - All items should be aware of their position via index, not just angle comparisons.
 *
 * 🔁 WORK IN PROGRESS:
 * - Fix highlight hijack: `currentIndex` being reset by visual alignment logic.
 * - Respect lock guards: isTransitioning, forceLockedIndex, selectItemLock.
 * - Use `carouselAngleUtils.getItemAngles()` for deterministic item layout.
 *
 * 🔧 CALL TREE (primary methods):
 * - selectItem(index, { forceSmooth = true })
 * - update() → updates rotation, calls getFrontItemIndex()
 * - getFrontItemIndex() → uses angle comparisons (may be unstable)
 * - createItems() → builds icons + text, positions them using angle layout
 * - show() → places submenu in 3D space based on parent + carousel rotation
 *
 * 🧱 DEPENDENCIES:
 * - carouselAngleUtils.js → getItemAngles()
 * - main.js → calls show(), selectItem(), and injects camera/scene
 * - Carousel3DPro.js → provides parentItem, parent rotation
 *
 * ✅ GOAL:
 * Submenu behavior should be index-based, smooth, visually correct, and free of race conditions.
 * - Always position the *clicked* submenu item at the 3 o’clock position (angle = 0).
 * - Avoid auto-overriding the `currentIndex` during rotation animation (i.e., don’t let `update()` or `updateFrontItemHighlight()` hijack the state).
 * - Support smooth animated alignment, not snapping.
 * 
 * 🔧 FUNCTIONS TO WATCH:
 * - `selectItem(index, opts)` → must lock rotation target to match predefined angles
 * - `update()` → may override currentIndex during spin unless `forceLockedIndex` is respected
 *
 * 🔁 RELATION TO PARENT:
 * - Carousel3DPro controls the orientation of `parentItem` and its `.parent`, which this submenu uses to derive its world-space rotation.
 *
 * 🛠️ DEBUG STRATEGY:
 * - Log: parentItem.rotation.y, this.rotation.y, clicked index, currentIndex, frontItemIndex
 * - Compare against expected angle from `getItemAngles()`
 *
 * 🧠 DEV NOTES:
 * - If submenu highlights the wrong item, index mismatch is likely due to reversed order, angle wraparound, or frontItemIndex override.
 * - Consider introducing `rotationIndexMap` to guarantee index–angle correspondence.
 *
 * ✅ CONTEXT:
 * This file is part of a custom 3D menu system using Three.js for Shopify Hydrogen (WatermelonOS).
 * The system includes a parent carousel (main ring), and nested submenus (submenu ring).
 * Each submenu pops out of a selected parent item and must:
 * - Always highlight the *clicked* item.
 * - Rotate so that the clicked item lands at the 3 o’clock (front-facing) position.
 * - Avoid flipping, skipping, or overriding state due to visual alignment mismatches.
 *
 * 🚨 IMPORTANT CONSIDERATIONS:
 * - Do NOT override currentIndex during animations unless forceLockedIndex is null.
 * - Items are laid out in clockwise rotation using angles from `carouselAngleUtils.js`.
 * - Rotation logic must resolve based on index, not just angle.
 * - Rotation direction may be counterclockwise but should result in correct alignment.
 * - `selectItem()` is the only safe place to set `currentIndex` intentionally.
 * - `update()` and `updateFrontItemHighlight()` may override state unintentionally — guard them!
 *
 * 🔁 WORK IN PROGRESS:
 * - Replace all “angle-based guessing” with an index-based locking mechanism.
 * - Visual snap-to-rotation must feel smooth, not teleporting.
 * - Optional utility `getItemAngles(itemCount)` from `carouselAngleUtils.js` is available.
 *
 * 🧠 DEV STYLE:
 * Patrick (Nuwud) prefers full function rewrites, strong guardrails, and traceable debug logs.
 * The goal is stability, clarity, and modularity — this is a *real* production UI, not a demo.
 *
 * 🛠️ KEY METHODS INVOLVED:
 * - selectItem(index, options)
 * - getFrontItemIndex()
 * - update()
 * - updateFrontItemHighlight()
 * - createItems()
 *
 * 🧩 Primary file interactions:
 * - Carousel3DSubmenu.js (submenu logic)
 * - main.js (instantiates submenus, injects camera/scene, handles clicks)
 * - Carousel3DPro.js (handles parent carousel logic)
 * - carouselAngleUtils.js (source of angle map or angle calculation per index)
 */

import * as THREE from 'three'; // Import Three.js core
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'; // Import TextGeometry for 3D text rendering
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'; // Import FontLoader for loading fonts
// Removed unused imports: getGlowShaderMaterial, getOpacityFadeMaterial, defaultCarouselStyle
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // Import GLTFLoader for loading 3D models

// Access GSAP from the global scope
import gsap from 'gsap'; // Import GSAP for animations

// Cache font to improve performance
let cachedFont = null; // Cache for font to avoid loading multiple times

export class Carousel3DSubmenu extends THREE.Group { // Class definition for Carousel3DSubmenu
  constructor(parentItem, items = [], config = {}) { // Call parent constructor
    super(); // Call parent constructor
    this.parentItem = parentItem; // Reference to the parent item this submenu is attached to
    this.items = items; // Array of items to display in the submenu
    this.config = config; // Configuration options for the submenu
    this.itemAngles = config.angles; // Store the pre-calculated angles
    this.itemMeshes = []; // Array to hold THREE.Group containers for each item
    this.currentIndex = 0; // Currently selected item index
    this.watermillRadius = 1.2; // Radius of the submenu cylinder
    this.rotationAngle = 0; // Current rotation angle of the submenu
    this.targetRotation = 0; // Target rotation angle for smooth animations
    this.rotationSpeed = 0.15; // Increased for smoother rotation
    this.isInitialized = false; // Track initialization state
    this.floatingPreview = null; // Preview that appears when an item is selected
    this.isSpinning = false; // Track if submenu is currently spinning
    this.showingPreview = false; // Track if preview is currently being shown
    this.lastParentRotation = 0; // Initialize to track parent rotation
    // this.isForceHighlightLocked = false; // Keep commented or remove if selectItemLock replaces it
    this.selectItemLock = false; // <<< FIX 1: Add selectItemLock flag
    this.forceLockedIndex = null; // <<< FIX 1: Add forceLockedIndex flag
    this.targetRotationLocked = false; // <<< BONUS FIX: Add targetRotation lock flag
    this.isTransitioning = false; // Global flag to track any selection or transition animation
    this.forceSelectLock = false; // 1. Add lock property


    // Create container for items to rotate
    this.itemGroup = new THREE.Group(); // Create a group to hold all items
    this.add(this.itemGroup); // Add the item group to the main group

    // Load font from CDN directly
    this.fontLoader = new FontLoader(); // Create a new FontLoader instance

    // Try to use cached font first for instant creation
    if (cachedFont) { // Check if font is already cached
      this.font = cachedFont; // Use cached font if available
      this.createItems(); // Create items using the cached font
      this.isInitialized = true; // Track initialization state

      // Position wheel so first item is at front
      if (this.itemMeshes.length > 0) { // Check if there are items created
        // Position wheel so first item is at front (3 o'clock)
        const firstItemAngle = this.itemAngles ? this.itemAngles[0] : 0; // Use pre-calculated angle or default to 0
        this.itemGroup.rotation.x = -firstItemAngle + 0; // Position the item at the front (3 o'clock position)
        this.targetRotation = this.itemGroup.rotation.x; // Set target rotation immediately
      }
    } else {
      // Load font if not cached
      this.fontLoader.load('/helvetiker_regular.typeface.json', (font) => { // Load the font from the specified URL
        cachedFont = font; // Cache for future use
        this.font = font; // Store the loaded font in the instance
        this.createItems(); // Create items using the loaded font
        this.isInitialized = true; // Track initialization state

        // Position wheel
        if (this.itemMeshes.length > 0) { // Check if there are items created
          // Position wheel so first item is at front (3 o'clock)
          const firstItemAngle = this.itemAngles ? this.itemAngles[0] : 0; // Use pre-calculated angle or default to 0
          this.itemGroup.rotation.x = -firstItemAngle + 0; // Position the item at the front (3 o'clock position)
          this.targetRotation = this.itemGroup.rotation.x; // Set target rotation immediately
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
    this.closeButton.position.set(1.8, 1.8, 0.5); // Positioned in top corner
    this.closeButton.scale.set(0.8, 0.8, 0.8); // Start slightly smaller for animation
    this.closeButton.renderOrder = 9999; // Ensure it renders on top of other elements

    // Set isCloseButton flag
    this.closeButton.userData = { // Set userData for easy access
      isCloseButton: true, // Flag to identify close button
      originalColor: baseMaterial.color.clone(), // Store original color for reset
      hoverColor: new THREE.Color(0xff0000) // Red hover color
    };

    // Add the "X" to the red disk
    this.createCloseButtonX(); // Create the "X" shape for the close button

    // Add to fixed elements group
    this.fixedElements.add(this.closeButton); // Add the close button to the fixed elements group
  }

  createCloseButtonX() {
    // Use thinner BoxGeometry for the X
    const lineGeometry1 = new THREE.BoxGeometry(0.22, 0.03, 0.03); // Thinner line for the first part of the X
    const lineGeometry2 = new THREE.BoxGeometry(0.22, 0.03, 0.03); // Thinner line for the second part of the X

    const lineMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff, // White color for the X
      emissive: 0xffffff, // White emissive glow
      emissiveIntensity: 0.8 // Stronger glow for visibility
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
    this.closeButton.userData.xLines = [line1, line2]; // Store the lines in userData for easy access

    // Set isCloseButton on the X parts too
    line1.userData = { isCloseButton: true }; // Set flag on first line
    line2.userData = { isCloseButton: true }; // Set flag on second line

    this.closeButton.add(line1); // Add the first line to the close button
    this.closeButton.add(line2); // Add the second line to the close button
  }

  getFrontIndex() { // Determine which item is currently at the front (3 o'clock position)
    if (!this.itemMeshes.length) return -1; // Return -1 if no items exist

    let closestItem = null; // Track the closest item to the front
    let smallestAngleDiff = Infinity; // Start with a large angle difference
    let frontIndex = 0; // Default to the first item index

    this.itemMeshes.forEach((container) => { // Iterate through each item mesh
      const originalAngle = container.userData.angle || 0; // Get the original angle of the item
      const rotationAngle = this.itemGroup.rotation.x || 0; // Get the current rotation angle of the item group

      const effectiveAngle = (originalAngle - rotationAngle + Math.PI * 2) % (Math.PI * 2); // Calculate the effective angle in the range [0, 2π]
      const normalizedAngle = effectiveAngle < 0 ? effectiveAngle + (Math.PI * 2) : effectiveAngle; // Normalize angle to [0, 2π]
      let angleDiff = Math.abs(normalizedAngle - 0); // Calculate the absolute difference from the front position (0 radians)

      if (angleDiff > Math.PI) { // If the angle difference is greater than π, use the complementary angle
        angleDiff = (Math.PI * 2) - angleDiff; // Calculate the complementary angle difference
      }

      if (angleDiff < smallestAngleDiff - 0.01) { // Check if this item is closer to the front than the previous closest
        smallestAngleDiff = angleDiff; // Update the smallest angle difference
        closestItem = container; // Update the closest item
      }
    });

    if (closestItem) { // If we found a closest item, get its index
      frontIndex = closestItem.userData.index; // Get the index of the closest item
    }

    return frontIndex; // Return the index of the item closest to the front
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

    return colors[index % colors.length]; // Return color based on index
  }

  createItems() { // Ensure font is loaded before creating items
    if (!this.font) return; // Return if font is not loaded yet

    // Special handling for Gallery items - create more elaborate 3D models
    const isGallerySubmenu = this.parentItem.userData?.item === 'Gallery'; // Check if parent item is tagged as Gallery

    // Calculate even distribution around the wheel
    // const angleStep = (2 * Math.PI) / this.items.length;

    // Define shapes for icons with more elaborate options for Gallery
    const regularShapes = [ // Regular shapes for non-Gallery items
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
    const galleryShapes = { // Gallery-specific shapes
      'Photos': () => { // Create a group for the photo frame and photo
        const group = new THREE.Group(); // Create a group to hold the photo frame and photo
        // Photo frame
        const frame = new THREE.Mesh( 
          new THREE.BoxGeometry(0.2, 0.16, 0.01), // Create a box geometry for the photo frame
          new THREE.MeshStandardMaterial({ color: 0xdddddd }) // Create a standard material for the photo frame
        );
        // Photo inside
        const photo = new THREE.Mesh( 
          new THREE.PlaneGeometry(0.18, 0.14), // Create a plane geometry for the photo
          new THREE.MeshBasicMaterial({ color: 0x2299ff }) // Create a basic material for the photo
        );
        photo.position.z = 0.006; // Position the photo slightly in front of the frame
        group.add(frame); // Add the frame to the group
        group.add(photo); // Add the photo to the group
        return group; // Return the group containing the photo frame and photo
      },
      'Videos': () => {
        const group = new THREE.Group(); // Create a group for the video screen and play button
        // Video screen
        const screen = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.12, 0.02), // Create a box geometry for the video screen
          new THREE.MeshStandardMaterial({ color: 0x222222 }) // Create a standard material for the video screen
        );
        // Play button
        const playBtn = new THREE.Mesh(
          new THREE.CircleGeometry(0.04, 16), // Create a circle geometry for the play button
          new THREE.MeshBasicMaterial({ color: 0xff3333 }) // Create a basic material for the play button
        );
        playBtn.position.z = 0.011; // Position the play button slightly in front of the screen
        group.add(screen); // Add the screen to the group
        group.add(playBtn); // Add the play button to the group
        return group; // Return the group containing the video screen and play button
      },
      '3D Models': () => {
        const group = new THREE.Group(); // Create a group for the 3D model and base
        // Base cube
        const cube = new THREE.Mesh( // Create a cube mesh for the base
          new THREE.BoxGeometry(0.1, 0.1, 0.1), // Create a box geometry for the base
          new THREE.MeshStandardMaterial({ color: 0x66cc99, wireframe: true }) // Create a standard material for the base with wireframe
        );
        // Sphere inside
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 12, 12), // Create a sphere geometry for the 3D model
          new THREE.MeshStandardMaterial({ color: 0x99ff66 }) // Create a standard material for the sphere
        );
        group.add(cube); // Add the base cube to the group
        group.add(sphere); // Add the sphere to the group
        return group; // Return the group containing the 3D model and base
      },
      'Artwork': () => {
        const group = new THREE.Group(); // Create a group for the artwork canvas and colored squares
        // Canvas
        const canvas = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.18, 0.01), // Create a box geometry for the canvas
          new THREE.MeshStandardMaterial({ color: 0xf5f5f5 }) // Create a standard material for the canvas
        );
        // Add some colored squares as "art"
        const colors = [0xff3333, 0x3333ff, 0x33ff33, 0xffff33]; // Array of colors for the squares
        for (let i = 0; i < 4; i++) { // Loop through the colors array
          const x = (i % 2) * 0.08 - 0.04; // Calculate x position based on index
          const y = Math.floor(i / 2) * 0.08 - 0.04; // Calculate y position based on index
          const square = new THREE.Mesh( //   Create a square mesh for the colored squares
            new THREE.PlaneGeometry(0.04, 0.04), // Create a plane geometry for the square
            new THREE.MeshBasicMaterial({ color: colors[i] }) // Create a basic material for the square
          );
          square.position.set(x, y, 0.006); // Position the square slightly in front of the canvas
          group.add(square); // Add the square to the group
        }
        group.add(canvas); // Add the canvas to the group
        return group; // Return the group containing the artwork canvas and colored squares
      },
      'Animations': () => { // Create a group for the animation icon and base
        const group = new THREE.Group(); // Base cube
        // Film reel
        const reel = new THREE.Mesh( // Create a cylinder mesh for the film reel
          new THREE.TorusGeometry(0.08, 0.02, 16, 32), // Create a torus geometry for the film reel
          new THREE.MeshStandardMaterial({ color: 0x333333 }) // Create a standard material for the film reel
        );
        // Add spokes
        for (let i = 0; i < 6; i++) { // Loop to create spokes for the film reel
          const angle = (i / 6) * Math.PI * 2; // Calculate angle for each spoke
          const spoke = new THREE.Mesh( // Create a cylinder mesh for the spoke
            new THREE.CylinderGeometry(0.005, 0.005, 0.16), // Create a cylinder geometry for the spoke
            new THREE.MeshStandardMaterial({ color: 0x999999 }) // Create a standard material for the spoke
          );
          spoke.rotation.z = angle; // Rotate spoke to align with the reel
          group.add(spoke); // Add the spoke to the group
        }
        group.add(reel); // Add the film reel to the group
        return group; // Return the group containing the film reel and spokes
      },
      'Virtual Tours': () => { // Create a group for the virtual tour headset and lenses
        const group = new THREE.Group(); // Create a group for the virtual tour headset and lenses
        // VR headset simplified
        const headset = new THREE.Mesh( // Create a box mesh for the VR headset
          new THREE.BoxGeometry(0.2, 0.1, 0.1), // Create a box geometry for the VR headset
          new THREE.MeshStandardMaterial({ color: 0x222222 }) // Create a standard material for the VR headset
        );
        // Lenses
        const leftLens = new THREE.Mesh( // Create a circle mesh for the left lens
          new THREE.CircleGeometry(0.03, 16), // Create a circle geometry for the left lens
          new THREE.MeshBasicMaterial({ color: 0x3399ff }) // Create a basic material for the left lens
        );
        leftLens.position.set(-0.05, 0, 0.051); // Position the left lens slightly in front of the headset
        const rightLens = leftLens.clone(); // Clone the left lens for the right lens
        rightLens.position.set(0.05, 0, 0.051); // Position the right lens slightly in front of the headset
        group.add(headset); // Add the headset to the group
        group.add(leftLens); // Add the left lens to the group
        group.add(rightLens); // Add the right lens to the group
        return group; // Return the group containing the virtual tour headset and lenses
      }
    };

    this.items.forEach((item, index) => { // Iterate through each item in the submenu
      // Create text geometry 
      const geometry = new TextGeometry(item.toString(), { // Create text geometry using the loaded font
        font: this.font, // Use the loaded font
        size: 0.25, // Set font size
        height: 0.05, // Set height for extrusion
        depth: 0.02, // Set depth for extrusion
        curveSegments: 12, // Number of segments for curved text
        bevelEnabled: true, // Enable bevel for a more polished look
        bevelThickness: 0.02, // Bevel thickness
        bevelSize: 0.01, 
        bevelOffset: 0, // Bevel offset
        bevelSegments: 5 // Number of segments for bevel
      });

      geometry.computeBoundingBox(); // Compute bounding box for text geometry
      geometry.center(); // Center the geometry so it aligns properly

      // Get text dimensions
      const textWidth = geometry.boundingBox.max.x - geometry.boundingBox.min.x; // Calculate width of the text
      const textHeight = geometry.boundingBox.max.y - geometry.boundingBox.min.y; // Calculate height of the text

      // Create material for text
      const material = new THREE.MeshStandardMaterial({ // Create a standard material for the text
        color: this.config.textColor || 0xffffff, // Default text color
        transparent: true, // Enable transparency
        opacity: 0.9, // Default opacity
        emissive: this.config.textEmissive || 0x222222, // Default emissive color
        emissiveIntensity: 0.2 // Default emissive intensity
      });

      const mesh = new THREE.Mesh(geometry, material); // Create a mesh from the geometry and material


      // Create a container for the mesh
      const container = new THREE.Group(); // Create a group to hold the text mesh and hit area
      container.add(mesh); // Add the text mesh to the container
      container.userData.index = index; // Store the index in userData for easy access
      // container.userData.angle = (index / this.items.length) * (Math.PI * 2); // Calculate angle for positioning

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

      const hitArea = new THREE.Mesh(hitAreaGeometry, hitAreaMaterial); // Create a mesh from the geometry and material
      hitArea.position.z = -0.1; // Positioned to extend both in front and behind text
      container.add(hitArea); // Add the hit area to the container

      // Determine which shape/icon to use
      let iconMesh = null; // Initialize iconMesh to null
      const iconOffset = Math.max(0.7, textWidth * 0.25); // Calculate offset
      let baseScale = new THREE.Vector3(1, 1, 1); // Default base scale

      if (item === 'Cart') {
        // Load the GLTF cart model asynchronously
        const loader = new GLTFLoader(); // Create a new GLTFLoader instance
        loader.load('/assets/Cart.glb', (gltf) => { // Load the GLTF model
          const model = gltf.scene; // Get the loaded model from the GLTF

          // ✅ Step 1: Save original scale after loading model
          baseScale.set(0.3, 0.3, 0.3); // Set specific base scale for Cart
          model.scale.copy(baseScale); // Store original scale
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
            const multiplier = isHighlighted ? 1.3 : 1.0; // Scale multiplier for highlighted state

            gsap.set(model.scale, { x: 0, y: 0, z: 0 }); // Start invisible
            gsap.to(model.scale, { // Animate scale to original size
              x: model.userData.originalScale.x * multiplier, // Use original scale
              y: model.userData.originalScale.y * multiplier, // Use original scale
              z: model.userData.originalScale.z * multiplier, // Use original scale
              duration: 0.5, // Duration of the animation
              ease: 'elastic.out', // Elastic easing for a bouncy effect
            });

            // If this item is highlighted when loaded, apply spin
            if (isHighlighted && model) { // Add model check
              gsap.killTweensOf(model.rotation); // Stop any existing rotation animations
              gsap.timeline() // Create a new timeline for sequential animations
                .to(model.rotation, { // Rotate to initial position
                  y: Math.PI * 2, x: Math.PI * 0.8, z: Math.PI * 0.5, // Rotate to a specific position
                  duration: 1.0, ease: "power1.inOut" // Smooth rotation
                })
                .to(model.rotation, { // Spin the cart icon
                  x: 0, z: 0, duration: 0.3, ease: "back.out(2)" // Spin back to original position
                }, "-=0.1"); // Overlap with previous animation for a seamless effect
            }
          }
        }, undefined, (error) => { // Handle errors during model loading
          console.error(`Error loading Cart.glb: ${error}`); // Log error if model fails to load
        });

      } else if (isGallerySubmenu && galleryShapes[item]) { 
        // Use special Gallery icon (synchronous)
        iconMesh = galleryShapes[item](); // Create the specific icon for the Gallery submenu
        iconMesh.position.x = -textWidth / 2 - iconOffset; // Use calculated offset
        iconMesh.userData.originalScale = baseScale.clone(); // Store default base scale (1,1,1)
        container.add(iconMesh); // Add the icon mesh to the container
        container.userData.iconMesh = iconMesh; // Store reference in userData
        iconMesh.scale.set(0, 0, 0); // Start invisible for animation
      } else {
        // Use regular shape (synchronous)
        const shapeIndex = index % regularShapes.length; // Cycle through regular shapes based on index
        const shapeGeometry = regularShapes[shapeIndex](); // Create the geometry for the icon shape
        const shapeMaterial = new THREE.MeshStandardMaterial({ // Create a standard material for the icon shape
          color: this.getIconColor(index), // Use color based on index
          metalness: 0.3, // Slightly metallic for a more realistic look
          roughness: 0.4, // Slightly rough for a more realistic look
          emissive: this.getIconColor(index), // Use color based on index for emissive effect
          emissiveIntensity: 0.2 // Set emissive intensity for glow effect
        }); // Create the material for the icon shape

        iconMesh = new THREE.Mesh(shapeGeometry, shapeMaterial); // Create the icon mesh from the geometry and material
        iconMesh.position.x = -textWidth / 2 - iconOffset; // Use calculated offset
        iconMesh.userData.originalScale = baseScale.clone(); // Store default base scale (1,1,1)
        container.add(iconMesh); // Add the icon mesh to the container
        container.userData.iconMesh = iconMesh; // Store reference in userData
        iconMesh.scale.set(0, 0, 0); // Start invisible for animation
      }

      // For longer text items, shift the text slightly right to make more room for the icon
      if (textWidth > 2) { 
        // For very long text, shift it more to the right
        mesh.position.x = iconOffset * 0.3; // Shift text slightly right
      }

      // Position around the parent
      //const angle = angleStep * index;
      const angle = this.itemAngles ? this.itemAngles[index] : (index / this.items.length) * (Math.PI * 2); // Use pre-calculated angle or fallback
      //container.userData.angle = angle;

      // Position in a circle around the parent
      container.position.y = this.watermillRadius * Math.sin(angle); // Position along the Y axis based on angle
      container.position.z = this.watermillRadius * Math.cos(angle); // Position along the Z axis based on angle

      // Store data with the container
      container.userData = { // Store additional data in userData for easy access
        index, // Store the index of the item
        isSubmenuItem: true, // Flag to identify submenu items
        item, // Store the item name
        angle, // Use the determined angle
        mesh, // Store the actual mesh for this item
        hitArea, // Store the hit area mesh for this item
        originalAngle: angle, // Store the determined angle as originalAngle
        springVelocity: 0, // Store initial spring velocity
        springTarget: 0, // Store initial spring target
        springStrength: 0.1, // Store initial spring strength
        springDamping: 0.6, // Store initial spring damping
        iconMesh: container.userData.iconMesh || null // Ensure iconMesh is stored (might be null initially for Cart)
      };

      // Store original scale with the actual mesh
      mesh.userData = { // Store additional data in userData for easy access
        originalScale: mesh.scale.clone(), // Store original scale for later reference
        originalColor: material.color.clone() // Store original color for later reference
      };

      // Start text invisible for animation
      mesh.scale.set(0, 0, 0); // Start text invisible for animation
      // Icon scale is set to 0 above for non-GLTF items
      hitArea.scale.set(0, 0, 0); // Start hit area invisible for animation

      this.itemMeshes.push(container); // Add the container to the itemMeshes array
      this.itemGroup.add(container); // Add the container to the itemGroup
    });

    // Highlight first item
    if (this.itemMeshes.length > 0) { // Check if there are items created
      this.selectItem(0, false); // <--- The call
      // Don't create floating preview automatically
    }
  }

  // Floating Preview Methods
  createFloatingPreview(index) { // Create a floating preview for the item at the specified index
    // Remove any existing preview
    if (this.floatingPreview) { // Check if a floating preview already exists
      if (this.floatingPreview.parent) { // Check if the floating preview has a parent
        this.floatingPreview.parent.remove(this.floatingPreview); // Remove the floating preview from its parent
      }
      this.floatingPreview = null; // Reset the floating preview reference
    }

    // Add camera check and scene check early
    if (index < 0 || index >= this.itemMeshes.length || !this.camera || !this.scene || !this.config.carousel) { // Added carousel check
      console.warn("[🍉 Preview] Cannot create floating preview: Invalid index, missing camera, scene, or carousel reference.", {
        index, // Log the index being used
        hasCamera: !!this.camera, // Check for camera reference
        hasScene: !!this.scene, // Check for scene reference
        hasCarousel: !!this.config.carousel // Check for carousel reference
      }); 
      return; // Early exit if conditions are not met
    }

    const item = this.items[index]; // Get the item at the specified index
    const sourceContainer = this.itemMeshes[index]; // Get the container for the item at the specified index

    // Create a new group for the floating preview
    this.floatingPreview = new THREE.Group(); // Create a new group for the floating preview

    // --- Position preview based on carousel center ---
    const center = new THREE.Vector3(); // Create a vector to hold the center position
    // Use the injected carousel reference from config
    const carouselItemGroup = this.config.carousel?.itemGroup; // Check if carousel reference is available

    if (carouselItemGroup) { // If carousel reference is available
      carouselItemGroup.getWorldPosition(center); // Get world position of the main carousel's item group
      this.floatingPreview.position.copy(center); // Copy the center position to the floating preview

      // Optional: Nudge slightly towards the camera or adjust Y position
      const offsetDirection = new THREE.Vector3(); // Get direction vector
      this.camera.getWorldPosition(offsetDirection); // Get camera position
      offsetDirection.sub(center).normalize(); // Get direction from center to camera
      // this.floatingPreview.position.addScaledVector(offsetDirection, 1.5); // Move slightly towards camera (adjust distance as needed)
      // this.floatingPreview.position.y += 0.75; // Float slightly above center
      this.floatingPreview.position.y += 1.2; // <<< FIX 4: Elevate floating preview

      // Make the preview face the camera
      this.floatingPreview.lookAt(this.camera.position); // Face the camera

    } else {
      console.warn("⚠️ Could not find carousel itemGroup to determine center position. Falling back to camera-relative positioning.");
      // Fallback (original camera-relative positioning - might still be wrong)
      const distanceInFront = 4.5; // Distance in front of the camera
      const previewPosition = new THREE.Vector3(); // Create a vector to hold the preview position
      const cameraDirection = new THREE.Vector3(); // Get direction vector
      this.camera.getWorldDirection(cameraDirection); // Get camera's world direction
      this.camera.getWorldPosition(previewPosition); // Get camera's world position
      previewPosition.addScaledVector(cameraDirection, distanceInFront); // Move forward
      this.floatingPreview.position.copy(previewPosition); // Copy the calculated position to the floating preview
      this.floatingPreview.rotation.copy(this.camera.rotation); // Face camera (approx)
      this.floatingPreview.position.y += 1.2; // <<< FIX 4: Elevate floating preview (fallback case)
    }
    // --- End Positioning ---


    // Log the calculated position
    // console.warn("Floating Preview Calculated Position:", this.floatingPreview.position);

    // Clone icon from the selected item with larger scale
    const sourceIcon = sourceContainer.userData.iconMesh; // Get the icon mesh from the source container
    let previewIcon = null; // Initialize to null

    // <<< ADD DEBUG LOG for Cart cloning >>>
    if (item === 'Cart' && sourceIcon) { // Check if the item is 'Cart' and sourceIcon exists
      console.warn('🧩 Cloning Cart icon:', { 
        isGroup: sourceIcon instanceof THREE.Group, // Check if sourceIcon is a group
        childrenCount: sourceIcon.children?.length, // Log number of children if it's a group
        sourceIcon // Log the object itself for inspection
      }); 
    }

    // Handle different types of icons (meshes vs groups)
    if (sourceIcon instanceof THREE.Group) { // Check if the sourceIcon is a group
      // <<< FIX: Clone the entire group structure recursively >>>
      previewIcon = sourceIcon.clone(true); // Use recursive clone
      // <<< FIX: Traverse cloned group to clone materials and set emissive >>>
      previewIcon.traverse(child => { // Traverse the cloned group
        if (child.isMesh) { // Check if the child is a mesh
          // Ensure material exists and is clonable
          if (child.material && typeof child.material.clone === 'function') { // Clone the material
            child.material = child.material.clone(); // Clone material
            // Set emissive properties on the cloned material
            child.material.emissive = new THREE.Color(this.getIconColor(index)); // Set emissive color based on index
            child.material.emissiveIntensity = 0.3; // Set emissive intensity
            child.material.needsUpdate = true; // Ensure update
          } else {
            console.warn("[🍉 Preview Clone] Child mesh material missing or not clonable:", child); 
          }
        }
      });
    } else if (sourceIcon instanceof THREE.Mesh) { // Check if it's a mesh
      // Clone the mesh
      const clonedGeometry = sourceIcon.geometry.clone(); // Clone the geometry
      const clonedMaterial = sourceIcon.material.clone(); // Clone the material

      // Enhance material with emissive and glow for better visibility
      clonedMaterial.emissive = new THREE.Color(this.getIconColor(index)); // Set emissive color based on index
      clonedMaterial.emissiveIntensity = 0.5; // Set emissive intensity

      previewIcon = new THREE.Mesh(clonedGeometry, clonedMaterial); // Create a new mesh with cloned geometry and material
    } else {
      console.warn("[🍉 Preview] Source icon is not a Mesh or Group, cannot clone for preview.");
      // Optionally create a placeholder or return
      // return;
    }

    // Log if previewIcon is null after cloning attempt
    if (!previewIcon) { 
      console.warn("[🍉 Preview] previewIcon is null after cloning attempt.");
    } else {
      // Scale up the icon (4x larger)
      previewIcon.scale.set(4, 4, 4); // Set larger scale for better visibility
      this.floatingPreview.add(previewIcon); // Add the cloned icon to the floating preview
    }

    // Create text label to display above the icon
    let labelString = `Item ${index}`; // Default label
    let textMesh = null; // Initialize to null

    if (this.font) { // Check if the font is loaded
      labelString = item.label || item || `Item ${index}`; // Use item itself if label is missing, fallback to index
      // Fallback to a default label if none is provided
      if (!labelString) {
        // console.warn("[🍉 Preview] No label provided for floating preview, using default.");
        labelString = `Item ${index}`;
      }
      // console.warn("Floating Preview Label:", labelString); // Log the label (moved to combined log)

      // <<< FIX 2: Update TextGeometry parameters
      const textGeometry = new TextGeometry(labelString, { // Create text geometry using the loaded font
        font: this.font, // Use the loaded font
        size: 0.3, // Set font size
        depth: 0.1, // Reduced depth for better visibility
        height: 0.05, // Keep some depth
        bevelEnabled: true, // Enable bevel for a more polished look
        bevelThickness: 0.01, // Smaller bevel
        bevelSize: 0.005,     // Smaller bevel
        bevelOffset: 0, // No offset
        bevelSegments: 3,     // Fewer segments
        curveSegments: 8      // Fewer segments
      });

      textGeometry.computeBoundingBox(); // <<< FIX 2: Compute bounding box before centering
      textGeometry.center(); // <<< FIX 2: Ensure centering

      // Log bounding box dimensions (moved to combined log)
      // const bbox = textGeometry.boundingBox;
      // console.warn("Text Geometry Bounding Box:", { ... });

      const textMaterial = new THREE.MeshStandardMaterial({ // Create a standard material for the text
        color: 0xffffff, // Default text color
        emissive: 0x99ccff, // Light blue emissive for better visibility
        emissiveIntensity: 0.5, // Set emissive intensity
        transparent: true, // Enable transparency
        opacity: 0.9 // Default opacity
      });

      textMesh = new THREE.Mesh(textGeometry, textMaterial); // Assign to textMesh

      // Position text above the icon
      textMesh.position.y = 2.2; // Position above the icon

      // <<< FIX 2: Normalize scale and update geometry/matrix
      textMesh.scale.set(0.75, 0.75, 0.75); // Uniform scale
      textMesh.geometry.computeBoundingBox(); // Recompute after scale? Maybe not needed if centered before scale.
      textMesh.geometry.computeBoundingSphere(); // Recompute bounding sphere if needed
      textMesh.updateMatrixWorld(); // Force update

      // <<< FIX 2: Add final bounding box log
      // console.warn('📐 Final TextGeometry BBox:', textMesh.geometry.boundingBox);


      this.floatingPreview.add(textMesh);
      // } else {
      //   console.warn("[🍉 Preview] Font not loaded, cannot create text label.");
    }

    // Log if textMesh is null after creation attempt
    // if (!textMesh) {
    //   console.warn("[🍉 Preview] textMesh is null after creation attempt.");
    // }

    // Store the index this preview represents
    this.floatingPreview.userData.index = index; // Store the index in userData for easy access

    // Start with zero scale and animate in
    // this.floatingPreview.scale.set(0, 0, 0); // GSAP will handle this
    this.floatingPreview.userData.originalPosition = this.floatingPreview.position.clone(); // Store original position for potential future use

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
    this.floatingPreview.visible = true; // Ensure visibility is set to true
    // this.floatingPreview.scale.set(1, 1, 1); // Let GSAP handle initial scale
    this.floatingPreview.updateMatrixWorld(true); // Force update
    // console.warn("[🍉 Visibility/Scale Audit Before Add]", {
    //   visible: this.floatingPreview.visible,
    //   scale: this.floatingPreview.scale.clone() // Clone to log current value
    // });
    // --- End Audit ---

    // Add to the scene explicitly
    // console.warn("[🍉 Preview] Adding floatingPreview to Scene", this.scene.uuid);
    this.scene.add(this.floatingPreview); // Add the floating preview to the scene
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
        x: 1, y: 1, z: 1, // Set final scale to 1
        duration: 0.8, // Duration of the animation
        ease: "elastic.out(1, 0.5)" // Elastic easing for a bouncy effect
      }
    );

    // Start the slow rotation animation
    this.startFloatingPreviewSpin(); // <<< FIX 3: Start rotation animation here

  }

  selectItem(index, animate = true, createPreview = false) { // Select an item in the submenu by index
    if (index < 0 || index >= this.itemMeshes.length) return; // Check if index is valid

    // <<< FIX 1: Set forceLockedIndex at the beginning
    this.forceLockedIndex = index; // <<< FIX 1: Lock index before any animations

    // Deselect current
    if (this.currentIndex !== index && this.itemMeshes[this.currentIndex]) { // Check if current index is different and valid
      const currentContainer = this.itemMeshes[this.currentIndex]; // Get the container for the currently selected item
      const currentMesh = currentContainer.userData.mesh; // Get the mesh for the currently selected item
      const currentIcon = currentContainer.userData.iconMesh; // Get the icon mesh for the currently selected item

      // Reset appearance
      currentMesh.material.color.copy(currentMesh.userData.originalColor); // Reset color to original
      currentMesh.material.emissive = new THREE.Color(0x000000); // Reset emissive color

      if (animate) {
        gsap.to(currentMesh.scale, { // Animate scale back to original size
          x: currentMesh.userData.originalScale.x, // Reset to original x
          y: currentMesh.userData.originalScale.y, // Reset to original y
          z: currentMesh.userData.originalScale.z, // Reset to original z
          duration: 0.3 // Duration of the animation
        });

        if (currentIcon) {
          // ✅ Step 2: Update scaling logic
          const iconOriginal = currentIcon.userData.originalScale || new THREE.Vector3(1, 1, 1); // Get original scale from userData or default to (1, 1, 1)
          // Reset icon scale using original scale
          gsap.to(currentIcon.scale, { // Animate icon scale back to original size
            x: iconOriginal.x, // Reset to original x
            y: iconOriginal.y, // Reset to original y
            z: iconOriginal.z, // Reset to original z
            duration: 0.3 // Duration of the animation
          });

          // Reset rotation to upright immediately without animation
          gsap.killTweensOf(currentIcon.rotation); // Stop any existing rotation animations
          gsap.set(currentIcon.rotation, { x: 0, y: 0, z: 0 }); // Reset rotation to upright immediately without animation
        }
      } else {
        currentMesh.scale.copy(currentMesh.userData.originalScale); // Reset scale instantly using original scale
        if (currentIcon) {
          // ✅ Step 2: Update scaling logic
          const iconOriginal = currentIcon.userData.originalScale || new THREE.Vector3(1, 1, 1); // Reset icon scale using original scale
          currentIcon.scale.copy(iconOriginal); // Reset instantly using original scale
          currentIcon.rotation.set(0, 0, 0); // Reset rotation immediately
        }
      }
    }

    const angleOffsetFromParent = this.parentItem?.parent?.rotation?.y || 0;
    this.targetAngle = -this.itemAngles[index] + angleOffsetFromParent;

    // Select new
    const selectedContainer = this.itemMeshes[index]; // Get the container for the newly selected item
    const selectedMesh = selectedContainer.userData.mesh; // Get the mesh for the newly selected item
    const selectedIcon = selectedContainer.userData.iconMesh; // Get the icon mesh for the newly selected item

    // Apply highlight appearance
    selectedMesh.material.color.set(this.config.highlightColor || 0x00ffff); // Set highlight color
    selectedMesh.material.emissive = new THREE.Color(0x003333); // Set emissive color for highlight effect

    if (animate) {
      // Scale up text
      gsap.to(selectedMesh.scale, { // Animate scale up
        x: selectedMesh.userData.originalScale.x * 1.3, // Scale up by 1.3x
        y: selectedMesh.userData.originalScale.y * 1.3, // Scale up by 1.3x
        z: selectedMesh.userData.originalScale.z * 1.3, // Scale up by 1.3x
        duration: 0.3 // Duration of the animation
      });

      if (selectedIcon) {
        // ✅ Step 2: Update scaling logic
        const iconOriginal = selectedIcon.userData.originalScale || new THREE.Vector3(1, 1, 1); // Get original scale from userData or default to (1, 1, 1)
        const multiplier = 1.3; // Highlight multiplier

        // Scale up icon using original scale
        gsap.to(selectedIcon.scale, { // Animate icon scale up
          x: iconOriginal.x * multiplier, // Scale up by 1.3x
          y: iconOriginal.y * multiplier, // Scale up by 1.3x
          z: iconOriginal.z * multiplier, // Scale up by 1.3x
          duration: 0.3, // Duration of the animation
          ease: "back.out" // Snappy elastic ease
        });

        // Add a clean 1-second geodesic spin animation to the icon
        gsap.killTweensOf(selectedIcon.rotation); // Stop any existing rotation animations
        gsap.timeline() // Create a new timeline for sequential animations
          .to(selectedIcon.rotation, { // Rotate to initial position
            y: Math.PI * 2, // One full rotation around Y axis
            x: Math.PI * 0.8, // Add tilt for geodesic effect
            z: Math.PI * 0.5, // Add roll for geodesic effect
            duration: 1.0, // Exactly 1 second
            ease: "power1.inOut" // Smooth acceleration and deceleration
          })
          .to(selectedIcon.rotation, {
            x: 0, // Reset to upright
            z: 0, // Reset to upright
            duration: 0.3, // Quick snap back
            ease: "back.out(2)" // Snappy elastic ease
          }, "-=0.1"); // Slight overlap for smoother transition
      }

      // Position the item at the front (3 o'clock position)
      // Adjust rotation so selected item faces 3 o'clock, assuming front is offset by π/2
      const outwardOffset = Math.PI / 2; // tweak this based on visual testing
      // The value 0 corresponds to the 3 o'clock position
      this.targetRotation = -selectedContainer.userData.angle + outwardOffset; // Set target rotation to face the selected item at 3 o'clock position
      this.targetRotationLocked = true; // <<< BONUS FIX: Lock targetRotation
      this.isTransitioning = true; // <<< SET TRANSITION FLAG
      this.selectItemLock = true; // <<< FIX 1: Lock before animation starts
      this.forceSelectLock = true; // 2. Set lock before animation
      this.ignoreHighlightOverride = true; // prevent hijack during GSAP
      

      gsap.to(this.itemGroup.rotation, { // Animate rotation to target position
        x: this.targetRotation, // Rotate to the target position
        duration: 0.6, // Duration of the animation
        ease: "power2.out", // Smooth deceleration curve
        onComplete: () => { // Animation complete callback
          this.currentIndex = index; // Lock in the index *AFTER* rotation is done
          this.isTransitioning = false; // <<< CLEAR TRANSITION FLAG
          this.selectItemLock = false; // <<< FIX 1: Unlock directly
          this.forceLockedIndex = null; // <<< FIX 1: Release lock directly
          this.targetRotationLocked = false; // <<< BONUS FIX: Unlock targetRotation directly
          this.forceSelectLock = false; // 2. Unlock after animation
          this.ignoreHighlightOverride = false; // allow highlight updates again
          // Removed setTimeout wrapper
        }
      });
    } else {
      // Instant scale without animation
      selectedMesh.scale.set( // Reset scale instantly using original scale
        selectedMesh.userData.originalScale.x * 1.3, // Scale up by 1.3x
        selectedMesh.userData.originalScale.y * 1.3, // Scale up by 1.3x
        selectedMesh.userData.originalScale.z * 1.3 // Scale up by 1.3x
      );

      if (selectedIcon) { // Check if selectedIcon exists
        // ✅ Step 2: Update scaling logic
        const iconOriginal = selectedIcon.userData.originalScale || new THREE.Vector3(1, 1, 1); // Get original scale from userData or default to (1, 1, 1)
        const multiplier = 1.3; // Highlight multiplier
        selectedIcon.scale.set(
          iconOriginal.x * multiplier, // Scale up by 1.3x
          iconOriginal.y * multiplier, // Scale up by 1.3x
          iconOriginal.z * multiplier // Scale up by 1.3x
        ); // Set instantly using original scale
      }

      // Set initial rotation to front position without animation
      this.itemGroup.rotation.x = -selectedContainer.userData.angle + 0; // Position the item at the front (3 o'clock position)
      this.targetRotation = this.itemGroup.rotation.x; // <<< BONUS FIX: Set targetRotation immediately
      // <<< FIX 1: Release lock immediately if not animating
      this.forceLockedIndex = null; // <<< FIX 1: Release lock immediately if not animating
      this.forceSelectLock = false; // 2. Unlock if not animating
      this.highlightLockIndex = index; // <<< FIX 1: Lock index immediately if not animating
      setTimeout(() => { // <<< FIX 1: Release lock after a short delay
        this.highlightLockIndex = null; // <<< FIX 1: Release lock after a short delay
      }, 350); // Match or slightly exceed GSAP animation time

    }

    console.warn(`[🧩 selectItem] Clicked index: ${index}, Label: ${this.items[index]}`); 

    this.currentIndex = index; // Update current index to the newly selected index

    const frontIndex = this.getFrontIndex(); // move this to top
    if (index !== frontIndex) { // If the selected index is not the front item, we need to update the highlight
      selectedMesh.material.color.set(0xff00ff); // Mismatch purple
    } else {
      selectedMesh.material.color.set(this.config.highlightColor || 0x00ffff); // Correct highlight
    }

    // Only update floating preview when explicitly requested
    if (createPreview) { // Create preview only if requested
      this.showingPreview = true; // Track that we are showing a preview
      this.updateFloatingPreview(index); // Update the floating preview for the newly selected item
    }
  }

  scrollSubmenu(delta) { // Scroll the submenu by a specified delta value
    // <<< FIX 1 & BONUS FIX & NEW TRANSITION CHECK >>>
    if (this.selectItemLock || this.forceLockedIndex !== null || this.isTransitioning) { // Check if selectItem is currently animating or locked
      console.warn("🚫 scrollSubmenu blocked during selectItem animation or transition."); // Updated log
      return; // Do nothing if selectItem is animating, forcing index, or transitioning
    }
    if (this.targetRotationLocked) { // Check if targetRotation is locked by selectItem
      console.warn("⛔️ scrollSubmenu blocked due to locked targetRotation.");
      return; // Do nothing if targetRotation is locked by selectItem
    }
    // <<< END LOCK CHECKS >>>

    // Calculate angle step between items
    const angleStep = (2 * Math.PI) / this.itemMeshes.length; // Calculate angle step based on number of items

    // Smooth and more controlled scrolling
    this.targetRotation += delta > 0 ? -angleStep : angleStep; // Adjust rotation based on scroll direction

    // Animate to the new position with improved easing
    gsap.to(this.itemGroup.rotation, {
      x: this.targetRotation, // Rotate to the target position
      duration: 0.5, // Slightly longer for smoother motion
      ease: "power3.out", // Better deceleration curve
      onUpdate: () => { 
        // Update the highlight during the animation
        this.updateFrontItemHighlight(); // <- allow it now
      },
      onComplete: () => { // Animation complete callback
        this.isAnimating = false; // <<< CLEAR ANIMATION FLAG
        this.updateFrontItemHighlight(true); // <- allow it now
        // Don't automatically update floating preview when scrolling
        // Only update existing preview if we already have one visible
        if (this.showingPreview) { // Check if we are currently showing a preview
          this.updateFloatingPreview(this.currentIndex); // Update the floating preview for the currently selected item
        }
      }
    });
  }

  show() {
    this.visible = true; // Set visibility to true

    // Make sure close button is fully visible from the start
    if (this.closeButton) { // Reset to full scale immediately before any animations
      // Reset to full scale immediately before any animations
      this.closeButton.scale.set(1, 1, 1); // Reset close button scale to full size

      // Make sure X is visible
      if (this.closeButton.userData.xLines) { // Check if xLines exist
        this.closeButton.userData.xLines.forEach(line => { // Iterate over each line in xLines
          line.scale.set(1, 1, 1); // Reset line scale to full size
          line.visible = true; // Ensure line is visible

          // Force update of material
          if (line.material) { // Ensure line has a material
            line.material.needsUpdate = true; // Force update the material to ensure visibility
          }
        });
      }

      // Then apply the show animation
      gsap.fromTo(this.closeButton.scale, // Start from half scale
        { x: 0.5, y: 0.5, z: 0.5 }, // Start from half scale
        {
          x: 1, y: 1, z: 1,   // End at full scale
          duration: 0.3, 
          delay: 0.2, // Delay to allow submenu to appear first
          ease: "back.out" // Snappy elastic ease
        }
      );
    }

    // CRITICAL: First select and position the first item BEFORE any animations
    if (this.itemMeshes.length > 0) { // Check if there are items created
      // Position wheel so first item is directly in front
      const firstItem = this.itemMeshes[0]; // Get the first item container
      // Position at 3 o'clock
      this.itemGroup.rotation.x = -firstItem.userData.angle + 0; // Position the item at the front (3 o'clock position)
      this.targetRotation = this.itemGroup.rotation.x; // <<< BONUS FIX: Set targetRotation immediately

      // Highlight the first item
      this.currentIndex = 0; // Set current index to the first item
      const selectedMesh = firstItem.userData.mesh; // Get the mesh for the first item
      const selectedIcon = this.itemMeshes[this.currentIndex]?.userData?.iconMesh; // Get the icon mesh for the first item
      if (selectedIcon) { // Log the selected icon for debugging
        console.warn("✅ Selected icon ready for use:", selectedIcon); // Log the selected icon for debugging
      }

      // Apply highlight colors
      selectedMesh.material.color.set(this.config.highlightColor || 0x00ffff); // Set highlight color
      selectedMesh.material.emissive = new THREE.Color(0x003333); // Set emissive color for highlight effect
      // Ensure initial highlight uses correct scale if icon is already loaded
      const firstIcon = firstItem.userData.iconMesh; // Get the icon mesh for the first item
      if (firstIcon) { // Check if firstIcon exists
        const iconOriginal = firstIcon.userData.originalScale || new THREE.Vector3(1, 1, 1); // Get original scale from userData or default to (1, 1, 1)
        const multiplier = 1.3; // Highlight multiplier
        firstIcon.scale.set( // Set icon scale to highlight size
          iconOriginal.x * multiplier, // iconOriginal.x * multiplier,
          iconOriginal.y * multiplier, // iconOriginal.y * multiplier,
          iconOriginal.z * multiplier // iconOriginal.z * multiplier
        );
      }
    }

    // Make sure entire submenu appears with a smooth animation
    if (this.itemGroup) { // Check if itemGroup exists
      // Start with a smaller scale
      this.itemGroup.scale.set(0.1, 0.1, 0.1); // Start with a smaller scale

      // Animate to full size
      gsap.to(this.itemGroup.scale, { // Animate to full size
        x: 1, y: 1, z: 1, // End at full scale
        duration: 0.5, // Duration of the animation
        ease: "back.out(1.7)" // Snappy elastic ease
      }); 

      // Also animate rotation for a nice effect
      gsap.from(this.itemGroup.rotation, { // Animate rotation from 0
        y: Math.PI, // Rotate to 180 degrees
        duration: 0.6, // Duration of the animation
        ease: "power2.out" // Smooth deceleration curve
      });
    }

    // Then animate all items appearing
    this.itemMeshes.forEach((container, i) => { // Iterate over each item container
      const mesh = container.userData.mesh; // Get the mesh reference from userData
      const iconMesh = container.userData.iconMesh; // Get iconMesh reference from userData
      const hitArea = container.userData.hitArea; // Get hitArea reference from userData

      // Special scaling for the highlighted item (index 0)
      const isHighlighted = i === 0; // Check if this is the highlighted item
      const textMultiplier = isHighlighted ? 1.3 : 1.0; // Multiplier for text

      // Animate text
      gsap.to(mesh.scale, { // Animate mesh scale
        x: mesh.userData.originalScale.x * textMultiplier, // Scale to original size multiplied by textMultiplier
        y: mesh.userData.originalScale.y * textMultiplier, // Scale to original size multiplied by textMultiplier
        z: mesh.userData.originalScale.z * textMultiplier, // Scale to original size multiplied by textMultiplier
        duration: 0.3, // 
        delay: i * 0.05, // Delay based on index
        ease: "back.out" // Snappy elastic ease
      });

      if (iconMesh) {
        // ✅ Step 2: Update scaling logic
        const iconOriginal = iconMesh.userData.originalScale || new THREE.Vector3(1, 1, 1); // Get original scale from userData or default to (1, 1, 1)
        const iconMultiplier = isHighlighted ? 1.3 : 1.0; // Multiplier for icon

        // Animate icon scale from 0 to target scale based on original
        gsap.fromTo(iconMesh.scale, // Animate icon scale from 0 to target scale based on original
          { x: 0, y: 0, z: 0 }, // Start from 0
          {
            x: iconOriginal.x * iconMultiplier, // Scale to original size multiplied by iconMultiplier
            y: iconOriginal.y * iconMultiplier, // Scale to original size multiplied by iconMultiplier
            z: iconOriginal.z * iconMultiplier, // Scale to original size multiplied by iconMultiplier
            duration: 0.3, // 
            delay: i * 0.05 + 0.1, // Delay based on index
            ease: "elastic.out" // Snappy elastic ease
          }
        );

        // Only add geodesic spin to the highlighted icon (index 0)
        if (isHighlighted) { // Check if this is the highlighted item
          gsap.killTweensOf(iconMesh.rotation); // Stop any existing rotation animations
          gsap.timeline() // Create a new timeline for sequential animations
            .to(iconMesh.rotation, { // Rotate to initial position
              y: Math.PI * 2, // One full rotation around Y axis
              x: Math.PI * 0.8, // Add tilt for geodesic effect
              z: Math.PI * 0.5, // Add roll for geodesic effect
              duration: 1.0, // 
              delay: i * 0.05 + 0.1, // Keep delay consistent
              ease: "power1.inOut" // Smooth acceleration and deceleration
            })
            .to(iconMesh.rotation, { // Reset to upright
              x: 0, // Reset to upright
              z: 0, // Reset to upright
              duration: 0.3, // 
              ease: "back.out(2)" // Snappy elastic ease
            }, "-=0.1"); // Slight overlap for smoother transition
        } else {
          // Ensure non-highlighted items have no rotation initially
          if (!gsap.isTweening(iconMesh.rotation)) { // Check if there are no active rotations
            iconMesh.rotation.set(0, 0, 0); // Reset rotation to upright immediately without animation
          }
        }
      } // End if (iconMesh)

      // Show hit area
      if (hitArea) { // Check if hitArea exists
        gsap.to(hitArea.scale, { // Animate hit area scale
          x: 1, y: 1, z: 1, // Scale to full size
          duration: 0.1, //
          delay: i * 0.05 // Delay based on index
        });
      }
    });
  }

  hide() {
    // Close floating preview first with a nice animation
    if (this.floatingPreview) { // Check if floatingPreview exists
      this.closeFloatingPreview(); // Animate floating preview scale to zero
    }

    this.itemMeshes.forEach((container, i) => { // Iterate over each item container
      const mesh = container.userData.mesh; // Get the mesh reference from userData
      const iconMesh = container.userData.iconMesh; // Get iconMesh reference from userData

      gsap.to(mesh.scale, { // Animate mesh scale to zero
        x: 0, y: 0, z: 0, // 
        duration: 0.2, // 
        delay: i * 0.03, // 
        ease: "back.in" // 
      });

      // FIXED: Add null check for iconMesh
      if (iconMesh) { // Animate icon scale to zero
        gsap.to(iconMesh.scale, { // Animate icon scale to zero
          x: 0, y: 0, z: 0, // 
          duration: 0.2, // 
          delay: i * 0.03, // 
          ease: "back.in" // 
        });
      }
    });

    // Scale out the close button
    if (this.closeButton) { // Check if closeButton exists
      gsap.to(this.closeButton.scale, { // Animate close button scale to zero
        x: 0, y: 0, z: 0,  // 
        duration: 0.2, // 
        ease: "back.in" // 
      });
    }
  }

  update() {
    // Commented out: Original logic that could hijack highlight based on rotation
    /*
    if (!this.ignoreHighlightOverride && !this.forceSelectLock) { // Only update highlights if not locked by selectItem or forceSelectLock
      const frontIndex = this.getFrontIndex(); // Get the index of the item currently at the front (3 o'clock position)
      if (this.currentIndex !== frontIndex) { // If the current index is not the front item
        console.warn(`[⚠️ Hijack] Front item index (${frontIndex}) overriding current (${this.currentIndex})`);
        this.selectItem(frontIndex, false, false); // optional: just set highlight, no preview
      }
    }
    */

    try {
      // Smooth rotation with improved damping for fluid motion
      if (this.targetRotation !== undefined && this.itemGroup) { // Check if targetRotation is defined and itemGroup exists
        const rotationDiff = this.targetRotation - this.itemGroup.rotation.x; // Calculate the difference between current and target rotation
        if (Math.abs(rotationDiff) > 0.001) { // More sensitive threshold
          // Apply ease-out style damping for smoother deceleration
          const dampingFactor = Math.min(1, Math.max(0.05, Math.abs(rotationDiff) * 0.8)); // Calculate damping factor based on rotation difference
          this.itemGroup.rotation.x += rotationDiff * dampingFactor * this.rotationSpeed; // Apply damping to rotation
        } else {
          // Snap exactly to target when very close
          this.itemGroup.rotation.x = this.targetRotation; // Snap to target rotation when close enough
        }
      }

      // Position submenu correctly relative to parent item
      if (this.parentItem && this.parentItem.parent) { // Check if parentItem and its parent exist
        try {
          // Check if parent has valid matrices before trying to get world position
          if (this.parentItem.matrixWorld && this.parentItem.matrixWorld.elements) { // Check if parentItem has a valid matrixWorld
            // Get parent world position safely
            const parentWorldPos = new THREE.Vector3(); // Create a new Vector3 for parent world position
            this.parentItem.getWorldPosition(parentWorldPos); // Get the world position of the parent item

            // Only copy position if we got valid coordinates
            if (!isNaN(parentWorldPos.x) && !isNaN(parentWorldPos.y) && !isNaN(parentWorldPos.z)) { // Check if the position is valid
              this.position.copy(parentWorldPos); // Copy the parent world position to this submenu's position
            }
          }

          // Match parent Y rotation only if it's a valid number
          if (this.parentItem.rotation && !isNaN(this.parentItem.rotation.y)) { // Check if parentItem has a valid rotation
            this.rotation.y = this.parentItem.rotation.y; // Match the Y rotation of the parent item

            // Also match parent's parent rotation (the carousel) with safeguards
            if (this.parentItem.parent.rotation && !isNaN(this.parentItem.parent.rotation.y)) {
              this.rotation.y = this.parentItem.parent.rotation.y + this.parentItem.rotation.y;
            } // Match the Y rotation of the parent item's parent (the carousel)
          }
        } catch (positionError) {
          console.warn("Error positioning submenu:", positionError); 
          // Continue execution despite positioning error
        }
      }

      // Find which item is at the front position (3 o'clock)
      // const frontPosition = 0; // 3 o'clock position

      // Only process items if the arrays are valid
      if (this.itemMeshes && this.itemMeshes.length > 0) { // Check if itemMeshes exists and has items
        // let frontItemIndex = -1; // Initialize to -1 (no item found)
        // let closestAngleDiff = Math.PI; // Initialize with largest possible value

        // First reset all items to non-highlighted state (keep this for visual consistency)
        this.itemMeshes.forEach((container, i) => { // Iterate over each item container
          if (!container || !container.userData) return; // Skip if container or userData is missing

          const mesh = container.userData.mesh; // Get the mesh reference from userData
          const iconMesh = container.userData.iconMesh; // Get iconMesh reference from userData

          // FIXED: Add null check for iconMesh before accessing properties
          // if (!mesh || !iconMesh) return; // Keep this check? Yes, safer.
          if (!mesh) return; // Only mesh is strictly required for text reset

          // Only reset if this isn't already the current item
          if (i !== this.currentIndex) { // Check if this is not the currently selected item
            if (mesh.userData && mesh.userData.originalColor) { // Check if originalColor exists in userData
              mesh.material.color.copy(mesh.userData.originalColor); // Reset color to original
              mesh.material.emissive = new THREE.Color(0x000000); // Reset emissive color
              mesh.scale.copy(mesh.userData.originalScale); // Reset scale to original size

              if (iconMesh) { // FIXED: Add null check for iconMesh
                // ✅ Step 2: Update scaling logic
                const iconOriginal = iconMesh.userData.originalScale || new THREE.Vector3(1, 1, 1); // Get original scale from userData or default to (1, 1, 1)
                iconMesh.scale.copy(iconOriginal); // Reset instantly using original scale

                // Make sure non-highlighted icons stay upright
                if (!gsap.isTweening(iconMesh.rotation)) { // Check if there are no active rotations
                  iconMesh.rotation.set(0, 0, 0); // Reset rotation to upright immediately without animation
                }
              }
            }
          }

          // Calculate current angle of this item in the wheel
          // Commented out: Angle calculation for finding front item
          /*
          const currentAngle = (container.userData.angle - this.itemGroup.rotation.x) % (Math.PI * 2); // Normalize angle to [0, 2π)

          // Find distance to front position (handling wrap-around)
          let angleDiff = Math.abs(currentAngle - frontPosition); // Calculate absolute difference
          if (angleDiff > Math.PI) { // If the difference is greater than π, take the shorter path
            angleDiff = Math.PI * 2 - angleDiff; // Adjust to find the shortest angle difference
          }

          // If this is the closest item to front position so far
          if (angleDiff < closestAngleDiff && angleDiff < Math.PI / 4) { // Only within 45 degrees
            closestAngleDiff = angleDiff; // Update closest angle difference
            frontItemIndex = i; // Update front item index
          }
          */

          // Keep text upright regardless of wheel rotation
          container.rotation.x = -this.itemGroup.rotation.x; // 

          // Reset any Y rotation for consistent appearance
          container.rotation.y = 0; // Reset Y rotation to avoid tilt

          // Basic wheel positioning
          container.position.y = this.watermillRadius * Math.sin(container.userData.angle); // Position based on angle
          container.position.z = this.watermillRadius * Math.cos(container.userData.angle); // Position based on angle
        });

        // --- DEBUG LOGGING ---
        // const locksActive = this.selectItemLock || this.forceLockedIndex !== null || this.isTransitioning;
        // if (frontItemIndex >= 0 && frontItemIndex !== this.currentIndex) {
        //   console.warn(`[🧪 Update Check] FrontIdx: ${frontItemIndex}, CurrentIdx: ${this.currentIndex}, Locks Active: ${locksActive}`);
        // }
        // --- END DEBUG LOGGING ---

        // Commented out: Logic to highlight the visually front item based on angle calculation
        /* // Potential highlight hijack logic based on rotation
        // If we found an item at the front position, highlight it
        if (frontItemIndex >= 0 && frontItemIndex !== this.currentIndex && 
          !(this.selectItemLock || this.forceLockedIndex !== null || this.isTransitioning)) { // Check if not locked by selectItem or forceSelectLock
          console.warn(`[⚠️ Hijack] Front item index (${frontItemIndex}) overriding current (${this.currentIndex})`);
          // Deselect the current item if it's different
          if (this.currentIndex >= 0 && this.currentIndex < this.itemMeshes.length) { // Check if currentIndex is valid
            const currentContainer = this.itemMeshes[this.currentIndex]; // Get the container for the currently selected item
            if (currentContainer && currentContainer.userData) { // Check if currentContainer and userData exist
              const currentMesh = currentContainer.userData.mesh; // Get the mesh for the currently selected item
              const currentIcon = currentContainer.userData.iconMesh; // Get the icon mesh for the currently selected item

              // FIXED: Add null check for currentIcon
              if (currentMesh && currentMesh.userData && currentIcon) { // Check if currentMesh and currentIcon exist
                currentMesh.material.color.copy(currentMesh.userData.originalColor); // Reset color to original
                currentMesh.material.emissive = new THREE.Color(0x000000); // Reset emissive color
                currentMesh.scale.copy(currentMesh.userData.originalScale); // Reset scale to original size

                // Determine base scale for deselected item
                const baseScale = currentContainer.userData.item === 'Cart' ? 0.3 : 1.0; // Default to 1.0 unless it's the 'Cart' item
                currentIcon.scale.set(baseScale, baseScale, baseScale); // Reset icon scale to base size

                // Cancel any ongoing animations and reset rotation
                gsap.killTweensOf(currentIcon.rotation); // Stop any existing rotation animations
                gsap.set(currentIcon.rotation, { x: 0, y: 0, z: 0 }); // Reset rotation to upright immediately without animation
              }
            }
          }

          // Highlight the new front item
          const frontContainer = this.itemMeshes[frontItemIndex]; // Get the container for the newly highlighted item
          if (frontContainer && frontContainer.userData) { // Check if frontContainer and userData exist
            const frontMesh = frontContainer.userData.mesh; // Get the mesh for the newly highlighted item
            const frontIcon = frontContainer.userData.iconMesh; // Get the icon mesh for the newly highlighted item

            // FIXED: Add null check for frontIcon
            if (frontMesh && frontIcon) { // Check if frontMesh and frontIcon exist
              // Apply highlight
              frontMesh.material.color.set(this.config.highlightColor || 0x00ffff); // Set highlight color
              frontMesh.material.emissive = new THREE.Color(0x003333); // Set emissive color for highlight effect
              frontMesh.scale.set( 
                frontMesh.userData.originalScale.x * 1.3, // Scale up by 1.3x
                frontMesh.userData.originalScale.y * 1.3, // Scale up by 1.3x
                frontMesh.userData.originalScale.z * 1.3 // Scale up by 1.3x
              );

              // ✅ Step 2: Update scaling logic
              const iconOriginal = frontIcon.userData.originalScale || new THREE.Vector3(1, 1, 1); // Get original scale from userData or default to (1, 1, 1)
              const multiplier = 1.3; // Highlight multiplier
              frontIcon.scale.set( // Scale up by 1.3x
                iconOriginal.x * multiplier, // iconOriginal.x * multiplier,
                iconOriginal.y * multiplier, // iconOriginal.y * multiplier,
                iconOriginal.z * multiplier // iconOriginal.z * multiplier
              ); // Set instantly using original scale

              // Add clean 1-second geodesic spin animation only for newly highlighted item
              gsap.killTweensOf(frontIcon.rotation); // Stop any existing rotation animations
              gsap.timeline() // Create a new timeline for sequential animations
                .to(frontIcon.rotation, { // Rotate to initial position
                  y: Math.PI * 2, // One full rotation
                  x: Math.PI * 0.8, // Tilt for geodesic path
                  z: Math.PI * 0.5, // Roll for geodesic path
                  duration: 1.0, // 
                  ease: "power1.inOut" // Smooth acceleration and deceleration
                })
                .to(frontIcon.rotation, { 
                  x: 0, // Reset to upright
                  z: 0, // Reset to upright
                  duration: 0.3, // Quick snap back
                  ease: "back.out(2)" // Snappy elastic ease
                }, "-=0.1"); // Slight overlap for smoother transition

              // Update current index
              // this.currentIndex = frontItemIndex; // Commented out: Direct modification of currentIndex
            }
          }
        }
        */
      }

      if (this.closeButton) { // Check if closeButton exists
        const cameraPosWorld = new THREE.Vector3(0, 0, 10); // Where the camera "is"

        // Convert to local space relative to closeButton’s parent
        this.closeButton.parent.worldToLocal(cameraPosWorld); // Convert world position to local space

        // Make the button face that point
        this.closeButton.lookAt(cameraPosWorld); // Make the close button face the camera position in local space

        // Orient the red disk so its flat face looks forward (Z)
        this.closeButton.rotateZ(Math.PI / 2); // Rotate the close button to face the camera

      }

      // Update floating preview position based on parent carousel rotation
      if (this.floatingPreview && this.parentItem && this.parentItem.parent) { // Check if floatingPreview and parentItem's parent exist
        // If parent carousel is rotating, stop the automatic spin
        if (this.parentItem.parent.rotation.y !== this.lastParentRotation) { // Check if parent carousel rotation has changed
          if (this.isSpinning) { // If we were spinning, stop the spin
            this.stopFloatingPreviewSpin(); // Stop the spinning animation
          }

          // Match the parent's rotation for the floating preview
          this.floatingPreview.rotation.y = this.parentItem.parent.rotation.y; // Match the Y rotation of the parent carousel
        } else if (!this.isSpinning) { // If parent carousel has stopped rotating and we're not already spinning
          // If parent stopped moving and we're not spinning, restart the spin
          this.startFloatingPreviewSpin(); // Start the spinning animation
        }

        // Store last rotation for comparison
        this.lastParentRotation = this.parentItem.parent.rotation.y; // Store the current parent rotation for future comparisons

        // Make sure the preview reflects the current highlighted item
        // Commented out: Disable auto-preview update on rotation change
        /*
        if (this.floatingPreview.userData.index !== this.currentIndex) { // Check if the floating preview index is different from the current index
          this.updateFloatingPreview(this.currentIndex); // Update the floating preview to match the current index
        }
        */
      }
    } catch (error) {
      console.error("Error in Carousel3DSubmenu update:", error); // Log the error for debugging
      // Prevent further errors by setting a safe state
      this.isErrorState = true; // Set an error state flag to prevent further issues
    }
  }

  updateFrontItemHighlight(force = false) { // Update the highlight of the item currently at the front (3 o'clock position)

    // Commented out: Original logic using highlightLockIndex - keep forceLockedIndex logic below
    /*
    if (this.highlightLockIndex !== null) { // <<< FIX 1: Check if highlightLockIndex is set
      closestItem = this.itemMeshes[this.highlightLockIndex]; // <<< FIX 1: Use highlightLockIndex if set
      newIndex = this.highlightLockIndex; // <<< FIX 1: Use highlightLockIndex if set
    }
    */

    if (this.ignoreHighlightOverride) return; // 🛡️ Protect against hijack

    // <<< ADD isTransitioning CHECK & CONSOLIDATE LOCKS >>>
    if (this.isTransitioning || this.selectItemLock || this.forceLockedIndex !== null || this.ignoreHighlightOverride) return; // Skip highlight update if transitioning, locked, or hijacked
    //if (this.isTransitioning || this.selectItemLock || this.forceLockedIndex !== null) {
    // console.warn("🛑 updateFrontItemHighlight skipped during locked state."); // Optional debug
    // return; // Skip highlight update if transitioning or locked
    //}
    // <<< REMOVED REDUNDANT CHECKS >>>

    if ((this.isAnimating && !force)) return; // Keep existing isAnimating check too
    // Define front position (3 o'clock)
    // const frontPosition = 0; // 3 o'clock position

    let closestItem = null; // <<< FIX 1: Initialize closestItem
    // let smallestAngleDiff = Infinity; // Initialize with a large value
    // let newIndex = -1; // <<< FIX 1: Initialize newIndex

    // Commented out: Logic to find the visually closest item based on angle
    /* // Potential highlight hijack logic based on visual front item
    console.warn(`[⚠️ Highlight Override] Visual front index: ${newIndex}, Label: ${this.items[newIndex]}, CurrentIndex: ${this.currentIndex}`); // Optional debug

    // Find the item visually closest to the front position
    this.itemMeshes.forEach((container) => { // Iterate over each item container
      // Calculate the effective angle accounting for rotation
      // Guard against missing userData
      if (!container || !container.userData || !this.itemGroup) return; // Skip if container or userData is missing

      const originalAngle = container.userData.angle || 0; // Get the original angle from userData or default to 0
      const rotationAngle = this.itemGroup.rotation.x || 0; // Get the current rotation angle of the itemGroup or default to 0

      // Calculate effective angle and ensure it's a valid number
      // let effectiveAngle = (originalAngle + rotationAngle) % (Math.PI * 2); // assumes a clockwise rotation

      // Calculate effective angle accounting for rotation
      let effectiveAngle = (originalAngle - rotationAngle + Math.PI * 2) % (Math.PI * 2); // assumes a counter-clockwise rotation

      // Normalize the angle to [0, 2π) range
      const normalizedAngle = effectiveAngle < 0 ? // 
        effectiveAngle + (Math.PI * 2) : // 
        effectiveAngle; // Normalize angle to [0, 2π)
      // Calculate the angular difference to the front position
      let angleDiff = Math.abs(normalizedAngle - frontPosition); // Calculate absolute difference

      // Ensure we get the smallest angle (shortest arc)
      if (angleDiff > Math.PI) { // If the difference is greater than π, take the shorter path
        angleDiff = (Math.PI * 2) - angleDiff; // Adjust to find the shortest angle difference
      }

      // Update the closest item if this one is closer
      if (angleDiff < smallestAngleDiff - 0.01) { // <<< FIX 1: Use smallestAngleDiff here
        smallestAngleDiff = angleDiff; // Update smallest angle difference
        closestItem = container; // Update closest item
      }
    });
    */

    // <<< FIX 1: Override closestItem and newIndex if forceLockedIndex is set
    // Keep this logic to respect forced index, but the angle-based finding above is commented out
    if (this.forceLockedIndex !== null && this.forceLockedIndex >= 0 && this.forceLockedIndex < this.itemMeshes.length) { // 
      // Lock highlight strictly to selected item
      closestItem = this.itemMeshes[this.forceLockedIndex]; // <<< FIX 1: Use forceLockedIndex if set
      // newIndex = this.forceLockedIndex; // <<< FIX 1: Use forceLockedIndex if set
      // console.warn(`Highlight locked to index: ${newIndex}`); // Optional debug
    } else if (closestItem) { // If we found a closest item (from the commented-out logic), use its index
      // newIndex = closestItem.userData.index; // Get index from the found closest item
    }


    // Commented out: Logic to apply highlight changes based on the visually closest item
    /* // Potential highlight hijack logic based on visual front item
    // Only highlight if we found an item and it's different from current
    if (closestItem && newIndex !== this.currentIndex) { // <<< FIX 1: Use newIndex here
      // Deselect current item
      if (this.currentIndex >= 0 && this.currentIndex < this.itemMeshes.length) { // Check if currentIndex is valid
        const currentContainer = this.itemMeshes[this.currentIndex]; // Get the container for the currently selected item
        if (currentContainer && currentContainer.userData) { // Check if currentContainer and userData exist
          const currentMesh = currentContainer.userData.mesh; // Get the mesh for the currently selected item
          const currentIcon = currentContainer.userData.iconMesh; // Get the icon mesh for the currently selected item

          if (currentMesh && currentMesh.userData && currentIcon) { // Check if currentMesh and currentIcon exist
            // Reset to original appearance
            currentMesh.material.color.copy(currentMesh.userData.originalColor); // Reset color to original
            currentMesh.material.emissive = new THREE.Color(0x000000); // Reset emissive color
            currentMesh.scale.copy(currentMesh.userData.originalScale); // Reset scale to original size

            // ✅ Step 2: Update scaling logic
            const iconOriginal = currentIcon.userData.originalScale || new THREE.Vector3(1, 1, 1); // Get original scale from userData or default to (1, 1, 1)
            currentIcon.scale.copy(iconOriginal); // Reset instantly using original scale

            // Cancel any ongoing animations and reset rotation immediately
            gsap.killTweensOf(currentIcon.rotation); // Stop any existing rotation animations
            gsap.set(currentIcon.rotation, { x: 0, y: 0, z: 0 }); // Reset rotation to upright immediately without animation
          }
        }
      }

      // Highlight the new item
      // const newIndex = closestItem.userData.index; // <<< FIX 1: Moved index assignment up
      const mesh = closestItem.userData.mesh; // Get the mesh for the newly highlighted item
      const icon = closestItem.userData.iconMesh; // Get the icon mesh for the newly highlighted item

      if (mesh && icon) { // Check if mesh and icon exist
        mesh.material.color.set(this.config.highlightColor || 0x00ffff); // Set highlight color
        mesh.material.emissive = new THREE.Color(0x003333); // Set emissive color for highlight effect
        mesh.scale.set( //  
          mesh.userData.originalScale.x * 1.3, // Scale up by 1.3x
          mesh.userData.originalScale.y * 1.3, // Scale up by 1.3x
          mesh.userData.originalScale.z * 1.3 // Scale up by 1.3x
        );

        // ✅ Step 2: Update scaling logic
        const iconOriginal = icon.userData.originalScale || new THREE.Vector3(1, 1, 1); // Get original scale from userData or default to (1, 1, 1)
        const multiplier = 1.3; // Highlight multiplier
        icon.scale.set( // 
          iconOriginal.x * multiplier, // iconOriginal.x * multiplier,
          iconOriginal.y * multiplier, // iconOriginal.y * multiplier,
          iconOriginal.z * multiplier // iconOriginal.z * multiplier
        ); // Set instantly using original scale

        // Add clean geodesic spin animation
        gsap.killTweensOf(icon.rotation); // Stop any existing rotation animations
        gsap.timeline() // Create a new timeline for sequential animations
          .to(icon.rotation, { // Rotate to initial position
            y: Math.PI * 2, // One full rotation
            x: Math.PI * 0.8, // Tilt for geodesic path
            z: Math.PI * 0.5, // Add roll for geodesic path
            duration: 1.0, // 
            ease: "power1.inOut" // Smooth acceleration and deceleration
          })
          .to(icon.rotation, { // Reset to upright
            x: 0, // 
            z: 0, // 
            duration: 0.3, // 
            ease: "back.out(2)" // Snappy elastic ease
          }, "-=0.1"); // Slight overlap for smoother transition

        // this.currentIndex = newIndex; // Commented out: Direct modification of currentIndex

        // Only update if we're already showing a preview
        // Commented out: Disable auto-preview update on rotation change
        // if (this.showingPreview) { // <<< FIX 1: Use newIndex here
        //   this.updateFloatingPreview(newIndex); // <<< FIX 1: Use newIndex here
        // }
      }
    }
    */
  }

  updateCurrentItemFromRotation() { // <<< FIX 2: Add isBeingDisposed check
    // 3. & 4. Skip update if lock is active
    if (this.forceSelectLock) { // <<< FIX 2: Check if forceSelectLock is active
      // console.warn('[🔒] Skipping updateCurrentItemFromRotation during selectItem animation.');
      return; // Skip update if selectItem is in progress
    }

    // ... rest of the existing updateCurrentItemFromRotation logic ...

    // Normalize rotation to be within 0 and 2*PI
    // ...existing code...

    // Calculate the index based on rotation
    // ...existing code...

    // Update currentItemIndex if it has changed
    // ...existing code...
  }

  // Clean disposal method to prevent memory leaks
  dispose() { 
    if (this.isDisposed || this.isBeingDisposed) return; // Prevent double disposal
    // Mark as being disposed to prevent further updates
    this.isBeingDisposed = true; // 

    // Complete any running animations
    gsap.killTweensOf(this.itemGroup.rotation); //

    if (this.itemMeshes) { // 
      this.itemMeshes.forEach(container => { // 
        if (!container) return; // Skip if container is null

        // Kill any ongoing animations
        if (container.userData && container.userData.mesh) { // 
          gsap.killTweensOf(container.userData.mesh.scale); // 
          gsap.killTweensOf(container.userData.mesh.material); // 
        }

        if (container.userData && container.userData.iconMesh) { // 
          gsap.killTweensOf(container.userData.iconMesh.scale); // 
          gsap.killTweensOf(container.userData.iconMesh.rotation); // 
        }

        // Remove from parent
        if (container.parent) { // 
          container.parent.remove(container); // 
        }

        // Dispose geometries and materials
        if (container.children) { //
          container.children.forEach(child => { // 
            if (child.geometry) child.geometry.dispose(); // 
            if (child.material) { // 
              if (Array.isArray(child.material)) { // 
                child.material.forEach(m => m.dispose()); // 
              } else { // 
                child.material.dispose(); // 
              }
            }
          });
        }
      });
    }

    // Clear arrays
    this.itemMeshes = []; // Clear itemMeshes array

    // Dispose close button
    if (this.closeButton) { // Check if closeButton exists
      gsap.killTweensOf(this.closeButton.scale); // 

      if (this.closeButton.children) { // 
        this.closeButton.children.forEach(child => { // 
          if (child.geometry) child.geometry.dispose(); // 
          if (child.material) { // 
            if (Array.isArray(child.material)) { // 
              child.material.forEach(m => m.dispose()); // 
            } else { // 
              child.material.dispose(); // 
            }
          }
        });
      }

      if (this.closeButton.parent) { // Check if closeButton has a parent
        this.closeButton.parent.remove(this.closeButton); // Remove close button from its parent
      }

      // Clear reference to close button
      this.closeButton = null; //
    }

    // Remove from scene if parent exists
    if (this.parent) { // 
      this.parent.remove(this); // 
    }

    // Ensure matrix cleanup to prevent cascading errors
    if (this.matrix) this.matrix.identity(); // Clear local matrix
    if (this.matrixWorld) this.matrixWorld.identity(); // Clear world matrix

    // Clear other references
    this.currentIndex = -1; // Reset current index
    this.parentItem = null; // Clear parent item reference
    this.itemGroup = null; // Clear item group reference
    this.fixedElements = null; // Clear fixed elements reference

    // Set flag to indicate this object has been disposed
    this.isDisposed = true; // 

    // Stop floating preview animations and remove it
    if (this.floatingPreview) { //  
      gsap.killTweensOf(this.floatingPreview.rotation); //
      gsap.killTweensOf(this.floatingPreview.scale); //

      if (this.floatingPreview.parent) { // Check if floatingPreview has a parent
        this.floatingPreview.parent.remove(this.floatingPreview); // Remove floating preview from its parent
      }

      // Dispose resources
      this.floatingPreview.traverse(obj => { // 
        if (obj.geometry) obj.geometry.dispose(); // Dispose geometry
        if (obj.material) { //  
          if (Array.isArray(obj.material)) { // 
            obj.material.forEach(m => m.dispose()); // Dispose each material in array
          } else { // 
            obj.material.dispose(); // Dispose single material
          }
        }
      });

      this.floatingPreview = null; // Clear reference to floating preview
    }
  }

  // <<< FIX 3: Replace startFloatingPreviewSpin
  startFloatingPreviewSpin() { // <<< FIX 3: Add isBeingDisposed check
    if (!this.floatingPreview) return; // <<< FIX 3: Check if isBeingDisposed is true

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

  stopFloatingPreviewSpin() { // <<< FIX 3: Add isBeingDisposed check
    if (!this.floatingPreview) return; // <<< FIX 3: Check if isBeingDisposed is true

    this.isSpinning = false; // 
    gsap.killTweensOf(this.floatingPreview.rotation); // Stop any ongoing rotation animations
  }

  updateFloatingPreview(index) {
    // Don't update if the preview already shows this index
    if (this.floatingPreview && this.floatingPreview.userData.index === index) { 
      return; 
    }

    if (index < 0 || index >= this.itemMeshes.length) return; // Ensure index is valid

    // Fade out current preview
    if (this.floatingPreview) { // Check if floatingPreview exists
      gsap.to(this.floatingPreview.scale, { // 
        x: 0, y: 0, z: 0, // Scale down to zero
        duration: 0.3, // 
        ease: "power2.in", // 
        onComplete: () => { //  
          // Remove old preview
          if (this.floatingPreview && this.floatingPreview.parent) { // Check if floatingPreview has a parent
            this.floatingPreview.parent.remove(this.floatingPreview); // Remove floating preview from its parent
          }

          // Create new preview
          this.createFloatingPreview(index); // 
        }
      });
    } else {
      this.createFloatingPreview(index); // Create new preview if none exists
    }

  }

  closeFloatingPreview() { // <<< FIX 3: Add isBeingDisposed check
    if (!this.floatingPreview) return; // <<< FIX 3: Check if isBeingDisposed is true

    // Stop the spinning animation
    this.stopFloatingPreviewSpin(); // 
    this.showingPreview = false; // 

    // Animate out
    gsap.to(this.floatingPreview.scale, { // 
      x: 0, y: 0, z: 0, // Scale down to zero
      duration: 0.4, // 
      ease: "back.in", // 
      onComplete: () => { //
        // Remove from parent
        if (this.floatingPreview && this.floatingPreview.parent) { // Check if floatingPreview has a parent
          this.floatingPreview.parent.remove(this.floatingPreview); // 
        }

        // Dispose resources
        if (this.floatingPreview) { //  
          this.floatingPreview.traverse(obj => { // 
            if (obj.geometry) obj.geometry.dispose(); // Dispose geometry
            if (obj.material) { // 
              if (Array.isArray(obj.material)) { // 
                obj.material.forEach(m => m.dispose()); // Dispose each material in array
              } else { // 
                obj.material.dispose(); // Dispose single material
              }
            }
          });

          this.floatingPreview = null; // Clear reference to floating preview
        }
      }
    });
  }

}