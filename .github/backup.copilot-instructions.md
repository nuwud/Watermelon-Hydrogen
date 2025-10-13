# 🍉 Watermelon Hydrogen — Copilot Instructions (Project‑Specific Guardrails, v2)

**Repo:** Watermelon Hydrogen V1
**Stack:** Shopify Hydrogen (Remix) • Three.js • GSAP • Tailwind • Vite • Oxygen
**This file is for Copilot (Chat, Edit, Coding Agent) when working in this repo.**
*Last updated: 2025‑09‑24*

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

## 9) Delegation & Prompt Macros

**Delegate to Coding Agent (safe scope)**

```
Implement /health and /version routes and set SSR headers.
Constraints: no secrets; env via envPublic only; minimal diffs; green build.
Acceptance: routes return JSON with no-store; headers X-WM-Env/Store/Build; CI passes.
#copilotCodingAgent
```

**Bug‑fix macro (Scan → Plan → Patch)**

```
Task: Remove raw env usage and hard-coded domains in app/**
Scan: grep (process.env|import.meta.env|context.env) and (ynx40dr|nuwudorder.com|o2.myshopify.dev)
Plan: minimal diffs; acceptance = env:check, lint, build
Patch: apply diffs; show BEFORE→AFTER
```

**Golden file policy**

```
Do not modify golden files unless explicitly requested.
If needed, first propose diffs with rationale & risk notes.
```

---

## 10) Documentation Index

* `docs/README.md` (entry)
* `docs/3D_SYSTEMS_COMPREHENSIVE_DOCUMENTATION.md`
* `docs/STRATEGIC_ROADMAP_2025.md`
* `docs/improvements/*` (audits & proposals)
* `docs/chats/*` (Copilot chat transcripts)