# 🍉 Watermelon Hydrogen - GitHub Copilot Instructions (Extended)

## Project Overview

This is **Watermelon Hydrogen V1**, an immersive 3D e-commerce interface built with **Shopify Hydrogen (Remix)** and **Three.js**. It offers an interactive 3D product navigation experience powered by modular architecture, dynamic content loading, and advanced animation control.

## 🎯 Development Philosophy

### WatermelonOS Methodology: Investigation-First Engineering

* 🔍 **Investigate First**: Use semantic search + `console.warn('[🍉 Watermelon]')` markers before modifying code
* 🤮 **Test Before Patch**: Always ask "Why is this breaking?" before fixing
* 🛠 **Surgical Commits**: One isolated change at a time
* ⏪ **Trace It Backwards**: Reverse-engineer from symptoms to root cause

### Project Maturity

* Enterprise-grade, production-ready foundation
* Architecture audits, performance targets, and accessibility roadmaps completed
* Bundled with strategic 2025 roadmap and full dev documentation

## 🎓 Technology Stack

* **Frontend**: Shopify Hydrogen v2025.4.1 (Remix-based)
* **3D Engine**: Three.js v0.177.0
* **Animations**: GSAP v3.12.7
* **Styling**: Tailwind CSS (used for HUD)
* **Build Tooling**: Vite + Remix
* **Deployment**: Shopify Oxygen + GitHub Actions

## 🏠 File System Overview

```
app/
├── components/
│   ├── Carousel3DPro/          # 3D carousel system
│   ├── cart-drawers/           # Cart drawer logic and icons
│   ├── context/                # React Context for cart/state
│   ├── panels/                 # Floating panels and overlays
│   └── admin/                  # Admin tools
├── routes/                     # Remix routes
├── utils/                      # Shared utilities
├── lib/                        # GraphQL and backend utils
└── styles/                     # Tailwind and global styles
```

## 🔹 Copilot Role Map

| File                   | Copilot Role                                |
| ---------------------- | ------------------------------------------- |
| `main.js`              | Orchestrator: load/unload, scene manager    |
| `Carousel3DPro.js`     | Highlight and menu rotation logic           |
| `Carousel3DSubmenu.js` | Submenu controller, transition guard logic  |
| `FloatingPreview.js`   | Positioning, text centering, face alignment |
| `cart-ui.jsx`          | Cart state and UI controller                |
| `CartHUDIcon3D.js`     | 3D ↔ UI cart trigger bridge                 |

## 🪡 Common Copilot Patterns

### Dynamic Import (SSR Safety)

```js
useEffect(() => {
  if (typeof window === 'undefined') return;
  import('./threeScene.js').then(({ setupScene }) => {
    setupScene(containerRef.current);
  });
}, []);
```

### ClientOnly Three.js Mount

```jsx
<ClientOnly fallback={<div>Loading...</div>}>
  {() => <ActualThreeComponent />}
</ClientOnly>
```

### React Context + Event Dispatch

```js
window.dispatchEvent(new Event('cart-toggle-clicked'));
```

## 👩‍💻 Copilot Trigger Comments

```js
// 🧐 copilot-suggest: Improve HUD layout on mobile
// @copilot optimize: Reduce memory allocation in loop
// TODO: Migrate submenu lock state to context
// ? Should we extract floating panel to utility class?
```

## 🔢 Core Systems

### Carousel3D System (`Carousel3DPro`)

* Uses GSAP for rotation transitions
* Highlights and centers the front-facing item
* Submenus use `Carousel3DSubmenu.js`

### Cart Drawer Integration

* `window.dispatchEvent('cart-toggle-clicked')` ↔ `CartDrawerController`
* Syncs 3D cart with UI drawer via `cart-ui.jsx` React Context

### Content Loader

* Uses `ContentManager.js` with template fallback for dynamic page loading

### Templates

* Supports 5 templates: `page`, `cart`, `product`, `collection`, `custom`

## 🔎 Copilot Suggestion Targets

| Area            | Prompt                                                |
| --------------- | ----------------------------------------------------- |
| Bundle size     | Suggest tree-shaking, dynamic import                  |
| Submenu         | Refactor select/lock logic to avoid highlight flicker |
| Floating panels | Center preview based on camera FOV + offset           |
| Disposal        | Use `.traverse()` to dispose child objects            |
| HUD themes      | Suggest color/shape variation modules                 |
| Cart icons      | Suggest HUD positioning variants                      |

## 🚫 Critical Rules

### SSR Safety

* Wrap ALL Three.js code in `<ClientOnly>`
* `typeof window !== 'undefined'` before accessing browser APIs
* Use dynamic imports for browser-only code

### Memory Management

* Call `.dispose()` on geometries, materials, renderers
* Remove all event listeners in cleanup
* Use `objectPool.js` patterns when creating repeating objects

### Performance

* Enable frustum culling
* Reuse objects and materials
* Target <500KB bundle (currently 781KB)
* Keep 3D load time <2s

## 🚀 Shopify Integration

### GraphQL Query Pattern

```js
export async function loader({ context }) {
  const data = await context.storefront.query(QUERY, {
    variables: { handle }
  });
  return json(data);
}
```

### Metafield Loading

```js
const content = await contentManager.loadContent('my-id', {
  template: 'product',
  fallback: 'default'
});
```

## 🚧 Known Issues

* [ ] Submenu highlight overrides on fast item changes
* [ ] Cart drawer fails to open after certain scene loads
* [ ] Floating preview text still stretches in some camera positions
* [ ] Panel misalignment on mobile portrait mode
* [ ] Scene disposal misses nested objects unless `.traverse()` used

## 📊 Deployment

* `npm run dev` - Local development
* `npm run build` - Production build
* Shopify CLI required for Oxygen deploy
* Uses GitHub Actions CI/CD

### Pre-Deployment Checklist

* [ ] No SSR violations (`ClientOnly` present)
* [ ] No console errors in browser
* [ ] All GraphQL loaders return correct data
* [ ] Cart + scene load time under 2s
* [ ] Mobile HUD position tested

## 📄 Documentation Index

* `docs/README.md` - Entry point
* `docs/3D_SYSTEMS_COMPREHENSIVE_DOCUMENTATION.md`
* `docs/STRATEGIC_ROADMAP_2025.md`
* `docs/improvements/` folder for proposals, audits, enhancement plans

## ✨ Success Metrics

* ✅ Copilot suggestions match modular architecture
* ✅ Performance or maintainability improved
* ✅ Matches documented naming and structure conventions
* ✅ Includes cleanup + error handling logic
* ✅ Adheres to accessibility roadmap

---

*Last Updated: July 2025 — Includes merged insight from all changelogs and docume