# 🍉 Watermelon Hydrogen V1

A fully immersive 3D-powered Shopify storefront built with **Hydrogen**, **Three.js**, and **Oxygen**, featuring a dynamic 3D carousel menu and future-ready admin HUD.

---

## 🚀 What Is This?

**Watermelon Hydrogen V1** is a custom Hydrogen-based Shopify theme that renders a full Three.js experience inside your storefront UI. It features:

- A 3D main carousel (Watermelon Menu)
- Scrollable submenus
- Responsive, SSR-safe canvas rendering
- Client-only mounted WebGL scenes
- Shopify metafield/product integration pipeline
- GitHub + Shopify Oxygen continuous deployment
- Modular expansion path for Admin HUD and recurring billing integration

---

## 🧠 Tech Stack

- Shopify Hydrogen (Remix-based frontend)
- Three.js (native rendering)
- Vite (local dev server + bundler)
- Oxygen (Shopify's deployment platform)
- GitHub Actions (auto deploy + PR workflows)
- Tailwind CSS (fully optional, used for HUD/overlay UI)
- GSAP (for Three.js animations)
- ESLint + Prettier + TypeScript

---

## 📂 Folder Structure Highlights

```
app/
├── components/
│   ├── Carousel3D.jsx            # Initial Three.js 3D mount
│   ├── Carousel3DPro.js          # Main menu wheel logic
│   ├── Carousel3DSubmenu.js      # Submenu wheel logic
│   ├── Carousel3DProWrapper.jsx  # React safe client-only wrapper
│   ├── ClientOnly.jsx            # Prevent SSR canvas crash
├── routes/
│   ├── _index.jsx                # Homepage renders the Three.js scene
public/
├── fonts/                        # Three.js-compatible typeface fonts
├── assets/                       # GLTF models or scene textures
```

---

## 💻 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/nuwud/Watermelon-Hydrogen.git
cd Watermelon-Hydrogen
npm install
```

### 2. Link to Shopify Storefront
```bash
npx shopify hydrogen link --storefront "Watermelon-Hydrogen"
```

### 3. Run Locally
```bash
npm run dev
```
Browse to [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deployment via Oxygen

This repository is connected to **Shopify Oxygen** via GitHub integration.

- ✅ Push to `main` = Production deploy
- ✅ Push to other branches = Preview deploy
- ✅ Pull Requests show deployment previews

Live deployment:
> https://watermelon-hydrogen-v1-f8c761aca3a3f342b54f.o2.myshopify.dev/

---

## 📈 What This Unlocks (Next Steps)

- Build immersive product interfaces with GLTF or 3D menus
- Hook up recurring payments with Stripe or Recharge
- Control 3D experiences from metafields or admin HUD
- Fetch/store customer data with Customer Account API
- Trigger authenticated sessions using OAuth

---

## 🛠 Developer Notes

To avoid `window is not defined` SSR errors:
```js
if (typeof window !== 'undefined') {
  // Safe to run Three.js or DOM logic
}
```

To render Three.js only on the client:
```jsx
<ClientOnly>
  <Carousel3DProWrapper />
</ClientOnly>
```

---

## 📄 Hydrogen Docs

For full reference to the Hydrogen framework itself, see the original [Hydrogen README](docs/README-hydrogen.md) or [Shopify Hydrogen Docs](https://shopify.dev/custom-storefronts/hydrogen)

---

## 👨‍💻 Made by Patrick Allan Wood
[NUWUD Multimedia](https://nuwud.net) | West Hills, CA

---
```

---

### ✅ Optional Follow-Ups

1. Save the original Hydrogen README into `docs/README-hydrogen.md`
2. Add a root `TROUBLESHOOTING.md` for broken deployments or SSR traps
3. Add `STARTER-KIT.md` to explain how to reuse this as a template


# Hydrogen template: Skeleton

Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.

[Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
[Get familiar with Remix](https://remix.run/docs/en/v1)

## What's included

- Remix
- Hydrogen
- Oxygen
- Vite
- Shopify CLI
- ESLint
- Prettier
- GraphQL generator
- TypeScript and JavaScript flavors
- Minimal setup of components and routes

## Getting started

**Requirements:**

- Node.js version 18.0.0 or higher

```bash
npm create @shopify/hydrogen@latest
```

## Building for production

```bash
npm run build
```

## Local development

```bash
npm run dev
```

## Setup for using Customer Account API (`/account` section)

Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
