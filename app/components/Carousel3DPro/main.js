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

/**
 * Sets up a 3D carousel instance and mounts it to the provided container
 * @param {HTMLElement} container - DOM element to mount the canvas to
 * @returns {Object} - carousel controls and diagnostics
 */
export function setupCarousel(container) {
  const scene = new THREE.Scene();
  let currentTheme = defaultCarouselStyle;
  scene.background = new THREE.Color(currentTheme.backgroundColor);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2, 10);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxDistance = 20;
  controls.minDistance = 5;

  // IMPORTANT: Allow zooming but only via middle-mouse drag, not wheel
  controls.enableZoom = true;  // Enable zoom functionality in general
  controls.zoomSpeed = 1.0;    // Normal zoom speed

  // Configure which mouse buttons do what
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,  // Middle mouse button (press) handles zoom
    RIGHT: THREE.MOUSE.PAN      // Right mouse handles pan
  };

  // Prevent wheel from triggering any OrbitControls actions
  // Remove wheel event listeners and replace with our own
  if (controls.mouseButtons) {
    controls.mouseButtons.WHEEL = null;
  }

  // Additional safety: Completely remove the wheel listener from OrbitControls
  renderer.domElement.removeEventListener('wheel', controls.onMouseWheel);
  window.removeEventListener('wheel', controls.onMouseWheel);

  // Capture all wheel events and handle them ourselves
  const handleWheel = (event) => {
    // Force prevent default behavior to stop browser zoom and scrolling
    event.preventDefault();
    event.stopPropagation();

    const delta = Math.sign(event.deltaY);
    
    // Priority 1: If submenu is active, scroll it
    if (activeSubmenu && typeof activeSubmenu.scrollSubmenu === 'function') {
      activeSubmenu.scrollSubmenu(delta);
    } 
    // Priority 2: Otherwise, rotate main carousel with continuous spinning
    else {
      // Calculate a smooth rotation amount based on delta
      // Use smaller values for smoother rotation
      const spinAmount = delta * 0.1;
      
      // Use the spin method for continuous rotation instead of snap-to-next
      carousel.spin(spinAmount);
      
      // Update the current item highlight as we spin
      carousel.updateCurrentItemFromRotation();
    }
  };

  // Add our wheel handler with passive: false for preventDefault to work
  window.addEventListener('wheel', handleWheel, { passive: false, capture: true });

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

  const carousel = new Carousel3DPro(items, currentTheme);
  carousel.userData = { camera };

  carousel.onItemClick = (index, item) => {
    if (submenus[item] && !submenuTransitioning) {
      submenuTransitioning = true;
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

  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    carousel.resize?.(window.innerWidth, window.innerHeight);
  };

  window.addEventListener('resize', handleResize);

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
      activeSubmenu = null;
      submenuTransitioning = false;

      // Re-enable carousel spinning after submenu is closed
      window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
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

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight') carousel.goToNext();
    else if (e.key === 'ArrowLeft') carousel.goToPrev();
  };

  window.addEventListener('keydown', handleKeyDown);

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

  const animate = () => {
    requestAnimationFrame(animate);
    carousel.update();
    activeSubmenu?.update?.();
    controls.update();
    renderer.render(scene, camera);
  };

  animate();

  return {
    carousel,
    scene,
    camera,
    renderer,
    nextItem: () => carousel.goToNext(),
    prevItem: () => carousel.goToPrev(),
    toggleTheme,
    closeSubmenu,
    cleanup: () => {
      // Remove our custom wheel handler
      window.removeEventListener('wheel', handleWheel);
      
      // Safety cleanup - remove any lingering OrbitControls wheel handlers
      if (controls && controls.dispose) {
        controls.dispose();
      }
      
      // Clean up click handlers
      window.removeEventListener('click', handleCarouselClick);
      window.removeEventListener('keydown', handleKeyDown);
      
      // Clean up resize handler
      window.removeEventListener('resize', handleResize);
      
      // Dispose renderer if it exists
      if (renderer && renderer.dispose) {
        renderer.dispose();
      }
    }
  };
}
