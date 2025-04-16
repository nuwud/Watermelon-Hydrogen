// CartDrawer3D.scene.js
import * as THREE from 'three';
import { cartBadgeMesh } from './CartBadge3D';
// Removed: import { createCartHUDIcon } from './CartHUDIcon3D';

export function createCartDrawerOverlay(scene, camera, options = {}) {
  const group = new THREE.Group();
  group.name = 'CartDrawerOverlay';
  group.visible = false; // Initially hidden
  group.userData = {}; // Initialize userData

  // Removed HUD icon creation and addition from here

  // Add badge
  const badge = cartBadgeMesh({ count: options.count || 0 });
  badge.position.set(2, 1.2, 0.1); // Example: Adjust as needed
  group.add(badge);

  // Future: Add animated drawer panels here
  // group.add(createDrawerPanel());

  // Method to control visibility
  group.setOpenState = (isOpen) => {
    group.visible = isOpen;
    // Optional: Add animations here for opening/closing
  };

  // Method to update children (excluding HUD now)
  group.update = () => { // Removed unused deltaTime parameter
    // Removed HUD update call from here
    // Update other elements if needed (e.g., badge animation)
  };

  scene.add(group);
  return group;
}
