# 🍉 Watermelon Hydrogen — Copilot Instructions (Project‑Specific Guardrails, v3)

**Repo:** Watermelon Hydrogen V1
**Stack:** Shopify Hydrogen (Remix) • Three.js • GSAP • Tailwind • Vite • Oxygen
**This file is for Copilot (Chat, Edit, Coding Agent) when working in this repo.**
*Last updated: 2025‑10‑13*

---

## 0) Prime Directives (must follow)

* **No raw env in `app/**`.** Use:

  * `~/utils/env.server` for **server‑only**: `PRIVATE_STOREFRONT_API_TOKEN`, `SESSION_SECRET`, `SHOP_ID`.
  * `~/utils/env.public` for **public**: `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_API_TOKEN`, `PUBLIC_STOREFRONT_ID`, `PUBLIC_STOREFRONT_API_VERSION`, `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`, `PUBLIC_CUSTOMER_ACCOUNT_API_URL`, optional `PUBLIC_CHECKOUT_DOMAIN`, optional `PUBLIC_CANONICAL_HOST`.
  * **Forbidden in `app/**`:** `process.env`, `import.meta.env`, `context.env`.
* **No hard‑coded domains** anywhere in `app/**`. Always read from `envPublic`. (Never inline `nuwudorder.com`, `nx40dr-bu.myshopify.com`, or `*.o2.myshopify.dev`.)
* **SSR safety for 3D.** Three.js and browser APIs must be guarded: `typeof window !== 'undefined'`, `<ClientOnly>`, and dynamic imports.
* **Secrets & files.** Don’t print secrets. Don’t commit `.env*` (only `.env.sample`). Don’t add files > **80 MB**; exclude `docs/chats/*.json`.
* **Definition of Done:** `npm run env:check && npm run lint && npm run build` all pass; scans show no forbidden env usage or hard‑coded domains; diffs are minimal and explained.

---

## 1) Golden Files & High‑Risk Modules (ask‑before‑edit)

**Golden files**

* `app/entry.server.jsx`, `app/root.jsx`
* `app/utils/env.server.ts`, `app/utils/env.public.ts`
* `scripts/env-check.mjs`
* Configs: `hydrogen.config.*`, `remix.config.*`, `vite.config.*`

**High‑risk modules (preserve invariants)**

* `app/components/Carousel3DPro/**`
* `app/components/Carousel3DPro/Carousel3DSubmenu.js`
* `app/components/FloatingPreview.js`
* `app/components/cart-drawers/**` (renderer/mount)
* `app/components/context/cart-ui.jsx`

> If modification seems necessary, **propose diffs first** with rationale and risks. Provide BEFORE→AFTER snippets.

---

## 2) Edit Protocol (Scan → Plan → Patch)

**Scan**

* Env misuse in `app/**`:
  `process\.env|import\.meta\.env|context\.env`
* Hard‑coded domains:
  `ynx40dr|nx40dr-bu\.myshopify\.com|nuwudorder\.com|o2\.myshopify\.dev`
* SSR hazards: direct DOM/Three usage outside `<ClientOnly>` or without `typeof window`.

**Plan**

* Keep patches small and localized.
* State acceptance: env\:check, lint, build must pass.

**Patch**

* Replace raw env reads with `envServer`/`envPublic`.
* Parameterize or remove hard‑coded domains.
* Move browser‑only code behind dynamic import + `<ClientOnly>`.
* Include BEFORE→AFTER code in PR description.

---

## 3) 3D + UI Invariants (don’t break these)

**Carousel3D (Pro/Submenu)**

* GSAP controls rotation; only **one authority** updates `currentIndex` at a time.
* Allowed mutation points:

  * End of `selectItem()` animation (via `onComplete`).
  * Explicit non‑animated snap when `isTransitioning === false`.
* Guard flags: `isTransitioning`, `forceLockedIndex`, `selectItemLock`.
  Do **not** change indices mid‑animation outside guarded sections.
* Front‑face highlight logic must not override a user‑initiated selection until locks clear.
* Maintain “3 o’clock” home position (config via homePosition utils) regardless of submenu length.

**FloatingPreview**

* Always center text/mesh relative to itemGroup world position; keep Y‑axis spin (no tumble).
* Avoid stretched text by normalizing scale and using `TextGeometry.center()`.

**Cart Drawer Bridge**

* Communication is via event + context only: `window.dispatchEvent(new Event('cart-toggle-clicked'))` ↔ `cart-ui.jsx`.
* Don’t manually poke DOM outside of ClientOnly.

**Disposal**

* On teardown: `GSAP.killTweensOf(targets)`, remove listeners, and `obj.traverse()` to `.dispose()` geometries/materials.
* Ensure renderer and controls are properly disposed.

---

## 4) Patterns & Snippets

**SSR‑safe dynamic import (Three.js)**

```tsx
useEffect(() => {
  if (typeof window === 'undefined') return;
  (async () => {
    const {setupScene} = await import('./threeScene.js');
    setupScene(containerRef.current);
  })();
}, []);
```

**ClientOnly mount**

```tsx
<ClientOnly fallback={<div>Loading…</div>}>
  {() => <ThreeHUD />}
</ClientOnly>
```

**Cart toggle event bridge**

```ts
// Dispatch
window.dispatchEvent(new Event('cart-toggle-clicked'));

// Listen
useEffect(() => {
  const onToggle = () => toggleCart();
  window.addEventListener('cart-toggle-clicked', onToggle);
  return () => window.removeEventListener('cart-toggle-clicked', onToggle);
}, [toggleCart]);
```

**Disposal**

```ts
obj.traverse((child) => {
  child.geometry?.dispose?.();
  if (Array.isArray(child.material)) child.material.forEach((m) => m?.dispose?.());
  else child.material?.dispose?.();
});
renderer?.dispose?.();
```

---

## 5) Shopify/Hydrogen Integration Rules

**Loader pattern**

```ts
export async function loader({context, params}) {
  const data = await context.storefront.query(QUERY, {variables: {handle: params.handle}});
  return json(data);
}
```

**Env usage**

* Public: from `envPublic` only.
* Server: from `envServer` only (never leak to client).
* Storefront client must use `envPublic.PUBLIC_STOREFRONT_API_VERSION`.

**CSP / headers**

* `createContentSecurityPolicy({ shop: { storeDomain, checkoutDomain } })` reads from `envPublic` only.
* No secrets in headers or logs.

**Canonical host (if enabled)**

* If `envPublic.PUBLIC_CANONICAL_HOST` is set, perform HTTPS 301 to that host while preserving path + query.

---

## 6) Performance Targets

* 3D bundle increment: **≤ 800 KB** (ideal ≤ 500 KB).
* Prefer dynamic imports for heavy submodules and debug UIs.
* Reuse geometries/materials; enable frustum culling.
* Scene init budget: \~2s on mid‑range mobile.

> If a change adds >400 KB to client bundle, propose code‑split plan before patching.

---

## 7) Known Issues (where help is welcome)

* Submenu highlight override during rapid selection (race between rotation & highlight).
* Intermittent cart drawer non‑open after heavy scene transitions.
* Floating preview text stretch in specific FOV setups.
* Mobile portrait panel alignment.

**Good Copilot targets**

* Unify `select/lock/highlight` via small state machine.
* Extract floating preview math; test across FOV/offsets.
* Add `disposeManager` helper for deterministic teardown.

---

## 8) Validation Gates (must pass)

* `npm run env:check` (no secrets printed)
* `npm run lint`
* `npm run build`
* No files > 80 MB; no `docs/chats/*.json` tracked

**Never commit:** `.env`, `.env.development`, `.env.production` (use `.env.sample` only)

---

## 9) Spec-Driven Development with Spec-Kit

**GitHub Spec-Kit Integration**

This project uses [GitHub Spec-Kit][spec-kit] for spec-driven development workflows. Available slash commands:

[spec-kit]: https://github.com/github/spec-kit

**Core Commands (use in order):**
* `/speckit.constitution` — Establish project principles and development guidelines
* `/speckit.specify` — Define feature requirements (focus on WHAT and WHY, not tech stack)
* `/speckit.plan` — Create technical implementation plan with tech stack choices
* `/speckit.tasks` — Generate actionable task breakdown with dependencies
* `/speckit.implement` — Execute implementation according to plan

**Enhancement Commands (optional):**
* `/speckit.clarify` — Clarify underspecified areas before planning
* `/speckit.analyze` — Cross-artifact consistency analysis (run after tasks, before implement)
* `/speckit.checklist` — Generate quality validation checklists

**Spec-Kit Workflow Pattern:**

```
1. /speckit.constitution (if new feature area)
2. /speckit.specify "Build a feature that allows users to..."
3. /speckit.clarify (optional - if requirements unclear)
4. /speckit.plan "Use Shopify Hydrogen with Three.js..."
5. /speckit.tasks
6. /speckit.analyze (optional - validate consistency)
7. /speckit.implement
```

**Spec-Kit File Structure:**

```
.specify/
  memory/
    constitution.md   — Project principles (gitignored)
  scripts/bash/       — Automation scripts
  templates/          — Spec/plan/task templates
specs/
  001-feature-name/   — Each feature gets a numbered directory
    spec.md          — Feature specification
    plan.md          — Technical implementation plan
    tasks.md         — Task breakdown
    research.md      — Technical decisions (gitignored)
    quickstart.md    — Validation scenarios (gitignored)
    data-model.md    — Data models (optional)
    contracts/       — API specs (optional)
```

**Spec-Kit Integration with This Project:**

* Constitution should reference Prime Directives (env safety, SSR, no hard-coded domains)
* Plans must specify: Hydrogen/Remix, Three.js, GSAP, Tailwind
* Tasks must include: `npm run env:check && npm run lint && npm run build` validation
* Implementation must follow 3D invariants and golden file policies

---

## 10) Delegation & Prompt Macros

**Delegate to Coding Agent (safe scope)**

```
Implement /health and /version routes and set SSR headers.
Constraints: no secrets; env via envPublic only; minimal diffs; green build.
Acceptance: routes return JSON with no-store; headers X-WM-Env/Store/Build; CI passes.
#github.vscode-pull-request-github/copilotCodingAgent
```

**Bug‑fix macro (Scan → Plan → Patch)**

```
Task: Remove raw env usage and hard-coded domains in app/**
Scan: grep (process.env|import.meta.env|context.env) and (ynx40dr|nuwudorder.com|o2.myshopify.dev)
Plan: minimal diffs; acceptance = env:check, lint, build
Patch: apply diffs; show BEFORE→AFTER
```

**Spec-Kit feature development macro**

```
/speckit.specify [Feature description focusing on user value and behavior]
Wait for spec.md generation, then:
/speckit.plan Tech stack: Hydrogen/Remix, Three.js r180, GSAP, Tailwind. 
Constraints: SSR-safe, no raw env, no hard-coded domains. 
Follow carousel invariants if 3D changes needed.
```

**Golden file policy**

```
Do not modify golden files unless explicitly requested.
If needed, first propose diffs with rationale & risk notes.
```

---

## 11) Data Flow & Content Architecture

**Content Management System (CMS)**

* `app/utils/contentManager.js` — Central content orchestrator
  * Loads `/nuwud-menu-structure-final.json` (menu definition)
  * Maps Shopify products to 3D menu items via handles/titles/tags
  * Provides `getContentData(itemName)` for on-demand content loading
  * Exposed globally as `window.contentManager` for 3D scene integration
* `app/utils/contentTemplates.js` — Content display templates
* Product GLB models: Fetched from Shopify metafields or default paths (`/assets/models/default/{id}.glb`)

**Shopify Data Flow**

```
Loader (route) → context.storefront.query(QUERY) → json(data) → Component
                                                              ↓
                                         contentManager.mapShopifyProductsToMenu()
                                                              ↓
                                                   3D Scene (main.js)
```

**Cart System Bridge**

* `app/components/context/cart-ui.jsx` — React context for cart state
* `app/components/cart-drawers/CartDrawerController.jsx` — Drawer orchestrator
* Communication: `window.dispatchEvent(new Event('cart-toggle-clicked'))` ↔ `cart-ui.jsx` listeners
* 3D integration: `CartHUDIcon3D.js` dispatches events → React context updates → drawer renders

**Testing & Debug Utilities**

* Browser console globals:
  * `window.contentManager` — Content operations & cache
  * `window.debugCarousel` — Scene inspection & manipulation
  * `window.watermelonAdmin` — Visual admin panel
  * `window.integrationTests` — Full integration test suite
  * `window.cartTestUtils` — Cart debugging
* Run full test: `window.integrationTests.runFullIntegrationTest()`
* Clear content cache: `window.contentManager.clearCache()`

---

## 12) File Structure Patterns

**Route Structure (Remix conventions)**

```
app/routes/
  _index.jsx         — Homepage (renders 3D carousel)
  ($locale).*.jsx    — Localized routes
  *.jsx              — Standard routes (product, cart, etc.)
```

**Component Organization**

```
app/components/
  Carousel3DPro/           — Main 3D carousel system
    main.js                — Core scene setup & lifecycle (⚠️ HIGH-RISK)
    Carousel3DPro.js       — Main menu wheel logic
    Carousel3DSubmenu.js   — Submenu wheel logic
    Carousel3DProWrapper.jsx — React SSR-safe wrapper
    modules/               — Modular subsystems
  cart-drawers/            — Cart UI & 3D integration
  context/                 — React contexts (cart-ui, etc.)
  ClientOnly.jsx           — SSR shield for browser-only code
```

**3D Asset Paths**

* Fonts (Three.js): `/public/fonts/*.json` (typeface.js format)
* 3D Models: `/public/assets/models/default/*.glb` or Shopify CDN
* Textures: `/public/assets/textures/`

---

## 13) Build & Development Commands

**Essential Commands**

```bash
npm run dev          # Local dev server (http://localhost:3000)
npm run build        # Production build (must pass before commit)
npm run lint         # ESLint check (must pass before commit)
npm run env:check    # Validate env vars (supports .env.development fallback)
npm run codegen      # Regenerate Shopify GraphQL types
```

**Shopify Linking**

```bash
npx shopify hydrogen link --storefront "Watermelon-Hydrogen"
```

**CI/CD Context**

* `WM_CI_CONTEXT=pr` — PR builds only validate PUBLIC_* env vars (no secrets)
* Default/main — Full validation (server + public env vars)
* Auto-deploy: Push to `main` = production; other branches = preview

**Definition of Done (automated gates)**

```bash
npm run env:check && npm run lint && npm run build
```

All three must pass. Additionally:
* No `process.env`, `import.meta.env`, or `context.env` in `app/**`
* No hard-coded domains in `app/**`
* No files > 80 MB committed
* No `.env*` files committed (only `.env.sample`)

---

## 14) Common Debugging Workflows

**Issue: 3D Scene Not Rendering**

1. Check browser console for `ClientOnly is running` log
2. Verify `typeof window !== 'undefined'` guards around Three.js imports
3. Inspect `window.debugCarousel.debug.listSceneContents()`
4. Check `app/routes/_index.jsx` wraps carousel in `<ClientOnly>`

**Issue: Products Not Loading in 3D**

1. Run: `window.contentManager.getContentData("Product Name")`
2. Check Shopify product has correct handle/tags in admin
3. Verify `/nuwud-menu-structure-final.json` maps to product
4. Test with: `window.integrationTests.runFullIntegrationTest()`

**Issue: Cart Not Opening**

1. Test: `window.cartTestUtils.testCartIntegration()`
2. Verify `window.drawerController` exists
3. Check `cart-ui.jsx` event listeners registered
4. Try: `window.integrationTests.testWithSimulatedCart()`

**Issue: Build Failing**

1. Run `npm run env:check` — ensure all required env vars set
2. Check for SSR violations: grep `app/**` for raw `window`, `document`, Three.js imports
3. Scan for env misuse: `(process\.env|import\.meta\.env|context\.env)` in `app/**`
4. Verify no circular imports in `utils/`

**Issue: Memory Leaks / Performance**

1. Check Three.js disposal: `obj.traverse()` → `.dispose()` on geometries/materials
2. Verify GSAP cleanup: `GSAP.killTweensOf(targets)` in teardown
3. Confirm event listeners removed: `removeEventListener` in useEffect cleanup
4. Monitor: `window.debugCarousel.debug.getPerformanceStats()`

---

## 15) Documentation Index

* **Entry Points:**
  * `docs/README.md` — Main documentation hub
  * `README.md` — Quick start & overview
  * `DEVELOPMENT_GUIDE.md` — Setup & testing guide
  * `FINAL_INTEGRATION_GUIDE.md` — Comprehensive testing procedures
* **Technical Deep-Dives:**
  * `docs/3D_SYSTEMS_COMPREHENSIVE_DOCUMENTATION.md` — Complete 3D architecture
  * `docs/WATERMELON_3D_COMPLETE_IMPLEMENTATION.md` — 3D product display system (⭐ master reference)
  * `docs/TECHNICAL_ARCHITECTURE_JUNE_2025.md` — System architecture overview
* **Strategic Planning:**
  * `docs/STRATEGIC_ROADMAP_2025.md` — Development roadmap & priorities
  * `docs/improvements/` — 17+ architectural improvement proposals
* **Debugging & Operations:**
  * `docs/Hydrogen_3D_Debugging_Survival_Manual.md` — Common issues & fixes
  * `docs/BUILD_TROUBLESHOOTING_GUIDE.md` — Build error resolution
  * `docs/SUBMENU_VALIDATION_GUIDE.md` — 3D submenu testing
* **Chat Archives:**
  * `docs/chats/` — Copilot conversation transcripts (excluded from commits)