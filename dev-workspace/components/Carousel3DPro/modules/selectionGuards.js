/**
 * SelectionGuard - Manages state locks for carousel selection and animation
 * to prevent race conditions and visual state hijacking.
 * 
 * This utility provides a centralized way to manage animation states, 
 * selection locks, and transition flags across the carousel system.
 */
export class SelectionGuard {
  constructor() {
    // Core selection locks
    this.isAnimating = false;       // General animation in progress
    this.isTransitioning = false;   // Menu transition in progress
    this.selectItemLock = false;    // Selection operation in progress
    this.forceLockedIndex = null;   // Force selection to specific index
    
    // Additional optional flags
    this.targetRotationLocked = false;  // Prevent targetRotation modification
    this.ignoreHighlightOverride = false; // Complete highlight override
    
    // Debug flag - useful for detailed logging
    this.debugMode = false;
    
    // Add timeout tracking for auto-repair
    this.lastTransitionStartTime = null;
    this.maxTransitionTime = 5000; // 5 seconds
  }

  /**
   * Logs a message if debug mode is enabled
   * @param {string} message - The message to log
   */
  log(message) {
    if (this.debugMode) {
      console.log(`[SelectionGuard] ${message}`);
    }
  }

  /**
   * Enables debug mode for this guard instance
   */
  enableDebug() {
    this.debugMode = true;
    this.log('Debug mode enabled');
  }

  /**
   * Locks selection for a specific operation and index
   * @param {number|null} index - Index to lock to, or null for general lock
   * @param {Object} options - Lock options
   * @param {boolean} [options.lockRotation=false] - Whether to lock targetRotation
   * @param {boolean} [options.preventHighlight=false] - Whether to prevent highlight updates
   * @returns {Function} Unlock function to call when operation completes
   */
  lockSelection(index = null, options = {}) {
    // Auto-repair if already locked for too long
    this.checkAndAutoRepair();
    
    this.log(`Locking selection${index !== null ? ` to index ${index}` : ''}`);
    
    // Set lock flags
    this.isAnimating = true;
    this.selectItemLock = true;
    
    if (index !== null) {
      this.forceLockedIndex = index;
    }
    
    if (options.lockRotation) {
      this.targetRotationLocked = true;
    }
    
    if (options.preventHighlight) {
      this.ignoreHighlightOverride = true;
    }
    
    // Return unlock function
    return () => {
      this.log('Unlocking selection');
      this.isAnimating = false;
      this.selectItemLock = false;
      this.forceLockedIndex = null;
      this.targetRotationLocked = false;
      this.ignoreHighlightOverride = false;
    };
  }
  
  /**
   * Begins a transition (e.g., between menus)
   * @returns {Function} End transition function
   */
  beginTransition() {
    // Auto-repair if already transitioning for too long
    this.checkAndAutoRepair();
    
    this.log('Beginning transition');
    this.isTransitioning = true;
    this.lastTransitionStartTime = Date.now();
    
    return () => {
      this.log('Ending transition');
      this.isTransitioning = false;
      this.lastTransitionStartTime = null;
    };
  }
  
  /**
   * Checks and auto-repairs guard if locked for too long
   * @private
   */
  checkAndAutoRepair() {
    // Check if we've been in transition for too long
    if (this.isTransitioning && this.lastTransitionStartTime) {
      const elapsed = Date.now() - this.lastTransitionStartTime;
      if (elapsed > this.maxTransitionTime) {
        console.warn(`[SelectionGuard] Auto-repairing: transition has been active for ${elapsed}ms`);
        this.reset();
      }
    }
    
    // Check if selection has been locked for too long (add more checks as needed)
    // Additional check logic can be added here
  }
  
  /**
   * Checks if any selection operation is allowed
   * @returns {boolean} Whether selection is allowed
   */
  canSelect() {
    // Check for auto-repair before evaluating
    this.checkAndAutoRepair();
    
    const allowed = !(
      this.isAnimating || 
      this.selectItemLock || 
      this.forceLockedIndex !== null || 
      this.isTransitioning
    );
    
    if (!allowed) {
      this.log('Selection blocked: ' + 
        (this.isAnimating ? 'isAnimating ' : '') +
        (this.selectItemLock ? 'selectItemLock ' : '') +
        (this.forceLockedIndex !== null ? `forceLockedIndex=${this.forceLockedIndex} ` : '') +
        (this.isTransitioning ? 'isTransitioning' : '')
      );
    }
    
    return allowed;
  }
  
  /**
   * Checks if highlighting can be updated
   * @param {boolean} [force=false] - Whether to force update even during animation
   * @returns {boolean} Whether highlighting is allowed
   */
  canUpdateHighlight(force = false) {
    const allowed = !(
      this.ignoreHighlightOverride || 
      this.isTransitioning || 
      this.selectItemLock || 
      this.forceLockedIndex !== null ||
      (this.isAnimating && !force)
    );
    
    if (!allowed && this.debugMode) {
      this.log('Highlight update blocked: ' + 
        (this.ignoreHighlightOverride ? 'ignoreHighlightOverride ' : '') +
        (this.isTransitioning ? 'isTransitioning ' : '') +
        (this.selectItemLock ? 'selectItemLock ' : '') +
        (this.forceLockedIndex !== null ? `forceLockedIndex=${this.forceLockedIndex} ` : '') +
        (this.isAnimating && !force ? 'isAnimating' : '')
      );
    }
    
    return allowed;
  }
  
  /**
   * Checks if scrolling is allowed
   * @returns {boolean} Whether scrolling is allowed
   */
  canScroll() {
    const allowed = !(
      this.selectItemLock || 
      this.forceLockedIndex !== null || 
      this.isTransitioning ||
      this.targetRotationLocked
    );
    
    if (!allowed && this.debugMode) {
      this.log('Scrolling blocked: ' + 
        (this.selectItemLock ? 'selectItemLock ' : '') +
        (this.forceLockedIndex !== null ? `forceLockedIndex=${this.forceLockedIndex} ` : '') +
        (this.isTransitioning ? 'isTransitioning ' : '') +
        (this.targetRotationLocked ? 'targetRotationLocked' : '')
      );
    }
    
    return allowed;
  }
  
  /**
   * Checks if animation is allowed
   * @returns {boolean} Whether any animation is allowed
   */
  canAnimate() {
    return !this.isAnimating && !this.isTransitioning;
  }
  
  /**
   * Resets all guards to their default state
   */
  reset() {
    this.log('Resetting all guards');
    this.isAnimating = false;
    this.isTransitioning = false;
    this.selectItemLock = false;
    this.forceLockedIndex = null;
    this.targetRotationLocked = false;
    this.ignoreHighlightOverride = false;
    this.lastTransitionStartTime = null;
  }
}

// Singleton instance for global guards
export const globalGuard = new SelectionGuard();

/**
 * Helper function to execute a callback with selection locked
 * @param {SelectionGuard} guard - The guard instance to use
 * @param {number|null} index - Index to lock to, or null for general lock  
 * @param {Function} callback - Function to execute while locked
 * @param {Object} options - Lock options
 * @returns {*} The return value from the callback
 */
export function withSelectionLock(guard, index, callback, options = {}) {
  // Safety check - if guard is invalid, create a temporary one
  if (!guard || typeof guard.lockSelection !== 'function') {
    console.error('[SelectionGuard] Invalid guard provided to withSelectionLock, using globalGuard');
    guard = globalGuard;
  }
  
  const unlock = guard.lockSelection(index, options);
  try {
    return callback();
  } finally {
    unlock();
  }
}

/**
 * Helper function to execute a callback during a transition
 * @param {SelectionGuard} guard - The guard instance to use
 * @param {Function} callback - Function to execute during transition  
 * @returns {*} The return value from the callback
 */
export function withTransition(guard, callback) {
  const endTransition = guard.beginTransition();
  try {
    return callback();
  } finally {
    endTransition();
  }
}