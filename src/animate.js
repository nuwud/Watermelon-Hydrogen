import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

let camera, scene, renderer, composer, clock;

function getElapsedTime() {
    return clock.getElapsedTime();
}

setInterval(() => {
    console.warn(`Elapsed Time: ${getElapsedTime()} seconds`);
}, 1000);
let carousel = { itemMeshes: [] };

init();
animate();

function init() {
  const container = document.createElement('div');
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.z = 400;

  scene = new THREE.Scene();

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 1);
  camera.add(pointLight);
  scene.add(camera);

  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('js/libs/draco/');
  loader.setDRACOLoader(dracoLoader);

  loader.load('models/carousel.glb', function (gltf) {
    const object = gltf.scene;
    object.traverse(function (child) {
      if (child.isMesh) {
        carousel.itemMeshes.push(child);
      }
    });
    scene.add(object);
  });

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.enableZoom = false;

  window.addEventListener('resize', onWindowResize, false);

  clock = new THREE.Clock();

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
  bloomPass.threshold = 0;
  bloomPass.strength = 1.5;
  bloomPass.radius = 0;
  composer.addPass(bloomPass);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  carousel.itemMeshes.forEach(mesh => {
    const ring = mesh.userData.glowRing;
    if (ring?.material?.uniforms?.uTime) {
      ring.material.uniforms.uTime.value = performance.now() / 1000;
    }
  });

  render();
}

function render() {
  composer.render();
}