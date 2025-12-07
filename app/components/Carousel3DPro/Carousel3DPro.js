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
import { defaultCarouselStyle, getMenuItemColor } from './CarouselStyleConfig.js';
import { SelectionGuard, withSelectionLock } from './modules/selectionGuards.js';


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
    this.isSpinning = false; // Flag for smooth scroll animation in update

    this.userData.ringLocked = false;
    this.submenuState = { open: false, parentIndex: null, selectedChildIndex: null };
    this.userData.submenuState = { ...this.submenuState };

    this.guard = new SelectionGuard();
    // For backward compatibility, keep the main isAnimating flag synced
    Object.defineProperty(this, 'isAnimating', {
      get: () => this.guard.isAnimating,
      set: (value) => { this.guard.isAnimating = value; }
    });

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

  lockRing() {
    this.guard.targetRotationLocked = true;
    this.userData.ringLocked = true;
  }

  unlockRing() {
    this.guard.targetRotationLocked = false;
    this.userData.ringLocked = false;
  }

  setSubmenuState(nextState = {}) {
    const merged = {
      open: typeof nextState.open === 'boolean' ? nextState.open : this.submenuState.open,
      parentIndex: nextState.parentIndex ?? this.submenuState.parentIndex,
      selectedChildIndex: nextState.selectedChildIndex ?? this.submenuState.selectedChildIndex,
    };
    this.submenuState = merged;
    this.userData.submenuState = { ...merged };
    
    // Update main menu dimming when submenu opens/closes
    this.updateHoverVisuals();
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('carousel-submenu-state', { detail: { ...merged } })
      );
    }
  }

  getSubmenuState() {
    return { ...this.submenuState };
  }

  /**
   * Formats a label for the main ring so multi-word titles stack across two lines.
   * Rule: split at the last space to keep punctuation like "/" with the first line.
   * Examples:
   *  - "About Us" -> "About\nUs"
   *  - "Cart / Account" -> "Cart /\nAccount"
   *  - Single-word remains unchanged
   */
  formatStackedLabel(label) {
  // Revert to single-line labels (no stacking)
  return typeof label === 'string' ? label : String(label ?? '');
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

    // 1) Precompute geometries and measure widths to balance visual sizes
    const prepared = this.items.map((item) => {
      const originalLabel = item.toString();
      const displayLabel = this.formatStackedLabel(originalLabel);
      const geometry = new TextGeometry(displayLabel, {
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
      const width = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
      const height = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
      return { originalLabel, displayLabel, geometry, width, height };
    });

    const avgWidth = prepared.reduce((sum, p) => sum + p.width, 0) / Math.max(1, prepared.length);
    // Choose a target width close to average, within sensible bounds for legibility
    const targetWidth = Math.min(2.2, Math.max(1.6, avgWidth));

    // 2) Create meshes with normalized widths and place them evenly by angle
    prepared.forEach((p, index) => {
      // Get status-coded color for this menu item
      const statusColor = this.config.useStatusColors 
        ? getMenuItemColor(p.originalLabel) 
        : { glow: this.config.glowColor, text: this.config.textColor };
      
      // Use MeshStandardMaterial with STRONG EMISSIVE for bright glowing text
      const material = new THREE.MeshStandardMaterial({
        color: 0xeeffff,           // Slightly cyan-tinted white for better visibility
        emissive: 0x88bbff,        // Brighter blue-white glow for better readability
        emissiveIntensity: 1.0,    // Strong emission for visibility in dark scene
        transparent: true,
        opacity: 1.0,
        metalness: 0.1,            // Reduced metalness for cleaner look
        roughness: 0.25            // Slightly smoother for better light reflection
      });

      const mesh = new THREE.Mesh(p.geometry, material);
      mesh.name = p.originalLabel;
      mesh.userData.originalLabel = p.originalLabel;
      mesh.userData.displayLabel = p.displayLabel;
      mesh.userData.statusColor = statusColor; // Store for later use

      // Normalize width slightly for a more balanced ring, but clamp scale to avoid extremes
      const scaleFactor = THREE.MathUtils.clamp(targetWidth / Math.max(0.001, p.width), 0.75, 1.15);
      mesh.scale.setScalar(scaleFactor);

      const angle = angleStep * index;
      mesh.position.x = this.cylinderRadius * Math.sin(angle);
      mesh.position.z = this.cylinderRadius * Math.cos(angle);
      mesh.rotation.y = Math.atan2(mesh.position.x, mesh.position.z);

      mesh.userData.originalScale = new THREE.Vector3().copy(mesh.scale);
      mesh.userData.originalColor = material.color.clone();

      const scaledWidth = p.width * scaleFactor;
      const scaledHeight = p.height * scaleFactor;
      const hitAreaWidth = scaledWidth * 1.5;
      const hitAreaHeight = scaledHeight * 2;
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

  // Track hovered item for rollover effects
  this.hoveredIndex = -1;

  const handleClick = (event) => {
    // Guard: Don't process until carousel is fully initialized
    if (!this.clickableObjects || this.clickableObjects.length === 0) return;
    
    const camera = this.userData?.camera || this.parent?.userData?.camera;
    if (!camera) return;
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, camera);
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

  // Handle mouse move for hover/rollover effects
  const handleMouseMove = (event) => {
    // Guard: Don't process until carousel is fully initialized
    if (!this.clickableObjects || this.clickableObjects.length === 0) return;
    
    // Camera can be in this.userData.camera OR this.parent.userData.camera
    const camera = this.userData?.camera || this.parent?.userData?.camera;
    if (!camera) return;
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, camera);
    const intersects = this.raycaster.intersectObjects(this.clickableObjects, false);

    let newHoveredIndex = -1;
    if (intersects.length > 0) {
      const hitObject = intersects[0].object;
      const hitData = hitObject.userData;
      if (hitData && typeof hitData.index === 'number') {
        newHoveredIndex = hitData.index;
      }
    }

    // Only update if hovered item changed
    if (newHoveredIndex !== this.hoveredIndex) {
      this.hoveredIndex = newHoveredIndex;
      this.updateHoverVisuals();
      
      // Dispatch hover event for skyball
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('carousel-item-hover', { 
          detail: { index: newHoveredIndex } 
        }));
      }
    }
  };

  window.addEventListener('click', handleClick);
  window.addEventListener('mousemove', handleMouseMove, { passive: true });
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
 * Updates visual hover effects on menu items.
 * Non-selected items get a bright glow when hovered.
 * Respects submenu state and distance dimming.
 */
updateHoverVisuals() {
  if (!this.itemMeshes) return;
  
  const submenuOpen = this.submenuState?.open || false;
  const dimConfig = this.config.submenuOpenDim || { enabled: true, mainMenuDimAmount: 0.5, selectedItemDimAmount: 0.6 };
  // Distance dimming: camera at z=10, carousel radius=5
  // Front item at z=5 (distance ~5), back item at z=-5 (distance ~15)
  const distanceConfig = this.config.distanceDimming || { enabled: true, nearDistance: 5, farDistance: 15, minBrightness: 0.4 };
  // Camera can be in this.userData.camera OR this.parent.userData.camera
  const camera = this.userData?.camera || this.parent?.userData?.camera;
  
  this.itemMeshes.forEach((mesh, index) => {
    const isSelected = mesh.userData.isSelected;
    const isHovered = index === this.hoveredIndex;
    
    // Calculate distance-based dimming - use Z position for more reliable depth perception
    let distanceFactor = 1.0;
    if (distanceConfig.enabled && camera) {
      const meshWorldPos = new THREE.Vector3();
      mesh.getWorldPosition(meshWorldPos);
      // Use actual distance from camera
      const distance = camera.position.distanceTo(meshWorldPos);
      
      const near = distanceConfig.nearDistance || 5;
      const far = distanceConfig.farDistance || 15;
      const minBrightness = distanceConfig.minBrightness || 0.4;
      
      // Clamp and interpolate
      const t = Math.max(0, Math.min(1, (distance - near) / (far - near)));
      distanceFactor = 1.0 - t * (1.0 - minBrightness);
    }
    
    // Calculate submenu dimming for main menu
    let submenuDimFactor = 1.0;
    if (submenuOpen && dimConfig.enabled) {
      submenuDimFactor = isSelected ? dimConfig.selectedItemDimAmount || 0.6 : dimConfig.mainMenuDimAmount || 0.5;
    }
    
    // Combined brightness factor
    const brightnessFactor = distanceFactor * submenuDimFactor;
    
    // Skip shader materials (selected items have glow shader)
    if (mesh.material instanceof THREE.ShaderMaterial) {
      // For selected items, adjust glow intensity based on dimming
      if (mesh.material.uniforms?.intensity) {
        mesh.material.uniforms.intensity.value = 2.0 * submenuDimFactor;
      }
      return;
    }
    
    if (isHovered && !submenuOpen) {
      // Hover effect - pronounced brightness boost and glow
      mesh.material.color.setHex(0xeeffff); // Slight cyan tint
      mesh.material.emissive = new THREE.Color(0x99ccff); // Brighter blue-white glow
      mesh.material.emissiveIntensity = 1.5; // Strong glow on hover
      mesh.material.opacity = 1.0;
      
      // Subtle scale up on hover
      const hoverScale = mesh.userData.originalScale.clone().multiplyScalar(this.config.hoverScale || 1.12);
      gsap.to(mesh.scale, { x: hoverScale.x, y: hoverScale.y, z: hoverScale.z, duration: 0.15 });
    } else {
      // Normal non-selected appearance with VISIBLE distance dimming
      mesh.material.color.setHex(0xeeffff); // Consistent cyan-tinted white
      mesh.material.emissive = new THREE.Color(0x6699cc); // Brighter base emissive
      // Apply distance factor directly to emissive - distant items are dimmer
      mesh.material.emissiveIntensity = 0.8 * distanceFactor * submenuDimFactor;
      // Also apply to opacity for more visible depth effect  
      mesh.material.opacity = Math.max(0.4, distanceFactor * submenuDimFactor); // Never fully invisible
      
      // Restore original scale
      gsap.to(mesh.scale, {
        x: mesh.userData.originalScale.x,
        y: mesh.userData.originalScale.y,
        z: mesh.userData.originalScale.z,
        duration: 0.15
      });
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
selectItem(index, animate = true) {
  if (index < 0 || index >= this.itemMeshes.length) return;

  // Use the withSelectionLock helper to ensure safe state transitions
  return withSelectionLock(this.guard, index, () => {
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

    // Highlight visuals with status-coded colors
    this.itemMeshes.forEach((mesh, i) => {
      const isSelected = (i === index);
      mesh.userData.isSelected = isSelected;
      
      // Get status-coded color for this menu item
      const itemLabel = mesh.userData.originalLabel || mesh.name;
      const statusColor = this.config.useStatusColors 
        ? getMenuItemColor(itemLabel) 
        : { glow: this.config.glowColor, text: this.config.textColor };

      if (isSelected) {
        if (!(mesh.material instanceof THREE.ShaderMaterial)) {
          const glowMaterial = getGlowShaderMaterial();
          glowMaterial.uniforms.glowColor.value = new THREE.Color(statusColor.glow);
          mesh.material = glowMaterial;
        } else {
          mesh.material.uniforms.glowColor.value = new THREE.Color(statusColor.glow);
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
            color: statusColor.text,
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
      // Animate using correct rotation axis based on layout mode
      const isFerrisWheel = this.userData?.isFerrisWheel;
      const rotationProp = isFerrisWheel ? 'x' : 'y';
      const rotationTarget = {};
      rotationTarget[rotationProp] = newRotation;
      
      gsap.to(this.itemGroup.rotation, {
        ...rotationTarget,
        duration: 0.6,
        ease: "power2.out",
        onComplete: () => {
          this.applyHighlightVisuals(this.currentIndex);
        }
      });
    } else {
      // Set rotation immediately using correct axis
      const isFerrisWheel = this.userData?.isFerrisWheel;
      if (isFerrisWheel) {
        this.itemGroup.rotation.x = newRotation;
      } else {
        this.itemGroup.rotation.y = newRotation;
      }
      this.applyHighlightVisuals(this.currentIndex);
    }
  }, { lockRotation: true });
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
    
    // Get status-coded color for this menu item
    const itemLabel = mesh.userData.originalLabel || mesh.name;
    const statusColor = this.config.useStatusColors 
      ? getMenuItemColor(itemLabel) 
      : { glow: this.config.glowColor, text: this.config.textColor };

    if (shouldBeSelected && !currentlySelected) {
      // Apply highlight with status-coded glow color
      mesh.userData.isSelected = true;
      if (!(mesh.material instanceof THREE.ShaderMaterial)) {
        const glowMaterial = getGlowShaderMaterial();
        glowMaterial.uniforms.glowColor.value = new THREE.Color(statusColor.glow);
        mesh.material = glowMaterial;
      } else {
        mesh.material.uniforms.glowColor.value = new THREE.Color(statusColor.glow);
      }

      // Set scale directly (animation is handled in selectItem if needed)
      mesh.scale.set(
        mesh.userData.originalScale.x * 1.2,
        mesh.userData.originalScale.y * 1.2,
        mesh.userData.originalScale.z * 1.2
      );

    } else if (!shouldBeSelected && currentlySelected) {
      // Remove highlight - use status-coded text color
      mesh.userData.isSelected = false;
      if (mesh.material instanceof THREE.ShaderMaterial) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: statusColor.text,
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

  // Use the guard to check if wheel input is allowed
  if (!this.guard.canScroll()) {
    console.log('[handleWheel] Wheel input blocked: animation or transition in progress.');
    return;
  }

  if (this.userData?.ringLocked) {
    console.log('[handleWheel] Wheel input blocked: ring locked while submenu open.');
    return;
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
update() {
  // Only handle smooth rotation if not in a locked state
  if (this.guard.canAnimate()) {
    // Determine rotation axis based on layout mode
    const isFerrisWheel = this.userData?.isFerrisWheel;
    const rotationProp = isFerrisWheel ? 'x' : 'y';
    const current = this.itemGroup.rotation[rotationProp];
    const diff = this.targetRotation - current;
    const twoPi = Math.PI * 2;

    // Normalize to shortest path
    let shortest = (diff + Math.PI) % twoPi - Math.PI;
    if (shortest < -Math.PI) shortest += twoPi;

    const threshold = 0.005;

    if (Math.abs(shortest) > threshold) {
      this.itemGroup.rotation[rotationProp] += shortest * this.rotationSpeed;
      this.isSpinning = true;
      
      // Only update highlighting if not locked
      if (this.guard.canUpdateHighlight()) {
        this.updateCurrentItemFromRotation();
      }
    } else if (this.isSpinning) {
      this.itemGroup.rotation[rotationProp] = this.targetRotation;
      this.isSpinning = false;

      // Only update the current index if not locked
      if (this.guard.canUpdateHighlight()) {
        const finalIndex = this.calculateIndexFromRotation(this.itemGroup.rotation[rotationProp]);
        if (finalIndex !== this.currentIndex) {
          this.currentIndex = finalIndex;
          this.applyHighlightVisuals(finalIndex);
        }
      }
    }
    
    // FERRIS WHEEL: Keep items facing camera (counter-rotate to stay level)
    if (isFerrisWheel && this.itemMeshes) {
      const groupRotation = this.itemGroup.rotation.x;
      this.itemMeshes.forEach((mesh) => {
        // Counter-rotate each item so it always faces the camera
        mesh.rotation.x = -groupRotation;
        mesh.rotation.y = 0;
        mesh.rotation.z = 0;
      });
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
  // Only proceed if the carousel is actively spinning due to scroll and the guard allows highlighting
  if (!this.isSpinning || !this.guard.canUpdateHighlight()) {
    return;
  }

  // Use correct rotation axis based on layout mode
  const isFerrisWheel = this.userData?.isFerrisWheel;
  const rotationProp = isFerrisWheel ? 'x' : 'y';
  const currentRotation = this.itemGroup.rotation[rotationProp];
  const visuallyClosestIndex = this.calculateIndexFromRotation(currentRotation);

  if (visuallyClosestIndex !== undefined) {
    // Apply visual highlight to the item that appears closest to the front *during* the scroll
    this.itemMeshes.forEach((mesh, index) => {
      const shouldBeHighlighted = (index === visuallyClosestIndex);
      const isCurrentlyHighlighted = mesh.userData.isSelected;
      
      // Get status-coded color for this menu item
      const itemLabel = mesh.userData.originalLabel || mesh.name;
      const statusColor = this.config.useStatusColors 
        ? getMenuItemColor(itemLabel) 
        : { glow: this.config.glowColor, text: this.config.textColor };

      if (shouldBeHighlighted && !isCurrentlyHighlighted) {
        // Apply highlight visuals with status-coded glow
        mesh.userData.isSelected = true;
        if (!(mesh.material instanceof THREE.ShaderMaterial)) {
          const glowMaterial = getGlowShaderMaterial();
          glowMaterial.uniforms.glowColor.value = new THREE.Color(statusColor.glow);
          mesh.material = glowMaterial;
        } else {
          mesh.material.uniforms.glowColor.value = new THREE.Color(statusColor.glow);
        }
        // Apply scale instantly during scroll tracking
        mesh.scale.set(
          mesh.userData.originalScale.x * 1.2,
          mesh.userData.originalScale.y * 1.2,
          mesh.userData.originalScale.z * 1.2
        );
      } else if (!shouldBeHighlighted && isCurrentlyHighlighted) {
        // Remove highlight visuals with status-coded text color
        mesh.userData.isSelected = false;
        if (mesh.material instanceof THREE.ShaderMaterial) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: statusColor.text,
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
  // Check if any animation is allowed
  if (!this.guard.canSelect()) return;

  const nextIndex = (this.currentIndex + 1) % this.items.length;
  this.selectItem(nextIndex, true);
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
  // Check if any animation is allowed
  if (!this.guard.canSelect()) return;

  const prevIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
  this.selectItem(prevIndex, true);
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