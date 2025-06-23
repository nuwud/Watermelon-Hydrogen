import * as THREE from 'three';
import gsap from 'gsap';
import { createCartToggleSphere } from '../../../utils/cart/initCartToggleSphere';
//import { SceneRegistry } from '../../../../src/cart/SceneRegistry';

// Wait for the drawer controller event to be ready
function waitForDrawerControllerEvent() {
  return new Promise((resolve) => {
    // Resolve immediately if already available
    if (window.drawerController) {
        console.warn('[CartSphere] drawerController already available.');
        resolve();
        return;
    }
    // Listen for the event
    console.warn('[CartSphere] Waiting for drawerControllerReady event...');
    window.addEventListener('drawerControllerReady', () => {
        console.warn('[CartSphere] drawerControllerReady event received.');
        resolve();
    }, { once: true });

    // Timeout safeguard
    setTimeout(() => {
        if (!window.drawerController) {
            console.error('[CartSphere] Timeout waiting for drawerControllerReady event.');
            // Optionally resolve anyway or reject, depending on desired behavior
            resolve(); // Resolve anyway to allow cart sphere creation
        }
    }, 5000); // 5 second timeout
  });
}


export async function initCartSphere(scene, camera) {
  console.warn('[CartSphere] Initializing...');
  try {
    await waitForDrawerControllerEvent(); // Wait for the controller to be ready
    // Store reference if available
    if (window.drawerController) {
        scene.userData.drawerController = window.drawerController;
        console.warn('[CartSphere] drawerController attached to scene.userData');
    } else {
        console.warn('[CartSphere] drawerController not found after wait.');
    }
    createCartSphereVisuals(scene, camera); // Create visuals regardless
  } catch (error) {
      console.error('[CartSphere] Error during initialization:', error);
      // Optionally create visuals even on error
      createCartSphereVisuals(scene, camera);
  }
}


function createCartSphereVisuals(scene, camera) {
  let cartSphere;

  // Animate cart sphere with continuous rotation
  function animateCartSphere(sphere) {
    if (!sphere) return;
    // Ensure previous animations are stopped
    gsap.killTweensOf(sphere.rotation);
    gsap.to(sphere.rotation, {
      y: `+=${Math.PI * 2}`, // Relative rotation
      duration: 4,
      repeat: -1,
      ease: "linear",
      overwrite: true // Ensure this tween takes priority
    });
  }

  // Setup raycasting for cart sphere click detection
  function setupClickDetection() {
    const onClick = (event) => {
      // Calculate mouse position
      const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // Check only the cart sphere for intersection
      if (!cartSphere) return; // Guard if sphere doesn't exist

      const hits = raycaster.intersectObject(cartSphere, true); // Check only the sphere

      if (hits.length > 0) {
          const obj = hits[0].object;
          // Check userData on the intersected object or its parent (if structure is nested)
          let target = obj;
          while (target && !target.userData?.isCartToggle) {
              target = target.parent;
          }

          if (target && target.userData?.isCartToggle && target.callback) {
              target.callback();
          }
      }
    };
    window.addEventListener('click', onClick);
    // Store listener for removal
    scene.userData.cartClickListener = onClick;
  }

  try {
    // Create and initialize cart sphere
    cartSphere = createCartToggleSphere(scene); // Assuming this returns the sphere mesh
    if (!cartSphere) {
        console.error('[CartSphere] createCartToggleSphere did not return a valid object.');
        return;
    }
    animateCartSphere(cartSphere);
    setupClickDetection(); // Setup click listener

    // Configure click handler
    cartSphere.callback = () => {
      console.warn('[CartSphere] Clicked. Toggling cart...');
      // Access controller reliably from scene.userData or window
      const drawerController = scene.userData?.drawerController || window.drawerController;

      if (drawerController?.toggleCartDrawer) {
        drawerController.toggleCartDrawer();
      } else {
        console.error('[CartSphere] ❌ drawerController.toggleCartDrawer is undefined or controller not found.');
      }

      // Add visual feedback using GSAP
      gsap.to(cartSphere.scale, {
        x: 1.2, y: 1.2, z: 1.2,
        duration: 0.15,
        yoyo: true,
        repeat: 1,
        ease: "power1.inOut",
        // onComplete removed as yoyo handles return to original scale
      });
    };

    console.warn('[CartSphere] Visuals created and click handler set.');

  } catch (err) {
    console.error('[CartSphere] ❌ Failed to create visuals:', err);
  }

  // No need to return cartSphere if managed internally
}