import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import gsap from 'gsap';

// Cache font to improve performance
let cachedFont = null;

export class Carousel3DSubmenu extends THREE.Group {
  constructor(parentItem, items = [], config = {}) {
    super();
    console.warn('[Carousel3DSubmenu] 🚀 Constructor called with', {
      parentExists: !!parentItem,
      itemCount: items.length,
      hasConfig: !!config
    });

    // Set name for easier debugging
    this.name = "Carousel3DSubmenu";

    this.parentItem = parentItem;
    this.items = items;
    this.config = config;
    this.itemMeshes = [];
    this.currentIndex = 0;
    this.watermillRadius = 1.2;
    this.mainCarouselHomeAngle = typeof config.mainCarouselHomeAngle === 'number'
      ? config.mainCarouselHomeAngle
      : 0;
    this.rotationAngle = 0;
    this.targetRotation = 0;
    this.rotationSpeed = 0.15;
    this.isInitialized = false;
    this.isAnimating = false;
    
    // Simple state management - no complex guards
    this.selectItemLock = false;

    // Create container for items to rotate
    this.itemGroup = new THREE.Group();
    this.add(this.itemGroup);
    
    // Create container for fixed UI elements
    this.fixedElements = new THREE.Group();
    this.add(this.fixedElements);

    // Load font from CDN directly
    this.fontLoader = new FontLoader();
    
    // CRITICAL: Force visibility flag on from the start
    this.visible = true;

    // Try to use cached font first for instant creation
    if (cachedFont) {
      this.font = cachedFont;
      console.warn('[Carousel3DSubmenu] Using cached font');
      this.createItems();
      this.addCloseButton();
      this.isInitialized = true;
      console.warn('[Carousel3DSubmenu] Items created from cached font:', this.itemMeshes.length);
      
      // Position wheel so first item is at front
      if (this.itemMeshes.length > 0) {
        this.itemGroup.rotation.x = 0;
        this.targetRotation = 0;
        this.currentIndex = 0;
        this.highlightItem(0);
      }
    } else {
      // Load font and create items
      console.warn('[Carousel3DSubmenu] Loading font...');
      
      const fontPaths = [
        '/helvetiker_regular.typeface.json',
        '/fonts/helvetiker_regular.typeface.json',
        '/assets/fonts/helvetiker_regular.typeface.json',
        'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json'
      ];
      
      this.loadFontSequentially(fontPaths, 0);
    }
  }

  loadFontSequentially(fontPaths, pathIndex) {
    if (pathIndex >= fontPaths.length) {
      console.error('[Carousel3DSubmenu] All font paths failed');
      return;
    }

    const currentPath = fontPaths[pathIndex];
    console.warn(`[Carousel3DSubmenu] Trying font path: ${currentPath}`);

    this.fontLoader.load(
      currentPath,
      (font) => {
        console.warn('[Carousel3DSubmenu] Font loaded successfully');
        this.font = font;
        cachedFont = font;
        this.createItems();
        this.addCloseButton();
        this.isInitialized = true;
        
        if (this.itemMeshes.length > 0) {
          this.itemGroup.rotation.x = 0;
          this.targetRotation = 0;
          this.currentIndex = 0;
          this.highlightItem(0);
        }
      },
      (progress) => {
        // Font loading progress
      },
      (error) => {
        console.warn(`[Carousel3DSubmenu] Font path ${currentPath} failed:`, error);
        this.loadFontSequentially(fontPaths, pathIndex + 1);
      }
    );
  }

  createItems() {
    if (!this.font || !this.items.length) return;

    console.warn('[Carousel3DSubmenu] Creating items:', this.items);

    this.items.forEach((item, index) => {
      const container = new THREE.Group();
      const angle = (index / this.items.length) * 2 * Math.PI;

      // Create text geometry
      const geometry = new TextGeometry(item, {
        font: this.font,
        size: 0.15,
        height: 0.02,
        curveSegments: 16,
        bevelEnabled: true,
        bevelThickness: 0.005,
        bevelSize: 0.002,
        bevelOffset: 0,
        bevelSegments: 8
      });

      geometry.center();

      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.3,
        roughness: 0.4
      });

      const mesh = new THREE.Mesh(geometry, material);
      
      // Store original properties
      mesh.userData.originalColor = material.color.clone();
      mesh.userData.originalScale = mesh.scale.clone();

      container.add(mesh);
      container.userData.mesh = mesh;
      container.userData.isSubmenuItem = true;
      container.userData.index = index;
      container.userData.angle = angle;

      // Create invisible hit area for easier clicking
      const hitAreaGeometry = new THREE.BoxGeometry(0.8, 0.4, 0.2);
      const hitAreaMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.01,
        depthWrite: false
      });

      const hitArea = new THREE.Mesh(hitAreaGeometry, hitAreaMaterial);
      hitArea.position.z = -0.1;
      container.add(hitArea);
      container.userData.hitArea = hitArea;

      // Position in circle
      container.position.y = this.watermillRadius * Math.sin(angle);
      container.position.z = this.watermillRadius * Math.cos(angle);

      // Add to arrays and scene
      this.itemMeshes.push(container);
      this.itemGroup.add(container);
    });

    console.warn('[Carousel3DSubmenu] Created', this.itemMeshes.length, 'items');
  }

  addCloseButton() {
    // Create a red disk for the close button
    const baseGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 24);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      transparent: true,
      opacity: 0.8,
      metalness: 0.5,
      roughness: 0.3,
      emissive: 0xff0000,
      emissiveIntensity: 0.3
    });
    
    this.closeButton = new THREE.Mesh(baseGeometry, baseMaterial);
    
    // Position the close button in top corner
    this.closeButton.position.set(1.8, 1.8, 0.5);
    this.closeButton.scale.set(1, 1, 1);
    this.closeButton.renderOrder = 9999;
    
    // Set userData for identification
    this.closeButton.userData = {
      isCloseButton: true,
      originalColor: baseMaterial.color.clone(),
      hoverColor: new THREE.Color(0xff0000)
    };

    // Create the "X" symbol
    const lineGeometry1 = new THREE.BoxGeometry(0.22, 0.03, 0.03);
    const lineGeometry2 = new THREE.BoxGeometry(0.22, 0.03, 0.03);
    const lineMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.8
    });

    const line1 = new THREE.Mesh(lineGeometry1, lineMaterial);
    line1.position.set(0, 0, 0.03);
    line1.rotation.y = Math.PI / 4;

    const line2 = new THREE.Mesh(lineGeometry2, lineMaterial);
    line2.position.set(0, 0, 0.03);
    line2.rotation.y = -Math.PI / 4;

    // Set isCloseButton on the X parts too
    line1.userData = { isCloseButton: true };
    line2.userData = { isCloseButton: true };

    this.closeButton.add(line1);
    this.closeButton.add(line2);
    this.closeButton.userData.xLines = [line1, line2];

    // Add to fixed elements group
    this.fixedElements.add(this.closeButton);
    
    console.warn('[Carousel3DSubmenu] Close button created and added');
  }

  highlightItem(index) {
    if (index < 0 || index >= this.itemMeshes.length) return;

    const container = this.itemMeshes[index];
    const mesh = container.userData.mesh;

    if (mesh) {
      mesh.material.color.set(0x00ffff);
      mesh.material.emissive.set(0x003333);
      
      gsap.to(mesh.scale, {
        x: mesh.userData.originalScale.x * 1.3,
        y: mesh.userData.originalScale.y * 1.3,
        z: mesh.userData.originalScale.z * 1.3,
        duration: 0.3,
        ease: "back.out"
      });
    }
  }

  unhighlightItem(index) {
    if (index < 0 || index >= this.itemMeshes.length) return;

    const container = this.itemMeshes[index];
    const mesh = container.userData.mesh;

    if (mesh) {
      mesh.material.color.copy(mesh.userData.originalColor);
      mesh.material.emissive.set(0x000000);
      
      gsap.to(mesh.scale, {
        x: mesh.userData.originalScale.x,
        y: mesh.userData.originalScale.y,
        z: mesh.userData.originalScale.z,
        duration: 0.3
      });
    }
  }

  selectItem(index, animate = true) {
    console.warn(`[🧩 selectItem] Starting selection: index=${index}, animate=${animate}`);
    
    // Validate index
    if (index < 0 || index >= this.itemMeshes.length) {
      console.warn(`[selectItem] Invalid index: ${index}`);
      return;
    }

    // Simple lock check
    if (this.selectItemLock) {
      console.warn(`[selectItem] Locked, skipping selection`);
      return;
    }

    this.selectItemLock = true;

    try {
      // Simple angle calculation - like the original
      const angleStep = (2 * Math.PI) / this.itemMeshes.length;
      const target = index * angleStep;

      // Unhighlight previous item
      if (this.currentIndex !== index) {
        this.unhighlightItem(this.currentIndex);
      }

      // Highlight new item
      this.highlightItem(index);

      // Update state
      this.currentIndex = index;
      this.targetRotation = target;

      if (animate) {
        gsap.to(this.itemGroup.rotation, {
          x: target,
          duration: 0.6,
          ease: "power2.out",
          onComplete: () => {
            this.selectItemLock = false;
            console.warn(`[🧩 selectItem] Animation completed for index: ${index}`);
          }
        });
      } else {
        this.itemGroup.rotation.x = target;
        this.selectItemLock = false;
      }

      console.warn(`[🧩 selectItem] Selection completed for index: ${index}`);
      
    } catch (error) {
      console.error('[selectItem] Error:', error);
      this.selectItemLock = false;
    }
  }

  scrollSubmenu(delta) {
    if (this.selectItemLock || this.isAnimating) {
      console.warn("🚫 scrollSubmenu blocked - locked or animating");
      return;
    }
    
    // Calculate angle step between items
    const angleStep = (2 * Math.PI) / this.itemMeshes.length;
    this.targetRotation += delta > 0 ? -angleStep : angleStep;
    
    // Set animation flag
    this.isAnimating = true;
    
    // Animate to the new position
    gsap.to(this.itemGroup.rotation, {
      x: this.targetRotation,
      duration: 0.3,
      ease: "power3.out",
      onComplete: () => {
        this.isAnimating = false;
        this.updateFrontItemHighlight();
      }
    });
  }

  updateFrontItemHighlight() {
    // Find the item closest to the front (3 o'clock position)
    let frontIndex = 0;
    let minDistance = Infinity;

    this.itemMeshes.forEach((item, index) => {
      const worldPos = new THREE.Vector3();
      item.getWorldPosition(worldPos);
      
      // Distance from 3 o'clock position (positive Z axis in local space)
      const distance = Math.abs(worldPos.z - this.watermillRadius);
      
      if (distance < minDistance) {
        minDistance = distance;
        frontIndex = index;
      }
    });

    // Update highlight if needed
    if (frontIndex !== this.currentIndex) {
      this.unhighlightItem(this.currentIndex);
      this.highlightItem(frontIndex);
      this.currentIndex = frontIndex;
    }
  }

  handleItemClick(index) {
    console.warn(`[🖱️ handleItemClick] Clicked submenu item at index: ${index}`);
    
    // Validate the index
    if (index < 0 || index >= this.itemMeshes.length) {
      console.warn(`[handleItemClick] Invalid index: ${index}`);
      return;
    }

    // Direct call to selectItem - simple and reliable
    this.selectItem(index, true);
    
    console.warn(`[🖱️ handleItemClick] Selection completed for index: ${index}`);
  }

  dispose() {
    console.warn('[Carousel3DSubmenu] 🗑️ Disposing submenu...');

    // Stop all animations
    gsap.killTweensOf(this.itemGroup.rotation);

    // Dispose of all item meshes
    this.itemMeshes.forEach((container) => {
      if (container.userData.mesh) {
        container.userData.mesh.geometry.dispose();
        container.userData.mesh.material.dispose();
      }
      if (container.userData.hitArea) {
        container.userData.hitArea.geometry.dispose();
        container.userData.hitArea.material.dispose();
      }
    });

    // Dispose of close button
    if (this.closeButton) {
      this.closeButton.geometry.dispose();
      this.closeButton.material.dispose();
      if (this.closeButton.userData.xLines) {
        this.closeButton.userData.xLines.forEach(line => {
          line.geometry.dispose();
          line.material.dispose();
        });
      }
    }

    // Clear arrays and references
    this.itemMeshes = [];
    this.items = [];
    this.parentItem = null;
    this.closeButton = null;
    this.font = null;
    this.itemGroup = null;
    this.fixedElements = null;

    console.warn('[Carousel3DSubmenu] Disposal complete');
  }
}
