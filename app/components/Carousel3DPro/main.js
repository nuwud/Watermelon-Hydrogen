// app/components/Carousel3DPro/main.js

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Carousel3DPro } from './Carousel3DPro.js';
import { Carousel3DSubmenu } from './Carousel3DSubmenu.js';
import {
    defaultCarouselStyle,
    darkTheme,
    cyberpunkTheme,
    lightTheme,
} from './CarouselStyleConfig.js';
import gsap from 'gsap';
import { getItemAngles } from '../../utils/carouselAngleUtils.js';

/**
 * Sets up a 3D carousel instance and mounts it to the provided container
 * @param {HTMLElement} container - DOM element to mount the canvas to
 * @returns {Object} - carousel controls and diagnostics
 */
export function setupCarousel(container) {

    if (typeof window === 'undefined') return null; // Ensure we're in a browser environment

    let animationFrameId = null; // Declare animationFrameId
    const timeoutIds = []; // Array to store timeout IDs
    let wmCheckIntervalId = null; // Variable to store the interval ID for waitForWindowWM

    // function waitForDrawerControllerEvent() {
    //     return new Promise((resolve) => {
    //       if (window.drawerController) return resolve(window.drawerController);
    //       window.addEventListener('drawerControllerReady', () => resolve(window.drawerController), { once: true });
    //     });
    //   }

    // Add the waitForWindowWM helper function here
    function waitForWindowWM(id, maxRetries = 30) { // Function to wait for window.__wm__ to be ready
        let retries = 0; // Initialize retry count
        // Clear any existing interval before starting a new one
        if (wmCheckIntervalId) {
            clearInterval(wmCheckIntervalId); // Reset the ID
        }
        wmCheckIntervalId = setInterval(() => { // Check if window.__wm__ is ready
            if (window.__wm__?.showContent) { // Check if window.__wm__ is defined and has showContent method
                window.__wm__.showContent(id); // Call the showContent method with the provided id
                clearInterval(wmCheckIntervalId); // Clear the interval once ready
                wmCheckIntervalId = null; // Reset the ID
                console.warn(`✅ window.__wm__ ready, showing content '${id}'`); // Log success
            } else {
                retries++; // Increment retry count
                if (retries >= maxRetries) { // If max retries reached, log failure and clear interval
                    console.warn(`❌ Failed to show content '${id}' — window.__wm__ not ready after ${maxRetries} retries.`);
                    clearInterval(wmCheckIntervalId); // Clear the interval
                    wmCheckIntervalId = null; // Reset the ID
                }
            }
        }, 100); // check every 100ms 
    }

    const scene = new THREE.Scene();
    let currentTheme = defaultCarouselStyle; // Initialize with default theme
    scene.background = new THREE.Color(currentTheme.backgroundColor); // Set initial background color

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); // Set up camera
    camera.position.set(0, 2, 10); // Position the camera

    const renderer = new THREE.WebGLRenderer({ antialias: true }); // Create WebGL renderer
    renderer.setSize(window.innerWidth, window.innerHeight); // Set renderer size
    renderer.setPixelRatio(window.devicePixelRatio); // Set pixel ratio for high DPI displays
    container.appendChild(renderer.domElement); // Append renderer to the container

    // Setup OrbitControls with correct zoom handling
    const controls = new OrbitControls(camera, renderer.domElement); // Initialize OrbitControls
    controls.enableDamping = true; // Enable damping (inertia) for smoother controls
    controls.dampingFactor = 0.05; // Damping factor for smoother controls
    controls.maxDistance = 20; // Maximum distance for zooming out
    controls.minDistance = 5; // Minimum distance for zooming in

    // FIX 1: Correct setup for middle mouse zoom only
    controls.enableZoom = true; // Keep enabled, but we'll control when it's used
    controls.zoomSpeed = 1.0; // Zoom speed for middle mouse button

    // Keep rotation and pan controls
    controls.mouseButtons = { // Set mouse button controls
        LEFT: THREE.MOUSE.ROTATE, // Keep LEFT button as rotate
        MIDDLE: THREE.MOUSE.DOLLY, // Keep MIDDLE button as dolly/zoom
        RIGHT: THREE.MOUSE.PAN, // Keep RIGHT button as pan
    };

    // Disable pinch-to-zoom on touch
    controls.touches.TWO = null; // Disable pinch-to-zoom gesture on touch devices

    // Tracking wheel handler state - MUST initially be true
    let isWheelHandlerActive = true;

    // Store the wheel event listener so we can remove/add it properly
    //let wheelHandlerActive = true;

    // Create the wheel event handler as a named function
    const wheelEventHandler = function (event) { // Check if the wheel handler is active
        // Check middle mouse button first - this is the zoom case
        if (event.buttons === 4) { // Middle mouse button pressed
            // Let OrbitControls handle zooming - do not stop propagation
            return; // Allow default behavior for middle mouse zoom
        }

        // For all other cases, prevent default and stop propagation
        event.preventDefault(); // Prevent default scrolling behavior
        event.stopPropagation(); // Stop propagation to prevent interference with other handlers

        // Navigate menus based on wheel direction
        const delta = event.deltaY; // Get the wheel delta

        if (activeSubmenu) { // If a submenu is active
            // Scroll submenu when it's active
            activeSubmenu.scrollSubmenu(delta > 0 ? 1 : -1); // Invert for natural feel
        } else if (isWheelHandlerActive) { // If no submenu is active and wheel handler is active
            // Navigate main carousel when no submenu
            const angleStep = (2 * Math.PI) / items.length; // Calculate angle step based on number of items
            carousel.spin(delta > 0 ? -angleStep : angleStep); // Invert direction for natural feel
        }
    };

    // Attach wheel handler with capture phase
    window.addEventListener('wheel', wheelEventHandler, { passive: false, capture: true }); // Attach wheel event listener with capture phase

    // FIX 3: Override OrbitControls wheel handler to only work with middle mouse
    const originalOnWheel = controls.onMouseWheel; // Store the original onMouseWheel method
    controls.onMouseWheel = function (event) { // Override the onMouseWheel method
        if (event.buttons !== 4) {
            // Block all wheel events that don't have middle mouse pressed
            return;
        }
        // Only call original handler for middle mouse + wheel
        originalOnWheel.call(this, event);
    };

    // MOBILE SUPPORT: Add touch event handlers for swipe navigation
    let touchStartX = 0; // Track initial touch X position
    let touchStartY = 0; // Track initial touch Y position
    let lastTouchTime = 0; // Track the last touch time
    let touchVelocity = 0; // Track touch velocity for momentum effect

    // Handle touch start
    const touchStartHandler = (event) => { // 
        if (event.touches.length === 1) { // Only handle single touch events
            touchStartX = event.touches[0].clientX; // Store initial touch X position
            touchStartY = event.touches[0].clientY; // Store initial touch Y position
            lastTouchTime = Date.now(); // Store the current time
            touchVelocity = 0; // Reset touch velocity

            // Prevent default to avoid unintended scrolling
            event.preventDefault(); // Prevent default browser behavior (page scrolling)
        }
    };

    // Handle touch move for swipe detection
    const touchMoveHandler = (event) => { // 
        if (event.touches.length !== 1) return; // Only handle single touch events

        // Prevent default browser behavior (page scrolling)
        event.preventDefault(); // Prevent default browser behavior (page scrolling)

        const touchX = event.touches[0].clientX; // Get current touch X position
        const touchY = event.touches[0].clientY; // Get current touch Y position

        // Calculate swipe distance and direction 
        const deltaX = touchX - touchStartX; // Calculate change in X position
        const deltaY = touchY - touchStartY; // Calculate change in Y position

        // Calculate velocity for smooth navigation
        const now = Date.now(); // Get the current time
        const timeDelta = now - lastTouchTime; // Calculate time since last touch event
        if (timeDelta > 0) { // Avoid division by zero
            touchVelocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / timeDelta; // Calculate touch velocity
        }

        // Use the dominant axis (horizontal or vertical)
        const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY); // Determine if the swipe is more horizontal than vertical

        // Apply threshold to avoid accidental swipes
        const swipeThreshold = 5; // Set a threshold for swipe detection

        if (activeSubmenu) {
            // For submenu, use vertical swipe
            if (!isHorizontalSwipe && Math.abs(deltaY) > swipeThreshold) { // Check if the swipe is vertical and exceeds the threshold
                activeSubmenu.scrollSubmenu(deltaY > 0 ? -1 : 1); // Invert for natural feel
                touchStartY = touchY; // Reset for continuous scrolling
            }
        } else {
            // For main carousel, use horizontal swipe
            if (isHorizontalSwipe && Math.abs(deltaX) > swipeThreshold) { // Check if the swipe is horizontal and exceeds the threshold
                const angleStep = (2 * Math.PI) / items.length; // Calculate angle step based on number of items
                carousel.spin(deltaX > 0 ? angleStep : -angleStep); // Direction feels natural
                touchStartX = touchX; // Reset for continuous rotation
            }
        }

        lastTouchTime = now; // Update the last touch time
    };

    // Handle touch end with momentum effect
    const touchEndHandler = (event) => { // 
        // Apply momentum based on final velocity
        if (touchVelocity > 0.5) { // Check if the velocity exceeds a threshold
            if (activeSubmenu) { // If a submenu is active
                const direction = touchStartY < event.changedTouches[0].clientY ? -1 : 1;
                // Apply momentum scrolling to submenu
                activeSubmenu.scrollSubmenu(direction);
            } else {
                const direction = touchStartX < event.changedTouches[0].clientX ? 1 : -1;
                // Apply momentum to carousel
                const angleStep = (2 * Math.PI) / items.length; // Calculate angle step based on number of items    
                carousel.spin(direction * angleStep);
            }
        }
    };

    // Function to enable all event handlers (touch and wheel)
    function enableAllEventHandlers() { // Re-attach all event listeners
        enableTouchEvents(); // Re-attach touch event listeners
        enableWheelHandler(); // Re-enable wheel handler
    }

    // Function to disable all event handlers when a submenu is active
    function disableMainCarouselHandlers() { // Detach touch event listeners
        // Do not actually remove the touch handlers - keep them active
        // but they will check for activeSubmenu internally

        // Set the wheel handler flag to false to disable it for main carousel
        isWheelHandlerActive = false; // Disable wheel handler for main carousel
    }

    // Function to enable touch events
    function enableTouchEvents() {
        // Reset touch variables
        touchStartX = 0; // Reset initial touch X position
        touchStartY = 0; // Reset initial touch Y position
        lastTouchTime = 0; // Reset last touch time
        touchVelocity = 0; // Reset touch velocity

        // Re-attach touch event listeners
        window.removeEventListener('touchstart', touchStartHandler, { passive: false }); // Remove existing touchstart listener
        window.removeEventListener('touchmove', touchMoveHandler, { passive: false }); // Remove existing touchmove listener
        window.removeEventListener('touchend', touchEndHandler, { passive: false }); // Remove existing touchend listener

        window.addEventListener('touchstart', touchStartHandler, { passive: false }); // Attach touchstart event listener
        window.addEventListener('touchmove', touchMoveHandler, { passive: false }); // Attach touchmove event listener
        window.addEventListener('touchend', touchEndHandler, { passive: false }); // Attach touchend event listener
    }

    // Function to enable wheel handler
    function enableWheelHandler() { // Re-attach wheel event listener
        // Set the wheel handler active flag
        isWheelHandlerActive = true; // Enable wheel handler for main carousel
    }

    // Initial setup: attach event listeners
    enableAllEventHandlers(); // Attach all event listeners initially

    const items = ['Home', 'Products', 'Contact', 'About', 'Gallery', 'Store']; // Define the main carousel items
    const submenus = { // Define the submenus for each main item
        Home: ['Dashboard', 'Activity', 'Settings', 'Profile'], // Submenu items for Home
        Products: ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Toys', 'Sports'], // Submenu items for Products
        Services: ['Consulting', 'Training', 'Support', 'Installation', 'Maintenance'], // Submenu items for Services
        About: ['Company', 'Team', 'History', 'Mission', 'Values'], // Submenu items for About
        Contact: ['Email', 'Phone', 'Chat', 'Social Media', 'Office Locations'], // Submenu items for Contact
        Gallery: ['Photos', 'Videos', '3D Models', 'Artwork', 'Animations', 'Virtual Tours'], // Submenu items for Gallery
        Store: ['Cart', 'Wishlist', 'Orders', 'Account', 'Gift Cards'], // Submenu items for Store
    };

    let activeSubmenu = null; // Track the currently active submenu
    let isTransitioning = false; // New flag for async handling, initially false

    const carousel = new Carousel3DPro(items, currentTheme); // Create the carousel instance
    carousel.userData = { camera }; // Store camera reference in userData for later access
    carousel.isAnimating = false; // Track animation state

    // Wrap the original methods to track animation state
    const originalGoToNext = carousel.goToNext; // Store original goToNext method
    carousel.goToNext = function () {
        if (carousel.isAnimating) return; // Prevent multiple animations from running simultaneously
        carousel.isAnimating = true; // Set animation flag to true

        try {
            originalGoToNext.call(carousel); // Call the original goToNext method
            // Reset animation flag after animation should be complete
            const timeoutId = setTimeout(() => { // Reset the animation flag after a delay
                carousel.isAnimating = false; // Reset animation flag to allow future animations
                // Remove this ID from the tracking array once executed
                const index = timeoutIds.indexOf(timeoutId); // Find the index of the timeout ID
                if (index > -1) timeoutIds.splice(index, 1); // Remove the timeout ID from the tracking array
            }, 500); // Match this delay to your animation duration
            timeoutIds.push(timeoutId); // Store the timeout ID
        } catch (error) { // Catch any errors that occur during the animation
            console.error('Error in goToNext:', error); // Log the error to the console
            carousel.isAnimating = false; // Reset animation flag on error
        }
    };

    const originalGoToPrev = carousel.goToPrev; // Store original goToPrev method
    carousel.goToPrev = function () { // 
        if (carousel.isAnimating) return; // Prevent multiple animations from running simultaneously
        carousel.isAnimating = true; // Set animation flag to true

        try {
            originalGoToPrev.call(carousel); // Call the original goToPrev method
            // Reset animation flag after animation should be complete
            const timeoutId = setTimeout(() => { // Reset the animation flag after a delay
                carousel.isAnimating = false; // Reset animation flag to allow future animations
                // Remove this ID from the tracking array once executed
                const index = timeoutIds.indexOf(timeoutId); // Find the index of the timeout ID
                if (index > -1) timeoutIds.splice(index, 1); // Remove the timeout ID from the tracking array
            }, 500); // Match this delay to your animation duration
            timeoutIds.push(timeoutId); // Store the timeout ID
        } catch (error) {
            console.error('Error in goToPrev:', error); // Log the error to the console
            carousel.isAnimating = false; // Reset animation flag on error
        }
    };

    // Refactored onItemClick using async/await
    carousel.onItemClick = async (index, item) => {
        if (!submenus[item]) return; // Ignore items without submenus

        if (isTransitioning) { // Check if a transition is already in progress
            console.warn('[Watermelon] Submenu transition in progress. Skipping click.'); // Debug log
            return; // Prevent multiple transitions from overlapping
        }

        isTransitioning = true; // Set the transition flag to true
        console.warn('[Watermelon] Starting submenu transition...'); // Debug log

        // When opening a submenu, disable wheel handler for main carousel
        // Note: Touch handlers remain active but check activeSubmenu internally
        disableMainCarouselHandlers(); // Disable main carousel handlers to prevent interference

        try {
            // Close existing submenu if there is one
            await closeSubmenuAsync(); // Wait for the submenu to close before proceeding

            // Spawn the new submenu
            await spawnSubmenuAsync(item, index); // Wait for the new submenu to spawn before proceeding

        } catch (err) { // Handle any errors that occur during the transition
            console.error('[Watermelon] Error during submenu transition:', err); // Debug log
            // Ensure handlers are re-enabled even if an error occurs during spawn/close
            enableAllEventHandlers(); // Re-enable main carousel handlers on error
        } finally { // Ensure handlers are re-enabled after the transition completes
            // Add a small buffer before allowing the next transition
            // This helps prevent issues if animations slightly overlap the promise resolution
            setTimeout(() => { // Re-enable main carousel handlers after a short delay
                isTransitioning = false; // Reset the transition flag to allow future transitions
                console.warn('[Watermelon] Submenu transition complete.'); // Debug log
            }, 50); // Adjust this delay as needed based on your animation timing
        }
    };

    // New async helper to close the active submenu
    async function closeSubmenuAsync() { // Check if a submenu is active
        if (!activeSubmenu) return Promise.resolve(); // Nothing to close

        console.warn('[Watermelon] Closing existing submenu...'); // Debug log
        return new Promise((resolve) => { // Disable main carousel handlers immediately
            const closingSubmenu = activeSubmenu; // Keep a reference to the submenu being closed
            activeSubmenu = null; // Clear the reference immediately

            // Hide animation
            closingSubmenu.hide?.(); // Call the hide method if it exists

            // Wait for hide animation + disposal
            const timeoutId = setTimeout(() => { // Remove the submenu from the scene after a delay
                scene.remove(closingSubmenu); // Remove the submenu from the scene
                closingSubmenu.dispose?.(); // Dispose resources
                console.warn('[Watermelon] Existing submenu closed and disposed.'); // Debug log

                // IMPORTANT: Re-enable handlers *after* the old submenu is fully gone
                enableAllEventHandlers(); // Re-enable main carousel handlers after closing submenu

                // Remove this ID from the tracking array once executed
                const index = timeoutIds.indexOf(timeoutId); // Find the index of the timeout ID
                if (index > -1) timeoutIds.splice(index, 1); // Remove the timeout ID from the tracking array

                resolve(); // Signal completion
            }, 300); // Match your existing submenu close timing
            timeoutIds.push(timeoutId); // Store the timeout ID
        });
    }

    // New async helper to spawn a submenu
    async function spawnSubmenuAsync(item, index) { // Check if the item has a submenu
        return new Promise((resolve, reject) => { // Check if the item has a submenu
            const mesh = carousel.itemMeshes[index]; // Get the mesh for the clicked item
            if (!mesh) { // Check if the mesh exists for the clicked item
                console.warn('[Watermelon] No mesh found for submenu spawn:', item, index); // Debug log
                // If mesh isn't found, we should probably re-enable handlers here too
                enableAllEventHandlers(); // Re-enable main carousel handlers if mesh is missing
                return reject(new Error(`Mesh not found for item ${item} at index ${index}`)); // Reject the promise if mesh is missing
            }

            console.warn(`[Watermelon] Spawning submenu for: ${item}`); // Debug log

            const submenuItems = submenus[item]; // Get the items for the submenu

            // Check if submenuItems is an array
            if (!Array.isArray(submenuItems)) {
                console.warn(`[Watermelon] Expected an array of strings for submenu items, but got:`, typeof submenuItems, submenuItems); // Debug log
                // Optionally reject or provide default empty array
                // return reject(new Error(`Invalid submenu items for ${item}`));
                // submenuItems = []; // Fallback to empty array
            }

            // Pass carousel instance in config
            // const submenuConfig = { ...currentTheme, carousel }; // Create a new submenu instance with the current theme and carousel reference
            // const submenu = new Carousel3DSubmenu(mesh, submenuItems || [], submenuConfig); // Use fallback if needed

            const angles = getItemAngles((submenuItems || []).length);
            const submenu = new Carousel3DSubmenu(mesh, submenuItems || [], {
              ...currentTheme,
              carousel,
              angles, // 👈 pass angle list
            });

            // ---> INJECT SCENE AND CAMERA HERE <---
            if (scene) { // Check if scene is defined
                submenu.scene = scene; // Inject scene into submenu
                console.log('[Watermelon] Injected scene into submenu.'); // Debug log
            } else {
                console.error('[Watermelon] CRITICAL: Scene is missing during submenu creation!'); // Debug log
            }
            if (camera) { // Check if camera is defined
                submenu.camera = camera; // Inject camera into submenu
                console.log('[Watermelon] Injected camera into submenu.'); // Debug log
            } else {
                console.error('[Watermelon] CRITICAL: Camera is missing during submenu creation!'); // Debug log
            }
            // ---> END INJECTION <---

            activeSubmenu = submenu; // Set the new active submenu
            scene.add(submenu); // Add the submenu to the scene
            scene.userData.activeSubmenu = activeSubmenu; // Update scene userData if needed

            // Show animation (assuming show is synchronous or starts an animation)
            submenu.show?.(); // Call the show method if it exists

            // Assuming 'show' starts an animation, we might need a slight delay
            // or a callback/promise from 'show' itself if it were async.
            // For now, resolve after a short delay assuming show animation starts.
            const timeoutId = setTimeout(() => { // Resolve after a short delay to allow show animation to start
                console.warn(`[Watermelon] Submenu for ${item} spawned and shown.`); // Debug log
                // Remove this ID from the tracking array once executed
                const index = timeoutIds.indexOf(timeoutId);
                if (index > -1) timeoutIds.splice(index, 1);
                resolve();
            }, 100); // Adjust delay as needed based on show animation start
            timeoutIds.push(timeoutId); // Store the timeout ID
        });
    }

    // Keep the old spawnSubmenu function commented out or remove if no longer needed elsewhere
    /*
    function spawnSubmenu(index, item) {
        // ... old implementation ...
    }
    */

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Create ambient light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Create directional light
    directionalLight.position.set(5, 5, 5); // Set light position

    scene.add(carousel, ambientLight, directionalLight); // Add carousel and lights to the scene

    // Define resize handler
    const resizeHandler = () => {
        camera.aspect = window.innerWidth / window.innerHeight; // Update camera aspect ratio
        camera.updateProjectionMatrix(); // Update camera projection matrix
        renderer.setSize(window.innerWidth, window.innerHeight); // Update renderer size
        carousel.resize?.(window.innerWidth, window.innerHeight); // Call resize method on carousel if it exists
    };
    window.addEventListener('resize', resizeHandler); // Attach resize event listener

    // Keep the existing closeSubmenu function for manual closing (e.g., close button)
    // It might need adjustments later if it conflicts with the async flow,
    // but for now, we leave it for the close button functionality.
    function closeSubmenu(immediate = false) { // Check if a submenu is active
        // Check the *new* transition flag as well
        if (!activeSubmenu || isTransitioning) return; // Nothing to close or already transitioning
        // Set the transition flag when manually closing too
        isTransitioning = true; // Set the transition flag to true
        console.warn('[Watermelon] Manual closeSubmenu called.'); // Debug log

        if (activeSubmenu.floatingPreview) { // Check if the submenu has a floating preview
            activeSubmenu.stopFloatingPreviewSpin(); // Stop any spinning animation on the floating preview
            gsap.to(activeSubmenu.floatingPreview.scale, { // Animate the scale of the floating preview to zero
                x: 0,
                y: 0,
                z: 0,
                duration: 0.2, // Duration of the scale animation
                ease: 'back.in', // Easing function for the animation
            });
        }

        if (activeSubmenu.closeButton) { // Check if the submenu has a close button
            activeSubmenu.closeButton.material.color.set(0xff0000); // Change the close button color to red
        }

        if (activeSubmenu.parentItem?.material) { // Check if the parent item has a material
            gsap.to(activeSubmenu.parentItem.material, { // Animate the opacity of the parent item material to 1.0
                opacity: 1.0, // Set opacity to fully opaque
                duration: 0.5, // Duration of the opacity animation
            });
        }

        const remove = () => { // Remove the submenu from the scene
            scene.remove(activeSubmenu); // Remove the submenu from the scene
            scene.userData.activeSubmenu = null; // Clear the active submenu reference in scene userData
            if (carousel && carousel.parent && carousel.parent.userData) { // Check if carousel has a parent with userData
                carousel.parent.userData.activeSubmenu = null; // Clear the active submenu reference in carousel parent userData
            }

            // IMPORTANT: Clear this BEFORE enabling handlers
            const closedSubmenu = activeSubmenu; // Keep ref for dispose check
            activeSubmenu = null; // Clear the active submenu reference

            // Dispose if the submenu has a dispose method
            closedSubmenu?.dispose?.(); // Call the dispose method if it exists
            console.warn('[Watermelon] Manual closeSubmenu disposed.'); // Debug log

            // Re-enable main carousel handlers
            enableAllEventHandlers(); // Re-enable main carousel handlers after closing submenu

            // Reset any active animations
            if (carousel) { // Reset carousel animation state
                carousel.isAnimating = false; // Reset carousel animation flag
            }

            // Finally clear transitioning flag after a buffer
            setTimeout(() => { // Reset the transition flag after a short delay
                isTransitioning = false; // Reset transition flag to allow future transitions
                console.warn('[Watermelon] Manual closeSubmenu complete.'); // Debug log
            }, 50); // Adjust this delay as needed based on your animation timing

            // Optional: Force a wheel event to test functionality
            // console.warn('Submenu closed, wheel handler reactivated:', isWheelHandlerActive);
        };

        if (immediate) { // If immediate is true, close immediately without animation
            remove(); // Remove the submenu immediately
        } else { // If immediate is false, animate the close
            activeSubmenu.hide(); // Call the hide method if it exists
            const timeoutId = setTimeout(() => { // Reset the animation flag after a delay
                remove(); // Remove the submenu from the scene
                // Remove this ID from the tracking array once executed
                const index = timeoutIds.indexOf(timeoutId); // Find the index of the timeout ID
                if (index > -1) timeoutIds.splice(index, 1); // Remove the timeout ID from the tracking array
            }, 300); // Match your existing submenu close timing
            timeoutIds.push(timeoutId); // Store the timeout ID
        }

        // controls.enabled = true; // This might interfere, review if needed
    }

    // Define click handler
    function handleCarouselClick(event) {
        // Use the new transition flag
        if (isTransitioning) { // Check if a transition is already in progress
            console.warn('[Watermelon] Click ignored during transition.'); // Debug log
            return; // Prevent click handling during transitions
        }

        const mouse = new THREE.Vector2( // Calculate mouse position in normalized device coordinates
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        const raycaster = new THREE.Raycaster(); // Create a new Raycaster instance
        raycaster.setFromCamera(mouse, camera); // Set the raycaster from the camera and mouse position

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        if (activeSubmenu) { // If a submenu is active, check for clicks within it
            const hits = raycaster.intersectObject(activeSubmenu, true); // Check for intersections with the active submenu
            if (hits.length > 0) { // If there are hits, handle the click within the submenu
                const obj = hits[0].object; // Check the first hit object
                // Check if the clicked object or its parent is a submenu item
                let submenuItemData = null; // Initialize submenuItemData to null
                if (obj.userData?.isSubmenuItem) { // Check if the clicked object is a submenu item
                    submenuItemData = obj.userData; // Assign the userData of the clicked object to submenuItemData
                } else if (obj.parent?.userData?.isSubmenuItem) { // Check if the parent of the clicked object is a submenu item
                    submenuItemData = obj.parent.userData; // Assign the userData of the parent object to submenuItemData
                }

                if (submenuItemData && typeof submenuItemData.index === 'number') { // Check if submenuItemData is valid and has a numeric index
                    const index = submenuItemData.index; // Get the index of the clicked submenu item
                    console.log(`🖱️ [main.js] Clicked submenu index=${index}, name=${submenuItemData.name || "Unknown"}`);
                    console.log(`🖱️ [main.js] About to call activeSubmenu.selectItem(${index})`);
                    const item = activeSubmenu.items?.[index]; // Get the item corresponding to the clicked index
                    if (!item) {
                        console.warn('[Watermelon] No item found for submenu index:', index); // Debug log
                        return; // Exit if no item is found
                    }

                    // Force index sync
                    activeSubmenu.currentIndex = index; // Sync the current index of the submenu to the clicked index

                    // Handle specific items to trigger floating content
                    // Check for specific items FIRST
                    if (item === 'About' || item === 'Favorites' || item === 'Product' || item === 'Shopify' || item === 'Cart') { // Added 'Cart' here too
                        const id = item.toLowerCase(); // e.g., 'about', 'favorites', 'cart'

                        // <<< FIX: Call selectItem to show preview BEFORE triggering panel
                        activeSubmenu.selectItem(index, true, true); // Show preview

                        // Replace the direct call with the waitForWindowWM function
                        waitForWindowWM(id); // Wait for window.__wm__ to be ready before triggering content
                        console.warn(`🍉 Attempting to trigger floating panel: ${id}`);
                        // Optionally close the submenu after triggering content
                        // closeSubmenu();
                    } else {
                        // Fallback/default behavior for other submenu items
                        activeSubmenu.selectItem(index, true, true); // <- preview true
                    }
                } else if (obj.userData?.isCloseButton || obj.parent?.userData?.isCloseButton) { // Check if the clicked object or its parent is the close button
                    // Handle close button click
                    closeSubmenu(); // Call the closeSubmenu function to close the active submenu
                }

                if (activeSubmenu) {
                    const hits = raycaster.intersectObject(activeSubmenu, true); // Check for intersections with the active submenu
                    if (hits.length > 0) { // If there are hits, handle the click within the submenu
                        const obj = hits[0].object; // Check the first hit object
                        let submenuItemData = null; // Initialize submenuItemData to null
                        if (obj.userData?.isSubmenuItem) { // Check if the clicked object is a submenu item
                            submenuItemData = obj.userData; // Assign the userData of the clicked object to submenuItemData
                        } else if (obj.parent?.userData?.isSubmenuItem) { // Check if the parent of the clicked object is a submenu item
                            submenuItemData = obj.parent.userData; // Assign the userData of the parent object to submenuItemData
                        }

                        if (submenuItemData && typeof submenuItemData.index === 'number') { // Check if submenuItemData is valid and has a numeric index
                            const index = submenuItemData.index; // Get the index of the clicked submenu item
                            console.log(`🖱️ [main.js] Clicked submenu index=${index}, name=${submenuItemData.name || "Unknown"}`); 
                            console.log(`🖱️ [main.js] About to call activeSubmenu.selectItem(${index})`);
                            activeSubmenu.intendedClickIndex = index; // Preserve the clicked index
                            activeSubmenu.selectItem(index, true, true); // Show preview
                        } else if (obj.userData?.isCloseButton || obj.parent?.userData?.isCloseButton) { // Check if the clicked object or its parent is the close button
                            console.log('🖱️ [main.js] Close button clicked.');
                            closeSubmenu(); // Call the closeSubmenu function to close the active submenu
                        }
                        return; // Exit after handling submenu click or close button
                    }
                }
                return; // Exit after handling submenu click or close button
            }
        }

        // ...existing code for handling main carousel item clicks...
        const itemsHit = raycaster.intersectObjects(carousel.itemGroup.children, true); // Check for intersections with carousel items
        for (const hit of itemsHit) { // Loop through all hits on carousel items
            let current = hit.object; // Start with the hit object
            while (current && current.parent !== carousel.itemGroup) current = current.parent; // Traverse up the hierarchy to find the parent item group
            if (current && current.userData.index !== undefined) { // Check if the parent item has a valid index in userData
                const i = current.userData.index; // Get the index of the clicked item
                carousel.onItemClick?.(i, items[i]); // Call the onItemClick handler if it exists
                carousel.selectItem(i, true); // Select the clicked item in the carousel
                break; // Exit after handling the first valid item click
            }
        }
    }

    window.addEventListener('click', handleCarouselClick); // Attach click event listener to the window

    // Define keydown handler 
    const keydownHandler = (e) => { // Check if a submenu is active
        if (e.key === 'ArrowRight') carousel.goToNext(); // Check if the right arrow key is pressed
        else if (e.key === 'ArrowLeft') carousel.goToPrev(); // Check if the left arrow key is pressed
    };
    window.addEventListener('keydown', keydownHandler); // Attach keydown event listener to the window

    const themes = [defaultCarouselStyle, darkTheme, cyberpunkTheme, lightTheme]; // Define available themes
    let themeIndex = 0; // Initialize theme index to 0

    const toggleTheme = () => { // Cycle through themes
        themeIndex = (themeIndex + 1) % themes.length; // Update theme index to cycle through available themes
        currentTheme = themes[themeIndex]; // Update current theme to the next theme in the array

        closeSubmenu(true); // Close any active submenu immediately

        scene.background = new THREE.Color(currentTheme.backgroundColor); // Update scene background color to match the new theme
        scene.remove(carousel); // Remove the old carousel from the scene

        const newCarousel = new Carousel3DPro(items, currentTheme); // Create a new carousel instance with the updated theme
        newCarousel.userData = { camera }; // Store camera reference in userData for later access
        newCarousel.onItemClick = carousel.onItemClick; // Reassign the onItemClick handler to the new carousel

        scene.add(newCarousel); //  Add the new carousel to the scene
        if (carousel.dispose) carousel.dispose(); // Dispose the old carousel if it has a dispose method
        Object.assign(carousel, newCarousel); // Copy properties from the new carousel to the old one
    };

    const animate = () => { // Animation loop function
        animationFrameId = requestAnimationFrame(animate); // Schedule next frame first

        // Skip heavy updates during transitions to improve performance
        if (!isTransitioning) {
            // Wrap in try-catch to prevent animation loop from breaking if an update fails
            try {
                carousel.update(); // Update the carousel state
                activeSubmenu?.update?.(); // Update the active submenu if it exists
                controls.update(); // Update the controls state
                renderer.render(scene, camera); // Render the scene using the camera
            } catch (error) {
                console.error('Error in animation loop:', error);
            }
        } else {
            // During transitions, only render without heavy updates
            renderer.render(scene, camera);
        }
    };

    animate(); // Start the animation loop

    // Add debug logging to track submenu front-facing logic
    function debugSubmenuFrontFacing(submenu) {
        if (!submenu || !submenu.itemMeshes) return;

        console.group('🔍 Submenu Front-Facing Debugging');
        submenu.itemMeshes.forEach((container, index) => {
            if (!container || !container.userData) return;

            const originalAngle = container.userData.originalAngle;
            const currentRotation = submenu.itemGroup.rotation.x;

            // Calculate effective angle
            let effectiveAngle = (originalAngle + currentRotation) % (Math.PI * 2);
            if (effectiveAngle < 0) effectiveAngle += Math.PI * 2;

            // Calculate distance to front (0 radians)
            const angleDiff = Math.min(
                effectiveAngle,
                Math.abs(Math.PI * 2 - effectiveAngle)
            );

            console.log(`Item ${index}: originalAngle=${originalAngle.toFixed(2)}, effectiveAngle=${effectiveAngle.toFixed(2)}, angleDiff=${angleDiff.toFixed(2)}`);
        });
        console.groupEnd();
    }

    // Call debugSubmenuFrontFacing after submenu updates
    const originalSubmenuUpdate = activeSubmenu?.update;
    if (originalSubmenuUpdate) {
        activeSubmenu.update = function () {
            originalSubmenuUpdate.call(this);
            debugSubmenuFrontFacing(this);
        };
    }

    // Create the dispose function
    const dispose = () => {
        // eslint-disable-next-line no-console
        console.groupCollapsed('[🍉 Carousel3DPro Cleanup]'); // Start collapsed group
        console.warn("Disposing carousel resources..."); // Debug log
        // Phase 1: Stop the Animation Loop
        if (animationFrameId !== null) { // Check if an animation frame is currently running
            cancelAnimationFrame(animationFrameId); // Cancel the animation frame request
            animationFrameId = null; // Reset the ID
            console.warn("Animation loop stopped."); // Debug log
        }

        // Phase 1.5: Clear Timeouts and Intervals
        console.warn("Clearing active timeouts and intervals..."); // Debug log
        timeoutIds.forEach(clearTimeout); // Clear all active timeouts
        timeoutIds.length = 0; // Clear the array
        if (wmCheckIntervalId) {    // Check if the interval is currently running
            clearInterval(wmCheckIntervalId); // Clear the interval
            wmCheckIntervalId = null; // Reset the ID
            console.warn("Cleared waitForWindowWM interval."); // Debug log
        }
        console.warn("Timeouts and intervals cleared."); // Debug log

        // Phase 2: Remove Global Event Listeners
        console.warn("Removing global event listeners..."); // Debug log
        window.removeEventListener('resize', resizeHandler); // Remove resize event listener
        window.removeEventListener('wheel', wheelEventHandler, { capture: true }); // Ensure capture matches addEventListener
        window.removeEventListener('click', handleCarouselClick); // Remove click event listener 
        window.removeEventListener('keydown', keydownHandler); // Remove keydown event listener
        window.removeEventListener('touchstart', touchStartHandler, { passive: false }); // Ensure options match
        window.removeEventListener('touchmove', touchMoveHandler, { passive: false }); // Ensure options match
        window.removeEventListener('touchend', touchEndHandler, { passive: false }); // Ensure options match
        console.warn("Global event listeners removed."); // Debug log

        // Phase 3: Kill Active GSAP Animations
        console.warn("Killing GSAP animations..."); // Debug log
        if (carousel?.itemGroup) { // Check if carousel.itemGroup exists
            gsap.killTweensOf(carousel.itemGroup); // 
        }
        if (activeSubmenu) {
            gsap.killTweensOf(activeSubmenu); // Kill tweens targeting the submenu object itself
            // Also kill tweens targeting children if necessary (e.g., items, close button)
            activeSubmenu.children.forEach(child => gsap.killTweensOf(child)); // 
            if (activeSubmenu.floatingPreview) {
                gsap.killTweensOf(activeSubmenu.floatingPreview);
                gsap.killTweensOf(activeSubmenu.floatingPreview.scale); // Kill specific property tweens if needed
            }
            if (activeSubmenu.closeButton) {
                gsap.killTweensOf(activeSubmenu.closeButton.material); // Kill material tweens
                gsap.killTweensOf(activeSubmenu.closeButton.scale); // Kill scale
            }
        }
        // Optional: Blanket kill for all scene children - use with caution
        // gsap.killTweensOf(scene.children); 
        console.warn("GSAP animations killed."); // Debug log

        // Phase 4: Dispose Submenu and Carousel
        console.warn("Disposing Three.js objects..."); // Debug log
        if (activeSubmenu) {
            // Ensure GSAP tweens targeting the submenu are killed *before* disposal
            gsap.killTweensOf(activeSubmenu);
            activeSubmenu.children.forEach(child => gsap.killTweensOf(child)); // Kill children tweens too
            if (activeSubmenu.floatingPreview) gsap.killTweensOf(activeSubmenu.floatingPreview); // Kill floating
            if (activeSubmenu.closeButton) gsap.killTweensOf(activeSubmenu.closeButton.material);

            activeSubmenu.dispose?.(); // Call the dispose method if it exists
            scene.remove(activeSubmenu); // Remove the submenu from the scene
            activeSubmenu = null; // Clear reference
            console.warn("Active submenu disposed and removed during main dispose."); // Debug log
        }
        if (carousel) { // Check if carousel exists
            // Assuming Carousel3DPro will have a dispose method
            carousel.dispose?.(); // Call the dispose method if it exists
            scene.remove(carousel); // Remove the carousel from the scene
            // carousel = null; // Don't nullify if it's returned
            console.warn("Main carousel disposed and removed."); // Debug log
        }

        // Dispose OrbitControls
        if (controls) { // Check if controls exist
            controls.dispose(); // Call the dispose method if it exists
            // controls = null; // Don't nullify if needed elsewhere, but good practice if not
            console.warn("OrbitControls disposed."); // Debug log
        }

        // Dispose Renderer and remove canvas
        if (renderer) { // Check if renderer exists
            renderer.dispose(); // Call the dispose method if it exists
            if (renderer.domElement.parentNode) { // Check if the renderer's canvas has a parent node
                renderer.domElement.parentNode.removeChild(renderer.domElement); // Remove the canvas from the DOM
            }
            // renderer = null; // Don't nullify if needed elsewhere
            console.warn("Renderer disposed and canvas removed."); // Debug log
        }

        // Dispose Scene resources (optional, depends on complexity)
        console.warn("Traversing scene to dispose geometries, materials, and textures..."); // Debug log
        scene.traverse((obj) => { // Traverse the scene graph to find objects
            if (obj.geometry) { // Check if the object has a geometry
                obj.geometry.dispose(); // Dispose the geometry if it exists
                // console.log("Disposed geometry for:", obj.name || obj.type);
            }
            if (obj.material) { // Check if the object has a material
                if (Array.isArray(obj.material)) { // Check if the material is an array (multiple materials)
                    obj.material.forEach((m) => { // Traverse the array of materials
                        m.dispose(); // Dispose each material in the array
                        // console.log("Disposed material (array) for:", obj.name || obj.type);
                    });
                } else {
                    obj.material.dispose(); // Dispose the single material if it exists
                    // console.log("Disposed material for:", obj.name || obj.type);
                }
            }
            // Note: Textures are usually part of materials and disposed when the material is disposed.
            // Explicit texture disposal might be needed if textures are managed separately.
            // if (obj.texture) { // Less common to find textures directly on objects like this
            //   obj.texture.dispose();
            // }
        });
        console.warn("Scene traversal and disposal complete."); // Debug log
        // scene = null; // Don't nullify if needed elsewhere

        console.warn("Carousel disposal complete."); // Debug log
        // eslint-disable-next-line no-console
        console.groupEnd(); // End collapsed group
    };

    return {
        carousel, // Return the carousel instance
        scene, // Return the scene instance
        camera, // Return the camera instance
        renderer, // Return the renderer instance
        nextItem: () => carousel.goToNext(), // Return a function to go to the next item
        prevItem: () => carousel.goToPrev(), // Return a function to go to the previous item
        toggleTheme, // Return the function to toggle themes
        closeSubmenu, // Keep returning the manual close function
        dispose, // Return the dispose function
    };
}