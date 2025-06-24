# 📦 Archived Modules

This folder contains modules that were developed but not integrated into the main system. These modules are preserved for reference and potential future use.

## Archived Modules

### `animations.js`
- **Purpose**: Reusable animation utilities for GSAP
- **Status**: Complete but unused
- **Reason for Archive**: Direct GSAP usage in components is simpler and sufficient
- **Functions**: `createPulsingGlow()`, `createSpinningAnimation()`, `createBounceAnimation()`, `animateOpacity()`

### `SubMenuItem.js`
- **Purpose**: Object-oriented wrapper for submenu items
- **Status**: Complete but unused
- **Reason for Archive**: Current Three.js + userData approach is simpler and works well
- **Features**: Lifecycle management, object ownership tracking, Shopify integration hooks

### `carouselManager.js`
- **Purpose**: Factory pattern for carousel creation
- **Status**: Complete but unused
- **Reason for Archive**: Direct instantiation in `main.js` is clearer and sufficient
- **Features**: Theme management, glow rings, hover detection, keyboard navigation

### `cartIntegration.js`
- **Purpose**: Cart sphere integration utilities
- **Status**: Complete but unused
- **Reason for Archive**: Cart integration handled directly in main system
- **Functions**: `initCartSphere()`, cart drawer controller integration

### `controls.js`
- **Purpose**: OrbitControls setup and configuration
- **Status**: Complete but unused
- **Reason for Archive**: Controls setup handled directly in `main.js`
- **Function**: `setupControls()` with mouse/touch configuration

### `initialization.js`
- **Purpose**: Scene, camera, and renderer initialization
- **Status**: Complete but unused
- **Reason for Archive**: Initialization logic integrated directly in `main.js`
- **Function**: `initScene()` for Three.js setup

## Architectural Notes

These modules represent different architectural approaches that were considered:

1. **Utility Pattern** (`animations.js`, `controls.js`, `initialization.js`) - Extracting common functionality into reusable utilities
2. **OOP Pattern** (`SubMenuItem.js`) - Object-oriented approach to component management
3. **Factory Pattern** (`carouselManager.js`) - Centralized creation and configuration
4. **Integration Pattern** (`cartIntegration.js`) - Modular feature integration

While well-implemented, the current system's direct approaches proved simpler and more maintainable.

## Future Considerations

These modules could be revisited if:
- **animations.js**: Team wants consistent animation API across components
- **SubMenuItem.js**: OOP benefits outweigh refactoring costs
- **carouselManager.js**: Theme management needs centralization
- **cartIntegration.js**: Cart features need modular architecture
- **controls.js**: Controls setup becomes more complex
- **initialization.js**: Scene setup needs standardization

---

*Archived: December 27, 2024*  
*Reason: Cleanup based on modules audit findings*  
*Original Location: `app/components/Carousel3DPro/modules/`*
