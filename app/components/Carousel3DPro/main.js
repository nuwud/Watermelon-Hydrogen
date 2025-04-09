/**
 * Carousel3DPro Demo Loader
 * Provides a function to set up and mount the 3D carousel to the DOM
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Carousel3DSubmenu } from './Carousel3DSubmenu.js';
import { defaultCarouselStyle, darkTheme, cyberpunkTheme, lightTheme } from './CarouselStyleConfig.js';
import { Carousel3DPro } from './Carousel3DPro.js';

/**
 * Sets up a 3D carousel instance and mounts it to the provided container
 * @param {HTMLElement} container - DOM element to mount the canvas to
 * @returns {Object} - API for controlling the carousel
 */
export function setupCarousel(container = document.body) {
  // Setup scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(defaultCarouselStyle.backgroundColor);

  // Setup camera
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.z = 10;
  camera.position.y = 2;

  // Setup renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Setup controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxDistance = 20;
  controls.minDistance = 5;
  
  // Completely disable wheel zoom while keeping middle mouse zoom
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY, // Middle mouse button for zoom
    RIGHT: THREE.MOUSE.PAN
  };
  
  // These are the critical fixes to prevent wheel zoom
  controls.enableZoom = true; // Keep zoom functionality
  controls.zoomSpeed = 1.0;
  
  // Override wheel handling to prevent wheel-based zoom
  const originalHandleMouseWheel = controls.handleMouseWheel;
  controls.handleMouseWheel = function(event) {
    // Do nothing with mouse wheel events, effectively disabling wheel zoom
    return false;
  };

  // Create carousel items
  const items = ['Home', 'Products', 'Contact', 'About', 'Gallery'];

  // Define submenus for each main item
  const submenus = {
    Home: ['Dashboard', 'Activity', 'Settings', 'Profile'],
    Products: ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Toys', 'Sports'],
    Services: ['Consulting', 'Training', 'Support', 'Installation', 'Maintenance'],
    About: ['Company', 'Team', 'History', 'Mission', 'Values'],
    Contact: ['Email', 'Phone', 'Chat', 'Social Media', 'Office Locations'],
    Gallery: ['Photos', 'Videos', '3D Models', 'Artwork', 'Animations', 'Virtual Tours']
  };

  // Create main carousel with default theme
  let currentTheme = defaultCarouselStyle;
  const carousel = new Carousel3DPro(items, currentTheme);
  // Store camera reference for raycasting
  carousel.userData = { camera }; 
  
  // Track submenu state
  let activeSubmenu = null;
  let submenuTransitioning = false;
  
  // Set up the callback for when carousel items are clicked
  carousel.onItemClick = (index, item) => {
    // Check if this item has a submenu and we're not already transitioning
    if (submenus[item] && !submenuTransitioning) {
      submenuTransitioning = true;
      
      // Close any existing submenu first
      if (activeSubmenu) {
        activeSubmenu.hide();
        setTimeout(() => {
          scene.remove(activeSubmenu);
          activeSubmenu = null;
          createNewSubmenu(index, item);
        }, 300);
      } else {
        createNewSubmenu(index, item);
      }
    }
  };
  
  // Helper function to create a new submenu
  function createNewSubmenu(index, item) {
    // Get the selected mesh
    const selectedMesh = carousel.itemMeshes[index];
    if (!selectedMesh) {
      submenuTransitioning = false;
      return;
    }
    
    // Create new submenu
    activeSubmenu = new Carousel3DSubmenu(selectedMesh, submenus[item], currentTheme);
    scene.add(activeSubmenu);
    scene.userData.activeSubmenu = activeSubmenu;
    
    // Show after a brief delay to let it initialize
    setTimeout(() => {
      activeSubmenu.show();
      submenuTransitioning = false;
    }, 100);
  }
  
  scene.add(carousel);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  // Handle window resize
  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    carousel.resize?.(window.innerWidth, window.innerHeight);
  };
  
  window.addEventListener('resize', handleResize);

  // Add key controls
  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      carousel.goToNext();
    } else if (event.key === 'ArrowLeft') {
      carousel.goToPrev();
    }
  });

  // IMPROVED: Better submenu handling with smooth transitions
  function handleCarouselItemClick(event) {
    // Prevent processing during transitions
    if (submenuTransitioning) return;
    
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // Add safety check for carousel.children
    if (!carousel || !carousel.children) return;
    
    // Check if we're clicking on the submenu, its items, or its floating preview
    let clickedSubmenu = false;
    let clickedSubmenuItem = false;
    
    if (activeSubmenu) {
      const submenuIntersects = raycaster.intersectObject(activeSubmenu, true);
      if (submenuIntersects.length > 0) {
        clickedSubmenu = true;
        const clickedObject = submenuIntersects[0].object;
        
        // Check if it's a submenu item
        if (clickedObject.userData?.isSubmenuItem) {
          clickedSubmenuItem = true;
          // Select item
          activeSubmenu.selectItem(clickedObject.userData.index, true, true);
        }
        
        // Check if it's the close button
        if (clickedObject.userData?.isCloseButton || 
            (clickedObject.parent && clickedObject.parent.userData?.isCloseButton)) {
          closeSubmenu();
          return;
        }
      }
    }
    
    // If we clicked the submenu but not a specific item, keep processing for close button
    if (clickedSubmenu && !clickedSubmenuItem && activeSubmenu) {
      // This could be a click on the background of the submenu
      return;
    }
    
    // Improved hit detection with larger hit areas for carousel items
    const intersects = raycaster.intersectObjects(carousel.itemGroup.children, true);
    
    for (let i = 0; i < intersects.length; i++) {
      let currentObj = intersects[i].object;
      
      // Traverse up to find the carousel item
      while (currentObj && currentObj.parent !== carousel.itemGroup) {
        currentObj = currentObj.parent;
      }
      
      if (currentObj && currentObj.userData.index !== undefined) {
        // Invoke the item click callback
        const index = currentObj.userData.index;
        if (carousel.onItemClick) {
          carousel.onItemClick(index, items[index]);
        }
        carousel.selectItem(index, true);
        break;
      }
    }
  }

  // IMPROVED: Better submenu closing function
  function closeSubmenu(immediate = false) {
    if (!activeSubmenu || submenuTransitioning) return;
    
    submenuTransitioning = true;
    
    // First close any floating preview
    if (activeSubmenu.floatingPreview) {
      activeSubmenu.stopFloatingPreviewSpin();
      gsap.to(activeSubmenu.floatingPreview.scale, {
        x: 0, y: 0, z: 0,
        duration: 0.2,
        ease: "back.in"
      });
    }
    
    // Flash red when clicked
    if (activeSubmenu.closeButton) {
      activeSubmenu.closeButton.material.color.set(0xff0000);
      activeSubmenu.closeButton.material.opacity = 1;
    }
    
    // Restore the opacity of the parent item
    if (activeSubmenu.parentItem && activeSubmenu.parentItem.material) {
      gsap.to(activeSubmenu.parentItem.material, {
        opacity: 1.0,
        duration: 0.5
      });
    }
    
    // Close the submenu properly
    if (!immediate) {
      activeSubmenu.hide();
      setTimeout(() => {
        scene.remove(activeSubmenu);
        scene.userData.activeSubmenu = null;
        activeSubmenu = null;
        submenuTransitioning = false;
      }, 300);
    } else {
      scene.remove(activeSubmenu);
      scene.userData.activeSubmenu = null;
      activeSubmenu = null;
      submenuTransitioning = false;
    }
    
    // Reset controls - ALWAYS keep enabled
    controls.enabled = true;
  }

  // Event listeners for submenu interaction
  window.addEventListener('click', handleCarouselItemClick);

  // Handle wheel event for submenu scrolling and carousel rotation
  window.addEventListener('wheel', (event) => {
    // If submenu is active, scroll it
    if (activeSubmenu) {
      const scrollAmount = event.deltaY > 0 ? 1 : -1;
      activeSubmenu.scrollSubmenu(scrollAmount);
    } else {
      // Otherwise rotate the main carousel
      const scrollAmount = event.deltaY > 0 ? 1 : -1;
      if (scrollAmount > 0) {
        carousel.goToNext();
      } else {
        carousel.goToPrev();
      }
    }
    
    // Always prevent default to stop browser zoom
    event.preventDefault();
    event.stopPropagation();
  }, { passive: false, capture: true });

  // Theme toggling
  const themes = [defaultCarouselStyle, darkTheme, cyberpunkTheme, lightTheme];
  let themeIndex = 0;
  
  const toggleTheme = () => {
    themeIndex = (themeIndex + 1) % themes.length;
    currentTheme = themes[themeIndex];
    
    // Remove active submenu when changing themes
    if (activeSubmenu) {
      closeSubmenu(true);
    }
    
    // Apply new theme to scene
    scene.background = new THREE.Color(currentTheme.backgroundColor);
    
    // Recreate carousel with new theme
    scene.remove(carousel);
    const newCarousel = new Carousel3DPro(items, currentTheme);
    newCarousel.userData = { camera };
    
    // Important: copy the onItemClick callback
    newCarousel.onItemClick = carousel.onItemClick;
    
    scene.add(newCarousel);
    
    // Update reference safely
    if (carousel.dispose) {
      carousel.dispose();
    }
    
    // Replace the original carousel with the new one
    Object.assign(carousel, newCarousel);
  };

  // Debug function to help visualize the close button hit area
  function debugCloseButton() {
    if (activeSubmenu && activeSubmenu.closeButton) {
      // Get world position of close button
      const worldPos = new THREE.Vector3();
      activeSubmenu.closeButton.getWorldPosition(worldPos);
      
      // Log every 60 frames
      if (frameCount % 60 === 0) {
        console.log("Close button world position:", worldPos);
        console.log("Close button visibility:", activeSubmenu.closeButton.visible);
        console.log("Close button scale:", activeSubmenu.closeButton.scale.x);
        console.log("Close button userData:", activeSubmenu.closeButton.userData);
      }
    }
  }

  // Animation loop
  let frameCount = 0;
  function animate() {
    requestAnimationFrame(animate);
    frameCount++;
    
    // Debug close button
    debugCloseButton();
    
    carousel.update();
    
    // Update active submenu if it exists
    if (activeSubmenu && typeof activeSubmenu.update === 'function') {
      activeSubmenu.update();
    }
    
    controls.update();
    renderer.render(scene, camera);
  }
  
  animate();
  
  // Return enhanced API for external use
  return {
    carousel,
    scene,
    camera,
    renderer,
    nextItem: () => carousel.goToNext(),
    prevItem: () => carousel.goToPrev(),
    toggleTheme
  };
}

// Auto setup if this script is loaded directly
if (typeof window !== 'undefined' && !window.isImported) {
  window.isImported = true;
  
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-container');
    if (container) {
      const { nextItem, prevItem, toggleTheme } = setupCarousel(container);
      
      // Add button event listeners if present
      const nextBtn = document.getElementById('next-btn');
      const prevBtn = document.getElementById('prev-btn');
      const themeBtn = document.getElementById('toggle-theme');
      
      if (nextBtn) nextBtn.addEventListener('click', nextItem);
      if (prevBtn) prevBtn.addEventListener('click', prevItem);
      if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-container');
    if (container) {
        const { nextItem, prevItem, toggleTheme, carousel, zoomIn, zoomOut } = setupCarousel(container);

        // REMOVE existing buttons
        const removeOldButtons = () => {
            // Remove previous, next, and theme buttons if they exist
            const nextBtn = document.getElementById('next-btn');
            const prevBtn = document.getElementById('prev-btn');
            const themeBtn = document.getElementById('toggle-theme');
            
            if (nextBtn) nextBtn.parentNode.removeChild(nextBtn);
            if (prevBtn) prevBtn.parentNode.removeChild(prevBtn);
            if (themeBtn) themeBtn.parentNode.removeChild(themeBtn);
        };
        
        // Remove old buttons after a short delay to ensure the new panel works first
        setTimeout(removeOldButtons, 500);

        // Create Control Panel button (positioned in top-right corner)
        const controlPanelBtn = document.createElement('button');
        controlPanelBtn.textContent = 'Control Panel';
        controlPanelBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            font-size: 16px;
            background-color: rgba(0, 0, 0, 0.5);
            color: white;
            border: 2px solid #fff;
            border-radius: 5px;
            cursor: pointer;
            z-index: 1000;
            transition: background-color 0.3s, transform 0.2s;
        `;
        document.body.appendChild(controlPanelBtn);

        // Add hover effect with slight grow effect
        controlPanelBtn.addEventListener('mouseenter', () => {
            controlPanelBtn.style.backgroundColor = 'rgba(0, 70, 150, 0.7)';
            controlPanelBtn.style.transform = 'scale(1.05)';
        });
        controlPanelBtn.addEventListener('mouseleave', () => {
            controlPanelBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            controlPanelBtn.style.transform = 'scale(1)';
        });

        // Add event listener to toggle the control panel
        let controlPanelVisible = false;
        let inspector = null;
        
        controlPanelBtn.addEventListener('click', () => {
            // Try to find existing inspector
            inspector = document.querySelector('.carousel-3d-inspector');
            
            if (!inspector) {
                // Create improved control panel
                try {
                    inspector = document.createElement('div');
                    inspector.className = 'carousel-3d-inspector';
                    inspector.style.cssText = `
                        position: fixed;
                        top: 70px;
                        right: 20px;
                        width: 300px;
                        background-color: rgba(20, 20, 20, 0.85);
                        color: white;
                        padding: 20px;
                        border-radius: 8px;
                        z-index: 1000;
                        font-family: Arial, sans-serif;
                        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        backdrop-filter: blur(5px);
                    `;
                    
                    // Add title
                    const title = document.createElement('h3');
                    title.textContent = 'Carousel Controls';
                    title.style.cssText = `
                        margin-top: 0;
                        margin-bottom: 15px;
                        color: #fff;
                        font-size: 18px;
                        text-align: center;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                        padding-bottom: 10px;
                    `;
                    inspector.appendChild(title);
                    
                    // Create control sections
                    const createSection = (title) => {
                        const section = document.createElement('div');
                        section.style.cssText = `
                            margin-bottom: 15px;
                        `;
                        
                        const sectionTitle = document.createElement('h4');
                        sectionTitle.textContent = title;
                        sectionTitle.style.cssText = `
                            margin: 5px 0;
                            font-size: 16px;
                            color: #add8e6;
                        `;
                        section.appendChild(sectionTitle);
                        
                        return section;
                    };
                    
                    // Button factory function
                    const createButton = (text, callback, color = '#2a3f5f') => {
                        const button = document.createElement('button');
                        button.textContent = text;
                        button.style.cssText = `
                            margin: 5px;
                            padding: 8px 12px;
                            background-color: ${color};
                            border: 1px solid #444;
                            color: white;
                            border-radius: 5px;
                            cursor: pointer;
                            transition: background-color 0.2s, transform 0.1s;
                            font-weight: bold;
                        `;
                        
                        button.addEventListener('mouseenter', () => {
                            button.style.backgroundColor = adjustColor(color, 30);
                            button.style.transform = 'scale(1.05)';
                        });
                        
                        button.addEventListener('mouseleave', () => {
                            button.style.backgroundColor = color;
                            button.style.transform = 'scale(1)';
                        });
                        
                        // Use a try-catch to prevent crashes if callback errors
                        button.addEventListener('click', () => {
                            try {
                                callback();
                            } catch (e) {
                                console.error("Error in button callback:", e);
                            }
                        });
                        return button;
                    };
                    
                    // Helper function to lighten/darken color
                    function adjustColor(col, amt) {
                        try {
                            let r = parseInt(col.substring(1, 3), 16);
                            let g = parseInt(col.substring(3, 5), 16);
                            let b = parseInt(col.substring(5, 7), 16);
                            
                            r = Math.max(0, Math.min(255, r + amt));
                            g = Math.max(0, Math.min(255, g + amt));
                            b = Math.max(0, Math.min(255, b + amt));
                            
                            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                        } catch (e) {
                            console.error("Error adjusting color:", e);
                            return col; // Return original color if there's an error
                        }
                    }
                    
                    // Navigation Section
                    const navSection = createSection('Navigation');
                    const navButtonContainer = document.createElement('div');
                    navButtonContainer.style.cssText = `
                        display: flex;
                        justify-content: center;
                        flex-wrap: wrap;
                    `;
                    
                    // Wrap functions in safe versions to prevent errors
                    const safePrevItem = () => {
                        try {
                            prevItem(); 
                        } catch (e) {
                            console.error("Error calling prevItem:", e);
                        }
                    };
                    
                    const safeNextItem = () => {
                        try {
                            nextItem();
                        } catch (e) {
                            console.error("Error calling nextItem:", e);
                        }
                    };
                    
                    const prevButton = createButton('◀ Previous', safePrevItem, '#2d6da3');
                    const nextButton = createButton('Next ▶', safeNextItem, '#2d6da3');
                    
                    navButtonContainer.appendChild(prevButton);
                    navButtonContainer.appendChild(nextButton);
                    navSection.appendChild(navButtonContainer);
                    inspector.appendChild(navSection);
                    
                    // Theme Section
                    const themeSection = createSection('Appearance');
                    
                    // Safe version of toggleTheme
                    const safeToggleTheme = () => {
                        try {
                            toggleTheme();
                        } catch (e) {
                            console.error("Error toggling theme:", e);
                        }
                    };
                    
                    const themeButton = createButton('Change Theme', safeToggleTheme, '#614080');
                    themeSection.appendChild(themeButton);
                    inspector.appendChild(themeSection);
                    
                    // Camera Controls Section
                    const cameraSection = createSection('Camera Controls');
                    const cameraControlsContainer = document.createElement('div');
                    cameraControlsContainer.style.cssText = `
                        display: flex;
                        justify-content: center;
                        flex-wrap: wrap;
                    `;
                    
                    // Safe versions of zoom functions
                    const safeZoomIn = () => {
                        try {
                            zoomIn();
                        } catch (e) {
                            console.error("Error zooming in:", e);
                        }
                    };
                    
                    const safeZoomOut = () => {
                        try {
                            zoomOut();
                        } catch (e) {
                            console.error("Error zooming out:", e);
                        }
                    };
                    
                    const zoomInButton = createButton('Zoom In (+)', safeZoomIn, '#336644');
                    const zoomOutButton = createButton('Zoom Out (-)', safeZoomOut, '#664433');
                    
                    cameraControlsContainer.appendChild(zoomInButton);
                    cameraControlsContainer.appendChild(zoomOutButton);
                    cameraSection.appendChild(cameraControlsContainer);
                    inspector.appendChild(cameraSection);
                    
                    // Help Section
                    const helpSection = createSection('Help');
                    const helpText = document.createElement('p');
                    helpText.style.cssText = `
                        font-size: 12px;
                        color: #aaa;
                        margin: 5px 0;
                    `;
                    helpText.innerHTML = 
                        '• Use mouse wheel to rotate carousel<br>' +
                        '• Middle mouse button to zoom<br>' +
                        '• Click items to open submenus<br>' +
                        '• Arrow keys for navigation';
                    helpSection.appendChild(helpText);
                    inspector.appendChild(helpSection);
                    
                    // Close button
                    const closeButton = document.createElement('button');
                    closeButton.textContent = '✕';
                    closeButton.style.cssText = `
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        background-color: transparent;
                        color: #fff;
                        border: none;
                        cursor: pointer;
                        font-size: 16px;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                        transition: background-color 0.2s;
                    `;
                    
                    closeButton.addEventListener('mouseenter', () => {
                        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    });
                    
                    closeButton.addEventListener('mouseleave', () => {
                        closeButton.style.backgroundColor = 'transparent';
                    });
                    
                    closeButton.addEventListener('click', () => {
                        inspector.style.display = 'none';
                        controlPanelVisible = false;
                    });
                    inspector.appendChild(closeButton);
                    
                    // Add to DOM with animation
                    document.body.appendChild(inspector);
                    inspector.style.opacity = '0';
                    inspector.style.transform = 'translateY(-20px)';
                    inspector.style.transition = 'opacity 0.3s, transform 0.3s';
                    
                    // Trigger animation
                    setTimeout(() => {
                        inspector.style.opacity = '1';
                        inspector.style.transform = 'translateY(0)';
                    }, 10);
                    
                    controlPanelVisible = true;
                } catch (e) {
                    console.error("Failed to create control panel:", e);
                    alert("Control panel could not be initialized. Please check console for errors.");
                }
            } else {
                controlPanelVisible = !controlPanelVisible;
                
                if (controlPanelVisible) {
                    inspector.style.display = 'block';
                    inspector.style.opacity = '0';
                    inspector.style.transform = 'translateY(-20px)';
                    
                    // Trigger animation
                    setTimeout(() => {
                        inspector.style.opacity = '1';
                        inspector.style.transform = 'translateY(0)';
                    }, 10);
                } else {
                    // Animate out
                    inspector.style.opacity = '0';
                    inspector.style.transform = 'translateY(-20px)';
                    
                    setTimeout(() => {
                        inspector.style.display = 'none';
                    }, 300);
                }
            }
        });
    }
});
