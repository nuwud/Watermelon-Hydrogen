// app/utils/cart-controller-utils.js

import { SceneRegistry } from './cart/SceneRegistry';

/**
 * Creates a controller object with drawer control methods
 * @param {Function} toggleFn 
 * @param {Function} openFn 
 * @param {Function} closeFn 
 * @param {boolean} isOpen 
 * @returns {{toggleCartDrawer: Function, openCartDrawer: Function, closeCartDrawer: Function, isCartOpen: boolean}}
 */
export function createCartController(toggleFn, openFn, closeFn, isOpen = false) {
  return {
    toggleCartDrawer: toggleFn,
    openCartDrawer: openFn,
    closeCartDrawer: closeFn,
    isCartOpen: isOpen
  };
}

/**
 * Registers the controller with both the Three.js scene and global window
 * @param {object} controller 
 */
export function registerDrawerController(controller) {
  const scene = SceneRegistry.get();
  if (scene) {
    scene.drawerController = controller;
    console.warn('[CartDrawer] Controller attached to existing scene');
  }

  SceneRegistry.onSceneReady((scene) => {
    scene.drawerController = controller;
    console.warn('[CartDrawer] Controller attached via SceneRegistry');
  });

  window.drawerController = controller;

  return () => {
    delete window.drawerController;
  };
}
