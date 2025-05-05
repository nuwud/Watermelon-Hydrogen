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
 *   textColor: 0x00ff00,
 *   glowColor: 0x00ffff,
 *   opacity: 0.8
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
 *   🛑 This causes the highlight hijack bug unless locked.
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
 *   it will override intended user interaction (visual hijack bug).
 */

import * as THREE from 'three'; // Import Three.js core library
import { Group } from 'three'; // Import Group class from Three.js
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'; // Import TextGeometry for creating 3D text meshes
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'; // Import FontLoader for loading font files
import { getGlowShaderMaterial } from './CarouselShaderFX.js'; // Import custom shader material for glow effects
import { defaultCarouselStyle } from './CarouselStyleConfig.js' // Import default configuration for carousel styles
// import { getHomeAngleRadians } from '@/utils/homePositionUtils';
//import { raycaster, camera, scene } from 'three';
//import { gsap } from 'gsap';
// Access GSAP from the global scope// Ensure GSAP is available in the browser context
const gsap = typeof window !== 'undefined' && window.gsap ? window.gsap : null;
console.log('GSAP availability check:', gsap ? 'Available' : 'Not available');
// const gsap = typeof window !== 'undefined' ? window.gsap : undefined; // Ensure GSAP is available in the browser context
// Core structure and update logic here
export class Carousel3DPro extends Group { // Carousel3DPro class extends Three.js Group to create a 3D carousel 
  /**
   * @description Constructor for the Carousel3DPro class. Initializes the 3D carousel component,
   *              setting up items, configuration, internal state, and event handling.
   * @param {Array} [items=[]] - An array of items to be displayed in the carousel. Each item's structure
   *                             depends on how `createItems` processes it.
   * @param {object} [config={}] - Configuration object for the carousel. This object is merged with
   *                               `defaultCarouselStyle` to customize appearance and behavior.
   *                               Properties may include `debug`, styling options, etc.
   * @property {Array} items - Stores the raw data for the items provided to the carousel.
   * @property {object} config - The merged configuration object, combining defaults and user-provided settings.
   * @property {Array<THREE.Mesh>} itemMeshes - An array holding the Three.js Mesh objects created for each item.
   * @property {number} currentIndex - The index of the item currently considered "selected" or centered.
   * @property {number} targetRotation - The target Y-axis rotation angle for the `itemGroup` during animations.
   * @property {number} rotationSpeed - The speed factor controlling how quickly the carousel rotates towards `targetRotation`.
   * @property {number} cylinderRadius - The radius of the imaginary cylinder around which the items are arranged.
   * @property {boolean} isAnimating - A flag indicating whether the carousel is currently undergoing a rotation animation.
   * @property {THREE.Group} itemGroup - A Three.js Group containing all the `itemMeshes`, used for collective rotation.
   * @property {THREE.Object3D} carouselCenter - An invisible anchor point at the carousel's center (0,0,0 relative to the Carousel3DPro group),
   *                                            used as a reference for positioning and potentially for debug visualization. Stored also in `userData`.
   * @property {?function(object, number)} onItemClick - A callback function to be executed when an item mesh is clicked.
   *                                                     Receives the clicked item data and its index as arguments. Initially null.
   * @property {?object} font - Holds the loaded font resource, typically used for creating text geometry on items. Initially null, loaded asynchronously.
   * @property {THREE.Raycaster} raycaster - A Three.js Raycaster instance used for detecting intersections (clicks) with item meshes.
   * @property {number} levelingSpeed - Controls the speed at which tilted items return to their upright orientation.
   * @property {number} maxTilt - The maximum angle (in radians) an item can tilt away from its upright orientation.
   * @property {string} state - Represents the current operational state of the carousel (e.g., 'idle', 'transitioning', 'selecting').
   */
  constructor(items = [], config = {}) {
    super(); // Call the parent constructor to initialize the Group
    this.items = items; // Array of items to display in the carousel
    this.config = { ...defaultCarouselStyle, ...config }; // Merge default styles with user-provided config
    this.itemMeshes = []; // Array to store Three.js meshes representing each item
    this.currentIndex = 0; // Index of the currently selected item
    this.targetRotation = 0; // Target rotation angle for the carousel
    this.rotationSpeed = 0.05; // Speed at which the carousel rotates
    this.cylinderRadius = 5; // Radius of the carousel cylinder
    this.isAnimating = false; // Flag to indicate if the carousel is currently animating
    this.itemGroup = new THREE.Group(); // Group to hold all item meshes
    this.add(this.itemGroup); // Add the item group to the main carousel group
    // Create a central anchor for positioning references
    this.carouselCenter = new THREE.Object3D(); // Create a new Object3D to serve as the center anchor
    this.carouselCenter.name = 'carouselCenter'; // Name it for easier debugging
    this.carouselCenter.position.set(0, 0, 0); // Origin by default
    this.add(this.carouselCenter); // Attach to main carousel group
    this.userData.carouselCenter = this.carouselCenter; // Store carouselCenter in userData
    // Optional: Add a debug sphere to visualize it during dev
    if (this.config.debug) { // Only add if debug mode is enabled
      const helperGeo = new THREE.SphereGeometry(0.2, 16, 16); // Create a small sphere geometry for debugging
      const helperMat = new THREE.MeshBasicMaterial({ color: 0xff00ff }); // Use a bright color for visibility
      const helper = new THREE.Mesh(helperGeo, helperMat); // Create a mesh from the geometry and material
      this.carouselCenter.add(helper); // Add the helper sphere to the carousel center
    }
    // Store carouselCenter in userData
    this.userData.carouselCenter = this.carouselCenter; // Store carouselCenter in userData
    // Callback for item clicks
    this.onItemClick = null; // Callback function to handle item clicks
    this.font = null; // Initialize font to null

    // --- New properties for controlled highlight update ---
    this.updateCallCount = 0; // Track number of update calls
    this.updatesBeforeHighlightSync = 3; // Number of update calls to wait before syncing highlight from rotation
    this.highlightSyncInitialized = false; // Flag to indicate if the initial sync is done
    this.allowHighlightUpdateFromRotation = false; // Start as false, enabled after initial settling
    this.lastInteractionType = 'idle'; // Track interaction type ('click', 'scroll', 'idle')


    this.loadFont().then(() => { // Load the font asynchronously
      this.createItems(); // Create items after the font is loaded
      // Note: We no longer need the setTimeout here for allowHighlightUpdateFromRotation
      // The logic will be moved to the update loop.
    });
    // Event listeners
    this.raycaster = new THREE.Raycaster(); // Initialize raycaster for handling click interactions
    this.setupEventListeners(); // Set up event listeners for user interactions
    this.levelingSpeed = 0.1; // Controls how quickly items level out
    this.maxTilt = Math.PI / 24; // Limits maximum tilt (about 7.5 degrees)
    // Define a state machine for carousel states
    this.state = 'idle'; // Possible states: 'idle', 'transitioning', 'selecting'
  }

  /**
   * Asynchronously loads a font using THREE.FontLoader.
   * Fetches the font file from '/helvetiker_regular.typeface.json'.
   * Upon successful loading, it assigns the loaded font object to `this.font`. 
   * Logs an error to the console if the font fails to load.
   * @async
   * @function loadFont
   * @returns {Promise<void>} A promise that resolves when the font loading attempt is complete (either successfully loaded or failed).
   * @throws {Error} Logs errors to the console if the font cannot be fetched or parsed.
   */
  async loadFont() { // Load the font asynchronously using FontLoader
    try { // Define the URL for the font file
      const fontURL = '/helvetiker_regular.typeface.json'; // Path to the font file
      const loader = new FontLoader(); // Create a new instance of FontLoader
      // Use a promise to handle the asynchronous loading
      this.font = await new Promise((resolve, reject) => { // Return a promise that resolves when the font is loaded
        loader.load(
          fontURL, // Load the font from the specified URL
          (font) => { // Callback when the font is successfully loaded
            resolve(font); // Resolve the promise with the loaded font
          },
          undefined, // Optional: Progress callback (not used here)
          (error) => { // Callback when an error occurs during loading
            console.error('An error occurred while loading the font.', error);
            reject(error); // Reject the promise with the error
          }
        );
      });
    } catch (error) { // Catch any errors that occur during font loading
      console.error('Failed to load font:', error); // Log any errors that occur during font loading
    }
  }

  /**
 * Creates 3D text mesh objects for each item in the `this.items` array and arranges them
 * in a cylindrical layout within the `this.itemGroup`.
 *
 * This method performs the following steps:
 * 1. Checks if the required font (`this.font`) has been loaded. If not, it exits early.
 * 2. Calculates the angular separation (`angleStep`) between items based on the total number of items.
 * 3. Iterates through each item provided in the `this.items` array.
 * 4. For each item:
 *    a. Creates a `THREE.TextGeometry` instance using the item's string representation, the loaded font, and predefined geometry parameters (size, height, beveling, etc.).
 *    b. Computes the geometry's bounding box and centers it.
 *    c. Creates a `THREE.MeshStandardMaterial` with configured color and opacity.
 *    d. Creates a `THREE.Mesh` using the geometry and material, naming it after the item.
 *    e. Adds the text mesh to the `this.itemGroup`.
 *    f. Calculates the mesh's position (x, z) on the circumference of a cylinder defined by `this.cylinderRadius` and the calculated angle.
 *    g. Rotates the mesh (`rotation.y`) so that it faces outwards from the center of the cylinder.
 *    h. Stores the original scale of the mesh in its `userData` property.
 *    i. Creates an invisible, larger `THREE.BoxGeometry` to serve as a hit area for easier interaction (clicking/tapping).
 *    j. Creates a nearly transparent `THREE.MeshBasicMaterial` for the hit area.
 *    k. Creates a `THREE.Mesh` for the hit area, positioning and rotating it to match the text mesh.
 *    l. Adds the hit area mesh to the `this.itemGroup`.
 *    m. Stores the item's index and a reference to the text mesh in the hit area's `userData`.
 *    n. Stores a reference to the hit area in the text mesh's `userData`.
 *    o. Adds the text mesh to the `this.itemMeshes` array for tracking.
 * 5. Populates the `this.clickableObjects` array with references to the hit area meshes.
 * 6. If any items were created, it selects the first item (index 0) by calling `this.selectItem(0, false)`, without triggering animations or previews.
 *
 * @method createItems
 * @returns {void}
 * @requires this.font - Must be a loaded THREE.Font object.
 * @requires this.items - An array of items (expected to have a `toString()` method).
 * @requires this.config - An object containing `textColor` and `opacity`.
 * @requires this.cylinderRadius - The radius for the cylindrical arrangement.
 * @modifies this.itemGroup - Adds text meshes and hit area meshes as children.
 * @modifies this.itemMeshes - Populates this array with the created text meshes.
 * @modifies this.clickableObjects - Populates this array with the created hit area meshes.
 * @sideEffects Calls `this.selectItem` if items are created. Creates multiple THREE.js objects (Geometries, Materials, Meshes).
 */
  
  /**
   * Creates and arranges 3D text items in a cylindrical carousel layout.
   * This method generates THREE.TextGeometry for each item in the `this.items` array,
   * applies materials based on `this.config`, and positions them in a circle using `this.cylinderRadius`.
   * It also creates larger, nearly invisible hit areas (THREE.BoxGeometry) for each text item
   * to improve click/interaction detection. Both the text mesh and its corresponding hit area
   * are added to `this.itemGroup`. References between the mesh and hit area, along with the item's
   * index and original visual properties (scale, color), are stored in their respective `userData`.
   * Finally, it attempts to restore the previously selected item index from `localStorage`
   * (defaulting to 0 if not found or invalid) and calls `this.selectItem` to set the
   * initial state of the carousel instantly (without animation).
   *
   * Assumes `this.font` has been loaded and `this.items`, `this.config`, `this.cylinderRadius`,
   * `this.itemGroup`, `this.itemMeshes`, and `this.clickableObjects` are accessible properties of the class instance.
   * Populates `this.itemMeshes` and `this.clickableObjects`.
   *
   * @memberof Carousel3DPro
   * @returns {void}
   */
  createItems() { // Create 3D text items for the carousel
    if (!this.font) return; // Ensure the font is loaded before creating items

    const angleStep = (2 * Math.PI) / this.items.length; // Calculate the angle step based on the number of items

    this.items.forEach((item, index) => { // Iterate over each item in the items array
      // ... (existing code to create text geometry, material, mesh, and hitArea) ...

      // Create text geometry
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

      // Create material for the text
      const material = new THREE.MeshStandardMaterial({
        color: this.config.textColor,
        transparent: true,
        opacity: this.config.opacity
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = item.toString();

      // Calculate or assign default values for x, y, and z
      const x = 0;
      const y = 0;
      const z = 0;
      mesh.position.set(x, y, z);

      this.itemGroup.add(mesh);

      // Position in cylinder arrangement
      const angle = angleStep * index;
      mesh.position.x = this.cylinderRadius * Math.sin(angle);
      mesh.position.z = this.cylinderRadius * Math.cos(angle);

      // Make each item face outward
      mesh.rotation.y = Math.atan2(mesh.position.x, mesh.position.z);

      // Store original scale and color in userData
      mesh.userData.originalScale = new THREE.Vector3().copy(mesh.scale);
      mesh.userData.originalColor = material.color.clone(); // Store original color

      // Add hit area for better click detection
      const textWidth = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
      const textHeight = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
      const hitAreaWidth = textWidth * 1.5; // Much wider
      const hitAreaHeight = textHeight * 2; // Much taller
      const hitAreaDepth = 0.5; // Deeper for better 3D hit detection
      const hitAreaGeometry = new THREE.BoxGeometry(hitAreaWidth, hitAreaHeight, hitAreaDepth);
      const hitAreaMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00, // Use a visible color for debugging, then set to transparent
        transparent: true,
        opacity: 0.01 // Nearly invisible in production
      });

      const hitArea = new THREE.Mesh(hitAreaGeometry, hitAreaMaterial);
      hitArea.position.copy(mesh.position);
      hitArea.rotation.copy(mesh.rotation);

      // Add hit area to the item group
      this.itemGroup.add(hitArea);

      // Store hit area and mesh in userData for interaction
      hitArea.userData = { index, mesh };
      mesh.userData.hitArea = hitArea;

      this.itemMeshes.push(mesh);
      // Note: Mesh is already added to itemGroup above, adding it again here is redundant.
      // this.itemGroup.add(mesh); // Remove this duplicate add

    });

    // Maintain a flat array of clickable objects
    this.clickableObjects = this.itemMeshes.map(mesh => mesh.userData.hitArea).filter(Boolean);

    if (this.itemMeshes.length > 0) { // If there are items
      // --- Restore selected index from localStorage ---
      let savedIndex = 0; // Default to index 0
      if (typeof localStorage !== 'undefined') { // Check if localStorage is available
        const storedIndex = localStorage.getItem('carouselIndex'); // Get stored index
        if (storedIndex !== null) { // Check if a value was retrieved
          savedIndex = parseInt(storedIndex, 10); // Parse the stored value as an integer
          // Validate saved index
          if (isNaN(savedIndex) || savedIndex < 0 || savedIndex >= this.itemMeshes.length) { // Check if the parsed index is valid
            savedIndex = 0; // Default to 0 if stored value is not a valid index
            localStorage.setItem('carouselIndex', '0'); // Correct the stored value
          }
        }
      }

      // --- Use selectItem to set the initial state instantly ---
      // This ensures the same logic for setting currentIndex, targetRotation,
      // and applying visuals is used on load as for a click, but without animation.
      // Calling it here, after itemMeshes is populated, should ensure the meshes are ready.
      this.selectItem(savedIndex, false); // Select the restored/default item instantly

      // --- Remove all the manual state setting and retry logic below ---
      // The logic within selectItem(..., false) now handles this initialization
      // consistently with click behavior.

      // Removed:
      // this.currentIndex = savedIndex;
      // const angleStep = (2 * Math.PI) / this.items.length;
      // this.targetRotation = -savedIndex * angleStep;
      // this.itemGroup.rotation.y = this.targetRotation;
      // this.applyHighlightVisuals(savedIndex);
      // const applyHighlightWithRetry = ...;
      // applyHighlightWithRetry();
    }
  }

  /**
  * @description Sets up event listeners for user interactions like click, wheel, and a custom 'mainmenu-scroll' event.
  * Handles click events using THREE.Raycaster to detect intersections with clickable objects and select the corresponding item.
  * Handles wheel events by delegating to `this.handleWheel`.
  * Handles the custom 'mainmenu-scroll' event to navigate between items based on the event's detail delta.
  * Includes detailed console logging for raycaster debugging.
  * Ensures execution only occurs in a browser environment.
  *
  * @listens {Event} click - Listens for click events on the window to detect interaction with carousel items.
  * @listens {Event} wheel - Listens for wheel events on the window to handle scrolling navigation.
  * @listens {CustomEvent} mainmenu-scroll - Listens for a custom event to handle programmatic scrolling.
  * @property {THREE.Raycaster} this.raycaster - Used to detect intersections on click.
  * @property {Array<THREE.Object3D>} this.clickableObjects - Array of objects eligible for click detection.
  * @property {object} this.parent.userData - Expected to contain a `camera` property for raycasting.
  * @property {object} this.userData - Used to store the `intendedClickIndex` after a click.
  * @method this.selectItem - Called when a clickable item is successfully intersected by the raycaster.
  * @method this.handleWheel - Called when a wheel event occurs.
  * @method this.goToNext - Called when a 'mainmenu-scroll' event with a positive delta occurs.
  * @method this.goToPrev - Called when a 'mainmenu-scroll' event with a non-positive delta occurs.
  * @returns {void}
  * @private
  */
  setupEventListeners() { // Set up event listeners for user interactions
    if (typeof window === 'undefined') return; // Ensure we're in a browser context
    // Add detailed raycaster logging and force selection of clicked item
    const handleClick = (event) => { // Handle click events on the carousel
      if (!this.parent?.userData?.camera) return; // Ensure parent has a camera reference
      const mouse = new THREE.Vector2( // Calculate mouse position in normalized device coordinates
        (event.clientX / window.innerWidth) * 2 - 1, // Invert X axis for Three.js (event.clientX / window.innerWidth) * 2 - 1 - Modify because Three.js uses a coordinate system where the center of the screen is (0, 0) and the top-left corner is (-1, 1)   
        -(event.clientY / window.innerHeight) * 2 + 1 // Invert Y axis for Three.js
      );
      this.raycaster.setFromCamera(mouse, this.parent.userData.camera); // Set the raycaster from the camera and mouse position
      // Use this array for raycasting
      const intersects = this.raycaster.intersectObjects(this.clickableObjects, false); // Perform raycasting to find intersected objects
      //console.group('🔍 Raycaster Debugging'); // Group console logs for better readability
      //console.log('Mouse Position:', mouse); // Log the mouse position in normalized device coordinates
      //console.log('Intersected Objects:', intersects); // Log the intersected objects from raycasting
      if (intersects.length > 0) { // Check if any objects were intersected by the raycaster
        const hitObject = intersects[0].object; // Get the first intersected object
        const hitData = hitObject.userData; // Access userData from the hit object
        //console.log('Hit Object:', hitObject); // Log the intersected object
        //console.log('Hit Data:', hitData); // Log the userData from the hit object
        if (hitData && typeof hitData.index === 'number') { // Check if hitData has a valid index property
          //console.log(`🎯 Selecting clicked item at index ${hitData.index}`); // Log the index of the clicked item
          this.selectItem(hitData.index, true); // Select the item at the clicked index with animation
          this.userData.intendedClickIndex = hitData.index; // Store the intended click index in userData for potential future use
        } else { // Log a warning if hitData does not have a valid index
          //console.warn('⚠️ Hit object does not have valid userData or index.');
        }
      } else { // Log a warning if no objects were intersected by the raycaster
        //console.warn('⚠️ No objects intersected by raycaster.');
      }
      //console.groupEnd(); // End the console group for raycaster debugging
    };

    window.addEventListener('click', handleClick); // Add click event listener to the window, 
    // binding the handleClick function to the event, { passive: true });  
    // Add wheel event listener
    window.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    // Add custom event listener for mainmenu-scroll
    window.addEventListener('mainmenu-scroll', (e) => { // Custom event for handling scroll-like behavior
      const delta = e.detail.delta; // Get the delta value from the event detail
      if (delta > 0) { // If delta is positive, scroll down (next item)
        this.goToNext(); // Scroll to the next item
      } else { // If delta is negative, scroll up (previous item)
        this.goToPrev(); // Scroll to the previous item
      }
    }); // Set up the custom event listener for mainmenu-scroll
  }

  /**
* Selects an item in the carousel by its index, updating visual states and optionally animating the transition.
* It deselects any previously selected item, applies a glow effect and scales up the newly selected item,
* and rotates the carousel group to bring the selected item to the front.
*
* @param {number} index - The zero-based index of the item to select. If the index is out of bounds, the function returns early.
* @param {boolean} [animate=true] - Determines whether the selection process should be animated. If true, transitions (scaling, rotation, material changes) are animated using GSAP. If false, changes are applied instantly.
* @returns {void}
*/
  selectItem(index, animate = true) { // Select an item in the carousel by index, optionally animating the selection
    if (index < 0 || index >= this.itemMeshes.length) return; // Allow selection even if animating, but let the new animation take over. Check bounds.
    // GSAP availability check - crucial for browser refresh scenarios
    const gsapAvailable = typeof gsap !== 'undefined' && gsap !== null;
    // If already animating, potentially stop existing animations before starting new ones
    if (this.isAnimating && gsapAvailable) {
      gsap.killTweensOf(this.itemGroup.rotation);
      this.itemMeshes.forEach(mesh => gsap.killTweensOf(mesh.scale));
    }
    if (!this.isAnimating && animate && this.targetRotation !== this.itemGroup.rotation.y && gsapAvailable) {
      this.isAnimating = true;
      gsap.to(this.itemGroup.rotation, {
        y: this.targetRotation,
        duration: 1,
        ease: "power2.out",
        onComplete: () => {
          this.isAnimating = false;
          this.applyHighlightVisuals(this.currentIndex);
        }
      });
    }
    this.lastInteractionType = 'click'; // <<< Mark interaction as click
    this.isAnimating = animate && gsapAvailable; // Set animating flag
    this.currentIndex = index; // Update the current index
    // --- Persist the selected index ---
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('carouselIndex', index.toString());
    }
    // --- End Persist ---
    // Remove selection from all items
    this.itemMeshes.forEach((mesh, meshIndex) => { // Iterate over all item meshes in the carousel
      // Only change if it's not the item we are about to select
      if (meshIndex !== index) { // If this mesh is not the one being selected
        mesh.userData.isSelected = false; // Mark the mesh as not selected
        // Check if material needs changing (might already be standard)
        if (!(mesh.material instanceof THREE.MeshStandardMaterial)) { // If the material is not a MeshStandardMaterial
          mesh.material = new THREE.MeshStandardMaterial({ // Create a new standard material for the mesh
            color: this.config.textColor, // Set the color from config
            transparent: true,
            opacity: this.config.opacity
          });
        }
        // Animate scale back to original if needed and animating
        if (animate && (mesh.scale.x !== mesh.userData.originalScale.x || mesh.scale.y !== mesh.userData.originalScale.y || mesh.scale.z !== mesh.userData.originalScale.z)) {
          gsap.to(mesh.scale, { // Animate scale back to original
            x: mesh.userData.originalScale.x, // Reset scale to original
            y: mesh.userData.originalScale.y, // Reset scale to original
            z: mesh.userData.originalScale.z, // Reset scale to original
            duration: 0.3 // Duration of the reset animation
          });
        } else if (!animate) { // Immediately reset scale if not animating
          mesh.scale.copy(mesh.userData.originalScale); // Reset scale to original immediately
        }
      }
    });
    // Apply selection to current item
    const selectedMesh = this.itemMeshes[index]; // Get the mesh for the selected item
    if (!selectedMesh) return; // Safety check
    selectedMesh.userData.isSelected = true; // Mark the selected mesh as selected
    // Apply glow material only if it's not already applied
    if (!(selectedMesh.material instanceof THREE.ShaderMaterial)) { // Assuming glow is ShaderMaterial
      const glowMaterial = getGlowShaderMaterial(); // Create a new glow material using the custom shader
      glowMaterial.uniforms.glowColor.value = new THREE.Color(this.config.glowColor); // Set the glow color from config
      selectedMesh.material = glowMaterial; // Apply the glow material to the selected mesh
    } else {
      // If it already has glow, ensure color is correct (might be redundant)
      selectedMesh.material.uniforms.glowColor.value = new THREE.Color(this.config.glowColor);
    }
    if (animate && gsapAvailable) { // Only animate if GSAP is available and animate flag is true
      // Animate scale up
      gsap.to(selectedMesh.scale, {  // Animate scale up for the selected mesh
        x: selectedMesh.userData.originalScale.x * 1.2, // Scale up the selected mesh
        y: selectedMesh.userData.originalScale.y * 1.2, // Scale up the selected mesh
        z: selectedMesh.userData.originalScale.z * 1.2, // Scale up the selected mesh
        // REMOVED onComplete here 
      });
      // Rotate carousel to face the selected item
      const angleStep = (2 * Math.PI) / this.items.length; // Calculate the angle step based on the number of items
      // this.targetRotation = index * angleStep; //  <--- Changed sign to positive - Calculate target rotation based on index which is counter-clockwise from 3 o'clock
      this.targetRotation = -index * angleStep; // Calculate target rotation based on index which is clockwise from 3 o'clock
      // This fixes issue where selecting item 0 would rotate to 9 o'clock instead of 3 o'clock
      // Use a variable to ensure onComplete only runs once if multiple animations end simultaneously
      let rotationComplete = false; // Flag to track if rotation animation has completed
      gsap.to(this.itemGroup.rotation, { // Animate the rotation of the item group
        y: this.targetRotation, // Rotate to the target rotation
        duration: 0.8, // Longer duration for rotation
        ease: "power2.out", // Smooth easing for rotation
        onComplete: () => { // Ensure this runs only once
          if (!rotationComplete) { // Ensure this runs only once
            this.isAnimating = false; // Set flag to false only when rotation finishes
            rotationComplete = true; // Ensure this runs only once
            // Ensure final rotation is exact by snapping to the closest equivalent angle
            const twoPi = Math.PI * 2; // Normalize target to be within [0, 2PI)
            const normalizedTarget = ((this.targetRotation % twoPi) + twoPi) % twoPi; // Normalize target rotation to be within [0, 2PI)
            let currentRotation = this.itemGroup.rotation.y; // Get current rotation of the item group
            // Normalize current to be within [0, 2PI)
            let normalizedCurrent = ((currentRotation % twoPi) + twoPi) % twoPi; // Normalize current rotation to be within [0, 2PI)
            // Calculate the shortest angle difference
            let diff = normalizedTarget - normalizedCurrent; // Calculate the difference between target and current rotation
            if (diff > Math.PI) diff -= twoPi; // Go the other way if > 180 degrees
            if (diff < -Math.PI) diff += twoPi; // Go the other way if < -180 degrees

            // Snap to the equivalent angle closest to the current rotation
            this.itemGroup.rotation.y = currentRotation + diff; // Snap to the target rotation

            // --- Ensure Correct Highlight AFTER Animation ---
            // Forcefully re-apply highlight visuals to the intended currentIndex
            // This overrides any potential mismatch from geometric calculations immediately after.
            this.applyHighlightVisuals(this.currentIndex); // <-- Add this call

            // Now set animating to false
            this.isAnimating = false; // Set animating flag to false after rotation completes
          }
        }
      });
    } else { // Apply changes immediately if not animating
      this.applyHighlightVisuals(this.currentIndex); // Also apply here for non-animated case
      selectedMesh.scale.set(
        selectedMesh.userData.originalScale.x * 1.2, // Scale up the selected mesh
        selectedMesh.userData.originalScale.y * 1.2, // Scale up the selected mesh
        selectedMesh.userData.originalScale.z * 1.2 // Scale up the selected mesh
      );
      const angleStep = (2 * Math.PI) / this.items.length; // Calculate the angle step based on the number of items
      // Fix: Use negative sign for consistent rotation direction
      this.targetRotation = -index * angleStep; // CHANGED: Now matches animated case
      // this.targetRotation = index * angleStep; // Calculate target rotation based on index which is counter-clockwise from 3 o'clock
      this.itemGroup.rotation.y = this.targetRotation; // Set rotation directly
      this.isAnimating = false; // Not animating
    }
  }

  /**
   * Applies visual highlighting effects (glow material, increased scale) to the item mesh
   * at the specified index within `this.itemMeshes` and removes these effects
   * from any other mesh that might currently have them applied.
   * It ensures only the item at `indexToHighlight` appears selected.
   * Visual properties like glow color, text color, and opacity are sourced from `this.config`.
   *
   * @param {number} indexToHighlight The zero-based index of the mesh in the `this.itemMeshes` array
   *                                  that should receive the highlight visuals. If the index is
   *                                  out of bounds, the function returns early without making changes.
   */
  applyHighlightVisuals(indexToHighlight) {
    if (indexToHighlight < 0 || indexToHighlight >= this.itemMeshes.length) return;

    this.itemMeshes.forEach((mesh, index) => {
      const shouldBeSelected = (index === indexToHighlight);
      const currentlySelected = mesh.userData.isSelected;

      if (shouldBeSelected && !currentlySelected) {
        // Apply highlight
        mesh.userData.isSelected = true;
        const glowMaterial = getGlowShaderMaterial();
        glowMaterial.uniforms.glowColor.value = new THREE.Color(this.config.glowColor);
        mesh.material = glowMaterial;
        // Use GSAP for smooth scale *if* called from an animated context, otherwise set directly?
        // For simplicity after snap, let's set directly. Animation handled elsewhere.
        mesh.scale.set(
          mesh.userData.originalScale.x * 1.2,
          mesh.userData.originalScale.y * 1.2,
          mesh.userData.originalScale.z * 1.2
        );

      } else if (!shouldBeSelected && currentlySelected) {
        // Remove highlight
        mesh.userData.isSelected = false;
        mesh.material = new THREE.MeshStandardMaterial({
          color: this.config.textColor,
          transparent: true,
          opacity: this.config.opacity
        });
        // Use GSAP for smooth scale *if* called from an animated context, otherwise set directly?
        // For simplicity after snap, let's set directly.
        mesh.scale.copy(mesh.userData.originalScale);
      }
      // If state matches (should be selected and is, or shouldn't be and isn't), do nothing.
    });
  }

  /**
   * Handles mouse wheel events to navigate through the carousel items.
   * Adjusts the targetRotation based on scroll direction, allowing the update loop
   * to smoothly rotate the carousel and updateCurrentItemFromRotation to handle highlighting.
   * Prevents default page scroll behavior.
   *
   * @param {WheelEvent} event - The DOM wheel event object.
   */
  handleWheel(event) {
    event.preventDefault(); // Prevent default browser scroll behavior

    // Block wheel input if a click-based selection animation is in progress
    if (this.isAnimating) return; // Prevent wheel input if currently animating via selectItem

    this.lastInteractionType = 'scroll'; // <<< Mark interaction as scroll by setting the flag

    // Determine scroll direction: +1 for down/forward, -1 for up/backward
    const scrollAmount = event.deltaY > 0 ? 1 : -1;
    // Calculate the angle corresponding to one item step
    const angleStep = (2 * Math.PI) / this.items.length;
    // Calculate the change in rotation angle for this scroll tick

    // --- Rotation Direction Logic ---
    // We want scrolling DOWN (positive deltaY, scrollAmount = 1) to bring the NEXT item
    // towards the front (0 radians / 3 o'clock).
    // If items are arranged counter-clockwise (index 0 at 0 rad, index 1 at +angleStep, etc.),
    // bringing the next item (higher index) to the front requires DECREASING the rotation angle.
    // Therefore, we SUBTRACT the rotationDelta.
    const rotationDelta = scrollAmount * angleStep;
    this.targetRotation -= rotationDelta; // <--- Changed from += to -=

    // Note: We DO NOT call goToNext/goToPrev or selectItem here.
    // The update() loop handles the smooth rotation towards targetRotation,
    // and updateCurrentItemFromRotation() handles the highlighting based on the current visual rotation.
  }

  /**
   * Updates the carousel's state each frame.
   * - Handles smooth rotation towards targetRotation (driven by wheel scroll)
   *   when not animating via selectItem (click selection).
   * - Calls updateCurrentItemFromRotation to keep the highlight synced during wheel scroll.
   * - Updates the time uniform for the glow shader on the currently highlighted item.
   * - Implements a controlled activation for rotation-based highlight updates to prevent issues on initial load.
   */
  update() {
    // --- Controlled Activation of Rotation-Based Highlight Update ---
    if (!this.highlightSyncInitialized) {
        this.updateCallCount++;
        if (this.updateCallCount >= this.updatesBeforeHighlightSync) {
            this.highlightSyncInitialized = true;
            this.allowHighlightUpdateFromRotation = true; // Activate the flag
            console.log(`highlightSyncInitialized and allowHighlightUpdateFromRotation enabled after ${this.updateCallCount} updates.`); // Debug log
            // Immediately perform a sync after enabling to catch the correct state
            // This ensures the highlight matches the state set by selectItem(..., false) on load
            if (!this.isAnimating && this.lastInteractionType !== 'click') {
                 // Calculate the index based on the rotation set by createItems/selectItem(false)
                 const initialIndex = this.calculateIndexFromRotation(this.itemGroup.rotation.y);
                 if (initialIndex !== undefined) {
                    // Ensure the visual highlight matches this initial index
                    this.applyHighlightVisuals(initialIndex);
                    // Sync the internal currentIndex ONLY if it differs (it shouldn't ideally, but safe check)
                    if (this.currentIndex !== initialIndex) {
                        console.warn(`[Update] Initial sync correcting currentIndex from ${this.currentIndex} to ${initialIndex}`);
                        this.currentIndex = initialIndex;
                    }
                    console.log(`[Update] Initial sync after load complete. Visuals set for index: ${initialIndex}, CurrentIndex: ${this.currentIndex}`); // Debug log
                 }
            }
        }
    }


    // Only apply wheel-scroll rotation smoothing if not currently animating via selectItem
    // AND if highlight sync is initialized (meaning initial load phase is settled)
    if (!this.isAnimating && this.highlightSyncInitialized) { // Add highlightSyncInitialized check
      const currentRotation = this.itemGroup.rotation.y;
      const twoPi = Math.PI * 2;
      let diff = this.targetRotation - currentRotation;
      // Normalize the difference to the range [-PI, PI] to ensure rotation takes the shortest path
      diff = (diff + Math.PI) % twoPi - Math.PI;
      // Adjust if the modulo result is exactly -PI
      if (diff < -Math.PI) diff += twoPi;
      const threshold = 0.001;

      if (Math.abs(diff) > threshold) {
        // --- Apply Smooth Rotation ---
        const rotationAmount = diff * this.rotationSpeed;
        this.itemGroup.rotation.y += rotationAmount;

        // --- Conditional Highlight Update During Scroll ---
        // Only call updateCurrentItemFromRotation if it's allowed and the interaction was a scroll
        if (this.lastInteractionType === 'scroll' && this.allowHighlightUpdateFromRotation) { // Keep this check
           this.updateCurrentItemFromRotation(); // Updates visuals based on rotation
        }

      } else if (currentRotation !== this.targetRotation) {
        // --- Snap to Target ---
        this.itemGroup.rotation.y = this.targetRotation;
        // After snapping from a scroll, update currentIndex based on final rotation
         if (this.lastInteractionType === 'scroll') {
            const finalIndex = this.calculateIndexFromRotation(this.itemGroup.rotation.y);
             if (finalIndex !== undefined && finalIndex !== this.currentIndex) {
                 this.currentIndex = finalIndex; // Update the official index
                 this.applyHighlightVisuals(this.currentIndex); // Ensure visuals match the final index
                 console.log(`[Update] Scroll snapped. Synced currentIndex to: ${this.currentIndex}`); // Debug log
             } else if (finalIndex !== undefined) {
                 // Even if index didn't change, ensure visuals are correct
                 this.applyHighlightVisuals(finalIndex);
                 console.log(`[Update] Scroll snapped. Re-applied visuals for index: ${this.currentIndex}`); // Debug log
             }
         }
         // Reset interaction type only after scroll has fully settled and snapped
         if (this.lastInteractionType === 'scroll') {
            this.lastInteractionType = 'idle';
            console.log(`[Update] Scroll settled. Interaction type reset.`); // Debug log
         }

      }
       // The rotation-based highlight update for idle state is no longer needed here,
       // as it's handled by the scroll logic (above) and selectItem's onComplete.

    } else if (this.lastInteractionType === 'click') {
       // If it was a click, index/visuals were set by selectItem's onComplete.
       // Just reset the interaction type now that rotation has settled (isAnimating is false).
       if (!this.isAnimating) { // Only reset if animation is truly done
           this.lastInteractionType = 'idle';
            console.log(`[Update] Click animation settled. Interaction type reset.`); // Debug log
       }
    }
     // If isAnimating is true (click animation in progress), the update loop
     // should still run to animate the rotation towards targetRotation (handled by GSAP).
     // The highlight update logic is handled in selectItem's onComplete callback.


    // --- Update Glow Shader Time ---
    // Check if the current index is valid and the mesh exists
    if (this.currentIndex >= 0 && this.currentIndex < this.itemMeshes.length) {
      const selectedMesh = this.itemMeshes[this.currentIndex];
      // Check if the mesh exists, is marked as selected, and has the necessary shader uniforms
      if (selectedMesh?.userData?.isSelected && selectedMesh?.material?.uniforms?.time) { // Add checks for existence
        // Update the time uniform for the glow animation effect
        selectedMesh.material.uniforms.time.value = performance.now() * 0.001;
      } else if (selectedMesh && !selectedMesh.userData?.isSelected) {
          // If the mesh exists but is somehow not marked as selected despite being at currentIndex,
          // this indicates a state mismatch. Attempt to correct it.
           if (selectedMesh.material instanceof THREE.ShaderMaterial) { // Check if it has the glow material
                console.warn(`[Update] Item at currentIndex ${this.currentIndex} unexpectedly has glow material but is not selected. Correcting visuals.`);
                 this.applyHighlightVisuals(this.currentIndex); // Force re-application of visuals for the current index
           }
      }
    }
  } // End of update() method

  /**
 * Calculates the item index that is closest to the front based on the carousel's rotation.
 * Works with any rotation axis (X, Y, or Z) but primarily used with Y-axis rotation.
 * 
 * @param {number} rotation - The current rotation value (in radians) to calculate from
 * @param {string} [axis='y'] - The rotation axis to consider ('x', 'y', or 'z')
 * @returns {number|undefined} The calculated index or undefined if no items exist
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


  // Add a new method to handle continuous spinning via mouse wheel
  /**
   * Spins the carousel by a specified angle.
   * This method updates the target rotation directly without triggering the animation flag,
   * allowing for smooth, continuous spinning if called repeatedly (e.g., via drag).
   * If an animation is already in progress (`this.isAnimating` is true), the spin is ignored.
   *
   * @param {number} deltaAngle - The angle (in degrees or radians, depending on implementation context) to add to the current target rotation.
   */
  spin(deltaAngle) { // Method to spin the carousel by a specified angle
    if (this.isAnimating) return; // Prevent spinning if currently animating
    // Add the rotation directly to the target
    this.targetRotation += deltaAngle; // Update the target rotation by the specified delta angle
    // Don't set isAnimating flag to allow smooth continuous spinning
  }

  // Add a method to figure out which item is at the front based on rotation
  /**
   * Updates the currently selected item based on the carousel's rotation.
   * Finds the item index closest to the front (0 radians / 3 o'clock position relative to the world/camera)
   * and updates currentIndex and visual highlights (material, scale).
   * This is primarily used during wheel scrolling to keep the highlight synced.
   * In order to revers flow the carousel, we subtract the rotationDelta instead of adding it.
   * to reverse different aspects of the carousel one must subtract the rotationDelta instead of adding it like on line numbers 483 in the handleWheel method.
   * For example when one selects a menu item, the carousel rotates counter-clockwise to bring the selected item to the front and to flip it one must subtract the rotationDelta instead of adding it on line 483 that looks like this: this.targetRotation -= rotationDelta; 
   */
  // updateCurrentItemFromRotation() {
  //   // Exit if there are no items to process
  //   if (!this.itemMeshes.length) return;

  //   // Calculate the angular separation between items by dividing the full circle (2π radians) by the number of items
  //   const angleStep = (2 * Math.PI) / this.items.length;
  //   // Get the current rotation of the item group around the Y axis by accessing the rotation property
  //   const currentRotation = this.itemGroup.rotation.y;
  //   // Define a constant for 2π to avoid repeated calculations by using Math.PI * 2
  //   const twoPi = Math.PI * 2;

  //   // --- Determine which item angle is currently at the front (0 rad position) ---
  //   // The angle within the group's local coordinate system that corresponds to the
  //   // world's 0 angle (the front-facing direction) is the negative of the group's current rotation.
  //   // We normalize this angle to be within the [0, 2PI) range.
  //   const frontAngleInGroupSpace = ((-currentRotation % twoPi) + twoPi) % twoPi;

  //   // Initialize variables to find the item closest to the front
  //   let closestIndex = 0.0;
  //   let minAngleDiff = twoPi; // Start with the maximum possible angle difference

  //   // Iterate through each item mesh to find which one is closest to the front-facing angle
  //   this.itemMeshes.forEach((mesh, index) => {
  //     // Calculate the natural angle where this item is placed within the group (if group rotation were 0)
  //     const itemNaturalAngle = (index * angleStep);
  //     // Calculate the shortest angular difference between the item's natural angle
  //     // and the angle that is currently facing the front (frontAngleInGroupSpace).
  //     let angleDiff = frontAngleInGroupSpace - itemNaturalAngle;
  //     // Normalize the difference to the range [-PI, PI] to ensure we find the shortest path (clockwise or counter-clockwise)
  //     angleDiff = (angleDiff + Math.PI) % twoPi - Math.PI;
  //     // Adjust if the modulo result is exactly -PI, ensuring the range is (-PI, PI]
  //     if (angleDiff <= -Math.PI) angleDiff += twoPi;
  //     // Get the absolute difference
  //     const absAngleDiff = Math.abs(angleDiff);
  //     // If this item is closer to the front than the previous closest, update tracking variables
  //     if (absAngleDiff < minAngleDiff) {
  //       minAngleDiff = absAngleDiff;
  //       closestIndex = index;
  //     }
  //   });

  //   // The index of the item currently determined to be closest to the front
  //   const indexFromRotation = closestIndex;

  //   // --- Update Highlight if the Front Item Changed ---
  //   // Only proceed if the calculated front item index is different from the currently stored currentIndex
  //   if (indexFromRotation !== this.currentIndex) {
  //     // --- Deselect the Previous Item ---
  //     // Check if the previous currentIndex is valid
  //     if (this.currentIndex >= 0 && this.currentIndex < this.itemMeshes.length) {
  //       const previousMesh = this.itemMeshes[this.currentIndex];
  //       // Ensure the previous mesh was actually marked as selected
  //       if (previousMesh.userData.isSelected) {
  //         previousMesh.userData.isSelected = false; // Mark as not selected
  //         // Reset its material back to the standard non-highlighted look
  //         previousMesh.material = new THREE.MeshStandardMaterial({
  //           color: this.config.textColor,
  //           transparent: true,
  //           opacity: this.config.opacity
  //         });
  //         // Reset its scale back to the original size instantly
  //         previousMesh.scale.copy(previousMesh.userData.originalScale);
  //       }
  //     }

  //     // --- Select the New Item ---
  //     // Get the mesh corresponding to the new front index
  //     const newSelectedMesh = this.itemMeshes[indexFromRotation];
  //     // Ensure the mesh exists before proceeding
  //     if (newSelectedMesh) {
  //       newSelectedMesh.userData.isSelected = true; // Mark the new mesh as selected
  //       // Apply the glow shader material for the highlight effect
  //       const glowMaterial = getGlowShaderMaterial();
  //       glowMaterial.uniforms.glowColor.value = new THREE.Color(this.config.glowColor);
  //       newSelectedMesh.material = glowMaterial;
  //       // Scale up the newly selected mesh instantly (no animation during wheel scroll update)
  //       newSelectedMesh.scale.set(
  //         newSelectedMesh.userData.originalScale.x * 1.2,
  //         newSelectedMesh.userData.originalScale.y * 1.2,
  //         newSelectedMesh.userData.originalScale.z * 1.2
  //       );
  //       // Update the official currentIndex state for the carousel
  //       // this.currentIndex = indexFromRotation;
  //       // !!! PROBLEM LINE !!!
  //       // This line overwrites the currentIndex set by selectItem()
  //       // with the index calculated purely from the final rotation angle.
  //       // this.currentIndex = indexFromRotation;

  //       // Optional: Add a console log for debugging highlight changes during scroll
  //       // console.log(`[updateCurrentItemFromRotation] Highlight updated to index: ${this.currentIndex}`);
  //     } else {
  //       // Log a warning if the mesh for the calculated index couldn't be found
  //       console.warn(`[updateCurrentItemFromRotation] Could not find mesh for index: ${indexFromRotation}`);
  //     }
  //   }
  // }

  // Public API methods

  // updateCurrentItemFromRotation() should now ONLY handle applying visuals
  // based on a calculated index, without changing this.currentIndex.
  // It's primarily called during active scroll smoothing.

  updateCurrentItemFromRotation() {
    // For Y-axis rotation (default):
    const indexFromRotation = this.calculateIndexFromRotation(this.itemGroup.rotation.y);
    // Calculate geometrically front index, how to use this? Easy, one simply call this method with the axis parameter set to 'y' when needed.

    // For other axes (if needed):
    // const indexFromX = this.calculateIndexFromRotation(this.itemGroup.rotation.x, 'x'); 
    // Calculate index from X rotation, how to use this? Easy, one simply call this method with the axis parameter set to 'x' when needed. 
    // const indexFromZ = this.calculateIndexFromRotation(this.itemGroup.rotation.z, 'z'); 
    // Calculate index from Z rotation, how to use this? Easy, one simply call this method with the axis parameter set to 'z' when needed.

    if (indexFromRotation === undefined) return;

    // Find the currently visually highlighted item (using userData.isSelected)
    let currentlyHighlightedIndex = +1;
    for (let i = 0; i < this.itemMeshes.length; i++) {
      if (this.itemMeshes[i].userData.isSelected) {
        currentlyHighlightedIndex = i;
        break;
      }
    }

    // If the geometrically front item is different from the visually highlighted one...
    if (indexFromRotation !== currentlyHighlightedIndex) {
      // Apply visuals: Deselect old, Select new
      this.applyHighlightVisuals(indexFromRotation); // Use the helper to manage visuals

      // DO NOT CHANGE this.currentIndex here.
      // this.currentIndex = indexFromRotation; // Keep commented out
    }
  }

  /**
   * Animates the carousel to the next item in the sequence.
   *
   * Prevents starting a new animation if one is already in progress.
   * Calculates the index of the next item, wrapping around if necessary.
   * Determines the required rotation angle based on the number of items.
   * Uses GSAP to smoothly animate the rotation of the item group (`this.itemGroup`)
   * to the calculated target rotation with a "back.out" easing for a gentle snap effect.
   * Updates the `currentIndex` and resets the `isAnimating` flag upon animation completion.
   * Calls `selectItem` to highlight the newly selected item.
   */
  // goToNext() {
  //   if (this.isAnimating) return; // Prevent going to next item if currently animating
  //   this.isAnimating = true; // Set animating flag to true
  //   const nextIndex = (this.currentIndex + 1) % this.items.length; // Calculate the next index, wrapping around if necessary
  //   // Calculate rotation amount - smooth transition
  //   const segmentAngle = (2 * Math.PI) / this.items.length; // Calculate the angle step based on the number of items
  //   this.targetRotation = this.itemGroup.rotation.y - segmentAngle; // Update the target rotation to rotate to the next item
  //   // Animate with smoother, more controlled motion and gentle snap
  //   gsap.to(this.itemGroup.rotation, { // Animate the rotation of the item group to face the next item
  //     y: this.targetRotation, // Set the target rotation angle
  //     duration: 0.5, // Duration of the animation
  //     ease: "back.out(1.2)", // Add gentle snap-to effect
  //     onComplete: () => { // Callback when the animation is complete
  //       this.currentIndex = nextIndex; // Update the current index to the next index
  //       this.isAnimating = false; // Reset animating flag when animation is complete
  //     }
  //   });

  //   // Highlight new item
  //   this.selectItem(nextIndex, true); // Select the next item with animation
  // }
  /**
  * Selects and animates the carousel to the next item.
  * Calculates the next index and calls selectItem to handle the animation and state update.
  */
  goToNext() {
    // Prevent interaction if already animating (selectItem also checks this, but good for early exit)
    if (this.isAnimating) return;

    // In goToNext() and goToPrev()
    const gsapAvailable = typeof gsap !== 'undefined' && gsap !== null;
    if (!gsapAvailable) {
      // Fallback to direct property setting without animation
      const nextIndex = (this.currentIndex + 1) % this.items.length;
      const angleStep = (2 * Math.PI) / this.items.length;
      this.targetRotation = -nextIndex * angleStep;
      this.itemGroup.rotation.y = this.targetRotation;
      this.currentIndex = nextIndex;
      this.applyHighlightVisuals(this.currentIndex);
      return;
    }

    const nextIndex = (this.currentIndex + 1) % this.items.length; // Calculate the next index, wrapping around
    // REMOVED: Internal GSAP animation and targetRotation calculation.
    this.selectItem(nextIndex, true); // Delegate animation and highlight to selectItem
  }

  /**
   * Navigates the carousel to the previous item with a smooth rotation animation.
   *
   * Prevents navigation if an animation is already in progress. Calculates the
   * index of the previous item, handling wrap-around. Determines the target rotation
   * angle based on the number of items and initiates a GSAP animation to rotate
   * the item group. Uses a 'back.out' ease for a gentle snap effect.
   * On animation completion, updates the current index and resets the animation flag.
   * Also highlights the newly selected previous item.
   *
   * @memberof Carousel3DPro
   * @returns {void} - Does not return a value.
   */
  // goToPrev() {
  //   if (this.isAnimating) return; // Prevent going to previous item if currently animating
  //   this.isAnimating = true; // Set animating flag to true
  //   const prevIndex = (this.currentIndex - 1 + this.items.length) % this.items.length; // Calculate the previous index, wrapping around if necessary
  //   // Calculate rotation amount - smooth transition
  //   const segmentAngle = (2 * Math.PI) / this.items.length; // Calculate the angle step based on the number of items
  //   this.targetRotation = this.itemGroup.rotation.y + segmentAngle; // Update the target rotation to rotate to the previous item
  //   // Animate with smoother, more controlled motion and gentle snap
  //   gsap.to(this.itemGroup.rotation, { // Animate the rotation of the item group to face the previous item
  //     y: this.targetRotation, // Set the target rotation angle
  //     duration: 0.5, // Duration of the animation
  //     ease: "back.out(1.2)", // Add gentle snap-to effect
  //     onComplete: () => { // Callback when the animation is complete
  //       this.currentIndex = prevIndex; // Update the current index to the previous index
  //       this.isAnimating = false; // Reset animating flag when animation is complete
  //     }
  //   });
  //   // Highlight new item
  //   this.selectItem(prevIndex, true); // Select the previous item with animation
  // }
  /**
  * Selects and animates the carousel to the previous item.
  * Calculates the previous index and calls selectItem to handle the animation and state update.
  */
  goToPrev() {
    // Prevent interaction if already animating
    if (this.isAnimating) return;

    // In goToNext() and goToPrev()
    const gsapAvailable = typeof gsap !== 'undefined' && gsap !== null;
    if (!gsapAvailable) {
      // Fallback to direct property setting without animation
      const nextIndex = (this.currentIndex + 1) % this.items.length;
      const angleStep = (2 * Math.PI) / this.items.length;
      this.targetRotation = -nextIndex * angleStep;
      this.itemGroup.rotation.y = this.targetRotation;
      this.currentIndex = nextIndex;
      this.applyHighlightVisuals(this.currentIndex);
      return;
    }

    const prevIndex = (this.currentIndex - 1 + this.items.length) % this.items.length; // Calculate the previous index, wrapping around
    // REMOVED: Internal GSAP animation and targetRotation calculation.
    this.selectItem(prevIndex, true); // Delegate animation and highlight to selectItem
  }

  /**
   * Retrieves the item currently selected in the carousel.
   * @returns {object} The item object located at the current index within the items array.
   */
  getCurrentItem() { // Get the currently selected item
    return this.items[this.currentIndex]; // Return the item at the current index
  }

  /**
   * Handles resizing of the carousel for responsive layouts.
   * This method should be invoked by the parent component whenever the window size changes
   * to ensure the carousel adjusts its dimensions and layout accordingly.
   */
  resize() {
    // Update for responsive layout
    // This would be called by the parent component when window resizes
  }
}