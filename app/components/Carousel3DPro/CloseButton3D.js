import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Creates a 3D close button ('X' on a disk) for use in the carousel UI.
 * Emits a 'click' event when clicked.
 *
 * @class
 * @extends THREE.Group
 * @param {Object} [config={}] - Configuration options.
 * @param {number} [config.radius=0.22] - Radius of the button disk.
 * @param {number} [config.baseColor=0xff3333] - Color of the disk.
 * @param {number} [config.hoverColor=0xff0000] - Color when hovered.
 * @param {number} [config.xColor=0xffffff] - Color of the 'X'.
 * @param {number} [config.opacity=0.45] - Base opacity.
 * @param {number} [config.hoverOpacity=0.8] - Opacity when hovered.
 * @param {Function} [config.onClick] - Callback function executed when the button is clicked.
 */
export class CloseButton3D extends THREE.Group {
    constructor(config = {}) {
        super();

        this.config = {
            radius: 0.22,
            baseColor: 0xff3333,
            hoverColor: 0xff0000,
            xColor: 0xffffff,
            opacity: 0.45,
            hoverOpacity: 0.8,
            onClick: null,
            ...config,
        };

        this.isCloseButton = true; // Flag for raycasting identification
        this.name = 'CloseButton3D'; // For easier debugging

        // --- Create Base Disk ---
        const baseGeometry = new THREE.CylinderGeometry(this.config.radius, this.config.radius, 0.05, 24);
        this.baseMaterial = new THREE.MeshStandardMaterial({
            color: this.config.baseColor,
            transparent: true,
            opacity: this.config.opacity,
            metalness: 0.5,
            roughness: 0.3,
            emissive: this.config.baseColor, // Use base color for emissive initially
            emissiveIntensity: 0.5
        });
        this.baseMesh = new THREE.Mesh(baseGeometry, this.baseMaterial);
        this.baseMesh.userData.isCloseButtonPart = true; // Mark children for raycasting
        this.add(this.baseMesh);

        // --- Create 'X' Lines ---
        const lineThickness = 0.03;
        const lineLength = this.config.radius * 1.0; // Adjust length relative to radius
        const lineGeometry1 = new THREE.BoxGeometry(lineLength, lineThickness, lineThickness);
        const lineGeometry2 = new THREE.BoxGeometry(lineLength, lineThickness, lineThickness);

        this.xMaterial = new THREE.MeshStandardMaterial({
            color: this.config.xColor,
            emissive: this.config.xColor,
            emissiveIntensity: 0.8
        });

        const line1 = new THREE.Mesh(lineGeometry1, this.xMaterial);
        line1.position.set(0, 0, 0.03); // Slightly above the disk surface
        line1.rotation.z = Math.PI / 4; // Rotate around Z for 'X'
        line1.userData.isCloseButtonPart = true;

        const line2 = new THREE.Mesh(lineGeometry2, this.xMaterial);
        line2.position.set(0, 0, 0.03);
        line2.rotation.z = -Math.PI / 4; // Rotate around Z for 'X'
        line2.userData.isCloseButtonPart = true;

        this.add(line1, line2);

        // Store references
        this.userData.lines = [line1, line2];

        // Set initial state
        this.visible = false; // Start hidden
        this.scale.set(0.01, 0.01, 0.01); // Start scaled down
    }

    /**
     * Handles the click interaction. Executes the onClick callback if provided.
     */
    handleClick() {
        if (this.config.onClick && typeof this.config.onClick === 'function') {
            this.config.onClick();
        } else {
            console.warn('CloseButton3D clicked, but no onClick handler provided.');
        }
    }

    /**
     * Sets the visual state to hovered or not hovered.
     * @param {boolean} isHovering - True if the button is being hovered over.
     */
    setHoverState(isHovering) {
        gsap.to(this.baseMaterial, {
            opacity: isHovering ? this.config.hoverOpacity : this.config.opacity,
            duration: 0.2,
            ease: 'power1.out'
        });
        gsap.to(this.baseMaterial.color, {
            r: new THREE.Color(isHovering ? this.config.hoverColor : this.config.baseColor).r,
            g: new THREE.Color(isHovering ? this.config.hoverColor : this.config.baseColor).g,
            b: new THREE.Color(isHovering ? this.config.hoverColor : this.config.baseColor).b,
            duration: 0.2,
            ease: 'power1.out'
        });
         gsap.to(this.baseMaterial.emissive, { // Also animate emissive color
            r: new THREE.Color(isHovering ? this.config.hoverColor : this.config.baseColor).r,
            g: new THREE.Color(isHovering ? this.config.hoverColor : this.config.baseColor).g,
            b: new THREE.Color(isHovering ? this.config.hoverColor : this.config.baseColor).b,
            duration: 0.2,
            ease: 'power1.out'
        });
    }

    /**
     * Shows the button with an animation.
     * @param {boolean} [animate=true] - Whether to animate the transition.
     * @param {number} [delay=0] - Delay before the animation starts.
     */
    show(animate = true, delay = 0) {
        this.visible = true;
        if (animate) {
            gsap.to(this.scale, {
                x: 1,
                y: 1,
                z: 1,
                duration: 0.5,
                ease: 'back.out(1.7)',
                delay
            });
        } else {
            this.scale.set(1, 1, 1);
        }
    }

    /**
     * Hides the button with an animation.
     * @param {boolean} [animate=true] - Whether to animate the transition.
     * @param {number} [delay=0] - Delay before the animation starts.
     * @returns {Promise<void>} A promise that resolves when the hide animation is complete.
     */
    hide(animate = true, delay = 0) {
        return new Promise((resolve) => {
            const onComplete = () => {
                this.visible = false;
                resolve();
            };

            if (animate) {
                gsap.to(this.scale, {
                    x: 0.01,
                    y: 0.01,
                    z: 0.01,
                    duration: 0.3,
                    ease: 'back.in(1.7)',
                    delay,
                    onComplete
                });
            } else {
                this.scale.set(0.01, 0.01, 0.01);
                onComplete();
            }
        });
    }

    /**
     * Cleans up Three.js resources used by the button.
     */
    dispose() {
        // Dispose geometries
        this.baseMesh.geometry.dispose();
        this.userData.lines.forEach(line => line.geometry.dispose());

        // Dispose materials
        this.baseMaterial.dispose();
        this.xMaterial.dispose();

        // Remove children
        this.clear(); // THREE.Group method to remove all children

        // Kill any active GSAP animations targeting this object
        gsap.killTweensOf(this.scale);
        gsap.killTweensOf(this.baseMaterial);
        gsap.killTweensOf(this.baseMaterial.color);
        gsap.killTweensOf(this.baseMaterial.emissive);


        console.log('CloseButton3D disposed');
    }
}