import gsap from 'gsap';

/**
 * Elegant Animation Style
 * Rotates carousel items 180° on Y-axis to show backside
 * @module elegant
 */

/**
 * Animate carousel items to rotate 180° (show backside)
 * @param {Array} carouselItems - Array of Three.js mesh objects from carousel
 * @param {Object} options - Animation options
 * @param {number} options.duration - Animation duration in seconds (default: 1.0)
 * @param {string} options.ease - GSAP easing function (default: "power2.inOut")
 * @param {Function} options.onComplete - Callback when animation completes
 * @returns {gsap.core.Timeline} GSAP timeline for cleanup
 */
export function animateOpen(carouselItems, options = {}) {
  const {
    duration = 1.0,
    ease = 'power2.inOut',
    onComplete = null,
  } = options;

  // Check if we have access to carousel
  if (typeof window === 'undefined' || !window.debugCarousel) {
    console.warn('[Elegant Animation] Window or debugCarousel not available');
    if (onComplete) onComplete();
    return null;
  }

  // Check if carousel is already transitioning
  if (window.debugCarousel.isTransitioning) {
    console.warn('[Elegant Animation] Carousel is already transitioning');
    if (onComplete) onComplete();
    return null;
  }

  console.log('[Elegant Animation] Starting open animation');

  // Set transition lock
  window.debugCarousel.isTransitioning = true;

  // Create timeline
  const timeline = gsap.timeline({
    onComplete: () => {
      console.log('[Elegant Animation] Open animation complete');
      // Release lock after animation
      window.debugCarousel.isTransitioning = false;
      if (onComplete) onComplete();
    },
  });

  // Get carousel items if not provided
  const items = carouselItems || window.debugCarousel.carousel?.itemMeshes || [];

  if (items.length === 0) {
    console.warn('[Elegant Animation] No carousel items found');
    window.debugCarousel.isTransitioning = false;
    if (onComplete) onComplete();
    return null;
  }

  // Rotate each item 180° on Y-axis
  items.forEach((item) => {
    if (!item || !item.rotation) return;

    // Rotate 180° (π radians) on Y-axis
    const targetRotation = item.rotation.y + Math.PI;

    timeline.to(
      item.rotation,
      {
        y: targetRotation,
        duration,
        ease,
      },
      0 // Start all animations at the same time
    );

    // Also fade slightly for emphasis
    if (item.material) {
      timeline.to(
        item.material,
        {
          opacity: 0.7,
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
 * Animate carousel items back to original rotation (close animation)
 * @param {Array} carouselItems - Array of Three.js mesh objects from carousel
 * @param {Object} savedState - Saved state from before opening (unused for elegant)
 * @param {Object} options - Animation options
 * @param {number} options.duration - Animation duration in seconds (default: 1.0)
 * @param {string} options.ease - GSAP easing function (default: "power2.inOut")
 * @param {Function} options.onComplete - Callback when animation completes
 * @returns {gsap.core.Timeline} GSAP timeline for cleanup
 */
// eslint-disable-next-line no-unused-vars
export function animateClose(carouselItems, savedState = null, options = {}) {
  const {
    duration = 1.0,
    ease = 'power2.inOut',
    onComplete = null,
  } = options;

  if (typeof window === 'undefined' || !window.debugCarousel) {
    console.warn('[Elegant Animation] Window or debugCarousel not available');
    if (onComplete) onComplete();
    return null;
  }

  // Check if carousel is already transitioning
  if (window.debugCarousel.isTransitioning) {
    console.warn('[Elegant Animation] Carousel is already transitioning');
    if (onComplete) onComplete();
    return null;
  }

  console.log('[Elegant Animation] Starting close animation');

  // Set transition lock
  window.debugCarousel.isTransitioning = true;

  // Create timeline
  const timeline = gsap.timeline({
    onComplete: () => {
      console.log('[Elegant Animation] Close animation complete');
      // Release lock after animation
      window.debugCarousel.isTransitioning = false;
      if (onComplete) onComplete();
    },
  });

  // Get carousel items if not provided
  const items = carouselItems || window.debugCarousel.carousel?.itemMeshes || [];

  if (items.length === 0) {
    console.warn('[Elegant Animation] No carousel items found');
    window.debugCarousel.isTransitioning = false;
    if (onComplete) onComplete();
    return null;
  }

  // Rotate each item back 180° on Y-axis
  items.forEach((item) => {
    if (!item || !item.rotation) return;

    // Rotate back 180° (subtract π radians)
    const targetRotation = item.rotation.y - Math.PI;

    timeline.to(
      item.rotation,
      {
        y: targetRotation,
        duration,
        ease,
      },
      0
    );

    // Restore opacity
    if (item.material) {
      timeline.to(
        item.material,
        {
          opacity: 1,
          duration,
          ease,
        },
        0
      );
    }
  });

  return timeline;
}
