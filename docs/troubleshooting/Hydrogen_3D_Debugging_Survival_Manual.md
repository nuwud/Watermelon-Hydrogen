
# 🧠 Hydrogen + Three.js: Debugging Survival Manual

> A companion troubleshooting guide for 3D-enabled Hydrogen storefronts.

This document collects **common issues** and **field-tested fixes** that arise when building a Shopify Hydrogen site with embedded Three.js functionality.

---

## 🚨 SSR Hydration Mismatch

**Symptom:** React hydration errors, blank screens.

**Fix:**
```jsx
<ClientOnly>
  <ThreeCanvas />
</ClientOnly>
```

---

## ⚙️ Module Import Errors

**Symptom:** Vite fails to resolve `.js` file.

**Fix:**
```js
// Use consistent imports without extensions:
import { Carousel3DPro } from './Carousel3DPro';
```

---

## 🔤 TextGeometry Distortion

**Symptom:** Text looks stretched or warped.

**Fix:**
```js
const geometry = new TextGeometry(label, {
  font: loadedFont,
  size: 0.5,
  height: 0.1,
  bevelEnabled: true,
});
geometry.center();
mesh.userData.originalScale = mesh.scale.clone();
```

---

## 🖱️ Scroll Wheel Misfires

**Symptom:** Zooms when it should spin carousel or submenu.

**Fix:**
```js
window.addEventListener('wheel', (event) => {
  if (submenuOpen) {
    rotateSubmenu(event.deltaY);
  } else {
    rotateMainCarousel(event.deltaY);
  }
  event.preventDefault();
});
```

---

## 🔃 GitHub Sync Hangs

**Symptom:** VSCode GitHub panel stuck.

**Fix:**
- Use CLI: `git commit -m "Backup"` → `git push`
- Or create local zip backups until resolved

---

## 🔠 Font Not Rendering

**Symptom:** No text, no errors.

**Fix:**
```js
fontLoader.load('/fonts/helvetiker_regular.typeface.json', (font) => {
  const geometry = new TextGeometry('Text', { font, size: 0.5, height: 0.1 });
});
```

---

## ✅ Debugging Tips

- Use `console.log(mesh.getWorldScale())` to inspect inherited scale.
- Always isolate 3D logic to client-side only.
- Review DOM container styles for overflow, transforms, and dimensions.

---

## 🧠 Trügüd's Final Advice

> "Patience in bugs is the currency of greatness."

1. When stuck, isolate the cause.
2. Simplify until it works.
3. Rebuild smarter, not harder.

---

Happy coding! 🚀
