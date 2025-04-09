/**
 * BubblePanel3D - A 3D floating inspector panel
 * 
 * This implements the future vision mentioned in the Carousel3DProInspector
 * by creating an actual 3D mesh with glass-like material for the inspector panel
 * instead of using HTML/CSS overlays.
 * 
 * Requires Three.js
 */

import * as THREE from 'three';

export function createBubblePanel(width = 2, height = 1, depth = 0.1, color = 0xffffff) {
    const geometry = new THREE.BoxGeometry(width, height, depth);

    const material = new THREE.MeshPhysicalMaterial({
        color,
        transparent: true,
        opacity: 0.4,
        roughness: 0,
        metalness: 0.8,
        reflectivity: 1.0,
        clearcoat: 1,
        clearcoatRoughness: 0,
        transmission: 1.0,
        thickness: 0.3,
        ior: 1.5,
        envMapIntensity: 1.2
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'BubblePanel3D';
    return mesh;
}

/**
 * Extended BubblePanel3D implementation with text capabilities
 * to serve as a full 3D replacement for the HTML-based inspector
 */
export class BubblePanel3DInspector {
    constructor(scene, camera, carousel, options = {}) {
        this.scene = scene;
        this.camera = camera;
        this.carousel = carousel;
        this.options = {
            width: 2,
            opacity: options.opacity || 0.7,
            fresnelColor: options.fresnelColor || 0xaaddff,
            baseColor: options.baseColor || 0x88ccff,
            fresnelPower: options.fresnelPower || 2.0,
            ...options
        };

        // Create the main container
        this.container = new THREE.Group();

        // Create the bubble panel
        this._createPanel();

        // Add initial text if provided
        if (this.options.text) {
            this.setText(this.options.text);
        }

        // Add optional border
        if (this.options.showBorder) {
            this._createBorder();
        }

        // Add optional icon
        if (this.options.icon) {
            this._addIcon(this.options.icon);
        }

        // Visibility
        this.visible = true;
    }

    _createPanel() {
        // Create a rounded rectangle for the panel
        const shape = new THREE.Shape();
        const width = this.options.width;
        const height = this.options.height;
        const radius = this.options.cornerRadius;

        shape.moveTo(-width / 2 + radius, -height / 2);
        shape.lineTo(width / 2 - radius, -height / 2);
        shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
        shape.lineTo(width / 2, height / 2 - radius);
        shape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
        shape.lineTo(-width / 2 + radius, height / 2);
        shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
        shape.lineTo(-width / 2, -height / 2 + radius);
        shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);

        const geometry = new THREE.ShapeGeometry(shape);

        // Create bubble material with Fresnel effect
        const material = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(this.options.baseColor) },
                fresnelColor: { value: new THREE.Color(this.options.fresnelColor) },
                opacity: { value: this.options.opacity },
                fresnelPower: { value: this.options.fresnelPower }
            },
            vertexShader: `
        varying vec3 vViewPosition;
        varying vec3 vNormal;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
            fragmentShader: `
        uniform vec3 color;
        uniform vec3 fresnelColor;
        uniform float opacity;
        uniform float fresnelPower;
        
        varying vec3 vViewPosition;
        varying vec3 vNormal;
        
        void main() {
          float fresnelFactor = abs(dot(normalize(vViewPosition), vNormal));
          fresnelFactor = pow(1.0 - fresnelFactor, fresnelPower);
          
          vec3 finalColor = mix(color, fresnelColor, fresnelFactor);
          gl_FragColor = vec4(finalColor, opacity);
        }
      `,
            transparent: true,
            side: THREE.DoubleSide
        });

        // Create the panel mesh
        this.panel = new THREE.Mesh(geometry, material);

        // Apply glow effect if available
        if (typeof applyGlowEffect === 'function') {
            applyGlowEffect(this.panel, {
                intensity: 0.15,
                color: new THREE.Color(0x88ffff)
            });
        }

        this.container.add(this.panel);
    }

    _createBorder() {
        const width = this.options.width;
        const height = this.options.height;
        const radius = this.options.cornerRadius;

        // Create points for line segments
        const points = [];
        const segments = 8; // Number of segments for corners

        // Bottom right corner
        for (let i = 0; i <= segments; i++) {
            const theta = Math.PI * 0.5 * i / segments;
            const x = width / 2 - radius + radius * Math.cos(theta);
            const y = -height / 2 + radius + radius * Math.sin(theta);
            points.push(new THREE.Vector3(x, y, 0.001));
        }

        // Top right corner
        for (let i = 0; i <= segments; i++) {
            const theta = Math.PI * 0.5 + Math.PI * 0.5 * i / segments;
            const x = width / 2 - radius + radius * Math.cos(theta);
            const y = height / 2 - radius + radius * Math.sin(theta);
            points.push(new THREE.Vector3(x, y, 0.001));
        }

        // Top left corner
        for (let i = 0; i <= segments; i++) {
            const theta = Math.PI + Math.PI * 0.5 * i / segments;
            const x = -width / 2 + radius + radius * Math.cos(theta);
            const y = height / 2 - radius + radius * Math.sin(theta);
            points.push(new THREE.Vector3(x, y, 0.001));
        }

        // Bottom left corner
        for (let i = 0; i <= segments; i++) {
            const theta = Math.PI * 1.5 + Math.PI * 0.5 * i / segments;
            const x = -width / 2 + radius + radius * Math.cos(theta);
            const y = -height / 2 + radius + radius * Math.sin(theta);
            points.push(new THREE.Vector3(x, y, 0.001));
        }

        // Create geometry
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Create material
        const material = new THREE.LineBasicMaterial({
            color: this.options.borderColor,
            transparent: true,
            opacity: 0.8
        });

        // Create border
        this.border = new THREE.Line(geometry, material);
        this.container.add(this.border);
    }

    _addIcon(iconTexture) {
        // Create a small plane for the icon
        const iconSize = Math.min(this.options.width, this.options.height) * 0.3;
        const geometry = new THREE.PlaneGeometry(iconSize, iconSize);

        // Create material with the icon texture
        const material = new THREE.MeshBasicMaterial({
            map: iconTexture,
            transparent: true,
            opacity: 0.9
        });

        this.icon = new THREE.Mesh(geometry, material);
        this.icon.position.set(-this.options.width / 2 + iconSize, this.options.height / 2 - iconSize, 0.002);
        this.container.add(this.icon);
    }

    setText(text) {
        this.options.text = text;

        // Remove existing text if any
        if (this.textMesh) {
            this.container.remove(this.textMesh);
            this.textMesh.geometry.dispose();
            this.textMesh.material.dispose();
        }

        if (this.options.use3DText && this.options.font) {
            // 3D text
            const textGeometry = new TextGeometry(text, {
                font: this.options.font,
                size: 0.15,
                height: 0.03,
                curveSegments: 5
            });

            textGeometry.computeBoundingBox();
            const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;

            const material = new THREE.MeshBasicMaterial({
                color: this.options.textColor,
                transparent: true,
                opacity: 0.9
            });

            this.textMesh = new THREE.Mesh(textGeometry, material);

            // Center the text
            this.textMesh.position.set(-textWidth / 2, -0.05, 0.02);

        } else {
            // Flat text using canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 512;
            canvas.height = 256;

            context.fillStyle = 'rgba(0,0,0,0)';
            context.fillRect(0, 0, canvas.width, canvas.height);

            context.font = '40px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillStyle = `#${new THREE.Color(this.options.textColor).getHexString()}`;
            context.fillText(text, canvas.width / 2, canvas.height / 2);

            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true
            });

            const aspectRatio = canvas.width / canvas.height;
            const textWidth = this.options.width * 0.9;
            const textHeight = textWidth / aspectRatio;

            const geometry = new THREE.PlaneGeometry(textWidth, textHeight);
            this.textMesh = new THREE.Mesh(geometry, material);
            this.textMesh.position.z = 0.01;
        }

        this.container.add(this.textMesh);

        return this;
    }

    setVisible(visible) {
        this.visible = visible;
        this.container.visible = visible;
        return this;
    }

    attachTo(object3D) {
        if (object3D) {
            // Remove from previous parent if any
            if (this.container.parent) {
                this.container.parent.remove(this.container);
            }

            // Add to new parent
            object3D.add(this.container);
        }
        return this;
    }

    // Helper to resize the panel
    resize(width, height, padding) {
        if (width !== undefined) this.options.width = width;
        if (height !== undefined) this.options.height = height;
        if (padding !== undefined) this.options.padding = padding;

        // Recreate panel with new dimensions
        this.container.remove(this.panel);
        if (this.border) {
            this.container.remove(this.border);
            this.border = null;
        }

        this._createPanel();

        if (this.options.showBorder) {
            this._createBorder();
        }

        // Update text position
        if (this.textMesh) {
            this.setText(this.options.text);
        }

        return this;
    }

    // Update material properties
    updateMaterial(options = {}) {
        if (this.panel && this.panel.material) {
            const material = this.panel.material;

            if (options.baseColor) {
                material.uniforms.color.value = new THREE.Color(options.baseColor);
            }

            if (options.fresnelColor) {
                material.uniforms.fresnelColor.value = new THREE.Color(options.fresnelColor);
            }

            if (options.opacity !== undefined) {
                material.uniforms.opacity.value = options.opacity;
                this.options.opacity = options.opacity;
            }

            if (options.fresnelPower !== undefined) {
                material.uniforms.fresnelPower.value = options.fresnelPower;
            }
        }

        return this;
    }
}

export default BubblePanel3D;
