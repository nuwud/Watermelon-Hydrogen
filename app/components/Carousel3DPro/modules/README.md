# 🛠️ Active Modules Directory

This directory contains actively integrated and functional modules for the Carousel3DPro system.

## Active Modules

### ✅ `selectionGuards.js`
- **Status**: Core system dependency
- **Purpose**: State management and race condition prevention
- **Integration**: Extensively used in `Carousel3DSubmenu.js`, `Carousel3DPro.js`, `SubmenuManager.js`
- **Key Classes**: `SelectionGuard`, helper functions `withSelectionLock()`, `withTransition()`

### ✅ `FloatingPreview.js`  
- **Status**: Feature-level integration
- **Purpose**: Floating 3D previews for selected carousel items
- **Integration**: Used in `Carousel3DSubmenu.js` for preview functionality
- **Key Class**: `FloatingPreview` with lifecycle management

## Archive

Unused/experimental modules have been moved to `./archive/` folder with documentation for future reference.

## Usage Guidelines

- **Import active modules directly**: `import { SelectionGuard } from './modules/selectionGuards.js'`
- **Check archive before creating new modules**: Similar functionality may already exist
- **Follow integration patterns**: Use the existing active modules as examples

---

*Updated: December 27, 2024*  
*Active Modules: 2*  
*Archived Modules: 6*
