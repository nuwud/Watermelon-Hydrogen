import gsap from 'gsap';

/**
 * Dramatic Animation Style
 * Pushes carousel items outward radially to create space for checkout panel
 * @module dramatic
 */

/**
 * Animate carousel items outward (dramatic push)
 * @param {Array} carouselItems - Array of Three.js mesh objects from carousel
 * @param {Object} options - Animation options
 * @param {number} options.duration - Animation duration in seconds (default: 0.8)
 * @param {string} options.ease - GSAP easing function (default: "power2.out")
 * @param {Function} options.onComplete - Callback when animation completes
 * @returns {gsap.core.Timeline} GSAP timeline for cleanup
 */
export function animateOpen(carouselItems, options = {}) {
  const {
    duration = 0.8,
    ease = 'power2.out',
    onComplete = null,
  } = options;

  // Check if we have access to carousel
  if (typeof window === 'undefined' || !window.debugCarousel) {
    console.warn('[Dramatic Animation] Window or debugCarousel not available');
    if (onComplete) onComplete();
    return null;
  }

  // Check if carousel is already transitioning
  if (window.debugCarousel.isTransitioning) {
    console.warn('[Dramatic Animation] Carousel is already transitioning');
    if (onComplete) onComplete();
    return null;
  }

  console.log('[Dramatic Animation] Starting open animation');

  // Set transition lock
  window.debugCarousel.isTransitioning = true;

  // Create timeline
  const timeline = gsap.timeline({
    onComplete: () => {
      console.log('[Dramatic Animation] Open animation complete');
      // Release lock after animation
      window.debugCarousel.isTransitioning = false;
      if (onComplete) onComplete();
    },
  });

  // Get carousel items if not provided
  const items = carouselItems || window.debugCarousel.carousel?.itemMeshes || [];

  if (items.length === 0) {
    console.warn('[Dramatic Animation] No carousel items found');
    window.debugCarousel.isTransitioning = false;
    if (onComplete) onComplete();
    return null;
  }

  // Animate each item outward from center
  items.forEach((item) => {
    if (!item || !item.position) return;

    // Calculate direction vector from center (0,0,0)
    const currentX = item.position.x;
    const currentZ = item.position.z;
    
    // Push outward by 50% (multiply distance from center by 1.5)
    const targetX = currentX * 1.5;
    const targetZ = currentZ * 1.5;

    // Animate position
    timeline.to(
      item.position,
      {
        x: targetX,
        z: targetZ,
        duration,
        ease,
      },
      0 // Start all animations at the same time
    );

    // Also fade slightly for emphasis
    if (item.material) {
      const originalOpacity = item.material.opacity !== undefined ? item.material.opacity : 1;
      
      timeline.to(
        item.material,
        {
          opacity: originalOpacity * 0.6,
          duration,
          ease,
        },
        0
      );
    }
  });

  return timeline;
}

/**
 * Animate carousel items back to original positions (close animation)
 * @param {Array} carouselItems - Array of Three.js mesh objects from carousel
 * @param {Object} savedState - Saved state from before opening (positions, etc.)
 * @param {Object} options - Animation options
 * @param {number} options.duration - Animation duration in seconds (default: 0.8)
 * @param {string} options.ease - GSAP easing function (default: "power2.inOut")
 * @param {Function} options.onComplete - Callback when animation completes
 * @returns {gsap.core.Timeline} GSAP timeline for cleanup
 */
// eslint-disable-next-line no-unused-vars
export function animateClose(carouselItems, savedState = null, options = {}) {
  // savedState is reserved for future use when we need to restore exact positions
  const {
    duration = 0.8,
    ease = 'power2.inOut',
    onComplete = null,
  } = options;

  if (typeof window === 'undefined' || !window.debugCarousel) {
    console.warn('[Dramatic Animation] Window or debugCarousel not available');
    if (onComplete) onComplete();
    return null;
  }

  // Check if carousel is already transitioning
  if (window.debugCarousel.isTransitioning) {
    console.warn('[Dramatic Animation] Carousel is already transitioning');
    if (onComplete) onComplete();
    return null;
  }

  console.log('[Dramatic Animation] Starting close animation');

  // Set transition lock
  window.debugCarousel.isTransitioning = true;

  // Create timeline
  const timeline = gsap.timeline({
    onComplete: () => {
      console.log('[Dramatic Animation] Close animation complete');
      // Release lock after animation
      window.debugCarousel.isTransitioning = false;
      if (onComplete) onComplete();
    },
  });

  // Get carousel items if not provided
  const items = carouselItems || window.debugCarousel.carousel?.itemMeshes || [];

  if (items.length === 0) {
    console.warn('[Dramatic Animation] No carousel items found');
    window.debugCarousel.isTransitioning = false;
    if (onComplete) onComplete();
    return null;
  }

  // Animate each item back to original position
  items.forEach((item) => {
    if (!item || !item.position) return;

    // Calculate original position (reverse of outward push)
    const currentX = item.position.x;
    const currentZ = item.position.z;
    
    // Return to original position (divide by 1.5)
    const targetX = currentX / 1.5;
    const targetZ = currentZ / 1.5;

    // Animate position
    timeline.to(
      item.position,
      {
        x: targetX,
        z: targetZ,
        duration,
        ease,
      },
      0
    );

    // Restore opacity
    if (item.material) {
      const targetOpacity = item.material.opacity !== undefined 
        ? item.material.opacity / 0.6 
        : 1;
      
      timeline.to(
        item.material,
        {
          opacity: Math.min(targetOpacity, 1), // Cap at 1
          duration,
          ease,
        },
        0
      );
    }
  });

  return timeline;
}

/**
 * Snapshot current carousel state for later restoration
 * @returns {Object} Saved state object
 */
export function snapshotCarouselState() {
  if (typeof window === 'undefined' || !window.debugCarousel) {
    return null;
  }

  const items = window.debugCarousel.carousel?.itemMeshes || [];
  
  return {
    positions: items.map((item) => ({
      x: item.position.x,
      y: item.position.y,
      z: item.position.z,
    })),
    opacities: items.map((item) => 
      item.material?.opacity !== undefined ? item.material.opacity : 1
    ),
    currentIndex: window.debugCarousel.carousel?.currentIndex || 0,
  };
}
