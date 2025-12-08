# 🍉 Watermelon 3D UX Enhancement Roadmap

> **Status:** Planning  
> **Created:** 2025-12-08  
> **Epic:** Transform the 3D carousel into a fully immersive, modular content experience

---

## Executive Summary

This epic encompasses multiple phases of enhancements to transform the current 3D carousel into a fully immersive, WYSIWYG-configurable experience with:
- Polished visual feedback and lighting
- Expandable menu system that reveals content displays
- Modular content architecture for products, galleries, blogs, and custom 3D experiences
- Custom admin editor for non-developer configuration

---

## 🎯 Success Criteria

- [ ] All menu items have visible hover/rollover effects
- [ ] Distance-based fog provides depth perception
- [ ] Camera has dedicated spotlight for focused content
- [ ] Menu ring can expand/scatter to reveal content area
- [ ] Content displays are modular and pluggable
- [ ] Admin can configure 3D settings without code changes
- [ ] Mobile has optimized 3D experience

---

## 📋 Phase Breakdown

### Phase 1: Quick Fixes (High Priority)
**Spec:** `specs/005-3d-ux-enhancement-roadmap/phase-1-quick-fixes.md`

| Issue | Status | Notes |
|-------|--------|-------|
| Hover/rollover effects on menu items | ⬜ Not Started | Subtle glow/scale on mouseover |
| Dark blue text glow improvement | ⬜ Not Started | Better emanating glow from letters |
| Distance fog/dimming | ⬜ Not Started | Objects dim with distance from camera |
| Camera spotlight on focus | ⬜ Not Started | Constant light on camera target |
| Dim highlighted item when submenu open | ⬜ Not Started | Visual hierarchy |
| Main menu frozen during submenu scroll | ✅ Done | Already implemented |
| Shaders | ✅ Done | Current shaders are fine |

### Phase 2: Enhanced Polish
**Spec:** `specs/005-3d-ux-enhancement-roadmap/phase-2-enhanced-polish.md`

| Feature | Status | Notes |
|---------|--------|-------|
| Sublines for menu/submenu items | ⬜ Not Started | Secondary text below item names |
| HUD mounting sphere around camera | ⬜ Not Started | Invisible sphere for HUD attachment |
| Dome atmosphere effects | ⬜ Not Started | Add atmosphere inside the dome |

### Phase 3: Menu Expansion System
**Spec:** `specs/005-3d-ux-enhancement-roadmap/phase-3-menu-expansion.md`

The transformative feature:
- Ring scatter animation (items move outward, no scaling)
- Central content display system (modular, pluggable)
- Floating mini-preview persistence
- Quick return gesture
- Camera focus transitions

### Phase 4: Custom Admin Editor
**Spec:** `specs/005-3d-ux-enhancement-roadmap/phase-4-admin-editor.md`

WYSIWYG editor for 3D configuration:
- Shopify Metaobjects for storage (no external DB)
- Hydrogen `/admin` route with live preview
- Real-time 3D scene updates
- Preset save/load system

---

## 🏗️ Architecture Decisions

### Why Metaobjects for Admin Storage?
- Native to Shopify (no external dependencies)
- Accessible via Storefront API
- No database hosting needed
- Merchant-familiar ecosystem

### Why HUD Sphere vs Alternatives?
| Approach | Pros | Cons |
|----------|------|------|
| **Camera-child group** | Simple, follows camera | Can clip, rotation issues |
| **HUD sphere** | Stable positioning, natural 3D feel | Extra geometry |
| **CSS overlay** | Familiar, no 3D math | Breaks immersion |
| **Screen-space Three.js** | Best of both | More complex setup |

**Recommendation:** HUD sphere for 3D elements, CSS overlay for 2D UI

### Content Display Module Types
1. **ProductViewer3D** - GLB model with orbit controls
2. **ProductGallery** - 2D image carousel in 3D space
3. **TextBlog3D** - 3D text rendering for articles
4. **StoreWalkthrough** - Full 3D environment
5. **CustomEmbed** - iFrame or video in 3D panel

---

## ❓ Open Questions

1. **Quick Return Gesture** - What triggers bringing the menu back?
   - [ ] ESC key
   - [ ] Click outside content
   - [ ] Dedicated 3D button
   - [ ] Swipe gesture on mobile
   - [ ] All of the above?

2. **First Content Type** - Which to build first?
   - [ ] Product viewer (3D model)
   - [ ] Product gallery (images)
   - [ ] Text/blog display
   - [ ] Store walkthrough

3. **Admin Auth** - How to secure the admin route?
   - [ ] Password protected
   - [ ] Shopify customer accounts
   - [ ] Development mode only
   - [ ] Shopify App Bridge (full app)

4. **Mobile Strategy** - How to handle mobile constraints?
   - [ ] Simplified ring layout
   - [ ] Vertical list with 3D preview
   - [ ] Full-screen content when selected
   - [ ] Different menu entirely

---

## 📁 Related Files

- `app/components/Carousel3DPro/` - Core 3D carousel system
- `app/components/Carousel3DPro/modules/` - Modular subsystems
- `app/utils/backgroundPresets.server.ts` - Background configuration
- `app/routes/admin.jsx` - Existing admin route (extend this)

---

## 🤖 AI Instructions

When implementing features from this roadmap:

1. **SSR Safety**: All Three.js code must use `typeof window !== 'undefined'` guards
2. **ClientOnly**: Wrap 3D components in `<ClientOnly>` for React
3. **No Raw Env**: Use `envPublic`/`envServer` wrappers only
4. **GSAP Authority**: Only one system controls animation state at a time
5. **Modular Design**: Each content type should be a separate, pluggable module
6. **Performance**: Keep 3D bundle under 800KB increment per feature
7. **Validate**: Run `npm run validate` before any commit

---

## Next Steps

1. Answer the open questions above
2. Finalize Phase 1 quick fixes spec
3. Begin implementation of hover effects and lighting
