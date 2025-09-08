// Archived from backup/components/Carousel3DPro/Carousel3DSubmenu_WORKING.js on 2025-09-07
// Referenced during submenu restoration work.

import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import gsap from 'gsap';

let cachedFont = null;

export class Carousel3DSubmenu extends THREE.Group {
  constructor(parentItem, items = [], config = {}) {
    super();
    console.warn('[Carousel3DSubmenu] 🚀 Constructor called with', {
      parentExists: !!parentItem,
      itemCount: items.length,
      hasConfig: !!config
    });
    this.name = 'Carousel3DSubmenu';
    this.parentItem = parentItem;
    this.items = items;
    this.config = config;
    this.itemMeshes = [];
    this.currentIndex = 0;
    this.watermillRadius = 1.2;
    this.mainCarouselHomeAngle = typeof config.mainCarouselHomeAngle === 'number' ? config.mainCarouselHomeAngle : 0;
    this.rotationAngle = 0;
    this.targetRotation = 0;
    this.rotationSpeed = 0.15;
    this.isInitialized = false;
    this.isAnimating = false;
    this.selectItemLock = false;
    this.itemGroup = new THREE.Group();
    this.add(this.itemGroup);
    this.fixedElements = new THREE.Group();
    this.add(this.fixedElements);
    this.fontLoader = new FontLoader();
    this.visible = true;
    if (cachedFont) {
      this.font = cachedFont;
      console.warn('[Carousel3DSubmenu] Using cached font');
      this.createItems();
      this.addCloseButton();
      this.isInitialized = true;
      console.warn('[Carousel3DSubmenu] Items created from cached font:', this.itemMeshes.length);
      if (this.itemMeshes.length > 0) {
        this.itemGroup.rotation.x = 0;
        this.targetRotation = 0;
        this.currentIndex = 0;
        this.highlightItem(0);
      }
    } else {
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
      undefined,
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
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.4 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.originalColor = material.color.clone();
      mesh.userData.originalScale = mesh.scale.clone();
      container.add(mesh);
      container.userData.mesh = mesh;
      container.userData.isSubmenuItem = true;
      container.userData.index = index;
      container.userData.angle = angle;
      const hitAreaGeometry = new THREE.BoxGeometry(0.8, 0.4, 0.2);
      const hitAreaMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.01, depthWrite: false });
      const hitArea = new THREE.Mesh(hitAreaGeometry, hitAreaMaterial);
      hitArea.position.z = -0.1;
      container.add(hitArea);
      container.userData.hitArea = hitArea;
      container.position.y = this.watermillRadius * Math.sin(angle);
      container.position.z = this.watermillRadius * Math.cos(angle);
      this.itemMeshes.push(container);
      this.itemGroup.add(container);
    });
    console.warn('[Carousel3DSubmenu] Created', this.itemMeshes.length, 'items');
  }
  addCloseButton() {
    const baseGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 24);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xff3333, transparent: true, opacity: 0.8, metalness: 0.5, roughness: 0.3, emissive: 0xff0000, emissiveIntensity: 0.3 });
    this.closeButton = new THREE.Mesh(baseGeometry, baseMaterial);
    this.closeButton.position.set(1.8, 1.8, 0.5);
    this.closeButton.scale.set(1, 1, 1);
    this.closeButton.renderOrder = 9999;
    this.closeButton.userData = { isCloseButton: true, originalColor: baseMaterial.color.clone(), hoverColor: new THREE.Color(0xff0000) };
    const lineGeometry1 = new THREE.BoxGeometry(0.22, 0.03, 0.03);
    const lineGeometry2 = new THREE.BoxGeometry(0.22, 0.03, 0.03);
    const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 });
    const line1 = new THREE.Mesh(lineGeometry1, lineMaterial);
    line1.position.set(0, 0, 0.03);
    line1.rotation.y = Math.PI / 4;
    const line2 = new THREE.Mesh(lineGeometry2, lineMaterial);
    line2.position.set(0, 0, 0.03);
    line2.rotation.y = -Math.PI / 4;
    line1.userData = { isCloseButton: true }; line2.userData = { isCloseButton: true };
    this.closeButton.add(line1); this.closeButton.add(line2);
    this.closeButton.userData.xLines = [line1, line2];
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
      gsap.to(mesh.scale, { x: mesh.userData.originalScale.x * 1.3, y: mesh.userData.originalScale.y * 1.3, z: mesh.userData.originalScale.z * 1.3, duration: 0.3, ease: 'back.out' });
    }
  }
  unhighlightItem(index) {
    if (index < 0 || index >= this.itemMeshes.length) return;
    const container = this.itemMeshes[index];
    const mesh = container.userData.mesh;
    if (mesh) {
      mesh.material.color.copy(mesh.userData.originalColor);
      mesh.material.emissive.set(0x000000);
      gsap.to(mesh.scale, { x: mesh.userData.originalScale.x, y: mesh.userData.originalScale.y, z: mesh.userData.originalScale.z, duration: 0.3 });
    }
  }
  selectItem(index, animate = true) {
    console.warn(`[🪩 selectItem] Starting selection: index=${index}, animate=${animate}`);
    if (index < 0 || index >= this.itemMeshes.length) return;
    if (this.selectItemLock) return;
    this.selectItemLock = true;
    try {
      const angleStep = (2 * Math.PI) / this.itemMeshes.length;
      const target = index * angleStep;
      if (this.currentIndex !== index) {
        this.unhighlightItem(this.currentIndex);
      }
      this.highlightItem(index);
      this.currentIndex = index;
      this.targetRotation = target;
      if (animate) {
        gsap.to(this.itemGroup.rotation, { x: target, duration: 0.6, ease: 'power2.out', onComplete: () => { this.selectItemLock = false; console.warn(`[🪩 selectItem] Animation completed for index: ${index}`); } });
      } else {
        this.itemGroup.rotation.x = target;
        this.selectItemLock = false;
      }
      console.warn(`[🪩 selectItem] Selection completed for index: ${index}`);
    } catch (error) {
      console.error('[selectItem] Error:', error);
      this.selectItemLock = false;
    }
  }
  scrollSubmenu(delta) {
    if (this.selectItemLock || this.isAnimating) { console.warn("🚫 scrollSubmenu blocked - locked or animating"); return; }
    const angleStep = (2 * Math.PI) / this.itemMeshes.length;
    this.targetRotation += delta > 0 ? -angleStep : angleStep;
    this.isAnimating = true;
    gsap.to(this.itemGroup.rotation, { x: this.targetRotation, duration: 0.3, ease: 'power3.out', onComplete: () => { this.isAnimating = false; this.updateFrontItemHighlight(); } });
  }
  updateFrontItemHighlight() {
    let frontIndex = 0; let minDistance = Infinity;
    this.itemMeshes.forEach((item, index) => {
      const worldPos = new THREE.Vector3();
      item.getWorldPosition(worldPos);
      const distance = Math.abs(worldPos.z - this.watermillRadius);
      if (distance < minDistance) { minDistance = distance; frontIndex = index; }
    });
    if (frontIndex !== this.currentIndex) { this.unhighlightItem(this.currentIndex); this.highlightItem(frontIndex); this.currentIndex = frontIndex; }
  }
  handleItemClick(index) { console.warn(`[🖱️ handleItemClick] Clicked submenu item at index: ${index}`); if (index < 0 || index >= this.itemMeshes.length) return; this.selectItem(index, true); console.warn(`[🖱️ handleItemClick] Selection completed for index: ${index}`); }
  dispose() {
    console.warn('[Carousel3DSubmenu] 🗑️ Disposing submenu...');
    gsap.killTweensOf(this.itemGroup.rotation);
    this.itemMeshes.forEach((container) => {
      if (container.userData.mesh) { container.userData.mesh.geometry.dispose(); container.userData.mesh.material.dispose(); }
      if (container.userData.hitArea) { container.userData.hitArea.geometry.dispose(); container.userData.hitArea.material.dispose(); }
    });
    if (this.closeButton) {
      this.closeButton.geometry.dispose(); this.closeButton.material.dispose();
      if (this.closeButton.userData.xLines) { this.closeButton.userData.xLines.forEach(line => { line.geometry.dispose(); line.material.dispose(); }); }
    }
    this.itemMeshes = []; this.items = []; this.parentItem = null; this.closeButton = null; this.font = null; this.itemGroup = null; this.fixedElements = null;
    console.warn('[Carousel3DSubmenu] Disposal complete');
  }
}
