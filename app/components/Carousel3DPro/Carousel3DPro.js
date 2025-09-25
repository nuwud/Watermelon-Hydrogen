/**
 * Carousel3DPro – Interactive 3D text carousel with optional (flagged) physics motion.
 * Rebuilt after corruption; keeps selection + guard invariants intact.
 */
import * as THREE from 'three';
import {Group} from 'three';
import {TextGeometry} from 'three/examples/jsm/geometries/TextGeometry.js';
import {FontLoader} from 'three/examples/jsm/loaders/FontLoader.js';
import gsap from 'gsap';
import {defaultCarouselStyle, carouselConfig} from './CarouselStyleConfig.js';
import {getGlowShaderMaterial} from './CarouselShaderFX.js';
import {SelectionGuard, withSelectionLock} from './modules/selectionGuards.js';

export class Carousel3DPro extends Group {
  constructor(items = [], config = {}) {
    super();
    this.items = items;
    this.config = {...defaultCarouselStyle, ...config};
    this.itemMeshes = [];
    this.currentIndex = 0;
    this.targetRotation = 0;
    this.rotationSpeed = 0.05;
    this.cylinderRadius = this.config.cylinderRadius || 5;
    this.isSpinning = false;
    this.guard = new SelectionGuard();
    Object.defineProperty(this, 'isAnimating', {get: () => this.guard.isAnimating, set: (v) => {this.guard.isAnimating = v;}});
    this.itemGroup = new THREE.Group();
    this.add(this.itemGroup);
    this.carouselCenter = new THREE.Object3D();
    this.carouselCenter.name = 'carouselCenter';
    this.add(this.carouselCenter);
    this.userData.carouselCenter = this.carouselCenter;
    this.font = null;
    this.lastInteractionType = 'idle';
    // Physics (flagged)
    this._angle = 0; this._velocity = 0; this._angleTarget = 0; this._hasBootstrappedHome = false;
    this.loadFont().then(()=>{this.createItems(); const step=(2*Math.PI)/Math.max(1,this.items.length); this.targetRotation = -this.currentIndex*step;});
    this.raycaster = new THREE.Raycaster();
    this.setupEventListeners();
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
      if (!this.font || !this.items.length) return;
      const angleStep = (2 * Math.PI) / this.items.length;
      const prepared = this.items.map(raw => {
        const originalLabel = raw.toString();
        const displayLabel = this.formatStackedLabel(originalLabel);
        const geometry = new TextGeometry(displayLabel, {font: this.font, size: 0.5, height: 0.1, depth: 0.1, curveSegments: 12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelOffset: 0, bevelSegments: 5});
        geometry.computeBoundingBox(); geometry.center();
        const w = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
        const h = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
        return {originalLabel, displayLabel, geometry, w, h};
      });
      const avgW = prepared.reduce((s,p)=>s+p.w,0)/Math.max(1,prepared.length);
      const targetW = Math.min(2.2, Math.max(1.6, avgW));
      prepared.forEach((p,index)=>{
        const mat = new THREE.MeshStandardMaterial({color: this.config.textColor, transparent: true, opacity: this.config.opacity});
        const mesh = new THREE.Mesh(p.geometry, mat);
        mesh.name = p.originalLabel; mesh.userData.originalLabel = p.originalLabel; mesh.userData.displayLabel = p.displayLabel;
        const scaleFactor = THREE.MathUtils.clamp(targetW/Math.max(0.001,p.w),0.75,1.15); mesh.scale.setScalar(scaleFactor);
        const angle = angleStep*index; mesh.position.x = this.cylinderRadius*Math.sin(angle); mesh.position.z = this.cylinderRadius*Math.cos(angle); mesh.rotation.y = Math.atan2(mesh.position.x, mesh.position.z);
        mesh.userData.originalScale = mesh.scale.clone(); mesh.userData.originalColor = mat.color.clone();
        const hitGeo = new THREE.BoxGeometry(p.w*scaleFactor*1.5, p.h*scaleFactor*2, 0.5);
        const hitMat = new THREE.MeshBasicMaterial({color:0x00ff00, transparent:true, opacity:0.01});
        const hit = new THREE.Mesh(hitGeo, hitMat); hit.position.copy(mesh.position); hit.rotation.copy(mesh.rotation); hit.userData = {index, mesh}; mesh.userData.hitArea = hit;
        this.itemGroup.add(hit); this.itemMeshes.push(mesh); this.itemGroup.add(mesh);
      });
      this.clickableObjects = this.itemMeshes.map(m=>m.userData.hitArea).filter(Boolean);
      let savedIndex = 0;
      if (typeof localStorage !== 'undefined') { const s = localStorage.getItem('carouselIndex'); if (s!==null) { const v=parseInt(s,10); if(!Number.isNaN(v)&&v>=0&&v<this.itemMeshes.length) savedIndex=v; }}
      setTimeout(()=>{ if(!this.isAnimating && savedIndex>=0 && savedIndex < this.itemMeshes.length) this.selectItem(savedIndex, true); },300);
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

    // Highlight visuals logic remains the same
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

    if (carouselConfig.startup.enableNewMotion) {
      // Flagged physics path: set target angle and seed velocity for smooth easing
      const angleStep = (2 * Math.PI) / this.itemMeshes.length;
      this._angleTarget = -index * angleStep;
      // Small impulse toward target so spring engages even if starting at rest
      const delta = this._angleTarget - this._angle;
      this._velocity += 0.02 * Math.sign(delta || 1);
      // Immediate highlight logic handled below (we still respect animate for visual scale tweens)
    }

    if (animate && !carouselConfig.startup.enableNewMotion) {
      gsap.to(this.itemGroup.rotation, {
        y: newRotation,
        duration: 0.6,
        ease: "power2.out",
        onComplete: () => {
          this.applyHighlightVisuals(this.currentIndex);
        }
      });
    } else if (!carouselConfig.startup.enableNewMotion) {
      this.itemGroup.rotation.y = newRotation;
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
handleWheel(event){
  event.preventDefault();
  if(!this.guard.canScroll()) return;
  if (carouselConfig.startup.enableNewMotion) {
    const angleStep = (2*Math.PI)/this.items.length;
    const dir = event.deltaY>0?1:-1;
    this._angleTarget += -dir*angleStep;
    return;
  }
  this.lastInteractionType='scroll';
  const scrollAmount = event.deltaY>0?1:-1; const angleStep=(2*Math.PI)/this.items.length; this.targetRotation -= scrollAmount*angleStep;
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
update(){
  if (carouselConfig.startup.enableNewMotion){ this._updatePhysics(); return; }
  if (this.guard.canAnimate()) {
    const current = this.itemGroup.rotation.y; const diff = this.targetRotation - current; const twoPi = Math.PI*2;
    let shortest = (diff + Math.PI) % twoPi - Math.PI; if (shortest < -Math.PI) shortest += twoPi;
    const threshold = 0.005;
    if (Math.abs(shortest) > threshold){ this.itemGroup.rotation.y += shortest * this.rotationSpeed; this.isSpinning = true; if (this.guard.canUpdateHighlight()) this.updateCurrentItemFromRotation(); }
    else if (this.isSpinning){ this.itemGroup.rotation.y = this.targetRotation; this.isSpinning = false; if (this.guard.canUpdateHighlight()){ const finalIndex = this.calculateIndexFromRotation(this.itemGroup.rotation.y); if (finalIndex !== this.currentIndex){ this.currentIndex = finalIndex; this.applyHighlightVisuals(finalIndex); }}}
  }
  const currentMesh = this.itemMeshes[this.currentIndex]; if (currentMesh?.material?.uniforms?.time) currentMesh.material.uniforms.time.value = performance.now()*0.001;
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
resize() { /* responsive hook */ }
applyImpulse(sign){ if(!carouselConfig.startup.enableNewMotion) return; const {inputBoost}=carouselConfig.physics; this._velocity += inputBoost * sign; }
_updatePhysics(){ if(!this.itemMeshes.length) return; const {springK,damping,snapEpsilon}=carouselConfig.physics; const angleStep=(2*Math.PI)/this.itemMeshes.length; if(!this._hasBootstrappedHome){ this._hasBootstrappedHome=true; const label=carouselConfig.startup.startOnLabel; let idx=0; if(label){ const f=this.items.findIndex(it=>String(it).toLowerCase()===label.toLowerCase()); if(f>=0) idx=f; } this.currentIndex=idx; this._angle=-idx*angleStep; this._angleTarget=this._angle; this.itemGroup.rotation.y=this._angle; this.applyHighlightVisuals(idx);} const rawIndex=-this._angle/angleStep; const snappedIndex=Math.round(rawIndex); this._angleTarget=-snappedIndex*angleStep; let delta=this._angle - this._angleTarget; delta=(delta+Math.PI)%(Math.PI*2)-Math.PI; const dt=1/60; this._velocity += -springK*delta*dt; this._velocity*=damping; this._angle += this._velocity*dt; this.itemGroup.rotation.y=this._angle; if(Math.abs(this._velocity)<snapEpsilon && Math.abs(delta)<snapEpsilon){ this._angle=this._angleTarget; this._velocity=0; if(snappedIndex!==this.currentIndex){ this.currentIndex=((snappedIndex%this.items.length)+this.items.length)%this.items.length; this.applyHighlightVisuals(this.currentIndex); if(typeof localStorage!=='undefined') localStorage.setItem('carouselIndex', String(this.currentIndex)); }} const currentMesh=this.itemMeshes[this.currentIndex]; if(currentMesh?.material?.uniforms?.time) currentMesh.material.uniforms.time.value=performance.now()*0.001; }
}
export default Carousel3DPro;