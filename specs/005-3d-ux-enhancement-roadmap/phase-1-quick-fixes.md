# Phase 1: Quick Fixes

> **Parent Spec:** `specs/005-3d-ux-enhancement-roadmap/spec.md`  
> **Status:** Ready for Implementation  
> **Priority:** High  
> **Estimated Effort:** 1-2 sessions

---

## ⚠️ Design Principle: SUBTLETY FIRST

**The user explicitly prefers subtle effects over dramatic ones.**

- ❌ NO full-blast shader glows
- ❌ NO overwhelming emissive intensities
- ✅ Gentle, barely-perceptible enhancements
- ✅ Effects that enhance without distracting
- ✅ Prefer low opacity, soft edges, gradual transitions

**Example Values (use as starting points, tune down if needed):**
| Effect | Max Value | Notes |
|--------|-----------|-------|
| Emissive intensity | 0.2-0.3 | Never exceed 0.5 |
| Glow opacity | 0.3-0.4 | Should feel ambient |
| Hover scale | 1.02-1.05 | Subtle, not bouncy |
| Fog density | 0.02-0.03 | Hint of depth, not obscuring |
| Spotlight intensity | 0.3-0.5 | Soft fill, not harsh |

---

## Overview

Immediate UX improvements that will significantly enhance the visual polish without major architectural changes.

---

## Tasks

### 1. ⬜ Hover/Rollover Effects on Menu Items

**What:** Subtle visual feedback when hovering over main menu and submenu items.

**Behavior:**
- On hover: Slight scale increase (1.05x), glow intensity boost
- On hover out: Smooth return to normal state
- Should not interfere with selection mechanics

**Technical Approach:**
```javascript
// In Carousel3DPro.js or similar
item.onPointerEnter = () => {
  gsap.to(item.scale, { x: 1.05, y: 1.05, z: 1.05, duration: 0.2 });
  gsap.to(item.material, { emissiveIntensity: 0.5, duration: 0.2 });
};
item.onPointerLeave = () => {
  if (!item.isSelected) {
    gsap.to(item.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
    gsap.to(item.material, { emissiveIntensity: 0.1, duration: 0.2 });
  }
};
```

**Files to Modify:**
- `app/components/Carousel3DPro/Carousel3DPro.js`
- `app/components/Carousel3DPro/Carousel3DSubmenu.js`

---

### 2. ⬜ Dark Blue Text Glow Improvement

**What:** Text is currently too dark and needs a better emanating glow.

**Current Issue:** Dark blue text with transparent material looks almost invisible in some lighting.

**Solution Options:**
1. Increase emissive intensity on text material
2. Add bloom post-processing (heavier)
3. Use MeshStandardMaterial with emissive color
4. Add point light attached to text geometry

**Recommended Approach:**
```javascript
textMesh.material = new THREE.MeshStandardMaterial({
  color: 0x4488ff,        // Lighter blue
  emissive: 0x2244aa,     // Blue glow
  emissiveIntensity: 0.4, // Stronger glow
  transparent: true,
  opacity: 0.95
});
```

**Files to Modify:**
- `app/components/Carousel3DPro/Carousel3DPro.js` (text creation)
- `app/components/Carousel3DPro/Carousel3DSubmenu.js` (submenu text)

---

### 3. ⬜ Distance Fog/Dimming

**What:** Objects should dim/fade as they get farther from the camera.

**Implementation:**
```javascript
// In scene setup (main.client.js or similar)
scene.fog = new THREE.Fog(
  0x000011,  // Fog color (dark blue-black)
  5,         // Near distance (fog starts)
  50         // Far distance (fully fogged)
);

// Or for exponential falloff:
scene.fog = new THREE.FogExp2(0x000011, 0.03);
```

**Tuning:** Values should be adjustable via the future admin panel.

**Files to Modify:**
- `app/components/Carousel3DPro/main.client.js`

---

### 4. ⬜ Camera Spotlight on Focus

**What:** Add a soft light attached to the camera that illuminates whatever it's looking at.

**Implementation:**
```javascript
// Create spotlight
const cameraLight = new THREE.SpotLight(0xffffff, 0.5);
cameraLight.angle = Math.PI / 6;      // 30 degree cone
cameraLight.penumbra = 0.5;           // Soft edges
cameraLight.decay = 1.5;
cameraLight.distance = 30;

// Attach to camera
camera.add(cameraLight);
cameraLight.position.set(0, 0, 0);    // At camera position
cameraLight.target.position.set(0, 0, -1); // Looking forward
camera.add(cameraLight.target);

// Don't forget to add camera to scene
scene.add(camera);
```

**Alternative:** PointLight for omnidirectional glow around camera focus.

**Files to Modify:**
- `app/components/Carousel3DPro/main.client.js`

---

### 5. ⬜ Dim Highlighted Item When Submenu Open

**What:** When a submenu is open, the main menu's highlighted item should visually indicate it's "selected but not active".

**Behavior:**
- Submenu opens → Main menu highlight dims (opacity 0.5, scale 0.95)
- Submenu closes → Main menu highlight restores
- Prevents visual confusion about what's interactive

**Implementation:**
```javascript
// In submenu open handler
const mainMenuItem = mainCarousel.getHighlightedItem();
gsap.to(mainMenuItem.material, { opacity: 0.5, duration: 0.3 });
gsap.to(mainMenuItem.scale, { x: 0.95, y: 0.95, z: 0.95, duration: 0.3 });

// In submenu close handler
gsap.to(mainMenuItem.material, { opacity: 1, duration: 0.3 });
gsap.to(mainMenuItem.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
```

**Files to Modify:**
- `app/components/Carousel3DPro/Carousel3DSubmenu.js`
- `app/components/Carousel3DPro/Carousel3DPro.js`

---

## Acceptance Criteria

- [ ] Hovering over any menu item shows visible feedback
- [ ] Text is clearly readable with nice glow effect
- [ ] Distant objects fade into fog
- [ ] Camera has soft light illuminating focus area
- [ ] Main menu item dims when its submenu is open
- [ ] All animations are smooth (60fps)
- [ ] No performance regression
- [ ] Build passes: `npm run validate`

---

## Already Complete

- ✅ Main menu frozen during submenu scroll
- ✅ Shaders are fine as-is

---

## Implementation Notes

**Order of Implementation:**
1. Distance fog (simplest, biggest visual impact)
2. Camera spotlight (lighting foundation)
3. Text glow improvement (depends on lighting)
4. Hover effects (interaction polish)
5. Dim highlight (interaction clarity)

**Testing:**
- Test on both desktop and mobile
- Verify performance in Chrome DevTools (aim for 60fps)
- Check that hover effects don't conflict with selection
