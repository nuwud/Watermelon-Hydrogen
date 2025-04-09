/**
 * Alternative inspector implementation using dat.GUI
 * This provides sliders and controls for precise adjustment of carousel settings
 * 
 * NOTE: This implementation requires the dat.GUI library, unlike the vanilla JS
 * implementation in Carousel3DProInspector.js
 */

import * as dat from 'dat.gui';
import { getThemeByName, createCustomTheme } from './CarouselStyleConfig.js';

export class Carousel3DProInspectorGUI {
    constructor(carouselInstance) {
        this.carousel = carouselInstance;
        this.gui = new dat.GUI();
        this.settings = {
            theme: 'default',
            rotationSpeed: carouselInstance.style.rotationSpeed,
            glowIntensity: carouselInstance.style.glowIntensity,
            fontSize: carouselInstance.style.fontSize,
            switchToDarkTheme: () => this.switchTheme('dark'),
            switchToCyberpunkTheme: () => this.switchTheme('cyberpunk')
        };

        this.setupGUI();
    }

    setupGUI() {
        this.gui.add(this.settings, 'theme', ['default', 'light', 'dark', 'cyberpunk', 'minimal'])
            .name('Theme')
            .onChange(name => this.switchTheme(name));

        this.gui.add(this.settings, 'rotationSpeed', 0.01, 0.2)
            .name('Rotation Speed')
            .onChange(speed => this.carousel.style.rotationSpeed = speed);

        this.gui.add(this.settings, 'glowIntensity', 0.5, 5.0)
            .name('Glow Intensity')
            .onChange(val => this.carousel.style.glowIntensity = val);

        this.gui.add(this.settings, 'fontSize', 0.1, 1.5)
            .name('Font Size')
            .onChange(size => {
                this.carousel.style.fontSize = size;
                this.carousel.dispose();
                this.carousel.meshes = [];
                this.carousel.group.clear();
                this.carousel.init();
            });

        // Add Theme Toggle Button to Control Panel
        const themeButton = createButton('Change Theme', () => {
            try {
                toggleTheme(); // Call the toggleTheme function
            } catch (e) {
                console.error("Error toggling theme:", e);
            }
        }, '#614080'); // Use a custom color for the button

        themeSection.appendChild(themeButton); // Add the button to the theme section
    }

    switchTheme(name) {
        const newTheme = getThemeByName(name);
        Object.assign(this.carousel.style, newTheme);
        this.carousel.dispose();
        this.carousel.meshes = [];
        this.carousel.group.clear();
        this.carousel.init();
    }

    destroy() {
        this.gui.destroy();
    }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Carousel3DProInspectorGUI };
} else {
    window.Carousel3DProInspectorGUI = Carousel3DProInspectorGUI;
}
