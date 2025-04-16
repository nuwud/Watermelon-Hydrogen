import * as THREE from 'three';

export function createItems() {
  const ringGeometry = new THREE.RingGeometry(1, 5, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });

  ringMaterial.transparent = true;
  ringMaterial.depthWrite = false;
  ringMaterial.depthTest = false; // Optional: ensures it never gets hidden

  const glowRing = new THREE.Mesh(ringGeometry, ringMaterial);
  glowRing.renderOrder = 999; // Ensure it renders above other objects

  const scene = new THREE.Scene();
  scene.add(glowRing);

  return scene;
}