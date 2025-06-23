// src/cart/materials/glassMaterial.js
import * as THREE from 'three';

export const GLASS_MATERIAL = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  transmission: 1,
  roughness: 0,
  metalness: 0.25,
  clearcoat: 1,
  clearcoatRoughness: 0,
  ior: 1.45,
  thickness: 0.3,
  side: THREE.DoubleSide,
  transparent: true,
});
