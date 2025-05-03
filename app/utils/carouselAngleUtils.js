/**
 * @AI-PROMPT
 *
 * 🧠 ROLE:
 * Utility to generate deterministic rotation angles for evenly spaced items in a ring (submenu).
 *
 * 📐 USAGE:
 * - `getItemAngles(itemCount)` returns an array of angles in radians, beginning at 3 o’clock.
 * - Can handle 1–10 items via predefined layouts.
 * - Supports fallback mode for any count by spacing items evenly.
 *
 * 💡 EXAMPLE:
 *   getItemAngles(4) → [0, π/2, π, 3π/2]
 *   (3 o’clock, 6, 9, 12)
 *
 * ✅ GOAL:
 * Ensure consistent index-to-angle mapping for all circular menu systems.
 *
 * Utility for computing evenly spaced angles for 3D carousel items.
 * Supports 1–10 item configurations with fallback for >10.
 * Use to control item layout in submenus (3 o'clock highlight logic).
 */

// Add this function to Carousel3DSubmenu.js 
/**
 * Calculates the angular positions for items in a circular carousel.
 * 
 * @param {number} itemCount - The number of items to position around the circle.
 * @returns {number[]} An array of angles in radians, representing the position of each item.
 *                    Angles start at 0 (3 o'clock position) and proceed counterclockwise.
 * 
 * @description
 * This function returns optimized angle configurations for 1-10 items.
 * For item counts outside this range, it calculates evenly distributed angles.
 * 
 * @example
 * // Get angles for 4 items
 * const angles = getItemAngles(4);
 * // Returns [0, Math.PI/2, Math.PI, 3*Math.PI/2] (positions at 3, 6, 9, and 12 o'clock)
 * 
 * @example
 * // Get angles for 12 items
 * const angles = getItemAngles(12);
 * // Returns evenly distributed angles with Math.PI/6 increments
 */
export function getItemAngles(itemCount) {
    // Pre-defined angle configurations for different numbers of items (1-10)
    const angleConfigurations = {
      1: [0], // Single item at 3 o'clock
      2: [0, Math.PI], // Two items at 3 and 9 o'clock
      3: [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3], // Evenly spaced 
      4: [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2], // At 3, 6, 9, 12 o'clock
      5: [0, (2 * Math.PI) / 5, (4 * Math.PI) / 5, (6 * Math.PI) / 5, (8 * Math.PI) / 5],
      6: [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3],
      7: [0, Math.PI / 3.5, (2 * Math.PI) / 3.5, (3 * Math.PI) / 3.5, (4 * Math.PI) / 3.5, (5 * Math.PI) / 3.5, (6 * Math.PI) / 3.5],
      8: [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (6 * Math.PI) / 4, (7 * Math.PI) / 4],
      9: [0, Math.PI / 4.5, (2 * Math.PI) / 4.5, (3 * Math.PI) / 4.5, (4 * Math.PI) / 4.5, (5 * Math.PI) / 4.5, (6 * Math.PI) / 4.5, (7 * Math.PI) / 4.5, (8 * Math.PI) / 4.5],
      10: [0, Math.PI / 5, (2 * Math.PI) / 5, (3 * Math.PI) / 5, (4 * Math.PI) / 5, Math.PI, (6 * Math.PI) / 5, (7 * Math.PI) / 5, (8 * Math.PI) / 5, (9 * Math.PI) / 5]
    };
  
    // Return the predefined angles or calculate them for unexpected counts
    if (angleConfigurations[itemCount]) {
      return angleConfigurations[itemCount];
    } else {
      // Fallback for any other item count
      const angles = [];
      const angleStep = (2 * Math.PI) / itemCount;
      for (let i = 0; i < itemCount; i++) {
        angles.push(i * angleStep);
      }
      return angles;
    };
  }
  
  
  