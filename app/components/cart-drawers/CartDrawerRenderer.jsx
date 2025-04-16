// CartDrawerRenderer.jsx
import { useEffect, useRef, useState } from 'react'; // Import hooks
import { createRoot } from 'react-dom/client';
import * as THREE from 'three'; // Import THREE
// Assume useCart hook exists and provides isCartOpen state
import { useCart } from '~/hooks/useCart'; // Adjust path as needed
import { createCartDrawerOverlay } from './CartDrawer3D.scene'; // Import scene function
import { createCartHUDIcon } from './CartHUDIcon3D'; // Import HUD icon function
import ClientOnly from '../ClientOnly';
import { CartHUDDebugPanel } from './CartHUDDebugPanel'; // Import Debug Panel


// Define the CartDrawer3D component
function CartDrawer3D() {
  const drawerGroupRef = useRef(null);
  const hudCartRef = useRef(null); // Ref specifically for the HUD icon
  const { isCartOpen, openDrawer, closeDrawer } = useCart(); // Get cart state and actions
  const raycasterRef = useRef(new THREE.Raycaster()); // Ref for raycaster
  const mouseRef = useRef(new THREE.Vector2()); // Ref for mouse vector
  const rendererRef = useRef(null); // Ref for renderer
  const sceneRef = useRef(null); // Ref for scene
  const cameraRef = useRef(null); // Ref for camera
  const animationFrameId = useRef(null); // Ref for animation frame ID
  const [isHudHovered, setIsHudHovered] = useState(false); // State for hover tracking
  const clockRef = useRef(new THREE.Clock()); // Clock for delta time

  // Effect for scene initialization (runs once)
  useEffect(() => {
    // Basic scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5; // Example camera position
    cameraRef.current = camera;

    // Create the drawer overlay group and add to scene
    const drawerGroup = createCartDrawerOverlay(scene, camera, { count: 3 });
    drawerGroupRef.current = drawerGroup;

    // Create the HUD icon and add directly to the scene
    const hudCart = createCartHUDIcon(camera, () => {
      // This callback is triggered by the HUD icon's internal click logic
      console.warn('[HUD Renderer] Cart icon internal onClick triggered.');
      window.dispatchEvent(new Event('cart-toggle-clicked'));
    });
    scene.add(hudCart);
    hudCartRef.current = hudCart; // Store ref to HUD icon
    console.warn('HUD Icon group added to scene:', hudCart); // Log addition to scene

    // Global listener for the cart toggle event
    const handleCartToggle = () => {
      console.warn('[HUD Renderer] cart-toggle-clicked event received.');
      // Use the cart context function to open/toggle the drawer
      // Replace openDrawer('mainCart') with your actual drawer opening logic
      if (isCartOpen) {
         closeDrawer();
      } else {
         openDrawer(); // Assuming openDrawer handles the 'mainCart' aspect
      }
    };
    window.addEventListener('cart-toggle-clicked', handleCartToggle);


    // Raycasting Click Handler (Now only needs to check HUD)
    const onClick = (event) => {
      // No need to check drawer visibility for HUD click
      if (!hudCartRef.current || !cameraRef.current) return;

      const raycaster = raycasterRef.current;
      const mouse = mouseRef.current;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current);

      // Check for intersections specifically with the HUD icon
      const intersects = raycaster.intersectObject(hudCartRef.current, true);

      for (const intersect of intersects) {
        // Check name and trigger the HUD's internal onClick via userData
        if (intersect.object.name.startsWith('CartHUDMesh') && hudCartRef.current?.userData?.onClick) {
          hudCartRef.current.userData.onClick();
          break;
        }
      }
    };

    // Mouse Move Handler for Hover Detection (Checks HUD only)
    const handleMouseMove = (event) => {
      // No need to check drawer visibility for HUD hover
      if (!hudCartRef.current || !cameraRef.current) return;

      const raycaster = raycasterRef.current;
      const mouse = mouseRef.current;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current);

      // Check for intersections with the HUD icon specifically
      let intersectsHud = false;
      const intersects = raycaster.intersectObject(hudCartRef.current, true);
      for (const intersect of intersects) {
        if (intersect.object.name.startsWith('CartHUDMesh')) {
          intersectsHud = true;
          break;
        }
      }

      // Check if hover state changed
      const currentlyHovered = intersectsHud;
      // Store hover state in userData for the debug panel
      if (hudCartRef.current?.userData) {
        hudCartRef.current.userData.hovered = currentlyHovered;
      }
      // Use functional update to avoid isHudHovered dependency if preferred,
      // but keeping it for now based on previous fix.
      if (currentlyHovered !== isHudHovered) {
        setIsHudHovered(currentlyHovered);
        hudCartRef.current?.setHoverState?.(currentlyHovered);
      }
    };

    // Add listeners
    window.addEventListener('click', onClick);
    window.addEventListener('mousemove', handleMouseMove);

    // --- Renderer setup and animation loop ---
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // Find or create a container for the canvas
    let container = document.getElementById('drawer-3d-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'drawer-3d-container';
      Object.assign(container.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'auto', // Allow clicks on the canvas for raycasting
        zIndex: '9998' // Below the drawer-ui-root but above other content
      });
      // Append to the drawer root or body
      const drawerRoot = document.getElementById('drawer-ui-root');
      if (drawerRoot) {
        drawerRoot.appendChild(container);
      } else {
        document.body.appendChild(container); // Fallback
      }
    }
    container.appendChild(renderer.domElement);

    function animate() {
      animationFrameId.current = requestAnimationFrame(animate);
      const deltaTime = clockRef.current.getDelta(); // Get time difference

      // Update the drawer group (if visible and exists)
      if (drawerGroupRef.current?.visible && drawerGroupRef.current?.update) {
         drawerGroupRef.current.update(deltaTime);
      }
      // Update the HUD icon (always update)
      if (hudCartRef.current?.update) {
         hudCartRef.current.update(deltaTime);
      }

      // --- Debugging Logs ---
      console.warn('Scene children:', sceneRef.current?.children.map(c => c.name));
      console.warn('HUD Visible:', hudCartRef.current?.visible);
      // --- End Debugging Logs ---

      // Render the scene (always render, HUD is always potentially visible)
      if (sceneRef.current && cameraRef.current && rendererRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    }
    animate();
    // --- End Renderer setup ---

    // Cleanup function
    return () => {
      // Stop animation loop
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      // Remove listeners
      window.removeEventListener('click', onClick);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('cart-toggle-clicked', handleCartToggle); // Remove toggle listener

      // Dispose of Three.js objects
      if (drawerGroupRef.current) {
        scene.remove(drawerGroupRef.current);
        // TODO: Add proper disposal for drawer group children
      }
      if (hudCartRef.current) {
        scene.remove(hudCartRef.current);
        // TODO: Add proper disposal for HUD icon children (geometry, material, textures)
        // Example: hudCartRef.current.traverse(obj => { ... dispose ... });
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      // Remove canvas from DOM
      if (container && rendererRef.current) {
        try {
          container.removeChild(rendererRef.current.domElement);
        } catch { // Removed unused 'e' variable
          // Ignore errors if element already removed
        }
      }
      // Optional: remove container if it was created dynamically
      // if (container && container.parentElement && container.id === 'drawer-3d-container') {
      //   container.parentElement.removeChild(container);
      // }

      // Clear refs
      drawerGroupRef.current = null;
      hudCartRef.current = null; // Clear HUD ref
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
   
  }, [isHudHovered, isCartOpen, openDrawer, closeDrawer]); // Added cart state/actions dependencies

  // Effect to update drawer visibility based on cart state
  // This effect remains the same, controlling only the drawer group visibility
  useEffect(() => {
    if (drawerGroupRef.current && drawerGroupRef.current.setOpenState) {
      drawerGroupRef.current.setOpenState(isCartOpen);
    }
  }, [isCartOpen]);

  // Render the debug panel (conditionally or always)
  return (
    <>
      {/* Render debug panel only in development */}
      {process.env.NODE_ENV !== 'production' && <CartHUDDebugPanel hudRef={hudCartRef} />}
    </>
  );
}


export function mountDrawerToDOM() {
  const existing = document.getElementById('drawer-ui-root');
  if (!existing) {
    const drawerRoot = document.createElement('div');
    drawerRoot.id = 'drawer-ui-root';
    drawerRoot.style.position = 'fixed';
    drawerRoot.style.zIndex = '9999';
    drawerRoot.style.top = '0';
    drawerRoot.style.left = '0';
    drawerRoot.style.width = '100vw';
    drawerRoot.style.height = '100vh';
    drawerRoot.style.pointerEvents = 'none'; // Keep pointer events none for the root
    document.body.appendChild(drawerRoot);
  }

  const target = document.getElementById('drawer-ui-root');
  // Ensure root is created only once or handle updates appropriately
  if (!target._reactRootContainer) {
    const root = createRoot(target);
    target._reactRootContainer = root; // Store root instance if needed
    root.render(
      <ClientOnly>
        <CartDrawer3D />
      </ClientOnly>
    );
  } else {
    // If needed, update the existing root (though typically state changes handle this)
    // target._reactRootContainer.render(<ClientOnly><CartDrawer3D /></ClientOnly>);
  }
}
