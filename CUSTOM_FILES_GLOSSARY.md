# 🍉 Watermelon Hydrogen — Custom Files Glossary

> **Purpose:** Index of all custom-built files for easy AI/developer onboarding.  
> **Last updated:** 2025-12-08

---

## Quick Legend

| Status | Meaning |
|--------|---------|
| ✅ | Active, well-maintained |
| ⚠️ | Needs review/refactoring |
| 🗑️ | Redundant, can be removed |
| 📦 | Archive/backup (not active) |

---

## 1. CORE 3D SYSTEM (`app/components/Carousel3DPro/`)

The heart of the 3D carousel experience.

### Main Files

| File | Status | Purpose | Notes |
|------|--------|---------|-------|
| `main.client.js` | ✅ | Scene initialization, render loop, event binding | **HIGH-RISK** - Core entry point |
| `Carousel3DPro.js` | ✅ | Main menu wheel logic, item positioning | Manages main carousel ring |
| `Carousel3DSubmenu.js` | ✅ | Submenu wheel logic, nested navigation | 1181 lines, handles submenu rings |
| `Carousel3DSubmenu_WORKING.js` | 🗑️ | **EMPTY FILE** - legacy backup | Delete |
| `Carousel3DProWrapper.jsx` | ✅ | SSR-safe React wrapper | Uses ClientOnly |
| `Carousel3DProWrapper.client.jsx` | ⚠️ | Client-only variant | May be redundant with above |
| `Carousel3DMenu.jsx` | ⚠️ | Alternative menu implementation | Check if redundant |
| `CentralContentPanel.js` | ✅ | 3D content display in carousel center | 700 lines |
| `CentralContentPanelEnhanced.jsx` | ⚠️ | React version with Shopify integration | 705 lines, may duplicate above |
| `Carousel3DSubmenuEnhanced.jsx` | ⚠️ | React-enhanced submenu | Check if active |
| `Carousel3DPro_InspectorPanel.js` | ✅ | Debug/admin inspector UI | Dev tool |
| `SubmenuManager.js` | ✅ | Submenu lifecycle management | |
| `BackgroundDome.js` | ✅ | 3D background sphere | |
| `BubblePanel3D.js` | ✅ | 3D bubble UI panels | |
| `CameraHUD.js` | ✅ | Camera-relative HUD elements | |
| `CartHUDIcon3D.js` | ⚠️ | 3D cart icon (383 lines) | **DUPLICATE** - also in cart-drawers/ |
| `CarouselShaderFX.js` | ✅ | Custom shader effects | |
| `CarouselStyleConfig.js` | ✅ | Theme/style configuration | |
| `CloseButton3D.js` | ✅ | 3D close button component | |
| `Product3DDisplay.js` | ✅ | Product GLB/model display | |
| `FloatingPreview.js` (in modules/) | ✅ | Floating text preview on hover | |

### Modules (`app/components/Carousel3DPro/modules/`)

| File | Status | Purpose |
|------|--------|---------|
| `cartIntegration.js` | ✅ | Cart bridge for 3D scene |
| `FloatingPreview.js` | ✅ | Floating preview system |
| `selectionGuards.js` | ✅ | Selection state management, prevents race conditions |
| `README.md` | ✅ | Module documentation |

### Modules Archive (`modules/archive/`)

| File | Status | Purpose |
|------|--------|---------|
| `animations.js` | 📦 | Legacy animation code |
| `carouselManager.js` | 📦 | Legacy carousel management |
| `cartIntegration.js` | 📦 | Old cart integration |
| `controls.js` | 📦 | Old input controls |
| `initialization.js` | 📦 | Old init code |
| `SubMenuItem.js` | 📦 | Old submenu item class |

### Backgrounds (`app/components/Carousel3DPro/backgrounds/`)

| File | Status | Purpose |
|------|--------|---------|
| `BackgroundManager.js` | ✅ | Background lifecycle management |
| `HexagonSkyball.js` | ✅ | Hexagon sky dome effect |
| `InteractiveHexagonWall.js` | ✅ | Interactive hex wall |
| `InteractivePolygonsWall.js` | ✅ | Interactive polygon wall |
| `index.js` | ✅ | Background exports |

---

## 2. CART SYSTEM (`app/components/cart-drawers/`)

3D cart drawer and integration with Hydrogen cart.

| File | Status | Purpose | Notes |
|------|--------|---------|-------|
| `CartDrawerController.jsx` | ✅ | Main drawer orchestrator | **HIGH-RISK** |
| `CartDrawer3D.jsx` | ✅ | 3D drawer component | |
| `CartDrawer3D.scene.js` | ✅ | Three.js scene for drawer | |
| `CartDrawerMount.jsx` | ✅ | React mount point | |
| `CartDrawerRenderer.jsx` | ✅ | Renderer component | |
| `CartDrawerInjector.jsx` | ✅ | Injects drawer into DOM | |
| `CartHUDIcon3D.js` | ⚠️ | 3D cart icon (161 lines) | **DUPLICATE** - also in Carousel3DPro/ |
| `CartBadge3D.js` | ✅ | 3D cart badge with count | |
| `CartLineItems.jsx` | ✅ | Cart line items display | |
| `CartSummary.jsx` | ✅ | Cart total/summary | |
| `CartToggle3D.jsx` | ✅ | Toggle button for cart | |
| `CartToggleButtons.jsx` | ✅ | Multiple toggle buttons | |
| `CartHUDDebugPanel.jsx` | ✅ | Debug panel for cart HUD | Dev tool |
| `Drawer.jsx` | ✅ | Base drawer component | |
| `DrawerManager.jsx` | ✅ | Drawer state management | |
| `FavoriteProducts.jsx` | ✅ | Favorites display | |
| `SavedItems.jsx` | ✅ | Saved items display | |

---

## 3. BACKGROUND SYSTEM (`app/components/backgrounds/`)

Dynamic background presets and effects.

| File | Status | Purpose |
|------|--------|---------|
| `BackgroundStage.jsx` | ✅ | Main background container |
| `HoneycombField.jsx` | ✅ | Honeycomb animated background |
| `InteractivePolygonsField.jsx` | ✅ | Interactive polygon background |
| `backgroundRenderer.client.ts` | ✅ | Client-side background renderer |
| `useBackgroundPreset.ts` | ✅ | React hook for preset selection |
| `backgrounds.css` | ✅ | Background styles |

---

## 4. ADMIN SYSTEM (`app/components/admin/`)

| File | Status | Purpose |
|------|--------|---------|
| `WatermelonAdminPanel.jsx` | ✅ | Main admin UI panel |
| `BackgroundPresetManager.jsx` | ✅ | Background preset CRUD |
| `backgroundPresetManager.css` | ✅ | Admin styles |

---

## 5. PANELS (`app/components/panels/`)

3D content panels for different views.

| File | Status | Purpose |
|------|--------|---------|
| `AboutPanel3D.jsx` | ✅ | About page 3D panel |
| `CartPanel3D.jsx` | ✅ | Cart 3D panel |
| `FavoritesPanel3D.jsx` | ✅ | Favorites 3D panel |
| `ProductModelPanel.jsx` | ✅ | Product model viewer |
| `ShopifyModelPanel.jsx` | ✅ | Shopify model integration |

---

## 6. CONTEXT (`app/components/context/`)

| File | Status | Purpose | Notes |
|------|--------|---------|-------|
| `cart-ui.jsx` | ✅ | Cart UI context | **HIGH-RISK** - Event bridge |

---

## 7. UTILITIES (`app/utils/`)

### Content Management

| File | Status | Lines | Purpose | Notes |
|------|--------|-------|---------|-------|
| `contentManager.js` | ✅ | 1307 | Content orchestrator, Shopify mapping | Main content system |
| `contentManagerEnhanced.js` | ⚠️ | 709 | Enhanced version with ContentManager class | **POTENTIAL DUPLICATE** |
| `contentTemplates.js` | ✅ | - | Content display templates | |

### Cart Utilities

| File | Status | Purpose |
|------|--------|---------|
| `cart-controller-utils.js` | ✅ | Cart controller factory |
| `cartIntegrationEnhancer.js` | ✅ | Enhanced cart detection |
| `cart/DrawerControllerRegistry.js` | ✅ | Controller registry |
| `cart/initCartToggleSphere.js` | ✅ | 3D toggle sphere init |
| `cart/SceneRegistry.js` | ✅ | Three.js scene registry |
| `cart/materials/` | ✅ | Shared Three.js materials |

### Menu Utilities

| File | Status | Purpose |
|------|--------|---------|
| `menuTransform.js` | ✅ | Shopify menu → carousel format |
| `menuTreeManager.js` | ✅ | Hierarchical menu navigation |
| `menuThemeSettings.js` | ✅ | Menu theming |
| `carouselAngleUtils.js` | ✅ | Angle calculations for ring layout |
| `homePositionUtils.js` | ✅ | 3/6/9/12 o'clock positioning |

### Testing Utilities (Client-Only)

| File | Status | Lines | Purpose | Notes |
|------|--------|-------|---------|-------|
| `integrationTests.client.js` | ⚠️ | 105 | Basic integration tests | **OVERLAPS** with watermelonIntegrationTests |
| `watermelonIntegrationTests.client.js` | ✅ | 230 | Full integration test suite | **KEEP THIS ONE** |
| `cartTestUtils.client.js` | ✅ | 145 | Cart-specific tests | |
| `menuTestUtils.client.js` | ✅ | 302 | Menu testing with mocks | |

### Other Utilities

| File | Status | Purpose |
|------|--------|---------|
| `global3DUtilities.js` | ✅ | Browser console debug commands |
| `loadFont.js` | ✅ | Three.js font loader |
| `shopifyProductIntegrationClean.js` | ✅ | Shopify product fetching |

### Server Utilities

| File | Status | Purpose |
|------|--------|---------|
| `env.server.ts` | ✅ | Server env vars | **GOLDEN FILE** |
| `env.public.ts` | ✅ | Public env vars | **GOLDEN FILE** |
| `backgroundAdminAuth.server.ts` | ✅ | Admin auth for backgrounds |
| `backgroundPresetApi.server.ts` | ✅ | Background preset API |
| `backgroundPresets.server.ts` | ✅ | Preset data management |
| `backgroundRenderer.client.ts` | ✅ | Background rendering |
| `buildInfo.server.ts` | ✅ | Build metadata |

---

## 8. HOOKS (`app/hooks/`)

| File | Status | Purpose |
|------|--------|---------|
| `useFavorites.js` | ✅ | Favorites state management |

---

## 9. STORES (`app/stores/`)

| File | Status | Purpose |
|------|--------|---------|
| `useFloatingContentStore.js` | ✅ | Zustand store for floating content |

---

## 10. LIB (`app/lib/`)

Standard Hydrogen utilities (mostly stock).

| File | Status | Purpose |
|------|--------|---------|
| `context.js` | ✅ | App context |
| `fragments.js` | ✅ | GraphQL fragments |
| `i18n.js` | ✅ | Internationalization |
| `search.js` | ✅ | Search utilities |
| `session.js` | ✅ | Session management |
| `variants.js` | ✅ | Product variants |

---

## 11. CUSTOM ROUTES (`app/routes/`)

### Active Custom Routes

| File | Status | Purpose |
|------|--------|---------|
| `admin.jsx` | ✅ | Admin panel route |
| `api.backgrounds.*.tsx` | ✅ | Background preset API endpoints |
| `api.products-3d.jsx` | ✅ | 3D product data API |
| `api.products-3d-simple.jsx` | ✅ | Simplified 3D product API |
| `api.test-digital-submenu.jsx` | ✅ | Submenu test endpoint |
| `api.test-3d.jsx` | ⚠️ | Test endpoint - review if needed |
| `api.test-client.jsx` | ⚠️ | Test endpoint - review if needed |
| `api.page.jsx` | ✅ | Page data API |
| `api.product.jsx` | ✅ | Product data API |

### Empty/Test Routes (🗑️ REMOVE)

| File | Status | Notes |
|------|--------|-------|
| `test-3d-products.jsx` | 🗑️ | **EMPTY FILE** |
| `simple-test.jsx` | 🗑️ | **EMPTY FILE** |
| `digital-products-test.jsx` | 🗑️ | **EMPTY FILE** |
| `test-digital-products-3d.jsx` | 🗑️ | **EMPTY FILE** |

---

## 12. SCRIPTS (`scripts/`)

### Active Scripts

| File | Status | Purpose |
|------|--------|---------|
| `env-check.mjs` | ✅ | Validate environment variables | **GOLDEN FILE** |
| `guard/prepush.mjs` | ✅ | Pre-push validation hook |
| `tools/archive-pruned-chats.mjs` | ✅ | Archive old chat logs |
| `tools/export-copilot-chats.mjs` | ✅ | Export chat transcripts |
| `generateProductModels.js` | ✅ | Generate placeholder 3D models |
| `setup-shopify-products.js` | ✅ | Shopify product setup |
| `test-integration-full.js` | ✅ | Full integration test runner |
| `test-threejs-update.js` | ✅ | Three.js upgrade tests |

### Debug Scripts (`scripts/debug/`)

All moved here during housekeeping. Development use only.

| File | Purpose |
|------|---------|
| `browser-test-submenu-click.js` | Browser submenu click tests |
| `debug-submenu-click.js` | Click debugging |
| `debug-submenu-click-flow.js` | Click flow debugging |
| `final-submenu-validation.js` | Final validation |
| `submenu-debug-monitor.js` | Debug monitor |
| `submenu-validation.js` | Submenu validation |
| `test-*.js` (many) | Various test scripts |

### Shell Scripts

| File | Status | Purpose |
|------|--------|---------|
| `cleanup-codebase.sh/.ps1` | ✅ | Codebase cleanup |
| `setup/cleanup-codebase.sh/.ps1` | 🗑️ | **DUPLICATE** of above |
| `fix-customer-account.sh` | ✅ | Customer account migration fix |
| `setup-phase2.sh/.ps1` | 📦 | Phase 2 setup (historical) |

---

## 13. PUBLIC TEST FILES (`public/`)

| File | Status | Purpose | Notes |
|------|--------|---------|-------|
| `test-3d-products.html` | ⚠️ | Test page | Consider moving to dev-workspace |
| `test-central-panel-system.html` | ⚠️ | Test page | Consider moving |
| `test-console-interface.html` | ⚠️ | Test page | Consider moving |
| `test-final-3d-system.html` | ⚠️ | Test page | Consider moving |
| `test-green-ring.html` | ⚠️ | Test page | Consider moving |
| `test-products.html` | ⚠️ | Test page | Consider moving |
| `test-shopify-glb-data.html` | ⚠️ | Test page | Consider moving |
| `test-updated-3d-system.html` | ⚠️ | Test page | Consider moving |

---

## 14. BACKUP/DEV-WORKSPACE

These directories contain archived code. Not part of active build.

| Directory | Status | Purpose |
|-----------|--------|---------|
| `backup/` | 📦 | Route/component backups |
| `dev-workspace/` | 📦 | Development sandbox, old versions |
| `docs/archives/` | 📦 | Archived documentation |

---

## 🚨 REDUNDANCY SUMMARY

### Files to DELETE (Empty/Unused)

```
app/components/Carousel3DPro/Carousel3DSubmenu_WORKING.js  # Empty
app/routes/test-3d-products.jsx                            # Empty
app/routes/simple-test.jsx                                 # Empty
app/routes/digital-products-test.jsx                       # Empty
app/routes/test-digital-products-3d.jsx                    # Empty
scripts/setup/cleanup-codebase.sh                          # Duplicate
scripts/setup/cleanup-codebase.ps1                         # Duplicate
```

### Files to CONSOLIDATE

1. **CartHUDIcon3D.js** — Two versions exist:
   - `app/components/Carousel3DPro/CartHUDIcon3D.js` (383 lines, more complete)
   - `app/components/cart-drawers/CartHUDIcon3D.js` (161 lines, simpler)
   - **Action:** Keep Carousel3DPro version, update imports in cart-drawers

2. **ContentManager** — Two overlapping systems:
   - `app/utils/contentManager.js` (1307 lines)
   - `app/utils/contentManagerEnhanced.js` (709 lines)
   - **Action:** Review and merge; they serve slightly different purposes

3. **Integration Tests** — Two test files:
   - `app/utils/integrationTests.client.js` (105 lines) — basic
   - `app/utils/watermelonIntegrationTests.client.js` (230 lines) — comprehensive
   - **Action:** Keep watermelonIntegrationTests, migrate any unique tests, delete integrationTests

4. **CentralContentPanel** — Two versions:
   - `CentralContentPanel.js` (Three.js class)
   - `CentralContentPanelEnhanced.jsx` (React component)
   - **Action:** Review if both needed or can merge

5. **Carousel3DProWrapper** — Two files:
   - `Carousel3DProWrapper.jsx`
   - `Carousel3DProWrapper.client.jsx`
   - **Action:** Verify which is active, consolidate

---

## 📊 FILE STATISTICS

| Category | Files | Lines (est.) |
|----------|-------|--------------|
| 3D Core | 22 | ~8,000 |
| Cart System | 17 | ~2,500 |
| Backgrounds | 10 | ~1,500 |
| Utilities | 24 | ~4,000 |
| Routes (custom) | 15 | ~800 |
| Scripts | 20 | ~1,200 |
| **Total Custom** | **~108** | **~18,000** |

---

## 🎯 RECOMMENDED CLEANUP ACTIONS

### Priority 1: Delete Empty Files
7 files, 0 lines — immediate cleanup

### Priority 2: Consolidate Duplicates
5 consolidation opportunities — reduces confusion for AI agents

### Priority 3: Move Test HTML Files
8 test HTML files in `public/` → move to `dev-workspace/test-pages/`

### Priority 4: Archive Unused Scripts
Consider moving `scripts/debug/` scripts to archive if not regularly used

---

## 🤖 AI ONBOARDING QUICK REFERENCE

**Start here for understanding the codebase:**

1. `app/components/Carousel3DPro/main.client.js` — Entry point for 3D
2. `app/components/Carousel3DPro/Carousel3DPro.js` — Main carousel logic
3. `app/utils/contentManager.js` — Content/Shopify integration
4. `app/components/cart-drawers/CartDrawerController.jsx` — Cart system entry
5. `app/components/context/cart-ui.jsx` — React/3D bridge

**Key patterns:**
- All Three.js code uses `typeof window !== 'undefined'` guards
- React wraps 3D in `<ClientOnly>` components
- Event bridge: `window.dispatchEvent()` ↔ React context listeners
- Env vars: Use `envPublic` / `envServer` wrappers only

