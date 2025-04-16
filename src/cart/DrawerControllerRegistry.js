// src/cart/DrawerControllerRegistry.js

let drawerController = null;

export const DrawerControllerRegistry = {
  isRegistered: () => !!drawerController,
  get: () => drawerController,
  register: (controller) => {
    drawerController = controller;
    console.warn('[DrawerControllerRegistry] ✅ Controller registered');
  },
  reset: () => {
    drawerController = null;
    console.warn('[DrawerControllerRegistry] 🧹 Registry reset');
  }
};
