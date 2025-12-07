import * as THREE from 'three';
import gsap from 'gsap';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';

import {
    defaultCarouselStyle,
    lightTheme,
    darkTheme,
    cyberpunkTheme,
    minimalTheme,
    carouselConfig,
} from './CarouselStyleConfig.js';
import {Carousel3DPro} from './Carousel3DPro.js';
import {Carousel3DSubmenu} from './Carousel3DSubmenu.js';
import {spawnSubmenuAsync} from './SubmenuManager.js';
import {SelectionGuard, withTransition, globalGuard} from './modules/selectionGuards.js';
import {CentralContentPanel} from './CentralContentPanel.js';
import {ContentManager} from '../../utils/contentManager.js';
import {getItemAngles} from '../../utils/carouselAngleUtils.js';
import {enhanceCartIntegration} from '../../utils/cartIntegrationEnhancer.js';

// Background system imports (dynamic to avoid SSR issues)
let BackgroundManager = null;
let InteractivePolygonsWall = null;
let BackgroundDome = null;

// --- RUNTIME FACTORY (browser-only) ---
// Builds and mounts the 3D carousel and returns control hooks.
// Keep behavior the same; this only restores correct scoping.
export function mountCarousel3D(container, menuData) {
    if (typeof window === 'undefined') return null; // Ensure we're in a browser environment
    let animationFrameId = null; // Declare animationFrameId
    const timeoutIds = []; // Array to store timeout IDs
    let wmCheckIntervalId = null; // Variable to store the interval ID for waitForWindowWM
    const mobileSettings = {
        enableMobileEnhancements: carouselConfig?.mobile?.enableMobileEnhancements ?? false,
        longPressMs: carouselConfig?.mobile?.longPressMs ?? 350,
        tapSlopPx: carouselConfig?.mobile?.tapSlopPx ?? 8,
        raycastPadding: carouselConfig?.mobile?.raycastPadding ?? 0.06,
    };
    const submenuEmphasisState = { open: false, parentIndex: null, selectedChildIndex: null };
    const pointerState = {
        active: false,
        pointerId: null,
        downTime: 0,
        downPos: new THREE.Vector2(),
        moved: false,
        longPressTimer: null,
        candidateIndex: null,
        longPressTriggered: false,
        lastDownEvent: null,
        captureTarget: null,
        preventClick: false,
    };
    const pointerRaycaster = new THREE.Raycaster();
    const pointerVector = new THREE.Vector2();
    let pointerEventTarget = null;
    let submenuCloseProxyButton = null;
    let activeSubmenu = null; // Track the currently active submenu
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
    scene.background = new THREE.Color(0x0a0a1a); // Dark blue-black background
    
    // Add fog for distance dimming effect - subtle depth cue
    scene.fog = new THREE.Fog(0x0a0a1a, 12, 45); // Start fading at distance 12, fully faded at 45
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); // Set up camera
    camera.position.set(0, 2, 10); // Position the camera
    
    // --- Camera-attached spotlight for constant illumination on focus area ---
    const cameraSpotlight = new THREE.SpotLight(0xffffff, 2.5); // Increased intensity
    cameraSpotlight.angle = Math.PI / 3; // 60 degree cone - wider coverage
    cameraSpotlight.penumbra = 0.6; // Softer edge
    cameraSpotlight.decay = 1.2; // Less decay for better reach
    cameraSpotlight.distance = 40;
    cameraSpotlight.name = 'cameraSpotlight';
    camera.add(cameraSpotlight);
    cameraSpotlight.position.set(0, 0, 0); // At camera position
    cameraSpotlight.target.position.set(0, 0, -10); // Pointing forward
    camera.add(cameraSpotlight.target);
    
    // Add soft fill light attached to camera for overall visibility
    const cameraFillLight = new THREE.PointLight(0x88aacc, 1.2, 25); // Brighter, warmer, longer range
    cameraFillLight.name = 'cameraFillLight';
    camera.add(cameraFillLight);
    cameraFillLight.position.set(0, 2, 0); // Slightly above camera
    
    // Add camera to scene so its children (lights) are rendered
    scene.add(camera);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true }); // Create WebGL renderer
    renderer.setSize(window.innerWidth, window.innerHeight); // Set renderer size
    renderer.setPixelRatio(window.devicePixelRatio); // Set pixel ratio for high DPI displays
    container.appendChild(renderer.domElement); // Append renderer to the container

    // --- BackgroundManager Setup ---
    let backgroundManager = null;

    // Initialize background system asynchronously to avoid SSR issues
    (async () => {
        try {
            const bgModule = await import('./backgrounds/BackgroundManager.js');
            const hexagonModule = await import('./backgrounds/InteractiveHexagonWall.js');
            const hexagonSkyballModule = await import('./backgrounds/HexagonSkyball.js');
            const polygonsModule = await import('./backgrounds/InteractivePolygonsWall.js');
            const domeModule = await import('./BackgroundDome.js');

            BackgroundManager = bgModule.BackgroundManager;
            const InteractiveHexagonWall = hexagonModule.default;
            const HexagonSkyball = hexagonSkyballModule.default;
            InteractivePolygonsWall = polygonsModule.default;
            BackgroundDome = domeModule.BackgroundDome;

            backgroundManager = new BackgroundManager(scene, camera, renderer, {
                defaultBackground: 'skyball',
                persistSelection: true,
            });

            // Register available backgrounds
            backgroundManager.register('hexagons', InteractiveHexagonWall, { label: 'Hexagon Wall' });
            backgroundManager.register('skyball', HexagonSkyball, { label: 'Hexagon Skyball (360°)' });
            backgroundManager.register('polygons', InteractivePolygonsWall, { label: 'Polygons Wall' });
            backgroundManager.register('dome', BackgroundDome, { label: 'Iridescent Dome' });

            // Try to restore last selected background, default to skyball if none stored
            const stored = localStorage.getItem('wm_background_mode');
            if (stored && backgroundManager.backgrounds.has(stored)) {
                backgroundManager.setActive(stored);
            } else {
                // Set skyball as the default (360° immersive hexagons)
                backgroundManager.setActive('skyball');
            }

            console.log('[🍉 Carousel] BackgroundManager initialized with', backgroundManager.getBackgrounds().length, 'backgrounds');

            // Expose for debug panel
            if (typeof window !== 'undefined') {
                window.__wmBackgroundManager = backgroundManager;
            }
        } catch (e) {
            console.warn('[🍉 Carousel] BackgroundManager failed to initialize:', e);
        }
    })();

    // Ensure a hidden, focusable button exists for keyboard-based submenu closing
    if (!submenuCloseProxyButton) {
        submenuCloseProxyButton = document.createElement('button');
        submenuCloseProxyButton.type = 'button';
        submenuCloseProxyButton.textContent = 'Close submenu';
        submenuCloseProxyButton.setAttribute('aria-label', 'Close submenu');
        submenuCloseProxyButton.dataset.carouselSubmenuClose = 'true';
        Object.assign(submenuCloseProxyButton.style, {
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: '0',
            pointerEvents: 'none',
        });
        submenuCloseProxyButton.tabIndex = -1;
        submenuCloseProxyButton.addEventListener('click', () => {
            if (activeSubmenu) {
                closeSubmenu();
            }
        });
        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }
        container.appendChild(submenuCloseProxyButton);
    }
    
    // =======================
    // MOBILE DETECTION (early, before controls setup)
    // =======================
    const mobileConfigEarly = carouselConfig?.mobile || {};
    const isMobileDeviceEarly = () => {
        return window.innerWidth < (mobileConfigEarly.breakpoint || 768) || 
               ('ontouchstart' in window && window.innerWidth < 1024);
    };
    const isMobileNow = isMobileDeviceEarly();
    
    // Setup OrbitControls with correct zoom handling
    const controls = new OrbitControls(camera, renderer.domElement); // Initialize OrbitControls
    controls.enableDamping = true; // Enable damping (inertia) for smoother controls
    controls.dampingFactor = 0.05; // Damping factor for smoother controls
    controls.maxDistance = 20; // Maximum distance for zooming out
    controls.minDistance = 5; // Minimum distance for zooming in
    
    // =======================
    // MOBILE CAMERA CONSTRAINTS & LAYER SYSTEM
    // =======================
    
    // Mobile layer positions - camera shifts RIGHT through layers
    // Layer 0: Main menu (default)
    // Layer 1: Submenu (shifted right)
    // Layer 2: Display/Content (shifted further right)
    const mobileLayers = {
        mainMenu: { x: 0, y: 0, z: 12 },      // Center view of main menu
        submenu: { x: 2, y: 0, z: 10 },       // Shifted right slightly, closer for submenu
        display: { x: 4, y: 0, z: 8 },        // Further right for content display
    };
    let currentMobileLayer = 'mainMenu';
    
    // Function to smoothly transition camera to a layer
    function transitionToLayer(layerName, duration = 0.5) {
        // Check mobile status DYNAMICALLY each time
        const isMobileCheck = typeof window !== 'undefined' && window.innerWidth < 768;
        if (!isMobileCheck) {
            console.warn(`[🍉 Mobile Layer] Skipped - not mobile (width: ${window.innerWidth})`);
            return;
        }
        
        const layer = mobileLayers[layerName];
        if (!layer) {
            console.warn(`[🍉 Mobile Layer] Unknown layer: ${layerName}`);
            return;
        }
        
        currentMobileLayer = layerName;
        console.warn(`[🍉 Mobile Layer] Transitioning camera to: ${layerName}`, layer);
        
        gsap.to(camera.position, {
            x: layer.x,
            y: layer.y,
            z: layer.z,
            duration,
            ease: "power2.out",
            onUpdate: () => {
                // Always look at the carousel center, not the layer X offset
                camera.lookAt(0, 0, 0);
            },
            onComplete: () => {
                console.warn(`[🍉 Mobile Layer] Transition complete to: ${layerName}`);
            }
        });
    }
    
    // Function to navigate back one layer (display → submenu → mainMenu)
    function navigateBackLayer(duration = 0.4) {
        // Check mobile status DYNAMICALLY each time
        const isMobileCheck = typeof window !== 'undefined' && window.innerWidth < 768;
        if (!isMobileCheck) return;
        
        const layerOrder = ['mainMenu', 'submenu', 'display'];
        const currentIdx = layerOrder.indexOf(currentMobileLayer);
        
        if (currentIdx > 0) {
            const previousLayer = layerOrder[currentIdx - 1];
            transitionToLayer(previousLayer, duration);
            console.warn(`[🍉 Mobile] Navigated back to: ${previousLayer}`);
        }
    }
    
    // Expose layer transition for submenu/display systems
    if (typeof window !== 'undefined') {
        window.__wmTransitionToLayer = transitionToLayer;
        window.__wmNavigateBackLayer = navigateBackLayer;
        window.__wmGetCurrentLayer = () => currentMobileLayer;
        window.__wmMobileLayers = mobileLayers;
    }
    
    if (isMobileNow) {
        // MOBILE: Lock the camera - disable ALL OrbitControls interactions
        controls.enabled = false; // Completely disable OrbitControls on mobile
        controls.enableRotate = false;
        controls.enablePan = false;
        controls.enableZoom = false;
        
        // Lock camera to initial mobile-optimized position (main menu layer)
        camera.position.set(mobileLayers.mainMenu.x, mobileLayers.mainMenu.y, mobileLayers.mainMenu.z);
        camera.lookAt(0, 0, 0);
        
        console.warn('[🍉 Mobile] Camera locked, OrbitControls disabled, layer system active');
    } else {
        // DESKTOP: Full OrbitControls experience
        controls.enableZoom = true;
        controls.zoomSpeed = 1.0;
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
        };
    }
    
    // Disable pinch-to-zoom on touch (for both mobile and desktop touch screens)
    controls.touches.TWO = null;
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
        
        // CRITICAL: Block wheel during submenu spawning transition
        if (isSpawningSubmenu) {
            console.warn('[🍉 Wheel] Blocked during submenu spawn');
            return;
        }
        
        // Navigate menus based on wheel direction
        const delta = event.deltaY; // Get the wheel delta
        
        // SUBMENU OPEN: Wheel scrolls ONLY the submenu, not main carousel
        if (activeSubmenu) {
            // Only scroll submenu if it allows scrolling
            if (activeSubmenu.guard && activeSubmenu.guard.canScroll()) {
                activeSubmenu.scrollSubmenu(delta > 0 ? 1 : -1); // Invert for natural feel
            } else if (activeSubmenu.scrollSubmenu) {
                // Fallback if no guard but method exists
                activeSubmenu.scrollSubmenu(delta > 0 ? 1 : -1);
            } else {
                console.warn('[Watermelon] Submenu scroll blocked or method not available.');
            }
            // CRITICAL: Return here to prevent main carousel from scrolling
            return;
        }
        
        // NO SUBMENU: Normal main carousel scrolling
        if (isWheelHandlerActive && globalGuard.canScroll()) {
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
    // =======================
    // MOBILE TOUCH SYSTEM (Complete Rewrite)
    // =======================
    // State machine for touch gestures
    const touchState = {
        active: false,           // Is a touch currently happening
        startX: 0,               // Touch start X position
        startY: 0,               // Touch start Y position
        startTime: 0,            // Touch start timestamp
        currentX: 0,             // Current touch X
        currentY: 0,             // Current touch Y
        gestureType: null,       // 'tap', 'swipe-h', 'swipe-v', or null
        handled: false,          // Was this gesture already handled
        lastScrollTime: 0,       // Debounce for scroll actions
        touchId: null,           // Track specific touch identifier
    };
    
    // Spawning lock to prevent multiple submenu spawns
    let isSpawningSubmenu = false;
    let lastTapTime = 0;
    const DOUBLE_TAP_THRESHOLD = 300; // ms
    
    // Configuration - MOBILE uses adjusted settings (less rigid)
    const isMobileTouch = isMobileDeviceEarly();
    const MOBILE_CONFIG = isMobileTouch ? {
        // MOBILE: Balanced settings - stable but not stiff
        TAP_THRESHOLD: 18,       // Forgiving tap detection
        TAP_MAX_DURATION: 350,   // Reasonable tap time
        SWIPE_THRESHOLD: 45,     // Moderate threshold - responsive but not twitchy
        SCROLL_DEBOUNCE: 180,    // Faster response for smoother feel
        MOMENTUM_THRESHOLD: 2.0, // Allow SOME momentum (not wild, but not stiff)
        SNAP_TO_ITEM: true,      // Snap to nearest item for stability
    } : {
        // DESKTOP: Smooth and responsive
        TAP_THRESHOLD: 12,
        TAP_MAX_DURATION: 300,
        SWIPE_THRESHOLD: 30,     // Lower for responsive feel
        SCROLL_DEBOUNCE: 150,    // Faster debounce
        MOMENTUM_THRESHOLD: 0.5, // Allow more momentum
        SNAP_TO_ITEM: false,
    };
    
    console.warn('[🍉 Touch] Using', isMobileTouch ? 'MOBILE' : 'DESKTOP', 'touch config:', MOBILE_CONFIG);
    
    // Detect if we're on a touch device
    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Prevent native click events on touch devices to avoid double-firing
    let touchWasHandled = false;
    const clickBlocker = (event) => {
        if (touchWasHandled) {
            console.warn('[🍉 Mobile] Blocking native click after touch handling');
            event.preventDefault();
            event.stopPropagation();
            touchWasHandled = false;
            return false;
        }
    };
    
    // Touch start handler
    const touchStartHandler = (event) => {
        if (event.touches.length !== 1) return; // Only single touch
        
        const touch = event.touches[0];
        touchState.active = true;
        touchState.startX = touch.clientX;
        touchState.startY = touch.clientY;
        touchState.currentX = touch.clientX;
        touchState.currentY = touch.clientY;
        touchState.startTime = Date.now();
        touchState.gestureType = null;
        touchState.handled = false;
        touchState.touchId = touch.identifier;
        
        // Don't preventDefault here - we need to determine gesture type first
    };
    
    // Touch move handler  
    const touchMoveHandler = (event) => {
        if (!touchState.active || event.touches.length !== 1) return;
        
        const touch = event.touches[0];
        if (touch.identifier !== touchState.touchId) return;
        
        touchState.currentX = touch.clientX;
        touchState.currentY = touch.clientY;
        
        const deltaX = touchState.currentX - touchState.startX;
        const deltaY = touchState.currentY - touchState.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Determine gesture type if not yet determined
        if (!touchState.gestureType && distance > MOBILE_CONFIG.TAP_THRESHOLD) {
            const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
            touchState.gestureType = isHorizontal ? 'swipe-h' : 'swipe-v';
            // Once we've determined it's a swipe, prevent scrolling
            event.preventDefault();
        }
        
        // If already determined as swipe, continue preventing default
        if (touchState.gestureType) {
            event.preventDefault();
        }
        
        // Handle swipe gestures during move (for continuous scrolling)
        const now = Date.now();
        const canScroll = (now - touchState.lastScrollTime) > MOBILE_CONFIG.SCROLL_DEBOUNCE;
        
        if (touchState.gestureType && canScroll && !touchState.handled) {
            if (activeSubmenu) {
                // SUBMENU MODE: Only vertical swipes work (submenu is always vertical ring)
                if (touchState.gestureType === 'swipe-v' && Math.abs(deltaY) > MOBILE_CONFIG.SWIPE_THRESHOLD) {
                    const direction = deltaY > 0 ? -1 : 1;
                    activeSubmenu.scrollSubmenu(direction);
                    touchState.lastScrollTime = now;
                    // Reset start position for continuous scrolling
                    touchState.startY = touchState.currentY;
                    touchState.startX = touchState.currentX;
                    event.preventDefault();
                }
                // BLOCK other swipes when submenu is open - don't let main carousel move
            } else {
                // MAIN CAROUSEL MODE: Swipe direction depends on layout mode
                const isFerrisWheel = carousel.userData?.isFerrisWheel;
                const angleStep = (2 * Math.PI) / items.length;
                
                if (isFerrisWheel) {
                    // FERRIS WHEEL MODE: Vertical swipes control main menu
                    if (touchState.gestureType === 'swipe-v' && Math.abs(deltaY) > MOBILE_CONFIG.SWIPE_THRESHOLD) {
                        // Swipe up = next item, swipe down = previous
                        const direction = deltaY > 0 ? -1 : 1;
                        spinFerrisWheel(direction * angleStep);
                        touchState.lastScrollTime = now;
                        touchState.startY = touchState.currentY;
                        touchState.startX = touchState.currentX;
                        event.preventDefault();
                    }
                } else {
                    // HORIZONTAL MODE: Horizontal swipes control main menu
                    if (touchState.gestureType === 'swipe-h' && Math.abs(deltaX) > MOBILE_CONFIG.SWIPE_THRESHOLD) {
                        carousel.spin(deltaX > 0 ? angleStep : -angleStep);
                        touchState.lastScrollTime = now;
                        touchState.startX = touchState.currentX;
                        touchState.startY = touchState.currentY;
                        event.preventDefault();
                    }
                }
            }
        }
    };
    
    // Helper function to spin Ferris wheel (rotates around X axis)
    function spinFerrisWheel(deltaAngle) {
        if (!carousel.itemGroup) return;
        carousel.targetRotation += deltaAngle;
        carousel.lastInteractionType = 'scroll';
        console.warn('[🍉 Ferris] Spinning by', deltaAngle.toFixed(2), 'rad');
    }
    
    // Touch end handler
    const touchEndHandler = (event) => {
        if (!touchState.active) return;
        
        const touch = event.changedTouches[0];
        if (touch && touch.identifier !== touchState.touchId) return;
        
        const deltaX = (touch?.clientX || touchState.currentX) - touchState.startX;
        const deltaY = (touch?.clientY || touchState.currentY) - touchState.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const duration = Date.now() - touchState.startTime;
        
        // Determine if this was a tap
        const isTap = distance <= MOBILE_CONFIG.TAP_THRESHOLD && 
                      duration <= MOBILE_CONFIG.TAP_MAX_DURATION &&
                      !touchState.gestureType;
        
        if (isTap && !touchState.handled) {
            console.warn('[🍉 Mobile] Tap detected at', touch?.clientX, touch?.clientY);
            
            // Check for double-tap (could be used for zoom or special actions)
            const now = Date.now();
            const isDoubleTap = (now - lastTapTime) < DOUBLE_TAP_THRESHOLD;
            lastTapTime = now;
            
            if (isDoubleTap) {
                console.warn('[🍉 Mobile] Double-tap detected - ignoring');
            } else {
                // Single tap - handle it
                touchState.handled = true;
                touchWasHandled = true; // Block the upcoming native click event
                
                // Use setTimeout to let the event loop settle, preventing race conditions
                setTimeout(() => {
                    if (!isSpawningSubmenu) {
                        handleCarouselClick({ clientX: touch?.clientX || touchState.startX, clientY: touch?.clientY || touchState.startY });
                    }
                }, 10);
            }
            
            event.preventDefault();
        }
        
        // Apply momentum for fast swipes (DISABLED ON MOBILE for stability)
        if (touchState.gestureType && !touchState.handled) {
            const velocity = distance / Math.max(duration, 1);
            
            // Only apply momentum on desktop (MOBILE_CONFIG.MOMENTUM_THRESHOLD is 999 on mobile)
            if (velocity > MOBILE_CONFIG.MOMENTUM_THRESHOLD) {
                const angleStep = (2 * Math.PI) / items.length;
                const isFerrisWheel = carousel.userData?.isFerrisWheel;
                
                if (activeSubmenu && touchState.gestureType === 'swipe-v') {
                    // Submenu scroll
                    const direction = deltaY > 0 ? -1 : 1;
                    activeSubmenu.scrollSubmenu(direction);
                } else if (!activeSubmenu) {
                    if (isFerrisWheel && touchState.gestureType === 'swipe-v') {
                        // Ferris wheel momentum - vertical swipe
                        const direction = deltaY > 0 ? -1 : 1;
                        spinFerrisWheel(direction * angleStep);
                    } else if (!isFerrisWheel && touchState.gestureType === 'swipe-h') {
                        // Horizontal carousel momentum
                        const direction = deltaX > 0 ? 1 : -1;
                        carousel.spin(direction * angleStep);
                    }
                }
            }
        }
        
        // MOBILE: Snap to nearest item after gesture ends
        if (MOBILE_CONFIG.SNAP_TO_ITEM && !isTap) {
            const isFerrisWheel = carousel.userData?.isFerrisWheel;
            const rotationProp = isFerrisWheel ? 'x' : 'y';
            const angleStep = (2 * Math.PI) / items.length;
            const currentRotation = carousel.itemGroup?.rotation[rotationProp] || 0;
            
            // Calculate nearest item index
            const nearestIndex = Math.round(-currentRotation / angleStep) % items.length;
            const normalizedIndex = nearestIndex < 0 ? nearestIndex + items.length : nearestIndex;
            
            // Snap to that item
            carousel.targetRotation = -normalizedIndex * angleStep;
            carousel.currentIndex = normalizedIndex;
            
            console.warn('[🍉 Mobile] Snapping to item', normalizedIndex);
        }
        
        // Reset state
        touchState.active = false;
        touchState.gestureType = null;
        touchState.touchId = null;
        
        // Clear the touch-handled flag after a short delay
        setTimeout(() => { touchWasHandled = false; }, 100);
    };
    
    // Touch cancel handler
    const touchCancelHandler = () => {
        touchState.active = false;
        touchState.gestureType = null;
        touchState.handled = false;
        touchState.touchId = null;
        touchWasHandled = false;
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
        // Reset touch state
        touchState.active = false;
        touchState.gestureType = null;
        touchState.handled = false;
        touchWasHandled = false;
        
        // Remove existing listeners first
        window.removeEventListener('touchstart', touchStartHandler, { passive: false });
        window.removeEventListener('touchmove', touchMoveHandler, { passive: false });
        window.removeEventListener('touchend', touchEndHandler, { passive: false });
        window.removeEventListener('touchcancel', touchCancelHandler, { passive: false });
        
        // Add touch listeners
        window.addEventListener('touchstart', touchStartHandler, { passive: false });
        window.addEventListener('touchmove', touchMoveHandler, { passive: false });
        window.addEventListener('touchend', touchEndHandler, { passive: false });
        window.addEventListener('touchcancel', touchCancelHandler, { passive: false });
        
        // Add click blocker for touch devices
        if (isTouchDevice()) {
            window.removeEventListener('click', clickBlocker, true);
            window.addEventListener('click', clickBlocker, true);
        }
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
    window.contentManager = contentManager;    // Initialize enhanced cart integration
    enhanceCartIntegration();
    
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
    let isTransitioning = false; // New flag for async handling, initially false
    const carousel = new Carousel3DPro(items, currentTheme); // Create the carousel instance
    carousel.userData = { camera }; // Store camera reference in userData for later access
    carousel.isAnimating = false; // Track animation state
    
    // =======================
    // MOBILE: Apply stricter carousel settings
    // =======================
    if (isMobileDeviceEarly()) {
        // Faster rotation = snappier feel on mobile
        carousel.rotationSpeed = 0.15; // Much faster than default 0.05
        console.warn('[🍉 Mobile] Applied faster rotation speed:', carousel.rotationSpeed);
    }
    
    // =======================
    // MOBILE FERRIS WHEEL MODE
    // =======================
    const mobileConfig = carouselConfig?.mobile || {};
    const isMobileDevice = () => {
        return window.innerWidth < (mobileConfig.breakpoint || 768) || 
               ('ontouchstart' in window && window.innerWidth < 1024);
    };
    
    let isFerrisWheelMode = isMobileDevice() && (mobileConfig.enableFerrisWheelMode !== false);
    
    // =======================
    // MOBILE CONSTRAINT SETTINGS
    // =======================
    const mobileConstraints = {
        lockRotationAxes: true,        // Only allow rotation on the wheel axis
        disableTilt: true,             // No tilting the wheel
        snapToItems: true,             // Always snap to nearest item
        reducedInertia: true,          // Less "floaty" feel
        fixedCameraPosition: true,     // Camera doesn't move
    };
    
    // Function to convert carousel to Ferris wheel (vertical) layout
    function applyFerrisWheelLayout() {
        if (!carousel.itemGroup || !carousel.itemMeshes) return;
        
        const ferrisRadius = mobileConfig.ferrisWheelRadius || 4;
        // MOBILE: No tilt for stability and clarity
        const tilt = 0;
        const itemCount = carousel.itemMeshes.length;
        const angleStep = (2 * Math.PI) / itemCount;
        
        // Position items in a vertical wheel (Y-Z plane)
        // Camera is at Z+ looking at origin, so Z+ is "front" (closest to camera)
        // Items rotate around X-axis (vertical wheel)
        carousel.itemMeshes.forEach((mesh, index) => {
            // Item 0 starts at FRONT of wheel (z=+radius, y=0)
            // As wheel rotates around X, items move up/back/down/front
            // angle=0 → cos(0)=1, sin(0)=0 → position (0, 0, +radius) = front
            const angle = angleStep * index;
            
            // Position in Y-Z plane (vertical wheel)
            // NOTE: For X-axis rotation, we swap sin/cos for proper rotation direction
            // Z = radius * cos(angle) = front at angle=0
            // Y = radius * sin(angle) = level at angle=0, up at angle=π/2
            mesh.position.x = 0; // Centered horizontally
            mesh.position.y = ferrisRadius * Math.sin(angle); // Vertical position  
            mesh.position.z = ferrisRadius * Math.cos(angle); // Depth position (front/back)
            
            // ALL items face the camera (which is at +Z)
            // Text geometry faces +Z by default, so rotation.y = 0 faces camera
            // Items keep level orientation regardless of wheel position
            mesh.rotation.x = 0;
            mesh.rotation.y = 0;
            mesh.rotation.z = 0;
            
            // Update hit area to match
            if (mesh.userData.hitArea) {
                mesh.userData.hitArea.position.copy(mesh.position);
                mesh.userData.hitArea.rotation.set(0, 0, 0);
            }
        });
        
        // No tilt - keep wheel perfectly vertical for clarity
        carousel.itemGroup.rotation.z = tilt;
        carousel.itemGroup.rotation.x = 0; // Start at no rotation
        carousel.itemGroup.rotation.y = 0;
        
        // Store mode flags
        carousel.userData.rotationAxis = 'x'; // Ferris wheel rotates around X
        carousel.userData.isFerrisWheel = true;
        
        // Initialize target rotation to 0 (item 0 at front/bottom)
        carousel.targetRotation = 0;
        
        console.warn('[🍉 Mobile] Ferris wheel layout applied', { 
            itemCount, 
            radius: ferrisRadius,
            firstItemPosition: 'bottom (closest to camera)',
            facingDirection: '+Z (toward camera)'
        });
    }
    
    // Function to revert to horizontal carousel
    function applyHorizontalLayout() {
        if (!carousel.itemGroup || !carousel.itemMeshes) return;
        
        const cylinderRadius = carousel.cylinderRadius || 5;
        const itemCount = carousel.itemMeshes.length;
        const angleStep = (2 * Math.PI) / itemCount;
        
        carousel.itemMeshes.forEach((mesh, index) => {
            const angle = angleStep * index;
            mesh.position.x = cylinderRadius * Math.sin(angle);
            mesh.position.y = 0;
            mesh.position.z = cylinderRadius * Math.cos(angle);
            mesh.rotation.y = Math.atan2(mesh.position.x, mesh.position.z);
            mesh.rotation.x = 0;
            
            if (mesh.userData.hitArea) {
                mesh.userData.hitArea.position.copy(mesh.position);
                mesh.userData.hitArea.rotation.copy(mesh.rotation);
            }
        });
        
        carousel.itemGroup.rotation.z = 0;
        carousel.itemGroup.rotation.x = 0;
        carousel.userData.rotationAxis = 'y';
        carousel.userData.isFerrisWheel = false;
        
        console.warn('[🍉 Desktop] Horizontal layout applied');
    }
    
    // Apply layout after carousel is ready
    const applyMobileLayoutWhenReady = () => {
        if (carousel.itemMeshes && carousel.itemMeshes.length > 0) {
            if (isFerrisWheelMode) {
                applyFerrisWheelLayout();
            }
        } else {
            // Wait for items to be created
            setTimeout(applyMobileLayoutWhenReady, 100);
        }
    };
    
    // Start checking for items to be ready
    setTimeout(applyMobileLayoutWhenReady, 200);
    
    // Handle window resize - switch layout if crossing breakpoint
    const handleLayoutResize = () => {
        const wasFerrisWheel = isFerrisWheelMode;
        isFerrisWheelMode = isMobileDevice() && (mobileConfig.enableFerrisWheelMode !== false);
        
        if (wasFerrisWheel !== isFerrisWheelMode) {
            if (isFerrisWheelMode) {
                applyFerrisWheelLayout();
            } else {
                applyHorizontalLayout();
            }
            // Reset rotation to current index position
            const angleStep = (2 * Math.PI) / items.length;
            if (isFerrisWheelMode) {
                carousel.itemGroup.rotation.x = -carousel.currentIndex * angleStep;
            } else {
                carousel.itemGroup.rotation.y = -carousel.currentIndex * angleStep;
            }
        }
    };
    
    window.addEventListener('resize', handleLayoutResize);
    
    // Initialize Central Content Panel system
    const centralPanel = new CentralContentPanel({
        radius: 3,
        width: 6,
        height: 4
    });
    
    // Store references to Three.js objects in the panel
    centralPanel.scene = scene;
    centralPanel.camera = camera;
    centralPanel.renderer = renderer;
    
    // Add central panel to scene
    scene.add(centralPanel);
    
    // Expose central panel globally for content loading
    window.centralPanel = centralPanel;
    
    console.warn("[Watermelon] Added central content panel to scene");
    console.warn("[Watermelon] Central panel available:", !!window.centralPanel);

    const mobileEnhancementsEnabled = mobileSettings.enableMobileEnhancements;

    function normalizePointerCoordinates(clientX, clientY) {
        if (!renderer?.domElement) return null;
        const rect = renderer.domElement.getBoundingClientRect();
        pointerVector.set(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1
        );
        return pointerVector;
    }

    function resolveMainCarouselHit(clientX, clientY) {
        if (!mobileEnhancementsEnabled || !carousel?.itemGroup) return null;
        const normalized = normalizePointerCoordinates(clientX, clientY);
        if (!normalized) return null;
        pointerRaycaster.setFromCamera(normalized, camera);
        const hits = pointerRaycaster.intersectObjects(carousel.itemGroup.children, true);
        for (const hit of hits) {
            let node = hit.object;
            while (node && node !== carousel.itemGroup) {
                if (typeof node.userData?.index === 'number' && node.parent === carousel.itemGroup) {
                    return { index: node.userData.index, object: node };
                }
                node = node.parent;
            }
        }
        return null;
    }

    function updateSubmenuInteractionState(nextState = {}) {
        Object.assign(submenuEmphasisState, nextState);
        if (mobileEnhancementsEnabled && typeof carousel?.setSubmenuState === 'function') {
            carousel.setSubmenuState({ ...submenuEmphasisState });
        }
    }

    function clearSubmenuInteractionState() {
        updateSubmenuInteractionState({ open: false, parentIndex: null, selectedChildIndex: null });
    }

    function clearLongPressTimer() {
        if (pointerState.longPressTimer) {
            clearTimeout(pointerState.longPressTimer);
            pointerState.longPressTimer = null;
        }
    }

    function resetPointerState() {
        pointerState.active = false;
        pointerState.pointerId = null;
        pointerState.downTime = 0;
        pointerState.downPos.set(0, 0);
        pointerState.moved = false;
        pointerState.longPressTriggered = false;
        pointerState.candidateIndex = null;
        pointerState.lastDownEvent = null;
        pointerState.captureTarget = null;
    }

    function triggerMobileSubmenuOpen() {
        if (!mobileEnhancementsEnabled || !pointerState.lastDownEvent || pointerState.candidateIndex === null) return;
        pointerState.preventClick = true;
        const { clientX, clientY } = pointerState.lastDownEvent;
        handleCarouselClick({ clientX, clientY });
    }

    function handlePointerDown(event) {
        if (!mobileEnhancementsEnabled || event.pointerType !== 'touch') return;

        pointerState.active = true;
        pointerState.pointerId = event.pointerId;
        pointerState.downTime = performance.now();
        pointerState.downPos.set(event.clientX, event.clientY);
        pointerState.moved = false;
        pointerState.longPressTriggered = false;
        pointerState.lastDownEvent = { clientX: event.clientX, clientY: event.clientY };
        pointerState.preventClick = false;

        const hit = resolveMainCarouselHit(event.clientX, event.clientY);
        if (hit && submenus?.[items?.[hit.index]]) {
            pointerState.candidateIndex = hit.index;
            updateSubmenuInteractionState({
                open: !!activeSubmenu,
                parentIndex: hit.index,
                selectedChildIndex: activeSubmenu ? activeSubmenu.currentIndex ?? null : null,
            });
        } else {
            pointerState.candidateIndex = null;
            clearSubmenuInteractionState();
        }

        clearLongPressTimer();
        pointerState.longPressTimer = window.setTimeout(() => {
            pointerState.longPressTriggered = true;
            triggerMobileSubmenuOpen();
        }, mobileSettings.longPressMs);

        if (event.target?.setPointerCapture) {
            event.target.setPointerCapture(event.pointerId);
            pointerState.captureTarget = event.target;
        }

        event.preventDefault();
    }

    function handlePointerMove(event) {
        if (!mobileEnhancementsEnabled || !pointerState.active || event.pointerId !== pointerState.pointerId) return;
        const dx = event.clientX - pointerState.downPos.x;
        const dy = event.clientY - pointerState.downPos.y;
        const distance = Math.hypot(dx, dy);
        if (!pointerState.moved && distance > mobileSettings.tapSlopPx) {
            pointerState.moved = true;
            if (!pointerState.longPressTriggered) {
                clearLongPressTimer();
                clearSubmenuInteractionState();
            }
        }
    }

    function handlePointerUp(event) {
        if (!mobileEnhancementsEnabled || !pointerState.active || event.pointerId !== pointerState.pointerId) return;

        if (pointerState.captureTarget?.releasePointerCapture) {
            pointerState.captureTarget.releasePointerCapture(event.pointerId);
        }

        if (pointerState.longPressTriggered) {
            event.preventDefault();
        } else if (!pointerState.moved && pointerState.candidateIndex !== null) {
            pointerState.preventClick = true;
            handleCarouselClick({ clientX: event.clientX, clientY: event.clientY });
            event.preventDefault();
        }

        clearLongPressTimer();
        clearSubmenuInteractionState();
        resetPointerState();
        window.setTimeout(() => {
            pointerState.preventClick = false;
        }, 200);
    }

    function handlePointerCancel(event) {
        if (!mobileEnhancementsEnabled) return;
        if (pointerState.captureTarget?.releasePointerCapture && typeof event?.pointerId === 'number') {
            pointerState.captureTarget.releasePointerCapture(event.pointerId);
        }
        clearLongPressTimer();
        clearSubmenuInteractionState();
        resetPointerState();
        pointerState.preventClick = false;
    }

    function suppressClick(event) {
        if (!mobileEnhancementsEnabled || !pointerState.preventClick) return;
        event.stopImmediatePropagation();
        event.preventDefault();
        pointerState.preventClick = false;
    }

    function attachMobilePointerHandlers() {
        if (!mobileEnhancementsEnabled || pointerEventTarget || !renderer?.domElement) return;
        pointerEventTarget = renderer.domElement;
        pointerEventTarget.addEventListener('pointerdown', handlePointerDown, { passive: false });
        pointerEventTarget.addEventListener('pointermove', handlePointerMove, { passive: false });
        pointerEventTarget.addEventListener('pointerup', handlePointerUp, { passive: false });
        pointerEventTarget.addEventListener('pointercancel', handlePointerCancel, { passive: false });
        pointerEventTarget.addEventListener('pointerleave', handlePointerCancel, { passive: false });
        pointerEventTarget.addEventListener('click', suppressClick, true);
    }

    function detachMobilePointerHandlers() {
        if (!pointerEventTarget) return;
        pointerEventTarget.removeEventListener('pointerdown', handlePointerDown, { passive: false });
        pointerEventTarget.removeEventListener('pointermove', handlePointerMove, { passive: false });
        pointerEventTarget.removeEventListener('pointerup', handlePointerUp, { passive: false });
        pointerEventTarget.removeEventListener('pointercancel', handlePointerCancel, { passive: false });
        pointerEventTarget.removeEventListener('pointerleave', handlePointerCancel, { passive: false });
        pointerEventTarget.removeEventListener('click', suppressClick, true);
        pointerEventTarget = null;
        resetPointerState();
        pointerState.preventClick = false;
    }

    if (mobileEnhancementsEnabled) {
        attachMobilePointerHandlers();
    }
    
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
    function setActiveSubmenu(submenu, { parentIndex = null } = {}) {
        activeSubmenu = submenu;

        // Always notify the main carousel about submenu state change for dimming effects
        if (typeof carousel?.setSubmenuState === 'function') {
            if (submenu) {
                carousel.setSubmenuState({
                    open: true,
                    parentIndex: parentIndex ?? carousel.currentIndex ?? null,
                    selectedChildIndex: typeof submenu.currentIndex === 'number' ? submenu.currentIndex : null,
                });
            } else {
                carousel.setSubmenuState({
                    open: false,
                    parentIndex: null,
                    selectedChildIndex: null,
                });
            }
            // Force visual update after state change
            if (typeof carousel.updateHoverVisuals === 'function') {
                carousel.updateHoverVisuals();
            }
        }

        if (mobileEnhancementsEnabled) {
            if (submenu) {
                carousel.lockRing?.();
                updateSubmenuInteractionState({
                    open: true,
                    parentIndex: parentIndex ?? carousel.currentIndex ?? null,
                    selectedChildIndex: typeof submenu.currentIndex === 'number' ? submenu.currentIndex : null,
                });
            } else {
                carousel.unlockRing?.();
            }
        } else if (!submenu) {
            carousel.unlockRing?.();
        }

        if (!submenu) {
            clearSubmenuInteractionState();
        }
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
        
        // Check spawning lock FIRST - prevents concurrent spawns from touch+click
        if (isSpawningSubmenu) {
            console.warn('[🍉 Click] Spawning already in progress, ignoring duplicate click.');
            return;
        }
        
        // Check if a transition is allowed using the guard
        if (!globalGuard.canSelect()) {
            console.warn('[Watermelon] Submenu transition in progress or animation locked. Skipping click.');
            return;
        }
        
        // SET the spawning lock immediately
        isSpawningSubmenu = true;
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
                
                // MOBILE LAYER: Shift camera to submenu layer when submenu opens
                const isMobileForLayer = typeof window !== 'undefined' && window.innerWidth < 768;
                if (isMobileForLayer && typeof transitionToLayer === 'function') {
                    transitionToLayer('submenu', 0.5);
                    console.warn('[🍉 Mobile Layer] Transitioned to submenu layer');
                }
                
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
                // ALWAYS clear spawning lock on error
                isSpawningSubmenu = false;
            }
        });
        
        // Clear spawning lock and add a small buffer after transition completes
        isSpawningSubmenu = false;
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
            setActiveSubmenu(null);
            
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
                scene.userData.activeSubmenu = null;
                if (carousel && carousel.parent && carousel.parent.userData) {
                    carousel.parent.userData.activeSubmenu = null;
                }
                
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
        const closingSubmenu = activeSubmenu;
        setActiveSubmenu(null);
        
        // Use the guard to manage transition state
        globalGuard.isTransitioning = true;
        isTransitioning = true; // For backward compatibility
        
        // MOBILE: Transition camera back to main menu layer
        // transitionToLayer has its own mobile check, so just call it
        if (typeof transitionToLayer === 'function') {
            transitionToLayer('mainMenu', 0.4);
        }
        
        console.warn('[Watermelon] Manual closeSubmenu called.');
        
        if (closingSubmenu.floatingPreview) { // Check if the submenu has a floating preview
            closingSubmenu.stopFloatingPreviewSpin(); // Stop any spinning animation on the floating preview
            gsap.to(closingSubmenu.floatingPreview.scale, { // Animate the scale of the floating preview to zero
                x: 0,
                y: 0,
                z: 0,
                duration: 0.2, // Duration of the scale animation
                ease: 'back.in', // Easing function for the animation
            });
        }
        if (closingSubmenu.closeButton) { // Check if the submenu has a close button
            closingSubmenu.closeButton.material.color.set(0xff0000); // Change the close button color to red
        }
        if (closingSubmenu.parentItem?.material) { // Check if the parent item has a material
            gsap.to(closingSubmenu.parentItem.material, { // Animate the opacity of the parent item material to 1.0
                opacity: 1.0, // Set opacity to fully opaque
                duration: 0.5, // Duration of the opacity animation
            });
        }
        const remove = () => { // Remove the submenu from the scene
            if (closingSubmenu) {
                scene.remove(closingSubmenu); // Remove the submenu from the scene
            }
            scene.userData.activeSubmenu = null; // Clear the active submenu reference in scene userData
            if (carousel && carousel.parent && carousel.parent.userData) { // Check if carousel has a parent with userData
                carousel.parent.userData.activeSubmenu = null; // Clear the active submenu reference in carousel parent userData
            }
            // IMPORTANT: Clear this BEFORE enabling handlers
            const closedSubmenu = closingSubmenu; // Keep ref for dispose check
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
            closingSubmenu?.hide?.(); // Call the hide method if it exists
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
        // Check spawning lock first - prevents double-clicks
        if (isSpawningSubmenu) {
            console.warn('[🍉 Click] Spawning in progress, ignoring click.');
            return;
        }
        
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
        
        // Get accurate mouse coordinates relative to canvas
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
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
                // Walk hierarchy to find submenu item data
                const obj = hits[0].object;
                let submenuItemData = null;
                
                // Direct hit on object with isSubmenuItem
                if (obj.userData?.isSubmenuItem) {
                    submenuItemData = obj.userData;
                } else {
                    // Walk up the hierarchy to find container with isSubmenuItem
                    let current = obj.parent;
                    while (current && current !== activeSubmenu) {
                        if (current.userData?.isSubmenuItem) {
                            submenuItemData = current.userData;
                            break;
                        }
                        current = current.parent;
                    }
                }
                
                if (submenuItemData && typeof submenuItemData.index === 'number') {
                    const index = submenuItemData.index; // Get the index of the clicked submenu item
                    console.log(`🖱️ [main.js] Clicked submenu index=${index}, name=${submenuItemData.name || "Unknown"}`);
                    console.log(`🖱️ [main.js] About to call activeSubmenu.selectItem(${index})`);
                    const item = activeSubmenu.items?.[index]; // Get the item corresponding to the clicked index
                    if (!item) {
                        console.warn('[Watermelon] No item found for submenu index:', index); // Debug log
                        return; // Exit if no item is found
                    }                    // Force index sync
                    activeSubmenu.currentIndex = index; // Sync the current index of the submenu to the clicked index
                    if (mobileEnhancementsEnabled) {
                        const parentIndex = activeSubmenu.parentItem?.userData?.index ?? carousel.currentIndex ?? null;
                        updateSubmenuInteractionState({
                            open: true,
                            parentIndex,
                            selectedChildIndex: index,
                        });
                    }
                    
                    // Load contextual content for the selected submenu item
                    const parentItem = activeSubmenu.parentItem?.userData?.item || 'Unknown';
                    console.warn(`[🍉 Content] Submenu item selected: ${parentItem} > ${item}`);
                    
                    // Show the submenu item preview first
                    activeSubmenu.selectItem(index, true, true); // Show preview
                    
                    // Load content asynchronously
                    loadContentForItem(parentItem, item).then(contentData => {
                        if (contentData) {
                            console.warn(`[🍉 Content] Successfully loaded content for ${parentItem} > ${item}`);
                            
                            // MOBILE LAYER: Shift camera to display layer when content is loaded
                            const isMobileForLayer = typeof window !== 'undefined' && window.innerWidth < 768;
                            if (isMobileForLayer && typeof transitionToLayer === 'function') {
                                transitionToLayer('display', 0.5);
                                console.warn('[🍉 Mobile Layer] Transitioned to display layer');
                            }
                            
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
                        }                    }).catch(error => {
                        console.error(`[🍉 Content] Failed to load content for ${parentItem} > ${item}:`, error);
                    });
                } else if (obj.userData?.isCloseButton || obj.parent?.userData?.isCloseButton) { // Check if the clicked object or its parent is the close button
                    // Handle close button click
                    closeSubmenu(); // Call the closeSubmenu function to close the active submenu
                }
                return; // Exit after handling submenu click or close button
            }
        }
        
        // Handle main carousel clicks
        const itemsHit = raycaster.intersectObjects(carousel.itemGroup.children, true);
        console.warn(`[🍉 Click] Found ${itemsHit.length} intersections with main carousel items`);
        
        // ============================================
        // SUBMENU OPEN BLOCKING LOGIC
        // When a submenu is open, BLOCK clicks on OTHER main menu items
        // User must close the submenu first (click same item, ESC, or click empty space)
        // ============================================
        if (activeSubmenu) {
            console.warn(`[🍉 Click] Submenu is open - checking if click should be blocked`);
            console.warn(`[🍉 Click] itemsHit.length = ${itemsHit.length}`);
            
            // If no main carousel items were hit, close the submenu (clicked empty space)
            if (itemsHit.length === 0) {
                console.warn(`[🍉 Click] Clicked empty space while submenu open - closing submenu`);
                closeSubmenu();
                return;
            }
            
            // Check each hit to see if it's a main carousel item
            for (const hit of itemsHit) {
                let current = hit.object;
                while (current && current.parent !== carousel.itemGroup) {
                    current = current.parent;
                }
                if (current && current.userData.index !== undefined) {
                    const clickedIndex = current.userData.index;
                    console.warn(`[🍉 Click] Found main item at index ${clickedIndex}, current is ${carousel.currentIndex}`);
                    
                    // Only allow clicking the SAME item (to toggle/close submenu)
                    if (clickedIndex === carousel.currentIndex) {
                        console.warn(`[🍉 Click] Submenu open - clicking same item to close`);
                        closeSubmenu();
                        return; // Exit after closing
                    } else {
                        // Block clicks on OTHER items - require explicit close first
                        console.warn(`[🍉 Click] BLOCKED: Submenu is open. Close submenu first before selecting another item.`);
                        console.warn(`[🍉 Click] Clicked index ${clickedIndex}, but submenu is open for index ${carousel.currentIndex}`);
                        return; // Block this click
                    }
                }
            }
            
            // Safety exit - if we got here with submenu open, block the click
            console.warn(`[🍉 Click] Safety block - submenu is open, blocking all main clicks`);
            return;
        }
        
        // ============================================
        // NORMAL MAIN CAROUSEL CLICK HANDLING (no submenu open)
        // ============================================
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

                if (mobileEnhancementsEnabled) {
                    updateSubmenuInteractionState({
                        open: false, // No submenu open yet
                        parentIndex: i,
                        selectedChildIndex: null,
                    });
                }
                
                // Load content for the main carousel item
                loadContentForItem(itemName).then(contentData => {
                    if (contentData) {
                        console.warn(`[🍉 Content] Loaded content for main item: ${itemName}`);
                    }
                }).catch(error => {
                    console.error(`[🍉 Content] Failed to load content for main item ${itemName}:`, error);
                });
                
                // IMPORTANT: First rotate the carousel to the clicked item
                // Then open the submenu AFTER rotation completes
                // This ensures the item swings to front before submenu spawns
                const hasSubmenu = !!submenus[itemName];
                
                if (hasSubmenu) {
                    // For items with submenus: rotate first, then open submenu on complete
                    console.warn(`[🍉 Click] Item ${itemName} has submenu - rotating first, then opening`);
                    
                    // Calculate rotation synchronously - use correct axis based on layout
                    const isFerrisWheel = carousel.userData?.isFerrisWheel;
                    const rotationProp = isFerrisWheel ? 'x' : 'y';
                    const angleStep = (2 * Math.PI) / carousel.itemMeshes.length;
                    const currentRotation = carousel.itemGroup.rotation[rotationProp];
                    // Ferris wheel uses positive rotation, horizontal uses negative
                    const targetAngle = isFerrisWheel ? (i * angleStep) : (-i * angleStep);
                    
                    // Shortest angular distance
                    const twoPi = Math.PI * 2;
                    let current = ((currentRotation % twoPi) + twoPi) % twoPi;
                    let target = ((targetAngle % twoPi) + twoPi) % twoPi;
                    let delta = target - current;
                    if (delta > Math.PI) delta -= twoPi;
                    if (delta < -Math.PI) delta += twoPi;
                    
                    const newRotation = currentRotation + delta;
                    carousel.currentIndex = i;
                    carousel.targetRotation = newRotation;
                    
                    // Apply visual highlight immediately
                    carousel.itemMeshes.forEach((mesh, idx) => {
                        const isSelected = (idx === i);
                        mesh.userData.isSelected = isSelected;
                        if (isSelected) {
                            gsap.to(mesh.scale, {
                                x: mesh.userData.originalScale.x * 1.2,
                                y: mesh.userData.originalScale.y * 1.2,
                                z: mesh.userData.originalScale.z * 1.2,
                                duration: 0.3
                            });
                        } else {
                            gsap.to(mesh.scale, {
                                x: mesh.userData.originalScale.x,
                                y: mesh.userData.originalScale.y,
                                z: mesh.userData.originalScale.z,
                                duration: 0.3
                            });
                        }
                    });
                    
                    // Animate rotation using correct axis, THEN open submenu on complete
                    const rotationTarget = {};
                    rotationTarget[rotationProp] = newRotation;
                    
                    gsap.to(carousel.itemGroup.rotation, {
                        ...rotationTarget,
                        duration: 0.6,
                        ease: "power2.out",
                        onComplete: () => {
                            console.warn(`[🍉 Click] Rotation complete, now opening submenu for ${itemName}`);
                            carousel.applyHighlightVisuals?.(i);
                            // Now open the submenu
                            carousel.onItemClick?.(i, itemName);
                        }
                    });
                } else {
                    // For items without submenus: just select normally
                    console.warn(`[🍉 Click] Item ${itemName} has no submenu - standard selection`);
                    carousel.selectItem(i, true);
                }
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
    const keydownHandler = (e) => {
        // ESC always works to close submenu
        if (e.key === 'Escape' && activeSubmenu) {
            console.warn('[🍉 Key] ESC pressed - closing submenu');
            closeSubmenu();
            submenuCloseProxyButton?.focus?.();
            return;
        }
        
        // Block arrow keys on main carousel when submenu is open
        if (activeSubmenu) {
            // Optional: Could allow Up/Down to navigate submenu here
            if (e.key === 'ArrowUp' && activeSubmenu.goToPrev) {
                e.preventDefault();
                activeSubmenu.goToPrev();
            } else if (e.key === 'ArrowDown' && activeSubmenu.goToNext) {
                e.preventDefault();
                activeSubmenu.goToNext();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                // Block left/right arrows on main carousel when submenu is open
                console.warn('[🍉 Key] Arrow key blocked - submenu is open');
                e.preventDefault();
            }
            return;
        }
        
        // Normal main carousel navigation (no submenu open)
        if (e.key === 'ArrowRight') carousel.goToNext();
        else if (e.key === 'ArrowLeft') carousel.goToPrev();
    };
    window.addEventListener('keydown', keydownHandler); // Attach keydown event listener to the window
    const themes = [defaultCarouselStyle, darkTheme, cyberpunkTheme, lightTheme, minimalTheme]; // Define available themes
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
                
                // Update distance dimming visuals every frame
                if (typeof carousel.updateHoverVisuals === 'function') {
                    carousel.updateHoverVisuals();
                }
                
                // Update central content panel
                if (centralPanel && centralPanel.update) {
                    centralPanel.update(Date.now());
                }
                
                // Add more robust submenu update logic with debugging
                if (canUpdateSubmenu) {
                    try {
                        activeSubmenu.update();
                        
                        // Update submenu hover visuals every frame too
                        if (typeof activeSubmenu.updateHoverVisuals === 'function') {
                            activeSubmenu.updateHoverVisuals();
                        }
                        
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
                
                // Update background manager (renders its own scene first)
                if (backgroundManager) {
                    backgroundManager.update(0.016);
                }
                
                controls.update();
                // Main scene renders ON TOP with autoClear=false (background already cleared)
                renderer.render(scene, camera); 
            } catch (error) {
                console.error('Error in animation loop:', error);
            }
        } else {
            // During transitions, still need to render background first
            if (backgroundManager) {
                backgroundManager.update(0.016);
            }
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
    
    // --- Global mousemove handler for submenu hover effects ---
    const hoverMouse = new THREE.Vector2();
    function handleGlobalMouseMove(event) {
        // Update mouse coordinates for hover detection
        const rect = renderer.domElement.getBoundingClientRect();
        hoverMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        hoverMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Check submenu hover if submenu is active
        if (activeSubmenu && typeof activeSubmenu.checkHover === 'function') {
            activeSubmenu.checkHover(hoverMouse, camera);
        }
    }
    
    // Attach global mousemove for submenu hover
    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    
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
        // Dispose BackgroundManager
        if (backgroundManager) {
            try {
                backgroundManager.dispose();
                backgroundManager = null;
                console.warn("BackgroundManager disposed."); // Debug log
            } catch (e) {
                console.warn("BackgroundManager dispose error:", e);
            }
        }
        // Phase 2: Remove Global Event Listeners
        console.warn("Removing global event listeners..."); // Debug log
        detachMobilePointerHandlers();
        window.removeEventListener('resize', resizeHandler); // Remove resize event listener
        window.removeEventListener('wheel', wheelEventHandler, { capture: true }); // Ensure capture matches addEventListener
        window.removeEventListener('click', handleCarouselClick); // Remove click event listener 
        window.removeEventListener('keydown', keydownHandler); // Remove keydown event listener
        window.removeEventListener('touchstart', touchStartHandler, { passive: false }); // Ensure options match
        window.removeEventListener('touchmove', touchMoveHandler, { passive: false }); // Ensure options match
        window.removeEventListener('touchend', touchEndHandler, { passive: false }); // Ensure options match
        console.warn("Global event listeners removed."); // Debug log
        if (submenuCloseProxyButton?.parentNode) {
            submenuCloseProxyButton.parentNode.removeChild(submenuCloseProxyButton);
            submenuCloseProxyButton = null;
        }
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
            const disposingSubmenu = activeSubmenu;
            // Ensure GSAP tweens targeting the submenu are killed *before* disposal
            gsap.killTweensOf(disposingSubmenu);
            disposingSubmenu.children.forEach(child => gsap.killTweensOf(child)); // Kill children tweens too
            if (disposingSubmenu.floatingPreview) gsap.killTweensOf(disposingSubmenu.floatingPreview); // Kill floating
            if (disposingSubmenu.closeButton) gsap.killTweensOf(disposingSubmenu.closeButton.material); // Kill close button material tweens
            setActiveSubmenu(null);
            disposingSubmenu.dispose?.(); // Call the dispose method if it exists
            scene.remove(disposingSubmenu); // Remove the submenu from the scene
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
            repairState: repairBrokenState,
            // Background management utilities - via integrated BackgroundManager
            getBackgroundManager: () => backgroundManager,
            listBackgrounds: () => backgroundManager?.getBackgrounds() || [],
            setBackground: (id) => backgroundManager?.setActive(id),
            cycleBackground: () => backgroundManager?.cycleNext(),
            getBackgroundMode: () => backgroundManager?.activeBackgroundId || 'polygons',
            setBackgroundMode: (mode) => backgroundManager?.setActive(mode),
            cycleBackgroundMode: () => backgroundManager?.cycleNext(),
            getValidBackgroundModes: () => backgroundManager?.getBackgrounds()?.map(b => b.id) || ['polygons'],
        }
    };
}