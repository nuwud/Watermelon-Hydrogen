# 🍉 Watermelon Hydrogen V1 - Developer Onboarding Guide

Welcome to the team! This guide will help you get up and running with the Watermelon Hydrogen project, focusing on local setup, 3D modifications, cart integration, metafield usage, and deployment.

---

## 🎯 Project Overview (Updated December 2024)

**WatermelonOS** is a next-generation 3D e-commerce interface built on Shopify Hydrogen. The project features:
- **3D Carousel Navigation**: Cylinder-style rotating main menu with nested watermill-style submenus
- **3D Cart Integration**: Interactive cart sphere and HUD-based cart icon with multi-drawer support
- **3D Product Display**: Ready for products/content to be rendered in the center display area
- **Dynamic Shopify Integration**: Prepared for menu binding to Shopify pages and collections
- **Mobile Support**: Touch-friendly swipe navigation and responsive design

**Current Status**: 
- ✅ Core 3D interface complete with smooth animations
- ✅ Cart integration ~95% done with event system and multi-drawer support  
- ✅ Submenu system functional with icons and 3D models
- ⚠️ Minor submenu click-scroll flicker issue identified
- 🔄 Ready for Shopify menu binding and center content display

---

## 1. Running Locally

Get the project running on your machine:

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd watermelon-hydrogen
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Link to Your Shopify Storefront:**
    Connect the local environment to your Shopify development store's Oxygen deployment. Replace `"Your Store Name"` with the actual name from the Hydrogen channel in your Shopify admin.
    ```bash
    npx shopify hydrogen link --storefront "Your Store Name"
    ```
    *(See also: [Setup for Customer Account API](https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development))*
4.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
5.  **Open in Browser:** Navigate to `http://localhost:3000` (or the port specified in your terminal).

You should see the homepage featuring the 3D carousel interface.

---

## 2. Project Architecture & 3D Components

The project uses Three.js for its 3D elements, with a modular architecture for easy maintenance and extension.

### 🏗️ Core Architecture

**Entry Point Flow:**
```
app/routes/($locale)._index.jsx
↓ imports
app/components/Carousel3DMenu.jsx
↓ dynamically loads
app/components/Carousel3DPro/main.js (setupCarousel)
↓ creates & manages
Carousel3DPro.js + Carousel3DSubmenu.js
```

### 🎠 Main Carousel System

*   **Main Orchestrator:** [`app/components/Carousel3DPro/main.js`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\Carousel3DPro\main.js) - Sets up the scene, camera, renderer, controls, and initializes the carousel, submenu, and cart sphere.
*   **Carousel Logic:** [`app/components/Carousel3DPro/Carousel3DPro.js`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\Carousel3DPro\Carousel3DPro.js) - Defines the main cylinder-style menu, item creation (TextGeometry), rotation, selection, and interaction logic.
*   **Submenu Logic:** [`app/components/Carousel3DPro/Carousel3DSubmenu.js`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\Carousel3DPro\Carousel3DSubmenu.js) - Defines the nested watermill-style submenu with clockwise arrangement.
*   **React Entry Point:** [`app/components/Carousel3DMenu.jsx`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\Carousel3DMenu.jsx) - Safely mounts the Three.js scene using dynamic imports and handles GSAP/Three.js loading.

### 🛒 Cart System

*   **Cart Context:** [`app/components/context/cart-ui.jsx`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\context\cart-ui.jsx) - Manages cart UI state (open/closed, drawer switching)
*   **Cart Controller:** [`app/components/cart-drawers/CartDrawerController.jsx`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\cart-drawers\CartDrawerController.jsx) - Coordinates between Hydrogen cart data and drawer UI
*   **3D Cart Toggle:** [`app/utils/cart/initCartToggleSphere.js`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\utils\cart\initCartToggleSphere.js) - Creates the floating cart sphere
*   **HUD Cart Icon:** [`app/components/cart-drawers/CartHUDIcon3D.js`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\cart-drawers\CartHUDIcon3D.js) - Camera-relative cart icon with GLTF model loading
*   **Cart Integration Module:** [`app/components/Carousel3DPro/modules/cartIntegration.js`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\Carousel3DPro\modules\cartIntegration.js) - Bridges cart functionality with main 3D scene

### 🎨 Styling & Configuration

*   **Style Config:** [`app/components/Carousel3DPro/CarouselStyleConfig.js`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\Carousel3DPro\CarouselStyleConfig.js) - Theme and visual configuration
*   **Shader Effects:** [`app/components/Carousel3DPro/CarouselShaderFX.js`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\Carousel3DPro\CarouselShaderFX.js) - Custom shader materials for glow effects

**Important:** Always ensure Three.js code that interacts with the DOM or `window` is run client-side, typically within `useEffect` hooks inside components wrapped by [`app/components/ClientOnly.jsx`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\ClientOnly.jsx).

---

## 3. Cart Integration & UI State Management

The cart system coordinates between Hydrogen's cart state, custom drawer UI state, and the 3D scenes.

### 🔄 State Flow Architecture

```
Hydrogen Cart Data (useCart)
      ↓
CartDrawerController.jsx (coordinates)
      ↓
CartUIContext (cart-ui.jsx) ← UI State Management
      ↓
3D Cart Components (CartHUDIcon3D, cart sphere)
```

### 📊 Key Components

*   **Cart Data State:** Managed by Hydrogen. Accessed via the `useCart()` hook (from `@shopify/hydrogen`) in components like [`app/components/cart-drawers/CartDrawerController.jsx`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\cart-drawers\CartDrawerController.jsx).

*   **Drawer UI State (Open/Closed):** Managed by custom React context: [`app/components/context/cart-ui.jsx`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\context\cart-ui.jsx). Provides:
    - `isCartOpen`, `toggleCart()`, `closeCart()`
    - Multi-drawer support: `activeDrawer`, `openDrawer(id)`, `toggleDrawer(id)`
    - Hooks: `useCartUI()`, `useDrawerOpen(id)`, `useDrawerToggle(id)`

*   **3D Cart Triggers:**
    - **Cart Sphere:** [`app/utils/cart/initCartToggleSphere.js`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\utils\cart\initCartToggleSphere.js) creates floating cart sphere
    - **HUD Icon:** [`app/components/cart-drawers/CartHUDIcon3D.js`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\cart-drawers\CartHUDIcon3D.js) creates camera-relative cart icon
    - **Integration:** [`app/components/Carousel3DPro/modules/cartIntegration.js`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\Carousel3DPro\modules\cartIntegration.js) handles cart sphere setup and click detection

### ⚡ Event Flow

1. **3D Interaction** → User clicks cart sphere/icon
2. **Event Dispatch** → `window.dispatchEvent(new Event('cart-toggle-clicked'))`
3. **React Handler** → CartDrawerController listens and calls `toggleCart()`
4. **State Update** → cart-ui.jsx updates `isCartOpen` state
5. **3D Response** → Cart drawer becomes visible, animations trigger

### 🔧 Cart Controller Bridge

The [`app/utils/cart-controller-utils.js`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\utils\cart-controller-utils.js) creates a bridge:
- `createCartController()` - Creates standardized controller interface
- `registerDrawerController()` - Attaches controller to both scene and global window
- Available as `window.drawerController` for 3D scene access

### 📱 Multiple Drawer Support

The system supports multiple drawer types:
- **mainCart**: Standard shopping cart
- **favorites**: Favorite products
- **saved**: Saved for later items

Managed through `activeDrawer` state in cart-ui context.

---

## 4. Using Metafields

Shopify metafields can be used to dynamically configure the 3D experience without code changes.

*   **Example Use Cases:**
    *   Storing plugin configurations (see Plugin System design).
    *   Defining 3D model URLs or properties for products/variants.
    *   Setting parameters for shaders or animations.
    *   Controlling menu items or content displayed in the 3D scene.
*   **Implementation Flow:**
    1.  **Define Metafields:** Create metafield definitions in your Shopify admin (e.g., on Products, Collections, or Shop level) with appropriate types (JSON, String, Number, etc.).
    2.  **Fetch in Loader:** Query the required metafields in your Remix route loaders (e.g., in [`app/routes/($locale).products.$handle.jsx`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\routes\($locale).products.$handle.jsx) for product metafields, or [`app/root.jsx`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\root.jsx) loader for shop metafields) using `context.storefront.query`.
    3.  **Pass Down Props:** Pass the fetched metafield data from the loader (`useLoaderData`) down through your React component tree as props.
    4.  **Consume in Wrapper/Controller:** The React wrapper component (`Carousel3DProWrapper.jsx`, `CartDrawerRenderer.jsx`) or controller receives the metafield data as props.
    5.  **Pass to Three.js:** Pass the relevant data from the props into the Three.js class constructor options or update methods (e.g., passing plugin configurations to `PluginManager`, or model URLs to `CartDrawer3D.scene.js`).
    6.  **Use in Three.js:** The Three.js classes use this configuration data to modify their behavior, load assets, or adjust parameters.

---

## 5. Deploying to Shopify Oxygen

Deployment is handled automatically via GitHub Actions connected to Shopify Oxygen.

*   **Production:** Pushing changes to the `main` branch triggers a deployment to your production environment.
*   **Preview:** Pushing changes to any other branch automatically creates or updates a preview deployment environment. Pull requests also generate preview links.
*   **Workflow:** The deployment process is defined in `.github/workflows/oxygen.yml` (this file is usually auto-generated when linking the repo to Oxygen).
*   **Environment Variables:** Ensure any necessary environment variables (like API keys or custom settings from your `.env` file) are also configured in the Shopify Oxygen settings for your storefront.

*(See also: [`README.md#deployment-via-oxygen`](c:\Users\Nuwud\Projects\watermelon-hydrogen\README.md#L74), [`docs/README-troubleshooting.md#deployment-checklist`](c:\Users\Nuwud\Projects\watermelon-hydrogen\docs\README-troubleshooting.md#L43))*

---

## 6. Next Steps: Shopify Menu Integration

The next phase involves binding the 3D menu system to actual Shopify data for a production-ready e-commerce experience.

### 🎯 Planned Features

1. **Dynamic Menu Loading**
   - Fetch Shopify menus via GraphQL (HEADER_QUERY fragment already exists)
   - Replace hardcoded menu items with dynamic Shopify menu data
   - Support for nested menu structures (collections → products)

2. **Center Display Content**
   - **3D CSS Content**: Lightweight text-based content using CSS 3D transforms
   - **Product Display**: 3D product models and images in center area
   - **Page Content**: Shopify pages rendered in 3D space
   - **Checkout Process**: Selected checkout components in center display

3. **Enhanced Cart Experience**
   - Complete 3D cart drawer implementation
   - 3D product visualization in cart
   - Quantity adjustments with 3D feedback
   - Add to cart animations

### 🚀 Implementation Roadmap

**Phase 1: Menu Binding**
```javascript
// Modify main.js to accept dynamic menu data
const menuData = await loadShopifyMenu();
const carousel = new Carousel3DPro(menuData.items, currentTheme);
```

**Phase 2: Content Display**
- Add center content area component
- Implement 3D CSS transforms for text content
- Create product model viewer
- Add page content renderer

**Phase 3: Advanced Features**
- Scene editor interface
- Real-time preview mode
- Mobile optimization
- Performance enhancements

---

## 7. Current Issues & Debugging

### 🐛 Known Issues

1. **Submenu Click Flicker (Active)**
   - **Issue**: Slight visual flicker when click-scrolling through submenu items
   - **Location**: `Carousel3DSubmenu.js` - interaction between `selectItem()`, `highlightItemAtIndex()`, and `update()` methods
   - **Root Cause**: Race condition between GSAP animation callbacks and highlighting logic during scroll transitions
   - **Status**: Minor visual issue, functionality works correctly
   - **Fix Priority**: Low - does not affect core functionality

2. **File Organization**
   - **Issue**: Multiple experimental files from previous development iterations
   - **Examples**: Duplicate cart drawer implementations, unused wrapper components, legacy animation files
   - **Status**: Needs cleanup and consolidation
   - **Fix Priority**: Medium - affects maintainability

3. **Cart Integration State Management**
   - **Issue**: Multiple overlapping cart state management systems
   - **Details**: 
     - `CartDrawer3D.jsx` vs `CartDrawerRenderer.jsx` overlap
     - Multiple event systems for cart toggle (sphere, HUD, context)
     - Some unused cart components remain from testing phases
   - **Status**: Functional but could be streamlined
   - **Fix Priority**: Medium - affects development experience

### 🔧 Debug Tools Available

- **Global Debug Object**: `window.debugCarousel` provides scene inspection and manual controls
- **HUD Debug Panel**: Available in development mode for cart icon debugging (see `CartHUDDebugPanel.jsx`)
- **Console Logging**: Extensive logging for state transitions and animations
- **Scene Inspector**: Built-in inspector panel for carousel parameters (`Carousel3DPro_InspectorPanel.js`)
- **Flicker Analysis**: Detailed debug documentation in `docs/SUBMENU_FLICKER_DEBUG.md`

### 📝 Scene Editor Concept

A visual editor for 3D scenes would be valuable for:
- Adjusting camera positions and angles
- Tweaking animation parameters and timing
- Testing different themes and visual styles  
- Positioning elements in 3D space
- Real-time preview mode for designers and content creators
- **Implementation Status**: Concept stage - would significantly improve development workflow
- **Potential Base**: Could extend existing `Carousel3DPro_InspectorPanel.js`

---

## 8. WatermelonOS Development Methodology & Debugging

The Watermelon project follows an **investigation-first** approach to development and debugging. This methodology ensures stable, maintainable code and helps prevent the introduction of subtle bugs in complex 3D systems.

### 🧠 **Investigation-First Engineering**

#### **✅ Core Development Principles**

| Principle | Description |
|-----------|-------------|
| 🔍 **Investigate First** | Use Copilot Chat and `console.warn()` to trace logic *before* changing code |
| 🔁 **Run it Backwards** | When something breaks, trace from the symptom back to its origin |
| 🧪 **Test Before Patch** | Ask "Why is this breaking?" before asking "How do I fix it?" |
| 🛠 **Surgical Commits** | Apply only *one focused patch* at a time, especially for animations |
| 🧼 **Keep `main.js` Sacred** | All visual modules should plug in cleanly without global state pollution |
| 🧩 **Isolate with Async** | Use `async/await` for transitions to keep UI fluid and predictable |
| 🪓 **Destroy Responsibly** | Every `create()` should have a matching `dispose()` method |

#### **📘 WatermelonOS Debug Rituals**

1. **Symptom Observed?**
   - Add `console.warn('[Watermelon]')` markers at error points
   - Use Copilot to trace what components touched the failing system
   - Check the browser console for Three.js warnings or React errors

2. **State Stuck?**
   - Verify transition flags like `isTransitioning` or `submenuTransitioning` aren't stale
   - Check if event listeners are properly cleaned up
   - Ensure proper state reset in cleanup methods

3. **Geometry Issues?**
   - Confirm `.geometry.center()` and `.userData.originalScale` are applied after creation
   - Check if materials and textures are properly disposed
   - Verify font loading is complete before creating TextGeometry

4. **Animation Lockups?**
   - Use async transition chains: `await closeSubmenuAsync(); await spawnSubmenuAsync(...);`
   - Check GSAP timeline completion before starting new animations
   - Verify animation targets still exist in the scene

5. **Memory Leaks?**
   - Check Three.js object disposal in browser DevTools
   - Monitor `scene.children.length` over time
   - Verify all geometries, materials, and textures are disposed

### 🛠 **Common Issues & Solutions**

#### **SSR Hydration Issues**
**Symptom:** React hydration errors, blank screens, "window is not defined"

**Debug Steps:**
```javascript
// Check if Three.js code is properly wrapped
if (typeof window !== "undefined") {
  // Safe browser code here
}
```

**Fix:** Ensure all Three.js code is inside `ClientOnly` components or `useEffect` hooks.

#### **Submenu Click/Scroll Issues**
**Symptom:** Submenu items don't respond to clicks or scroll incorrectly

**Debug Steps:**
```javascript
// Add debugging to click handler
console.warn('[Watermelon] Click detected:', intersection.object.userData);
console.warn('[Watermelon] Active submenu:', activeSubmenu?.isSubmenuItem);
```

**Common Causes:**
- Race conditions between selection guards
- Stale submenu references after menu changes
- Incorrect raycaster intersection handling

#### **3D Text Stretching/Scaling Issues**
**Symptom:** Text appears stretched, too large, or incorrectly positioned

**Debug Steps:**
```javascript
// Check scaling application
console.warn('[Watermelon] Original scale:', mesh.userData.originalScale);
console.warn('[Watermelon] Current scale:', mesh.scale);
```

**Fix:** Ensure `geometry.center()` is called before setting `userData.originalScale`.

#### **Memory Leaks in 3D Scenes**
**Symptom:** Performance degrades over time, especially with submenu usage

**Debug Steps:**
```javascript
// Monitor scene complexity
console.warn('[Watermelon] Scene children count:', scene.children.length);
console.warn('[Watermelon] Renderer info:', renderer.info);
```

**Fix:** Implement comprehensive `dispose()` methods for all 3D objects.

### 🔧 **Debug Tools & Commands**

#### **Browser Console Commands**
Access these through the browser console when the app is running:

```javascript
// Admin panel controls
window.watermelonAdmin.getSystemStatus()    // Check system health
window.watermelonAdmin.clearCache()         // Clear content cache
window.watermelonAdmin.repairState()        // Fix common state issues

// Content management
window.contentManager.loadContent('home')   // Load specific content
window.contentManager.getTemplates()        // List available templates

// Carousel debugging
window.__wm__.testSubmenu('Gallery')        // Test submenu functionality
window.__wm__.getSubmenuState()             // Check submenu state
window.__wm__.closeSubmenu()                // Force close submenu
```

#### **Development Environment Setup**
Enable additional debugging in development:

```javascript
// In main.js or relevant component
if (process.env.NODE_ENV === 'development') {
  window.debugWatermelon = {
    scene,
    carousel,
    submenuManager,
    contentManager
  };
}
```

### 🚑 **Emergency Recovery Procedures**

#### **Complete System Reset**
If the 3D system becomes unresponsive:

```javascript
// Emergency reset sequence
window.watermelonAdmin.emergencyReset();

// Or manual reset
window.location.reload(); // Last resort
```

#### **Submenu System Recovery**
If submenus stop working:

```javascript
// Reset submenu system
window.__wm__.resetSubmenuSystem();
window.__wm__.closeAllSubmenus();
```

#### **Cart System Recovery**
If cart integration fails:

```javascript
// Reset cart state
window.drawerController?.reset();
window.dispatchEvent(new Event('cart-reset'));
```

### 📊 **Performance Monitoring**

#### **Key Metrics to Watch**
- **FPS**: Should maintain 60fps during animations
- **Memory Usage**: Monitor WebGL memory in DevTools
- **Scene Complexity**: Track `scene.children.length`
- **Animation Performance**: Watch for dropped frames during transitions

#### **Performance Debug Commands**
```javascript
// Performance monitoring
console.log('Renderer info:', renderer.info);
console.log('Scene stats:', {
  objects: scene.children.length,
  meshes: scene.children.filter(c => c.isMesh).length,
  lights: scene.children.filter(c => c.isLight).length
});
```

---

## 9. Troubleshooting Common Issues

### 🐛 **Quick Fixes for Common Problems**

#### **App Won't Start**
1. Check Node.js version: `node --version` (requires ≥18)
2. Clear cache: `npm run clean` or `rm -rf node_modules && npm install`
3. Check Shopify connection: `npx shopify hydrogen link --storefront "Your Store Name"`

#### **3D Scene Doesn't Load**
1. Check browser console for errors
2. Verify fonts are loading: Check Network tab for `helvetiker_regular.typeface.json`
3. Test with `window.watermelonAdmin.getSystemStatus()`

#### **Submenus Not Working**
1. Clear submenu state: `window.__wm__.resetSubmenuSystem()`
2. Check for JavaScript errors in console
3. Verify menu data: `window.watermelonAdmin.getMenuData()`

#### **Cart Integration Issues**
1. Test cart state: `window.drawerController?.getState()`
2. Check Shopify cart hooks: Verify `useCart()` is returning data
3. Reset cart system: `window.drawerController?.reset()`

### 📞 **Getting Help**

1. **Check Documentation**: Start with this guide and the comprehensive documentation
2. **Debug Tools**: Use the built-in debug commands and admin panel
3. **Community Resources**: Reference the strategic roadmap for known issues and priorities
4. **Code Investigation**: Follow the investigation-first methodology for systematic debugging

---