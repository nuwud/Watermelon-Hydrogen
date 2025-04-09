/**
 * @AI-PROMPT
 * Write GLSL shader chunks here to apply glow, Fresnel edges, and opacity fade.
 * The shaders are used by Carousel3DPro.js for visual feedback.
 */

import * as THREE from 'three';

// Vertex shader for glow effect
const glowVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment shader for glow effect
const glowFragmentShader = `
  uniform vec3 glowColor;
  uniform float time;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    // Fresnel effect - stronger glow at edges
    float fresnel = dot(normalize(vViewPosition), vNormal);
    fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
    
    // Pulsating effect based on time
    float pulse = 0.5 + 0.5 * sin(time * 2.0);
    
    // Combine fresnel and pulse effects
    vec3 finalColor = glowColor * (fresnel * 1.5) * (0.75 + pulse * 0.25);
    
    gl_FragColor = vec4(finalColor, fresnel * 0.8);
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

export const getGlowShaderMaterial = () => {
  return new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0xffffff) },
      time: { value: 0.0 }
    },
    vertexShader: glowVertexShader,
    fragmentShader: glowFragmentShader,
    transparent: true,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending
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

// Helper function to create a glow layer/halo around an object
export const createGlowLayer = (mesh, glowColor = 0xffffff, size = 1.1) => {
  const geometry = mesh.geometry.clone();
  const material = getGlowShaderMaterial();
  material.uniforms.glowColor.value = new THREE.Color(glowColor);
  
  const glowMesh = new THREE.Mesh(geometry, material);
  glowMesh.scale.set(size, size, size);
  
  return glowMesh;
};
