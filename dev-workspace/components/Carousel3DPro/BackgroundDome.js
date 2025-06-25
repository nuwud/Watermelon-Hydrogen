/**
 * BackgroundDome - Creates an iridescent dome as background for the 3D carousel
 * 
 * This file adds a large spherical dome with subtle iridescent effect
 * using custom shader material for the backdrop of the carousel.
 * 
 * Requires Three.js
 */

import * as THREE from 'three';

export class BackgroundDome {
    constructor(scene, radius = 30, segments = 64) {
        this.scene = scene;
        this.radius = radius;
        this.segments = segments;
        this.dome = null;
        this.uniforms = {
            time: { value: 0 },
            intensity: { value: 0.2 }
        };
        
        this.createDome();
    }
    
    createDome() {
        // Create a sphere geometry for the dome
        const geometry = new THREE.SphereGeometry(
            this.radius, this.segments, this.segments, 
            0, Math.PI * 2, 0, Math.PI / 2 // Half sphere (dome)
        );
        
        // Create iridescent shader material
        const iridescenceShaderMaterial = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vViewPosition = -mvPosition.xyz;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float intensity;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                
                // Function to convert hue to RGB
                vec3 hue2rgb(float h) {
                    h = mod(h, 1.0);
                    float r = abs(h * 6.0 - 3.0) - 1.0;
                    float g = 2.0 - abs(h * 6.0 - 2.0);
                    float b = 2.0 - abs(h * 6.0 - 4.0);
                    return clamp(vec3(r, g, b), 0.0, 1.0);
                }
                
                void main() {
                    // Calculate Fresnel effect for iridescence
                    float fresnel = dot(normalize(vViewPosition), vNormal);
                    fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
                    
                    // Base color - lighten the dark blue/purple base color
                    vec3 baseColor = vec3(0.1, 0.1, 0.2);
                    
                    // Iridescent colors based on viewing angle and time
                    float hue = fresnel * 0.7 + time * 0.05;
                    vec3 iridescence = hue2rgb(hue) * fresnel * intensity;
                    
                    // Subtle wave pattern
                    float wavePattern = sin(vNormal.x * 10.0 + time) * 0.5 + 0.5;
                    wavePattern *= sin(vNormal.y * 8.0 + time * 0.7) * 0.5 + 0.5;
                    wavePattern *= sin(vNormal.z * 12.0 + time * 0.5) * 0.5 + 0.5;
                    
                    // Final color with subtle opacity gradient
                    vec3 finalColor = mix(baseColor, iridescence, wavePattern * fresnel);
                    float alpha = 0.6 + fresnel * 0.3;
                    
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            side: THREE.BackSide // Render on inside of dome
        });
        
        // Create the dome mesh
        this.dome = new THREE.Mesh(geometry, iridescenceShaderMaterial);
        
        // Position the dome appropriately
        this.dome.position.set(0, -5, 0); // Position below to create a full dome effect
        this.dome.rotation.x = Math.PI; // Flip to make it a dome
        
        // Add to the scene
        this.scene.add(this.dome);
    }
    
    update(deltaTime) {
        if (this.dome && this.uniforms) {
            // Update time uniform for animation
            this.uniforms.time.value += deltaTime * 0.2;
        }
    }
    
    // Method to change iridescence intensity
    setIntensity(value) {
        if (this.uniforms) {
            this.uniforms.intensity.value = value;
        }
    }
    
    // Clean up method
    dispose() {
        if (this.dome) {
            if (this.dome.geometry) this.dome.geometry.dispose();
            if (this.dome.material) this.dome.material.dispose();
            this.scene.remove(this.dome);
            this.dome = null;
        }
    }
}

export default BackgroundDome;