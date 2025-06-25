import * as THREE from 'three';
import { Carousel3DPro } from '../Carousel3DPro.js';
import { 
  defaultCarouselStyle, 
  darkTheme, 
  cyberpunkTheme, 
  lightTheme 
} from '../CarouselStyleConfig.js';
import gsap from 'gsap';

/**
 * Creates and manages the 3D carousel instance.
 * @param {THREE.Scene} scene - Three.js scene
 * @param {string[]} items - Menu item names
 * @param {Object} submenus - Submenu configuration
 * @param {THREE.Camera} camera - Three.js camera (needed for hover detection)
 * @returns {Carousel3DPro} - The fully initialized Carousel3DPro instance.
 */
export function createCarousel(scene, items, submenus, camera) { // Added camera parameter
  let currentTheme = defaultCarouselStyle;
  const themes = [defaultCarouselStyle, darkTheme, cyberpunkTheme, lightTheme];
  let themeIndex = 0;

  // ✅ 5. Make sure the returned or exported carousel is a full **instance**
  let carousel = new Carousel3DPro(items, {
    ...currentTheme, // Use object shorthand
    submenuItems: submenus // Pass submenus config for internal use (glow rings)
  });

  // Add to scene
  scene.add(carousel);

  // Store camera reference for hover detection
  carousel.userData.camera = camera;

  // Remove enhanceWithAnimationTracking as goToNext/Prev are now in Carousel3DPro
  // enhanceWithAnimationTracking(carousel);

  // Add theme switching capability
  carousel.toggleTheme = () => {
    themeIndex = (themeIndex + 1) % themes.length;
    currentTheme = themes[themeIndex];

    const currentRotationY = carousel.itemGroup?.rotation.y || 0;

    scene.remove(carousel);
    if (carousel.dispose) carousel.dispose();

    // Create new instance with updated theme
    const newCarousel = new Carousel3DPro(items, {
        ...currentTheme, // Use object shorthand
        submenuItems: submenus
    });
    newCarousel.userData = carousel.userData; // Preserve camera ref etc.

    if (newCarousel.itemGroup) {
        newCarousel.itemGroup.rotation.y = currentRotationY;
    }

    scene.add(newCarousel);
    scene.background = new THREE.Color(currentTheme.backgroundColor);

    // Re-apply listeners/setup to the new instance
    // Wait for the new carousel to be ready
    newCarousel.addEventListener('ready', () => {
        console.warn("[CarouselManager] New themed carousel ready.");
        setupGlowRings(newCarousel); // Re-setup glow rings
        setupHoverDetection(newCarousel); // Re-setup hover detection
    });
    // Fallback timeout
    // setTimeout(() => {
    //    if (!newCarousel.font) console.warn("[CarouselManager] Font not loaded for new theme.");
    //    setupGlowRings(newCarousel);
    //    setupHoverDetection(newCarousel);
    // }, 1000);

    // Update the external reference
    carousel = newCarousel;

    console.warn("[CarouselManager] Theme toggled.");
    return currentTheme;
  };

  // Setup initial glow rings and hover detection after font is loaded
  carousel.addEventListener('ready', () => {
      console.warn("[CarouselManager] Carousel ready, setting up rings and hover.");
      setupGlowRings(carousel);
      setupHoverDetection(carousel);
  });
  // Fallback timeout
  // setTimeout(() => {
  //    if (!carousel.font) console.warn("[CarouselManager] Font not loaded, rings/hover might fail.");
  //    setupGlowRings(carousel);
  //    setupHoverDetection(carousel);
  // }, 1000);


  setupKeyboardNavigation(carousel);

  return carousel;
}

// Removed enhanceWithAnimationTracking function

/**
 * Sets up animated glow rings for carousel items that have submenus.
 * @param {Carousel3DPro} carousel - The carousel instance
 */
function setupGlowRings(carousel) {
  if (!carousel?.itemGroup) return;

  carousel.itemGroup.children.forEach(child => {
    // Animate the glow ring mesh itself if it exists
    if (child.userData?.isGlowRing) {
      const mat = child.material;
      // Ensure opacity property exists and material is transparent
      if (mat && mat.uniforms?.uOpacity !== undefined) {
         mat.transparent = true;
         // Set initial opacity low before hover animation potentially sets it higher
         mat.uniforms.uOpacity.value = 0.0; // Start hidden
         // Add pulsing animation (optional, can conflict with hover)
         // gsap.to(mat.uniforms.uOpacity, { value: 0.2, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
      } else if (mat && mat.opacity !== undefined) {
         mat.transparent = true;
         mat.opacity = 0.0; // Start hidden
         // gsap.to(mat, { opacity: 0.2, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
      }
    }
  });
}


/**
 * Sets up keyboard navigation for carousel.
 * @param {Carousel3DPro} carousel - The carousel instance
 */
function setupKeyboardNavigation(carousel) {
  // Ensure methods exist before adding listener
  if (!carousel.goToNext || !carousel.goToPrev) {
      console.warn("[CarouselManager] goToNext/goToPrev methods not found. Keyboard navigation disabled.");
      return;
  }

  const onKeyDown = (e) => {
    // Prevent navigation if a submenu is active or carousel is animating
    if (scene.userData.activeSubmenu || carousel.isAnimating) return;

    if (e.key === 'ArrowRight') carousel.goToNext();
    else if (e.key === 'ArrowLeft') carousel.goToPrev();
  };

  window.addEventListener('keydown', onKeyDown);

  // Store listener for removal on dispose
  carousel.userData.keyboardListener = onKeyDown;
}

/**
 * Sets up hover detection for glow rings using the itemGroup.
 * @param {Carousel3DPro} carousel - The carousel instance
 */
function setupHoverDetection(carousel) {
  const camera = carousel.userData?.camera;
  const itemGroup = carousel.itemGroup;

  if (!camera || !itemGroup) {
    console.warn("[CarouselManager] Camera or itemGroup missing. Hover detection disabled.");
    return;
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // Utility to animate glow ring opacity using GSAP
  const updateGlowRingOpacity = (mesh, opacity) => {
      const ring = mesh?.userData?.glowRing;
      if (!ring) return;

      // Kill existing animations on this ring's opacity to prevent conflicts
      gsap.killTweensOf(ring.material?.uniforms?.uOpacity || ring.material);

      if (ring.material?.uniforms?.uOpacity !== undefined) {
          // Shader material
          gsap.to(ring.material.uniforms.uOpacity, { value: opacity, duration: 0.2, ease: 'power1.out' });
      } else if (ring.material?.opacity !== undefined) {
          // Basic material
          ring.material.transparent = true; // Ensure transparency
          gsap.to(ring.material, { opacity: opacity, duration: 0.2, ease: 'power1.out' });
      }
  };

  let currentlyHoveredMesh = null; // Track the mesh currently being hovered

  // Handle pointermove events
  const onPointerMove = (e) => {
    // Don't detect hover if a submenu is active or transitioning
    if (scene.userData.activeSubmenu || submenuTransitioning) {
        // Ensure all rings are hidden if submenu becomes active while hovering
        if (currentlyHoveredMesh) {
            updateGlowRingOpacity(currentlyHoveredMesh, 0.0);
            currentlyHoveredMesh = null;
        }
        return;
    }

    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(itemGroup.children, true); // Recursive

    let newlyHoveredMesh = null;
    if (intersects.length > 0) {
        let hitObject = intersects[0].object;
        while (hitObject && hitObject.parent !== itemGroup) {
            hitObject = hitObject.parent;
        }
        // Check if it's an item mesh and has a submenu (and thus a glow ring)
        if (hitObject && hitObject.userData?.index !== undefined && hitObject.userData.hasSubmenu) {
            newlyHoveredMesh = hitObject;
        }
    }

    // If hover changed
    if (newlyHoveredMesh !== currentlyHoveredMesh) {
        // Hide the old one
        if (currentlyHoveredMesh) {
            updateGlowRingOpacity(currentlyHoveredMesh, 0.0);
        }
        // Show the new one
        if (newlyHoveredMesh) {
            updateGlowRingOpacity(newlyHoveredMesh, 1.0); // Show ring
        }
        // Update tracked mesh
        currentlyHoveredMesh = newlyHoveredMesh;
    }
  };

  // Handle pointer leaving window
  const onPointerLeave = () => {
    if (currentlyHoveredMesh) {
      updateGlowRingOpacity(currentlyHoveredMesh, 0.0); // Hide ring
      currentlyHoveredMesh = null;
    }
  };

  // Add listeners
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerleave', onPointerLeave);

  // Store listeners for removal on dispose
  carousel.userData.hoverListeners = { onPointerMove, onPointerLeave };
}