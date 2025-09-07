# 🎠 Carousel3DPro Crystal Seed — v4

Welcome to **NUDUN's 3D Carousel Core Engine** — a modular, AI-enhanced framework for building immersive 3D interfaces in Three.js. This is the **CrystalSeed v4**, a seed project designed to sprout complete futuristic web experiences.

## 🌟 Features
- Modular 3D carousel with theme system
- Submenus with nested interaction support
- Built-in glow and Fresnel FX (Shader-ready)
- Inspector panel (HTML or 3D Bubble HUD)
- WYSIWYG architecture with embedded prompts
- AI-ready inline doc strategy for GitHub Copilot & Claude

## 📁 Folder Structure

```
src/
  components/
    Carousel3DPro/
      core/                 # Core carousel engine components
        CarouselEngine.js   # Main rendering and management system
        ItemManager.js      # Carousel item creation and lifecycle
        NavigationSystem.js # Controls rotation and movement
        Interaction.js      # Mouse/Touch event handling
      
      themes/               # Theme system
        DefaultTheme.js     # Base styling and behavior
        ThemeManager.js     # Handles theme switching and customization
        presets/            # Ready-to-use theme configurations
      
      effects/              # Visual effects
        GlowEffect.js       # Bloom and glow shader implementations
        FresnelEffect.js    # Edge highlighting effect
        ShaderLibrary.js    # Common shader utilities
      
      submenu/              # Submenu system
        SubMenuManager.js   # Handles submenu creation and nesting
        SubMenuItem.js      # Individual menu item class
      
      inspector/            # Debugging and visualization tools
        InspectorPanel.js   # HTML-based property inspector
        BubbleHUD.js        # 3D heads-up display for properties
      
      utils/                # Utility functions
        Mathematics.js      # 3D math helpers and calculators
        Animations.js       # Animation utilities and easing functions
      
      examples/             # Example implementations
        BasicCarousel.js    # Simple implementation example
        NestedMenus.js      # Complex nested menu example
      
      assets/               # Static assets
        models/             # 3D model files
        textures/           # Texture files
      
      docs/                 # Documentation
        API.md              # API reference
        CustomizationGuide.md # Integration and customization guides
      
      index.js              # Main entry point
      README.md             # Project documentation
```

## 🚀 Getting Started

To start using Carousel3DPro in your project:

1. Install the package:
   ```bash
   npm install carousel-3d-pro
   ```

2. Import the component:
   ```javascript
   import { Carousel3DPro } from 'carousel-3d-pro';
   ```

3. Initialize with your container element:
   ```javascript
   const carousel = new Carousel3DPro({
     container: document.getElementById('carousel-container'),
     theme: 'default',
     items: [
       { id: 'item1', content: 'Item 1' },
       { id: 'item2', content: 'Item 2' },
       // Add more items as needed
     ]
   });
   ```

## 🔧 Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | Element | required | DOM element to contain the carousel |
| `theme` | String | 'default' | Theme name or custom theme object |
| `radius` | Number | 500 | Carousel radius in pixels |
| `rotationSpeed` | Number | 0.01 | Auto-rotation speed |
| `enableGlow` | Boolean | true | Enable glow effects |
| `showInspector` | Boolean | false | Show debug inspector |

## 🎨 Theming System

Carousel3DPro includes a powerful theming system:

```javascript
// Apply a preset theme
carousel.setTheme('cyber');

// Create a custom theme
carousel.setTheme({
  itemColor: '#2196F3',
  glowIntensity: 2.5,
  backgroundColor: '#121212',
  selectionEffect: 'pulse'
});
