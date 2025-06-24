# 🔧 Three.js Enhancement Implementation Guide

*Companion to THREE_JS_EXAMPLES_ENHANCEMENT_OPPORTUNITIES.md*  
*Detailed implementation examples and code snippets*

---

## 🎯 **Ready-to-Implement Code Examples**

### **1. Enhanced Product Viewer 3D**

#### **A. 360° Product Rotation System**
```javascript
// app/components/Carousel3DPro/enhancements/ProductViewer3D.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class ProductViewer3D {
  constructor(container, productData) {
    this.container = container;
    this.productData = productData;
    this.currentVariant = 0;
    this.materials = [];
    
    this.init();
  }

  init() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true 
    });
    
    // Enhanced lighting setup
    this.setupLighting();
    
    // Interactive controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 2;
    
    // Load product model
    this.loadProductModel();
    
    // Setup UI controls
    this.setupVariantControls();
    
    this.container.appendChild(this.renderer.domElement);
    this.animate();
  }

  setupLighting() {
    // Environment lighting for realistic materials
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    // Key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(10, 10, 5);
    this.scene.add(keyLight);
    
    // Fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-10, 0, -5);
    this.scene.add(fillLight);
    
    // Rim light for edge definition
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 10, -10);
    this.scene.add(rimLight);
  }

  loadProductModel() {
    // Create product geometry (or load from GLTF)
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    
    // Create materials for each variant
    this.productData.variants.forEach((variant, index) => {
      const material = new THREE.MeshStandardMaterial({
        color: variant.color || 0xffffff,
        metalness: variant.metalness || 0.1,
        roughness: variant.roughness || 0.5,
        envMapIntensity: 1
      });
      
      // Load texture if available
      if (variant.texture) {
        const textureLoader = new THREE.TextureLoader();
        material.map = textureLoader.load(variant.texture);
      }
      
      this.materials.push(material);
    });
    
    // Create mesh with first variant
    this.productMesh = new THREE.Mesh(geometry, this.materials[0]);
    this.scene.add(this.productMesh);
    
    // Position camera
    this.camera.position.set(0, 0, 8);
    this.controls.target.copy(this.productMesh.position);
  }

  setupVariantControls() {
    // Create UI for variant switching
    const variantContainer = document.createElement('div');
    variantContainer.className = 'product-variant-controls';
    variantContainer.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      display: flex;
      gap: 10px;
      z-index: 100;
    `;
    
    this.productData.variants.forEach((variant, index) => {
      const button = document.createElement('button');
      button.className = 'variant-button';
      button.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 2px solid #fff;
        background: ${variant.color || '#ccc'};
        cursor: pointer;
        transition: transform 0.3s ease;
      `;
      
      button.addEventListener('click', () => this.switchVariant(index));
      button.addEventListener('mouseover', () => {
        button.style.transform = 'scale(1.1)';
      });
      button.addEventListener('mouseout', () => {
        button.style.transform = 'scale(1)';
      });
      
      variantContainer.appendChild(button);
    });
    
    this.container.style.position = 'relative';
    this.container.appendChild(variantContainer);
  }

  switchVariant(variantIndex) {
    if (variantIndex >= 0 && variantIndex < this.materials.length) {
      this.currentVariant = variantIndex;
      
      // Animate material transition
      const newMaterial = this.materials[variantIndex];
      this.productMesh.material = newMaterial;
      
      // Add switching animation
      gsap.to(this.productMesh.rotation, {
        y: this.productMesh.rotation.y + Math.PI * 2,
        duration: 1,
        ease: "power2.inOut"
      });
      
      // Update cart data
      this.onVariantChange?.(this.productData.variants[variantIndex]);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.controls.dispose();
    this.renderer.dispose();
    this.materials.forEach(material => material.dispose());
  }
}
```

#### **B. Integration with Existing Carousel**
```javascript
// app/components/Carousel3DPro/main.js - Enhancement
// Add to existing main.js file

import { ProductViewer3D } from './enhancements/ProductViewer3D.js';

// Add to Carousel3DPro class
class Carousel3DPro {
  // ...existing code...

  showProductDetails(productData) {
    // Create overlay for product viewer
    const overlay = document.createElement('div');
    overlay.className = 'product-viewer-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
    `;

    const viewerContainer = document.createElement('div');
    viewerContainer.style.cssText = `
      width: 80vw;
      height: 80vh;
      max-width: 800px;
      max-height: 600px;
      background: #1a1a1a;
      border-radius: 20px;
      position: relative;
    `;

    // Close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: none;
      border: none;
      color: white;
      font-size: 30px;
      cursor: pointer;
      z-index: 101;
    `;
    closeButton.addEventListener('click', () => {
      document.body.removeChild(overlay);
      productViewer.dispose();
    });

    overlay.appendChild(viewerContainer);
    overlay.appendChild(closeButton);
    document.body.appendChild(overlay);

    // Initialize product viewer
    const productViewer = new ProductViewer3D(viewerContainer, productData);
    productViewer.onVariantChange = (variant) => {
      // Update cart integration
      console.log('Variant changed:', variant);
      this.updateCartVariant?.(productData.id, variant);
    };
  }
}
```

---

### **2. Spatial Audio System**

#### **A. 3D Audio Manager**
```javascript
// app/components/Carousel3DPro/enhancements/SpatialAudioManager.js
export class SpatialAudioManager {
  constructor() {
    this.audioContext = null;
    this.listener = null;
    this.sounds = new Map();
    this.ambientSources = new Map();
    
    this.init();
  }

  async init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.listener = this.audioContext.listener;
      
      // Set default listener orientation
      if (this.listener.forwardX) {
        this.listener.forwardX.setValueAtTime(0, this.audioContext.currentTime);
        this.listener.forwardY.setValueAtTime(0, this.audioContext.currentTime);
        this.listener.forwardZ.setValueAtTime(-1, this.audioContext.currentTime);
        this.listener.upX.setValueAtTime(0, this.audioContext.currentTime);
        this.listener.upY.setValueAtTime(1, this.audioContext.currentTime);
        this.listener.upZ.setValueAtTime(0, this.audioContext.currentTime);
      }
      
      await this.loadSoundLibrary();
      
    } catch (error) {
      console.warn('Spatial audio not supported:', error);
    }
  }

  async loadSoundLibrary() {
    const soundFiles = {
      hover: '/audio/interactions/hover.mp3',
      click: '/audio/interactions/click.mp3',
      addToCart: '/audio/interactions/add-to-cart.mp3',
      variantSwitch: '/audio/interactions/variant-switch.mp3',
      ambientGallery: '/audio/ambient/gallery.mp3',
      ambientServices: '/audio/ambient/services.mp3'
    };

    for (const [name, url] of Object.entries(soundFiles)) {
      try {
        const buffer = await this.loadAudioBuffer(url);
        this.sounds.set(name, buffer);
      } catch (error) {
        console.warn(`Failed to load sound ${name}:`, error);
      }
    }
  }

  async loadAudioBuffer(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  playPositionalSound(soundName, position, volume = 1) {
    if (!this.audioContext || !this.sounds.has(soundName)) return;

    const buffer = this.sounds.get(soundName);
    const source = this.audioContext.createBufferSource();
    const panner = this.audioContext.createPanner();
    const gainNode = this.audioContext.createGain();

    // Configure panner
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;

    // Set position
    if (panner.positionX) {
      panner.positionX.setValueAtTime(position.x, this.audioContext.currentTime);
      panner.positionY.setValueAtTime(position.y, this.audioContext.currentTime);
      panner.positionZ.setValueAtTime(position.z, this.audioContext.currentTime);
    } else {
      panner.setPosition(position.x, position.y, position.z);
    }

    // Configure gain
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

    // Connect audio graph
    source.buffer = buffer;
    source.connect(panner);
    panner.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Play sound
    source.start(0);

    return source;
  }

  updateListenerPosition(camera) {
    if (!this.listener || !camera) return;

    const position = camera.position;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    if (this.listener.positionX) {
      this.listener.positionX.setValueAtTime(position.x, this.audioContext.currentTime);
      this.listener.positionY.setValueAtTime(position.y, this.audioContext.currentTime);
      this.listener.positionZ.setValueAtTime(position.z, this.audioContext.currentTime);
      
      this.listener.forwardX.setValueAtTime(forward.x, this.audioContext.currentTime);
      this.listener.forwardY.setValueAtTime(forward.y, this.audioContext.currentTime);
      this.listener.forwardZ.setValueAtTime(forward.z, this.audioContext.currentTime);
      
      this.listener.upX.setValueAtTime(up.x, this.audioContext.currentTime);
      this.listener.upY.setValueAtTime(up.y, this.audioContext.currentTime);
      this.listener.upZ.setValueAtTime(up.z, this.audioContext.currentTime);
    } else {
      this.listener.setPosition(position.x, position.y, position.z);
      this.listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }

  playAmbientSoundscape(sectionName) {
    // Stop current ambient sounds
    this.stopAllAmbient();

    const soundName = `ambient${sectionName}`;
    if (!this.sounds.has(soundName)) return;

    const buffer = this.sounds.get(soundName);
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    source.loop = true;
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 2);

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    source.start(0);

    this.ambientSources.set(sectionName, { source, gainNode });
  }

  stopAllAmbient() {
    for (const [name, { source, gainNode }] of this.ambientSources) {
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
      setTimeout(() => {
        source.stop();
        this.ambientSources.delete(name);
      }, 1000);
    }
  }
}
```

#### **B. Audio Integration with Carousel**
```javascript
// app/components/Carousel3DPro/main.js - Audio integration
import { SpatialAudioManager } from './enhancements/SpatialAudioManager.js';

class Carousel3DPro {
  constructor(items, currentTheme) {
    // ...existing code...
    this.audioManager = new SpatialAudioManager();
  }

  // Enhanced menu item interaction
  onMenuItemHover(item, index) {
    // ...existing hover logic...
    
    // Play spatial hover sound
    this.audioManager.playPositionalSound(
      'hover', 
      item.position, 
      0.5
    );
  }

  onMenuItemClick(item, index) {
    // ...existing click logic...
    
    // Play spatial click sound
    this.audioManager.playPositionalSound(
      'click', 
      item.position, 
      0.7
    );
  }

  // Add to animation loop
  animate() {
    // ...existing animation...
    
    // Update audio listener position
    this.audioManager.updateListenerPosition(this.camera);
    
    // ...rest of animation...
  }

  // Section-specific ambient audio
  showSection(sectionName) {
    // ...existing section logic...
    
    // Play section-specific ambient sound
    this.audioManager.playAmbientSoundscape(sectionName);
  }
}
```

---

### **3. Particle System Manager**

#### **A. Advanced Particle Effects**
```javascript
// app/components/Carousel3DPro/enhancements/ParticleSystemManager.js
import * as THREE from 'three';

export class ParticleSystemManager {
  constructor(scene) {
    this.scene = scene;
    this.particleSystems = new Map();
    this.setupParticleShaders();
  }

  setupParticleShaders() {
    this.particleVertexShader = `
      attribute float size;
      attribute vec3 customColor;
      varying vec3 vColor;
      
      void main() {
        vColor = customColor;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    this.particleFragmentShader = `
      uniform sampler2D pointTexture;
      varying vec3 vColor;
      
      void main() {
        gl_FragColor = vec4(vColor, 1.0);
        gl_FragColor = gl_FragColor * texture2D(pointTexture, gl_PointCoord);
        if (gl_FragColor.a < 0.1) discard;
      }
    `;
  }

  createWatermelonLogoFormation(targetPosition) {
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    
    // Watermelon shape points
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    // Generate watermelon-shaped point cloud
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Create watermelon seed pattern
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = Math.random() * 2;
      const height = (Math.random() - 0.5) * 3;
      
      positions[i3] = Math.cos(angle) * radius + targetPosition.x;
      positions[i3 + 1] = height + targetPosition.y;
      positions[i3 + 2] = Math.sin(angle) * radius + targetPosition.z;
      
      // Watermelon colors (red flesh, green rind, black seeds)
      const colorType = Math.random();
      if (colorType < 0.1) {
        // Black seeds
        colors[i3] = 0.1;
        colors[i3 + 1] = 0.1;
        colors[i3 + 2] = 0.1;
      } else if (colorType < 0.3) {
        // Green rind
        colors[i3] = 0.2;
        colors[i3 + 1] = 0.8;
        colors[i3 + 2] = 0.3;
      } else {
        // Red flesh
        colors[i3] = 1.0;
        colors[i3 + 1] = 0.3;
        colors[i3 + 2] = 0.3;
      }
      
      sizes[i] = Math.random() * 10 + 5;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.createParticleTexture() }
      },
      vertexShader: this.particleVertexShader,
      fragmentShader: this.particleFragmentShader,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
      vertexColors: true
    });
    
    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    
    // Animate formation
    this.animateFormation(particles);
    
    return particles;
  }

  createAddToCartEffect(startPosition, endPosition) {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Start at product position with slight randomness
      positions[i3] = startPosition.x + (Math.random() - 0.5) * 0.5;
      positions[i3 + 1] = startPosition.y + (Math.random() - 0.5) * 0.5;
      positions[i3 + 2] = startPosition.z + (Math.random() - 0.5) * 0.5;
      
      // Calculate velocity toward cart
      const direction = new THREE.Vector3()
        .subVectors(endPosition, startPosition)
        .normalize()
        .multiplyScalar(0.1);
      
      velocities[i3] = direction.x + (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = direction.y + (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = direction.z + (Math.random() - 0.5) * 0.02;
      
      // Golden/yellow cart colors
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.8;
      colors[i3 + 2] = 0.2;
      
      sizes[i] = Math.random() * 8 + 2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.createParticleTexture() }
      },
      vertexShader: this.particleVertexShader,
      fragmentShader: this.particleFragmentShader,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
      vertexColors: true
    });
    
    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    
    // Animate toward cart
    this.animateToCart(particles, velocities, endPosition);
    
    return particles;
  }

  createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  animateToCart(particles, velocities, targetPosition) {
    let frame = 0;
    const maxFrames = 120; // 2 seconds at 60fps
    
    const animate = () => {
      if (frame >= maxFrames) {
        this.scene.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
        return;
      }
      
      const positions = particles.geometry.attributes.position.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];
        
        // Add gravity effect
        velocities[i + 1] -= 0.001;
        
        // Attract to target
        const distance = Math.sqrt(
          Math.pow(positions[i] - targetPosition.x, 2) +
          Math.pow(positions[i + 1] - targetPosition.y, 2) +
          Math.pow(positions[i + 2] - targetPosition.z, 2)
        );
        
        if (distance > 0.1) {
          const attraction = 0.002;
          velocities[i] += (targetPosition.x - positions[i]) * attraction;
          velocities[i + 1] += (targetPosition.y - positions[i + 1]) * attraction;
          velocities[i + 2] += (targetPosition.z - positions[i + 2]) * attraction;
        }
      }
      
      particles.geometry.attributes.position.needsUpdate = true;
      frame++;
      requestAnimationFrame(animate);
    };
    
    animate();
  }

  dispose() {
    // Clean up all particle systems
    for (const [name, system] of this.particleSystems) {
      this.scene.remove(system);
      system.geometry.dispose();
      system.material.dispose();
    }
    this.particleSystems.clear();
  }
}
```

---

### **4. Integration Example**

#### **Complete Enhancement Integration**
```javascript
// app/components/Carousel3DPro/main.js - Full integration example
import { ProductViewer3D } from './enhancements/ProductViewer3D.js';
import { SpatialAudioManager } from './enhancements/SpatialAudioManager.js';
import { ParticleSystemManager } from './enhancements/ParticleSystemManager.js';

class Carousel3DPro {
  constructor(items, currentTheme) {
    // ...existing constructor...
    
    // Initialize enhancement systems
    this.audioManager = new SpatialAudioManager();
    this.particleManager = new ParticleSystemManager(this.scene);
    this.productViewers = new Map();
    
    // Add enhanced interactions
    this.setupEnhancedInteractions();
  }

  setupEnhancedInteractions() {
    // Enhanced menu interactions with audio and particles
    this.menuItems.forEach((item, index) => {
      item.userData.originalEmissive = item.material.emissive.clone();
      
      // Hover with audio feedback
      item.addEventListener('mouseover', () => {
        this.audioManager.playPositionalSound('hover', item.position, 0.5);
        gsap.to(item.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.3 });
      });
      
      // Click with particle effect
      item.addEventListener('click', () => {
        this.audioManager.playPositionalSound('click', item.position, 0.7);
        this.particleManager.createWatermelonLogoFormation(item.position);
        
        // Show product viewer for products
        if (item.userData.type === 'product') {
          this.showEnhancedProductViewer(item.userData.productData);
        }
      });
    });
  }

  showEnhancedProductViewer(productData) {
    // Create enhanced product viewer with all features
    const viewerContainer = this.createProductViewerOverlay();
    
    const productViewer = new ProductViewer3D(viewerContainer, productData);
    
    // Enhanced add to cart with particles
    productViewer.onAddToCart = (variant) => {
      const startPos = new THREE.Vector3(0, 0, 0); // Product position
      const endPos = this.getCartPosition(); // Cart icon position
      
      this.particleManager.createAddToCartEffect(startPos, endPos);
      this.audioManager.playPositionalSound('addToCart', startPos, 0.8);
      
      // Update cart
      this.addToCart(productData, variant);
    };
    
    this.productViewers.set(productData.id, productViewer);
  }

  // Enhanced animation loop
  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Update audio listener
    this.audioManager.updateListenerPosition(this.camera);
    
    // ...existing animation code...
    
    this.renderer.render(this.scene, this.camera);
  }
}

// Export enhanced version
export { Carousel3DPro };
```

---

## 🚀 **Quick Implementation Steps**

### **Step 1: Add Enhancement Folder Structure**
```bash
mkdir -p app/components/Carousel3DPro/enhancements
mkdir -p app/components/Carousel3DPro/shaders
mkdir -p public/audio/interactions
mkdir -p public/audio/ambient
```

### **Step 2: Implement One Feature at a Time**
1. Start with **ProductViewer3D** (highest impact)
2. Add **SpatialAudioManager** (unique experience)
3. Implement **ParticleSystemManager** (visual polish)

### **Step 3: Test and Iterate**
```javascript
// Browser console testing
window.testEnhancements = {
  testProductViewer: () => {
    // Test product viewer functionality
  },
  testSpatialAudio: () => {
    // Test audio positioning
  },
  testParticles: () => {
    // Test particle effects
  }
};
```

---

This implementation guide provides ready-to-use code that maintains compatibility with your existing Watermelon Hydrogen system while adding significant enhancements inspired by Three.js examples. Each enhancement is modular and can be implemented independently.
