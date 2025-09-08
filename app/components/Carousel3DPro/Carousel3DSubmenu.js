import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import gsap from 'gsap';
import { SelectionGuard, withSelectionLock } from './modules/selectionGuards.js';
import { FloatingPreview } from './modules/FloatingPreview.js';

// Cache font to improve performance across instances
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

    // Inputs
    this.parentItem = parentItem;
    this.items = items;
    this.config = config;

    // State
    this.itemMeshes = [];
    this.currentIndex = 0;
    this.watermillRadius = 1.2;
    this.mainCarouselHomeAngle = typeof config.mainCarouselHomeAngle === 'number' ? config.mainCarouselHomeAngle : 0;
    this.rotationAngle = 0;
    this.targetRotation = 0;
    this.rotationSpeed = 0.15;
    this.isInitialized = false;
    this.isAnimating = false;
    this.selectionInProgress = false;
    this.lastSelectTimestamp = 0;

    // Guard for selection/scroll/highlight race conditions
    this.guard = config.guard instanceof SelectionGuard ? config.guard : new SelectionGuard();

    // Structure
    this.itemGroup = new THREE.Group();
    this.add(this.itemGroup);
    this.fixedElements = new THREE.Group();
    this.add(this.fixedElements);

    // Loaders/visibility
    this.fontLoader = new FontLoader();
    this.visible = true;

    // Floating preview manager (lazy init)
    this.previewManager = null;

    // Try cached font first
    if (cachedFont) {
      this.font = cachedFont;
      console.warn('[Carousel3DSubmenu] Using cached font');
      this.createItems();
      this.addCloseButtonPlaceholder();
      this.isInitialized = true;
      if (this.itemMeshes.length > 0) {
        const firstItem = this.itemMeshes[0];
        this.itemGroup.rotation.x = -firstItem.userData.angle + 0;
        this.targetRotation = this.itemGroup.rotation.x;
        this.currentIndex = 0;
        this.highlightItemAtIndex(0);
      }
    } else {
      console.warn('[Carousel3DSubmenu] Loading font...');
      const fontPaths = [
        '/helvetiker_regular.typeface.json',
        '/fonts/helvetiker_regular.typeface.json',
        '/assets/fonts/helvetiker_regular.typeface.json',
        'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
        '/public/helvetiker_regular.typeface.json'
      ];
      this.loadFontWithFallbacks(fontPaths, 0);
    }

    // Position relative to parent slightly forward
    if (this.parentItem) {
      this.position.copy(this.parentItem.position);
      const forwardDir = new THREE.Vector3(0, 0, 0.2);
      forwardDir.applyQuaternion(this.parentItem.quaternion);
      this.position.add(forwardDir);
    }

    // Add close button immediately
    this.addCloseButtonPlaceholder();
  }

  // Lazy GLTFLoader (SSR-safe)
  async getGLTFLoader() {
    if (typeof window === 'undefined') return null;
    const mod = await import('three/examples/jsm/loaders/GLTFLoader.js');
    return new mod.GLTFLoader();
  }

  initPreviewManager() {
    if (!this.scene || !this.camera) return;
    if (this.previewManager) return;
    this.previewManager = new FloatingPreview({
      scene: this.scene,
      camera: this.camera,
      anchorObject: this.config.carousel?.itemGroup || null,
      getPreviewContent: (index) => {
        if (index < 0 || index >= this.itemMeshes.length) return null;
        const sourceContainer = this.itemMeshes[index];
        const sourceIcon = sourceContainer?.userData?.iconMesh;
        const item = this.items[index];

        // Clone icon for preview
        let icon = null;
        if (sourceIcon) {
          if (sourceIcon instanceof THREE.Group) {
            icon = sourceIcon.clone(true);
            icon.traverse((child) => {
              if (child.isMesh && child.material) {
                child.material = child.material.clone();
                child.material.emissive = new THREE.Color(this.getIconColor(index));
                child.material.emissiveIntensity = 0.3;
                child.material.needsUpdate = true;
              }
            });
          } else if (sourceIcon instanceof THREE.Mesh) {
            const clonedGeometry = sourceIcon.geometry.clone();
            const clonedMaterial = sourceIcon.material.clone();
            clonedMaterial.emissive = new THREE.Color(this.getIconColor(index));
            clonedMaterial.emissiveIntensity = 0.5;
            icon = new THREE.Mesh(clonedGeometry, clonedMaterial);
          }
        }

        // Create text label if font is loaded
        let text = null;
        if (this.font) {
          const labelString = item.label || item.title || item.name || item || `Item ${index}`;
          const textGeometry = new TextGeometry(labelString, {
            font: this.font,
            size: 0.3,
            depth: 0.1,
            height: 0.05,
            bevelEnabled: true,
            bevelThickness: 0.01,
            bevelSize: 0.005,
            bevelOffset: 0,
            bevelSegments: 3,
            curveSegments: 8
          });
          textGeometry.computeBoundingBox();
          textGeometry.center();
          const textMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x99ccff,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.9
          });
          text = new THREE.Mesh(textGeometry, textMaterial);
          text.scale.set(0.75, 0.75, 0.75);
          text.updateMatrixWorld();
        }
        return { icon, text };
      }
    });
  }

  loadFontWithFallbacks(paths, index) {
    if (index >= paths.length) {
      console.error('[Carousel3DSubmenu] All font loading attempts failed! Using emergency fallback.');
      this.createFallbackItems();
      return;
    }
    const path = paths[index];
    console.warn(`[Carousel3DSubmenu] Attempting to load font from: ${path}`);
    this.fontLoader.load(
      path,
      (font) => {
        console.warn('[Carousel3DSubmenu] Font loaded successfully!');
        cachedFont = font;
        this.font = font;
        this.createItems();
        this.isInitialized = true;
        if (this.itemMeshes.length > 0) {
          const firstItem = this.itemMeshes[0];
          this.itemGroup.rotation.x = -firstItem.userData.angle + this.mainCarouselHomeAngle;
          this.targetRotation = this.itemGroup.rotation.x;
        }
      },
      undefined,
      (error) => {
        console.warn(`[Carousel3DSubmenu] Font loading failed for ${path}:`, error);
        this.loadFontWithFallbacks(paths, index + 1);
      }
    );
  }

  createFallbackItems() {
    console.warn('[Carousel3DSubmenu] Creating fallback items without text geometry');
    this.items.forEach((item, index) => {
      const container = new THREE.Group();
      container.userData.index = index;
      container.userData.isSubmenuItem = true;
      container.userData.item = item;
      const angle = (index / this.items.length) * (Math.PI * 2);
      container.userData.angle = angle;
      container.userData.originalAngle = angle;

      const planeGeometry = new THREE.PlaneGeometry(1, 0.3);
      const material = new THREE.MeshBasicMaterial({ color: this.config.textColor || 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(planeGeometry, material);
      mesh.userData.originalScale = mesh.scale.clone();
      mesh.userData.originalColor = material.color.clone();
      container.add(mesh);
      container.userData.mesh = mesh;

      const iconGeometry = new THREE.SphereGeometry(0.1, 16, 16);
      const iconMaterial = new THREE.MeshBasicMaterial({ color: this.getIconColor(index), transparent: true, opacity: 0.9 });
      const iconMesh = new THREE.Mesh(iconGeometry, iconMaterial);
      iconMesh.position.x = -0.7;
      iconMesh.userData.originalScale = iconMesh.scale.clone();
      container.add(iconMesh);
      container.userData.iconMesh = iconMesh;

      const hitAreaGeometry = new THREE.BoxGeometry(1.5, 0.5, 0.3);
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
    this.isInitialized = true;
    if (this.itemMeshes.length > 0) this.selectItem(0, false);
  }

  addCloseButtonPlaceholder() {
    const baseGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 24);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xff3333, transparent: true, opacity: 0.45, metalness: 0.5, roughness: 0.3, emissive: 0xff0000, emissiveIntensity: 0.5 });
    this.closeButton = new THREE.Mesh(baseGeometry, baseMaterial);
    this.closeButton.position.set(1.8, 1.8, 0.5);
    this.closeButton.scale.set(0.8, 0.8, 0.8);
    this.closeButton.renderOrder = 9999;
    this.closeButton.userData = { isCloseButton: true, originalColor: baseMaterial.color.clone(), hoverColor: new THREE.Color(0xff0000) };
    this.createCloseButtonX();
    this.fixedElements.add(this.closeButton);
  }

  createCloseButtonX() {
    const lineGeometry1 = new THREE.BoxGeometry(0.22, 0.03, 0.03);
    const lineGeometry2 = new THREE.BoxGeometry(0.22, 0.03, 0.03);
    const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 });
    const line1 = new THREE.Mesh(lineGeometry1, lineMaterial);
    line1.position.set(0, 0, 0.03);
    line1.rotation.y = Math.PI / 4;
    const line2 = new THREE.Mesh(lineGeometry2, lineMaterial);
    line2.position.set(0, 0, 0.03);
    line2.rotation.y = -Math.PI / 4;
    this.closeButton.userData.xLines = [line1, line2];
    line1.userData = { isCloseButton: true };
    line2.userData = { isCloseButton: true };
    this.closeButton.add(line1);
    this.closeButton.add(line2);
  }

  getFrontIndex() {
    if (!this.itemMeshes.length) return -1;
    let closestItem = null;
    let smallestAngleDiff = Infinity;
    let frontIndex = 0;
    this.itemMeshes.forEach((container) => {
      const originalAngle = container.userData.angle || 0;
      const rotationAngle = this.itemGroup.rotation.x || 0;
      const effectiveAngle = (originalAngle - rotationAngle + Math.PI * 2) % (Math.PI * 2);
      const normalizedAngle = effectiveAngle < 0 ? effectiveAngle + Math.PI * 2 : effectiveAngle;
      let angleDiff = Math.abs(normalizedAngle - 0);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
      if (angleDiff < smallestAngleDiff - 0.01) {
        smallestAngleDiff = angleDiff;
        closestItem = container;
      }
    });
    if (closestItem) frontIndex = closestItem.userData.index;
    return frontIndex;
  }

  getIconColor(index) {
    const colors = [0x4285F4, 0xEA4335, 0xFBBC05, 0x34A853, 0xFF9900, 0x00ADEF, 0x7FBA00, 0xF25022];
    return colors[index % colors.length];
  }

  createItems() {
    console.warn('[Carousel3DSubmenu] 📦 Creating items, font available:', !!this.font);
    if (!this.font) return;

    const isGallerySubmenu = this.parentItem?.userData?.item === 'Gallery';
    const regularShapes = [
      () => new THREE.SphereGeometry(0.1, 16, 16),
      () => new THREE.BoxGeometry(0.15, 0.15, 0.15),
      () => new THREE.ConeGeometry(0.1, 0.2, 16),
      () => new THREE.TorusGeometry(0.1, 0.04, 16, 32),
      () => new THREE.TetrahedronGeometry(0.12),
      () => new THREE.OctahedronGeometry(0.12),
      () => new THREE.DodecahedronGeometry(0.12),
      () => new THREE.IcosahedronGeometry(0.12)
    ];

    const galleryShapes = {
      'Photos': () => {
        const group = new THREE.Group();
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.01), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
        const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.14), new THREE.MeshBasicMaterial({ color: 0x2299ff }));
        photo.position.z = 0.006;
        group.add(frame);
        group.add(photo);
        return group;
      },
      'Videos': () => {
        const group = new THREE.Group();
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        const playBtn = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), new THREE.MeshBasicMaterial({ color: 0xff3333 }));
        playBtn.position.z = 0.011;
        group.add(screen);
        group.add(playBtn);
        return group;
      },
      '3D Models': () => {
        const group = new THREE.Group();
        const cube = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x66cc99, wireframe: true }));
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshStandardMaterial({ color: 0x99ff66 }));
        group.add(cube);
        group.add(sphere);
        return group;
      },
      'Artwork': () => {
        const group = new THREE.Group();
        const canvas = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.01), new THREE.MeshStandardMaterial({ color: 0xf5f5f5 }));
        const colors = [0xff3333, 0x3333ff, 0x33ff33, 0xffff33];
        for (let i = 0; i < 4; i++) {
          const x = (i % 2) * 0.08 - 0.04;
          const y = Math.floor(i / 2) * 0.08 - 0.04;
          const square = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.04), new THREE.MeshBasicMaterial({ color: colors[i] }));
          square.position.set(x, y, 0.006);
          group.add(square);
        }
        group.add(canvas);
        return group;
      },
      'Animations': () => {
        const group = new THREE.Group();
        const reel = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 16, 32), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.16), new THREE.MeshStandardMaterial({ color: 0x999999 }));
          spoke.rotation.z = angle;
          group.add(spoke);
        }
        group.add(reel);
        return group;
      },
      'Virtual Tours': () => {
        const group = new THREE.Group();
        const headset = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        const leftLens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), new THREE.MeshBasicMaterial({ color: 0x3399ff }));
        leftLens.position.set(-0.05, 0, 0.051);
        const rightLens = leftLens.clone();
        rightLens.position.set(0.05, 0, 0.051);
        group.add(headset);
        group.add(leftLens);
        group.add(rightLens);
        return group;
      }
    };

    this.items.forEach((item, index) => {
      const itemTitle = typeof item === 'object' ? (item.title || item.label || item.name) : item;
      const geometry = new TextGeometry(itemTitle, {
        font: this.font,
        size: 0.25,
        height: 0.05,
        depth: 0.02,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelOffset: 0,
        bevelSegments: 5
      });
      geometry.computeBoundingBox();
      geometry.center();
      const textWidth = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
      const textHeight = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
      const material = new THREE.MeshStandardMaterial({ color: this.config.textColor || 0xffffff, transparent: true, opacity: 0.9, emissive: this.config.textEmissive || 0x222222, emissiveIntensity: 0.2 });
      const mesh = new THREE.Mesh(geometry, material);

      const container = new THREE.Group();
      container.add(mesh);
      container.userData.index = index;
      const hitAreaWidth = textWidth + 1.2;
      const hitAreaHeight = Math.max(textHeight, 0.6);
      const hitAreaDepth = 0.3;
      const hitArea = new THREE.Mesh(
        new THREE.BoxGeometry(hitAreaWidth, hitAreaHeight, hitAreaDepth),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.01, depthWrite: false })
      );
      hitArea.position.z = -0.1;
      container.add(hitArea);

      let iconMesh = null;
      const iconOffset = Math.max(0.7, textWidth * 0.25);
      let baseScale = new THREE.Vector3(1, 1, 1);

      const itemName = typeof item === 'object' ? (item.name || item.title || item.label) : item;
      const itemShape = typeof item === 'object' ? item.shape : null;

      // Content-managed GLB shape (lazy GLTFLoader)
      if (itemShape && itemShape !== 'null' && itemShape !== 'undefined') {
        this.getGLTFLoader()?.then((loader) => {
          if (!loader) return;
          const modelPath = `/assets/models/${itemShape}.glb`;
          loader.load(
            modelPath,
            (gltf) => {
              const model = gltf.scene;
              baseScale.set(0.3, 0.3, 0.3);
              model.scale.copy(baseScale);
              model.userData.originalScale = baseScale.clone();
              model.position.x = -textWidth / 2 - iconOffset;
              model.userData.isContentManagerIcon = true;
              model.userData.shapeName = itemShape;
              container.add(model);
              container.userData.iconMesh = model;
              model.traverse((child) => {
                if (child.isMesh) {
                  child.material = child.material.clone();
                  child.material.emissive = new THREE.Color(this.getIconColor(index));
                  child.material.emissiveIntensity = 0.3;
                  child.material.needsUpdate = true;
                }
              });
              if (!this.isBeingDisposed && this.visible) {
                const isHighlighted = container.userData.index === this.currentIndex;
                const multiplier = isHighlighted ? 1.3 : 1.0;
                gsap.set(model.scale, { x: 0, y: 0, z: 0 });
                gsap.to(model.scale, {
                  x: model.userData.originalScale.x * multiplier,
                  y: model.userData.originalScale.y * multiplier,
                  z: model.userData.originalScale.z * multiplier,
                  duration: 0.3,
                  ease: 'elastic.out'
                });
                if (isHighlighted && model) {
                  gsap.killTweensOf(model.rotation);
                  gsap.timeline()
                    .to(model.rotation, { y: Math.PI * 2, x: Math.PI * 0.8, z: Math.PI * 0.3, duration: 1.0, ease: 'power1.inOut' })
                    .to(model.rotation, { x: 0, z: 0, duration: 0.3, ease: 'back.out(2)' }, '-=0.1');
                }
              }
            },
            undefined,
            (error) => {
              console.warn(`[Carousel3DSubmenu] ⚠️ Failed to load GLB model ${modelPath}:`, error);
              this.createFallbackIcon(container, index, textWidth, iconOffset, baseScale);
            }
          );
        });
      } else if (itemName === 'Cart') {
        this.getGLTFLoader()?.then((loader) => {
          if (!loader) return;
          loader.load(
            '/assets/Cart.glb',
            (gltf) => {
              const model = gltf.scene;
              baseScale.set(0.3, 0.3, 0.3);
              model.scale.copy(baseScale);
              model.userData.originalScale = baseScale.clone();
              model.position.x = -textWidth / 2 - iconOffset;
              model.userData.isCartIcon = true;
              container.add(model);
              container.userData.iconMesh = model;
              model.traverse((child) => {
                if (child.isMesh) {
                  child.material = child.material.clone();
                  child.material.emissive = new THREE.Color(this.getIconColor(index));
                  child.material.emissiveIntensity = 0.3;
                  child.material.needsUpdate = true;
                }
              });
              if (!this.isBeingDisposed && this.visible) {
                const isHighlighted = container.userData.index === this.currentIndex;
                const multiplier = isHighlighted ? 1.3 : 1.0;
                gsap.set(model.scale, { x: 0, y: 0, z: 0 });
                gsap.to(model.scale, {
                  x: model.userData.originalScale.x * multiplier,
                  y: model.userData.originalScale.y * multiplier,
                  z: model.userData.originalScale.z * multiplier,
                  duration: 0.3,
                  ease: 'elastic.out'
                });
                if (isHighlighted && model) {
                  gsap.killTweensOf(model.rotation);
                  gsap.timeline()
                    .to(model.rotation, { y: Math.PI * 2, x: Math.PI * 0.8, z: Math.PI * 0.3, duration: 1.0, ease: 'power1.inOut' })
                    .to(model.rotation, { x: 0, z: 0, duration: 0.3, ease: 'back.out(2)' }, '-=0.1');
                }
              }
            },
            undefined,
            (error) => {
              console.error('Error loading Cart.glb:', error);
            }
          );
        });
      } else if (isGallerySubmenu && galleryShapes[item]) {
        iconMesh = galleryShapes[item]();
        iconMesh.position.x = -textWidth / 2 - iconOffset;
        iconMesh.userData.originalScale = baseScale.clone();
        container.add(iconMesh);
        container.userData.iconMesh = iconMesh;
        iconMesh.scale.set(0, 0, 0);
      } else {
        const shapeIndex = index % regularShapes.length;
        const shapeGeometry = regularShapes[shapeIndex]();
        const shapeMaterial = new THREE.MeshStandardMaterial({ color: this.getIconColor(index), metalness: 0.3, roughness: 0.4, emissive: this.getIconColor(index), emissiveIntensity: 0.2 });
        iconMesh = new THREE.Mesh(shapeGeometry, shapeMaterial);
        iconMesh.position.x = -textWidth / 2 - iconOffset;
        iconMesh.userData.originalScale = baseScale.clone();
        container.add(iconMesh);
        container.userData.iconMesh = iconMesh;
        iconMesh.scale.set(0, 0, 0);
      }

      if (textWidth > 2) {
        mesh.position.x = iconOffset * 0.3;
      }

      const angle = (index / this.items.length) * (Math.PI * 2);
      container.position.y = this.watermillRadius * Math.sin(angle);
      container.position.z = this.watermillRadius * Math.cos(angle);
      container.userData = {
        index,
        isSubmenuItem: true,
        item,
        angle,
        mesh,
        hitArea,
        originalAngle: angle,
        springVelocity: 0,
        springTarget: 0,
        springStrength: 0.1,
        springDamping: 0.6,
        iconMesh: container.userData?.iconMesh || null
      };
      mesh.userData = { originalScale: mesh.scale.clone(), originalColor: material.color.clone() };
      mesh.scale.set(0, 0, 0);
      hitArea.scale.set(0, 0, 0);
      this.itemMeshes.push(container);
      this.itemGroup.add(container);
    });

    console.warn(`[Carousel3DSubmenu] 📦 Created ${this.itemMeshes.length} items`);
    if (this.itemMeshes.length > 0) {
      this.selectItem(0, false);
    }
  }

  handleWheel(event) {
    event.preventDefault();
    if (!this.guard.canScroll()) return;
    const angleStep = (2 * Math.PI) / this.itemMeshes.length;
    this.targetRotation += (event.deltaY > 0 ? 1 : -1) * angleStep;
    this.targetRotation = this.targetRotation % (2 * Math.PI);
    this.isAnimating = true;
    if (this.floatingPreview && this.showingPreview) {
      this.closeFloatingPreview?.();
    }
    gsap.killTweensOf(this.itemGroup.rotation);
    gsap.to(this.itemGroup.rotation, {
      x: this.targetRotation,
      duration: 0.3,
      ease: 'power3.out',
      onUpdate: () => {
        if (this.guard.canUpdateHighlight()) {
          const frontIndex = this.getFrontIndex();
          if (frontIndex !== -1 && frontIndex !== this.currentIndex) {
            this.currentIndex = frontIndex;
            this.highlightItemAtIndex(frontIndex);
          }
        }
      },
      onComplete: () => {
        this.isAnimating = false;
        if (this.guard.canUpdateHighlight()) {
          const frontIndex = this.getFrontIndex();
          if (frontIndex !== -1 && frontIndex !== this.currentIndex) {
            this.currentIndex = frontIndex;
            this.highlightItemAtIndex(frontIndex);
          }
        }
      }
    });
  }

  highlightItemAtIndex(index) {
    if (index < 0 || index >= this.itemMeshes.length) return;
    this.itemMeshes.forEach((container, i) => {
      if (i === index) return;
      const mesh = container.userData.mesh;
      const iconMesh = container.userData.iconMesh;
      if (mesh && mesh.userData?.originalColor) {
        mesh.material.color.copy(mesh.userData.originalColor);
        mesh.material.emissive.set(0x000000);
        mesh.scale.copy(mesh.userData.originalScale);
      }
      if (iconMesh) {
        const iconOriginal = iconMesh.userData.originalScale || new THREE.Vector3(1, 1, 1);
        iconMesh.scale.copy(iconOriginal);
        if (!gsap.isTweening(iconMesh.rotation)) iconMesh.rotation.set(0, 0, 0);
      }
    });
    const container = this.itemMeshes[index];
    const mesh = container.userData.mesh;
    const iconMesh = container.userData.iconMesh;
    if (mesh) {
      mesh.material.color.set(this.config.highlightColor || 0x00ffff);
      mesh.material.emissive.set(0x003333);
      gsap.to(mesh.scale, { x: mesh.userData.originalScale.x * 1.3, y: mesh.userData.originalScale.y * 1.3, z: mesh.userData.originalScale.z * 1.3, duration: 0.3 });
    }
    if (iconMesh) {
      const s = iconMesh.userData.originalScale || new THREE.Vector3(1, 1, 1);
      gsap.to(iconMesh.scale, { x: s.x * 1.3, y: s.y * 1.3, z: s.z * 1.3, duration: 0.3, ease: 'back.out' });
      gsap.killTweensOf(iconMesh.rotation);
      gsap.timeline()
        .to(iconMesh.rotation, { x: Math.PI * 0.8, y: Math.PI * 2, z: Math.PI * 0.5, duration: 1, ease: 'power1.inOut' })
        .to(iconMesh.rotation, { x: 0, z: 0, duration: 0.3, ease: 'back.out(2)' }, '-=0.1');
    }
  }

  selectItem(index, animate = true, createPreview = false) {
    if (this.selectionInProgress) return;
    if (index < 0 || index >= this.itemMeshes.length) return;
    if (!this.guard || typeof this.guard.lockSelection !== 'function') this.guard = new SelectionGuard();

    return withSelectionLock(this.guard, index, () => {
      const selected = this.itemMeshes[index];
      const selectedAngle = selected.userData.angle;
      const currentAngle = this.itemGroup.rotation.x;
      const desiredAngle = selectedAngle + this.mainCarouselHomeAngle;
      const twoPi = Math.PI * 2;
      let delta = ((desiredAngle - currentAngle + Math.PI) % twoPi) - Math.PI;
      const target = currentAngle + delta;

      if (this.currentIndex !== index && this.itemMeshes[this.currentIndex]) {
        const prev = this.itemMeshes[this.currentIndex];
        const mesh = prev.userData.mesh;
        const icon = prev.userData.iconMesh;
        if (mesh) {
          mesh.material.color.copy(mesh.userData.originalColor);
          mesh.material.emissive.set(0x000000);
          gsap.to(mesh.scale, { ...mesh.userData.originalScale, duration: 0.3 });
        }
        if (icon) {
          gsap.to(icon.scale, { ...icon.userData.originalScale, duration: 0.3 });
          gsap.killTweensOf(icon.rotation);
          gsap.set(icon.rotation, { x: 0, y: 0, z: 0 });
        }
      }

      const mesh = selected.userData.mesh;
      const icon = selected.userData.iconMesh;
      if (mesh) {
        mesh.material.color.set(this.config.highlightColor || 0x00ffff);
        mesh.material.emissive.set(0x003333);
        gsap.to(mesh.scale, { x: mesh.userData.originalScale.x * 1.3, y: mesh.userData.originalScale.y * 1.3, z: mesh.userData.originalScale.z * 1.3, duration: 0.3 });
      }
      if (icon) {
        const s = icon.userData.originalScale || new THREE.Vector3(1, 1, 1);
        gsap.to(icon.scale, { x: s.x * 1.3, y: s.y * 1.3, z: s.z * 1.3, duration: 0.3, ease: 'back.out' });
        gsap.killTweensOf(icon.rotation);
        gsap.timeline()
          .to(icon.rotation, { x: Math.PI * 0.8, y: Math.PI * 2, z: Math.PI * 0.5, duration: 1, ease: 'power1.inOut' })
          .to(icon.rotation, { x: 0, z: 0, duration: 0.3, ease: 'back.out(2)' }, '-=0.1');
      }

      const finish = () => {
        this.currentIndex = index;
        this.targetRotation = target;
        this.selectionInProgress = false;
      };

      if (animate) {
        gsap.to(this.itemGroup.rotation, { x: target, duration: 0.6, ease: 'power2.out', onComplete: finish });
      } else {
        this.itemGroup.rotation.x = target;
        finish();
      }

      if (createPreview) {
        this.showingPreview = true;
        if (!this.previewManager) this.initPreviewManager();
        if (this.previewManager) this.previewManager.create(index);
      }
      this.lastSelectTimestamp = Date.now();
    }, { lockRotation: true });
  }

  scrollSubmenu(delta) {
    if (!this.guard.canScroll()) return;
    const angleStep = (2 * Math.PI) / this.itemMeshes.length;
    this.targetRotation += delta > 0 ? -angleStep : angleStep;
    gsap.to(this.itemGroup.rotation, {
      x: this.targetRotation,
      duration: 0.3,
      ease: 'power3.out',
      onUpdate: () => this.updateFrontItemHighlight(true),
      onComplete: () => {
        this.isAnimating = false;
        this.updateFrontItemHighlight(true);
        if (this.showingPreview && this.previewManager) this.previewManager.update(this.currentIndex);
      }
    });
  }

  show() {
    this.visible = true;
    if (!this.itemMeshes.length && this.font && this.items?.length) {
      this.createItems();
      this.isInitialized = true;
    }
    if (this.closeButton) {
      this.closeButton.scale.set(1, 1, 1);
      if (this.closeButton.userData?.xLines) {
        this.closeButton.userData.xLines.forEach((l) => {
          l.scale.set(1, 1, 1);
          l.visible = true;
          if (l.material) l.material.needsUpdate = true;
        });
      }
      gsap.fromTo(this.closeButton.scale, { x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 1, z: 1, duration: 0.3, delay: 0.2, ease: 'back.out' });
    }
    if (this.itemGroup) {
      this.itemGroup.scale.set(0.1, 0.1, 0.1);
      gsap.to(this.itemGroup.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'back.out(1.7)' });
      gsap.from(this.itemGroup.rotation, { y: Math.PI, duration: 0.6, ease: 'power2.out' });
    }
    this.itemMeshes.forEach((container, i) => {
      const mesh = container.userData.mesh;
      const iconMesh = container.userData.iconMesh;
      const hitArea = container.userData.hitArea;
      const isHighlighted = i === 0;
      const textMultiplier = isHighlighted ? 1.3 : 1.0;
      gsap.to(mesh.scale, { x: mesh.userData.originalScale.x * textMultiplier, y: mesh.userData.originalScale.y * textMultiplier, z: mesh.userData.originalScale.z * textMultiplier, duration: 0.3, delay: i * 0.05, ease: 'back.out' });
      if (iconMesh) {
        const iconOriginal = iconMesh.userData.originalScale || new THREE.Vector3(1, 1, 1);
        const iconMultiplier = isHighlighted ? 1.3 : 1.0;
        gsap.fromTo(iconMesh.scale, { x: 0, y: 0, z: 0 }, { x: iconOriginal.x * iconMultiplier, y: iconOriginal.y * iconMultiplier, z: iconOriginal.z * iconMultiplier, duration: 0.3, delay: i * 0.05 + 0.1, ease: 'elastic.out' });
        if (isHighlighted) {
          gsap.killTweensOf(iconMesh.rotation);
          gsap.timeline()
            .to(iconMesh.rotation, { y: Math.PI * 2, x: Math.PI * 0.8, z: Math.PI * 0.5, duration: 1.0, delay: i * 0.05 + 0.1, ease: 'power1.inOut' })
            .to(iconMesh.rotation, { x: 0, z: 0, duration: 0.3, ease: 'back.out(2)' }, '-=0.1');
        } else if (!gsap.isTweening(iconMesh.rotation)) {
          iconMesh.rotation.set(0, 0, 0);
        }
      }
      if (hitArea) gsap.to(hitArea.scale, { x: 1, y: 1, z: 1, duration: 0.1, delay: i * 0.05 });
    });
    return Promise.resolve();
  }

  hide() {
    if (this.previewManager) this.previewManager.dispose();
    this.showingPreview = false;
    this.itemMeshes.forEach((container, i) => {
      const mesh = container.userData.mesh;
      const iconMesh = container.userData.iconMesh;
      gsap.to(mesh.scale, { x: 0, y: 0, z: 0, duration: 0.2, delay: i * 0.03, ease: 'back.in' });
      if (iconMesh) gsap.to(iconMesh.scale, { x: 0, y: 0, z: 0, duration: 0.2, delay: i * 0.03, ease: 'back.in' });
    });
    if (this.closeButton) gsap.to(this.closeButton.scale, { x: 0, y: 0, z: 0, duration: 0.2, ease: 'back.in' });
    return Promise.resolve();
  }

  update() {
    try {
      if (this.parentItem && this.parentItem.parent) {
        const parentWorldPos = new THREE.Vector3();
        this.parentItem.getWorldPosition(parentWorldPos);
        if (!isNaN(parentWorldPos.x)) this.position.copy(parentWorldPos);
        const parentRot = this.parentItem.rotation?.y;
        const grandParentRot = this.parentItem.parent.rotation?.y;
        if (!isNaN(parentRot)) {
          this.rotation.y = isNaN(grandParentRot) ? parentRot : grandParentRot + parentRot;
        }
      }
      if (this.itemMeshes?.length) {
        this.itemMeshes.forEach((container, i) => {
          if (!container?.userData) return;
          const mesh = container.userData.mesh;
          const iconMesh = container.userData.iconMesh;
          if (!mesh) return;
          if (i !== this.currentIndex && mesh.userData?.originalColor) {
            mesh.material.color.copy(mesh.userData.originalColor);
            mesh.material.emissive.set(0x000000);
            mesh.scale.copy(mesh.userData.originalScale);
            if (iconMesh) {
              const iconOriginal = iconMesh.userData.originalScale || new THREE.Vector3(1, 1, 1);
              iconMesh.scale.copy(iconOriginal);
              if (!gsap.isTweening(iconMesh.rotation)) iconMesh.rotation.set(0, 0, 0);
            }
          }
          container.rotation.x = -this.itemGroup.rotation.x;
          container.rotation.y = 0;
          container.position.y = this.watermillRadius * Math.sin(container.userData.angle);
          container.position.z = this.watermillRadius * Math.cos(container.userData.angle);
        });
      }
      if (this.isAnimating) return;
      const twoPi = Math.PI * 2;
      const normalize = (angle) => ((angle % twoPi) + twoPi) % twoPi;
      const current = normalize(this.itemGroup.rotation.x);
      const target = normalize(this.targetRotation);
      const diff = target - current;
      const threshold = 0.005;
      if (Math.abs(diff) > threshold) {
        this.itemGroup.rotation.x += diff * this.rotationSpeed;
        this.isSpinning = true;
      } else if (this.isSpinning) {
        this.itemGroup.rotation.x = this.targetRotation;
        this.isSpinning = false;
        const recentlySelected = Date.now() - (this.lastSelectTimestamp || 0) < 500;
        if (
          !this.selectionInProgress &&
          this.guard?.canUpdateHighlight(true) &&
          !gsap.isTweening(this.itemGroup.rotation) &&
          !recentlySelected
        ) {
          const frontIndex = this.getFrontIndex();
          if (frontIndex !== -1 && frontIndex !== this.currentIndex) {
            this.currentIndex = frontIndex;
            this.highlightItemAtIndex(frontIndex);
          }
        }
      }
      if (this.closeButton) {
        const cameraPosWorld = new THREE.Vector3(0, 0, 10);
        this.closeButton.parent.worldToLocal(cameraPosWorld);
        this.closeButton.lookAt(cameraPosWorld);
        this.closeButton.rotateZ(Math.PI / 2);
      }
      if (this.previewManager && this.parentItem?.parent) {
        if (this.parentItem.parent.rotation.y !== this.lastParentRotation) {
          this.previewManager.updateRotation(this.parentItem.parent.rotation.y);
        } else if (!this.isSpinning && this.showingPreview) {
          this.previewManager.startSpin();
        }
        this.lastParentRotation = this.parentItem.parent.rotation.y;
      }
    } catch (error) {
      console.error('Error in Carousel3DSubmenu update():', error);
      this.isErrorState = true;
    }
  }

  updateFrontItemHighlight(force = false) {
    if (!this.guard.canUpdateHighlight(force)) return;
    // Determine front index by angle
    const frontIndex = this.getFrontIndex();
    if (frontIndex !== -1 && frontIndex !== this.currentIndex) {
      this.currentIndex = frontIndex;
      this.highlightItemAtIndex(frontIndex);
    }
  }

  updateCurrentItemFromRotation() {
    if (this.forceSelectLock) return;
  }

  createFallbackIcon(container, index, textWidth, iconOffset, baseScale) {
    const regularShapes = [
      () => new THREE.SphereGeometry(0.1, 16, 16),
      () => new THREE.BoxGeometry(0.15, 0.15, 0.15),
      () => new THREE.ConeGeometry(0.1, 0.2, 16),
      () => new THREE.TorusGeometry(0.1, 0.04, 16, 32),
      () => new THREE.TetrahedronGeometry(0.12),
      () => new THREE.OctahedronGeometry(0.12),
      () => new THREE.DodecahedronGeometry(0.12),
      () => new THREE.IcosahedronGeometry(0.12)
    ];
    const shapeIndex = index % regularShapes.length;
    const shapeGeometry = regularShapes[shapeIndex]();
    const shapeMaterial = new THREE.MeshStandardMaterial({ color: this.getIconColor(index), metalness: 0.3, roughness: 0.4, emissive: this.getIconColor(index), emissiveIntensity: 0.2 });
    const iconMesh = new THREE.Mesh(shapeGeometry, shapeMaterial);
    iconMesh.position.x = -textWidth / 2 - iconOffset;
    iconMesh.userData.originalScale = baseScale.clone();
    container.add(iconMesh);
    container.userData.iconMesh = iconMesh;
    iconMesh.scale.set(0, 0, 0);
    return iconMesh;
  }

  handleItemClick(index) {
    if (index < 0 || index >= this.itemMeshes.length) return;
    this.selectItem(index, true);
  }

  dispose() {
    if (this.isDisposed || this.isBeingDisposed) return;
    this.isBeingDisposed = true;
    gsap.killTweensOf(this.itemGroup?.rotation);
    if (this.itemMeshes) {
      this.itemMeshes.forEach((container) => {
        if (!container) return;
        if (container.userData?.mesh) {
          gsap.killTweensOf(container.userData.mesh.scale);
          gsap.killTweensOf(container.userData.mesh.material);
        }
        if (container.userData?.iconMesh) {
          gsap.killTweensOf(container.userData.iconMesh.scale);
          gsap.killTweensOf(container.userData.iconMesh.rotation);
        }
        if (container.parent) container.parent.remove(container);
        if (container.children) {
          container.children.forEach((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
              else child.material.dispose();
            }
          });
        }
      });
    }
    this.itemMeshes = [];
    if (this.closeButton) {
      gsap.killTweensOf(this.closeButton.scale);
      if (this.closeButton.children) {
        this.closeButton.children.forEach((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        });
      }
      if (this.closeButton.parent) this.closeButton.parent.remove(this.closeButton);
      this.closeButton = null;
    }
    if (this.parent) this.parent.remove(this);
    if (this.matrix) this.matrix.identity();
    if (this.matrixWorld) this.matrixWorld.identity();
    this.currentIndex = -1;
    this.parentItem = null;
    this.itemGroup = null;
    this.fixedElements = null;
    this.isDisposed = true;
    if (this.floatingPreview) {
      gsap.killTweensOf(this.floatingPreview.rotation);
      gsap.killTweensOf(this.floatingPreview.scale);
      if (this.floatingPreview.parent) this.floatingPreview.parent.remove(this.floatingPreview);
      this.floatingPreview.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      this.floatingPreview = null;
    }
    if (this.previewManager) {
      this.previewManager.dispose();
      this.previewManager = null;
    }
  }
}