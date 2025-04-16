// app/components/Carousel3DPro/main.js

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Carousel3DPro } from './Carousel3DPro.js';
import { Carousel3DSubmenu } from './Carousel3DSubmenu.js';
import {
    defaultCarouselStyle,
    darkTheme,
    cyberpunkTheme,
    lightTheme,
} from './CarouselStyleConfig.js';
import gsap from 'gsap';
import { createCartToggleSphere } from '../../../src/cart/initCartToggleSphere.js';
import { SceneRegistry } from '../../../src/cart/SceneRegistry.js'; 

/**
 * Sets up a 3D carousel instance and mounts it to the provided container
 * @param {HTMLElement} container - DOM element to mount the canvas to
 * @returns {Object} - carousel controls and diagnostics
 */
export function setupCarousel(container) {
    if (typeof window === 'undefined') return null;

    const scene = new THREE.Scene();
    SceneRegistry.set(scene);
    let currentTheme = defaultCarouselStyle;
    scene.background = new THREE.Color(currentTheme.backgroundColor);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Setup OrbitControls with correct zoom handling
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 20;
    controls.minDistance = 5;

    // FIX 1: Correct setup for middle mouse zoom only
    controls.enableZoom = true; // Keep enabled, but we'll control when it's used
    controls.zoomSpeed = 1.0;

    // Keep rotation and pan controls
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY, // Keep MIDDLE button as dolly/zoom
        RIGHT: THREE.MOUSE.PAN,
    };

    // Disable pinch-to-zoom on touch
    controls.touches.TWO = null;

    // Tracking wheel handler state - MUST initially be true
    let isWheelHandlerActive = true;


    // Create the wheel event handler as a named function
    const wheelEventHandler = function(event) {
        // Check middle mouse button first - this is the zoom case
        if (event.buttons === 4) {
            // Let OrbitControls handle zooming - do not stop propagation
            return;
        }

        // For all other cases, prevent default and stop propagation
        event.preventDefault();
        event.stopPropagation();

        // Navigate menus based on wheel direction
        const delta = event.deltaY;

        if (activeSubmenu) {
            // Scroll submenu when it's active
            activeSubmenu.scrollSubmenu(delta > 0 ? 1 : -1);
        } else if (isWheelHandlerActive) {
            // Navigate main carousel when no submenu
            const angleStep = (2 * Math.PI) / items.length;
            carousel.spin(delta > 0 ? -angleStep : angleStep);
        }
    };

    // Attach wheel handler with capture phase
    window.addEventListener('wheel', wheelEventHandler, { passive: false, capture: true });

    // FIX 3: Override OrbitControls wheel handler to only work with middle mouse
    const originalOnWheel = controls.onMouseWheel;
    controls.onMouseWheel = function(event) {
        if (event.buttons !== 4) {
            // Block all wheel events that don't have middle mouse pressed
            return;
        }
        // Only call original handler for middle mouse + wheel
        originalOnWheel.call(this, event);
    };

    // MOBILE SUPPORT: Add touch event handlers for swipe navigation
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchTime = 0;
    let touchVelocity = 0;

    // Handle touch start
    const touchStartHandler = (event) => {
        if (event.touches.length === 1) {
            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
            lastTouchTime = Date.now();
            touchVelocity = 0;

            // Prevent default to avoid unintended scrolling
            event.preventDefault();
        }
    };

    // Handle touch move for swipe detection
    const touchMoveHandler = (event) => {
        if (event.touches.length !== 1) return;

        // Prevent default browser behavior (page scrolling)
        event.preventDefault();

        const touchX = event.touches[0].clientX;
        const touchY = event.touches[0].clientY;

        // Calculate swipe distance and direction
        const deltaX = touchX - touchStartX;
        const deltaY = touchY - touchStartY;

        // Calculate velocity for smooth navigation
        const now = Date.now();
        const timeDelta = now - lastTouchTime;
        if (timeDelta > 0) {
            touchVelocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / timeDelta;
        }

        // Use the dominant axis (horizontal or vertical)
        const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

        // Apply threshold to avoid accidental swipes
        const swipeThreshold = 5;

        if (activeSubmenu) {
            // For submenu, use vertical swipe
            if (!isHorizontalSwipe && Math.abs(deltaY) > swipeThreshold) {
                activeSubmenu.scrollSubmenu(deltaY > 0 ? -1 : 1); // Invert for natural feel
                touchStartY = touchY; // Reset for continuous scrolling
            }
        } else {
            // For main carousel, use horizontal swipe
            if (isHorizontalSwipe && Math.abs(deltaX) > swipeThreshold) {
                const angleStep = (2 * Math.PI) / items.length;
                carousel.spin(deltaX > 0 ? angleStep : -angleStep); // Direction feels natural
                touchStartX = touchX; // Reset for continuous rotation
            }
        }

        lastTouchTime = now;
    };

    // Handle touch end with momentum effect
    const touchEndHandler = (event) => {
        // Apply momentum based on final velocity
        if (touchVelocity > 0.5) {
            if (activeSubmenu) {
                const direction = touchStartY < event.changedTouches[0].clientY ? -1 : 1;
                // Apply momentum scrolling to submenu
                activeSubmenu.scrollSubmenu(direction);
            } else {
                const direction = touchStartX < event.changedTouches[0].clientX ? 1 : -1;
                // Apply momentum to carousel
                const angleStep = (2 * Math.PI) / items.length;
                carousel.spin(direction * angleStep);
            }
        }
    };

    // Function to enable all event handlers (touch and wheel)
    function enableAllEventHandlers() {
        enableTouchEvents();
        enableWheelHandler();
    }

    // Function to disable all event handlers when a submenu is active
    function disableMainCarouselHandlers() {
        // Do not actually remove the touch handlers - keep them active
        // but they will check for activeSubmenu internally
        
        // Set the wheel handler flag to false to disable it for main carousel
        isWheelHandlerActive = false;
    }
    
    // Function to enable touch events
    function enableTouchEvents() {
        // Reset touch variables
        touchStartX = 0;
        touchStartY = 0;
        lastTouchTime = 0;
        touchVelocity = 0;

        // Re-attach touch event listeners
        window.removeEventListener('touchstart', touchStartHandler, { passive: false });
        window.removeEventListener('touchmove', touchMoveHandler, { passive: false });
        window.removeEventListener('touchend', touchEndHandler, { passive: false });
        
        window.addEventListener('touchstart', touchStartHandler, { passive: false });
        window.addEventListener('touchmove', touchMoveHandler, { passive: false });
        window.addEventListener('touchend', touchEndHandler, { passive: false });
    }
    
    // Function to enable wheel handler
    function enableWheelHandler() {
        // Set the wheel handler active flag
        isWheelHandlerActive = true;
    }
    
    // Initial setup: attach event listeners
    enableAllEventHandlers();

    const items = ['Home', 'Products', 'Contact', 'About', 'Gallery'];
    const submenus = {
        Home: ['Dashboard', 'Activity', 'Settings', 'Profile'],
        Products: ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Toys', 'Sports'],
        Services: ['Consulting', 'Training', 'Support', 'Installation', 'Maintenance'],
        About: ['Company', 'Team', 'History', 'Mission', 'Values'],
        Contact: ['Email', 'Phone', 'Chat', 'Social Media', 'Office Locations'],
        Gallery: ['Photos', 'Videos', '3D Models', 'Artwork', 'Animations', 'Virtual Tours'],
    };

    let activeSubmenu = null;
    let submenuTransitioning = false;

    const carousel = new Carousel3DPro(items, {
        ...currentTheme,
        submenuItems: submenus
    });
    carousel.userData = { camera };
    carousel.isAnimating = false; // Track animation state

    // Wrap the original methods to track animation state
    const originalGoToNext = carousel.goToNext;
    carousel.goToNext = function() {
        if (carousel.isAnimating) return;
        carousel.isAnimating = true;

        try {
            originalGoToNext.call(carousel);
            // Reset animation flag after animation should be complete
            setTimeout(() => {
                carousel.isAnimating = false;
            }, 500);
        } catch (error) {
            console.error('Error in goToNext:', error);
            carousel.isAnimating = false;
        }
    };

    const originalGoToPrev = carousel.goToPrev;
    carousel.goToPrev = function() {
        if (carousel.isAnimating) return;
        carousel.isAnimating = true;

        try {
            originalGoToPrev.call(carousel);
            // Reset animation flag after animation should be complete
            setTimeout(() => {
                carousel.isAnimating = false;
            }, 500);
        } catch (error) {
            console.error('Error in goToPrev:', error);
            carousel.isAnimating = false;
        }
    };

    carousel.onItemClick = (index, item) => {
        if (submenus[item] && !submenuTransitioning) {
            submenuTransitioning = true;
            
            // When opening a submenu, disable wheel handler for main carousel
            disableMainCarouselHandlers();
            
            if (activeSubmenu) {
                activeSubmenu.hide();
                setTimeout(() => {
                    scene.remove(activeSubmenu);
                    activeSubmenu = null;
                    spawnSubmenu(index, item);
                }, 300);
            } else {
                spawnSubmenu(index, item);
            }
        }
    };

    function spawnSubmenu(index, item) {
        const mesh = carousel.itemMeshes[index];
        if (!mesh) {
            submenuTransitioning = false;
            // Re-enable main carousel events if submenu fails to open
            enableAllEventHandlers();
            return;
        }

        activeSubmenu = new Carousel3DSubmenu(mesh, submenus[item], currentTheme);
        scene.add(activeSubmenu);
        scene.userData.activeSubmenu = activeSubmenu;

        setTimeout(() => {
            activeSubmenu.show();
            submenuTransitioning = false;
        }, 100);
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);

    scene.add(carousel, ambientLight, directionalLight);
    animateGlowRings();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        carousel.resize?.(window.innerWidth, window.innerHeight);
    });

    function closeSubmenu(immediate = false) {
      if (!activeSubmenu || submenuTransitioning) return;
      submenuTransitioning = true;
  
      if (activeSubmenu.floatingPreview) {
          activeSubmenu.stopFloatingPreviewSpin();
          gsap.to(activeSubmenu.floatingPreview.scale, {
              x: 0,
              y: 0,
              z: 0,
              duration: 0.2,
              ease: 'back.in',
          });
      }
  
      if (activeSubmenu.closeButton) {
          activeSubmenu.closeButton.material.color.set(0xff0000);
      }
  
      if (activeSubmenu.parentItem?.material) {
          gsap.to(activeSubmenu.parentItem.material, {
              opacity: 1.0,
              duration: 0.5,
          });
      }
  
      const remove = () => {
          scene.remove(activeSubmenu);
          scene.userData.activeSubmenu = null;
          if (carousel && carousel.parent && carousel.parent.userData) {
              carousel.parent.userData.activeSubmenu = null;
          }
          
          // IMPORTANT: Clear this BEFORE enabling handlers
          activeSubmenu = null;
          
          // Re-enable main carousel handlers
          enableTouchEvents();
          enableWheelHandler();
          
          // Reset any active animations
          if (carousel) {
              carousel.isAnimating = false;
          }
          
          // Finally clear transitioning flag
          submenuTransitioning = false;
          
          // Optional: Force a wheel event to test functionality
          console.warn('Submenu closed, wheel handler reactivated:', isWheelHandlerActive);
      };
  
      if (immediate) {
          remove();
      } else {
          activeSubmenu.hide();
          setTimeout(remove, 300);
      }
  
      controls.enabled = true;
  }

    function handleCarouselClick(event) {
        if (submenuTransitioning) return;

        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        if (activeSubmenu) {
            const hits = raycaster.intersectObject(activeSubmenu, true);
            if (hits.length > 0) {
                const obj = hits[0].object;
                if (obj.userData?.isSubmenuItem) {
                    activeSubmenu.selectItem(obj.userData.index, true, true);
                }
                if (obj.userData?.isCloseButton || obj.parent?.userData?.isCloseButton) {
                    closeSubmenu();
                }
                return;
            }
        }

        const itemsHit = raycaster.intersectObjects(carousel.itemGroup.children, true);
        for (const hit of itemsHit) {
            let current = hit.object;
            while (current && current.parent !== carousel.itemGroup) current = current.parent;
            if (current && current.userData.index !== undefined) {
                const i = current.userData.index;
                carousel.onItemClick?.(i, items[i]);
                carousel.selectItem(i, true);
                break;
            }
        }
    }

    window.addEventListener('click', handleCarouselClick);

    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') carousel.goToNext();
        else if (e.key === 'ArrowLeft') carousel.goToPrev();
    });

    const themes = [defaultCarouselStyle, darkTheme, cyberpunkTheme, lightTheme];
    let themeIndex = 0;

    const toggleTheme = () => {
        themeIndex = (themeIndex + 1) % themes.length;
        currentTheme = themes[themeIndex];

        closeSubmenu(true);

        scene.background = new THREE.Color(currentTheme.backgroundColor);
        scene.remove(carousel);

        const newCarousel = new Carousel3DPro(items, currentTheme);
        newCarousel.userData = { camera };
        newCarousel.onItemClick = carousel.onItemClick;

        scene.add(newCarousel);
        if (carousel.dispose) carousel.dispose();
        Object.assign(carousel, newCarousel);
    };

    function animateGlowRings() {
        if (!carousel?.itemGroup) return;
      
        carousel.itemGroup.children.forEach(child => {
          if (child.userData?.isGlowRing) {
            const mat = child.material;
            gsap.to(mat, {
              opacity: 0.2,
              duration: 0.8,
              yoyo: true,
              repeat: -1,
              ease: "sine.inOut"
            });
          }
        });

        carousel.itemMeshes.forEach(mesh => {
            const ring = mesh.userData.glowRing;
            if (ring?.material?.uniforms) {
              ring.material.uniforms.uTime.value = performance.now() / 1000;
            }
          });

        Object.values(carousel.itemMeshes).forEach(mesh => {
            const ring = mesh.userData.glowRing;
            if (ring?.material?.uniforms) {
                ring.material.uniforms.uTime.value = performance.now() / 1000;
            }
        });
    }

    //function setupScene(scene) {
        // ... other 3D setup ...
    //    createCartToggleSphere(scene); // adds clickable spinning cart
    //  }

    // Call the setup function to add the cart toggle sphere
    //setupScene(scene);

    let cartSphere;
    let cartToggleHandler = null;

    // Function to wait for the drawerController to be available
    async function waitForDrawerController(attempt = 0) {
        const scene = SceneRegistry.get();
        const drawerController = scene?.drawerController;
      
        if (drawerController?.toggleCartDrawer) {
          console.warn('[CartSphere] ✅ drawerController found.');
          cartToggleHandler = drawerController.toggleCartDrawer;
          return;
        }
      
        if (attempt > 20) {
          console.warn('[CartSphere] ❌ Failed to hook into drawerController after 20 attempts.');
          return;
        }
      
        if (attempt % 5 === 0) { // Log every 5 attempts to reduce noise
          console.warn(`[CartSphere] Waiting for drawerController... (${attempt}/20)`);
        }
      
        setTimeout(() => waitForDrawerController(attempt + 1), 250);
      }
    
    // Function to animate the cart sphere with continuous rotation
    function animateCartSphere(sphere) {
      if (!sphere) return;
      
      gsap.to(sphere.rotation, {
        y: Math.PI * 2, 
        duration: 4,
        repeat: -1,
        ease: "linear",
        overwrite: true
      });
    }

    try {
      // Create the cart sphere and add spinning animation
      cartSphere = createCartToggleSphere(scene);
      animateCartSphere(cartSphere);
    
      // Assign the callback for toggling the cart drawer
      cartSphere.callback = () => {
        console.warn('[CartSphere] Toggling cart...');
        cartToggleHandler?.();
      
        // Add visual feedback: scale up the sphere briefly
        gsap.to(cartSphere.scale, {
          x: 1.2,
          y: 1.2,
          z: 1.2,
          duration: 0.15,
          yoyo: true,
          repeat: 1, // Scale back to original size
          ease: "power1.inOut",
          material: cartSphere.material,
          onComplete: () => {
            cartSphere.scale.set(1, 1, 1); // Reset scale
          },
            onCompleteParams: [cartSphere],
            onCompleteScope: cartSphere,

        });
      };
    
      // Start waiting for the drawerController to be available
      waitForDrawerController();
    } catch (err) {
      console.error('❌ Cart Sphere Init Failed:', err);
    }
    
    // ☑️ Raycasting for cart toggle clicks
    window.addEventListener('click', (event) => {
      const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );
    
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
    
      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        const obj = hit.object;
        if (obj.userData?.isCartToggle && obj.callback) {
          obj.callback(); // triggers drawer toggle
          break;
        }
      }
    });

    SceneRegistry.onSceneReady((scene) => {
        if (scene.drawerController?.toggleCartDrawer) {
          cartToggleHandler = scene.drawerController.toggleCartDrawer;
          console.warn('[CartSphere] ✅ Hooked in immediately from event listener!');
        } else {
          console.warn('[CartSphere] ❌ drawerController not found in scene.userData');
        }
      });

    const animate = () => {
        requestAnimationFrame(animate);
        carousel.update();
        activeSubmenu?.update?.();
        controls.update();
        renderer.render(scene, camera);

        carousel.itemMeshes.forEach(mesh => {
            const ring = mesh.userData.glowRing;
            if (ring?.material?.uniforms) {
                ring.material.uniforms.uTime.value = performance.now() / 1000; // Update time
            }
        });
    };
    
    animate();

    // 🔁 Hover detection for submenu glow rings
    window.addEventListener('pointermove', (e) => {
      const pointer = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
    
      const intersects = raycaster.intersectObjects(carousel.itemGroup.children, true);
    
      // Hide all glow rings
      carousel.itemMeshes.forEach(mesh => {
        const ring = mesh.userData.glowRing;
        if (ring?.material?.uniforms?.uOpacity !== undefined) {
          ring.material.uniforms.uOpacity.value = 0.0;
        }
      });
    
      // Traverse hits to find the parent mesh with a glow ring
      for (const hit of intersects) {
        let mesh = hit.object;
    
        // Climb the tree to find the top-level mesh attached to the carousel group
        while (mesh && mesh.parent !== carousel.itemGroup) {
          mesh = mesh.parent;
        }
    
        // If the mesh has a glow ring, show it and stop
        if (mesh?.userData?.hasSubmenu && mesh.userData.glowRing) {
          const ring = mesh.userData.glowRing;
          if (ring.material?.uniforms?.uOpacity !== undefined) {
            ring.material.uniforms.uOpacity.value = 1.0;
            break;
          }
        }
      }
    });
    
    // 🧹 Hide all glow rings when mouse leaves window
    window.addEventListener('pointerleave', () => {
      carousel.itemMeshes.forEach(mesh => {
        const ring = mesh.userData.glowRing;
        if (ring?.material?.uniforms?.uOpacity !== undefined) {
          ring.material.uniforms.uOpacity.value = 0.0;
        }
      });
    });
    
    // Remove the problematic shaders and use a standard material instead
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7
    });

    // Update the glowMesh with animation capabilities
    const glowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        glowMaterial
    );
    scene.add(glowMesh);

    // Add a simple pulse animation
    const pulseGlow = () => {
        gsap.to(glowMaterial, {
            opacity: 0.2,
            duration: 1.0,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
            onUpdate: () => {
                glowMaterial.needsUpdate = true;
            }
        });
    };
    pulseGlow();

    // 🎮 Return controls for external access
    return {
      carousel,
      scene,
      camera,
      renderer,
      nextItem: () => carousel.goToNext(),
      prevItem: () => carousel.goToPrev(),
      toggleTheme,
      closeSubmenu,
    };
}