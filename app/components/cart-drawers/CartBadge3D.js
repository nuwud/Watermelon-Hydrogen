// CartBadge3D.js
import * as THREE from 'three';

export function cartBadgeMesh({ count }) {
  const geometry = new THREE.SphereGeometry(0.15, 32, 32);
  const material = new THREE.MeshPhysicalMaterial({
    color: count > 0 ? 0x66ccff : 0xffffff,
    transmission: 1,
    roughness: 0.2,
    metalness: 0.9,
    clearcoat: 0.5,
    ior: 1.3,
  });

  const mesh = new THREE.Mesh(geometry, material);

  // Add floating text number later via canvasTexture or 3D Text
  mesh.userData.count = count;

  return mesh;
}
