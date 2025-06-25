import * as THREE from 'three';
import { defaultCarouselStyle } from '../CarouselStyleConfig';

/**
 * Initializes the Three.js scene, camera, and renderer
 * @param {HTMLElement} container - DOM element to mount the canvas to
 * @returns {Object} - Object containing scene, camera, and renderer
 */
export function initScene(container) {
  if (typeof window === 'undefined') return { scene: null, camera: null, renderer: null };

  // Create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(defaultCarouselStyle.backgroundColor);
  
  // Create camera
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2, 10);
  
  // Create renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);
  
  // Create lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 5, 5);
  scene.add(ambientLight, directionalLight);
  
  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  return { scene, camera, renderer };
}