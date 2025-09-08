// Archived from backup/components/Carousel3DPro/Carousel3DSubmenu_SIMPLIFIED_20250907.js on 2025-09-07
// Simplified temporary variant used to unblock builds. Kept for historical reference.

import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import gsap from 'gsap';

let cachedFont = null;

const defaultTheme = { textColor: 0xffffff, highlightColor: 0x00ffff };

export class Carousel3DSubmenu extends THREE.Group {
  constructor(parentItem, items = [], config = {}) {
    super();
    this.name = 'Carousel3DSubmenu';
    this.parentItem = parentItem;
    this.items = items;
    this.config = { ...defaultTheme, ...config };
    this.itemMeshes = [];
    this.currentIndex = 0;
    this.watermillRadius = 1.2;
    this.rotationSpeed = 0.15;
    this.rotationAngle = 0;
    this.targetRotation = 0;
    this.isAnimating = false;
    this.isInitialized = false;
    this.selectItemLock = false;

    this.itemGroup = new THREE.Group();
    this.add(this.itemGroup);
    this.fixedElements = new THREE.Group();
    this.add(this.fixedElements);
    this.visible = true;

    this.fontLoader = new FontLoader();
    if (cachedFont) {
      this.font = cachedFont;
      this.createItems();
      this.addCloseButton();
      this.isInitialized = true;
      if (this.itemMeshes.length > 0) {
        this.itemGroup.rotation.x = 0;
        this.targetRotation = 0;
        this.currentIndex = 0;
        this.highlightItem(0);
      }
    } else {
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
    if (pathIndex >= fontPaths.length) { console.error('[Carousel3DSubmenu] All font paths failed'); return; }
    const currentPath = fontPaths[pathIndex];
    this.fontLoader.load(currentPath, (font) => {
      this.font = font; cachedFont = font; this.createItems(); this.addCloseButton(); this.isInitialized = true;
      if (this.itemMeshes.length > 0) { this.itemGroup.rotation.x = 0; this.targetRotation = 0; this.currentIndex = 0; this.highlightItem(0); }
    }, undefined, () => this.loadFontSequentially(fontPaths, pathIndex + 1));
  }
  createItems() {
    if (!this.font || !this.items.length) return;
    this.items.forEach((item, index) => {
      const container = new THREE.Group();
      const angle = (index / this.items.length) * 2 * Math.PI;
      const geometry = new TextGeometry(String(item), { font: this.font, size: 0.15, height: 0.02, curveSegments: 16, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.002, bevelOffset: 0, bevelSegments: 8 });
      geometry.center();
      const material = new THREE.MeshStandardMaterial({ color: this.config.textColor, metalness: 0.3, roughness: 0.4 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.originalColor = material.color.clone();
      mesh.userData.originalScale = mesh.scale.clone();
      container.add(mesh);
      const hitAreaGeometry = new THREE.BoxGeometry(0.8, 0.4, 0.2);
      const hitAreaMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.01, depthWrite: false });
      const hitArea = new THREE.Mesh(hitAreaGeometry, hitAreaMaterial);
      hitArea.position.z = -0.1;
      container.add(hitArea);
      container.userData.mesh = mesh; container.userData.hitArea = hitArea; container.userData.isSubmenuItem = true; container.userData.index = index; container.userData.angle = angle;
      container.position.y = this.watermillRadius * Math.sin(angle);
      container.position.z = this.watermillRadius * Math.cos(angle);
      this.itemMeshes.push(container); this.itemGroup.add(container);
    });
    console.warn(`[Carousel3DSubmenu] Created ${this.itemMeshes.length} items`);
  }
  addCloseButton() {
    const baseGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 24);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xff3333, transparent: true, opacity: 0.8, metalness: 0.5, roughness: 0.3, emissive: 0xff0000, emissiveIntensity: 0.3 });
    this.closeButton = new THREE.Mesh(baseGeometry, baseMaterial);
    this.closeButton.position.set(1.8, 1.8, 0.5);
    this.closeButton.renderOrder = 9999;
    this.closeButton.userData = { isCloseButton: true, originalColor: baseMaterial.color.clone(), hoverColor: new THREE.Color(0xff0000) };
    const lineGeometry1 = new THREE.BoxGeometry(0.22, 0.03, 0.03);
    const lineGeometry2 = new THREE.BoxGeometry(0.22, 0.03, 0.03);
    const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 });
    const line1 = new THREE.Mesh(lineGeometry1, lineMaterial); const line2 = new THREE.Mesh(lineGeometry2, lineMaterial);
    line1.position.set(0, 0, 0.03); line1.rotation.y = Math.PI / 4;
    line2.position.set(0, 0, 0.03); line2.rotation.y = -Math.PI / 4;
    line1.userData = { isCloseButton: true }; line2.userData = { isCloseButton: true };
    this.closeButton.add(line1); this.closeButton.add(line2);
    this.closeButton.userData.xLines = [line1, line2];
    this.fixedElements.add(this.closeButton);
  }
  highlightItem(index) { if (index < 0 || index >= this.itemMeshes.length) return; const mesh = this.itemMeshes[index].userData.mesh; if (!mesh) return; mesh.material.color.set(this.config.highlightColor || 0x00ffff); mesh.material.emissive = new THREE.Color(0x003333); gsap.to(mesh.scale, { x: mesh.userData.originalScale.x * 1.3, y: mesh.userData.originalScale.y * 1.3, z: mesh.userData.originalScale.z * 1.3, duration: 0.3, ease: 'back.out' }); }
  unhighlightItem(index) { if (index < 0 || index >= this.itemMeshes.length) return; const mesh = this.itemMeshes[index].userData.mesh; if (!mesh) return; mesh.material.color.copy(mesh.userData.originalColor); mesh.material.emissive = new THREE.Color(0x000000); gsap.to(mesh.scale, { x: mesh.userData.originalScale.x, y: mesh.userData.originalScale.y, z: mesh.userData.originalScale.z, duration: 0.3 }); }
  selectItem(index, animate = true) { if (index < 0 || index >= this.itemMeshes.length) return; if (this.selectItemLock) return; this.selectItemLock = true; const angleStep = (2 * Math.PI) / this.itemMeshes.length; const target = index * angleStep; if (this.currentIndex !== index) this.unhighlightItem(this.currentIndex); this.highlightItem(index); this.currentIndex = index; this.targetRotation = target; if (animate) { gsap.to(this.itemGroup.rotation, { x: target, duration: 0.6, ease: 'power2.out', onComplete: () => { this.selectItemLock = false; } }); } else { this.itemGroup.rotation.x = target; this.selectItemLock = false; } }
  scrollSubmenu(delta) { if (this.selectItemLock || this.isAnimating) return; const angleStep = (2 * Math.PI) / this.itemMeshes.length; this.targetRotation += delta > 0 ? -angleStep : angleStep; this.isAnimating = true; gsap.to(this.itemGroup.rotation, { x: this.targetRotation, duration: 0.3, ease: 'power3.out', onComplete: () => { this.isAnimating = false; this.updateFrontItemHighlight(); } }); }
  updateFrontItemHighlight() { let frontIndex = 0; let minDistance = Infinity; const tmp = new THREE.Vector3(); this.itemMeshes.forEach((item, index) => { item.getWorldPosition(tmp); const distance = Math.abs(tmp.z - this.watermillRadius); if (distance < minDistance) { minDistance = distance; frontIndex = index; } }); if (frontIndex !== this.currentIndex) { this.unhighlightItem(this.currentIndex); this.highlightItem(frontIndex); this.currentIndex = frontIndex; } }
  handleItemClick(index) { if (index < 0 || index >= this.itemMeshes.length) return; this.selectItem(index, true); }
  show() { return new Promise((resolve) => { this.itemMeshes.forEach((container, i) => { const mesh = container.userData.mesh; if (!mesh) return; mesh.scale.set(0, 0, 0); gsap.to(mesh.scale, { x: mesh.userData.originalScale.x, y: mesh.userData.originalScale.y, z: mesh.userData.originalScale.z, duration: 0.25, delay: i * 0.03, ease: 'back.out' }); }); if (this.closeButton) { this.closeButton.scale.set(0.5, 0.5, 0.5); gsap.to(this.closeButton.scale, { x: 1, y: 1, z: 1, duration: 0.25, delay: 0.15, ease: 'back.out' }); } if (this.itemMeshes.length) { this.itemGroup.rotation.x = 0; this.targetRotation = 0; this.currentIndex = 0; this.highlightItem(0); } setTimeout(resolve, 350); }); }
  hide() { return new Promise((resolve) => { this.itemMeshes.forEach((container, i) => { const mesh = container.userData.mesh; if (!mesh) return; gsap.to(mesh.scale, { x: 0, y: 0, z: 0, duration: 0.2, delay: i * 0.02, ease: 'back.in' }); }); if (this.closeButton) { gsap.to(this.closeButton.scale, { x: 0, y: 0, z: 0, duration: 0.2, ease: 'back.in' }); } setTimeout(resolve, 260); }); }
  update() { try { if (this.parentItem && this.parentItem.parent) { const parentWorldPos = new THREE.Vector3(); this.parentItem.getWorldPosition(parentWorldPos); if (!isNaN(parentWorldPos.x)) this.position.copy(parentWorldPos); const parentRot = this.parentItem.rotation?.y; const grandParentRot = this.parentItem.parent.rotation?.y; if (!isNaN(parentRot)) this.rotation.y = isNaN(grandParentRot) ? parentRot : grandParentRot + parentRot; } this.itemMeshes.forEach((container) => { container.rotation.x = -this.itemGroup.rotation.x; container.rotation.y = 0; container.position.y = this.watermillRadius * Math.sin(container.userData.angle); container.position.z = this.watermillRadius * Math.cos(container.userData.angle); }); if (!this.isAnimating && !gsap.isTweening(this.itemGroup.rotation)) { const twoPi = Math.PI * 2; const norm = (a) => ((a % twoPi) + twoPi) % twoPi; const current = norm(this.itemGroup.rotation.x); const target = norm(this.targetRotation); const diff = target - current; const threshold = 0.005; if (Math.abs(diff) > threshold) { this.itemGroup.rotation.x += diff * this.rotationSpeed; } } if (this.closeButton && this.camera) { const cameraPosWorld = new THREE.Vector3().copy(this.camera.position); this.closeButton.parent?.worldToLocal(cameraPosWorld); this.closeButton.lookAt(cameraPosWorld); this.closeButton.rotateZ(Math.PI / 2); } } catch (err) { console.error('[Carousel3DSubmenu] update error', err); } }
  dispose() { try { gsap.killTweensOf(this.itemGroup.rotation); this.itemMeshes.forEach((container) => { const mesh = container.userData?.mesh; const hit = container.userData?.hitArea; if (mesh) { mesh.geometry?.dispose(); mesh.material?.dispose(); } if (hit) { hit.geometry?.dispose(); hit.material?.dispose(); } if (container.parent) container.parent.remove(container); }); this.itemMeshes = []; if (this.closeButton) { this.closeButton.geometry?.dispose(); this.closeButton.material?.dispose(); this.closeButton.userData?.xLines?.forEach((line) => { line.geometry?.dispose(); line.material?.dispose(); }); if (this.closeButton.parent) this.closeButton.parent.remove(this.closeButton); this.closeButton = null; } if (this.parent) this.parent.remove(this); this.items = []; this.parentItem = null; this.itemGroup = null; this.fixedElements = null; } catch (e) { console.error('[Carousel3DSubmenu] dispose error', e); } }
}
