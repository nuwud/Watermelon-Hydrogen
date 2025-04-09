import * as dat from 'dat.gui';
import { getThemeByName, createCustomTheme } from './CarouselStyleConfig.js';

function createButton(label, onClick, bgColor = '#444') {
    const btn = document.createElement('button');
    btn.innerText = label;
    btn.onclick = onClick;
    btn.style.padding = '6px 12px';
    btn.style.backgroundColor = bgColor;
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.marginTop = '10px';
    return btn;
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
}

function createThemeSection() {
    const section = document.createElement('div');
    section.style.marginTop = '10px';
    section.style.padding = '10px';
    section.style.border = '1px dashed #ccc';
    section.style.background = '#f9f9f9';
    return section;
}

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

        // Custom Button Section
        const themeSection = createThemeSection();

        // Button 1: Custom Theme
        const themeButton = createButton('Custom Theme', () => {
            const custom = createCustomTheme({ base: '#663399' });
            Object.assign(this.carousel.style, custom);
            this.carousel.dispose();
            this.carousel.meshes = [];
            this.carousel.group.clear();
            this.carousel.init();
        }, '#663399');

        // Button 2: Toggle Dark Mode
        const toggleButton = createButton('Toggle Dark Theme', () => {
            toggleTheme();
        }, '#222');

        themeSection.appendChild(themeButton);
        themeSection.appendChild(toggleButton);

        this.gui.domElement.appendChild(themeSection);
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
