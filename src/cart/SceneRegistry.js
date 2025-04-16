// src/cart/SceneRegistry.js
let scene = null;
const listeners = [];

export const SceneRegistry = {
  set(newScene) {
    scene = newScene;
    listeners.forEach((cb) => cb(scene));
  },
  get() {
    return scene;
  },
  onSceneReady(callback) {
    if (scene) callback(scene);
    else listeners.push(callback);
  },
};
