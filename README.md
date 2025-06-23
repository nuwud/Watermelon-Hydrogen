# **🍉 Watermelon Hydrogen V1**

A fully immersive 3D-powered Shopify storefront built with **Hydrogen**, **Three.js**, and **Oxygen**, featuring a dynamic 3D carousel menu and future-ready admin HUD.

> 📚 **NEW: Comprehensive Documentation Available**  
> For detailed technical documentation of all 3D systems, see [`docs/3D_SYSTEMS_COMPREHENSIVE_DOCUMENTATION.md`](docs/3D_SYSTEMS_COMPREHENSIVE_DOCUMENTATION.md)  
> For implementation planning, see [`docs/SHOPIFY_SECTIONS_3D_INTEGRATION_PLAN.md`](docs/SHOPIFY_SECTIONS_3D_INTEGRATION_PLAN.md)  
> For complete analysis summary, see [`docs/ANALYSIS_SUMMARY_FINAL.md`](docs/ANALYSIS_SUMMARY_FINAL.md)

---

## **🚀 What Is This?**

**Watermelon Hydrogen V1** is a custom Hydrogen-based Shopify theme that renders a full Three.js experience inside your storefront UI. It features:

* A 3D main carousel (Watermelon Menu)

* Scrollable submenus

* Responsive, SSR-safe canvas rendering

* Client-only mounted WebGL scenes

* Shopify metafield/product integration pipeline

* GitHub \+ Shopify Oxygen continuous deployment

* Modular expansion path for Admin HUD and recurring billing integration

---

## **🧠 Tech Stack**

* Shopify Hydrogen (Remix-based frontend)

* Three.js (native rendering)

* Vite (local dev server \+ bundler)

* Oxygen (Shopify's deployment platform)

* GitHub Actions (auto deploy \+ PR workflows)

* Tailwind CSS (fully optional, used for HUD/overlay UI)

* GSAP (for Three.js animations)

* ESLint \+ Prettier \+ TypeScript

---

## **📂 Folder Structure Highlights**

app/

├── components/

│   ├── Carousel3D.jsx            \# Initial Three.js 3D mount

│   ├── Carousel3DPro.js          \# Main menu wheel logic

│   ├── Carousel3DSubmenu.js      \# Submenu wheel logic

│   ├── Carousel3DProWrapper.jsx  \# React safe client-only wrapper

│   ├── ClientOnly.jsx            \# Prevent SSR canvas crash

├── routes/

│   ├── \_index.jsx                \# Homepage renders the Three.js scene

public/

├── fonts/                        \# Three.js-compatible typeface fonts

├── assets/                       \# GLTF models or scene textures

---

## **💻 Getting Started**

### **1\. Clone & Install**

git clone https://github.com/nuwud/Watermelon-Hydrogen.git

cd Watermelon-Hydrogen

npm install

### **2\. Link to Shopify Storefront**

npx shopify hydrogen link \--storefront "Watermelon-Hydrogen"

### **3\. Run Locally**

npm run dev

Browse to [http://localhost:3000](http://localhost:3000/)

---

## **🌐 Deployment via Oxygen**

This repository is connected to **Shopify Oxygen** via GitHub integration.

* ✅ Push to `main` \= Production deploy

* ✅ Push to other branches \= Preview deploy

* ✅ Pull Requests show deployment previews

Live deployment:

[https://watermelon-hydrogen-v1-f8c761aca3a3f342b54f.o2.myshopify.dev/](https://watermelon-hydrogen-v1-f8c761aca3a3f342b54f.o2.myshopify.dev/)

---

## **📈 What This Unlocks (Next Steps)**

* Build immersive product interfaces with GLTF or 3D menus

* Hook up recurring payments with Stripe or Recharge

* Control 3D experiences from metafields or admin HUD

* Fetch/store customer data with Customer Account API

* Trigger authenticated sessions using OAuth

---

## **🩼 Advanced Three.js Scene Lifecycle (`main.js`)**

This project features one of the **cleanest and most resilient** Three.js setup \+ teardown flows in any Hydrogen-integrated app. If you're customizing `main.js`, this breakdown is for you.

### **✅ What's Special About It?**

The `setupCarousel(container)` method in `main.js`:

* Fully manages WebGL context, DOM insertion, and animation loop

* Disposes of all Three.js geometries, materials, and event listeners

* Prevents memory leaks via GSAP `killTweensOf` and `clearTimeout` logic

* Tracks touch \+ scroll behavior across mobile and desktop

* Automatically deregisters all handlers on `dispose()`

* Ensures SSR-safe usage with `typeof window` guards

* Groups cleanup logs in the console for easy debugging

### **🧪 How to Use It Safely**

When you're embedding or replacing the carousel, call:

const { dispose } \= setupCarousel(container);

// Later...

dispose(); // Clean shutdown

Make sure you use `ClientOnly` wrappers for all canvas-dependent components in Hydrogen:

\<ClientOnly\>

  \<Carousel3DProWrapper /\>

\</ClientOnly\>

### **📂 Code Patterns We Use**

* `requestAnimationFrame()` → stored \+ cancelled via `animationFrameId`

* `setTimeout()` → pushed into `timeoutIds[]`, cleared on teardown

* `OrbitControls` → cleanly `.dispose()`'d

* Touch, click, wheel, keydown handlers → individually removed

* Scene graph → `.traverse()` for orphaned mesh disposal

### **🔥 Why It Matters**

Memory leaks in Three.js apps degrade performance over time — especially in SPAs like Hydrogen. This file ensures that:

* Old canvases are never re-used

* GPU/CPU load stays clean

* You can swap in new 3D content without restarting the whole app

---

### **👨‍👷 Pro Tip**

This pattern is easily reusable in other 3D components. When building HUDs, product zoom views, or rotating galleries — just adapt the same structure from `main.js`.

---

## **📄 Hydrogen Docs**

For full reference to the Hydrogen framework itself, see the original [Hydrogen README](https://chatgpt.com/c/docs/README-hydrogen.md) or [Shopify Hydrogen Docs](https://shopify.dev/custom-storefronts/hydrogen)

---

## **👨‍💼 Made by Patrick Allan Wood**

[NUWUD Multimedia](https://nuwud.net/) | West Hills, CA

