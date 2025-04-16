# 🍉 Watermelon Hydrogen V1 - Developer Onboarding Guide

Welcome to the team! This guide will help you get up and running with the Watermelon Hydrogen project, focusing on local setup, 3D modifications, cart integration, metafield usage, and deployment.

---

## 1. Running Locally

Get the project running on your machine:

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd Watermelon-Hydrogen
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

## 2. Modifying the 3D Scene

The project uses Three.js for its 3D elements. Here's where to find the core logic:

*   **Main Carousel Menu:**
    *   **Initialization & Orchestration:** [`app/components/Carousel3DPro/main.js`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\Carousel3DPro\main.js) - Sets up the scene, camera, renderer, controls, and initializes the carousel, submenu, and cart sphere.
    *   **Carousel Logic:** [`app/components/Carousel3DPro/Carousel3DPro.js`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\Carousel3DPro\Carousel3DPro.js) - Defines the main cylinder-style menu, item creation (TextGeometry), rotation, selection, and interaction logic.
    *   **Submenu Logic:** [`app/components/Carousel3DPro/Carousel3DSubmenu.js`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\Carousel3DPro\Carousel3DSubmenu.js) - Defines the nested watermill-style submenu.
    *   **React Wrapper:** [`app/components/Carousel3DProWrapper.jsx`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\Carousel3DPro\Carousel3DProWrapper.jsx) - Safely mounts the Three.js scene using `ClientOnly` and acts as the bridge for passing props (like cart data/callbacks) from React to the Three.js instance.

*   **Custom 3D Cart Drawer:**
    *   **Scene Logic:** [`app/components/cart-drawers/CartDrawer3D.scene.js`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\cart-drawers\CartDrawer3D.scene.js) - Contains the Three.js code responsible for rendering the cart's contents (lines, summary) in 3D.
    *   **React Wrapper/Bridge:** [`app/components/cart-drawers/CartDrawerRenderer.jsx`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\cart-drawers\CartDrawerRenderer.jsx) - Initializes and manages the `CartDrawer3D.scene.js` instance, passing down cart data and open/closed state from React.

**Important:** Always ensure Three.js code that interacts with the DOM or `window` is run client-side, typically within `useEffect` hooks inside components wrapped by [`app/components/ClientOnly.jsx`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\ClientOnly.jsx).

---

## 3. Hooking into the Cart Drawer

Interacting with the cart involves coordinating between Hydrogen's cart state, the custom drawer's UI state, and the Three.js scenes.

*   **Cart Data State:** Managed by Hydrogen. Accessed via the `useCart()` hook (from `@shopify/hydrogen-react`) in React components like [`app/components/cart-drawers/CartDrawerController.jsx`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\cart-drawers\CartDrawerController.jsx).
*   **Drawer UI State (Open/Closed):** Managed by a custom React context: [`app/components/context/cart-ui.jsx`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\context\cart-ui.jsx). Accessed via the `useCartUI()` hook. Provides `isOpen`, `toggle()`, and `close()`.
*   **Triggering the Drawer:**
    *   The 3D toggle icon (rendered via [`app/components/cart-drawers/CartToggle3D.jsx`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\components\cart-drawers\CartToggle3D.jsx) or potentially integrated into the main scene via `initCartSphere`) calls the `toggle()` function from `useCartUI` when clicked.
    *   Alternatively, interactions in the main scene (`Carousel3DPro.js`) can trigger the toggle by calling a callback function (`onCartIconClick`) passed down through `Carousel3DProWrapper.jsx`. This callback should ultimately call the `toggle()` function from `useCartUI`.
*   **Updating the 3D Drawer View:**
    1.  `CartDrawerController.jsx` gets the latest `cart` data (from `useCart`) and `isOpen` state (from `useCartUI`).
    2.  It passes these as props to `CartDrawerRenderer.jsx`.
    3.  `CartDrawerRenderer.jsx` uses `useEffect` hooks:
        *   One watches the `isOpen` prop and calls `sceneInstance.setOpenState(isOpen)` on `CartDrawer3D.scene.js`.
        *   Another watches the `cart` prop (specifically `cart.lines` or similar) and calls `sceneInstance.updateCartLines(cart.lines)` on `CartDrawer3D.scene.js`.
    4.  `CartDrawer3D.scene.js` implements the `setOpenState` and `updateCartLines` methods to visually update the Three.js scene.
*   **Updating the Cart from 3D:**
    1.  Interactions within `CartDrawer3D.scene.js` (e.g., clicking a remove button) trigger a callback (e.g., `options.onRemoveItem(lineId)`) passed during initialization.
    2.  This callback traces back up through `CartDrawerRenderer` to `CartDrawerController`.
    3.  `CartDrawerController` then dispatches the appropriate Hydrogen cart action (using `CartForm` or direct fetch calls to cart routes like [`app/routes/($locale).cart.jsx`](c:\Users\Nuwud\Projects\watermelon-hydrogen\app\routes\($locale).cart.jsx)).

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

Happy building! If you encounter issues, check the [`docs/README-troubleshooting.md`](c:\Users\Nuwud\Projects\watermelon-hydrogen\docs\README-troubleshooting.md) or ask a team member.