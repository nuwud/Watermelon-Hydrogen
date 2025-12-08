# Specs Audit & Status Report

> **Generated:** 2025-12-08  
> **Purpose:** Track status of all specs against current codebase

---

## Spec Status Overview

| Spec | Original Status | Current Status | Notes |
|------|-----------------|----------------|-------|
| 001-3d-immersive-checkout | Draft | 🔶 Superseded | Folded into 005 Phase 3 |
| 002-three-js-version | Draft | ✅ Partially Complete | Three.js at r180, version display works |
| 003-title-redesign-primary | Draft | 🔶 Superseded | Menu structure done, folded into 005 |
| 004-let-s-fix | Draft | ✅ Complete | Background presets working |
| **005-3d-ux-enhancement-roadmap** | Active | 🚧 In Progress | Master spec for all UX work |

---

## 001-3d-immersive-checkout

**Original Goal:** Integrate Shopify checkout into 3D carousel center panel

**Current Status:** 🔶 **Superseded by 005 Phase 3**

**What's Done:**
- Center panel exists (`CentralContentPanel.js`)
- Cart system with 3D integration works
- Checkout redirects to Shopify work

**What Remains (now in 005):**
- Center panel checkout experience → Phase 3 Content Displays
- Animation styles (dramatic/subtle/elegant) → Phase 3 Ring Scatter
- Admin checkout mode config → Phase 4 Admin Editor

**Action:** Archive 001, reference in 005 Phase 3 for checkout display type.

---

## 002-three-js-version

**Original Goal:** Three.js version manager with admin UI

**Current Status:** ✅ **Partially Complete**

**What's Done:**
- Three.js upgraded to r180 ✅
- Current version visible in `package.json`
- ESM imports working properly

**What Remains:**
- Admin UI for version display (nice-to-have)
- Remote/CDN switching (not implemented)
- Version downgrade capability (not implemented)

**Action:** Mark as mostly complete. Version management via npm is sufficient for now. Admin version display can be added to Phase 4 admin page as a "System Info" panel.

---

## 003-title-redesign-primary

**Original Goal:** Redesign primary navigation to 7-category structure

**Current Status:** 🔶 **Superseded**

**What's Done:**
- Menu structure defined in `nuwud-menu-structure-final.json` ✅
- ContentManager transforms menu data ✅
- 7+ categories working in carousel ✅

**What Remains (now in 005):**
- Scene key per menu item → Phase 3 Content Displays
- Sublines for items → Phase 2

**Action:** Archive 003, merge into 005.

---

## 004-let-s-fix (Skyball Background)

**Original Goal:** Honeycomb background with admin presets

**Current Status:** ✅ **Complete**

**What's Done:**
- Background preset system (`backgroundPresets.server.ts`) ✅
- Admin route for background management ✅
- HoneycombField, InteractivePolygonsField components ✅
- Reduced motion support ✅
- SSR-safe rendering ✅

**What Remains:**
- Enhanced admin UI → Can be folded into Phase 4

**Action:** Mark as complete. Admin enhancements go to 005 Phase 4.

---

## Consolidation Recommendations

### Archive These (mark as superseded):
- 001-3d-immersive-checkout → Content absorbed by 005
- 003-title-redesign-primary → Content absorbed by 005

### Keep Active:
- 002-three-js-version → Mark "Partially Complete"
- 004-let-s-fix → Mark "Complete"
- 005-3d-ux-enhancement-roadmap → Master spec

### New Specs Needed:
- None - all new work should be phases within 005

---

## Spec File Updates Needed

1. **001/spec.md** - Add header note: "Status: Superseded by 005-3d-ux-enhancement-roadmap"
2. **002/spec.md** - Add header note: "Status: Partially Complete (Three.js at r180)"
3. **003/research.md** - Add header note: "Status: Superseded by 005-3d-ux-enhancement-roadmap"
4. **004/spec.md** - Change status to: "Status: Complete"
5. **specs/README.md** - Already updated ✅
