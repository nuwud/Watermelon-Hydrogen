/**
 * Carousel3DPro Backgrounds Index
 * 
 * Export all available 3D background modules for the carousel.
 * Each module must implement: init(scene, camera, renderer, options?), update(deltaTime), dispose()
 */

export { BackgroundManager } from './BackgroundManager.js';
export { default as InteractiveHexagonWall } from './InteractiveHexagonWall.js';
export { default as InteractivePolygonsWall } from './InteractivePolygonsWall.js';

// Re-export the BackgroundDome from parent directory for convenience
export { BackgroundDome } from '../BackgroundDome.js';
