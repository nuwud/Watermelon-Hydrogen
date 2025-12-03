/**
 * @AI-PROMPT
 * Write GLSL shader chunks here to apply glow, Fresnel edges, and opacity fade.
 * The shaders are used by Carousel3DPro.js for visual feedback.
 * Enhanced for Cerebro-style bright menu visibility.
 */

import * as THREE from 'three';

// Vertex shader for glow effect - enhanced for brighter appearance
const glowVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vIntensity;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    
    // Calculate view-angle based intensity
    vec3 viewDir = normalize(vViewPosition);
    vIntensity = pow(1.0 - abs(dot(vNormal, viewDir)), 1.5);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment shader for glow effect - much brighter and more prominent
const glowFragmentShader = `
  uniform vec3 glowColor;
  uniform float time;
  uniform float intensity;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vIntensity;
  
  void main() {
    // Enhanced Fresnel effect - brighter at edges
    float fresnel = dot(normalize(vViewPosition), vNormal);
    fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
    fresnel = pow(fresnel, 1.2);
    
    // Pulsating effect based on time - subtle but noticeable
    float pulse = 0.7 + 0.3 * sin(time * 2.5);
    
    // Core glow - always visible
    float coreGlow = 0.4 + vIntensity * 0.6;
    
    // Combine effects for brighter, more visible glow
    float finalIntensity = (fresnel * 2.0 + coreGlow) * pulse * intensity;
    vec3 finalColor = glowColor * finalIntensity;
    
    // Higher alpha for more visible effect
    float alpha = clamp(fresnel * 0.9 + 0.2, 0.0, 1.0);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// Vertex shader for opacity fade
const opacityFadeVertexShader = `
  varying vec3 vPosition;
  
  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader for opacity fade
const opacityFadeFragmentShader = `
  uniform float opacity;
  uniform vec3 color;
  varying vec3 vPosition;
  
  void main() {
    // Distance-based fade
    float distance = length(vPosition);
    float fade = 1.0 - smoothstep(0.0, 2.0, distance);
    
    gl_FragColor = vec4(color, opacity * fade);
  }
`;

// Bright outline shader for menu items - highly visible
const brightOutlineVertexShader = `
  uniform float outlineThickness;
  varying vec3 vNormal;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec3 pos = position + normal * outlineThickness;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const brightOutlineFragmentShader = `
  uniform vec3 outlineColor;
  uniform float time;
  varying vec3 vNormal;
  
  void main() {
    // Subtle shimmer
    float shimmer = 0.85 + 0.15 * sin(time * 3.0);
    vec3 finalColor = outlineColor * shimmer;
    gl_FragColor = vec4(finalColor, 0.9);
  }
`;

export const getGlowShaderMaterial = (intensityValue = 1.5) => {
  return new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0xffffff) },
      time: { value: 0.0 },
      intensity: { value: intensityValue }
    },
    vertexShader: glowVertexShader,
    fragmentShader: glowFragmentShader,
    transparent: true,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
};

export const getOpacityFadeMaterial = (color = 0xcccccc, opacity = 0.8) => {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(color) },
      opacity: { value: opacity }
    },
    vertexShader: opacityFadeVertexShader,
    fragmentShader: opacityFadeFragmentShader,
    transparent: true,
    side: THREE.DoubleSide
  });
};

// NEW: Bright outline material for better menu visibility
export const getBrightOutlineMaterial = (color = 0xffffff, thickness = 0.02) => {
  return new THREE.ShaderMaterial({
    uniforms: {
      outlineColor: { value: new THREE.Color(color) },
      outlineThickness: { value: thickness },
      time: { value: 0.0 }
    },
    vertexShader: brightOutlineVertexShader,
    fragmentShader: brightOutlineFragmentShader,
    transparent: true,
    side: THREE.BackSide
  });
};

// Helper function to create a glow layer/halo around an object
export const createGlowLayer = (mesh, glowColor = 0xffffff, size = 1.12) => {
  const geometry = mesh.geometry.clone();
  const material = getGlowShaderMaterial(2.0);
  material.uniforms.glowColor.value = new THREE.Color(glowColor);
  
  const glowMesh = new THREE.Mesh(geometry, material);
  glowMesh.scale.set(size, size, size);
  glowMesh.renderOrder = -1; // Render before the main mesh
  
  return glowMesh;
};

// NEW: Create bright outline for menu items
export const createBrightOutline = (mesh, outlineColor = 0xffffff) => {
  const geometry = mesh.geometry.clone();
  const material = getBrightOutlineMaterial(outlineColor, 0.015);
  
  const outlineMesh = new THREE.Mesh(geometry, material);
  outlineMesh.renderOrder = -1;
  
  return outlineMesh;
};
