import * as THREE from 'three';
//import { CloseButton3D } from './CloseButton3D.js';
import { Carousel3DSubmenu } from './Carousel3DSubmenu.js';

/**
 * Manages the lifecycle and interactions of submenus within the 3D carousel environment.
 * Ensures only one submenu is active at a time and routes input correctly.
 *
 * @class
 * @param {Object} config - Configuration object.
 * @param {THREE.Scene} config.scene - The main Three.js scene.
 * @param {THREE.Camera} config.camera - The main Three.js camera.
 * @param {Carousel} config.mainCarousel - Reference to the main Carousel instance.
 * @param {Function} [config.onSubmenuClose] - Optional callback when a submenu is closed.
 * @param {Function} [config.onSubmenuOpen] - Optional callback when a submenu is opened.
 */
export class SubmenuManager {
    constructor({ scene, camera, mainCarousel, onSubmenuClose, onSubmenuOpen }) {
        if (!scene || !camera || !mainCarousel) {
            throw new Error("SubmenuManager requires scene, camera, and mainCarousel references.");
        }
        this.scene = scene;
        this.camera = camera;
        this.mainCarousel = mainCarousel; // Reference to the parent carousel
        this.onSubmenuClose = onSubmenuClose;
        this.onSubmenuOpen = onSubmenuOpen;

        /** @type {Submenu | null} */
        this.activeSubmenu = null;
        this.raycaster = new THREE.Raycaster();
        this.isClosing = false; // Prevent race conditions during close animation
        this.isOpening = false; // Prevent race conditions during open animation

        console.log("SubmenuManager initialized.");
    }

    /**
     * Spawns a new submenu associated with a clicked parent item.
     * Closes any currently active submenu first.
     *
     * @param {CarouselItem} parentItem - The CarouselItem instance that was clicked.
     * @param {Array<Object>} submenuData - The array of data objects for the submenu items.
     * @param {Object} [submenuConfig={}] - Optional configuration specific to this submenu.
     */
    async spawnSubmenu(parentItem, submenuData, submenuConfig = {}) {
        if (this.isOpening || this.isClosing || !parentItem || !submenuData || submenuData.length === 0) {
            console.warn("Submenu spawn prevented: Already transitioning or invalid data.", { isOpening: this.isOpening, isClosing: this.isClosing, parentItem, submenuData });
            return;
        }

        this.isOpening = true;
        console.log(`Spawning submenu for parent: ${parentItem.userData?.itemData?.label || 'Unknown'}`);

        // Close existing submenu before opening a new one
        if (this.activeSubmenu) {
            await this.closeActiveSubmenu(); // Wait for close to complete
        }

        // Create and position the new submenu
        const newSubmenu = new Carousel3DSubmenu(
            parentItem,
            submenuData,
            {
                camera: this.camera,
                scene: this.scene,
                submenuManager: this, // Pass reference for close requests
                ...submenuConfig // Merge specific config
            }
        );

        this.scene.add(newSubmenu);
        this.activeSubmenu = newSubmenu;

        // Trigger open callback if provided
        if (this.onSubmenuOpen) {
            this.onSubmenuOpen(this.activeSubmenu);
        }

        // Show the submenu (returns a promise if animated)
        await this.activeSubmenu.show(); // Wait for show animation

        this.isOpening = false;
        console.log("Submenu spawned and shown.");
    }

    /**
     * Closes and disposes of the currently active submenu.
     * @returns {Promise<void>} A promise that resolves when the submenu is fully closed and disposed.
     */
    async closeActiveSubmenu() {
        if (!this.activeSubmenu || this.isClosing) {
            // console.log("Close request ignored: No active submenu or already closing.");
            return;
        }

        this.isClosing = true;
        console.log("Closing active submenu...");
        const submenuToClose = this.activeSubmenu;
        this.activeSubmenu = null; // Set to null immediately to prevent further interaction routing

        try {
            await submenuToClose.hide(); // Wait for hide animation
            submenuToClose.dispose(); // Clean up resources
            if (submenuToClose.parent === this.scene) {
                this.scene.remove(submenuToClose); // Ensure removal from scene
            }
            console.log("Submenu closed and disposed.");

            // Trigger close callback if provided
            if (this.onSubmenuClose) {
                this.onSubmenuClose();
            }
        } catch (error) {
            console.error("Error during submenu hide/dispose:", error);
        } finally {
            this.isClosing = false;
        }
    }

    /**
     * Processes pointer click events to determine interactions with submenus or the main carousel.
     * Should be called from the main application's event listener.
     *
     * @param {THREE.Vector2} pointerCoords - Normalized device coordinates (-1 to +1).
     */
    processClick(pointerCoords) {
        if (this.isClosing || this.isOpening) return; // Don't process clicks during transitions

        this.raycaster.setFromCamera(pointerCoords, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length === 0) return;

        let clickedObject = intersects[0].object;
        let interactionHandled = false;

        // --- Priority 1: Check Active Submenu Interactions ---
        if (this.activeSubmenu) {
            let targetObject = clickedObject;
            while (targetObject) {
                // Check for Close Button click
                if (targetObject.userData?.isCloseButton && targetObject === this.activeSubmenu.closeButton) {
                    console.log("Submenu Close Button clicked.");
                    // Button handles its own logic or call our close method
                    this.closeActiveSubmenu();
                    interactionHandled = true;
                    break;
                }
                // Check for Submenu Item click
                if (targetObject.userData?.isSubmenuItem && targetObject.parent === this.activeSubmenu.itemGroup) {
                    console.log(`Submenu Item clicked: Index ${targetObject.userData.index}`);
                    this.activeSubmenu.handleItemClick?.(targetObject.userData.index);
                    interactionHandled = true;
                    break;
                }
                 // Check if click is anywhere within the active submenu group but not handled above
                 if (targetObject === this.activeSubmenu) {
                    // Clicked on the background/base of the submenu - potentially ignore or handle differently
                    // console.log("Clicked on active submenu base.");
                    // interactionHandled = true; // Decide if this should block main carousel clicks
                    break; // Stop traversal up if we hit the submenu root
                 }
                targetObject = targetObject.parent;
            }
            if (interactionHandled) return; // Stop if submenu handled the click
        }

        // --- Priority 2: Check Main Carousel Interactions (only if no active submenu interaction) ---
        let targetObject = clickedObject;
        while (targetObject) {
            // Replace CarouselItem with user data check
            if (targetObject.userData?.index !== undefined && targetObject.parent === this.mainCarousel.itemGroup) {
                console.log(`Main Carousel Item clicked: Index ${targetObject.userData.index}`);
                const itemData = targetObject.userData.itemData;
                // Check if this item *has* submenu data defined
                if (itemData && itemData.submenu && Array.isArray(itemData.submenu) && itemData.submenu.length > 0) {
                    this.spawnSubmenu(targetObject, itemData.submenu); // Pass the CarouselItem instance and data
                } else {
                    // Handle click on main item *without* a submenu (e.g., navigate, select)
                    console.log("Clicked main item without a submenu.");
                    this.mainCarousel.selectItem(targetObject.userData.index); // Example: Select the item
                }
                interactionHandled = true;
                break;
            }
             // Stop traversal if we hit the main carousel root
             if (targetObject === this.mainCarousel) {
                break;
             }
            targetObject = targetObject.parent;
        }

        // Optional: Handle clicks outside any interactive element (e.g., close submenu)
        // if (!interactionHandled && this.activeSubmenu) {
        //     console.log("Clicked outside active elements, closing submenu.");
        //     this.closeActiveSubmenu();
        // }
    }

    /**
     * Processes scroll/wheel events, routing them to the active submenu if one exists.
     * @param {number} deltaY - The vertical scroll amount.
     */
    processScroll(deltaY) {
        if (this.activeSubmenu && !this.isClosing && !this.isOpening) {
            this.activeSubmenu.scrollSubmenu(deltaY);
        }
        // Optionally, add logic here to scroll the main carousel if no submenu is active
        // else if (!this.isClosing && !this.isOpening) {
        //     this.mainCarousel.scroll(deltaY); // Assuming main carousel has a scroll method
        // }
    }

    /**
     * Cleans up resources and removes the active submenu.
     */
    dispose() {
        console.log("Disposing SubmenuManager...");
        this.closeActiveSubmenu().then(() => {
             console.log("Active submenu closed during manager disposal.");
        });
        // Remove any event listeners this manager might have set up globally
        this.activeSubmenu = null;
        this.scene = null; // Release references
        this.camera = null;
        this.mainCarousel = null;
        console.log("SubmenuManager disposed.");
    }
}

/**
 * Asynchronously spawns a submenu for a parent carousel item
 * @param {string} item - The label of the parent item
 * @param {number} index - The index of the parent item in the carousel
 * @param {Object} options - Configuration options
 * @param {THREE.Scene} options.scene - The Three.js scene
 * @param {THREE.Camera} options.camera - The Three.js camera
 * @param {Object} options.carousel - The parent carousel instance
 * @param {Object} options.submenus - Map of submenu items by parent name
 * @param {Function} options.setActiveSubmenu - Function to set the active submenu reference
 * @param {Object} options.currentTheme - The current theme configuration
 * @returns {Promise<Carousel3DSubmenu>} - Promise resolving to the spawned submenu
 */
export async function spawnSubmenuAsync(item, index, options) {
    const { scene, camera, carousel, submenus, setActiveSubmenu, currentTheme, /** getItemAngles,*/ guard } = options;
    
    return new Promise((resolve, reject) => {
        console.warn(`[Watermelon] Starting submenu spawn for: ${item} at index ${index}`);
        
        // Enhanced validation and debugging
        if (!scene) {
            console.error('[Watermelon] CRITICAL: Scene is missing during submenu creation!');
            return reject(new Error('Scene is required for submenu creation'));
        }
        
        if (!camera) {
            console.error('[Watermelon] CRITICAL: Camera is missing during submenu creation!');
            return reject(new Error('Camera is required for submenu creation'));
        }
        
        // Check if guard is available and log warning if not
        if (!guard) {
            console.warn('[Watermelon] No selection guard provided, submenu will create its own');
        }
        
        const mesh = carousel.itemMeshes[index]; 
        if (!mesh) { 
            console.error('[Watermelon] No mesh found for submenu spawn:', item, index);
            return reject(new Error(`Mesh not found for item ${item} at index ${index}`)); 
        }
        
        const submenuItems = submenus[item]; 
        
        // Check if submenuItems is an array
        if (!Array.isArray(submenuItems) || submenuItems.length === 0) {
            console.error(`[Watermelon] Invalid submenu items for ${item}:`, submenuItems);
            return reject(new Error(`Invalid submenu items for ${item}`));
        } else {
            console.warn(`[Watermelon] Creating submenu with ${submenuItems.length} items:`, submenuItems);
        }
        
        // Pass the angles to the submenu if available
        const angles = options.getItemAngles ? options.getItemAngles(submenuItems.length) : null;
        
        // Create the submenu with the guard included in config
        const submenu = new Carousel3DSubmenu(mesh, submenuItems, {
            ...currentTheme,
            carousel,
            angles,
            // Explicitly pass the guard
            guard
        });
        
        // CRITICAL: Scene and camera injection
        submenu.scene = scene;
        submenu.camera = camera;
        
        // Add to scene before starting initialization checks
        scene.add(submenu);
        console.warn('[Watermelon] Added submenu to scene, checking scene children:', 
                    scene.children.includes(submenu));
        
        setActiveSubmenu(submenu);
        scene.userData.activeSubmenu = submenu;
        
        // Show animation
        submenu.show?.();
        
        // Wait for initialization to complete with timeout safety
        const waitForInitialization = () => {
            const maxAttempts = 30;  // 3 seconds max wait time
            let attempts = 0;
            
            const checkInitialization = () => {
                attempts++;
                
                if (submenu.isInitialized && submenu.itemMeshes.length > 0) {
                    console.warn(`[Watermelon] Submenu for ${item} initialized with ${submenu.itemMeshes.length} items`);
                    resolve(submenu);
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    console.error(`[Watermelon] Submenu initialization timed out after ${maxAttempts} attempts`);
                    // Still resolve, but with a warning - the menu might not be fully functional
                    resolve(submenu);
                    return;
                }
                
                console.log(`[Watermelon] Waiting for submenu initialization... (${attempts}/${maxAttempts})`);
                setTimeout(checkInitialization, 100);
            };
            
            checkInitialization();
        };
        
        // Start initialization check process
        waitForInitialization();
    });
}