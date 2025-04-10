/**
 * @AI-PROMPT
 * You are a senior Three.js engineer.
 * This file defines the Carousel3DPro component using Three.js to render a 3D word carousel.
 * It supports cylinder-style rotation, item selection, glow FX, and transparent backgrounds.
 * This module is intended to work inside the NUDUN Editor (Three.js-based) and connect to Shopify or any product UI.
 * Dependencies: Three.js, GSAP (optional for tween), OrbitControls
 */

import * as THREE from 'three';
import { Group } from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { getGlowShaderMaterial } from './CarouselShaderFX.js';
import { defaultCarouselStyle } from './CarouselStyleConfig.js';

// Access GSAP from the global scope
const gsap = typeof window !== 'undefined' ? window.gsap : undefined;

// Core structure and update logic here
export class Carousel3DPro extends Group {
  constructor(items = [], config = {}) {
    super();
    this.items = items;
    this.config = { ...defaultCarouselStyle, ...config };
    this.itemMeshes = [];
    this.currentIndex = 0;
    this.targetRotation = 0;
    this.rotationSpeed = 0.05;
    this.cylinderRadius = 5;
    this.isAnimating = false;
    this.itemGroup = new THREE.Group();
    this.add(this.itemGroup);

    // Callback for item clicks
    this.onItemClick = null;

    this.font = null; // Initialize font to null
    this.loadFont().then(() => {
      this.createItems();
    });

    // Event listeners
    this.raycaster = new THREE.Raycaster();
    this.setupEventListeners();

    this.levelingSpeed = 0.1; // Controls how quickly items level out
    this.maxTilt = Math.PI / 24; // Limits maximum tilt (about 7.5 degrees)
  }

  async loadFont() {
    try {
      const fontURL = '/helvetiker_regular.typeface.json';
      const loader = new FontLoader();

      // Use a promise to handle the asynchronous loading
      this.font = await new Promise((resolve, reject) => {
        loader.load(
          fontURL,
          (font) => {
            resolve(font);
          },
          undefined,
          (error) => {
            console.error('An error occurred while loading the font.', error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('Failed to load font:', error);
    }
  }
  
  createItems() {
    if (!this.font) return;
    
    const angleStep = (2 * Math.PI) / this.items.length;
    
    this.items.forEach((item, index) => {
      // Create text geometry
      const geometry = new TextGeometry(item.toString(), {
        font: this.font,
        size: 0.5,
        height: 0.1,
        depth: 0.1,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.02,
        bevelOffset: 0,
        bevelSegments: 5
      });
      
      geometry.computeBoundingBox();
      geometry.center();
      
      // Create material for the text
      const material = new THREE.MeshStandardMaterial({ 
        color: this.config.textColor,
        transparent: true,
        opacity: this.config.opacity
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = item.toString();
      // Calculate or assign default values for x, y, and z
      const x = 0; // Default or calculated x-coordinate
      const y = 0; // Default or calculated y-coordinate
      const z = 0; // Default or calculated z-coordinate
      mesh.position.set(x, y, z);
      this.itemGroup.add(mesh);
      
      // Position in cylinder arrangement
      const angle = angleStep * index;
      mesh.position.x = this.cylinderRadius * Math.sin(angle);
      mesh.position.z = this.cylinderRadius * Math.cos(angle);

      // Make each item face outward
      mesh.rotation.y = Math.atan2(mesh.position.x, mesh.position.z);
      
      // Store original scale in userData
      mesh.userData.originalScale = new THREE.Vector3().copy(mesh.scale);
      
      // Add hit area for better click detection
      const textWidth = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
      const textHeight = geometry.boundingBox.max.y - geometry.boundingBox.min.y;

      const hitAreaWidth = textWidth * 1.5; // Much wider
      const hitAreaHeight = textHeight * 2; // Much taller
      const hitAreaDepth = 0.5; // Deeper for better 3D hit detection

      const hitAreaGeometry = new THREE.BoxGeometry(hitAreaWidth, hitAreaHeight, hitAreaDepth);
      const hitAreaMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, // Use a visible color for debugging, then set to transparent
        transparent: true,
        opacity: 0.01 // Nearly invisible in production
      });

      const hitArea = new THREE.Mesh(hitAreaGeometry, hitAreaMaterial);
      hitArea.position.copy(mesh.position); // Match the position of the text
      hitArea.rotation.copy(mesh.rotation); // Match the rotation of the text

      // Add hit area to the item group
      this.itemGroup.add(hitArea);

      // Store hit area and mesh in userData for interaction
      hitArea.userData = { index, mesh };
      mesh.userData.hitArea = hitArea;

      this.itemMeshes.push(mesh);
      this.itemGroup.add(mesh);
    });
    
    // Apply glow to first item
    this.selectItem(0, false);
  }
  
  selectItem(index, animate = true) {
    if (index < 0 || index >= this.itemMeshes.length || this.isAnimating) return;
    
    this.isAnimating = animate;
    this.currentIndex = index;
    
    // Remove selection from all items
    this.itemMeshes.forEach(mesh => {
      mesh.userData.isSelected = false;
      mesh.material = new THREE.MeshStandardMaterial({ 
        color: this.config.textColor,
        transparent: true,
        opacity: this.config.opacity
      });
      
      if (animate) {
        gsap.to(mesh.scale, { 
          x: mesh.userData.originalScale.x,
          y: mesh.userData.originalScale.y,
          z: mesh.userData.originalScale.z,
          duration: 0.3
        });
      } else {
        mesh.scale.copy(mesh.userData.originalScale);
      }
    });
    
    // Apply selection to current item
    const selectedMesh = this.itemMeshes[index];
    selectedMesh.userData.isSelected = true;
    
    // Apply glow material
    const glowMaterial = getGlowShaderMaterial();
    glowMaterial.uniforms.glowColor.value = new THREE.Color(this.config.glowColor);
    selectedMesh.material = glowMaterial;
    
    if (animate) {
      gsap.to(selectedMesh.scale, { 
        x: selectedMesh.userData.originalScale.x * 1.2,
        y: selectedMesh.userData.originalScale.y * 1.2,
        z: selectedMesh.userData.originalScale.z * 1.2,
        duration: 0.3,
        onComplete: () => { this.isAnimating = false; }
      });
      
      // Rotate carousel to face the selected item
      const angleStep = (2 * Math.PI) / this.items.length;
      this.targetRotation = index * angleStep;
      
      gsap.to(this.itemGroup.rotation, {
        y: this.targetRotation,
        duration: 0.8,
        ease: "power2.out"
      });
    } else {
      selectedMesh.scale.set(
        selectedMesh.userData.originalScale.x * 1.2,
        selectedMesh.userData.originalScale.y * 1.2,
        selectedMesh.userData.originalScale.z * 1.2
      );
      this.isAnimating = false;
    }
  }
  
  setupEventListeners() {
    const handleClick = (event) => {
      const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );

      // Safety check for camera
      if (this.parent?.userData?.camera) {
        this.raycaster.setFromCamera(mouse, this.parent.userData.camera);
        const intersects = this.raycaster.intersectObjects(this.itemMeshes, true);
        
        if (intersects.length > 0) {
          const clickedObject = intersects[0].object;
          const index = this.itemMeshes.indexOf(clickedObject);
          if (index !== -1) {
            this.selectItem(index);
            
            // Call the onItemClick callback if defined
            if (typeof this.onItemClick === 'function') {
              this.onItemClick(index, this.items[index]);
            }
          }
        }
      }
    };

    window.addEventListener('click', handleClick);
  }
  
  handleWheel(event) {
    // Skip processing if a submenu is active
    if (this.parent?.userData?.activeSubmenu) return;
    
    const scrollAmount = event.deltaY > 0 ? 1 : -1;
    
    // Use scrollAmount to rotate or navigate
    if (scrollAmount > 0) {
      this.goToNext();
    } else {
      this.goToPrev();
    }
  }
  
  update() {
    // Smooth rotation of the carousel with more inertia feel
    if (!this.isAnimating) {
      const diff = this.targetRotation - this.itemGroup.rotation.y;
      if (Math.abs(diff) > 0.01) {
        // Apply a more natural rotation speed based on distance
        const rotationAmount = diff * this.rotationSpeed;
        this.itemGroup.rotation.y += rotationAmount;
        
        // Check if we need to update the current index based on rotation
        this.updateCurrentItemFromRotation();
      } else {
        // Snap precisely to target when very close
        this.itemGroup.rotation.y = this.targetRotation;
      }
    }
    
    // Update glow effects if needed
    this.itemMeshes.forEach(mesh => {
      if (mesh.userData.isSelected && mesh.material.uniforms) {
        mesh.material.uniforms.time.value = performance.now() * 0.001;
      }
    });
  }
  
  // Add a new method to handle continuous spinning via mouse wheel
  spin(deltaAngle) {
    if (this.isAnimating) return;
    
    // Add the rotation directly to the target
    this.targetRotation += deltaAngle;
    
    // Don't set isAnimating flag to allow smooth continuous spinning
  }
  
  // Add a method to figure out which item is at the front based on rotation
  updateCurrentItemFromRotation() {
    if (!this.itemMeshes.length) return;
    
    const angleStep = (2 * Math.PI) / this.items.length;
    const currentRotation = this.itemGroup.rotation.y;
    
    // Normalize rotation to get a value between 0 and 2π
    let normalizedRotation = currentRotation % (2 * Math.PI);
    if (normalizedRotation < 0) normalizedRotation += 2 * Math.PI;
    
    // Calculate which index is at the front (3 o'clock position)
    const indexFromRotation = Math.round(normalizedRotation / angleStep) % this.items.length;
    
    // If we have a new front item, update it
    if (indexFromRotation !== this.currentIndex) {
      // Deselect the current item
      this.itemMeshes.forEach(mesh => {
        if (mesh.userData.isSelected) {
          mesh.userData.isSelected = false;
          
          // Reset material
          mesh.material = new THREE.MeshStandardMaterial({
            color: this.config.textColor,
            transparent: true,
            opacity: this.config.opacity
          });
          
          // Reset scale
          mesh.scale.copy(mesh.userData.originalScale);
        }
      });
      
      // Select the new item
      const newSelectedMesh = this.itemMeshes[indexFromRotation];
      newSelectedMesh.userData.isSelected = true;
      
      // Apply glow material
      const glowMaterial = getGlowShaderMaterial();
      glowMaterial.uniforms.glowColor.value = new THREE.Color(this.config.glowColor);
      newSelectedMesh.material = glowMaterial;
      
      // Scale up
      newSelectedMesh.scale.set(
        newSelectedMesh.userData.originalScale.x * 1.2,
        newSelectedMesh.userData.originalScale.y * 1.2,
        newSelectedMesh.userData.originalScale.z * 1.2
      );
      
      // Update current index
      this.currentIndex = indexFromRotation;
    }
  }
  
  // Public API methods
  goToNext() {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    const nextIndex = (this.currentIndex + 1) % this.items.length;
    
    // Calculate rotation amount - smooth transition
    const segmentAngle = (2 * Math.PI) / this.items.length;
    this.targetRotation = this.itemGroup.rotation.y - segmentAngle;
    
    // Animate with smoother, more controlled motion
    gsap.to(this.itemGroup.rotation, {
      y: this.targetRotation,
      duration: 0.5, // Make transition a bit faster for more responsive feel
      ease: "power2.out",
      onComplete: () => {
        this.currentIndex = nextIndex;
        this.isAnimating = false;
      }
    });
    
    // Highlight new item
    this.selectItem(nextIndex, true);
  }
  
  goToPrev() {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    const prevIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
    
    // Calculate rotation amount - smooth transition
    const segmentAngle = (2 * Math.PI) / this.items.length;
    this.targetRotation = this.itemGroup.rotation.y + segmentAngle;
    
    // Animate with smoother, more controlled motion
    gsap.to(this.itemGroup.rotation, {
      y: this.targetRotation,
      duration: 0.5, // Make transition a bit faster for more responsive feel
      ease: "power2.out",
      onComplete: () => {
        this.currentIndex = prevIndex;
        this.isAnimating = false;
      }
    });
    
    // Highlight new item
    this.selectItem(prevIndex, true);
  }
  
  getCurrentItem() {
    return this.items[this.currentIndex];
  }
  
  resize() {
    // Update for responsive layout
    // This would be called by the parent component when window resizes
  }
}