// Add this function to Carousel3DSubmenu.js 
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
    }
  }
  
  
  