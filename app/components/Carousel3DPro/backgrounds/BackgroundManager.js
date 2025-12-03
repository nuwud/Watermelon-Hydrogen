/**
 * BackgroundManager - Modular 3D Background System for Watermelon Hydrogen
 * 
 * Manages registration, switching, and persistence of background effects
 * for the 3D carousel scene.
 * 
 * Usage:
 *   const manager = new BackgroundManager(scene, camera, renderer);
 *   manager.register('polygons', InteractivePolygonsWall);
 *   manager.register('dome', BackgroundDome);
 *   manager.setActive('polygons');
 * 
 * SSR-safe: This module should only be imported client-side.
 */

const STORAGE_KEY = 'wm_background_mode';
const DEFAULT_BACKGROUND = 'solid';

/**
 * @typedef {Object} BackgroundModule
 * @property {function(THREE.Scene, THREE.Camera, THREE.WebGLRenderer, Object?): void} init
 * @property {function(number): void} update
 * @property {function(): void} dispose
 */

export class BackgroundManager {
    /**
     * @param {THREE.Scene} scene
     * @param {THREE.Camera} camera
     * @param {THREE.WebGLRenderer} renderer
     * @param {Object} options
     * @param {string} [options.defaultBackground='solid']
     * @param {boolean} [options.persistSelection=true]
     */
    constructor(scene, camera, renderer, options = {}) {
        if (typeof window === 'undefined') {
            throw new Error('[BackgroundManager] Cannot initialize in SSR context');
        }
        
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.options = {
            defaultBackground: options.defaultBackground || DEFAULT_BACKGROUND,
            persistSelection: options.persistSelection !== false,
        };
        
        /** @type {Map<string, { module: BackgroundModule, instance: any, config: Object }>} */
        this.backgrounds = new Map();
        
        /** @type {string|null} */
        this.activeId = null;
        
        /** @type {any} */
        this.activeInstance = null;
        
        /** @type {THREE.Color|null} */
        this.originalBackground = null;
        
        // Store original scene background
        if (this.scene.background) {
            this.originalBackground = this.scene.background.clone();
        }
        
        // Register built-in solid color background
        this._registerSolidBackground();
        
        // Restore persisted selection
        if (this.options.persistSelection) {
            this._restorePersistedSelection();
        }
        
        console.log('[BackgroundManager] Initialized');
    }
    
    /**
     * Register the built-in solid color background (uses scene.background)
     * @private
     */
    _registerSolidBackground() {
        this.backgrounds.set('solid', {
            module: {
                init: () => {
                    // Restore original scene.background if available
                    if (this.originalBackground) {
                        this.scene.background = this.originalBackground.clone();
                    }
                },
                update: () => {
                    // Solid background doesn't animate
                },
                dispose: () => {
                    // Nothing to dispose for solid color
                },
            },
            instance: null,
            config: { label: 'Original Solid Color' },
        });
    }
    
    /**
     * Restore persisted background selection from localStorage
     * @private
     */
    _restorePersistedSelection() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && this.backgrounds.has(stored)) {
                this.setActive(stored);
            }
        } catch (e) {
            console.warn('[BackgroundManager] Failed to restore persisted selection:', e);
        }
    }
    
    /**
     * Persist the current selection to localStorage
     * @private
     */
    _persistSelection() {
        if (!this.options.persistSelection) return;
        try {
            if (this.activeId) {
                localStorage.setItem(STORAGE_KEY, this.activeId);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) {
            console.warn('[BackgroundManager] Failed to persist selection:', e);
        }
    }
    
    /**
     * Register a new background module
     * @param {string} id - Unique identifier for this background
     * @param {BackgroundModule|Function} ModuleOrClass - Background module or class with init/update/dispose
     * @param {Object} [config={}] - Configuration options for this background
     * @param {string} [config.label] - Human-readable label
     * @returns {BackgroundManager} - Returns this for chaining
     */
    register(id, ModuleOrClass, config = {}) {
        if (this.backgrounds.has(id)) {
            console.warn(`[BackgroundManager] Overwriting existing background: ${id}`);
            this.unregister(id);
        }
        
        // Handle both class-based and object-based modules
        const isClass = typeof ModuleOrClass === 'function' && /^\s*class\s/.test(ModuleOrClass.toString());
        
        this.backgrounds.set(id, {
            module: isClass ? ModuleOrClass : ModuleOrClass,
            instance: null,
            config: { label: config.label || id, ...config },
            isClass,
        });
        
        console.log(`[BackgroundManager] Registered background: ${id}`);
        return this;
    }
    
    /**
     * Unregister a background module
     * @param {string} id - Background identifier to remove
     * @returns {boolean} - True if successfully unregistered
     */
    unregister(id) {
        if (id === 'solid') {
            console.warn('[BackgroundManager] Cannot unregister built-in solid background');
            return false;
        }
        
        if (this.activeId === id) {
            this.setActive('solid');
        }
        
        const entry = this.backgrounds.get(id);
        if (entry && entry.instance) {
            try {
                if (typeof entry.instance.dispose === 'function') {
                    entry.instance.dispose();
                } else if (typeof entry.module.dispose === 'function') {
                    entry.module.dispose();
                }
            } catch (e) {
                console.error(`[BackgroundManager] Error disposing ${id}:`, e);
            }
        }
        
        return this.backgrounds.delete(id);
    }
    
    /**
     * Set the active background
     * @param {string} id - Background identifier to activate
     * @param {Object} [options={}] - Additional options passed to init
     * @returns {boolean} - True if successfully activated
     */
    setActive(id, options = {}) {
        if (!this.backgrounds.has(id)) {
            console.error(`[BackgroundManager] Unknown background: ${id}`);
            return false;
        }
        
        // Dispose current background
        if (this.activeId && this.activeId !== id) {
            this._disposeActive();
        }
        
        // Clear scene.background for non-solid backgrounds
        if (id !== 'solid') {
            this.scene.background = null;
        }
        
        const entry = this.backgrounds.get(id);
        
        try {
            if (entry.isClass) {
                // Class-based module - instantiate it
                entry.instance = new entry.module(this.scene, this.camera, this.renderer, options);
            } else {
                // Object-based module - call init directly
                entry.module.init(this.scene, this.camera, this.renderer, options);
                entry.instance = entry.module;
            }
            
            this.activeId = id;
            this.activeInstance = entry.instance;
            
            console.log(`[BackgroundManager] Activated background: ${id}`);
            this._persistSelection();
            
            // Dispatch event for debug panels/HUD
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('wm-background-changed', {
                    detail: { id, label: entry.config.label }
                }));
            }
            
            return true;
        } catch (e) {
            console.error(`[BackgroundManager] Failed to activate ${id}:`, e);
            // Fallback to solid
            if (id !== 'solid') {
                this.setActive('solid');
            }
            return false;
        }
    }
    
    /**
     * Dispose the currently active background
     * @private
     */
    _disposeActive() {
        if (!this.activeId) return;
        
        const entry = this.backgrounds.get(this.activeId);
        if (!entry) return;
        
        try {
            if (entry.instance && typeof entry.instance.dispose === 'function') {
                entry.instance.dispose();
            } else if (typeof entry.module.dispose === 'function') {
                entry.module.dispose();
            }
        } catch (e) {
            console.error(`[BackgroundManager] Error disposing ${this.activeId}:`, e);
        }
        
        entry.instance = null;
        this.activeInstance = null;
    }
    
    /**
     * Update the active background (call in animation loop)
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        if (!this.activeInstance) return;
        
        try {
            if (typeof this.activeInstance.update === 'function') {
                this.activeInstance.update(deltaTime);
            }
        } catch (e) {
            console.error('[BackgroundManager] Error in background update:', e);
        }
    }
    
    /**
     * Get list of registered backgrounds
     * @returns {Array<{id: string, label: string, isActive: boolean}>}
     */
    getBackgrounds() {
        const result = [];
        for (const [id, entry] of this.backgrounds) {
            result.push({
                id,
                label: entry.config.label,
                isActive: id === this.activeId,
            });
        }
        return result;
    }
    
    /**
     * Get the currently active background ID
     * @returns {string|null}
     */
    getActiveId() {
        return this.activeId;
    }
    
    /**
     * Cycle to the next background
     * @returns {string} - The new active background ID
     */
    cycleNext() {
        const ids = Array.from(this.backgrounds.keys());
        const currentIndex = ids.indexOf(this.activeId);
        const nextIndex = (currentIndex + 1) % ids.length;
        this.setActive(ids[nextIndex]);
        return ids[nextIndex];
    }
    
    /**
     * Clean up all backgrounds and resources
     */
    dispose() {
        console.log('[BackgroundManager] Disposing all backgrounds');
        
        // Dispose active first
        this._disposeActive();
        
        // Dispose all registered backgrounds
        for (const [id, entry] of this.backgrounds) {
            if (entry.instance && typeof entry.instance.dispose === 'function') {
                try {
                    entry.instance.dispose();
                } catch (e) {
                    console.error(`[BackgroundManager] Error disposing ${id}:`, e);
                }
            }
        }
        
        this.backgrounds.clear();
        
        // Restore original background
        if (this.originalBackground) {
            this.scene.background = this.originalBackground;
        }
        
        this.activeId = null;
        this.activeInstance = null;
    }
}

export default BackgroundManager;
