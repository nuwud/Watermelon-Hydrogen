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

/**
 * Sets up a 3D carousel instance and mounts it to the provided container
 * @param {HTMLElement} container - DOM element to mount the canvas to
 * @returns {Object} - carousel controls and diagnostics
 */
export function setupCarousel(container) {
    
    if (typeof window === 'undefined') return null;

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
    function waitForWindowWM(id, maxRetries = 30) {
      let retries = 0;
      // Clear any existing interval before starting a new one
      if (wmCheckIntervalId) {
          clearInterval(wmCheckIntervalId);
      }
      wmCheckIntervalId = setInterval(() => {
        if (window.__wm__?.showContent) {
          window.__wm__.showContent(id);
          clearInterval(wmCheckIntervalId);
          wmCheckIntervalId = null; // Reset the ID
          console.warn(`✅ window.__wm__ ready, showing content '${id}'`);
        } else {
          retries++;
          if (retries >= maxRetries) {
            console.warn(`❌ Failed to show content '${id}' — window.__wm__ not ready after ${maxRetries} retries.`);
            clearInterval(wmCheckIntervalId);
            wmCheckIntervalId = null; // Reset the ID
          }
        }
      }, 100); // check every 100ms
    }

    const scene = new THREE.Scene();
    let currentTheme = defaultCarouselStyle;
    scene.background = new THREE.Color(currentTheme.backgroundColor);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Setup OrbitControls with correct zoom handling
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 20;
    controls.minDistance = 5;

    // FIX 1: Correct setup for middle mouse zoom only
    controls.enableZoom = true; // Keep enabled, but we'll control when it's used
    controls.zoomSpeed = 1.0;

    // Keep rotation and pan controls
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY, // Keep MIDDLE button as dolly/zoom
        RIGHT: THREE.MOUSE.PAN,
    };

    // Disable pinch-to-zoom on touch
    controls.touches.TWO = null;

    // Tracking wheel handler state - MUST initially be true
    let isWheelHandlerActive = true;
    
    // Store the wheel event listener so we can remove/add it properly
    //let wheelHandlerActive = true;

    // Create the wheel event handler as a named function
    const wheelEventHandler = function(event) {
        // Check middle mouse button first - this is the zoom case
        if (event.buttons === 4) {
            // Let OrbitControls handle zooming - do not stop propagation
            return;
        }

        // For all other cases, prevent default and stop propagation
        event.preventDefault();
        event.stopPropagation();

        // Navigate menus based on wheel direction
        const delta = event.deltaY;

        if (activeSubmenu) {
            // Scroll submenu when it's active
            activeSubmenu.scrollSubmenu(delta > 0 ? 1 : -1);
        } else if (isWheelHandlerActive) {
            // Navigate main carousel when no submenu
            const angleStep = (2 * Math.PI) / items.length;
            carousel.spin(delta > 0 ? -angleStep : angleStep);
        }
    };

    // Attach wheel handler with capture phase
    window.addEventListener('wheel', wheelEventHandler, { passive: false, capture: true });

    // FIX 3: Override OrbitControls wheel handler to only work with middle mouse
    const originalOnWheel = controls.onMouseWheel;
    controls.onMouseWheel = function(event) {
        if (event.buttons !== 4) {
            // Block all wheel events that don't have middle mouse pressed
            return;
        }
        // Only call original handler for middle mouse + wheel
        originalOnWheel.call(this, event);
    };

    // MOBILE SUPPORT: Add touch event handlers for swipe navigation
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchTime = 0;
    let touchVelocity = 0;

    // Handle touch start
    const touchStartHandler = (event) => {
        if (event.touches.length === 1) {
            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
            lastTouchTime = Date.now();
            touchVelocity = 0;

            // Prevent default to avoid unintended scrolling
            event.preventDefault();
        }
    };

    // Handle touch move for swipe detection
    const touchMoveHandler = (event) => {
        if (event.touches.length !== 1) return;

        // Prevent default browser behavior (page scrolling)
        event.preventDefault();

        const touchX = event.touches[0].clientX;
        const touchY = event.touches[0].clientY;

        // Calculate swipe distance and direction
        const deltaX = touchX - touchStartX;
        const deltaY = touchY - touchStartY;

        // Calculate velocity for smooth navigation
        const now = Date.now();
        const timeDelta = now - lastTouchTime;
        if (timeDelta > 0) {
            touchVelocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / timeDelta;
        }

        // Use the dominant axis (horizontal or vertical)
        const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

        // Apply threshold to avoid accidental swipes
        const swipeThreshold = 5;

        if (activeSubmenu) {
            // For submenu, use vertical swipe
            if (!isHorizontalSwipe && Math.abs(deltaY) > swipeThreshold) {
                activeSubmenu.scrollSubmenu(deltaY > 0 ? -1 : 1); // Invert for natural feel
                touchStartY = touchY; // Reset for continuous scrolling
            }
        } else {
            // For main carousel, use horizontal swipe
            if (isHorizontalSwipe && Math.abs(deltaX) > swipeThreshold) {
                const angleStep = (2 * Math.PI) / items.length;
                carousel.spin(deltaX > 0 ? angleStep : -angleStep); // Direction feels natural
                touchStartX = touchX; // Reset for continuous rotation
            }
        }

        lastTouchTime = now;
    };

    // Handle touch end with momentum effect
    const touchEndHandler = (event) => {
        // Apply momentum based on final velocity
        if (touchVelocity > 0.5) {
            if (activeSubmenu) {
                const direction = touchStartY < event.changedTouches[0].clientY ? -1 : 1;
                // Apply momentum scrolling to submenu
                activeSubmenu.scrollSubmenu(direction);
            } else {
                const direction = touchStartX < event.changedTouches[0].clientX ? 1 : -1;
                // Apply momentum to carousel
                const angleStep = (2 * Math.PI) / items.length;
                carousel.spin(direction * angleStep);
            }
        }
    };

    // Function to enable all event handlers (touch and wheel)
    function enableAllEventHandlers() {
        enableTouchEvents();
        enableWheelHandler();
    }

    // Function to disable all event handlers when a submenu is active
    function disableMainCarouselHandlers() {
        // Do not actually remove the touch handlers - keep them active
        // but they will check for activeSubmenu internally
        
        // Set the wheel handler flag to false to disable it for main carousel
        isWheelHandlerActive = false;
    }
    
    // Function to enable touch events
    function enableTouchEvents() {
        // Reset touch variables
        touchStartX = 0;
        touchStartY = 0;
        lastTouchTime = 0;
        touchVelocity = 0;

        // Re-attach touch event listeners
        window.removeEventListener('touchstart', touchStartHandler, { passive: false });
        window.removeEventListener('touchmove', touchMoveHandler, { passive: false });
        window.removeEventListener('touchend', touchEndHandler, { passive: false });
        
        window.addEventListener('touchstart', touchStartHandler, { passive: false });
        window.addEventListener('touchmove', touchMoveHandler, { passive: false });
        window.addEventListener('touchend', touchEndHandler, { passive: false });
    }
    
    // Function to enable wheel handler
    function enableWheelHandler() {
        // Set the wheel handler active flag
        isWheelHandlerActive = true;
    }
    
    // Initial setup: attach event listeners
    enableAllEventHandlers();

    const items = ['Home', 'Products', 'Contact', 'About', 'Gallery', 'Store'];
    const submenus = {
        Home: ['Dashboard', 'Activity', 'Settings', 'Profile'],
        Products: ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Toys', 'Sports'],
        Services: ['Consulting', 'Training', 'Support', 'Installation', 'Maintenance'],
        About: ['Company', 'Team', 'History', 'Mission', 'Values'],
        Contact: ['Email', 'Phone', 'Chat', 'Social Media', 'Office Locations'],
        Gallery: ['Photos', 'Videos', '3D Models', 'Artwork', 'Animations', 'Virtual Tours'],
        Store: ['Cart', 'Wishlist', 'Orders', 'Account', 'Gift Cards'], 
    };

    let activeSubmenu = null;
    let isTransitioning = false; // New flag for async handling

    const carousel = new Carousel3DPro(items, currentTheme);
    carousel.userData = { camera };
    carousel.isAnimating = false; // Track animation state

    // Wrap the original methods to track animation state
    const originalGoToNext = carousel.goToNext;
    carousel.goToNext = function() {
        if (carousel.isAnimating) return;
        carousel.isAnimating = true;

        try {
            originalGoToNext.call(carousel);
            // Reset animation flag after animation should be complete
            const timeoutId = setTimeout(() => {
                carousel.isAnimating = false;
                // Remove this ID from the tracking array once executed
                const index = timeoutIds.indexOf(timeoutId);
                if (index > -1) timeoutIds.splice(index, 1);
            }, 500);
            timeoutIds.push(timeoutId); // Store the timeout ID
        } catch (error) {
            console.error('Error in goToNext:', error);
            carousel.isAnimating = false;
        }
    };

    const originalGoToPrev = carousel.goToPrev;
    carousel.goToPrev = function() {
        if (carousel.isAnimating) return;
        carousel.isAnimating = true;

        try {
            originalGoToPrev.call(carousel);
            // Reset animation flag after animation should be complete
            const timeoutId = setTimeout(() => {
                carousel.isAnimating = false;
                // Remove this ID from the tracking array once executed
                const index = timeoutIds.indexOf(timeoutId);
                if (index > -1) timeoutIds.splice(index, 1);
            }, 500);
            timeoutIds.push(timeoutId); // Store the timeout ID
        } catch (error) {
            console.error('Error in goToPrev:', error);
            carousel.isAnimating = false;
        }
    };

    // Refactored onItemClick using async/await
    carousel.onItemClick = async (index, item) => {
        if (!submenus[item]) return; // Ignore items without submenus

        if (isTransitioning) {
            console.warn('[Watermelon] Submenu transition in progress. Skipping click.');
            return;
        }

        isTransitioning = true;
        console.warn('[Watermelon] Starting submenu transition...'); // Debug log

        // When opening a submenu, disable wheel handler for main carousel
        // Note: Touch handlers remain active but check activeSubmenu internally
        disableMainCarouselHandlers();

        try {
            // Close existing submenu if there is one
            await closeSubmenuAsync();

            // Spawn the new submenu
            await spawnSubmenuAsync(item, index);

        } catch (err) {
            console.error('[Watermelon] Error during submenu transition:', err);
            // Ensure handlers are re-enabled even if an error occurs during spawn/close
            enableAllEventHandlers();
        } finally {
            // Add a small buffer before allowing the next transition
            // This helps prevent issues if animations slightly overlap the promise resolution
            setTimeout(() => {
                isTransitioning = false;
                console.warn('[Watermelon] Submenu transition complete.'); // Debug log
            }, 50);
        }
    };

    // New async helper to close the active submenu
    async function closeSubmenuAsync() {
        if (!activeSubmenu) return Promise.resolve(); // Nothing to close

        console.warn('[Watermelon] Closing existing submenu...'); // Debug log
        return new Promise((resolve) => {
            const closingSubmenu = activeSubmenu;
            activeSubmenu = null; // Clear the reference immediately

            // Hide animation
            closingSubmenu.hide?.();

            // Wait for hide animation + disposal
            const timeoutId = setTimeout(() => {
                scene.remove(closingSubmenu);
                closingSubmenu.dispose?.(); // Dispose resources
                console.warn('[Watermelon] Existing submenu closed and disposed.'); // Debug log

                // IMPORTANT: Re-enable handlers *after* the old submenu is fully gone
                enableAllEventHandlers();

                // Remove this ID from the tracking array once executed
                const index = timeoutIds.indexOf(timeoutId);
                if (index > -1) timeoutIds.splice(index, 1);

                resolve(); // Signal completion
            }, 300); // Match your existing submenu close timing
            timeoutIds.push(timeoutId); // Store the timeout ID
        });
    }

    // New async helper to spawn a submenu
    async function spawnSubmenuAsync(item, index) {
        return new Promise((resolve, reject) => {
            const mesh = carousel.itemMeshes[index];
            if (!mesh) {
                console.warn('[Watermelon] No mesh found for submenu spawn:', item, index);
                // If mesh isn't found, we should probably re-enable handlers here too
                enableAllEventHandlers();
                return reject(new Error(`Mesh not found for item ${item} at index ${index}`));
            }

            console.warn(`[Watermelon] Spawning submenu for: ${item}`); // Debug log

            const submenuItems = submenus[item]; // Get the items for the submenu

            // Check if submenuItems is an array
            if (!Array.isArray(submenuItems)) {
                console.warn(`[Watermelon] Expected an array of strings for submenu items, but got:`, typeof submenuItems, submenuItems);
                // Optionally reject or provide default empty array
                // return reject(new Error(`Invalid submenu items for ${item}`));
                // submenuItems = []; // Fallback to empty array
            }

            // Pass carousel instance in config
            const submenuConfig = { ...currentTheme, carousel };
            const submenu = new Carousel3DSubmenu(mesh, submenuItems || [], submenuConfig); // Use fallback if needed

            // ---> INJECT SCENE AND CAMERA HERE <---
            if (scene) {
                submenu.scene = scene;
                 console.log('[Watermelon] Injected scene into submenu.');
            } else {
                console.error('[Watermelon] CRITICAL: Scene is missing during submenu creation!');
            }
            if (camera) {
                submenu.camera = camera;
                 console.log('[Watermelon] Injected camera into submenu.');
            } else {
                console.error('[Watermelon] CRITICAL: Camera is missing during submenu creation!');
            }
            // ---> END INJECTION <---

            activeSubmenu = submenu; // Set the new active submenu
            scene.add(submenu);
            scene.userData.activeSubmenu = activeSubmenu; // Update scene userData if needed

            // Show animation (assuming show is synchronous or starts an animation)
            submenu.show?.();

            // Assuming 'show' starts an animation, we might need a slight delay
            // or a callback/promise from 'show' itself if it were async.
            // For now, resolve after a short delay assuming show animation starts.
            const timeoutId = setTimeout(() => {
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);

    scene.add(carousel, ambientLight, directionalLight);

    // Define resize handler
    const resizeHandler = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        carousel.resize?.(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resizeHandler);

    // Keep the existing closeSubmenu function for manual closing (e.g., close button)
    // It might need adjustments later if it conflicts with the async flow,
    // but for now, we leave it for the close button functionality.
    function closeSubmenu(immediate = false) {
      // Check the *new* transition flag as well
      if (!activeSubmenu || isTransitioning) return;
      // Set the transition flag when manually closing too
      isTransitioning = true;
      console.warn('[Watermelon] Manual closeSubmenu called.'); // Debug log

      if (activeSubmenu.floatingPreview) {
          activeSubmenu.stopFloatingPreviewSpin();
          gsap.to(activeSubmenu.floatingPreview.scale, {
              x: 0,
              y: 0,
              z: 0,
              duration: 0.2,
              ease: 'back.in',
          });
      }
  
      if (activeSubmenu.closeButton) {
          activeSubmenu.closeButton.material.color.set(0xff0000);
      }
  
      if (activeSubmenu.parentItem?.material) {
          gsap.to(activeSubmenu.parentItem.material, {
              opacity: 1.0,
              duration: 0.5,
          });
      }
  
      const remove = () => {
          scene.remove(activeSubmenu);
          scene.userData.activeSubmenu = null;
          if (carousel && carousel.parent && carousel.parent.userData) {
              carousel.parent.userData.activeSubmenu = null;
          }
          
          // IMPORTANT: Clear this BEFORE enabling handlers
          const closedSubmenu = activeSubmenu; // Keep ref for dispose check
          activeSubmenu = null;

          // Dispose if the submenu has a dispose method
          closedSubmenu?.dispose?.();
          console.warn('[Watermelon] Manual closeSubmenu disposed.'); // Debug log

          // Re-enable main carousel handlers
          enableAllEventHandlers();

          // Reset any active animations
          if (carousel) {
              carousel.isAnimating = false;
          }

          // Finally clear transitioning flag after a buffer
          setTimeout(() => {
              isTransitioning = false;
              console.warn('[Watermelon] Manual closeSubmenu complete.'); // Debug log
          }, 50);

          // Optional: Force a wheel event to test functionality
          // console.warn('Submenu closed, wheel handler reactivated:', isWheelHandlerActive);
      };

      if (immediate) {
          remove();
      } else {
          activeSubmenu.hide();
          const timeoutId = setTimeout(() => {
              remove();
              // Remove this ID from the tracking array once executed
              const index = timeoutIds.indexOf(timeoutId);
              if (index > -1) timeoutIds.splice(index, 1);
          }, 300);
          timeoutIds.push(timeoutId); // Store the timeout ID
      }

      // controls.enabled = true; // This might interfere, review if needed
    }

    // Define click handler
    function handleCarouselClick(event) {
        // Use the new transition flag
        if (isTransitioning) {
            console.warn('[Watermelon] Click ignored during transition.');
            return;
        }

        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        if (activeSubmenu) {
            const hits = raycaster.intersectObject(activeSubmenu, true);
            if (hits.length > 0) {
                const obj = hits[0].object;
                // Check if the clicked object or its parent is a submenu item
                let submenuItemData = null;
                if (obj.userData?.isSubmenuItem) {
                    submenuItemData = obj.userData;
                } else if (obj.parent?.userData?.isSubmenuItem) {
                    submenuItemData = obj.parent.userData;
                }

                if (submenuItemData && typeof submenuItemData.index === 'number') {
                    const index = submenuItemData.index;
                    const item = activeSubmenu.items?.[index];

                    // Force index sync
                    activeSubmenu.currentIndex = index;

                    // Handle specific items to trigger floating content
                    // Check for specific items FIRST
                    if (item === 'About' || item === 'Favorites' || item === 'Product' || item === 'Shopify' || item === 'Cart') { // Added 'Cart' here too
                        const id = item.toLowerCase(); // e.g., 'about', 'favorites', 'cart'

                        // <<< FIX: Call selectItem to show preview BEFORE triggering panel
                        activeSubmenu.selectItem(index, true, true); // Show preview

                        // Replace the direct call with the waitForWindowWM function
                        waitForWindowWM(id);
                        console.warn(`🍉 Attempting to trigger floating panel: ${id}`);
                        // Optionally close the submenu after triggering content
                        // closeSubmenu();
                    } else {
                        // Fallback/default behavior for other submenu items
                        activeSubmenu.selectItem(index, true, true); // <- preview true
                    }
                } else if (obj.userData?.isCloseButton || obj.parent?.userData?.isCloseButton) {
                    // Handle close button click
                    closeSubmenu();
                }
                return; // Exit after handling submenu click or close button
            }
        }

        // ...existing code for handling main carousel item clicks...
        const itemsHit = raycaster.intersectObjects(carousel.itemGroup.children, true);
        for (const hit of itemsHit) {
            let current = hit.object;
            while (current && current.parent !== carousel.itemGroup) current = current.parent;
            if (current && current.userData.index !== undefined) {
                const i = current.userData.index;
                carousel.onItemClick?.(i, items[i]);
                carousel.selectItem(i, true);
                break;
            }
        }
    }

    window.addEventListener('click', handleCarouselClick);

    // Define keydown handler
    const keydownHandler = (e) => {
        if (e.key === 'ArrowRight') carousel.goToNext();
        else if (e.key === 'ArrowLeft') carousel.goToPrev();
    };
    window.addEventListener('keydown', keydownHandler);

    const themes = [defaultCarouselStyle, darkTheme, cyberpunkTheme, lightTheme];
    let themeIndex = 0;

    const toggleTheme = () => {
        themeIndex = (themeIndex + 1) % themes.length;
        currentTheme = themes[themeIndex];

        closeSubmenu(true);

        scene.background = new THREE.Color(currentTheme.backgroundColor);
        scene.remove(carousel);

        const newCarousel = new Carousel3DPro(items, currentTheme);
        newCarousel.userData = { camera };
        newCarousel.onItemClick = carousel.onItemClick;

        scene.add(newCarousel);
        if (carousel.dispose) carousel.dispose();
        Object.assign(carousel, newCarousel);
    };

    const animate = () => {
        animationFrameId = requestAnimationFrame(animate); // Store the animation frame ID
        carousel.update();
        activeSubmenu?.update?.();
        controls.update();
        renderer.render(scene, camera);
    };

    animate();

    // Create the dispose function
    const dispose = () => {
        // eslint-disable-next-line no-console
        console.groupCollapsed('[🍉 Carousel3DPro Cleanup]'); // Start collapsed group
        console.warn("Disposing carousel resources...");
        // Phase 1: Stop the Animation Loop
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null; // Reset the ID
            console.warn("Animation loop stopped.");
        }

        // Phase 1.5: Clear Timeouts and Intervals
        console.warn("Clearing active timeouts and intervals...");
        timeoutIds.forEach(clearTimeout);
        timeoutIds.length = 0; // Clear the array
        if (wmCheckIntervalId) {
            clearInterval(wmCheckIntervalId);
            wmCheckIntervalId = null;
            console.warn("Cleared waitForWindowWM interval.");
        }
        console.warn("Timeouts and intervals cleared.");

        // Phase 2: Remove Global Event Listeners
        console.warn("Removing global event listeners...");
        window.removeEventListener('resize', resizeHandler);
        window.removeEventListener('wheel', wheelEventHandler, { capture: true }); // Ensure capture matches addEventListener
        window.removeEventListener('click', handleCarouselClick);
        window.removeEventListener('keydown', keydownHandler);
        window.removeEventListener('touchstart', touchStartHandler, { passive: false }); // Ensure options match
        window.removeEventListener('touchmove', touchMoveHandler, { passive: false }); // Ensure options match
        window.removeEventListener('touchend', touchEndHandler, { passive: false }); // Ensure options match
        console.warn("Global event listeners removed.");

        // Phase 3: Kill Active GSAP Animations
        console.warn("Killing GSAP animations...");
        if (carousel?.itemGroup) {
            gsap.killTweensOf(carousel.itemGroup);
        }
        if (activeSubmenu) {
            gsap.killTweensOf(activeSubmenu); // Kill tweens targeting the submenu object itself
            // Also kill tweens targeting children if necessary (e.g., items, close button)
            activeSubmenu.children.forEach(child => gsap.killTweensOf(child));
            if (activeSubmenu.floatingPreview) {
                gsap.killTweensOf(activeSubmenu.floatingPreview);
                gsap.killTweensOf(activeSubmenu.floatingPreview.scale); // Kill specific property tweens if needed
            }
            if (activeSubmenu.closeButton) {
                 gsap.killTweensOf(activeSubmenu.closeButton.material); // Kill material tweens
                 gsap.killTweensOf(activeSubmenu.closeButton.scale);
            }
        }
        // Optional: Blanket kill for all scene children - use with caution
        // gsap.killTweensOf(scene.children); 
        console.warn("GSAP animations killed.");

        // Phase 4: Dispose Submenu and Carousel
        console.warn("Disposing Three.js objects...");
        if (activeSubmenu) {
            // Ensure GSAP tweens targeting the submenu are killed *before* disposal
            gsap.killTweensOf(activeSubmenu);
            activeSubmenu.children.forEach(child => gsap.killTweensOf(child)); // Kill children tweens too
            if (activeSubmenu.floatingPreview) gsap.killTweensOf(activeSubmenu.floatingPreview);
            if (activeSubmenu.closeButton) gsap.killTweensOf(activeSubmenu.closeButton.material);

            activeSubmenu.dispose?.();
            scene.remove(activeSubmenu);
            activeSubmenu = null; // Clear reference
            console.warn("Active submenu disposed and removed during main dispose.");
        }
        if (carousel) {
            // Assuming Carousel3DPro will have a dispose method
            carousel.dispose?.(); 
            scene.remove(carousel);
            // carousel = null; // Don't nullify if it's returned
            console.warn("Main carousel disposed and removed.");
        }

        // Dispose OrbitControls
        if (controls) {
            controls.dispose();
            // controls = null; // Don't nullify if needed elsewhere, but good practice if not
            console.warn("OrbitControls disposed.");
        }

        // Dispose Renderer and remove canvas
        if (renderer) {
            renderer.dispose();
            if (renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
            // renderer = null; // Don't nullify if needed elsewhere
            console.warn("Renderer disposed and canvas removed.");
        }

        // Dispose Scene resources (optional, depends on complexity)
        console.warn("Traversing scene to dispose geometries, materials, and textures...");
        scene.traverse((obj) => {
          if (obj.geometry) {
            obj.geometry.dispose();
            // console.log("Disposed geometry for:", obj.name || obj.type);
          }
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => {
                  m.dispose();
                  // console.log("Disposed material (array) for:", obj.name || obj.type);
              });
            } else {
              obj.material.dispose();
              // console.log("Disposed material for:", obj.name || obj.type);
            }
          }
          // Note: Textures are usually part of materials and disposed when the material is disposed.
          // Explicit texture disposal might be needed if textures are managed separately.
          // if (obj.texture) { // Less common to find textures directly on objects like this
          //   obj.texture.dispose();
          // }
        });
        console.warn("Scene traversal and disposal complete.");
        // scene = null; // Don't nullify if needed elsewhere

        console.warn("Carousel disposal complete.");
        // eslint-disable-next-line no-console
        console.groupEnd(); // End collapsed group
    };

    return {
        carousel,
        scene,
        camera,
        renderer,
        nextItem: () => carousel.goToNext(),
        prevItem: () => carousel.goToPrev(),
        toggleTheme,
        closeSubmenu, // Keep returning the manual close function
        dispose, // Return the dispose function
    };
}