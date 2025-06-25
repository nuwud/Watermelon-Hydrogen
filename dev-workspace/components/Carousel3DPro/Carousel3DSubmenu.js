import * as THREE from 'three'; // Import Three.js core
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'; // Import TextGeometry for 3D text rendering
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'; // Import FontLoader for loading fonts
// Removed unused imports: getGlowShaderMaterial, getOpacityFadeMaterial, defaultCarouselStyle
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // Import GLTFLoader for loading 3D models
// Access GSAP from the global scope
import gsap from 'gsap'; // Import GSAP for animations
// Import the utility
import { SelectionGuard, withSelectionLock } from './modules/selectionGuards.js';
import { FloatingPreview } from './modules/FloatingPreview.js'; // Import the FloatingPreview module

// Cache font to improve performance
let cachedFont = null; // Cache for font to avoid loading multiple times
export class Carousel3DSubmenu extends THREE.Group { // Class definition for Carousel3DSubmenu
  /**
   * @description Constructor for the Carousel3DSubmenu class. Initializes the submenu,
   *              sets up its properties, loads necessary assets like fonts (using caching),
   *              creates the 3D representations of the submenu items, positions the submenu
   *              relative to its parent item, and adds fixed UI elements like a close button.
   * @param {THREE.Object3D} parentItem - The parent 3D object (likely a Carousel3DItem)
   *                                     to which this submenu is attached. Used for
   *                                     positioning and reference.
   * @param {Array<Object>} [items=[]] - An array of data objects representing the items
   *                                     to be displayed in the submenu. Each object
   *                                     should contain the necessary data to create its 3D representation.
   * @param {Object} [config={}] - Configuration options for customizing the submenu's
   *                               appearance and behavior (e.g., radius, rotation speed, styling).
   */
  constructor(parentItem, items = [], config = {}) { // Call parent constructor
    super(); // Call parent constructor
    console.warn('[Carousel3DSubmenu] 🚀 Constructor called with', {
      parentExists: !!parentItem,
      itemCount: items.length,
      hasConfig: !!config
    });

    // Set name for easier debugging
    this.name = "Carousel3DSubmenu";

    this.parentItem = parentItem; // Reference to the parent item this submenu is attached to
    this.items = items; // Array of items to display in the submenu
    this.config = config; // Configuration options for the submenu
    this.itemMeshes = []; // Array to hold THREE.Group containers for each item
    this.currentIndex = 0; // Currently selected item index
    this.watermillRadius = 1.2; // Radius of the submenu cylinder
    //this.mainCarouselHomeAngle = config.mainCarouselHomeAngle || 0; // Home angle of the main carousel
    this.mainCarouselHomeAngle = typeof config.mainCarouselHomeAngle === 'number'
      ? config.mainCarouselHomeAngle
      : 0;
    this.rotationAngle = 0; // Current rotation angle of the submenu
    this.targetRotation = 0; // Target rotation angle for smooth animations
    this.rotationSpeed = 0.15; // Increased for smoother rotation
    this.isInitialized = false; // Track initialization state
    this.showingPreview = false; // Track if preview is currently being shown
    this.lastParentRotation = 0; // Initialize to track parent rotation
    // this.isForceHighlightLocked = false; // Keep commented or remove if selectItemLock replaces it
    this.selectItemLock = false; // <<< FIX 1: Add selectItemLock flag
    this.selectionInProgress = false; // NEW FLAG
    this.forceLockedIndex = null; // <<< FIX 1: Add forceLockedIndex flag
    this.targetRotationLocked = false; // <<< BONUS FIX: Add targetRotation lock flag
    this.isTransitioning = false; // Global flag to track any selection or transition animation
    this.forceSelectLock = false; // 1. Add lock property
    // Create container for items to rotate
    this.itemGroup = new THREE.Group(); // Create a group to hold all items
    this.add(this.itemGroup); // Add the item group to the main group
    // Load font from CDN directly
    this.fontLoader = new FontLoader(); // Create a new FontLoader instance
    // CRITICAL: Force visibility flag on from the start
    this.visible = true;
    // Initialize the preview manager to null (will be created when needed)
    this.previewManager = null;
    // Try to use cached font first for instant creation
    if (cachedFont) { // Check if font is already cached
      this.font = cachedFont; // Use cached font if available
      console.warn('[Carousel3DSubmenu] Using cached font');
      this.createItems(); // Create items using the cached font
      this.isInitialized = true; // Track initialization state
      console.warn('[Carousel3DSubmenu] Items created from cached font:', this.itemMeshes.length);

      // Position wheel so first item is at front
      if (this.itemMeshes.length > 0) { // Check if there are items created
        const firstItem = this.itemMeshes[0]; // Get the first item mesh
        this.itemGroup.rotation.x = -firstItem.userData.angle + 0; // Set rotation to position first item at front
        this.targetRotation = this.itemGroup.rotation.x; // Set target rotation to match

        // Ensure the first item is highlighted
        this.currentIndex = 0;
        this.highlightItemAtIndex(0);
      }
    } else {
      // Improved font loading with fallbacks and better error handling
      console.warn('[Carousel3DSubmenu] Loading font...');

      // Array of font paths to try in order
      const fontPaths = [
        '/helvetiker_regular.typeface.json',
        '/fonts/helvetiker_regular.typeface.json',
        '/assets/fonts/helvetiker_regular.typeface.json',
        'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', // CDN fallback
        '/public/helvetiker_regular.typeface.json' // Try public folder
      ];

      // Try to load fonts in sequence
      this.loadFontWithFallbacks(fontPaths, 0);
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

    // Replace individual flags with a guard instance
    // CRITICAL: Initialize the guard properly
    // Check if config contains a guard, otherwise create a new one
    if (config.guard instanceof SelectionGuard) {
      // Use provided guard (preferred)
      this.guard = config.guard;
      console.warn('[Carousel3DSubmenu] Using provided SelectionGuard');
    } else {
      // Create new guard as fallback
      this.guard = new SelectionGuard();
      console.warn('[Carousel3DSubmenu] Created new SelectionGuard');
    }
  }

  /**
   * Initialize the preview manager when needed
   */
  initPreviewManager() {
    if (!this.scene || !this.camera) {
      console.warn('[Carousel3DSubmenu] Cannot initialize preview manager: missing scene or camera');
      return;
    }

    if (this.previewManager) {
      return; // Already initialized
    }

    this.previewManager = new FloatingPreview({
      scene: this.scene,
      camera: this.camera,
      anchorObject: this.config.carousel?.itemGroup || null,
      getPreviewContent: (index) => {
        if (index < 0 || index >= this.itemMeshes.length) return null;

        const sourceContainer = this.itemMeshes[index];
        const sourceIcon = sourceContainer?.userData?.iconMesh;
        const item = this.items[index];

        // Clone icon if available
        let icon = null;
        if (sourceIcon) {
          if (sourceIcon instanceof THREE.Group) {
            icon = sourceIcon.clone(true);
            // Add emissive effects to materials in the group
            icon.traverse(child => {
              if (child.isMesh && child.material) {
                child.material = child.material.clone();
                child.material.emissive = new THREE.Color(this.getIconColor(index));
                child.material.emissiveIntensity = 0.3;
                child.material.needsUpdate = true;
              }
            });
          } else if (sourceIcon instanceof THREE.Mesh) {
            const clonedGeometry = sourceIcon.geometry.clone();
            const clonedMaterial = sourceIcon.material.clone();
            clonedMaterial.emissive = new THREE.Color(this.getIconColor(index));
            clonedMaterial.emissiveIntensity = 0.5;
            icon = new THREE.Mesh(clonedGeometry, clonedMaterial);
          }
        }

        // Create text label if font is loaded
        let text = null;
        if (this.font) {
          const labelString = item.label || item || `Item ${index}`;
          const textGeometry = new TextGeometry(labelString, {
            font: this.font,
            size: 0.3,
            depth: 0.1,
            height: 0.05,
            bevelEnabled: true,
            bevelThickness: 0.01,
            bevelSize: 0.005,
            bevelOffset: 0,
            bevelSegments: 3,
            curveSegments: 8
          });
          textGeometry.computeBoundingBox();
          textGeometry.center();

          const textMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x99ccff,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.9
          });

          text = new THREE.Mesh(textGeometry, textMaterial);
          text.scale.set(0.75, 0.75, 0.75);
          text.updateMatrixWorld();
        }

        return { icon, text };
      }
    });

    console.warn('[Carousel3DSubmenu] Preview manager initialized');
  }

  /**
   * Attempts to load fonts from multiple paths in sequence until one succeeds
   * @param {Array<string>} paths - Array of font file paths to try
   * @param {number} index - Current index to try
   */
  loadFontWithFallbacks(paths, index) {
    if (index >= paths.length) {
      console.error('[Carousel3DSubmenu] All font loading attempts failed! Using emergency fallback.');
      // Emergency fallback: Create basic geometry instead of text
      this.createFallbackItems();
      return;
    }

    console.warn(`[Carousel3DSubmenu] Attempting to load font from: ${paths[index]}`);

    this.fontLoader.load(
      paths[index],
      (font) => {
        console.warn('[Carousel3DSubmenu] Font loaded successfully!');
        cachedFont = font;
        this.font = font;
        this.createItems();
        console.warn('[Carousel3DSubmenu] Items created:', this.itemMeshes.length);
        this.isInitialized = true;

        // Position wheel
        if (this.itemMeshes.length > 0) {
          const firstItem = this.itemMeshes[0];
          this.itemGroup.rotation.x = -firstItem.userData.angle + this.mainCarouselHomeAngle;
          this.targetRotation = this.itemGroup.rotation.x;
        } else {
          console.error('[Carousel3DSubmenu] No items were created after font loaded!');
        }
      },
      (progress) => {
        // Track loading progress
        console.log(`[Carousel3DSubmenu] Font loading: ${Math.round(progress.loaded / progress.total * 100)}%`);
      },
      (error) => {
        console.warn(`[Carousel3DSubmenu] Font loading failed for ${paths[index]}:`, error);
        // Try next font in the sequence
        this.loadFontWithFallbacks(paths, index + 1);
      }
    );
  }

  /**
   * Creates fallback menu items using basic geometry when font loading fails
   */
  createFallbackItems() {
    console.warn('[Carousel3DSubmenu] Creating fallback items without text geometry');

    this.items.forEach((item, index) => {
      // Create a container for the item
      const container = new THREE.Group();
      container.userData.index = index;
      container.userData.isSubmenuItem = true;
      container.userData.item = item;

      // Calculate angle for positioning
      const angle = (index / this.items.length) * (Math.PI * 2);
      container.userData.angle = angle;
      container.userData.originalAngle = angle;

      // Create a simple colored plane instead of text
      const planeGeometry = new THREE.PlaneGeometry(1, 0.3);
      const material = new THREE.MeshBasicMaterial({
        color: this.config.textColor || 0xffffff,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(planeGeometry, material);
      mesh.userData.originalScale = mesh.scale.clone();
      mesh.userData.originalColor = material.color.clone();
      container.add(mesh);
      container.userData.mesh = mesh;

      // Create a simple icon
      const iconGeometry = new THREE.SphereGeometry(0.1, 16, 16);
      const iconMaterial = new THREE.MeshBasicMaterial({
        color: this.getIconColor(index),
        transparent: true,
        opacity: 0.9
      });

      const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
      iconMesh.position.x = -0.7; // Position to left of text plane
      iconMesh.userData.originalScale = iconMesh.scale.clone();
      container.add(iconMesh);
      container.userData.iconMesh = iconMesh;

      // Add hit area
      const hitAreaGeometry = new THREE.BoxGeometry(1.5, 0.5, 0.3);
      const hitAreaMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.01,
        depthWrite: false
      });

      const hitArea = new THREE.Mesh(hitAreaGeometry, hitAreaMaterial);
      hitArea.position.z = -0.1;
      container.add(hitArea);
      container.userData.hitArea = hitArea;

      // Position in circle
      container.position.y = this.watermillRadius * Math.sin(angle);
      container.position.z = this.watermillRadius * Math.cos(angle);

      // Add to arrays and scene
      this.itemMeshes.push(container);
      this.itemGroup.add(container);
    });

    // Finalize initialization
    this.isInitialized = true;

    // Highlight first item
    if (this.itemMeshes.length > 0) {
      this.selectItem(0, false);
    }
  }

  /**
 * @function addCloseButtonPlaceholder
 * @description Creates and adds a 3D placeholder mesh representing a close button to the scene.
 * This function initializes a red cylindrical mesh (`THREE.Mesh`) with specific material properties
 * (red color, transparency, emissive glow) to serve as the base for the close button.
 * It positions the button in the top corner, sets its initial scale, and assigns a high `renderOrder`
 * to ensure it's rendered on top of other elements.
 * User data (`userData`) is added to the mesh, including a flag `isCloseButton` for identification,
 * the original color, and a hover color for interaction feedback.
 * It then calls `createCloseButtonX` to add the "X" symbol geometry to the button.
 * Finally, the complete close button mesh is added to the `this.fixedElements` group,
 * which likely keeps elements fixed relative to the camera or view.
 * @memberof Carousel3DSubmenu
 */
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

  /**
   * Creates the visual representation of the close button ('X') using two thin THREE.BoxGeometry meshes.
   * These meshes are styled with a white, emissive material for visibility.
   * They are rotated by +/- 45 degrees and positioned slightly above the main button surface to form an 'X'.
   * The created line meshes are added as children to the `this.closeButton` object and marked with
   * `userData.isCloseButton = true` for interaction handling. The lines are also stored in
   * `this.closeButton.userData.xLines` for potential future reference.
   */
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

  /**
   * Determines the index of the item currently positioned closest to the front
   * (0 radians or 3 o'clock position) in the 3D carousel.
   * It iterates through all item meshes, calculates their effective angle considering
   * the group's rotation, and finds the item with the smallest angular difference
   * from the 0 radian position (front).
   *
   * @returns {number} The index (`userData.index`) of the item mesh closest to the
   * front position. Returns -1 if there are no item meshes in the carousel.
   */
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

  /**
   * Gets a color from a predefined palette based on the provided index.
   * The color is determined by the index modulo the number of colors in the palette,
   * ensuring that the index wraps around the available colors.
   *
   * @param {number} index - The index to determine the color.
   * @returns {number} The hexadecimal color code corresponding to the index.
   */
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

  /**
   * Creates and arranges the 3D objects (text and icons) for each submenu item.
   *
   * This method iterates through the `this.items` array, generating a 3D text mesh
   * and an associated icon mesh for each item. It handles special icon creation
   * logic for items under the 'Gallery' parent and asynchronously loads a GLTF model
   * for the 'Cart' item. Regular items receive procedurally generated geometric shapes
   * as icons.
   *
   * Each item (text + icon) is placed within a `THREE.Group` container, which also
   * includes an invisible `THREE.BoxGeometry` acting as a larger, more robust hit area
   * for raycasting interactions.
   *
   * The containers are positioned in a circular arrangement around a central point,
   * determined by `this.watermillRadius`. User data, including the item index, name,
   * angle, mesh references, and initial animation properties, is stored on the container's
   * `userData` object.
   *
   * Initial scales for text, icons (except the async 'Cart'), and hit areas are set to zero
   * to facilitate entry animations. The generated item containers are added to the
   * `this.itemMeshes` array and the `this.itemGroup` scene object.
   *
   * Finally, if items were created, it selects the first item in the submenu.
   *
   * @function createItems
   * @memberof Carousel3DSubmenu
   * @instance
   * @requires THREE - Requires the THREE.js library for 3D object creation.
   * @requires TextGeometry - Requires THREE.TextGeometry for creating 3D text.
   * @requires GLTFLoader - Requires THREE.GLTFLoader for loading the 'Cart' model.
   * @requires gsap - Requires GSAP for animations, particularly for the 'Cart' icon.
   * @description Relies on `this.font` being loaded, `this.items` containing the submenu item names,
   *   `this.parentItem` to check for 'Gallery', `this.config` for styling, `this.watermillRadius`
   *   for positioning, and updates `this.itemMeshes` and `this.itemGroup`. Calls `this.selectItem`.
   * @returns {void} - This method does not return a value but modifies the instance's state.
   */
  createItems() { // Ensure font is loaded before creating items
    console.warn('[Carousel3DSubmenu] 📦 Creating items, font available:', !!this.font);

    if (!this.font) {
      console.warn('[Carousel3DSubmenu] ⚠️ No font available, cannot create items');
      return;
    }
    // Special handling for Gallery items - create more elaborate 3D models
    const isGallerySubmenu = this.parentItem.userData?.item === 'Gallery'; // Check if parent item is tagged as Gallery
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
    };    this.items.forEach((item, index) => { // Iterate through each item in the submenu
      // Handle both string items and enriched object items
      const itemTitle = typeof item === 'object' ? item.title : item;
      
      // Create text geometry using the display name
      const geometry = new TextGeometry(itemTitle, { // Create text geometry using the loaded font
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
      container.add(hitArea); // Add the hit area to the container      // Determine which shape/icon to use
      let iconMesh = null; // Initialize iconMesh to null
      const iconOffset = Math.max(0.7, textWidth * 0.25); // Calculate offset
      let baseScale = new THREE.Vector3(1, 1, 1); // Default base scale
      
      // Check if item has enriched shape data from content manager
      const itemName = typeof item === 'object' ? item.name : item;
      const itemShape = typeof item === 'object' ? item.shape : null;
      
      console.warn(`[Carousel3DSubmenu] Creating icon for item: ${itemName}, shape: ${itemShape}`);
      
      if (itemShape && itemShape !== 'null' && itemShape !== 'undefined') {
        // Use the shape from content manager - load GLB model
        const loader = new GLTFLoader();
        const modelPath = `/assets/models/${itemShape}.glb`;
        
        console.warn(`[Carousel3DSubmenu] Loading GLB model: ${modelPath}`);
        
        loader.load(modelPath, (gltf) => {
          const model = gltf.scene;
          baseScale.set(0.3, 0.3, 0.3); // Set consistent scale for all GLB models
          model.scale.copy(baseScale);
          model.userData.originalScale = baseScale.clone();
          model.position.x = -textWidth / 2 - iconOffset;
          model.userData.isContentManagerIcon = true;
          model.userData.shapeName = itemShape;
          container.add(model);
          container.userData.iconMesh = model;
          
          // Apply material and color styling
          model.traverse((child) => {
            if (child.isMesh) {
              child.material = child.material.clone();
              child.material.emissive = new THREE.Color(this.getIconColor(index));
              child.material.emissiveIntensity = 0.3;
              child.material.needsUpdate = true;
            }
          });
          
          // Animate icon scale after loading
          if (!this.isBeingDisposed && this.visible) {
            const isHighlighted = container.userData.index === this.currentIndex;
            const multiplier = isHighlighted ? 1.3 : 1.0;
            gsap.set(model.scale, { x: 0, y: 0, z: 0 }); // Start invisible
            gsap.to(model.scale, {
              x: model.userData.originalScale.x * multiplier,
              y: model.userData.originalScale.y * multiplier,
              z: model.userData.originalScale.z * multiplier,
              duration: 0.3,
              ease: 'elastic.out',
            });
            
            // Apply highlight animation if needed
            if (isHighlighted && model) {
              gsap.killTweensOf(model.rotation);
              gsap.timeline()
                .to(model.rotation, {
                  y: Math.PI * 2, x: Math.PI * 0.8, z: Math.PI * 0.3,
                  duration: 1.0, ease: "power1.inOut"
                })
                .to(model.rotation, {
                  x: 0, z: 0, duration: 0.3, ease: "back.out(2)"
                }, "-=0.1");
            }
          }
          
          console.warn(`[Carousel3DSubmenu] ✅ GLB model loaded: ${modelPath}`);
        }, undefined, (error) => {
          console.warn(`[Carousel3DSubmenu] ⚠️ Failed to load GLB model ${modelPath}:`, error);
          // Fallback to regular shape
          this.createFallbackIcon(container, index, textWidth, iconOffset, baseScale);
        });
      } else if (itemName === 'Cart') {
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
              duration: 0.3, // Duration of the animation
              ease: 'elastic.out', // Elastic easing for a bouncy effect
            });
            // If this item is highlighted when loaded, apply spin
            if (isHighlighted && model) { // Add model check
              gsap.killTweensOf(model.rotation); // Stop any existing rotation animations
              gsap.timeline() // Create a new timeline for sequential animations
                .to(model.rotation, { // Rotate to initial position
                  y: Math.PI * 2, x: Math.PI * 0.8, z: Math.PI * 0.3, // Rotate to a specific position
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
      const angle = (index / this.items.length) * (Math.PI * 2); // Calculate angle for positioning
      // Position in a circle around the parent
      container.position.y = this.watermillRadius * Math.sin(angle); // Position along the Y axis based on angle
      container.position.z = this.watermillRadius * Math.cos(angle); // Position along the Z axis based on angle
      // Store data with the container
      container.userData = { // Store additional data in userData for easy access
        index, // Store the index of the item
        isSubmenuItem: true, // Flag to identify submenu items
        item, // Store the item name
        angle, // Store the calculated angle for positioning
        mesh, // Store the actual mesh for this item
        hitArea, // Store the hit area mesh for this item
        originalAngle: angle, // Store the original angle for reference
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
    // Log results
    console.warn(`[Carousel3DSubmenu] 📦 Created ${this.itemMeshes.length} items`);
    // Highlight first item
    if (this.itemMeshes.length > 0) { // Check if there are items created
      this.selectItem(0, false); // <--- The call
      console.warn('[Carousel3DSubmenu] 🎯 Selected first item');
      // Don't create floating preview automatically
    }
  }

  /**
   * Handles mouse wheel events to rotate items around the fixed 3 o'clock position.
   * @param {WheelEvent} event - The wheel event
   */
  handleWheel(event) {
    event.preventDefault();

    // Skip if animations or transitions are in progress
    if (this.isAnimating || this.selectItemLock ||
      this.forceLockedIndex !== null || this.isTransitioning) {
      return;
    }

    // Determine scroll direction
    const scrollDir = event.deltaY > 0 ? 1 : -1;

    // Calculate angle between items
    const angleStep = (2 * Math.PI) / this.itemMeshes.length;
    //const currentAngle = this.targetRotation % (2 * Math.PI); // Normalize current rotation, use like this: this.targetRotation % (2 * Math.PI); 
    // Adjust target rotation - items rotate behind the fixed 3 o'clock position 
    this.targetRotation += scrollDir * angleStep;
    // this.targetRotation % (2 * Math.PI);
    this.targetRotation = this.targetRotation % (2 * Math.PI);
    this.isAnimating = true;

    // Clear any pending preview
    if (this.floatingPreview && this.showingPreview) {
      this.closeFloatingPreview();
    }
    gsap.killTweensOf(this.itemGroup.rotation); // Prevent multiple simultaneous spins

    // Animate to new position
    gsap.to(this.itemGroup.rotation, {
      x: this.targetRotation,
      duration: 0.3,
      ease: "power3.out",
      onUpdate: () => {
        if (!this.selectItemLock && !this.isTransitioning && this.forceLockedIndex === null) {
          // It's safe to allow geometric highlight updates
          // Determine which item is now at the front position
          const frontIndex = this.getFrontIndex();
          // Check if the front index is valid and not the same as the current index
          // Also check if the index is not locked
          // and if the target rotation is not locked
          // Only highlight if not locked
          if (frontIndex !== -1 && frontIndex !== this.currentIndex &&
            !this.forceLockedIndex && !this.targetRotationLocked) {
            // Update current index and apply highlighting
            this.currentIndex = frontIndex;
            this.highlightItemAtIndex(frontIndex);
          }
        }
      },
      onComplete: () => {
        this.isAnimating = false;
        if (!this.selectItemLock && !this.isTransitioning && this.forceLockedIndex === null) {
          // Get final front index after animation
          const frontIndex = this.getFrontIndex(); // Determine which item is now at the front position
          if (frontIndex !== -1 && frontIndex !== this.currentIndex) { // Only update if the front index has changed
            this.currentIndex = frontIndex; // Update current index to the new front index
            this.highlightItemAtIndex(frontIndex);
          }
        }
      }
    });
  }

  /**
   * Applies visual highlighting to the item at the specified index.
   * @param {number} index - The index to highlight
   */
  highlightItemAtIndex(index) {
    // Skip if index is invalid
    if (index < 0 || index >= this.itemMeshes.length) return;

    // Remove highlight from all items first
    this.itemMeshes.forEach((container, i) => {
      if (i === index) return; // Skip the one we're highlighting

      const mesh = container.userData.mesh;
      const iconMesh = container.userData.iconMesh;

      if (mesh && mesh.userData && mesh.userData.originalColor) {
        // Revert to original values without changing opacity
        mesh.material.color.copy(mesh.userData.originalColor);
        mesh.material.emissive.set(0x000000);
        mesh.scale.copy(mesh.userData.originalScale);
      }

      if (iconMesh) {
        const iconOriginal = iconMesh.userData.originalScale || new THREE.Vector3(1, 1, 1);
        iconMesh.scale.copy(iconOriginal);

        // Reset rotation if not actively animating
        if (iconMesh && !gsap.isTweening(iconMesh.rotation)) {
          iconMesh.rotation.set(0, 0, 0);
        }
      }
    });

    // Apply highlight to the target item
    const container = this.itemMeshes[index];
    const mesh = container.userData.mesh;
    const iconMesh = container.userData.iconMesh;

    if (mesh) {
      mesh.material.color.set(this.config.highlightColor || 0x00ffff);
      mesh.material.emissive.set(0x003333);
      mesh.scale.set(
        mesh.userData.originalScale.x * 1.3,
        mesh.userData.originalScale.y * 1.3,
        mesh.userData.originalScale.z * 1.3
      );
    }

    if (iconMesh) {
      const iconOriginal = iconMesh.userData.originalScale || new THREE.Vector3(1, 1, 1);
      iconMesh.scale.set(
        iconOriginal.x * 1.3,
        iconOriginal.y * 1.3,
        iconOriginal.z * 1.3
      );
    }
  }

  /**
   * Selects an item in the 3D carousel by its index.
   * 
   * @param {number} index - The index of the carousel item to select.
   * @param {boolean} [animate=true] - Whether to animate the transition to the selected item.
   * @param {boolean} [createPreview=false] - Whether to create and display a floating preview of the selected item.
   * 
   * @description
   * This method handles the selection of an item in the 3D carousel, including:
   * - Rotating the carousel to center the selected item (determined by angle)
   * - Applying visual effects to highlight the selected item (scaling, color changes)
   * - Animating the icon of the selected item
   * - Reverting previous item to its original state
   * - Tracking the current selection state
   * 
   * The method prevents selection if the provided index is out of bounds.
   * During transition, selection is locked to prevent multiple simultaneous selections.
   * The method also handles the creation of a floating preview for the selected item,
   * which is displayed in the scene.
   * 
   * @returns {void}
   * @throws {Error} If the index is out of bounds.
   * 
   * @example
   * // Select the first item in the carousel with animation and preview
   * carousel.selectItem(0, true, true);
   *   
   * 
   */
  selectItem(index, animate = true, createPreview = false) {
    // Check if selection is already in progress
    if (this.selectionInProgress) {
      console.warn("[🧩 selectItem] Blocked: selection already in progress");
      return;
    }

    this.selectionInProgress = true; // Lock

    if (index < 0 || index >= this.itemMeshes.length) {
      this.selectionInProgress = false; // Release lock if invalid index
      return;
    }

    // Double-check that guard exists and is valid
    if (!this.guard || typeof this.guard.lockSelection !== 'function') {
      console.error('[Carousel3DSubmenu] Invalid guard in selectItem, creating new one');
      this.guard = new SelectionGuard();
    }

    // Use the guard utility for locking
    return withSelectionLock(this.guard, index, () => {
      const selected = this.itemMeshes[index];
      const selectedAngle = selected.userData.angle;
      const currentAngle = this.itemGroup.rotation.x;
      const desiredAngle = selectedAngle + this.mainCarouselHomeAngle;

      const twoPi = Math.PI * 2;
      let delta = ((desiredAngle - currentAngle + Math.PI) % twoPi) - Math.PI;
      const target = currentAngle + delta;

      if (this.currentIndex !== index && this.itemMeshes[this.currentIndex]) {
        const prev = this.itemMeshes[this.currentIndex];
        const mesh = prev.userData.mesh;
        const icon = prev.userData.iconMesh;

        // Restore previous item appearance - keep it simple
        if (mesh) {
          mesh.material.color.copy(mesh.userData.originalColor);
          mesh.material.emissive.set(0x000000);

          gsap.to(mesh.scale, {
            ...mesh.userData.originalScale,
            duration: 0.3
          });
        }

        if (icon) {
          gsap.to(icon.scale, {
            ...icon.userData.originalScale,
            duration: 0.3
          });

          gsap.killTweensOf(icon.rotation);
          gsap.set(icon.rotation, { x: 0, y: 0, z: 0 });
        }
      }

      const mesh = selected.userData.mesh;
      const icon = selected.userData.iconMesh;

      // Enhance selected item appearance - keep it simple
      if (mesh) {
        mesh.material.color.set(this.config.highlightColor || 0x00ffff);
        mesh.material.emissive.set(0x003333);

        gsap.to(mesh.scale, {
          x: mesh.userData.originalScale.x * 1.3,
          y: mesh.userData.originalScale.y * 1.3,
          z: mesh.userData.originalScale.z * 1.3,
          duration: 0.3
        });
      }

      if (icon) {
        const s = icon.userData.originalScale || new THREE.Vector3(1, 1, 1);

        // Scale up with a bouncy effect
        gsap.to(icon.scale, {
          x: s.x * 1.3,
          y: s.y * 1.3,
          z: s.z * 1.3,
          duration: 0.3,
          ease: "back.out"
        });

        // Do the geodesic spin animation
        gsap.killTweensOf(icon.rotation);
        gsap.timeline()
          .to(icon.rotation, {
            x: Math.PI * 0.8,
            y: Math.PI * 2,
            z: Math.PI * 0.5,
            duration: 1,
            ease: "power1.inOut"
          })
          .to(icon.rotation, {
            x: 0,
            z: 0,
            duration: 0.3,
            ease: "back.out(2)"
          }, "-=0.1");
      }

      const finish = () => {
        this.currentIndex = index;
        this.selectItemLock = false;
        this.forceLockedIndex = null;
        this.isTransitioning = false;
        this.targetRotation = target;
        this.selectionInProgress = false; // Release lock
      };

      if (animate) {
        gsap.to(this.itemGroup.rotation, {
          x: target,
          duration: 0.6,
          ease: "power2.out",
          onComplete: finish
        });
      } else {
        this.itemGroup.rotation.x = target;
        finish();
      }

      if (createPreview) {
        this.showingPreview = true;

        // Initialize preview manager if needed
        if (!this.previewManager) {
          this.initPreviewManager();
        }

        // Create preview
        if (this.previewManager) {
          this.previewManager.create(index);
        }
      }

      this.lastSelectTimestamp = Date.now();

      console.warn(`[🧩 selectItem] Finalized selection: index=${index}, angle=${selectedAngle.toFixed(2)}, target=${target.toFixed(2)}`);
    }, { lockRotation: true });
  }

  /**
   * Scrolls the 3D carousel submenu vertically based on the provided delta.
   *
   * This function handles user input (like mouse wheel or touch gestures) to rotate the carousel.
   * It includes checks to prevent scrolling during other animations or when the carousel state is locked
   * (e.g., during item selection via `selectItemLock`, forced index lock via `forceLockedIndex`,
   * general transitions via `isTransitioning`, or target rotation lock via `targetRotationLocked`).
   * If any lock is active, a warning is logged, and the function returns early.
   *
   * The rotation amount per scroll step (`angleStep`) is calculated based on the total number of items.
   * The `targetRotation` is adjusted based on the sign of the `delta` and the `angleStep`.
   * GSAP is used to animate the `itemGroup.rotation.x` smoothly to the `targetRotation`
   * with a duration of 0.5 seconds and a 'power3.out' easing function.
   *
   * During the animation (`onUpdate`), the `updateFrontItemHighlight` method is called continuously
   * to keep the visually frontmost item highlighted.
   * On animation completion (`onComplete`), the `isAnimating` flag is cleared, `updateFrontItemHighlight`
   * is called again to ensure the final state is correct, and the `updateFloatingPreview` method
   * is called *only* if a preview was already being shown (`showingPreview` is true).
   *
   * @param {number} delta - A value indicating the scroll direction.
   *                         A positive value scrolls in one direction (adjusting `targetRotation` by `-angleStep`),
   *                         and a negative value scrolls in the opposite direction (adjusting `targetRotation` by `+angleStep`).
   * @returns {void} - This function does not return a value.
   */
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
      duration: 0.3, // Slightly longer for smoother motion
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

  /**
   * @function show
   * @description Makes the 3D submenu visible and animates its appearance.
   * This involves setting the visibility flag, animating the close button,
   * positioning and highlighting the first item, animating the entire submenu group
   * into view (scale and rotation), and animating each individual item (text and icon)
   * with staggered delays and scaling effects. The highlighted item receives special
   * scaling and a unique "geodesic spin" animation for its icon.
   *
   * @modifies this.visible - Sets to true.
   * @modifies this.closeButton - Resets scale and animates it in.
   * @modifies this.itemGroup - Sets initial rotation, animates scale and rotation.
   * @modifies this.targetRotation - Sets based on the first item's angle.
   * @modifies this.currentIndex - Sets to 0.
   * @modifies this.itemMeshes - Modifies scale, rotation, and material properties of contained meshes and icons.
   * @sideEffects Initiates multiple GSAP animations for the close button, item group, and individual items/icons. Logs the selected icon mesh to the console. Ensures the first item is immediately positioned and highlighted before animations begin.
   * @see {@link https://greensock.com/gsap/|GSAP} for animation details.
   */
  show() {
    console.warn('[Carousel3DSubmenu] 🎭 Show method called');

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
    } else {
      console.warn('[Carousel3DSubmenu] ⚠️ No item meshes available during show()');

      // Try to create items if they don't exist but we have a font
      if (this.font && !this.isInitialized) {
        console.warn('[Carousel3DSubmenu] 🛠️ Attempting to create items in show()');
        this.createItems();
        console.warn('[Carousel3DSubmenu] Created itemMeshes:', this.itemMeshes.length);
      }
    }
    // Make sure entire submenu appears with a smooth animation
    if (this.itemGroup) { // Check if itemGroup exists
      // Start with a smaller scale
      this.itemGroup.scale.set(0.1, 0.1, 0.1); // Start with a smaller scale
      // Animate to full size
      gsap.to(this.itemGroup.scale, { // Animate to full size
        x: 1, y: 1, z: 1, // End at full scale
        duration: 0.3, // Duration of the animation
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
    console.warn('[Carousel3DSubmenu] 🎭 Show method completed');
  }

  /**
   * Hides the 3D submenu elements with animations.
   * First, it closes any active floating preview with an animation.
   * Then, it iterates through each item mesh and its corresponding icon mesh (if it exists),
   * animating their scales down to zero with a staggered delay using GSAP's `back.in` easing.
   * Finally, if a close button exists, it animates its scale down to zero as well.
   * Assumes the instance has `floatingPreview`, `closeFloatingPreview`, `itemMeshes`,
   * and `closeButton` properties/methods available.
   * Each item in `itemMeshes` is expected to have `userData` containing `mesh` and optionally `iconMesh`.
   */
  hide() {
    // Close preview
    if (this.previewManager) {
      this.previewManager.dispose();
    }
    this.showingPreview = false;

    // Hide menu items
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

  /**
   * Updates the state of the 3D submenu each frame.
   * This method is responsible for animating the submenu's rotation, positioning it relative
   * to its parent item in the main carousel, updating the appearance and position of individual
   * submenu items, orienting the close button, and managing the rotation of an optional
   * floating preview element.
   *
   * Key operations include:
   * 1.  **Smooth Rotation:** Gradually rotates the `itemGroup` (the wheel of items) towards `targetRotation` using a damped easing function for fluid motion. Snaps to the target when very close.
   * 2.  **Positioning & Orientation:** Sets the submenu's world position to match its `parentItem`. Aligns the submenu's Y-rotation with the combined rotation of the `parentItem` and the main carousel (parent's parent). Includes safety checks for valid parent data and matrices.
   * 3.  **Item State Management:**
   *     - Iterates through `itemMeshes`.
   *     - Resets the color, emissive properties, and scale of non-highlighted items and their icons to their original states.
   *     - Ensures item text containers remain upright by counter-rotating them against the `itemGroup`'s X-axis rotation.
   *     - Positions each item container along the circumference of the submenu wheel based on its angle.
   * 4.  **Close Button Orientation:** Orients the `closeButton` to face the camera's effective position within the submenu's local coordinate space.
   * 5.  **Floating Preview Synchronization:** Updates the `floatingPreview`'s rotation. It stops any automatic spinning and matches the parent carousel's rotation if the carousel is moving. If the carousel stops, it restarts the automatic spin animation.
   *
   * Includes top-level error handling to catch and log exceptions during the update process, setting an `isErrorState` flag to potentially prevent further issues in subsequent frames.
   * @method update
   * @memberof Carousel3DSubmenu
   * @returns {void} This method does not return a value.
   */
  /**
   * Updates the state and appearance of the 3D carousel submenu.
   * 
   * This method handles various tasks such as positioning the submenu relative to its parent,
   * resetting item states, ensuring proper rotations, and managing animations for floating previews.
   * It also includes error handling to prevent crashes during execution.
   * 
   * @method
   * @throws {Error} Logs any errors encountered during the update process and sets an error state flag.
   * 
   * @description
   * - Positions the submenu relative to its parent item and ensures proper alignment.
   * - Resets all item meshes to their default state unless they are the currently selected item.
   * - Ensures counter-rotation of items to keep them upright and properly positioned on the carousel.
   * - Updates the close button's orientation to face the camera.
   * - Manages the floating preview's rotation and spinning animation based on the parent carousel's rotation.
   * 
   * @example
   * // Example usage:
   * const submenu = new Carousel3DSubmenu();
   * submenu.update();
   * 
   * @property {Object} parentItem - The parent item of the submenu.
   * @property {Object} itemGroup - The group containing all items in the carousel.
   * @property {Array} itemMeshes - Array of item containers in the carousel.
   * @property {Object} closeButton - The close button element.
   * @property {Object} floatingPreview - The floating preview element.
   * @property {number} watermillRadius - The radius of the carousel for positioning items.
   * @property {number} rotationSpeed - The speed of rotation for animations.
   * @property {number} currentIndex - The index of the currently selected item.
   * @property {number} lastParentRotation - The last recorded rotation of the parent carousel.
   * @property {boolean} isSpinning - Indicates whether the floating preview is spinning.
   * @property {boolean} isErrorState - Indicates if the submenu is in an error state.
   */
update() {
  try {
    // ✳️ Sync this submenu's position and orientation to its parent in world space
    if (this.parentItem && this.parentItem.parent) {
      const parentWorldPos = new THREE.Vector3();
      this.parentItem.getWorldPosition(parentWorldPos);
      if (!isNaN(parentWorldPos.x)) {
        this.position.copy(parentWorldPos);
      }

      const parentRot = this.parentItem.rotation?.y;
      const grandParentRot = this.parentItem.parent.rotation?.y;
      if (!isNaN(parentRot)) {
        this.rotation.y = isNaN(grandParentRot) ? parentRot : grandParentRot + parentRot;
      }
    }

    // ✳️ Animate all item positions & reset any stale visuals
    if (this.itemMeshes?.length) {
      this.itemMeshes.forEach((container, i) => {
        if (!container?.userData) return;
        const mesh = container.userData.mesh;
        const iconMesh = container.userData.iconMesh;
        if (!mesh) return;

        // 🔁 Reset non-selected visuals
        if (i !== this.currentIndex && mesh.userData?.originalColor) {
          mesh.material.color.copy(mesh.userData.originalColor);
          mesh.material.emissive.set(0x000000);
          mesh.scale.copy(mesh.userData.originalScale);

          if (iconMesh) {
            const iconOriginal = iconMesh.userData.originalScale || new THREE.Vector3(1, 1, 1);
            iconMesh.scale.copy(iconOriginal);
            if (!gsap.isTweening(iconMesh.rotation)) {
              iconMesh.rotation.set(0, 0, 0);
            }
          }
        }

        // 🎯 Reposition based on angle
        container.rotation.x = -this.itemGroup.rotation.x;
        container.rotation.y = 0;
        container.position.y = this.watermillRadius * Math.sin(container.userData.angle);
        container.position.z = this.watermillRadius * Math.cos(container.userData.angle);
      });
    }

    // 🔒 Skip update if animation guard is active
    if (this.isAnimating) return;

    // 📐 Normalize angles to avoid over-rotation or drift
    const twoPi = Math.PI * 2;
    const normalize = angle => ((angle % twoPi) + twoPi) % twoPi;

    const current = normalize(this.itemGroup.rotation.x);
    const target = normalize(this.targetRotation);
    const diff = target - current;

    const threshold = 0.005;

    if (Math.abs(diff) > threshold) {
      this.itemGroup.rotation.x += diff * this.rotationSpeed;
      this.isSpinning = true;
    } else if (this.isSpinning) {
      this.itemGroup.rotation.x = this.targetRotation; // lock hard
      this.isSpinning = false;

      // 🛡️ Final override protection
      const recentlySelected = (Date.now() - (this.lastSelectTimestamp || 0)) < 500;

      if (
        !this.selectionInProgress &&
        !this.selectItemLock &&
        !this.forceLockedIndex &&
        !this.isTransitioning &&
        !this.targetRotationLocked &&
        !gsap.isTweening(this.itemGroup.rotation) &&
        !recentlySelected
      ) {
        const frontIndex = this.getFrontIndex();
        if (frontIndex !== -1 && frontIndex !== this.currentIndex) {
          console.log(`[🌀 highlight override] ${this.currentIndex} → ${frontIndex}`);
          this.currentIndex = frontIndex;
          this.highlightItemAtIndex(frontIndex);
        }
      }
    }

    // 🎨 Shader sync
    const currentMesh = this.itemMeshes?.[this.currentIndex];
    if (currentMesh?.material?.uniforms?.time) {
      currentMesh.material.uniforms.time.value = performance.now() * 0.001;
    }

    // ⛔ Close button alignment to camera
    if (this.closeButton) {
      const cameraPosWorld = new THREE.Vector3(0, 0, 10);
      this.closeButton.parent.worldToLocal(cameraPosWorld);
      this.closeButton.lookAt(cameraPosWorld);
      this.closeButton.rotateZ(Math.PI / 2);
    }

    // 🌀 Floating preview manager sync
    if (this.previewManager && this.parentItem?.parent) {
      if (this.parentItem.parent.rotation.y !== this.lastParentRotation) {
        this.previewManager.updateRotation(this.parentItem.parent.rotation.y);
      } else if (!this.isSpinning && this.showingPreview) {
        this.previewManager.startSpin();
      }
      this.lastParentRotation = this.parentItem.parent.rotation.y;
    }

  } catch (error) {
    console.error("Error in Carousel3DSubmenu update():", error);
    this.isErrorState = true;
  }
}


  /**
   * Updates the visual highlight for the carousel item designated as the "front" item.
   * This function determines which item should be highlighted, primarily based on
   * `this.forceLockedIndex` if it is set.
   *
   * The update is prevented under several conditions to avoid conflicts or unwanted
   * visual states:
   * - If highlighting is explicitly overridden (`this.ignoreHighlightOverride`).
   * - If the carousel is currently transitioning between states (`this.isTransitioning`).
   * - If an item selection operation is locked (`this.selectItemLock`).
   * - If an index is already forced (`this.forceLockedIndex !== null`).
   * - If the carousel is animating (`this.isAnimating`) and the `force` parameter is false.
   *
   * If `this.forceLockedIndex` is valid, the item at that index is selected for highlighting.
   * Note: The logic for finding the closest item based on angle appears to be commented out
   * in the provided snippet.
   *
   * @param {boolean} [force=false] - If true, the highlight update will proceed even if
   *   `this.isAnimating` is true. Defaults to `false`.
   * @returns {void}
   */
  updateFrontItemHighlight(force = false) { // Update the highlight of the item currently at the front (3 o'clock position)
    if (!this.guard.canUpdateHighlight(force)) return;

    // ... existing highlight logic ...
  }

  /**
   * Updates the current item based on the carousel's rotation.
   * Skips the update if a `forceSelectLock` is active, indicating
   * that an explicit selection (`selectItem`) is in progress.
   */
  updateCurrentItemFromRotation() { // <<< FIX 2: Add isBeingDisposed check
    // 3. & 4. Skip update if lock is active
    if (this.forceSelectLock) { // <<< FIX 2: Check if forceSelectLock is active
      return; // Skip update if selectItem is in progress
    }
  }

  // Clean disposal method to prevent memory leaks
  /**
   * Disposes of the Carousel3DSubmenu instance, cleaning up all associated resources.
   * This includes stopping animations, removing objects from the scene, disposing geometries
   * and materials to free up memory, and clearing internal references.
   * Prevents double disposal by checking `isDisposed` and `isBeingDisposed` flags.
   *
   * Steps involved:
   * 1. Sets `isBeingDisposed` flag.
   * 2. Kills all GSAP animations associated with the submenu items, icons, close button, and floating preview.
   * 3. Iterates through `itemMeshes`, removes them from their parent, and disposes their geometries and materials.
   * 4. Clears the `itemMeshes` array.
   * 5. Disposes the close button (if it exists), including its geometry, materials, and removes it from its parent. Clears the `closeButton` reference.
   * 6. Removes the submenu instance itself from its parent object.
   * 7. Resets the instance's local and world matrices.
   * 8. Disposes the floating preview (if it exists), including its geometry, materials, and removes it from its parent. Clears the `floatingPreview` reference.   * 9. Clears internal state references like `currentIndex`, `parentItem`, `itemGroup`, and `fixedElements`.
   * 10. Sets the `isDisposed` flag to true.
   */

  /**
   * Create a fallback icon when GLB loading fails
   */
  createFallbackIcon(container, index, textWidth, iconOffset, baseScale) {
    console.warn(`[Carousel3DSubmenu] Creating fallback icon for index ${index}`);
    
    // Define fallback shapes
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
    
    const shapeIndex = index % regularShapes.length;
    const shapeGeometry = regularShapes[shapeIndex]();
    const shapeMaterial = new THREE.MeshStandardMaterial({
      color: this.getIconColor(index),
      metalness: 0.3,
      roughness: 0.4,
      emissive: this.getIconColor(index),
      emissiveIntensity: 0.2
    });
    
    const iconMesh = new THREE.Mesh(shapeGeometry, shapeMaterial);
    iconMesh.position.x = -textWidth / 2 - iconOffset;
    iconMesh.userData.originalScale = baseScale.clone();
    container.add(iconMesh);
    container.userData.iconMesh = iconMesh;
    iconMesh.scale.set(0, 0, 0); // Start invisible for animation
    
    return iconMesh;
  }

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
    // Dispose of preview manager
    if (this.previewManager) {
      this.previewManager.dispose();
      this.previewManager = null;
    }
  }
}