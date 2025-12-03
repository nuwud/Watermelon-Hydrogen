/**
 * @AI-PROMPT
 * This file defines theming and styling presets for Carousel3DPro.
 * It includes default glow, background opacity, font settings.
 * This file is pure JS config, can be extended at runtime.
 * 
 * STATUS-CODED MENU COLORS:
 * Each menu item can have a unique color based on its function/category.
 */

// Status-coded colors for menu items by label
// These give each menu item a distinct identity glow
export const menuItemColors = {
  // Main menu items - each has unique glow color
  'Home':             { glow: 0x00ffff, text: 0x88ffff },  // Cyan - navigation hub
  'Services':         { glow: 0xffcc00, text: 0xffeeaa },  // Gold - business/services
  'Digital Products': { glow: 0xff66ff, text: 0xffaaff },  // Magenta - digital creative
  'Gallery':          { glow: 0xff6699, text: 0xffaacc },  // Rose - artistic/visual
  'About':            { glow: 0x66ff66, text: 0xaaffaa },  // Green - growth/life
  'Contact':          { glow: 0x6699ff, text: 0xaaccff },  // Blue - communication
  'Cart / Account':   { glow: 0xff9933, text: 0xffcc99 },  // Orange - action/commerce
  
  // Default fallback for any unlisted items
  'default':          { glow: 0xffffff, text: 0xdddddd },  // White
};

// Helper to get color for a menu item by label
export function getMenuItemColor(label) {
  return menuItemColors[label] || menuItemColors['default'];
}

// Default configuration for carousel
export const defaultCarouselStyle = {
  // Font settings
  font: 'Roboto',
  fontSize: 0.5,
  fontHeight: 0.1,
  
  // Colors - WHITE selected, light gray others (fallback when not using status colors)
  glowColor: 0xffffff,           // White glow for selected (default)
  textColor: 0xccddee,           // Light blue-gray for non-selected (brighter)
  selectedTextColor: 0xffffff,   // Pure white for selected item
  backgroundColor: 0x1a1a2e,     // Dark blue background
  
  // Enable status-coded colors per menu item
  useStatusColors: true,         // When true, uses menuItemColors lookup
  
  // Transparency
  opacity: 0.85,
  selectedOpacity: 1.0,
  
  // Layout
  itemSpacing: 1.5,
  cylinderRadius: 5,
  
  // Animations
  rotationSpeed: 0.05,
  selectionScale: 1.2,
  animationDuration: 0.8,
  
  // Glow effect
  glowIntensity: 2.0,            // Stronger glow
  glowSize: 1.15,                // Larger glow
  pulseSpeed: 2.0,
  
  // Bevel settings for text
  bevelEnabled: true,
  bevelThickness: 0.03,
  bevelSize: 0.02,
  bevelSegments: 5
};

// Light theme with blue glow
export const lightTheme = {
  ...defaultCarouselStyle,
  backgroundColor: 0xf5f5f5,
  textColor: 0x333333,
  selectedTextColor: 0x000000,
  glowColor: 0x0088ff,
  opacity: 0.9
};

// Dark theme with neon glow - brighter text
export const darkTheme = {
  ...defaultCarouselStyle,
  backgroundColor: 0x0a0a1a,
  textColor: 0xcccccc,           // Brighter gray
  selectedTextColor: 0xffffff,
  glowColor: 0xff66ff,           // Brighter magenta
  opacity: 0.9
};

// Cyberpunk theme - brighter neon colors
export const cyberpunkTheme = {
  ...defaultCarouselStyle,
  backgroundColor: 0x0a0a1a,
  textColor: 0x66ffee,           // Brighter cyan
  selectedTextColor: 0x00ffff,   // Bright cyan
  glowColor: 0xffff00,
  opacity: 0.9,
  selectionScale: 1.3,
  glowIntensity: 2.0
};

// Minimal theme
export const minimalTheme = {
  ...defaultCarouselStyle,
  backgroundColor: 0xffffff,
  textColor: 0x000000,
  selectedTextColor: 0x000000,
  glowColor: 0x888888,
  opacity: 0.7,
  bevelEnabled: false,
  glowIntensity: 0.8,
  fontHeight: 0.05
};

// Create custom theme from base
export const createCustomTheme = (baseTheme, customOptions) => {
  return { ...baseTheme, ...customOptions };
};

// Helper function to get theme by name
export const getThemeByName = (themeName) => {
  const themes = {
    default: defaultCarouselStyle,
    light: lightTheme,
  dark: darkTheme,
  cyberpunk: cyberpunkTheme,
    minimal: minimalTheme
  };
  
  return themes[themeName] || defaultCarouselStyle;
};

// Runtime configuration flags for physics, input normalization, and visual modes
export const carouselConfig = {
  physics: {
    inputBoost: 0.18,
    damping: 0.88,
    springK: 10.0,
    snapEpsilon: 0.008,
  },
  wheel: {
    sensitivity: 0.9,
    thresholdPx: 120,
    maxBurst: 4,
  },
  startup: {
    startOnLabel: 'Home',
    enableNewMotion: false,
  },
  mobile: {
    enableMobileEnhancements: false,
    longPressMs: 350,
    tapSlopPx: 8,
    raycastPadding: 0.06,
  },
  visual: {
    submenuDim: 0.55,
    mainDimWhenSubmenu: 0.6,
    cameraFade: { near: 2.0, far: 8.0 },
    effectsEnabled: false,
  },
};
