/**
 * Sets up an interactive 3D carousel with Three.js and mounts it to a DOM container.
 * This creates a complete carousel system with main items and nested submenus.
 * 
 * @param {HTMLElement} container - DOM element to mount the Three.js canvas to
 * @returns {Object} Control interface for the carousel
 * @returns {Object} .carousel - Reference to the main Carousel3DPro instance
 * @returns {THREE.Scene} .scene - Reference to the Three.js scene
 * @returns {THREE.Camera} .camera - Reference to the Three.js camera
 * @returns {THREE.WebGLRenderer} .renderer - Reference to the Three.js renderer
 * @returns {Function} .nextItem - Function to navigate to the next carousel item
 * @returns {Function} .prevItem - Function to navigate to the previous carousel item
 * @returns {Function} .toggleTheme - Function to cycle through available themes
 * @returns {Function} .closeSubmenu - Function to manually close any active submenu
 * @returns {Function} .dispose - Function to clean up all resources and event listeners
 * 
 * @example
 * const container = document.getElementById('carousel-container');
 * const carouselControls = setupCarousel(container);
 * 
 * // Navigate carousel
 * carouselControls.nextItem();
 * 
 * // Clean up when done
 * carouselControls.dispose();
 */
// app/components/Carousel3DPro/main.js
/**
 * @AI-PROMPT
 * This file manages the parent–submenu interaction flow.
 * It listens for carousel clicks, spawns submenus, injects camera/scene, and calls `.selectItem()` on submenus.
 *
 * 🚨 IMPORTANT
 * This file is critical for ensuring submenu state is managed correctly.
 * It must:
 * - Prevent submenu state hijacks by coordinating locked index setting and correct input propagation.
 * 
 * 🧠 ROLE:
 * This file orchestrates the overall 3D interface:
 * - Injects Three.js scene and camera into submenu instances.
 * - Spawns and disposes submenus in response to user clicks.
 * - Binds parent carousel (`Carousel3DPro`) to submenu logic.
 *
 * 🖱️ EVENT PIPELINE:
 * 1. User clicks parent item → `handleCarouselClick()`
 * 2. Spawns submenu → `spawnSubmenuAsync(parentItem)`
 * 3. Sets submenu with scene, camera → `submenu.show()`
 * 4. Calls `submenu.selectItem(index)` with clicked submenu index
 *
 * 🧩 SPECIAL NOTES:
 * - Rotation bugs often originate here by miscalculating `index` or allowing menu override.
 * - `handleCarouselClick()` is the main entry point for submenu interaction.
 * - Avoid referencing submenuItems before they are defined.
 *
 * 🔍 DEPENDENCIES:
 * - Carousel3DSubmenu.js → show(), selectItem(), dispose()
 * - Carousel3DPro.js → provides parentItem, rotation
 *
 * ✅ GOAL:
 * Prevent submenu state hijacks by coordinating locked index setting and correct input propagation.
 * - When a carousel item is clicked, spawn a submenu with items centered around it.
 * - Ensure the submenu always highlights the clicked index at the 3 o’clock position.
 * 
 * 🔧 KEY INTERACTIONS:
 * - `spawnSubmenuAsync(index)` → creates and positions submenu based on parent item rotation
 * - `handleCarouselClick()` → relays click index to submenu’s `.selectItem(index)`
 *
 * 🔁 RISK:
 * - If the submenu overrides the `currentIndex` visually (e.g., via `update()`), the click highlight may be lost.
 * - Ensure `forceLockedIndex` or similar guards are respected in submenu.
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

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Carousel3DPro } from './Carousel3DPro.js';
import { Carousel3DSubmenu } from './Carousel3DSubmenu';
import { spawnSubmenuAsync } from './SubmenuManager.js'; // Import the extracted function
import {
    defaultCarouselStyle,
    darkTheme,
    cyberpunkTheme,
    lightTheme,
} from './CarouselStyleConfig.js';
import gsap from 'gsap';
import { getItemAngles } from '../../utils/carouselAngleUtils.js';
import { globalGuard, withTransition, SelectionGuard } from './modules/selectionGuards.js';
import { ContentManager } from '../../utils/contentManager.js';
import enhanceCartIntegration from '../../utils/cartIntegrationEnhancer.js';
import watermelonIntegrationTests from '../../utils/watermelonIntegrationTests.js';
import cartTestUtils from '../../utils/cartTestUtils.js';
// import { getHomeAngleRadians } from '@/utils/homePositionUtils';

/**
 * Sets up a 3D carousel instance and mounts it to the provided container
 * @param {HTMLElement} container - DOM element to mount the canvas to
 * @returns {Object} - carousel controls and diagnostics
 */
export function setupCarousel(container, menuData = null) {
    if (typeof window === 'undefined') return null; // Ensure we're in a browser environment
    let animationFrameId = null; // Declare animationFrameId
    const timeoutIds = []; // Array to store timeout IDs
    let wmCheckIntervalId = null; // Variable to store the interval ID for waitForWindowWM
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
    const scene = new THREE.Scene(); // Create a new Three.js scene
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
        // Use the guard to check if scrolling is allowed
        if (activeSubmenu) {
            // Only scroll submenu if it allows scrolling
            if (activeSubmenu.guard && activeSubmenu.guard.canScroll()) {
                activeSubmenu.scrollSubmenu(delta > 0 ? 1 : -1); // Invert for natural feel
            } else {
                console.warn('[Watermelon] Submenu scroll blocked by guard.');
            }
        } else if (isWheelHandlerActive && globalGuard.canScroll()) {
            // Only navigate main carousel if scrolling is allowed
            const angleStep = (2 * Math.PI) / items.length; // Calculate angle step based on number of items
            carousel.spin(delta > 0 ? -angleStep : angleStep); // Invert direction for natural feel
        } else {
            console.warn('[Watermelon] Main carousel scroll blocked by guard or handler inactive.');
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
                activeSubmenu.scrollSubmenu(direction); // Invert for natural feel
            } else { // If no submenu is active
                const direction = touchStartX < event.changedTouches[0].clientX ? 1 : -1;
                // Apply momentum to carousel
                const angleStep = (2 * Math.PI) / items.length; // Calculate angle step based on number of items    
                carousel.spin(direction * angleStep); // Direction feels natural
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
    }    // Initial setup: attach event listeners
    enableAllEventHandlers(); // Attach all event listeners initially
    
    // =======================
    // MENU TOGGLE SYSTEM
    // =======================
    
    // Check for menu mode toggle (can be controlled via localStorage, URL param, or global var)
    const getMenuMode = () => {
        // Priority: URL param > localStorage > default to 'auto'
        const urlParams = new URLSearchParams(window.location.search);
        const urlMode = urlParams.get('menuMode');
        if (urlMode && ['dummy', 'dynamic', 'auto'].includes(urlMode)) {
            return urlMode;
        }
        
        const storedMode = localStorage.getItem('watermelon-menu-mode');
        if (storedMode && ['dummy', 'dynamic', 'auto'].includes(storedMode)) {
            return storedMode;
        }
        
        return 'auto'; // default mode
    };
    
    // Set up menu toggle controls
    const menuMode = getMenuMode();
    console.warn('[🍉 Setup] Menu mode:', menuMode);
    
    // Expose menu toggle function globally for admin/debug use
    window.toggleMenuMode = (mode) => {
        if (!['dummy', 'dynamic', 'auto'].includes(mode)) {
            console.error('[Menu Toggle] Invalid mode. Use: dummy, dynamic, or auto');
            return;
        }
        localStorage.setItem('watermelon-menu-mode', mode);
        console.warn(`[Menu Toggle] Mode set to ${mode}. Reload page to apply.`);
        window.location.reload();
    };
    
    // Expose current mode for debugging
    window.getMenuMode = getMenuMode;
    
    // Define dummy/fallback menu data
    const dummyMenuData = {
        items: ['Home', 'Products', 'Contact', 'About', 'Gallery', 'Store'],
        submenus: {
            Home: ['Dashboard', 'Activity', 'Settings', 'Profile'],
            Products: ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Toys', 'Sports'],
            Services: ['Consulting', 'Training', 'Support', 'Installation', 'Maintenance'],
            About: ['Company', 'Team', 'History', 'Mission', 'Values'],
            Contact: ['Email', 'Phone', 'Chat', 'Social Media', 'Office Locations'],
            Gallery: ['Photos', 'Videos', '3D Models', 'Artwork', 'Animations', 'Virtual Tours'],
            Store: ['Cart', 'Wishlist', 'Orders', 'Account', 'Gift Cards'],
        }
    };
    
    // Determine which menu data to use
    let finalMenuData;
    let menuSource;
    
    switch (menuMode) {
        case 'dummy':
            finalMenuData = dummyMenuData;
            menuSource = 'dummy (forced)';
            break;
        case 'dynamic':
            if (menuData && menuData.items && menuData.submenus) {
                finalMenuData = menuData;
                menuSource = 'dynamic (forced)';
            } else {
                console.warn('[🍉 Setup] Dynamic mode forced but no valid menuData provided, falling back to dummy');
                finalMenuData = dummyMenuData;
                menuSource = 'dummy (dynamic failed)';
            }
            break;
        case 'auto':
        default:
            if (menuData && menuData.items && menuData.submenus) {
                finalMenuData = menuData;
                menuSource = 'dynamic (auto)';
            } else {
                finalMenuData = dummyMenuData;
                menuSource = 'dummy (auto fallback)';
            }
            break;
    }
    
    // Extract items and submenus from final menu data
    const items = finalMenuData.items;
    const submenus = finalMenuData.submenus;
      console.warn('[🍉 Setup] Using menu data:', {
        source: menuSource,
        itemCount: items.length,
        hasSubmenus: Object.keys(submenus).length,
        items
    });
      // Expose menu data globally for debugging
    window.debugMenuData = {
        mode: menuMode,
        source: menuSource,
        data: finalMenuData,
        toggle: window.toggleMenuMode
    };
    
    // =======================
    // CONTENT MANAGER INTEGRATION
    // =======================
      // Initialize Content Manager for contextual content
    const contentManager = new ContentManager();
      // Expose globally for debugging and external access
    window.contentManager = contentManager;
    
    // Initialize enhanced cart integration
    enhanceCartIntegration();
    
    // Initialize testing utilities
    window.integrationTests = watermelonIntegrationTests;
    window.cartTestUtils = cartTestUtils;
    
    // Function to load content for a selected menu item
    const loadContentForItem = async (itemTitle, submenuItem = null) => {
        try {
            console.warn(`[🍉 Content] Loading content for: ${itemTitle}${submenuItem ? ` > ${submenuItem}` : ''}`);            
            // Determine what content to load
            const targetItem = submenuItem || itemTitle;
            const contentData = await contentManager.getContentData(targetItem);
            
            if (contentData) {
                console.warn(`[🍉 Content] Loaded content:`, {
                    type: contentData.type,
                    title: contentData.title,
                    hasContent: !!contentData.content,
                    isPlaceholder: !!contentData.isPlaceholder
                });
                
                // Try to display content in central panel if available
                if (window.centralPanel) {
                    // Use new template system if available
                    if (window.centralPanel.loadTemplatedContent) {
                        await window.centralPanel.loadTemplatedContent(contentData);
                    } else if (window.centralPanel.loadContent) {
                        window.centralPanel.loadContent(contentData.type, contentData);
                    }
                } else {
                    console.warn('[🍉 Content] Central panel not available yet, storing content for later');
                    window._pendingContent = contentData;
                }
                return contentData;
            }
        } catch (error) {
            console.error(`[🍉 Content] Error loading content for ${itemTitle}:`, error);
        }
        
        return null;
    };
      // Expose content loading function globally
    window.loadContentForItem = loadContentForItem;
    
    // =======================
    // ADMIN PANEL / DEBUG INTERFACE
    // =======================
    
    // Create admin interface for testing and debugging
    window.watermelonAdmin = {
        // Menu mode controls
        setMenuMode: (mode) => window.toggleMenuMode(mode),
        getMenuMode: () => getMenuMode(),
        getCurrentMenuData: () => window.debugMenuData,
        
        // Content management
        loadContent: loadContentForItem,
        getContentManager: () => window.contentManager,
        clearContentCache: () => window.contentManager?.clearCache(),
        
        // Carousel controls
        getCarousel: () => carousel,
        getActiveSubmenu: () => activeSubmenu,
        closeSubmenu: () => closeSubmenu(),
        
        // Debug helpers
        repairState: () => repairBrokenState(),
        showHelp: () => {
            console.group('🍉 Watermelon Admin Commands');
            console.log('Menu Controls:');
            console.log('  watermelonAdmin.setMenuMode("dummy")    - Use hardcoded menu');
            console.log('  watermelonAdmin.setMenuMode("dynamic")  - Use Shopify menu');
            console.log('  watermelonAdmin.setMenuMode("auto")     - Auto-detect best menu');
            console.log('  watermelonAdmin.getMenuMode()           - Check current mode');
            console.log('');
            console.log('Content Controls:');
            console.log('  watermelonAdmin.loadContent("Home")     - Load content for item');
            console.log('  watermelonAdmin.clearContentCache()     - Clear content cache');
            console.log('');
            console.log('Debug Controls:');
            console.log('  watermelonAdmin.getCarousel()           - Get carousel instance');
            console.log('  watermelonAdmin.repairState()           - Fix broken states');
            console.log('  watermelonAdmin.closeSubmenu()          - Close active submenu');
            console.groupEnd();
        }
    };
    
    console.group('🍉 Watermelon Hydrogen 3D Menu System');
    console.log('✅ System initialized successfully');
    console.log(`📊 Menu Mode: ${menuSource}`);
    console.log(`📋 Items: ${items.length} (${items.join(', ')})`);
    console.log(`📁 Submenus: ${Object.keys(submenus).length}`);
    console.log('🔧 Admin: Type watermelonAdmin.showHelp() for commands');
    console.groupEnd();
    let activeSubmenu = null; // Track the currently active submenu
    let isTransitioning = false; // New flag for async handling, initially false
    const carousel = new Carousel3DPro(items, currentTheme); // Create the carousel instance
    carousel.userData = { camera }; // Store camera reference in userData for later access
    carousel.isAnimating = false; // Track animation state
    // Fix 1: Ensure carousel is added to scene
    scene.add(carousel);
    console.warn("[Watermelon] Added main carousel to scene:", scene.children.includes(carousel));
    
    // Fix 1: Set visibility explicitly
    carousel.visible = true;
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
    
    // New function to update the activeSubmenu reference
    function setActiveSubmenu(submenu) {
        activeSubmenu = submenu;
    }
    
    // Use the global guard for transitions between carousel and submenus
    // Replace the isTransitioning flag with the guard
    Object.defineProperty(carousel, 'isTransitioning', {
        get: () => globalGuard.isTransitioning,
        set: (value) => { globalGuard.isTransitioning = value; }
    });
    
    // Refactored onItemClick using async/await and transition guards
    carousel.onItemClick = async (index, item) => {
        if (!submenus[item]) {
            console.warn(`[🍉 Click] Item ${item} has no submenu defined, ignoring click.`);
            return;
        }
        
        // Check if a transition is allowed using the guard
        if (!globalGuard.canSelect()) {
            console.warn('[Watermelon] Submenu transition in progress or animation locked. Skipping click.');
            return;
        }
        
        console.warn(`[🍉 Click] Processing click on item ${index}: ${item}`);
        
        // Use the withTransition helper for clean state management
        await withTransition(globalGuard, async () => {
            isTransitioning = true; // For backward compatibility
            console.warn('[Watermelon] Starting submenu transition...');
            
            // When opening a submenu, disable wheel handler for main carousel
            disableMainCarouselHandlers();
            
            try {
                // Close existing submenu if there is one
                await closeSubmenuAsync();
                
                // Log explicit details about the spawning
                console.warn(`[🍉 Click] About to spawn submenu for ${item} with:`, {
                    sceneExists: !!scene,
                    cameraExists: !!camera,
                    carouselExists: !!carousel,
                    submenusExist: !!submenus,
                    setActiveSubmenuExists: !!setActiveSubmenu,
                    themeExists: !!currentTheme,
                    getItemAnglesExists: !!getItemAngles,
                    guardExists: !!globalGuard,
                    submenusForItem: submenus[item]
                });
                
                // Ensure we pass the globalGuard to spawnSubmenuAsync
                await spawnSubmenuAsync(item, index, {
                    scene,
                    camera,
                    carousel,
                    submenus,
                    setActiveSubmenu,
                    currentTheme,
                    getItemAngles,
                    guard: globalGuard  // Pass the global guard explicitly
                });
                
                console.warn(`[🍉 Click] Submenu spawn completed for ${item}`);
                
                // Check if the submenu is actually created and in the scene
                if (activeSubmenu) {
                    console.warn('[🍉 Click] Submenu is active after spawn:', {
                        visible: activeSubmenu.visible,
                        inScene: scene.children.includes(activeSubmenu),
                        isInitialized: activeSubmenu.isInitialized,
                        itemCount: activeSubmenu.itemMeshes?.length || 0,
                        hasGuard: !!activeSubmenu.guard,
                        guardValid: activeSubmenu.guard instanceof SelectionGuard
                    });
                    
                    // Ensure guard is correctly set - failsafe
                    if (!activeSubmenu.guard || typeof activeSubmenu.guard.lockSelection !== 'function') {
                        console.warn('[🍉 Click] Fixing missing guard on activeSubmenu');
                        activeSubmenu.guard = globalGuard;
                    }
                } else {
                    console.error('[🍉 Click] Failed to create active submenu!');
                }
            } catch (err) {
                console.error('[Watermelon] Error during submenu transition:', err);
                // Ensure handlers are re-enabled even if an error occurs
                enableAllEventHandlers();
            }
        });
        
        // Add a small buffer after transition completes
        setTimeout(() => {
            isTransitioning = false; // For backward compatibility
            console.warn('[Watermelon] Submenu transition complete.');
        }, 50);
    };

    // New async helper to close the active submenu with guard protection
    async function closeSubmenuAsync() {
        if (!activeSubmenu) return Promise.resolve();
        
        console.warn('[Watermelon] Closing existing submenu...');
        
        return new Promise((resolve) => {
            const closingSubmenu = activeSubmenu;
            activeSubmenu = null; // Clear the reference immediately
            
            // Hide animation
            closingSubmenu.hide?.();
            
            // Wait for hide animation + disposal
            const timeoutId = setTimeout(() => {
                scene.remove(closingSubmenu);
                // Make sure to clear any internal guards in the submenu
                if (closingSubmenu.guard) {
                    closingSubmenu.guard.reset();
                }
                closingSubmenu.dispose?.();
                console.warn('[Watermelon] Existing submenu closed and disposed.');
                
                // Re-enable handlers *after* the old submenu is fully gone
                enableAllEventHandlers();
                
                // Fix 2: Explicitly reset transition states
                globalGuard.reset();
                isTransitioning = false;
                
                // Fix 2: Ensure carousel is visible 
                carousel.visible = true;
                
                resolve();
            }, 300);
            
            timeoutIds.push(timeoutId);
        });
    }

    // Fix 2: Improved version of closeSubmenu to properly reset state
    function closeSubmenu(immediate = false) {
        // Check the guard state as well as activeSubmenu
        if (!activeSubmenu) {
            // Fix 2: If no active submenu but isTransitioning is true, repair the state
            if (globalGuard.isTransitioning || isTransitioning) {
                repairBrokenState();
            }
            return;
        }
        
        // Use the guard to manage transition state
        globalGuard.isTransitioning = true;
        isTransitioning = true; // For backward compatibility
        
        console.warn('[Watermelon] Manual closeSubmenu called.');
        
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
            // Reset any active animations without touching materials
            if (carousel) { // Reset carousel animation state
                carousel.isAnimating = false; // Reset carousel animation flag
            }
            // Finally clear transitioning flag after a buffer
            setTimeout(() => { // Reset the transition flag after a short delay
                globalGuard.reset(); // Fix 2: Reset all guards
                isTransitioning = false; // Reset transition flag to allow future transitions
                console.warn('[Watermelon] Manual closeSubmenu complete.'); // Debug log
                
                // Fix 2: Ensure carousel is visible
                carousel.visible = true;
                
                // Ensure a final re-render happens
                if (typeof animate === 'function') {
                    requestAnimationFrame(animate);
                }
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
        // Optional: If transition has been stuck for too long, repair the state
        if (globalGuard.isTransitioning) {
            const now = Date.now();
            if (!window._lastTransitionTime) {
                window._lastTransitionTime = now;
            } else if (now - window._lastTransitionTime > 5000) { // 5 seconds
                console.warn("[Watermelon] Transition appears stuck, repairing state");
                repairBrokenState();
                window._lastTransitionTime = null;
            }
        } else {
            window._lastTransitionTime = null;
        }
    
        // Check the guard state
        if (globalGuard.isTransitioning) {
            console.warn('[Watermelon] Click ignored during transition.');
            return;
        }
        
        // Add explicit debug 
        console.warn('[🍉 Click] Processing carousel click at', event.clientX, event.clientY);
        
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        // Get accurate mouse coordinates relative to canvas
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // DEBUG: Check for any intersections with the scene
        const allIntersects = raycaster.intersectObjects(scene.children, true);
        console.warn(`[🍉 Click] Found ${allIntersects.length} total intersections with scene`);
        
        if (allIntersects.length > 0) {
            console.warn('[🍉 Click] First hit object:', allIntersects[0].object);
        }
        
        // Handle submenu clicks first
        if (activeSubmenu) {
            const hits = raycaster.intersectObject(activeSubmenu, true);
            
            console.warn(`[🍉 Click] Found ${hits.length} intersections with active submenu`);
            
            if (hits.length > 0) {
                // ...existing code to handle submenu clicks...
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
                    }                    // Force index sync
                    activeSubmenu.currentIndex = index; // Sync the current index of the submenu to the clicked index
                    
                    // Load contextual content for the selected submenu item
                    const parentItem = activeSubmenu.parentItem?.userData?.item || 'Unknown';
                    console.warn(`[🍉 Content] Submenu item selected: ${parentItem} > ${item}`);
                    
                    // Show the submenu item preview first
                    activeSubmenu.selectItem(index, true, true); // Show preview
                    
                    // Load content asynchronously
                    loadContentForItem(parentItem, item).then(contentData => {
                        if (contentData) {
                            console.warn(`[🍉 Content] Successfully loaded content for ${parentItem} > ${item}`);
                            
                            // Handle special content types that might need floating panels
                            if (contentData.type === 'cart' || 
                                contentData.type === 'dashboard' || 
                                item.toLowerCase().includes('cart') ||
                                item.toLowerCase().includes('about') ||
                                item.toLowerCase().includes('favorites')) {
                                
                                const id = item.toLowerCase();
                                waitForWindowWM(id); // Wait for window.__wm__ to be ready before triggering content
                                console.warn(`🍉 Attempting to trigger floating panel: ${id}`);
                            }
                        }
                    }).catch(error => {
                        console.error(`[🍉 Content] Failed to load content for ${parentItem} > ${item}:`, error);
                    });
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
        
        // Handle main carousel clicks
        const itemsHit = raycaster.intersectObjects(carousel.itemGroup.children, true);
        console.warn(`[🍉 Click] Found ${itemsHit.length} intersections with main carousel items`);
        
        for (const hit of itemsHit) {
            let current = hit.object;
            
            // Traverse to find the parent item
            while (current && current.parent !== carousel.itemGroup) {
                current = current.parent;
            }
              if (current && current.userData.index !== undefined) {
                const i = current.userData.index;
                const itemName = items[i];
                
                console.warn(`[🍉 Click] Clicked main carousel item at index ${i}: ${itemName}`);
                console.warn(`[🍉 Click] This item has submenu: ${!!submenus[itemName]}`);
                
                // Load content for the main carousel item
                loadContentForItem(itemName).then(contentData => {
                    if (contentData) {
                        console.warn(`[🍉 Content] Loaded content for main item: ${itemName}`);
                    }
                }).catch(error => {
                    console.error(`[🍉 Content] Failed to load content for main item ${itemName}:`, error);
                });
                
                // Call the item click handler on the carousel
                carousel.onItemClick?.(i, itemName);
                carousel.selectItem(i, true);
                break;
            }
        }
        
        // DEBUG: Log carousel visibility and position
        console.warn('[🍉 Click] Main carousel state:', {
            isVisible: carousel.visible,
            inScene: scene.children.includes(carousel),
            position: [carousel.position.x.toFixed(2), 
                      carousel.position.y.toFixed(2), 
                      carousel.position.z.toFixed(2)],
            rotation: [carousel.rotation.x.toFixed(2),
                      carousel.rotation.y.toFixed(2),
                      carousel.rotation.z.toFixed(2)],
            itemCount: carousel.itemMeshes?.length || 0
        });
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
    const animate = () => { 
        animationFrameId = requestAnimationFrame(animate); 
        
        // Only do detailed checks occasionally to avoid log spam
        const doDetailedCheck = Math.random() < 0.001; // ~0.1% of frames
        
        // Add detailed debug tracking for submenu existence and update
        const hasActiveSubmenu = !!activeSubmenu;
        const canUpdateSubmenu = hasActiveSubmenu && typeof activeSubmenu.update === 'function';
        
        if (doDetailedCheck) {
            console.warn('[🍉 Frame] Animation frame check:', {
                hasActiveSubmenu,
                canUpdateSubmenu,
                isTransitioning,
                mainCarouselVisible: carousel.visible,
                mainCarouselInScene: scene.children.includes(carousel),
                itemCount: activeSubmenu?.itemMeshes?.length || 0,
                isVisible: activeSubmenu?.visible || false,
                inScene: activeSubmenu && scene.children.includes(activeSubmenu)
            });
            
            // Fix 4: Ensure carousel is always visible
            if (!carousel.visible || !scene.children.includes(carousel)) {
                console.warn('[Watermelon] Fixing carousel visibility');
                carousel.visible = true;
                if (!scene.children.includes(carousel)) {
                    scene.add(carousel);
                }
            }
        }
        
        // Skip heavy updates during transitions to improve performance
        if (!isTransitioning) {
            // Wrap in try-catch to prevent animation loop from breaking if an update fails
            try {
                carousel.update(); 
                
                // Add more robust submenu update logic with debugging
                if (canUpdateSubmenu) {
                    try {
                        activeSubmenu.update();
                        
                        // Check if we should regenerate items if they're missing
                        if (doDetailedCheck && activeSubmenu.itemMeshes.length === 0 && activeSubmenu.font) {
                            console.warn('[🍉 Frame] Attempting to recreate missing submenu items');
                            activeSubmenu.createItems();
                        }
                    } catch (submenuError) {
                        console.error('[Watermelon] Error updating submenu:', submenuError);
                        // Don't rethrow to keep animation loop running
                    }
                } else if (hasActiveSubmenu && doDetailedCheck) {
                    console.warn('[Watermelon] Active submenu exists but update method is missing or not a function');
                }
                
                controls.update(); 
                renderer.render(scene, camera); 
            } catch (error) {
                console.error('Error in animation loop:', error);
            }
        } else {
            // During transitions, only render without heavy updates
            renderer.render(scene, camera);
        }
    };

    // Add periodic debug checks for submenu state (will be removed after N checks)
    let debugCheckCount = 0;
    const maxDebugChecks = 20;
    
    function periodicSubmenuCheck() {
        if (debugCheckCount >= maxDebugChecks) return;
        
        debugCheckCount++;
        console.log('[Watermelon Debug] Submenu state check:', {
            hasActiveSubmenu: !!activeSubmenu,
            itemCount: activeSubmenu?.itemMeshes?.length || 0,
            isInitialized: activeSubmenu?.isInitialized || false,
            isVisible: activeSubmenu?.visible || false,
            inScene: activeSubmenu?.parent === scene,
            transitionState: isTransitioning
        });
        
        setTimeout(periodicSubmenuCheck, 1000);
    }
    
    // Start the animation loop with debug checks
    animate();
    periodicSubmenuCheck();
    // Add debug logging to track submenu front-facing logic
    function debugSubmenuFrontFacing(submenu) { // Check if submenu is defined and has itemMeshes
        if (!submenu || !submenu.itemMeshes) return; // Check if submenu is defined and has itemMeshes
        console.group('🔍 Submenu Front-Facing Debugging');
        submenu.itemMeshes.forEach((container, index) => { // Loop through each item mesh in the submenu
            if (!container || !container.userData) return; // Check if container is defined and has userData
            const originalAngle = container.userData.originalAngle; // Get the original angle from userData
            const currentRotation = submenu.itemGroup.rotation.x; // Get the current rotation of the item group
            // Calculate effective angle
            let effectiveAngle = (originalAngle + currentRotation) % (Math.PI * 2); // Normalize the effective angle to be within [0, 2π)
            if (effectiveAngle < 0) effectiveAngle += Math.PI * 2; // Ensure effectiveAngle is positive
            // Calculate distance to front (0 radians)
            const angleDiff = Math.min(
                effectiveAngle, // Distance to 0 radians
                Math.abs(Math.PI * 2 - effectiveAngle) // Distance to 2π radians
            );
            console.log(`Item ${index}: originalAngle=${originalAngle.toFixed(2)}, effectiveAngle=${effectiveAngle.toFixed(2)}, angleDiff=${angleDiff.toFixed(2)}`); // Debug log the angles and distance to front
        });
        console.groupEnd(); // End the debug group
    }
    // Call debugSubmenuFrontFacing after submenu updates
    const originalSubmenuUpdate = activeSubmenu?.update; // Store the original update method if it exists
    if (originalSubmenuUpdate) { // Check if the original update method exists
        activeSubmenu.update = function () { // Call the original update method if it exists
            originalSubmenuUpdate.call(this); // Call the original update method
            debugSubmenuFrontFacing(this); // Call the debug function after the original update
        };
    }
    // Create the dispose function
    // Handle window resize events
    const resizeHandler = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        console.log('[Watermelon] Window resize handled');
    };
    
    // Add resize event listener
    window.addEventListener('resize', resizeHandler);
    
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
            gsap.killTweensOf(carousel.itemGroup);
        }
        if (activeSubmenu) {
            gsap.killTweensOf(activeSubmenu); // Kill tweens targeting the submenu object itself
            // Also kill tweens targeting children if necessary (e.g., items, close button)
            activeSubmenu.children.forEach(child => gsap.killTweensOf(child));
            if (activeSubmenu.floatingPreview) { // Check if the submenu has a floating preview
                gsap.killTweensOf(activeSubmenu.floatingPreview); // Kill floating
                gsap.killTweensOf(activeSubmenu.floatingPreview.scale); // Kill specific property tweens if needed
            }
            if (activeSubmenu.closeButton) { // Check if the submenu has a close button
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
            if (activeSubmenu.closeButton) gsap.killTweensOf(activeSubmenu.closeButton.material); // Kill close button material tweens
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
        console.groupEnd(); // End collapsed group
    };

    // New function to repair broken state (when submenu closes but clicks aren't registered)
    function repairBrokenState() {
        console.warn("[Watermelon] Repairing potentially broken state...");
        
        // Reset all guards and state flags
        globalGuard.reset();
        isTransitioning = false;
        
        // Re-enable all handlers
        enableAllEventHandlers();
        
        // Ensure carousel is visible
        carousel.visible = true;
        
        // Force refresh scene state
        scene.updateMatrixWorld(true);
    }

    // Add periodic validity check for carousel
    function checkCarouselValidity() {
        if (!scene.children.includes(carousel)) {
            console.warn("[Watermelon] Carousel not in scene, adding it back");
            scene.add(carousel);
        }
        
        if (!carousel.visible) {
            console.warn("[Watermelon] Carousel not visible, making it visible");
            carousel.visible = true;
        }
        
        // Check transition state and repair if needed
        if (globalGuard.isTransitioning) {
            const now = Date.now();
            if (!window._lastTransitionCheckTime) {
                window._lastTransitionCheckTime = now;
            } else if (now - window._lastTransitionCheckTime > 3000) { // 3 seconds
                console.warn("[Watermelon] Transition appears stuck during check, repairing state");
                repairBrokenState();
                window._lastTransitionCheckTime = null;
            }
        } else {
            window._lastTransitionCheckTime = null;
        }
        
        // Schedule next check
        setTimeout(checkCarouselValidity, 2000);
    }
    
    // Start periodic checks
    setTimeout(checkCarouselValidity, 1000);

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
        guard: globalGuard, // Export the guard for external access if needed
        // Add debugging utilities
        debug: {
            forceSpawnSubmenu: async (itemName, itemIndex) => {
                if (!items.includes(itemName)) {
                    console.error(`[Debug] Item "${itemName}" not found in items list`);
                    return;
                }
                console.warn(`[Debug] Forcing submenu spawn for ${itemName} at index ${itemIndex}`);
                await carousel.onItemClick(itemIndex, itemName);
            },
            listSceneContents: () => {
                console.warn('[Debug] Scene contents:', scene.children.map(c => ({
                    type: c.type,
                    name: c.name,
                    isSubmenu: c instanceof Carousel3DSubmenu,
                    isCarousel: c === carousel,
                    visible: c.visible,
                    position: [c.position.x, c.position.y, c.position.z]
                })));
            },
            repairState: repairBrokenState
        }
    };
}