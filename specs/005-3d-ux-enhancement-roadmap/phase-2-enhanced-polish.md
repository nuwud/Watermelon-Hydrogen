# Phase 2: Enhanced Polish

> **Parent Spec:** `specs/005-3d-ux-enhancement-roadmap/spec.md`  
> **Status:** Planning  
> **Priority:** Medium  
> **Estimated Effort:** 2-3 sessions  
> **Dependencies:** Phase 1 complete

---

## Overview

Enhanced visual features that add depth and polish to the 3D experience.

---

## Tasks

### 1. ⬜ Sublines for Menu/Submenu Items

**What:** Secondary text displayed below the main item name.

**Use Cases:**
- Main menu: Category descriptions ("Explore our collection")
- Submenu: Product prices, short descriptions
- Dynamic content from Shopify metafields

**Visual Design:**
```
┌─────────────────┐
│   PRODUCTS      │  ← Main text (larger, brighter)
│  Browse our     │  ← Subline (smaller, dimmer)
│   collection    │
└─────────────────┘
```

**Technical Approach:**
- Create second TextGeometry below main text
- Smaller font size (0.5x main)
- Lower opacity (0.6)
- Slight Y offset
- Should follow same hover/dim behaviors

**Data Source:**
- `nuwud-menu-structure-final.json` - Add `subline` field
- Shopify product metafields for dynamic content

---

### 2. ⬜ HUD Mounting Sphere Around Camera

**What:** Invisible sphere/shape for mounting HUD elements that stay relative to camera view.

**Use Cases:**
- Cart icon (always visible)
- Menu toggle button
- Navigation breadcrumbs
- Debug info overlay

**Design Considerations:**

| Approach | Description | Recommendation |
|----------|-------------|----------------|
| Sphere | Natural 3D feel, items curve | ✅ Best for immersion |
| Plane at fixed Z | Simple, items stay flat | Good for 2D HUD |
| Camera children | Items attached to camera | Can cause clipping |

**Implementation:**
```javascript
// Create HUD container attached to camera
class CameraHUD {
  constructor(camera, radius = 2) {
    this.container = new THREE.Group();
    this.radius = radius;
    camera.add(this.container);
    
    // Position HUD items on sphere surface
    this.slots = {
      topRight: this.spherePosition(45, 30),    // Cart icon
      topLeft: this.spherePosition(-45, 30),    // Menu toggle
      bottomCenter: this.spherePosition(0, -45) // Breadcrumbs
    };
  }
  
  spherePosition(azimuth, elevation) {
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    return new THREE.Vector3(
      this.radius * Math.sin(phi) * Math.cos(theta),
      this.radius * Math.cos(phi),
      -this.radius * Math.sin(phi) * Math.sin(theta)
    );
  }
  
  addToSlot(slotName, object3D) {
    object3D.position.copy(this.slots[slotName]);
    object3D.lookAt(0, 0, 0); // Face camera
    this.container.add(object3D);
  }
}
```

**Files to Modify/Create:**
- `app/components/Carousel3DPro/CameraHUD.js` (exists, enhance)
- `app/components/Carousel3DPro/main.client.js`

---

### 3. ⬜ Dome Atmosphere Effects

**What:** Add visual atmosphere inside the background dome.

**Effects to Consider:**
1. **Volumetric fog** - Subtle haze that adds depth
2. **Particle dust** - Floating particles for organic feel
3. **Gradient overlay** - Darker at edges, lighter at center
4. **Animated nebula** - Slow-moving clouds in background

**Implementation Options:**

**Option A: Fog + Gradient**
```javascript
// Already have fog from Phase 1
// Add gradient sphere inside dome
const gradientGeo = new THREE.SphereGeometry(45, 32, 32);
const gradientMat = new THREE.ShaderMaterial({
  uniforms: {
    innerColor: { value: new THREE.Color(0x000022) },
    outerColor: { value: new THREE.Color(0x000000) }
  },
  vertexShader: `...`,
  fragmentShader: `
    varying vec3 vPosition;
    uniform vec3 innerColor;
    uniform vec3 outerColor;
    void main() {
      float dist = length(vPosition) / 45.0;
      gl_FragColor = vec4(mix(innerColor, outerColor, dist), 0.3);
    }
  `,
  transparent: true,
  side: THREE.BackSide
});
```

**Option B: Particle System**
```javascript
const particles = new THREE.Points(
  new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 500 }, () => new THREE.Vector3(
      (Math.random() - 0.5) * 80,
      (Math.random() - 0.5) * 80,
      (Math.random() - 0.5) * 80
    ))
  ),
  new THREE.PointsMaterial({ 
    size: 0.05, 
    color: 0x4466aa,
    transparent: true,
    opacity: 0.3
  })
);
scene.add(particles);

// Animate in render loop
particles.rotation.y += 0.0001;
```

**Recommendation:** Start with fog + subtle gradient, add particles if performance allows.

**Files to Modify:**
- `app/components/Carousel3DPro/main.client.js`
- `app/components/Carousel3DPro/BackgroundDome.js`

---

## Acceptance Criteria

- [ ] Menu items can display sublines
- [ ] Sublines are smaller and dimmer than main text
- [ ] HUD elements stay fixed relative to camera view
- [ ] Cart icon is always visible on HUD
- [ ] Dome has atmospheric depth effect
- [ ] Particles (if added) don't impact performance
- [ ] Mobile: HUD elements scale appropriately
- [ ] Build passes: `npm run validate`

---

## Open Questions

1. **Subline Data Source** - Should sublines come from:
   - Static JSON menu structure?
   - Shopify metafields?
   - Both (with fallback)?

2. **HUD Item Set** - What should be on the HUD?
   - Cart icon (definitely)
   - Menu toggle (for content display mode)
   - Search?
   - User account?

3. **Atmosphere Intensity** - How noticeable should it be?
   - Subtle (barely visible)
   - Medium (adds depth)
   - Dramatic (clear visual effect)

---

## Dependencies

- Phase 1 fog/lighting must be complete
- Camera spotlight provides base lighting for atmosphere visibility
