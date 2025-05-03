import * as THREE from 'three';
import { Submenu } from './Submenu.js'; // Assuming Submenu.js exists and exports Submenu class
import { CloseButton3D } from './CloseButton3D.js';
import { CarouselItem } from './CarouselItem.js'; // To identify parent items
import { SubmenuItem } from './SubmenuItem.js'; // To identify submenu items

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
        const newSubmenu = new Submenu(
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
                if (targetObject instanceof CloseButton3D && targetObject === this.activeSubmenu.closeButton) {
                    console.log("Submenu Close Button clicked.");
                    targetObject.handleClick(); // Button handles its own logic (calls manager's close)
                    interactionHandled = true;
                    break;
                }
                // Check for Submenu Item click
                if (targetObject instanceof SubmenuItem && targetObject.parent === this.activeSubmenu.itemGroup) {
                     // Ensure the item belongs to the *active* submenu's item group
                    console.log(`Submenu Item clicked: Index ${targetObject.userData.index}`);
                    this.activeSubmenu.handleItemClick(targetObject.userData.index); // Tell submenu to handle it
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
            if (targetObject instanceof CarouselItem && targetObject.parent === this.mainCarousel.itemGroup) {
                 // Ensure the item belongs to the main carousel's item group
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