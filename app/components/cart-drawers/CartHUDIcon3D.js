// app/components/cart-drawers/CartHUDIcon3D.js

import * as THREE from 'three';
let GLTFLoader;
async function ensureGLTFLoader() {
  if (!GLTFLoader) {
    GLTFLoader = (await import('three/examples/jsm/loaders/GLTFLoader.js')).GLTFLoader;
  }
  return GLTFLoader;
}

export function createCartHUDIcon(camera, onClickCallback) {
  const group = new THREE.Group();
  group.name = 'CartHUDIconGroup';

  let loaderPromise = ensureGLTFLoader().then(L => new L());
  let cartModel = null;
  let originalEmissive = null;
  let originalIntensity = null;
  let time = 0;
  const bobAmplitude = 0.05;
  const bobFrequency = 2;
  const rotationSpeed = 0.5;

  // --- GLTF Loading ---
  const forceFallback = false; // Set to true to always use the fallback box for testing

  if (!forceFallback) {
  loaderPromise.then((loader) => loader.load(
      '/assets/Cart.gltf', // Path relative to the public directory
      (gltf) => {
        cartModel = gltf.scene;
        cartModel.name = 'CartHUDMesh'; // Assign name for raycasting

        // Adjust scale and position if needed
        cartModel.scale.set(0.3, 0.3, 0.3); // Example scale adjustment
        cartModel.position.set(0, 0, 0); // Position relative to the group center
        cartModel.rotation.set(0, Math.PI * 0.1, 0); // Initial rotation

        // Find the mesh and store original material properties
        cartModel.traverse((child) => {
          if (child.isMesh && child.material) {
            // Assuming a standard material - adjust if needed
            if (child.material.emissive) {
              originalEmissive = child.material.emissive.clone();
              originalIntensity = child.material.emissiveIntensity;
            }
            // You might need to handle multiple materials/meshes
          }
        });

        group.add(cartModel);
        console.warn('✅ CartHUDIcon added GLTF model to group.'); // Log addition
        console.warn('✅ CartHUDIcon mounted (GLTF)');
      },
      undefined, // onProgress callback (optional)
      (error) => {
        console.error('Error loading Cart GLTF, using fallback:', error);
        createFallback(); // Use fallback if loading fails
      }
    ));
  } else {
    console.warn('Forcing fallback for CartHUDIcon.');
    createFallback(); // Force fallback if flag is set
  }

  function createFallback() {
      // Fallback to a simple box
      const fallbackGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
      fallbackMesh.name = 'CartHUDMesh_Fallback';
      fallbackMesh.visible = true; // Explicitly set fallback visible
      group.add(fallbackMesh);
      cartModel = fallbackMesh; // Use fallback for animations/hover
      console.warn('✅ CartHUDIcon added Fallback model to group.'); // Log addition
      console.warn('✅ CartHUDIcon mounted (Fallback)');
  }


  // Position relative to camera using direction
  const updateHUDPosition = () => {
    if (!camera) return;

    const distance = 2.5; // How far in front of the camera
    const horizontalOffset = 0.8; // Offset to the right
    const verticalOffset = 0.4; // Offset upwards

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    const targetPosition = new THREE.Vector3();
    targetPosition.copy(camera.position).add(direction.multiplyScalar(distance));

    // Get camera's right and up vectors in world space
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    camera.matrixWorld.extractBasis(right, up, new THREE.Vector3()); // Basis vectors

    // Apply offsets based on camera orientation
    targetPosition.add(right.multiplyScalar(horizontalOffset));
    targetPosition.add(up.multiplyScalar(verticalOffset));

    // Clamp Z position relative to camera's near/far planes
    // Convert target world position to camera's local space to check Z
    const localPosition = group.parent ? group.parent.worldToLocal(targetPosition.clone()) : targetPosition.clone(); // Use scene as parent if available
    localPosition.applyMatrix4(camera.matrixWorldInverse);

    // Clamp Z: ensure it's between near plane + buffer and far plane - buffer
    const nearBuffer = 0.2; // Small buffer from near plane
    const farBuffer = 10; // Small buffer from far plane (adjust based on camera.far)
    localPosition.z = Math.max(-(camera.far - farBuffer), Math.min(-(camera.near + nearBuffer), localPosition.z));

    // Convert clamped local position back to world space
    const clampedWorldPosition = localPosition.applyMatrix4(camera.matrixWorld);

    group.position.copy(clampedWorldPosition);
    group.lookAt(camera.position); // Make the group face the camera

    // console.log(`HUD Position Update: x=${group.position.x.toFixed(2)}, y=${group.position.y.toFixed(2)}, z=${group.position.z.toFixed(2)}`); // Log position update
  };

  group.update = (deltaTime = 0.016) => {
    time += deltaTime;
    updateHUDPosition(); // Call the updated position logic

    // Apply animation if model is loaded
    if (cartModel) {
      // Bobbing animation (relative to the group)
      cartModel.position.y = Math.sin(time * bobFrequency) * bobAmplitude;
      // Rotation animation (relative to the group)
      // Ensure rotation doesn't conflict with lookAt by applying it to the model itself
      cartModel.rotation.y += rotationSpeed * deltaTime;
    }
  };

  // Method to handle hover state changes
  group.setHoverState = (isHovered) => {
    if (!cartModel) return;

    cartModel.traverse((child) => {
      if (child.isMesh && child.material) {
        if (isHovered) {
          child.material.emissive = new THREE.Color(0x0077ff); // Blue emissive
          child.material.emissiveIntensity = 1.0;
        } else {
          // Restore original properties
          child.material.emissive = originalEmissive ? originalEmissive.clone() : new THREE.Color(0x000000);
          child.material.emissiveIntensity = originalIntensity !== null ? originalIntensity : 0;
        }
        child.material.needsUpdate = true;
      }
    });
  };


  group.userData.isCartHUD = true;
  group.userData.onClick = onClickCallback;

  return group;
}
