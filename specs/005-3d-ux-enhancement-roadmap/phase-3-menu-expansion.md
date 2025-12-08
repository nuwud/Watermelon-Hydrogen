# Phase 3: Menu Expansion System

> **Parent Spec:** `specs/005-3d-ux-enhancement-roadmap/spec.md`  
> **Status:** Planning  
> **Priority:** High (Core Feature)  
> **Estimated Effort:** 4-6 sessions  
> **Dependencies:** Phase 1 & 2 complete

---

## Overview

The transformative feature: when a submenu item is selected, the menu ring expands/scatters outward, leaving only the central content display visible. This creates an immersive, focused content experience.

**Key Architecture:** The central display uses a **Modular Section System** inspired by Shopify's theme Sections, but designed for 3D space. This allows for:
- Pluggable content types (products, galleries, blogs, custom)
- Reusable Section components for HUD, panels, and displays
- Admin-configurable Section ordering and settings
- Future extensibility without core code changes

---

## Modular Section System (Shopify-Inspired)

### What Are 3D Sections?

In Shopify themes, **Sections** are modular blocks that merchants can add, remove, and reorder via the theme editor. We're creating the 3D equivalent:

```
┌─────────────────────────────────────────────────────────────┐
│                    3D SECTION REGISTRY                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CONTENT SECTIONS (Central Display)                          │
│  ├── Product3DSection      - GLB model viewer                │
│  ├── ProductGallerySection - Image carousel in 3D            │
│  ├── TextContentSection    - 3D text for blogs/articles      │
│  ├── VideoSection          - Video panel in 3D space         │
│  ├── StoreWalkthroughSection - Full 3D environment           │
│  ├── CheckoutSection       - Embedded checkout (from 001)    │
│  └── CustomEmbedSection    - iFrame/HTML in 3D panel         │
│                                                              │
│  HUD SECTIONS (Camera-Relative)                              │
│  ├── CartHUDSection        - Cart icon with badge            │
│  ├── MenuToggleSection     - Menu show/hide button           │
│  ├── BreadcrumbSection     - Navigation trail                │
│  ├── SearchSection         - Search interface                │
│  └── UserAccountSection    - Login/account status            │
│                                                              │
│  UTILITY SECTIONS                                            │
│  ├── MiniPreviewSection    - Floating preview after return   │
│  ├── LoadingSection        - Loading indicators              │
│  └── NotificationSection   - Toast/alert messages            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Section Base Class

```javascript
/**
 * Base class for all 3D Sections
 * Similar to Shopify's Section architecture but for Three.js
 */
class Section3D {
  static type = 'base';           // Unique section type identifier
  static category = 'content';    // 'content' | 'hud' | 'utility'
  static displayName = 'Base Section';
  static icon = '📦';
  
  // Schema for admin configuration (like Shopify section schema)
  static schema = {
    settings: [],  // Section-level settings
    blocks: [],    // Repeatable block types within section
    presets: []    // Default configurations
  };
  
  constructor(container, config = {}) {
    this.container = container;
    this.config = config;
    this.group = new THREE.Group();
    this.group.name = `section-${this.constructor.type}`;
    this.isLoaded = false;
    this.isVisible = false;
  }
  
  // Lifecycle methods
  async load(data) { throw new Error('Implement in subclass'); }
  async unload() { this.dispose(); }
  
  show(animate = true) {
    this.isVisible = true;
    this.group.visible = true;
    if (animate) {
      gsap.from(this.group.scale, { x: 0.9, y: 0.9, z: 0.9, duration: 0.3 });
      gsap.from(this.group, { opacity: 0, duration: 0.3 });
    }
  }
  
  hide(animate = true) {
    this.isVisible = false;
    if (animate) {
      gsap.to(this.group.scale, { 
        x: 0.9, y: 0.9, z: 0.9, 
        duration: 0.2,
        onComplete: () => { this.group.visible = false; }
      });
    } else {
      this.group.visible = false;
    }
  }
  
  update(deltaTime) { /* Override for animations */ }
  
  dispose() {
    this.group.traverse(child => {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m?.dispose());
      } else {
        child.material?.dispose();
      }
    });
    this.container.remove(this.group);
  }
  
  // For mini-preview system
  createThumbnail() {
    const clone = this.group.clone();
    clone.scale.setScalar(0.15);
    return clone;
  }
  
  // Admin configuration
  getConfig() { return this.config; }
  setConfig(newConfig) { 
    this.config = { ...this.config, ...newConfig };
    this.applyConfig();
  }
  applyConfig() { /* Override to react to config changes */ }
}
```

### Section Registry

```javascript
/**
 * Central registry for all available 3D Sections
 * Manages registration, instantiation, and discovery
 */
const SectionRegistry = {
  sections: new Map(),
  
  register(SectionClass) {
    if (!SectionClass.type) {
      throw new Error('Section must have static type property');
    }
    this.sections.set(SectionClass.type, SectionClass);
    console.log(`[SectionRegistry] Registered: ${SectionClass.type}`);
  },
  
  get(type) {
    return this.sections.get(type);
  },
  
  create(type, container, config) {
    const SectionClass = this.sections.get(type);
    if (!SectionClass) {
      console.warn(`[SectionRegistry] Unknown section type: ${type}`);
      return null;
    }
    return new SectionClass(container, config);
  },
  
  listByCategory(category) {
    return Array.from(this.sections.values())
      .filter(S => S.category === category);
  },
  
  getSchema(type) {
    const SectionClass = this.sections.get(type);
    return SectionClass?.schema || null;
  },
  
  // For admin UI - list all available sections
  getAvailableSections() {
    return Array.from(this.sections.values()).map(S => ({
      type: S.type,
      category: S.category,
      displayName: S.displayName,
      icon: S.icon,
      schema: S.schema
    }));
  }
};

// Auto-register built-in sections
import { Product3DSection } from './sections/Product3DSection';
import { ProductGallerySection } from './sections/ProductGallerySection';
import { TextContentSection } from './sections/TextContentSection';
import { CartHUDSection } from './sections/CartHUDSection';
// ... etc

SectionRegistry.register(Product3DSection);
SectionRegistry.register(ProductGallerySection);
SectionRegistry.register(TextContentSection);
SectionRegistry.register(CartHUDSection);
```

### Section Manager

```javascript
/**
 * Manages active sections in a container (center display or HUD)
 */
class SectionManager {
  constructor(container, options = {}) {
    this.container = container;
    this.activeSections = new Map();
    this.sectionOrder = [];
    this.options = options;
  }
  
  async addSection(type, config = {}, position = -1) {
    const section = SectionRegistry.create(type, this.container, config);
    if (!section) return null;
    
    const id = `${type}-${Date.now()}`;
    this.activeSections.set(id, section);
    
    if (position === -1) {
      this.sectionOrder.push(id);
    } else {
      this.sectionOrder.splice(position, 0, id);
    }
    
    this.container.add(section.group);
    this.updateLayout();
    
    return { id, section };
  }
  
  removeSection(id) {
    const section = this.activeSections.get(id);
    if (section) {
      section.dispose();
      this.activeSections.delete(id);
      this.sectionOrder = this.sectionOrder.filter(i => i !== id);
      this.updateLayout();
    }
  }
  
  reorderSections(newOrder) {
    this.sectionOrder = newOrder;
    this.updateLayout();
  }
  
  updateLayout() {
    // Position sections based on order and container type
    // For center display: stack vertically or use tabs
    // For HUD: position in predefined slots
  }
  
  update(deltaTime) {
    this.activeSections.forEach(section => section.update(deltaTime));
  }
  
  disposeAll() {
    this.activeSections.forEach(section => section.dispose());
    this.activeSections.clear();
    this.sectionOrder = [];
  }
}
```

---

## Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     NORMAL STATE                             │
│                                                              │
│                    [Item]                                    │
│               [Item]   [Item]                                │
│             [Item] ◉ CENTER [Item]                           │
│               [Item]   [Item]                                │
│                    [Item]                                    │
│                                                              │
│  User selects submenu item...                                │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    TRANSITION                                │
│                                                              │
│   [Item]→                          ←[Item]                   │
│                                                              │
│   [Item]→     ╔═══════════╗        ←[Item]                   │
│               ║ LOADING.. ║                                  │
│               ╚═══════════╝                                  │
│   [Item]→                          ←[Item]                   │
│                                                              │
│   Items move radially outward (no scaling)                   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                   CONTENT MODE                               │
│                                                              │
│  [dim]                                              [dim]    │
│                                                              │
│  [dim]      ╔═════════════════════════╗             [dim]    │
│             ║                         ║                      │
│             ║    CONTENT DISPLAY      ║                      │
│             ║    (Product/Gallery/    ║                      │
│             ║     Blog/Store/etc)     ║                      │
│             ║                         ║                      │
│             ╚═════════════════════════╝                      │
│  [dim]                                              [dim]    │
│                                                              │
│  Menu items are beyond view sphere, still exist              │
│  Camera focuses on content                                   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                   QUICK RETURN                               │
│                                                              │
│  User triggers return (ESC/button/gesture)...                │
│                                                              │
│  • Menu snaps back instantly                                 │
│  • Previous submenu remains open                             │
│  • Mini-preview of content floats in center                  │
│  • Mini-preview persists until new selection                 │
│                                                              │
│                    [Item]                                    │
│               [Item]   [Item]                                │
│             [Item] [mini] [Item]  ← Mini-preview             │
│               [Item]   [Item]                                │
│                    [Item]                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Ring Scatter Animation System

**Principle:** Items move along their radial vector from center, no scaling.

```javascript
class RingScatterAnimation {
  constructor(carousel, config = {}) {
    this.carousel = carousel;
    this.originalPositions = new Map();
    this.scatterRadius = config.scatterRadius || 3.0; // Multiplier
    this.duration = config.duration || 0.8;
    this.isScattered = false;
  }
  
  scatter() {
    if (this.isScattered) return Promise.resolve();
    
    // Store original positions
    this.carousel.items.forEach((item, i) => {
      this.originalPositions.set(i, item.position.clone());
    });
    
    // Animate outward
    return new Promise(resolve => {
      this.carousel.items.forEach((item, i) => {
        const original = this.originalPositions.get(i);
        const direction = original.clone().normalize();
        const target = direction.multiplyScalar(
          original.length() * this.scatterRadius
        );
        
        gsap.to(item.position, {
          x: target.x,
          y: target.y,
          z: target.z,
          duration: this.duration,
          ease: 'power2.out',
          onComplete: () => {
            if (i === 0) {
              this.isScattered = true;
              resolve();
            }
          }
        });
        
        // Also fade items
        gsap.to(item.material, {
          opacity: 0.2,
          duration: this.duration
        });
      });
    });
  }
  
  gather() {
    if (!this.isScattered) return Promise.resolve();
    
    return new Promise(resolve => {
      this.carousel.items.forEach((item, i) => {
        const original = this.originalPositions.get(i);
        
        gsap.to(item.position, {
          x: original.x,
          y: original.y,
          z: original.z,
          duration: this.duration * 0.5, // Faster return
          ease: 'power2.inOut',
          onComplete: () => {
            if (i === 0) {
              this.isScattered = false;
              resolve();
            }
          }
        });
        
        gsap.to(item.material, {
          opacity: 1,
          duration: this.duration * 0.5
        });
      });
    });
  }
}
```

---

### 2. Content Display Module System

**Architecture:** Plugin-based content renderers.

```javascript
// Base interface
class ContentDisplay {
  constructor(container, config) {
    this.container = container;
    this.config = config;
    this.group = new THREE.Group();
  }
  
  async load(data) { throw new Error('Implement in subclass'); }
  show() { this.group.visible = true; }
  hide() { this.group.visible = false; }
  update(deltaTime) { /* Optional animation */ }
  dispose() { /* Cleanup */ }
  createMiniPreview() { return this.group.clone(); }
}

// Registry
const ContentDisplayRegistry = {
  displays: new Map(),
  
  register(type, DisplayClass) {
    this.displays.set(type, DisplayClass);
  },
  
  create(type, container, config) {
    const DisplayClass = this.displays.get(type);
    if (!DisplayClass) throw new Error(`Unknown display type: ${type}`);
    return new DisplayClass(container, config);
  }
};

// Register built-in types
ContentDisplayRegistry.register('product-3d', Product3DDisplay);
ContentDisplayRegistry.register('product-gallery', ProductGalleryDisplay);
ContentDisplayRegistry.register('text-blog', TextBlogDisplay);
ContentDisplayRegistry.register('store-walkthrough', StoreWalkthroughDisplay);
ContentDisplayRegistry.register('custom-embed', CustomEmbedDisplay);
```

---

### 3. Content Display Types

#### Product3DDisplay
```javascript
class Product3DDisplay extends ContentDisplay {
  async load(data) {
    // Load GLB model from Shopify CDN or metafield
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(data.modelUrl);
    this.model = gltf.scene;
    this.group.add(this.model);
    
    // Add orbit controls for this model
    this.setupInteraction();
  }
  
  update(deltaTime) {
    // Gentle auto-rotation when not interacting
    if (!this.isInteracting) {
      this.model.rotation.y += deltaTime * 0.1;
    }
  }
}
```

#### ProductGalleryDisplay
```javascript
class ProductGalleryDisplay extends ContentDisplay {
  async load(data) {
    // Create curved gallery of images
    this.images = data.images.map((url, i) => {
      const texture = new THREE.TextureLoader().load(url);
      const geo = new THREE.PlaneGeometry(2, 2);
      const mat = new THREE.MeshBasicMaterial({ map: texture });
      const mesh = new THREE.Mesh(geo, mat);
      
      // Arrange in arc
      const angle = (i - data.images.length / 2) * 0.3;
      mesh.position.set(Math.sin(angle) * 5, 0, Math.cos(angle) * 5 - 5);
      mesh.lookAt(0, 0, 0);
      
      return mesh;
    });
    
    this.images.forEach(img => this.group.add(img));
  }
}
```

#### TextBlogDisplay
```javascript
class TextBlogDisplay extends ContentDisplay {
  async load(data) {
    // 3D text rendering with scroll capability
    const loader = new FontLoader();
    const font = await loader.loadAsync('/fonts/roboto.json');
    
    // Title
    const titleGeo = new TextGeometry(data.title, {
      font, size: 0.5, height: 0.05
    });
    const titleMesh = new THREE.Mesh(titleGeo, textMaterial);
    titleMesh.position.y = 2;
    
    // Body text (line-wrapped)
    this.bodyMeshes = this.createWrappedText(data.body, font);
    
    this.group.add(titleMesh);
    this.bodyMeshes.forEach(m => this.group.add(m));
  }
}
```

---

### 4. Mini-Preview System

**Behavior:** Small floating preview persists after returning to menu.

```javascript
class MiniPreview {
  constructor(scene) {
    this.scene = scene;
    this.container = new THREE.Group();
    this.container.scale.setScalar(0.15); // 15% of original size
    this.container.position.set(0, 0, 0); // Center
    scene.add(this.container);
  }
  
  setContent(contentDisplay) {
    // Clear previous
    this.clear();
    
    // Clone content's preview
    const preview = contentDisplay.createMiniPreview();
    this.container.add(preview);
    
    // Add gentle spin
    this.spinAnimation = gsap.to(this.container.rotation, {
      y: Math.PI * 2,
      duration: 20,
      repeat: -1,
      ease: 'none'
    });
  }
  
  clear() {
    if (this.spinAnimation) this.spinAnimation.kill();
    while (this.container.children.length > 0) {
      const child = this.container.children[0];
      this.container.remove(child);
      child.traverse(c => {
        c.geometry?.dispose();
        c.material?.dispose();
      });
    }
  }
}
```

---

### 5. Camera Focus System

**Behavior:** Smooth camera transitions to focus on content.

```javascript
class CameraFocusController {
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;
    this.savedState = null;
  }
  
  focusOn(target, options = {}) {
    // Save current state for return
    this.savedState = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone()
    };
    
    // Calculate optimal viewing position
    const targetPos = target.position.clone();
    const distance = options.distance || 5;
    const viewPos = targetPos.clone().add(
      new THREE.Vector3(0, 1, distance)
    );
    
    // Animate camera
    return Promise.all([
      gsap.to(this.camera.position, {
        ...viewPos,
        duration: 0.8,
        ease: 'power2.inOut'
      }),
      gsap.to(this.controls.target, {
        ...targetPos,
        duration: 0.8,
        ease: 'power2.inOut'
      })
    ]);
  }
  
  returnToSaved() {
    if (!this.savedState) return Promise.resolve();
    
    return Promise.all([
      gsap.to(this.camera.position, {
        ...this.savedState.position,
        duration: 0.4,
        ease: 'power2.inOut'
      }),
      gsap.to(this.controls.target, {
        ...this.savedState.target,
        duration: 0.4,
        ease: 'power2.inOut'
      })
    ]);
  }
}
```

---

### 6. Quick Return Gesture Handler

**Triggers:**
- ESC key press
- Click/tap outside content area
- Dedicated "back" button on HUD
- Swipe gesture (mobile)

```javascript
class QuickReturnHandler {
  constructor(options) {
    this.onReturn = options.onReturn;
    this.isContentMode = false;
    this.setup();
  }
  
  setup() {
    // ESC key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isContentMode) {
        this.triggerReturn();
      }
    });
    
    // Click outside (raycast miss)
    this.setupClickOutside();
    
    // Mobile swipe
    this.setupSwipeGesture();
  }
  
  enterContentMode() {
    this.isContentMode = true;
  }
  
  exitContentMode() {
    this.isContentMode = false;
  }
  
  triggerReturn() {
    if (!this.isContentMode) return;
    this.onReturn();
    this.exitContentMode();
  }
}
```

---

## State Machine

```
┌─────────────┐   select item   ┌─────────────┐
│    MENU     │ ───────────────→│  SCATTERING │
│   (normal)  │                 │ (animating) │
└─────────────┘                 └──────┬──────┘
       ↑                               │
       │                               │ animation complete
       │                               ↓
       │                        ┌─────────────┐
       │   quick return         │   CONTENT   │
       ├───────────────────────←│    MODE     │
       │                        └─────────────┘
       │                               │
       │                               │ select different item
       │                               ↓
       │                        ┌─────────────┐
       └───────────────────────←│  GATHERING  │
                                │ (animating) │
                                └─────────────┘
```

---

## Files to Create/Modify

**New Files:**
- `app/components/Carousel3DPro/modules/RingScatterAnimation.js`
- `app/components/Carousel3DPro/modules/ContentDisplayRegistry.js`
- `app/components/Carousel3DPro/modules/displays/Product3DDisplay.js`
- `app/components/Carousel3DPro/modules/displays/ProductGalleryDisplay.js`
- `app/components/Carousel3DPro/modules/displays/TextBlogDisplay.js`
- `app/components/Carousel3DPro/modules/MiniPreview.js`
- `app/components/Carousel3DPro/modules/CameraFocusController.js`
- `app/components/Carousel3DPro/modules/QuickReturnHandler.js`

**Modified Files:**
- `app/components/Carousel3DPro/main.client.js` - Integrate new systems
- `app/components/Carousel3DPro/Carousel3DSubmenu.js` - Trigger expansion on select

---

## Acceptance Criteria

- [ ] Selecting a submenu item triggers ring scatter animation
- [ ] Items move radially outward without scaling
- [ ] Content display fills the center view
- [ ] ESC key returns to menu instantly
- [ ] Previous submenu remains open after return
- [ ] Mini-preview floats in center after return
- [ ] Camera smoothly focuses on content
- [ ] At least one content type (Product3D) is functional
- [ ] State machine handles all transitions correctly
- [ ] Performance stays at 60fps during animations
- [ ] Mobile gestures work for quick return
- [ ] Build passes: `npm run validate`

---

## Open Questions (Carry Forward from Parent)

1. **Quick Return Gesture Priority** - If multiple triggers fire, which takes precedence?
2. **Content Loading** - Show spinner during load? Placeholder? Pre-fetch?
3. **Deep Linking** - Should content mode be URL-addressable?
4. **Back Button** - Should browser back button trigger quick return?
