# 🛠️ Hydrogen + Three.js Troubleshooting Guide

## 🧩 Common Issues & Fixes

### ❌ `window is not defined`
**Cause:** Three.js or other browser-only code was run during server-side rendering (SSR).

**Fix:**
```js
if (typeof window !== "undefined") {
  // Safe browser code here
}
```

---

### ❌ 3D Scene Doesn't Show Up on Live Site
**Cause:** Shopify Hydrogen defaults to Dawn theme or outdated deployment.

**Fix:**
1. Make sure you pushed to `main`.
2. Visit Shopify Admin → Hydrogen → Storefronts → Set your new Hydrogen app as **Live**.

---

### ❌ Scroll Zooming Instead of Rotating Carousel
**Cause:** `OrbitControls` default zoom behavior was not disabled.

**Fix:** In `main.js` or wherever `OrbitControls` is used:
```js
controls.enableZoom = false;
// Use mouse button press + move for zoom instead
```

---

### ❌ Deployment 404 / PR Blocking Main
**Cause:** PR created by Shopify bot for Oxygen workflow wasn't merged.

**Fix:** Manually add `.github/workflows/oxygen.yml` (this file) and delete or close the PR.

---

## ✅ Deployment Checklist

- [x] Wrapped all `window` and `document` calls with type guards
- [x] Confirmed `.env` values are synced to Shopify Oxygen
- [x] Deployed via `npx shopify hydrogen deploy` or via GitHub Actions
- [x] Set Production storefront live in Hydrogen admin

---

## 📡 Need Help?
DM `@nuwud` or check [https://shopify.dev/docs/custom-storefronts/hydrogen](https://shopify.dev/docs/custom-storefronts/hydrogen)