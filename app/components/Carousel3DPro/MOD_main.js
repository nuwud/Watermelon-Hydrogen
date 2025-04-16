import * as THREE from 'three';
import gsap from 'gsap'; // Keep GSAP if used by submenu or other animations managed here
import { initScene } from './modules/initialization';
import { setupControls } from './modules/controls';
import { createCarousel } from './modules/carouselManager';
import { Carousel3DSubmenu } from './Carousel3DSubmenu.js';
import { initCartSphere } from './modules/cartIntegration';
import { SceneRegistry } from '../../../src/cart/SceneRegistry';

/**
 * Sets up a 3D carousel instance and mounts it to the provided container
 * @param {HTMLElement} container - DOM element to mount the canvas to
 * @returns {Object} - carousel controls and diagnostics
 */
export function setupCarousel(container) {
  if (typeof window === 'undefined') return null;

  // Settings object using shorthand
  const settings = {
    autoSpin: false,
    spinSpeed: 0.1,
  };

  // Scope variables
  let scene, camera, renderer, carousel, controls, raycaster, mouse, clock;
  let enableWheel, disableWheel; // From setupControls
  let animationFrameId = null;
  let activeSubmenu = null;
  let submenuTransitioning = false;

  // Core initialization
  ({ scene, camera, renderer } = initScene(container));
  SceneRegistry.set(scene);
  // Store camera on scene userData for potential use by modules
  scene.userData.camera = camera;

  // Setup input controls
  ({ controls, enableWheel, disableWheel } = setupControls(camera, renderer));

  // Create carousel
  const items = ['Home', 'Products', 'Contact', 'About', 'Gallery'];
  const submenus = {
    Home: ['Dashboard', 'Activity', 'Settings', 'Profile'],
    Products: ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Toys', 'Sports'],
    Services: ['Consulting', 'Training', 'Support', 'Installation', 'Maintenance'],
    About: ['Company', 'Team', 'History', 'Mission', 'Values'],
    Contact: ['Email', 'Phone', 'Chat', 'Social Media', 'Office Locations'],
    Gallery: ['Photos', 'Videos', '3D Models', 'Artwork', 'Animations', 'Virtual Tours'],
  };

  // Pass camera to createCarousel for hover detection within carouselManager
  carousel = createCarousel(scene, items, submenus, camera);

  // Initialize cart sphere (now async)
  initCartSphere(scene, camera) // Pass camera if needed by cartIntegration
    .then(() => {
      console.warn('[WatermelonMenu] Cart sphere initialization complete.');
    })
    .catch((err) => {
      console.error('[WatermelonMenu] Cart sphere initialization failed:', err);
    });

  // Interaction tools
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  clock = new THREE.Clock();

  // --- Submenu Logic ---

  function closeSubmenu(immediate = false) {
    if (!activeSubmenu || submenuTransitioning) return;
    submenuTransitioning = true;
    console.warn('[WatermelonMenu] Closing submenu...');

    const remove = () => {
      if (activeSubmenu && scene) {
        // Dispose submenu resources before removing
        if (typeof activeSubmenu.dispose === 'function') {
            activeSubmenu.dispose();
        } else {
            // Basic cleanup if no dispose method
            scene.remove(activeSubmenu);
        }
      }
      activeSubmenu = null;
      scene.userData.activeSubmenu = null;
      submenuTransitioning = false;
      enableWheel(); // ✅ Use enableWheel
      console.warn('[WatermelonMenu] Submenu disposed');
      controls.enabled = true; // Re-enable OrbitControls interaction
    };

    if (immediate || !activeSubmenu.hide) {
      remove();
    } else {
      // Assuming hide handles animation and calls remove or similar cleanup
      activeSubmenu.hide();
      // Use a timeout based on the hide animation duration
      setTimeout(remove, 300); // Adjust timeout to match hide animation
    }
  }

  function spawnSubmenu(index, item) {
    // Use getMeshByIndex for robustness
    const mesh = carousel.getMeshByIndex(index);
    if (!mesh || !submenus[item] || submenuTransitioning) {
      submenuTransitioning = false;
      return;
    }

    submenuTransitioning = true;
    disableWheel(); // ✅ Use disableWheel
    controls.enabled = false; // Disable OrbitControls interaction

    // Close existing submenu immediately before opening new one
    if (activeSubmenu) {
      closeSubmenu(true);
    }

    console.warn('[WatermelonMenu] Submenu opened for:', item);
    // Pass relevant config to submenu if needed
    activeSubmenu = new Carousel3DSubmenu(mesh, submenus[item], carousel.config);
    scene.add(activeSubmenu);
    scene.userData.activeSubmenu = activeSubmenu;

    // Show the submenu (assuming show handles animation)
    if (typeof activeSubmenu.show === 'function') {
        // Use a small delay before starting show animation
        setTimeout(() => {
            activeSubmenu.show();
            // Allow interaction shortly after show starts/finishes
            setTimeout(() => { submenuTransitioning = false; }, 150); // Adjust based on show animation
        }, 100);
    } else {
        submenuTransitioning = false; // Allow interaction immediately
    }
  }


  // Event Listener for Clicks
  const onWindowClick = (event) => {
    // Ignore clicks during transitions or if carousel isn't ready
    if (submenuTransitioning || !carousel?.itemGroup) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // 1. Check Submenu Interaction First
    if (activeSubmenu?.visible) {
        const submenuIntersects = raycaster.intersectObject(activeSubmenu, true);
        if (submenuIntersects.length > 0) {
            let clickedObj = submenuIntersects[0].object;
            let containerGroup = clickedObj;
            let isCloseBtnClick = false;

            // Check for close button
            let tempObj = clickedObj;
            while(tempObj && tempObj !== activeSubmenu) { // Stop search at submenu root
                if (tempObj.userData?.isCloseButton) {
                    isCloseBtnClick = true;
                    break;
                }
                tempObj = tempObj.parent;
            }

            if (isCloseBtnClick) {
                closeSubmenu();
                return; // Handled close button click
            }

            // Find the item container
            while (containerGroup && !containerGroup.userData?.isSubmenuItemContainer) {
                containerGroup = containerGroup.parent;
            }

            if (containerGroup) {
                console.warn("[WatermelonMenu] Clicked submenu item:", containerGroup.userData.item);
                if (typeof activeSubmenu.selectItem === 'function') {
                    // Select item and trigger preview
                    activeSubmenu.selectItem(containerGroup.userData.index, true, true);
                }
                // Execute custom onClick if defined
                if (containerGroup.userData.onClick) {
                    containerGroup.userData.onClick();
                }
            }
            return; // Handled submenu click
        }
        // Click was outside the active submenu - close it
        // else { // This might be too aggressive depending on UX requirements
        //     closeSubmenu();
        //     return;
        // }
    }

    // 2. Check Main Carousel Item Clicks
    const intersectTargets = carousel.itemGroup.children; // Direct access is fine
    const intersects = raycaster.intersectObjects(intersectTargets, true);

    if (intersects.length > 0) {
      let clickedItemMesh = intersects[0].object;
      // Traverse up to find the main item mesh or glow ring parent
      while (clickedItemMesh && clickedItemMesh.parent !== carousel.itemGroup) {
          clickedItemMesh = clickedItemMesh.parent;
      }
      // If clicked a glow ring, get the associated item mesh
      if (clickedItemMesh?.userData?.isGlowRing) {
          // Find the mesh this ring belongs to (requires linking userData or structure)
          // Assuming glowRing's parent is the itemGroup and we need to find the mesh
          // This part depends heavily on how rings are associated. Let's assume direct parent is itemGroup for now.
          // A better approach is linking: mesh.userData.glowRing = ring; ring.userData.parentMesh = mesh;
          // For now, we'll assume clicking the ring means clicking the item.
          // Find the mesh with this ring:
          const parentMesh = carousel.itemMeshes.find(m => m.userData.glowRing === clickedItemMesh);
          if (parentMesh) clickedItemMesh = parentMesh;
          else return; // Clicked an unassociated ring? Ignore.
      }


      if (clickedItemMesh?.userData?.index !== undefined) {
          const itemIndex = clickedItemMesh.userData.index; // Use the variable
          const itemName = items[itemIndex];
          console.warn('[WatermelonMenu] Main carousel item clicked:', itemName);

          if (submenus[itemName]) {
              spawnSubmenu(itemIndex, itemName);
          } else {
              console.warn(`[WatermelonMenu] Item ${itemName} has no submenu.`);
              if (activeSubmenu) closeSubmenu(); // Close submenu if clicking item without one
          }
          // Visually select the item in the main carousel
          if (typeof carousel.selectItem === 'function') {
              carousel.selectItem(itemIndex, true);
          }
      }
    } else if (activeSubmenu) {
        // Click was outside main items AND outside active submenu bounds
        closeSubmenu();
    }
  };
  window.addEventListener('click', onWindowClick);

  // --- Hover Logic (Removed) ---
  // Hover logic is now handled within carouselManager.js/setupHoverDetection
  // const onPointerMove = (event) => { ... };
  // window.addEventListener('pointermove', onPointerMove);


  console.warn('[WatermelonMenu] Carousel Scene Initialized');

  // Animation loop
  function animate() {
    animationFrameId = requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // Conditional Auto-Spin
    if (settings.autoSpin && !activeSubmenu && !submenuTransitioning && !carousel.isAnimating) {
        if (typeof carousel.spin === 'function') {
            carousel.spin(deltaTime * settings.spinSpeed);
        }
    }

    // Update carousel (handles its own item animations/facing)
    if (carousel?.update) carousel.update(deltaTime);

    // Update active submenu
    if (activeSubmenu?.update) activeSubmenu.update(deltaTime);

    // Update controls
    if (controls?.update) controls.update();

    // Render
    renderer.render(scene, camera);
  }
  animate();

  // Dispose function
  const dispose = () => {
    console.warn('[WatermelonMenu] Disposing Carousel Scene');
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    // Remove event listeners added in this scope
    window.removeEventListener('click', onWindowClick);
    // Remove hover listeners if they were added here (they are now in carouselManager)
    // window.removeEventListener('pointermove', onPointerMove);

    // Remove listeners potentially added by modules (important!)
    if (carousel?.userData?.hoverListeners) {
        window.removeEventListener('pointermove', carousel.userData.hoverListeners.onPointerMove);
        window.removeEventListener('pointerleave', carousel.userData.hoverListeners.onPointerLeave);
    }
    if (carousel?.userData?.keyboardListener) {
        window.removeEventListener('keydown', carousel.userData.keyboardListener);
    }
    if (scene?.userData?.cartClickListener) {
        window.removeEventListener('click', scene.userData.cartClickListener);
    }
    // Remove wheel listener added by controls.js if necessary (controls.dispose should handle it)


    // Close and dispose submenu
    if (activeSubmenu) {
        closeSubmenu(true);
    }

    // Dispose Three.js resources
    if (carousel && typeof carousel.dispose === 'function') {
        carousel.dispose(); // Dispose carousel first (removes items from scene)
    }
    carousel = null;

    if (controls && typeof controls.dispose === 'function') {
      controls.dispose(); // Should remove its own listeners
    }
    controls = null;

    // Dispose remaining scene contents (lights, cart sphere etc.)
    if (scene) {
        while(scene.children.length > 0){
            const object = scene.children[0];
            scene.remove(object); // Remove from scene first

            if (object !== carousel && typeof object.dispose === 'function') {
                 object.dispose(); // Call dispose if available (e.g., for submenus missed)
            }
            // Manual disposal for geometry/material as fallback
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else if (object.material.dispose) {
                    object.material.dispose();
                }
            }
            // Dispose textures etc. if needed
        }
    }


    if (renderer) {
      renderer.dispose();
      if (renderer.domElement?.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    }
    renderer = null;
    scene = null;
    camera = null;
    raycaster = null;
    mouse = null;
    clock = null;
    activeSubmenu = null;
    SceneRegistry.clear(); // Clear scene registry if applicable

    console.warn('[WatermelonMenu] Carousel Scene Disposed');
  };

  // Return public API
  return {
    carousel, // Expose carousel instance
    scene,
    camera,
    renderer,
    // Use methods directly from carousel instance
    nextItem: () => carousel?.goToNext(),
    prevItem: () => carousel?.goToPrev(),
    toggleTheme: () => carousel?.toggleTheme(), // Expose theme toggle if needed
    closeSubmenu, // Expose closeSubmenu function
    dispose,
  };
}