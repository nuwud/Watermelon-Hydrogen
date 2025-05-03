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
//import { raycaster, camera, scene } from 'three';

//import { gsap } from 'gsap';

// Access GSAP from the global scope
const gsap = typeof window !== 'undefined' ? window.gsap : undefined; // Ensure GSAP is available in the browser context

// Core structure and update logic here
export class Carousel3DPro extends Group { // Carousel3DPro class extends Three.js Group to create a 3D carousel
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
    this.loadFont().then(() => { // Load the font asynchronously
      this.createItems(); // Create items after the font is loaded
    });

    // Event listeners
    this.raycaster = new THREE.Raycaster(); // Initialize raycaster for handling click interactions
    this.setupEventListeners(); // Set up event listeners for user interactions

    this.levelingSpeed = 0.1; // Controls how quickly items level out
    this.maxTilt = Math.PI / 24; // Limits maximum tilt (about 7.5 degrees)

    // Define a state machine for carousel states
    this.state = 'idle'; // Possible states: 'idle', 'transitioning', 'selecting'
  }

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

  createItems() { // Create 3D text items for the carousel
    if (!this.font) return; // Ensure the font is loaded before creating items

    const angleStep = (2 * Math.PI) / this.items.length; // Calculate the angle step based on the number of items

    this.items.forEach((item, index) => { // Iterate over each item in the items array
      // Create text geometry
      const geometry = new TextGeometry(item.toString(), { // Create a new TextGeometry instance for the item
        font: this.font, // Use the loaded font
        size: 0.5, // Size of the text
        height: 0.1, // Height of the text extrusion
        depth: 0.1, // Depth of the text extrusion
        curveSegments: 12, // Number of segments for curved text
        bevelEnabled: true, // Enable beveling for the text
        bevelThickness: 0.03, // Thickness of the bevel
        bevelSize: 0.02, // Size of the bevel
        bevelOffset: 0, // Offset of the bevel
        bevelSegments: 5 // Number of segments for the bevel
      }); // Create the text geometry with specified parameters

      geometry.computeBoundingBox(); // Compute the bounding box of the geometry to center it properly
      geometry.center(); // Center the geometry so that it is positioned correctly in the scene

      // Create material for the text
      const material = new THREE.MeshStandardMaterial({ // Create a new MeshStandardMaterial for the text
        color: this.config.textColor, // Color of the text
        transparent: true, // Enable transparency for the material
        opacity: this.config.opacity // Opacity of the text material
      }); // Set the opacity of the material based on the configuration

      const mesh = new THREE.Mesh(geometry, material); // Create a new Mesh using the geometry and material
      mesh.name = item.toString(); // Set the name of the mesh to the item string for easier debugging
      // Calculate or assign default values for x, y, and z
      const x = 0; // Default or calculated x-coordinate
      const y = 0; // Default or calculated y-coordinate
      const z = 0; // Default or calculated z-coordinate
      mesh.position.set(x, y, z); // Set the position of the mesh to the calculated or default coordinates
      this.itemGroup.add(mesh); // Add the mesh to the item group

      // Position in cylinder arrangement
      const angle = angleStep * index; // Calculate the angle for this item based on its index
      mesh.position.x = this.cylinderRadius * Math.sin(angle); // Set the x position based on the angle and cylinder radius
      mesh.position.z = this.cylinderRadius * Math.cos(angle); // Set the z position based on the angle and cylinder radius

      // Make each item face outward
      mesh.rotation.y = Math.atan2(mesh.position.x, mesh.position.z); // Rotate the mesh to face outward based on its position

      // Store original scale in userData
      mesh.userData.originalScale = new THREE.Vector3().copy(mesh.scale); // Store the original scale of the mesh in userData for later use

      // Add hit area for better click detection
      const textWidth = geometry.boundingBox.max.x - geometry.boundingBox.min.x; // Calculate the width of the text bounding box
      const textHeight = geometry.boundingBox.max.y - geometry.boundingBox.min.y; // Calculate the height of the text bounding box

      const hitAreaWidth = textWidth * 1.5; // Much wider
      const hitAreaHeight = textHeight * 2; // Much taller
      const hitAreaDepth = 0.5; // Deeper for better 3D hit detection

      const hitAreaGeometry = new THREE.BoxGeometry(hitAreaWidth, hitAreaHeight, hitAreaDepth); // Create a box geometry for the hit area
      const hitAreaMaterial = new THREE.MeshBasicMaterial({ // Create a basic material for the hit area
        color: 0x00ff00, // Use a visible color for debugging, then set to transparent
        transparent: true, // Enable transparency for the hit area material
        opacity: 0.01 // Nearly invisible in production
      }); // Set the opacity of the hit area material to make it nearly invisible
 
      const hitArea = new THREE.Mesh(hitAreaGeometry, hitAreaMaterial); // Create a new Mesh for the hit area using the geometry and material
      hitArea.position.copy(mesh.position); // Match the position of the text
      hitArea.rotation.copy(mesh.rotation); // Match the rotation of the text

      // Add hit area to the item group
      this.itemGroup.add(hitArea); // Add the hit area mesh to the item group

      // Store hit area and mesh in userData for interaction
      hitArea.userData = { index, mesh }; // Store the index and reference to the original mesh in userData for interaction
      mesh.userData.hitArea = hitArea; // Store a reference to the hit area in the original mesh's userData

      this.itemMeshes.push(mesh); // Add the original mesh to the itemMeshes array for later reference
      this.itemGroup.add(mesh); // Add the original mesh to the item group
    });

    // Maintain a flat array of clickable objects
    this.clickableObjects = this.itemMeshes.map(mesh => mesh.userData.hitArea).filter(Boolean);

    if (this.itemMeshes.length > 0) { // If there are items, select the first one by default
      this.selectItem(0, false); // Select first item without animation or preview
      // Don't create floating preview automatically
    }
  }

  selectItem(index, animate = true) { // Select an item in the carousel by index, optionally animating the selection
    if (index < 0 || index >= this.itemMeshes.length || this.isAnimating) return; // Check if index is valid and not currently animating

    this.isAnimating = animate; // Set animating flag to true if animation is requested
    this.currentIndex = index; // Update the current index to the selected item index

    // Remove selection from all items
    this.itemMeshes.forEach(mesh => { // Iterate over all item meshes
      mesh.userData.isSelected = false; // Reset selection state for each mesh
      mesh.material = new THREE.MeshStandardMaterial({ // Create a new standard material for the mesh
        color: this.config.textColor, // Set the color of the material based on the configuration
        transparent: true, // Enable transparency for the material
        opacity: this.config.opacity // Set the opacity of the material based on the configuration
      }); // Set the opacity of the material based on the configuration

      if (animate) { // Animate scale back to original if currently selected
        gsap.to(mesh.scale, { // Animate the scale of the mesh back to its original size
          x: mesh.userData.originalScale.x, // Set the x scale back to original
          y: mesh.userData.originalScale.y, // Set the y scale back to original
          z: mesh.userData.originalScale.z, // Set the z scale back to original
          duration: 0.3 // Duration of the animation
        }); // Set the duration of the animation
      } else { // Immediately reset scale if not animating
        mesh.scale.copy(mesh.userData.originalScale); // Immediately reset the scale of the mesh to its original size
      } // Set the scale of the mesh back to its original size
    });

    // Apply selection to current item
    const selectedMesh = this.itemMeshes[index]; // Get the mesh corresponding to the selected index
    selectedMesh.userData.isSelected = true; // Mark the selected mesh as selected

    // Apply glow material
    const glowMaterial = getGlowShaderMaterial(); // Get the custom glow shader material
    glowMaterial.uniforms.glowColor.value = new THREE.Color(this.config.glowColor); // Set the glow color based on the configuration
    selectedMesh.material = glowMaterial; // Apply the glow material to the selected mesh

    if (animate) { // Animate scale up if selection is animated
      gsap.to(selectedMesh.scale, { // Animate the scale of the selected mesh to make it larger
        x: selectedMesh.userData.originalScale.x * 1.2, // Scale up the x dimension by 20%
        y: selectedMesh.userData.originalScale.y * 1.2, // Scale up the y dimension by 20%
        z: selectedMesh.userData.originalScale.z * 1.2, // Scale up the z dimension by 20%
        duration: 0.3, // Duration of the animation
        onComplete: () => { this.isAnimating = false; } // Reset animating flag when animation completes
      });

      // Rotate carousel to face the selected item
      const angleStep = (2 * Math.PI) / this.items.length; // Calculate the angle step based on the number of items
      this.targetRotation = index * angleStep; // Calculate the target rotation angle for the selected item

      gsap.to(this.itemGroup.rotation, { // Animate the rotation of the item group to face the selected item
        y: this.targetRotation, // Set the target rotation angle
        duration: 0.8, // Duration of the animation
        ease: "power2.out" // Easing function for a smooth transition
      }); // Set the easing function for a smooth transition
    } else { // Immediately set rotation if not animating
      selectedMesh.scale.set( // Immediately scale up the selected mesh if not animating
        selectedMesh.userData.originalScale.x * 1.2, // Scale up the x dimension by 20%
        selectedMesh.userData.originalScale.y * 1.2, // Scale up the y dimension by 20%
        selectedMesh.userData.originalScale.z * 1.2 // Scale up the z dimension by 20%
      ); // Set the scale of the selected mesh to its new size
      this.isAnimating = false; // Reset animating flag immediately if not animating
    } // Set the animating flag to false if not animating
  } // Set the animating flag to false if not animating

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

      console.group('🔍 Raycaster Debugging'); // Group console logs for better readability
      console.log('Mouse Position:', mouse); // Log the mouse position in normalized device coordinates
      console.log('Intersected Objects:', intersects); // Log the intersected objects from raycasting

      if (intersects.length > 0) { // Check if any objects were intersected by the raycaster
        const hitObject = intersects[0].object; // Get the first intersected object
        const hitData = hitObject.userData; // Access userData from the hit object

        console.log('Hit Object:', hitObject); // Log the intersected object
        console.log('Hit Data:', hitData); // Log the userData from the hit object

        if (hitData && typeof hitData.index === 'number') { // Check if hitData has a valid index property
          console.log(`🎯 Selecting clicked item at index ${hitData.index}`); // Log the index of the clicked item
          this.selectItem(hitData.index, true); // Select the item at the clicked index with animation
          this.userData.intendedClickIndex = hitData.index; // Store the intended click index in userData for potential future use
        } else { // Log a warning if hitData does not have a valid index
          console.warn('⚠️ Hit object does not have valid userData or index.');
        }
      } else { // Log a warning if no objects were intersected by the raycaster
        console.warn('⚠️ No objects intersected by raycaster.');
      }

      console.groupEnd(); // End the console group for raycaster debugging
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

  handleWheel(event) { // Handle mouse wheel events for scrolling through carousel items
    // Prevent default scroll behavior (i.e., page scroll)
    event.preventDefault(); // Prevent the default scroll behavior of the browser

    // Skip processing if animation is in progress
    if (this.isAnimating) return; // Check if the carousel is currently animating

    const scrollAmount = event.deltaY > 0 ? 1 : -1; // Determine scroll direction based on deltaY value

    // Use scrollAmount to rotate or navigate
    if (scrollAmount > 0) { // If scrolling down, go to the next item
      this.goToNext(); // Scroll to the next item
    } else { // If scrolling up, go to the previous item
      this.goToPrev(); // Scroll to the previous item
    }
  }

  update() {
    // Smooth rotation of the carousel with more inertia feel
    if (!this.isAnimating) { // Only update rotation if not currently animating
      const diff = this.targetRotation - this.itemGroup.rotation.y; // Calculate the difference between target and current rotation
      if (Math.abs(diff) > 0.01) { // If the difference is significant enough to warrant rotation
        // Apply a more natural rotation speed based on distance
        const rotationAmount = diff * this.rotationSpeed; // Calculate the rotation amount based on the difference and rotation speed
        this.itemGroup.rotation.y += rotationAmount; // Update the rotation of the item group by the calculated amount
        // Check if we need to update the current index based on rotation
        this.updateCurrentItemFromRotation(); // Update the current item index based on the current rotation
      } else { 
        // Snap precisely to target when very close
        this.itemGroup.rotation.y = this.targetRotation; // Snap the rotation of the item group to the target rotation
        this.isAnimating = false; // Reset animating flag when rotation is complete                           
      }
    }

    // Update glow effects if needed
    this.itemMeshes.forEach(mesh => {
      if (mesh.userData.isSelected && mesh.material.uniforms) { // Check if the mesh is selected and has uniforms for the glow material
        mesh.material.uniforms.time.value = performance.now() * 0.001; // Update the time uniform for the glow effect
      }
    });

    // Example state transition
    if (this.state === 'idle') { // If the carousel is idle, we can check for state transitions
      this.state = 'transitioning'; // Transition to the transitioning state
      // Perform transition logic
      setTimeout(() => { // Simulate some transition logic
        this.state = 'idle'; // Transition back to idle state after a delay
      }, 300); // Transition duration
    }
  }

  // Add a new method to handle continuous spinning via mouse wheel
  spin(deltaAngle) { // Method to spin the carousel by a specified angle
    if (this.isAnimating) return; // Prevent spinning if currently animating

    // Add the rotation directly to the target
    this.targetRotation += deltaAngle; // Update the target rotation by the specified delta angle

    // Don't set isAnimating flag to allow smooth continuous spinning
  }

  // Add a method to figure out which item is at the front based on rotation
  updateCurrentItemFromRotation() { // Method to update the current item index based on the carousel's rotation
    if (!this.itemMeshes.length) return; // If there are no items, exit early

    const angleStep = (2 * Math.PI) / this.items.length; // Calculate the angle step based on the number of items
    const currentRotation = this.itemGroup.rotation.y; // Get the current rotation of the item group

    // Normalize rotation to get a value between 0 and 2π
    let normalizedRotation = currentRotation % (2 * Math.PI); // Normalize the current rotation to be within the range of 0 to 2π
    if (normalizedRotation < 0) normalizedRotation += 2 * Math.PI; // Ensure normalized rotation is positive

    // Calculate which index is at the front (3 o'clock position)
    // First get the raw index based on rotation
    const rawIndex = Math.round(normalizedRotation / angleStep); // Calculate the raw index based on the normalized rotation and angle step

    // REVERSE THE ORDER: Subtract from total items to reverse the direction
    // This makes the highlight move in the opposite direction of the wheel rotation
    const indexFromRotation = (this.items.length - rawIndex) % this.items.length; // Calculate the index from rotation by reversing the order of items

    // If we have a new front item, update it
    if (indexFromRotation !== this.currentIndex) { // If the index from rotation is different from the current index
      // Deselect the current item
      this.itemMeshes.forEach(mesh => { // Iterate over all item meshes
        if (mesh.userData.isSelected) { // Check if the mesh is currently selected
          mesh.userData.isSelected = false; // Reset selection state for the mesh

          // Reset material 
          mesh.material = new THREE.MeshStandardMaterial({ // Create a new standard material for the mesh
            color: this.config.textColor, // Set the color of the material based on the configuration
            transparent: true, // Enable transparency for the material
            opacity: this.config.opacity // Set the opacity of the material based on the configuration
          }); // Set the opacity of the material based on the configuration

          // Reset scale
          mesh.scale.copy(mesh.userData.originalScale); // Immediately reset the scale of the mesh to its original size
        }
      });

      // Select the new item
      const newSelectedMesh = this.itemMeshes[indexFromRotation]; // Get the mesh corresponding to the new index from rotation
      newSelectedMesh.userData.isSelected = true; // Mark the new selected mesh as selected

      // Apply glow material
      const glowMaterial = getGlowShaderMaterial(); // Get the custom glow shader material
      glowMaterial.uniforms.glowColor.value = new THREE.Color(this.config.glowColor); // Set the glow color based on the configuration
      newSelectedMesh.material = glowMaterial; // Apply the glow material to the new selected mesh

      // Scale up
      newSelectedMesh.scale.set( // Immediately scale up the new selected mesh
        newSelectedMesh.userData.originalScale.x * 1.2, // Scale up the x dimension by 20%
        newSelectedMesh.userData.originalScale.y * 1.2, // Scale up the y dimension by 20%
        newSelectedMesh.userData.originalScale.z * 1.2 // Scale up the z dimension by 20%
      ); // Set the scale of the new selected mesh to its new size

      // Update current index
      this.currentIndex = indexFromRotation; // Update the current index to the new index from rotation
    }
  }

  // Public API methods
  goToNext() { 
    if (this.isAnimating) return; // Prevent going to next item if currently animating

    this.isAnimating = true; // Set animating flag to true
    const nextIndex = (this.currentIndex + 1) % this.items.length; // Calculate the next index, wrapping around if necessary

    // Calculate rotation amount - smooth transition
    const segmentAngle = (2 * Math.PI) / this.items.length; // Calculate the angle step based on the number of items
    this.targetRotation = this.itemGroup.rotation.y - segmentAngle; // Update the target rotation to rotate to the next item

    // Animate with smoother, more controlled motion and gentle snap
    gsap.to(this.itemGroup.rotation, { // Animate the rotation of the item group to face the next item
      y: this.targetRotation, // Set the target rotation angle
      duration: 0.5, // Duration of the animation
      ease: "back.out(1.2)", // Add gentle snap-to effect
      onComplete: () => { // Callback when the animation is complete
        this.currentIndex = nextIndex; // Update the current index to the next index
        this.isAnimating = false; // Reset animating flag when animation is complete
      }
    });

    // Highlight new item
    this.selectItem(nextIndex, true); // Select the next item with animation
  }

  goToPrev() {
    if (this.isAnimating) return; // Prevent going to previous item if currently animating

    this.isAnimating = true; // Set animating flag to true
    const prevIndex = (this.currentIndex - 1 + this.items.length) % this.items.length; // Calculate the previous index, wrapping around if necessary

    // Calculate rotation amount - smooth transition
    const segmentAngle = (2 * Math.PI) / this.items.length; // Calculate the angle step based on the number of items
    this.targetRotation = this.itemGroup.rotation.y + segmentAngle; // Update the target rotation to rotate to the previous item

    // Animate with smoother, more controlled motion and gentle snap
    gsap.to(this.itemGroup.rotation, { // Animate the rotation of the item group to face the previous item
      y: this.targetRotation, // Set the target rotation angle
      duration: 0.5, // Duration of the animation
      ease: "back.out(1.2)", // Add gentle snap-to effect
      onComplete: () => { // Callback when the animation is complete
        this.currentIndex = prevIndex; // Update the current index to the previous index
        this.isAnimating = false; // Reset animating flag when animation is complete
      }
    });

    // Highlight new item
    this.selectItem(prevIndex, true); // Select the previous item with animation
  }

  getCurrentItem() { // Get the currently selected item
    return this.items[this.currentIndex]; // Return the item at the current index
  }

  resize() { 
    // Update for responsive layout
    // This would be called by the parent component when window resizes
  }
}