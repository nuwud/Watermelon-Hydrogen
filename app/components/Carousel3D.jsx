/**
 * @AI-PROMPT
 * You are a senior Three.js engineer.
 * This file defines the Carousel3DPro class using Three.js to render a 3D word carousel.
 * It supports cylinder-style rotation, item selection, glow FX, and transparent backgrounds.
 * This module is intended to work inside the NUDUN Editor (Three.js-based) and connect to Shopify or any product UI.
 * Dependencies: Three.js, OrbitControls, GSAP (optional for tween)
 */

import * as THREE from 'three';
import { Group } from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { getGlowShaderMaterial } from './CarouselShaderFX.js';
import { defaultCarouselStyle } from './CarouselStyleConfig.js';

if (typeof window !== 'undefined') {
  // gsap = window.gsap;
}

export class Carousel3DPro extends Group {
  constructor(items = [], config = {}) {
    super();
    this.items = items;
    this.config = { ...defaultCarouselStyle, ...config };
    this.font = null;
    this.textMeshes = [];
    this.rotationSpeed = 0.002;

    this.init();
  }

  async init() {
    try {
      const fontLoader = new FontLoader();
      fontLoader.load('/fonts/helvetiker_regular.typeface.json', (font) => {
        this.font = font;
        this.buildCarousel();
      });
    } catch (err) {
      console.error('[Carousel3DPro] Font loading failed:', err);
    }
  }

  buildCarousel() {
    if (!this.font) return;

    const radius = this.config.radius || 5;
    const angleStep = (2 * Math.PI) / this.items.length;

    this.items.forEach((item, i) => {
      const geometry = new TextGeometry(item, {
        font: this.font,
        size: this.config.textSize || 1,
        height: 0.1,
        curveSegments: 12,
      });

      const material = getGlowShaderMaterial(this.config);
      const mesh = new THREE.Mesh(geometry, material);
      const angle = i * angleStep;

      mesh.position.x = radius * Math.cos(angle);
      mesh.position.z = radius * Math.sin(angle);
      mesh.lookAt(new THREE.Vector3(0, 0, 0));

      this.add(mesh);
      this.textMeshes.push(mesh);
    });
  }

  update(delta) {
    this.rotation.y += this.rotationSpeed * delta;
    this.textMeshes.forEach((mesh) => {
      mesh.lookAt(new THREE.Vector3(0, mesh.position.y, 0));
    });
  }

  dispose() {
    this.textMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.clear();
  }
}
