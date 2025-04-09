/**
 * @AI-PROMPT
 * This file defines theming and styling presets for Carousel3DPro.
 * It includes default glow, background opacity, font settings.
 * This file is pure JS config, can be extended at runtime.
 */

// Default configuration for carousel
export const defaultCarouselStyle = {
  // Font settings
  font: 'Roboto',
  fontSize: 0.5,
  fontHeight: 0.1,
  
  // Colors
  glowColor: 0xffffff,
  textColor: 0xcccccc,
  selectedTextColor: 0xffffff,
  backgroundColor: 0x111122,
  
  // Transparency
  opacity: 0.8,
  selectedOpacity: 1.0,
  
  // Layout
  itemSpacing: 1.5,
  cylinderRadius: 5,
  
  // Animations
  rotationSpeed: 0.05,
  selectionScale: 1.2,
  animationDuration: 0.8,
  
  // Glow effect
  glowIntensity: 1.5,
  glowSize: 1.1,
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

// Dark theme with neon glow
export const darkTheme = {
  ...defaultCarouselStyle,
  backgroundColor: 0x000000,
  textColor: 0x888888,
  selectedTextColor: 0xffffff,
  glowColor: 0xff00ff,
  opacity: 0.85
};

// Cyberpunk theme
export const cyberpunkTheme = {
  ...defaultCarouselStyle,
  backgroundColor: 0x0a0a1a,
  textColor: 0x00ccbb,
  selectedTextColor: 0x00ffee,
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
