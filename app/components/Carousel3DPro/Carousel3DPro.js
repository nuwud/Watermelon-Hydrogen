/**
 * A 3D carousel component built with Three.js that creates an interactive rotating cylinder of text items.
 * This component creates a circular arrangement of text items that can be rotated, selected, and animated.
 * The carousel supports cylinder-style rotation, item selection, glow effects, and transparent backgrounds.
 *
 * @class
 * @extends {THREE.Group}
 * @example
 * // Basic usage
 * const items = ['Home', 'Products', 'About', 'Contact'];
 * const carousel = new Carousel3DPro(items);
 * scene.add(carousel);
 *
 * // With custom configuration
 * const config = {
 * textColor: 0x00ff00,
 * glowColor: 0x00ffff,
 * opacity: 0.8
 * };
 * const carousel = new Carousel3DPro(items, config);
 *
 * @property {Array} items - The array of items to display in the carousel
 * @property {Object} config - Configuration options for the carousel's appearance
 * @property {Array} itemMeshes - Array of Three.js meshes representing each item
 * @property {Number} currentIndex - The index of the currently selected item
 * @property {Number} targetRotation - The target rotation angle for the carousel
 * @property {Number} rotationSpeed - The speed at which the carousel rotates
 * @property {Number} cylinderRadius - The radius of the carousel cylinder
 * @property {Boolean} isAnimating - Whether the carousel is currently animating
 * @property {THREE.Group} itemGroup - Group containing all the item meshes
 * @property {THREE.Object3D} carouselCenter - Central anchor for positioning references
 * @property {THREE.Raycaster} raycaster - Raycaster for handling click interactions
 * @property {String} state - Current state of the carousel ('idle', 'transitioning', 'selecting')
 */
/**
 * @AI-PROMPT
 * This file defines the Carousel3DSubmenu class.
 * It handles circular submenu logic when a parent item is selected in the main carousel (Carousel3DPro).
 *
 * 🧠 ROLE:
 * This class spawns submenu items around a parent item, using predefined angles (from carouselAngleUtils.js).
 * It visually highlights selected items and rotates them to the front (3 o'clock) position.
 *
 * 🔁 IMPORTANT:
 * Submenu items are arranged clockwise starting at angle 0 (3 o'clock).
 * The rotation logic assumes angle alignment with parentItem + its parent (carousel) rotation.
 * Syncing with `Carousel3DPro.js` is essential to avoid override glitches.
 *
 * 🔧 PRIMARY METHODS:
 * - selectItem(index): rotates and highlights item at given index.
 * - update(): checks if a different item appears to be "front-facing" and may override `currentIndex`.
 * 🛑 This causes the highlight hijack bug unless locked.
 *
 * ⚙️ DEPENDENCIES:
 * - main.js → calls .selectItem(index) on this submenu.
 * - Carousel3DPro.js → provides parentItem and rotation context.
 * - carouselAngleUtils.js → provides getItemAngles(count)
 *
 * ✅ GOALS:
 * - When .selectItem() is triggered externally, always rotate smoothly to that item at 3 o'clock.
 * - Never override state unless the carousel is idle and no animation is in progress.
 *
 * ⚠️ HAZARDS:
 * - If `update()` or `updateFrontItemHighlight()` recompute `currentIndex` during animation,
 * it will override intended user interaction (visual hijack bug).
 */

import * as THREE from 'three';
import { Group } from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { getGlowShaderMaterial } from './CarouselShaderFX.js';
import { defaultCarouselStyle } from './CarouselStyleConfig.js'

import gsap from 'gsap';
// const gsap = typeof window !== 'undefined' && window.gsap ? window.gsap : null;
console.log('GSAP availability check:', gsap ? 'Available' : 'Not available');

export class Carousel3DPro extends Group {
  constructor(items = [], config = {}) {
    super();
    this.items = items;
    this.config = { ...defaultCarouselStyle, ...config };
    this.itemMeshes = [];
    this.currentIndex = 0;
    this.targetRotation = 0;
    this.rotationSpeed = 0.05;
    this.cylinderRadius = 5;
    this.isAnimating = false; // Flag for GSAP animation in selectItem
    this.isSpinning = false; // Flag for smooth scroll animation in update

    this.itemGroup = new THREE.Group();
    this.add(this.itemGroup);

    this.carouselCenter = new THREE.Object3D();
    this.carouselCenter.name = 'carouselCenter';
    this.carouselCenter.position.set(0, 0, 0);
    this.add(this.carouselCenter);
    this.userData.carouselCenter = this.carouselCenter;

    if (this.config.debug) {
      const helperGeo = new THREE.SphereGeometry(0.2, 16, 16);
      const helperMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
      const helper = new THREE.Mesh(helperGeo, helperMat);
      this.carouselCenter.add(helper);
    }

    this.userData.carouselCenter = this.carouselCenter;
    this.onItemClick = null;
    this.font = null;

    this.lastInteractionType = 'idle'; // Track interaction type ('click', 'scroll', 'idle')


    this.loadFont().then(() => {
      this.createItems();
      // After items are created and initial state set by selectItem(false),
      // ensure the target rotation matches the initial rotation.
      const angleStep = (2 * Math.PI) / this.items.length;
      this.targetRotation = -this.currentIndex * angleStep;
      console.log(`[Constructor] Font loaded, items created. Initial currentIndex: ${this.currentIndex}, targetRotation: ${this.targetRotation.toFixed(2)}`); // Debug log
    });

    this.raycaster = new THREE.Raycaster();
    this.setupEventListeners();

    this.levelingSpeed = 0.1;
    this.maxTilt = Math.PI / 24;
    this.state = 'idle'; // Initial state
  }

  async loadFont() {
    try {
      const fontURL = '/helvetiker_regular.typeface.json';
      const loader = new FontLoader();
      this.font = await new Promise((resolve, reject) => {
        loader.load(
          fontURL,
          (font) => {
            resolve(font);
          },
          undefined,
          (error) => {
            console.error('An error occurred while loading the font.', error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('Failed to load font:', error);
    }
  }

  /**
   * Creates and arranges 3D text items in a cylindrical carousel.
   *
   * This method performs the following actions:
   * 1. Checks if the required font (`this.font`) is loaded. If not, it exits.
   * 2. Calculates the angular step for distributing items evenly around a cylinder.
   * 3. For each item in `this.items`:
   *    a. Creates a `TextGeometry` for the item's string representation.
   *    b. Computes the bounding box and centers the geometry.
   *    c. Creates a `THREE.MeshStandardMaterial` using configured text color and opacity.
   *    d. Creates a `THREE.Mesh` for the text item.
   *    e. Sets the mesh's name to the item's string representation.
   *    f. Positions the mesh on a cylinder defined by `this.cylinderRadius`, distributing items using the calculated angle.
   *    g. Rotates the mesh to face outwards from the cylinder's center.
   *    h. Stores the original scale and color of the mesh in its `userData`.
   *    i. Creates an invisible `THREE.BoxGeometry` (hit area) larger than the text mesh to facilitate easier interaction.
   *    j. Positions and orients the hit area to match the text mesh.
   *    k. Adds the hit area to `this.itemGroup`.
   *    l. Stores the item's index and a reference to the text mesh in the hit area's `userData`.
   *    m. Stores a reference to the hit area in the text mesh's `userData`.
   *    n. Adds the text mesh to the `this.itemMeshes` array and `this.itemGroup`.
   * 4. Populates `this.clickableObjects` with the hit area meshes.
   * 5. If items were created:
   *    a. Retrieves a `savedIndex` from `localStorage` (defaults to 0 if not found or invalid).
   *    b. After a 300ms delay (to ensure the scene is ready), if the carousel is not currently animating and the `savedIndex` is valid,
   *       it calls `this.selectItem(savedIndex, true)` to animate the carousel to the item at the `savedIndex`.
   *
   * This method relies on several instance properties:
   * - `this.font`: The THREE.Font instance to use for text geometry.
   * - `this.items`: An array of items to be displayed in the carousel. Each item will be converted to a string.
   * - `this.cylinderRadius`: The radius of the cylinder on which items are placed.
   * - `this.config.textColor`: The color for the text material.
   * - `this.config.opacity`: The opacity for the text material.
   * - `this.itemGroup`: A THREE.Group to hold all created item meshes and their hit areas.
   * - `this.itemMeshes`: An array to store the created text meshes.
   * - `this.clickableObjects`: An array to store the hit area meshes for raycasting.
   * - `this.isAnimating`: A boolean flag indicating if the carousel is currently animating.
   * - `this.selectItem`: A method to select and animate to a specific item.
   */
  createItems() {
    if (!this.font) return;

    const angleStep = (2 * Math.PI) / this.items.length;

    this.items.forEach((item, index) => {
      const geometry = new TextGeometry(item.toString(), {
        font: this.font,
        size: 0.5,
        height: 0.1,
        depth: 0.1,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.02,
        bevelOffset: 0,
        bevelSegments: 5
      });
      geometry.computeBoundingBox();
      geometry.center();

      const material = new THREE.MeshStandardMaterial({
        color: this.config.textColor,
        transparent: true,
        opacity: this.config.opacity
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = item.toString();

      const angle = angleStep * index;
      mesh.position.x = this.cylinderRadius * Math.sin(angle);
      mesh.position.z = this.cylinderRadius * Math.cos(angle);
      mesh.rotation.y = Math.atan2(mesh.position.x, mesh.position.z);

      mesh.userData.originalScale = new THREE.Vector3().copy(mesh.scale);
      mesh.userData.originalColor = material.color.clone();

      const textWidth = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
      const textHeight = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
      const hitAreaWidth = textWidth * 1.5;
      const hitAreaHeight = textHeight * 2;
      const hitAreaDepth = 0.5;
      const hitAreaGeometry = new THREE.BoxGeometry(hitAreaWidth, hitAreaHeight, hitAreaDepth);
      const hitAreaMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.01
      });

      const hitArea = new THREE.Mesh(hitAreaGeometry, hitAreaMaterial);
      hitArea.position.copy(mesh.position);
      hitArea.rotation.copy(mesh.rotation);

      this.itemGroup.add(hitArea);

      hitArea.userData = { index, mesh };
      mesh.userData.hitArea = hitArea;

      this.itemMeshes.push(mesh);
      this.itemGroup.add(mesh);
    });

    this.clickableObjects = this.itemMeshes.map(mesh => mesh.userData.hitArea).filter(Boolean);

    if (this.itemMeshes.length > 0) {
      let savedIndex = 0;
      if (typeof localStorage !== 'undefined') {
        const storedIndex = localStorage.getItem('carouselIndex');
        if (storedIndex !== null) {
          savedIndex = parseInt(storedIndex, 10);
          if (isNaN(savedIndex) || savedIndex < 0 || savedIndex >= this.itemMeshes.length) {
            savedIndex = 0;
            localStorage.setItem('carouselIndex', '0');
          }
        }
      }

    //   // First set the initial position without animation
    //   this.selectItem(savedIndex, false);

    //   // If you still want a delayed animation for visual polish, you could add:
    //   setTimeout(() => {
    //     if (!this.isAnimating) {
    //       this.selectItem(savedIndex, true);
    //     }
    //   }, 300);
    // }

    setTimeout(() => { // Delay to ensure scene is fully ready
      // Only animate if carousel is not already rotating
      if (!this.isAnimating && savedIndex >= 0 && savedIndex < this.itemMeshes.length) { // Check if savedIndex is valid
        this.selectItem(savedIndex, true); // Animate to the saved index
      }
    }, 300); // Delay to ensure scene is fully ready       

    // --- Use selectItem to set the initial state instantly ---
    // This ensures the same logic for setting currentIndex, targetRotation,
    // and applying visuals is used on load as for a click, but without animation.
    // Calling it here, after itemMeshes is populated, should ensure the meshes are ready.
    // this.selectItem(savedIndex, false); // Select the restored/default item instantly
    console.log(`[createItems] selectItem(${savedIndex}, false) called on load.`); // Debug log

    // No manual state setting or retry logic needed here anymore.
  }
}

/**
 * Sets up event listeners for user interactions with the 3D carousel.
 * 
 * This method attaches event handlers for:
 * - Mouse clicks: Uses raycasting to detect clicks on 3D objects and select the corresponding item
 * - Wheel events: Delegates to the handleWheel method for scroll navigation
 * - Custom 'mainmenu-scroll' events: Navigates to next/previous items based on scroll direction
 * 
 * The method includes a safeguard for server-side rendering environments where 'window' is undefined.
 * When an object is clicked, the selected item index is stored in userData for potential external use.
 * 
 * @returns {void}
 */
setupEventListeners() {
  if (typeof window === 'undefined') return;

  const handleClick = (event) => {
    if (!this.parent?.userData?.camera) return;
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, this.parent.userData.camera);
    const intersects = this.raycaster.intersectObjects(this.clickableObjects, false);

    if (intersects.length > 0) {
      const hitObject = intersects[0].object;
      const hitData = hitObject.userData;
      if (hitData && typeof hitData.index === 'number') {
        console.log(`[handleClick] Clicked item index: ${hitData.index}`); // Debug log
        this.selectItem(hitData.index, true); // Pass true to animate
        this.userData.intendedClickIndex = hitData.index; // Store for potential external use
      }
    }
  };

  window.addEventListener('click', handleClick);
  window.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
  window.addEventListener('mainmenu-scroll', (e) => {
    const delta = e.detail.delta;
    if (delta > 0) {
      this.goToNext();
    } else {
      this.goToPrev();
    }
  });
}

/**
 * Selects an item in the 3D carousel and rotates the carousel to display it at the front.
 * 
 * This method:
 * - Updates the current index and persists it to localStorage
 * - Applies visual highlighting (glow) to the selected item
 * - Scales up the selected item and scales down others
 * - Rotates the carousel to position the selected item at the front
 * - Handles both animated transitions (using GSAP) and immediate state changes
 * 
 * The method handles proper cleanup of existing animations and ensures consistent
 * visual state even during rapid selection changes.
 * 
 * @param {number} index - The index of the item to select (zero-based)
 * @param {boolean} [animate=true] - Whether to animate the transition or apply changes immediately
 * @returns {void}
 * 
 * @example
 * // Select the second item with animation
 * carousel.selectItem(1);
 * 
 * // Select the third item without animation
 * carousel.selectItem(2, false);
 */
// selectItem(index, animate = true) {
//   if (index < 0 || index >= this.itemMeshes.length) return;

//   const gsapAvailable = typeof gsap !== 'undefined' && gsap !== null;

//   // Always kill existing GSAP animations when selectItem is called
//   // This prevents new selections from interfering with ongoing GSAP animations.
//   // It does NOT stop the update loop's smooth interpolation for scrolling.
//   if (gsapAvailable) {
//     gsap.killTweensOf(this.itemGroup.rotation);
//     this.itemMeshes.forEach(mesh => gsap.killTweensOf(mesh.scale));
//     console.log(`[selectItem] Killed existing GSAP tweens.`); // Debug log
//   }

//   this.lastInteractionType = 'click'; // Mark interaction as click
//   this.currentIndex = index; // Update the current index immediately

//   if (typeof localStorage !== 'undefined') {
//     localStorage.setItem('carouselIndex', index.toString());
//   }

//   // Apply highlight and scale visuals (animated or instant based on 'animate')
//   this.itemMeshes.forEach((mesh, meshIndex) => {
//     const isSelected = (meshIndex === index);
//     mesh.userData.isSelected = isSelected; // Ensure userData flag is synced

//     if (isSelected) {
//       // Apply highlight appearance (glow)
//       if (!(mesh.material instanceof THREE.ShaderMaterial)) {
//         const glowMaterial = getGlowShaderMaterial();
//         glowMaterial.uniforms.glowColor.value = new THREE.Color(this.config.glowColor);
//         mesh.material = glowMaterial;
//       } else {
//         // If it already has glow material, just update the color uniform
//         mesh.material.uniforms.glowColor.value = new THREE.Color(this.config.glowColor);
//       }

//       const targetScale = new THREE.Vector3().copy(mesh.userData.originalScale).multiplyScalar(1.2);

//       if (animate && gsapAvailable) {
//         // Animate scale up
//         gsap.to(mesh.scale, {
//           x: targetScale.x,
//           y: targetScale.y,
//           z: targetScale.z,
//           duration: 0.3
//         });
//       } else {
//         // Set scale instantly
//         mesh.scale.copy(targetScale);
//       }

//     } else {
//       // Remove highlight (revert to standard material)
//       // Check if the current material is the glow shader before replacing
//       if (mesh.material instanceof THREE.ShaderMaterial) {
//         mesh.material = new THREE.MeshStandardMaterial({
//           color: this.config.textColor,
//           transparent: true,
//           opacity: this.config.opacity
//         });
//       }


//       if (animate && gsapAvailable) {
//         // Animate scale back to original
//         gsap.to(mesh.scale, {
//           x: mesh.userData.originalScale.x,
//           y: mesh.userData.originalScale.y,
//           z: mesh.userData.originalScale.z,
//           duration: 0.3
//         });
//       } else {
//         // Set scale instantly
//         mesh.scale.copy(mesh.userData.originalScale);
//       }
//     }
//   });

//   const selectedMesh = this.itemMeshes[index]; // Get the mesh for the selected item
//   if (!selectedMesh) return; // Safety check

//   // Calculate the target rotation for the carousel group
//   const angleStep = (2 * Math.PI) / this.items.length;
//   // Target rotation to bring the selected item to the front (0 radians relative to the group)
//   this.targetRotation = -index * angleStep;

//   if (animate && gsapAvailable) {
//     // Animate the carousel group rotation using GSAP
//     this.isAnimating = true; // Set animating flag for click animation
//     console.log(`[selectItem] Starting GSAP rotation animation to ${this.targetRotation.toFixed(2)}`); // Debug log
//     let rotationComplete = false; // Flag to prevent onComplete from running multiple times
//     gsap.to(this.itemGroup.rotation, {
//       y: this.targetRotation,
//       duration: 0.8, // Duration of the rotation animation
//       ease: "power2.out", // Easing function for smooth deceleration
//       onComplete: () => {
//         if (!rotationComplete) {
//           // Ensure final rotation is exact by snapping to the closest equivalent angle
//           // This prevents floating point issues after animation
//           const twoPi = Math.PI * 2;
//           let current = this.itemGroup.rotation.y;
//           let target = this.targetRotation;
//           // Normalize both to handle multiple rotations
//           let normalizedTarget = ((target % twoPi) + twoPi) % twoPi;
//           let normalizedCurrent = ((current % twoPi) + twoPi) % twoPi;
//           let diff = normalizedTarget - normalizedCurrent;
//           if (diff > Math.PI) diff -= twoPi;
//           if (diff < -Math.PI) diff += twoPi;
//           this.itemGroup.rotation.y = current + diff;


//           // --- Ensure Correct Highlight AFTER Animation ---
//           // Forcefully re-apply highlight visuals to the intended currentIndex
//           // This overrides any potential mismatch from geometric calculations immediately after.
//           this.applyHighlightVisuals(this.currentIndex); // <-- Add this call

//           this.isAnimating = false; // Reset animating flag after rotation completes
//           rotationComplete = true;
//           console.log(`[selectItem] GSAP Animation complete. Final rotation: ${this.itemGroup.rotation.y.toFixed(2)}, currentIndex: ${this.currentIndex}`); // Debug log
//         }
//       }
//     });
//   } else {
//     // Set rotation instantly
//     this.itemGroup.rotation.y = this.targetRotation;
//     this.isAnimating = false; // Not animating with GSAP
//     // Apply highlight visuals instantly
//     this.applyHighlightVisuals(this.currentIndex); // Apply visuals based on the current index
//     console.log(`[selectItem] Instant state set for index: ${index}. rotation: ${this.itemGroup.rotation.y.toFixed(2)}, currentIndex: ${this.currentIndex}`); // Debug log
//   }
//   console.log(`[selectItem] Called for index: ${index}, Animate: ${animate}, Target Rotation: ${this.targetRotation.toFixed(2)}`); // Debug log

// }

selectItem(index, animate = true) {
  if (index < 0 || index >= this.itemMeshes.length) return;

  const angleStep = (2 * Math.PI) / this.itemMeshes.length;
  const currentRotation = this.itemGroup.rotation.y;
  const targetAngle = -index * angleStep;

  // Shortest angular distance (modulo 2π)
  const twoPi = Math.PI * 2;
  let current = ((currentRotation % twoPi) + twoPi) % twoPi;
  let target = ((targetAngle % twoPi) + twoPi) % twoPi;
  let delta = target - current;

  if (delta > Math.PI) delta -= twoPi;
  if (delta < -Math.PI) delta += twoPi;

  const newRotation = currentRotation + delta;
  this.targetRotation = newRotation;
  this.currentIndex = index;

  // Persist selection
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('carouselIndex', index.toString());
  }

  // Highlight visuals
  this.itemMeshes.forEach((mesh, i) => {
    const isSelected = (i === index);
    mesh.userData.isSelected = isSelected;

    if (isSelected) {
      if (!(mesh.material instanceof THREE.ShaderMaterial)) {
        const glowMaterial = getGlowShaderMaterial();
        glowMaterial.uniforms.glowColor.value = new THREE.Color(this.config.glowColor);
        mesh.material = glowMaterial;
      } else {
        mesh.material.uniforms.glowColor.value = new THREE.Color(this.config.glowColor);
      }

      const targetScale = mesh.userData.originalScale.clone().multiplyScalar(1.2);
      if (animate) {
        gsap.to(mesh.scale, { x: targetScale.x, y: targetScale.y, z: targetScale.z, duration: 0.3 });
      } else {
        mesh.scale.copy(targetScale);
      }
    } else {
      if (mesh.material instanceof THREE.ShaderMaterial) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: this.config.textColor,
          transparent: true,
          opacity: this.config.opacity
        });
      }
      if (animate) {
        gsap.to(mesh.scale, {
          x: mesh.userData.originalScale.x,
          y: mesh.userData.originalScale.y,
          z: mesh.userData.originalScale.z,
          duration: 0.3
        });
      } else {
        mesh.scale.copy(mesh.userData.originalScale);
      }
    }
  });

  if (animate) {
    this.isAnimating = true;
    gsap.to(this.itemGroup.rotation, {
      y: newRotation,
      duration: 0.6,
      ease: "power2.out",
      onComplete: () => {
        this.isAnimating = false;
        this.applyHighlightVisuals(this.currentIndex);
      }
    });
  } else {
    this.itemGroup.rotation.y = newRotation;
    this.applyHighlightVisuals(this.currentIndex);
  }
}





/**
 * Applies visual highlight effects to a specific item in the 3D carousel.
 * 
 * This method manages the visual state of carousel items by:
 * - Applying a glow shader material to the highlighted item
 * - Scaling up the highlighted item by 20%
 * - Removing highlight effects from previously selected items
 * - Restoring standard materials and original scale to non-highlighted items
 * 
 * @param {number} indexToHighlight - The index of the item to highlight.
 * @returns {void} - No return value.
 * 
 * @see getGlowShaderMaterial - Used for applying the glow effect
 */
applyHighlightVisuals(indexToHighlight) {
  if (indexToHighlight < 0 || indexToHighlight >= this.itemMeshes.length) return;

  this.itemMeshes.forEach((mesh, index) => {
    const shouldBeSelected = (index === indexToHighlight);
    const currentlySelected = mesh.userData.isSelected;

    if (shouldBeSelected && !currentlySelected) {
      // Apply highlight
      mesh.userData.isSelected = true;
      // Only apply glow material if it's not already the glow shader
      if (!(mesh.material instanceof THREE.ShaderMaterial)) {
        const glowMaterial = getGlowShaderMaterial();
        glowMaterial.uniforms.glowColor.value = new THREE.Color(this.config.glowColor);
        mesh.material = glowMaterial;
      } else {
        // If it already has glow, ensure color is correct
        mesh.material.uniforms.glowColor.value = new THREE.Color(this.config.glowColor);
      }

      // Set scale directly (animation is handled in selectItem if needed)
      mesh.scale.set(
        mesh.userData.originalScale.x * 1.2,
        mesh.userData.originalScale.y * 1.2,
        mesh.userData.originalScale.z * 1.2
      );

    } else if (!shouldBeSelected && currentlySelected) {
      // Remove highlight
      mesh.userData.isSelected = false;
      // Only revert to standard material if it's currently the glow shader
      if (mesh.material instanceof THREE.ShaderMaterial) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: this.config.textColor,
          transparent: true,
          opacity: this.config.opacity
        });
      }

      // Use GSAP for smooth scale *if* called from an animated context, otherwise set directly?
      // For simplicity after snap, let's set directly.
      mesh.scale.copy(mesh.userData.originalScale);
    }
    // If state matches (should be selected and is, or shouldn't be and isn't), do nothing.
  });
  console.log(`[applyHighlightVisuals] Applied highlight to index: ${indexToHighlight}. currentIndex: ${this.currentIndex}`); // Debug log
}

/**
 * Handles wheel (scroll) events on the 3D carousel.
 * 
 * This method interprets mouse wheel scrolling to rotate the carousel. It prevents
 * the default browser scroll behavior and calculates the appropriate rotation
 * based on scroll direction and carousel item count.
 * 
 * Key behaviors:
 * - Blocks wheel input during ongoing animations (when isAnimating is true)
 * - Tracks the interaction type as 'scroll'
 * - Calculates rotation based on the number of items in the carousel
 * - Updates targetRotation for smooth transition (actual rotation happens in update loop)
 * - Does not directly select items (updateCurrentItemFromRotation handles this separately)
 * 
 * @param {WheelEvent} event - The wheel event object containing scroll information
 * @returns {void}
 */
handleWheel(event) {
  event.preventDefault(); // Prevent default browser scroll behavior

  // Block wheel input if a click-based selection animation is in progress
  if (this.isAnimating) {
    console.log('[handleWheel] Wheel input blocked: isAnimating is true.'); // Debug log
    return; // Prevent wheel input if currently animating via selectItem
  }


  this.lastInteractionType = 'scroll'; // <<< Mark interaction as scroll by setting the flag

  // Determine scroll direction: +1 for down/forward, -1 for up/backward
  const scrollAmount = event.deltaY > 0 ? 1 : -1;
  // Calculate the angle corresponding to one item step
  const angleStep = (2 * Math.PI) / this.items.length;
  // Calculate the change in rotation angle for this scroll tick
  const rotationDelta = scrollAmount * angleStep;

  // --- Update Target Rotation for Smooth Scroll ---
  // Add the rotationDelta to the targetRotation.
  // The update loop will smoothly move the current rotation towards this new target.
  this.targetRotation -= rotationDelta; // Keep this sign as it seems to match desired direction


  console.log(`[handleWheel] New targetRotation: ${this.targetRotation.toFixed(2)}`); // Debug log

  // Note: We DO NOT call goToNext/goToPrev or selectItem here during wheel input.
  // The update() loop handles the smooth rotation towards targetRotation,
  // and updateCurrentItemFromRotation() handles the highlighting based on the current visual rotation.
}

/**
 * Updates the carousel's position, animation, and visual state for each render frame.
 * 
 * This method handles:
 * - Smooth rotation interpolation for wheel-scroll interactions
 * - Snapping to target positions when rotation is nearly complete
 * - Management of visual highlights for the current item
 * - Tracking of interaction states (scroll, click, idle)
 * - Updating shader animations for the selected/highlighted item
 * 
 * The method respects the current animation state, preventing conflicts between
 * wheel-scroll rotations and GSAP-controlled click animations. It also ensures
 * proper synchronization between the visual carousel position and the internal
 * currentIndex state.
 */
// update() {
//   // Only apply wheel-scroll rotation smoothing if not currently animating via selectItem (click)
//   if (!this.isAnimating) { // Check the GSAP animation flag
//     const currentRotation = this.itemGroup.rotation.y;
//     const twoPi = Math.PI * 2;

//     // --- Calculate Shortest Rotation Path ---
//     let diff = this.targetRotation - currentRotation;
//     // Normalize the difference to the range [-PI, PI]
//     diff = (diff + Math.PI) % twoPi - Math.PI;
//     if (diff <= -Math.PI) diff += twoPi;

//     // --- Smooth Rotation vs. Snap ---
//     const threshold = 0.005; // Slightly increased threshold for snapping to allow more smooth movement


//     if (Math.abs(diff) > threshold) {
//       // --- Apply Smooth Rotation (for scrolling) ---
//       const rotationAmount = diff * this.rotationSpeed; // Interpolation step
//       this.itemGroup.rotation.y += rotationAmount;
//       this.isSpinning = true; // Indicate smooth spinning is active

//       // --- Update Highlight During Smooth Scroll ---
//       // Continuously update highlight based on current visual rotation during smooth scroll
//       this.updateCurrentItemFromRotation(); // Call updateCurrentItemFromRotation here

//     } else if (this.isSpinning || Math.abs(diff) > 0) { // Snap if currently spinning OR very close but not exact
//       // --- Snap to Target ---
//       this.itemGroup.rotation.y = this.targetRotation;
//       this.isSpinning = false; // Spinning has stopped
//       console.log(`[Update] Snap to target. Final rotation: ${this.itemGroup.rotation.y.toFixed(2)}`); // Debug log


//       // --- Sync currentIndex and Visuals After Snap ---
//       // After snapping, calculate the final index based on the rotation
//       const finalIndex = this.calculateIndexFromRotation(this.itemGroup.rotation.y);
//       if (finalIndex !== undefined && finalIndex !== this.currentIndex) {
//         // Update the official index ONLY when scroll stops visually at a new item
//         this.currentIndex = finalIndex;
//         console.log(`[Update] Synced currentIndex to: ${this.currentIndex} after snap.`); // Debug log
//         // Ensure visuals match the new official index
//         this.applyHighlightVisuals(this.currentIndex);
//       } else if (finalIndex !== undefined) {
//         // Even if index didn't change, ensure visuals are correct
//         this.applyHighlightVisuals(finalIndex);
//         console.log(`[Update] Snap settled. Visuals confirmed for currentIndex: ${this.currentIndex}`); // Debug log
//       }

//       // Reset interaction type after scroll has fully settled and snapped
//       if (this.lastInteractionType === 'scroll') {
//         this.lastInteractionType = 'idle';
//         console.log(`[Update] Scroll settled. Interaction type reset.`); // Debug log
//       }
//     } else {
//       // If truly idle (no diff and current == target)
//       this.isSpinning = false; // Ensure isSpinning is false when truly idle
//       this.lastInteractionType = 'idle'; // Ensure idle state is set
//     }
//   } else {
//     // If isAnimating is true (click animation in progress via GSAP)
//     this.isSpinning = false; // Not smoothly spinning if a click animation is running

//     // Reset interaction type once click animation finishes (isAnimating becomes false in selectItem's onComplete)
//     // This condition will be true *one* frame after isAnimating is set to false by GSAP
//     if (!this.isAnimating && this.lastInteractionType === 'click') {
//       this.lastInteractionType = 'idle';
//       console.log(`[Update] Click animation finished. Interaction type reset.`); // Debug log
//     }
//   }

//   // --- Update Glow Shader Time ---
//   // Check if the current index is valid and the mesh exists
//   if (this.currentIndex >= 0 && this.currentIndex < this.itemMeshes.length) {
//     const selectedMesh = this.itemMeshes[this.currentIndex];
//     // Check if the mesh exists, is marked as selected, and has the necessary shader uniforms
//     if (selectedMesh?.userData?.isSelected && selectedMesh?.material?.uniforms?.time) { // Add checks for existence
//       // Update the time uniform for the glow animation effect
//       selectedMesh.material.uniforms.time.value = performance.now() * 0.001;
//     }
//     // Added checks for state mismatch and attempt to correct
//     else if (selectedMesh && !selectedMesh.userData?.isSelected) {
//       // If the mesh exists but is somehow not marked as selected despite being at currentIndex.
//       if (selectedMesh.material instanceof THREE.ShaderMaterial) { // Check if it currently has the glow material
//         console.warn(`[Update] Item at currentIndex ${this.currentIndex} unexpectedly has glow material but is not selected. Correcting visuals.`);
//         this.applyHighlightVisuals(this.currentIndex); // Force re-application of visuals for the current index
//       }
//     }
//   }
// } // End of update() method

update() {
  if (!this.isAnimating) {
    const current = this.itemGroup.rotation.y;
    const diff = this.targetRotation - current;
    const twoPi = Math.PI * 2;

    // Normalize to shortest path
    let shortest = (diff + Math.PI) % twoPi - Math.PI;
    if (shortest < -Math.PI) shortest += twoPi;

    const threshold = 0.005;

    if (Math.abs(shortest) > threshold) {
      this.itemGroup.rotation.y += shortest * this.rotationSpeed;
      this.isSpinning = true;
      this.updateCurrentItemFromRotation();
    } else if (this.isSpinning) {
      this.itemGroup.rotation.y = this.targetRotation;
      this.isSpinning = false;

      const finalIndex = this.calculateIndexFromRotation(this.itemGroup.rotation.y);
      if (finalIndex !== this.currentIndex) {
        this.currentIndex = finalIndex;
        this.applyHighlightVisuals(finalIndex);
      }
    }
  }

  // Maintain shader glow if applicable
  const currentMesh = this.itemMeshes[this.currentIndex];
  if (currentMesh?.material?.uniforms?.time) {
    currentMesh.material.uniforms.time.value = performance.now() * 0.001;
  }
}

/**
 * Updates the highlighted item based on the current visual rotation of the carousel group.
 * This is primarily used during smooth scrolling to make the highlight follow the movement.
 * It should NOT permanently change `this.currentIndex` during scroll, only the visual highlight.
 * The official `this.currentIndex` is updated only when the scroll snaps to a final position.
 */
updateCurrentItemFromRotation() {
  // Only proceed if the carousel is actively spinning due to scroll and not animating via click
  if (!this.isSpinning || this.isAnimating) {
    return;
  }

  const currentRotation = this.itemGroup.rotation.y;
  const visuallyClosestIndex = this.calculateIndexFromRotation(currentRotation);

  if (visuallyClosestIndex !== undefined) {
    // Apply visual highlight to the item that appears closest to the front *during* the scroll
    this.itemMeshes.forEach((mesh, index) => {
      const shouldBeHighlighted = (index === visuallyClosestIndex);
      const isCurrentlyHighlighted = mesh.userData.isSelected; // Check the current visual state

      if (shouldBeHighlighted && !isCurrentlyHighlighted) {
        // Apply highlight visuals (glow, scale)
        mesh.userData.isSelected = true; // Mark as visually selected for this frame
        if (!(mesh.material instanceof THREE.ShaderMaterial)) {
          const glowMaterial = getGlowShaderMaterial();
          glowMaterial.uniforms.glowColor.value = new THREE.Color(this.config.glowColor);
          mesh.material = glowMaterial;
        } else {
          mesh.material.uniforms.glowColor.value = new THREE.Color(this.config.glowColor);
        }
        // Apply scale instantly during scroll tracking
        mesh.scale.set(
          mesh.userData.originalScale.x * 1.2,
          mesh.userData.originalScale.y * 1.2,
          mesh.userData.originalScale.z * 1.2
        );
      } else if (!shouldBeHighlighted && isCurrentlyHighlighted) {
        // Remove highlight visuals
        mesh.userData.isSelected = false; // Mark as visually deselected for this frame
        if (mesh.material instanceof THREE.ShaderMaterial) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: this.config.textColor,
            transparent: true,
            opacity: this.config.opacity
          });
        }
        // Revert scale instantly
        mesh.scale.copy(mesh.userData.originalScale);
      }
    });
    // console.log(`[updateCurrentItemFromRotation] Visually highlighted index: ${visuallyClosestIndex} (Current official index: ${this.currentIndex})`); // Debug log (can be noisy)
  }
}

/**
 * Calculates the index of the item that should be considered "in front" based on the current rotation.
 * 
 * @param {number} rotation - The current rotation value in radians
 * @returns {number|undefined} The index of the item that is closest to the front position, or undefined if no items exist
 * 
 * @description
 * This method calculates which item in the carousel should be considered the front-facing item
 * based on the current rotation. It works by:
 * 1. Calculating the angular step between items based on the total number of items
 * 2. Normalizing the current rotation to a value between 0 and 2π
 * 3. Finding the item with the smallest angular difference to the front position
 * 
 * The method handles wrapping around the circle to ensure the shortest distance is always used.
 */
calculateIndexFromRotation(rotation/**, axis = 'y'*/) {
  if (!this.itemMeshes.length) return undefined;
  const angleStep = (2 * Math.PI) / this.items.length;
  const twoPi = Math.PI * 2;
  const currentRotation = rotation; // Use the provided rotation value
  const frontAngleInGroupSpace = ((-currentRotation % twoPi) + twoPi) % twoPi;
  let closestIndex = 0;
  let minAngleDiff = twoPi;

  this.itemMeshes.forEach((mesh, index) => {
    const itemNaturalAngle = (index * angleStep);
    let angleDiff = frontAngleInGroupSpace - itemNaturalAngle;
    angleDiff = (angleDiff + Math.PI) % twoPi - Math.PI;
    if (angleDiff <= -Math.PI) angleDiff += twoPi;
    const absAngleDiff = Math.abs(angleDiff);
    if (absAngleDiff < minAngleDiff) {
      minAngleDiff = absAngleDiff;
      closestIndex = index;
    }
  });
  return closestIndex;
}

/**
 * Updates the target rotation angle based on continuous input.
 * 
 * This method is specifically designed for handling continuous input like mouse wheel events.
 * It updates the targetRotation property without starting any GSAP animations.
 * The actual smooth rotation toward the target is handled by the update loop.
 * 
 * @param {number} deltaAngle - The angle in radians/degrees to add to the current target rotation
 */
spin(deltaAngle) {
  // Spin is now exclusively for updating targetRotation based on continuous input (like wheel).
  // It should NOT check isAnimating or start GSAP tweens.
  // isAnimating is only for the click-to-select GSAP animation.
  this.targetRotation += deltaAngle;
  this.lastInteractionType = 'scroll'; // Indicate scroll interaction
  console.log(`[spin] New targetRotation: ${this.targetRotation.toFixed(2)}`); // Debug log
  // The 'update' loop will handle the smooth rotation towards this target
}

/**
 * Advances the carousel to the next item.
 * 
 * Calculates the next index and delegates the animation to selectItem.
 * Automatically wraps to the first item when reaching the end of the carousel.
 * Includes a guard to prevent multiple animations from running simultaneously.
 * 
 * @returns {void}
 */
goToNext() {
  // goToNext now simply calculates the next index and calls selectItem to animate
  if (this.isAnimating) return; // Prevent if a click animation is running

  const nextIndex = (this.currentIndex + 1) % this.items.length;
  this.selectItem(nextIndex, true); // Delegate animation to selectItem
  console.log(`[goToNext] Selected index: ${nextIndex}, calling selectItem(..., true)`); // Debug log
}

/**
 * Navigates the carousel to the previous item.
 * 
 * This method calculates the previous index and delegates the animation
 * to the selectItem method. It implements circular navigation by wrapping
 * from the first item to the last.
 * 
 * @returns {void} This method does not return a value
 * @throws {never} This method does not throw exceptions
 */
goToPrev() {
  // goToPrev now simply calculates the previous index and calls selectItem to animate
  if (this.isAnimating) return; // Prevent if a click animation is running

  const prevIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
  this.selectItem(prevIndex, true); // Delegate animation to selectItem
  console.log(`[goToPrev] Selected index: ${prevIndex}, calling selectItem(..., true)`); // Debug log
}

/**
 * Returns the currently active item in the carousel.
 * @returns {*} The item at the current index position.
 */
getCurrentItem() {
  return this.items[this.currentIndex];
}

/**
 * Updates the carousel dimensions and layout in response to viewport size changes.
 * This method should be called when the window is resized to ensure the carousel
 * maintains proper appearance across different screen sizes.
 * @method
 * @memberof Carousel3DPro
 */
resize() {
  // Update for responsive layout 
}
}