/**
 * Generate 3D models for Shopify products
 * Creates GLB files for each product to replace fallback geometry
 */

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';
import path from 'path';

class ProductModelGenerator {
  constructor() {
    this.exporter = new GLTFExporter();
    this.outputDir = './public/assets/models';
  }

  // Create a book-like model for guides and documentation
  createBookModel() {
    const group = new THREE.Group();
    
    // Book cover
    const coverGeometry = new THREE.BoxGeometry(1.5, 2, 0.1);
    const coverMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4a90e2,
      transparent: true,
      opacity: 0.9
    });
    const cover = new THREE.Mesh(coverGeometry, coverMaterial);
    
    // Book pages
    const pagesGeometry = new THREE.BoxGeometry(1.4, 1.9, 0.2);
    const pagesMaterial = new THREE.MeshPhongMaterial({ color: 0xf5f5f5 });
    const pages = new THREE.Mesh(pagesGeometry, pagesMaterial);
    pages.position.z = -0.05;
    
    // Title embossing
    const titleGeometry = new THREE.BoxGeometry(1.2, 0.3, 0.02);
    const titleMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffffff,
      emissive: 0x222222
    });
    const title = new THREE.Mesh(titleGeometry, titleMaterial);
    title.position.set(0, 0.5, 0.06);
    
    group.add(cover, pages, title);
    return group;
  }

  // Create a USB drive model for themes/downloads
  createUSBModel() {
    const group = new THREE.Group();
    
    // USB body
    const bodyGeometry = new THREE.BoxGeometry(0.8, 0.3, 2);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xff6b6b,
      metalness: 0.3,
      roughness: 0.4
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    // USB connector
    const connectorGeometry = new THREE.BoxGeometry(0.6, 0.2, 0.8);
    const connectorMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2
    });
    const connector = new THREE.Mesh(connectorGeometry, connectorMaterial);
    connector.position.z = 1.2;
    
    // Watermelon accent
    const accentGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const accentMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4ecdc4,
      emissive: 0x1a4a47
    });
    const accent = new THREE.Mesh(accentGeometry, accentMaterial);
    accent.position.set(0, 0.2, 0);
    
    group.add(body, connector, accent);
    return group;
  }

  // Create a template stack model for eCommerce templates
  createTemplateStackModel() {
    const group = new THREE.Group();
    
    // Create multiple layered cards
    for (let i = 0; i < 4; i++) {
      const cardGeometry = new THREE.BoxGeometry(2, 1.5, 0.05);
      const hue = (i * 60) % 360;
      const color = new THREE.Color().setHSL(hue / 360, 0.7, 0.6);
      const cardMaterial = new THREE.MeshPhongMaterial({ 
        color,
        transparent: true,
        opacity: 0.9
      });
      
      const card = new THREE.Mesh(cardGeometry, cardMaterial);
      card.position.set(
        (i - 1.5) * 0.1,
        (i - 1.5) * 0.1,
        i * 0.1
      );
      card.rotation.z = (i - 1.5) * 0.05;
      
      group.add(card);
    }
    
    return group;
  }

  // Create a holographic display for product viewer kit
  createHologramModel() {
    const group = new THREE.Group();
    
    // Base platform
    const baseGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 16);
    const baseMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x222222,
      metalness: 0.8,
      roughness: 0.3
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -1;
    
    // Hologram effect
    const holoGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const holoMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
      emissive: 0x004444
    });
    const holo = new THREE.Mesh(holoGeometry, holoMaterial);
    
    // Energy rings
    for (let i = 0; i < 3; i++) {
      const ringGeometry = new THREE.TorusGeometry(1 + i * 0.3, 0.02, 8, 16);
      const ringMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00ffff,
        emissive: 0x002222
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.y = -0.5 + i * 0.2;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }
    
    group.add(base, holo);
    return group;
  }

  // Create audio waveform visualization
  createAudioPackModel() {
    const group = new THREE.Group();
    
    // Create waveform bars
    for (let i = 0; i < 12; i++) {
      const height = 0.5 + Math.sin(i * 0.5) * 0.8;
      const barGeometry = new THREE.BoxGeometry(0.15, height, 0.15);
      const barMaterial = new THREE.MeshPhongMaterial({ 
        color: new THREE.Color().setHSL((i * 30) / 360, 0.8, 0.6),
        emissive: new THREE.Color().setHSL((i * 30) / 360, 0.8, 0.2)
      });
      
      const bar = new THREE.Mesh(barGeometry, barMaterial);
      bar.position.set((i - 5.5) * 0.25, height / 2 - 0.5, 0);
      
      group.add(bar);
    }
    
    // Speaker base
    const speakerGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 16);
    const speakerMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x333333,
      metalness: 0.6,
      roughness: 0.4
    });
    const speaker = new THREE.Mesh(speakerGeometry, speakerMaterial);
    speaker.position.y = -1;
    
    group.add(speaker);
    return group;
  }

  async generateAll() {
    const models = [
      { name: 'book-hydrogen.glb', generator: () => this.createBookModel() },
      { name: 'systems-book.glb', generator: () => this.createBookModel() },
      { name: 'watermelon-usb.glb', generator: () => this.createUSBModel() },
      { name: 'template-stack.glb', generator: () => this.createTemplateStackModel() },
      { name: 'hologram-box.glb', generator: () => this.createHologramModel() },
      { name: 'audio-pack.glb', generator: () => this.createAudioPackModel() }
    ];

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    for (const model of models) {
      try {
        const scene = model.generator();
        const glb = await this.exportToGLB(scene);
        const outputPath = path.join(this.outputDir, model.name);
        
        fs.writeFileSync(outputPath, glb);
        console.log(`✅ Generated: ${model.name}`);
      } catch (error) {
        console.error(`❌ Failed to generate ${model.name}:`, error);
      }
    }
  }

  exportToGLB(scene) {
    return new Promise((resolve, reject) => {
      this.exporter.parse(
        scene,
        (result) => {
          resolve(new Uint8Array(result));
        },
        { binary: true },
        reject
      );
    });
  }
}

// Run the generator
const generator = new ProductModelGenerator();
generator.generateAll().then(() => {
  console.log('🎉 All product models generated successfully!');
}).catch(error => {
  console.error('💥 Generation failed:', error);
});
