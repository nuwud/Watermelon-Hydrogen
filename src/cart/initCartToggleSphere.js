// src/cart/initCartToggleSphere.js
// src/cart/initCartToggleSphere.js
import * as THREE from 'three';

export function createCartToggleSphere() {
  const geometry = new THREE.SphereGeometry(0.3, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: 0x66ccff,
    transparent: true,
    opacity: 0.8,
    emissive: 0x0000ff,
    roughness: 0.1,
    metalness: 0.6,
  });

  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(2.5, 1.2, 0);
  sphere.userData.isCartToggle = true;
  return sphere;
}
