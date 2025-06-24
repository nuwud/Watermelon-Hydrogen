import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function setupControls(camera, renderer) {
  // Create orbit controls with proper configuration
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxDistance = 20;
  controls.minDistance = 5;
  
  // Configure for middle-mouse zoom only
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  
  // Disable touch pinch zoom
  controls.touches.TWO = null;
  
  // Track wheel handler state
  let isWheelHandlerActive = true;
  
  // Override OrbitControls wheel handler for middle-mouse only zoom
  const originalOnWheel = controls.onMouseWheel;
  controls.onMouseWheel = function(event) {
    if (event.buttons !== 4) return; // Block non-middle mouse wheel
    originalOnWheel.call(this, event);
  };
  
  // Wheel event handler for carousel navigation
  const wheelEventHandler = function(event) {
    // Allow middle-mouse wheel zoom to pass through
    if (event.buttons === 4) return;
    
    // For normal wheel, prevent default scrolling
    event.preventDefault();
    event.stopPropagation();
    
    // Emit custom event for carousel/submenu to handle
    if (isWheelHandlerActive) {
      const customEvent = new CustomEvent('carousel-wheel', {
        detail: { delta: event.deltaY }
      });
      window.dispatchEvent(customEvent);
    }
  };
  
  // Attach wheel handler with capture phase
  window.addEventListener('wheel', wheelEventHandler, { passive: false, capture: true });
  
  // Return public API
  return {
    controls,
    enableWheel: () => { isWheelHandlerActive = true; },
    disableWheel: () => { isWheelHandlerActive = false; },
    
    // Cleanup function for when component unmounts
    dispose: () => {
      window.removeEventListener('wheel', wheelEventHandler, { passive: false, capture: true });
      controls.dispose();
    }
  };
}