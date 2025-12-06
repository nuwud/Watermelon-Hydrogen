/**
 * @AI-PROMPT
 * This file defines theming and styling presets for Carousel3DPro.
 * It includes default glow, background opacity, font settings.
 * This file is pure JS config, can be extended at runtime.
 */

// Simple white glow for all menu items
// Admin controls can override these later
export function getMenuItemColor(label) {
  // Return very bright colors for maximum contrast against blue background
  return { glow: 0xffffff, text: 0xffffff };
}

// Default configuration for carousel
export const defaultCarouselStyle = {
  // Font settings
  font: 'Roboto',
  fontSize: 0.5,
  fontHeight: 0.1,
  
  // Colors - VERY BRIGHT menu for contrast against blue background
  glowColor: 0xffffff,           // White glow for selected
  textColor: 0xffffff,           // Pure white for non-selected (much brighter!)
  selectedTextColor: 0xffffff,   // Pure white for selected item
  backgroundColor: 0x1a1a2e,     // Dark blue background
  
  // Hover colors - brilliant white-cyan for rollover
  hoverTextColor: 0xffffff,      // Pure white on hover
  hoverEmissive: 0x88ccff,       // Strong blue-white glow on hover
  hoverEmissiveIntensity: 1.2,   // Very strong hover glow
  
  // Submenu colors - VERY BRIGHT for visibility
  submenuTextColor: 0xffffff,    // Pure white for submenu items
  submenuGlowColor: 0xccddff,    // Light blue-white glow for submenu selected
  submenuHoverColor: 0xffffff,   // Pure white on submenu hover
  
  // Distance-based dimming (depth fog effect)
  distanceDimming: {
    enabled: true,
    nearDistance: 4,             // Items closer than this are full brightness
    farDistance: 12,             // Items farther than this are maximum dimmed (wider range)
    minOpacity: 0.4,             // Minimum opacity for far items
    minBrightness: 0.45,         // Minimum brightness multiplier - noticeable but not harsh
  },
  
  // Submenu open state - dim main menu when submenu is active
  submenuOpenDim: {
    enabled: true,
    mainMenuDimAmount: 0.25,     // Very dim when submenu open - let submenu shine
    selectedItemDimAmount: 0.30, // Selected item also dims significantly
  },
  
  // Transparency
  opacity: 1.0,                  // Full opacity for maximum visibility
  selectedOpacity: 1.0,
  
  // Layout
  itemSpacing: 1.5,
  cylinderRadius: 5,
  
  // Animations
  rotationSpeed: 0.05,
  selectionScale: 1.2,
  hoverScale: 1.12,              // More noticeable scale on hover
  animationDuration: 0.8,
  
  // Glow effect
  glowIntensity: 3.0,            // Much stronger glow
  glowSize: 1.15,
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
    enableMobileEnhancements: true,  // Enable mobile-specific features
    enableFerrisWheelMode: true,     // Vertical carousel on mobile
    longPressMs: 350,
    tapSlopPx: 8,
    raycastPadding: 0.06,
    ferrisWheelRadius: 4,            // Radius for vertical wheel
    ferrisWheelTilt: 0.15,           // Slight tilt for 3D effect (radians)
    submenuOrbitRadius: 2.5,         // How far submenu orbits from selected item
    breakpoint: 768,                 // Width below which mobile mode activates
  },
  visual: {
    submenuDim: 0.55,
    mainDimWhenSubmenu: 0.6,
    cameraFade: { near: 2.0, far: 8.0 },
    effectsEnabled: false,
  },
};
