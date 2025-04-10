### 📦 `STARTER-KIT.md`

```markdown
# 🚀 Watermelon Hydrogen V1 — Starter Kit

Welcome to the **starter kit** for launching your own immersive Shopify storefront using **Hydrogen + Three.js + Oxygen**. This template includes all the necessary logic to mount Three.js scenes inside Shopify, render dynamic menus, and deploy with GitHub integration.

---

## 🧩 What You Get

- 🧠 SSR-safe mounting of any Three.js canvas
- 🎡 Fully integrated 3D carousel architecture (modular)
- 📦 Preconfigured Tailwind + Vite setup
- 🔐 Shopify Storefront & Customer Account API tokens
- 🔄 Continuous deployment via GitHub + Oxygen
- 🔧 ClientOnly and safe Three.js mounting components

---

## 🛠 Getting Started

### 1. **Clone the Repo**
```bash
git clone https://github.com/nuwud/Watermelon-Hydrogen.git
mv Watermelon-Hydrogen your-new-storefront
cd your-new-storefront
rm -rf .git
git init
```

### 2. **Install Dependencies**
```bash
npm install
```

---

## 🔌 3. Link to Your Shopify Store

Run this in your terminal:

```bash
npx shopify hydrogen link --storefront "Your Store Name"
```

This syncs your storefront tokens & metadata with Oxygen.

---

## 🔄 4. Optional: Replace the 3D Experience

Want to use your own Three.js scene instead of the included carousel?

Replace the contents of:

- `app/components/Carousel3D.jsx`
- `app/components/Carousel3DPro.js`

Or add your new component in `app/components/YourThreeScene.jsx` and inject it inside:

```jsx
<ClientOnly>
  <YourThreeScene />
</ClientOnly>
```

---

## 🌐 5. Deploy It (Oxygen/GitHub)

If you forked or recreated this repo:

1. Connect to a new GitHub repo
2. Enable Oxygen integration from Shopify Admin
3. Merge the auto-generated PR to configure `.github/workflows/oxygen.yml`

From now on:

- `main` = deploys to production
- other branches = preview environments

---

## 📁 File Reference

| Path | Purpose |
|------|---------|
| `app/components/ClientOnly.jsx` | Prevent SSR crash for canvas |
| `app/components/Carousel3DProWrapper.jsx` | Safe React mount for Three.js |
| `public/fonts/` | Three.js-compatible fonts |
| `app/routes/_index.jsx` | Renders main 3D interface |
| `tailwind.config.js` | Customize UI styling |

---

## 💡 Developer Notes

- Use `getWorldScale()` to debug Three.js hierarchy scaling issues
- Use metafields to dynamically control 3D menus or model parameters
- Use `window` guards (`typeof window !== 'undefined'`) when needed

---

## ✅ Next Steps

- 🔁 Create product-based 3D environments
- 🎧 Add sound-reactive shaders
- 💳 Integrate Stripe or Recharge for billing
- 🧠 Build Admin HUD to manage 3D data
- 🌍 Link your `.myshopify.com` domain to the Oxygen deployment

---

## 👋 About This Starter

Created by: **Patrick Allan Wood**  
Agency: [NUWUD Multimedia](https://nuwud.net)  
Built with: Shopify, Three.js, Tailwind, GSAP, Copilot, and ✨dreams

---

Happy building 🍉
```