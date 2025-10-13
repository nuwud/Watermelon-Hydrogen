import gsap from 'gsap';

/**
 * Subtle Animation Style
 * Fades carousel items to low opacity without moving them
 * @module subtle
 */

/**
 * Animate carousel items to low opacity (subtle fade)
 * @param {Array} carouselItems - Array of Three.js mesh objects from carousel
 * @param {Object} options - Animation options
 * @param {number} options.duration - Animation duration in seconds (default: 0.6)
 * @param {string} options.ease - GSAP easing function (default: "power1.out")
 * @param {Function} options.onComplete - Callback when animation completes
 * @returns {gsap.core.Timeline} GSAP timeline for cleanup
 */
export function animateOpen(carouselItems, options = {}) {
  const {
    duration = 0.6,
    ease = 'power1.out',
    onComplete = null,
  } = options;

  // Check if we have access to carousel
  if (typeof window === 'undefined' || !window.debugCarousel) {
    console.warn('[Subtle Animation] Window or debugCarousel not available');
    if (onComplete) onComplete();
    return null;
  }

  // Check if carousel is already transitioning
  if (window.debugCarousel.isTransitioning) {
    console.warn('[Subtle Animation] Carousel is already transitioning');
    if (onComplete) onComplete();
    return null;
  }

  console.log('[Subtle Animation] Starting open animation');

  // Set transition lock
  window.debugCarousel.isTransitioning = true;

  // Create timeline
  const timeline = gsap.timeline({
    onComplete: () => {
      console.log('[Subtle Animation] Open animation complete');
      // Release lock after animation
      window.debugCarousel.isTransitioning = false;
      if (onComplete) onComplete();
    },
  });

  // Get carousel items if not provided
  const items = carouselItems || window.debugCarousel.carousel?.itemMeshes || [];

  if (items.length === 0) {
    console.warn('[Subtle Animation] No carousel items found');
    window.debugCarousel.isTransitioning = false;
    if (onComplete) onComplete();
    return null;
  }

  // Fade each item to low opacity
  items.forEach((item) => {
    if (!item || !item.material) return;

    // Fade to 20% opacity
    timeline.to(
      item.material,
      {
        opacity: 0.2,
        duration,
        ease,
      },
      0 // Start all animations at the same time
    );
  });

  return timeline;
}

/**
 * Animate carousel items back to full opacity (close animation)
 * @param {Array} carouselItems - Array of Three.js mesh objects from carousel
 * @param {Object} savedState - Saved state from before opening (unused for subtle)
 * @param {Object} options - Animation options
 * @param {number} options.duration - Animation duration in seconds (default: 0.6)
 * @param {string} options.ease - GSAP easing function (default: "power1.inOut")
 * @param {Function} options.onComplete - Callback when animation completes
 * @returns {gsap.core.Timeline} GSAP timeline for cleanup
 */
// eslint-disable-next-line no-unused-vars
export function animateClose(carouselItems, savedState = null, options = {}) {
  const {
    duration = 0.6,
    ease = 'power1.inOut',
    onComplete = null,
  } = options;

  if (typeof window === 'undefined' || !window.debugCarousel) {
    console.warn('[Subtle Animation] Window or debugCarousel not available');
    if (onComplete) onComplete();
    return null;
  }

  // Check if carousel is already transitioning
  if (window.debugCarousel.isTransitioning) {
    console.warn('[Subtle Animation] Carousel is already transitioning');
    if (onComplete) onComplete();
    return null;
  }

  console.log('[Subtle Animation] Starting close animation');

  // Set transition lock
  window.debugCarousel.isTransitioning = true;

  // Create timeline
  const timeline = gsap.timeline({
    onComplete: () => {
      console.log('[Subtle Animation] Close animation complete');
      // Release lock after animation
      window.debugCarousel.isTransitioning = false;
      if (onComplete) onComplete();
    },
  });

  // Get carousel items if not provided
  const items = carouselItems || window.debugCarousel.carousel?.itemMeshes || [];

  if (items.length === 0) {
    console.warn('[Subtle Animation] No carousel items found');
    window.debugCarousel.isTransitioning = false;
    if (onComplete) onComplete();
    return null;
  }

  // Fade each item back to full opacity
  items.forEach((item) => {
    if (!item || !item.material) return;

    // Restore to full opacity
    timeline.to(
      item.material,
      {
        opacity: 1,
        duration,
        ease,
      },
      0
    );
  });

  return timeline;
}
