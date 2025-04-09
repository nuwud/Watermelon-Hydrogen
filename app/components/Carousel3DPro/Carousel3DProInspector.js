/**
 * @AI-PROMPT
 * This file defines Carousel3DProInspector — an interactive 3D UI inspector panel
 * that displays live debug and configuration data for the Carousel3DPro system.
 * It renders a draggable, floating inspector box in the top-left of the screen
 * using HTML + CSS overlay (for now), showing:
 * 
 * - Current selected item
 * - Index / total count
 * - Rotation value
 * - Active theme name
 * - Controls to switch themes or regenerate the carousel
 * 
 * The panel should update in real-time as the user rotates the carousel.
 * 
 * @REQUIREMENTS
 * - No external libraries besides DOM / Vanilla JS
 * - Works with existing Carousel3DPro class via event hooks or direct access
 * - Should be easy to enable/disable from `main.js`
 * 
 * @FUTURE-NOTE
 * This should eventually become a 3D floating HUD (BubblePanel3D) instead of HTML,
 * but this is the browser UI prototype.
 */

// Add a note about alternative implementations
/**
 * @ALTERNATIVE-IMPLEMENTATIONS
 * For alternative inspector implementations, see:
 * - Carousel3DPro_InspectorPanel.js: A dat.GUI based implementation with sliders
 * - BubblePanel3D.js: 3D panel implementation (requires Three.js)
 */

class Carousel3DProInspector {
    constructor(carousel, options = {}) {
        this.carousel = carousel;
        this.options = {
            initialPosition: { x: 20, y: 20 },
            showKeyboardShortcuts: true,
            minimalMode: false,
            updateInterval: 100,
            // Add new options
            enablePerformanceMetrics: true,
            theme: 'dark', // 'dark' or 'light'
            ...options
        };

        // Track previous values to highlight changes
        this.previousValues = {};

        // Performance tracking
        this.lastUpdateTime = 0;
        this.frameCount = 0;
        this.updateFrequency = 0;

        // Element references
        this.container = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };

        // Debounce update function to improve performance
        this.boundUpdateInfo = this.debounce(this.updateInfo.bind(this), 16); // ~60fps max update rate

        // Initialize
        this.createInspectorUI();
        this.attachEventListeners();

        // Register keyboard shortcuts if enabled
        if (this.options.showKeyboardShortcuts) {
            this.registerKeyboardShortcuts();
        }
    }

    // Helper: Debounce function to limit update frequency
    debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    createInspectorUI() {
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'carousel-3d-inspector';

        // Apply theme
        const isDarkTheme = this.options.theme === 'dark';

        // Style the container
        Object.assign(this.container.style, {
            position: 'fixed',
            top: `${this.options.initialPosition.y}px`,
            left: `${this.options.initialPosition.x}px`,
            backgroundColor: isDarkTheme ? 'rgba(30, 30, 30, 0.9)' : 'rgba(240, 240, 240, 0.9)',
            color: isDarkTheme ? '#e0e0e0' : '#222',
            padding: '12px',
            borderRadius: '8px',
            boxShadow: isDarkTheme ? '0 3px 14px rgba(0, 0, 0, 0.4)' : '0 3px 14px rgba(0, 0, 0, 0.2)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '13px',
            zIndex: '9999',
            userSelect: 'none',
            width: this.options.minimalMode ? '180px' : '260px',
            transition: 'background-color 0.3s, color 0.3s, width 0.2s',
            border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)'
        });

        // Add header with drag handle
        const header = document.createElement('div');
        header.className = 'inspector-header';
        Object.assign(header.style, {
            padding: '4px 0',
            marginBottom: '8px',
            borderBottom: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.1)',
            cursor: 'move',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        });

        const title = document.createElement('div');
        title.textContent = 'Carousel3D Inspector';
        title.style.fontWeight = 'bold';

        const controlsWrapper = document.createElement('div');
        controlsWrapper.style.display = 'flex';
        controlsWrapper.style.gap = '8px';

        // Add minimize button
        const minBtn = document.createElement('button');
        minBtn.innerHTML = '&#8210;'; // Minus symbol
        minBtn.title = "Toggle minimal mode";
        Object.assign(minBtn.style, {
            background: 'none',
            border: 'none',
            color: isDarkTheme ? 'white' : 'black',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '0 5px'
        });
        minBtn.onclick = () => this.toggleMinimalMode();

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&#10005;'; // X symbol
        closeBtn.title = "Hide inspector (Shift+I)";
        Object.assign(closeBtn.style, {
            background: 'none',
            border: 'none',
            color: isDarkTheme ? 'white' : 'black',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '0 5px'
        });
        closeBtn.onclick = () => this.hide();

        controlsWrapper.appendChild(minBtn);
        controlsWrapper.appendChild(closeBtn);

        header.appendChild(title);
        header.appendChild(controlsWrapper);
        this.container.appendChild(header);

        // Create content sections with collapsible functionality
        this.createInfoSection(isDarkTheme);
        this.createPerformanceSection(isDarkTheme);
        this.createControlsSection(isDarkTheme);

        // Add to DOM
        document.body.appendChild(this.container);

        // Initial update
        this.updateInfo();
    }

    createInfoSection(isDarkTheme) {
        const sectionWrapper = this.createCollapsibleSection('Carousel Info', true, isDarkTheme);
        this.infoSection = sectionWrapper.content;
        this.infoSection.className = 'inspector-info';

        // Create fields for displaying information
        const fields = [
            { id: 'current-item', label: 'Current Item:' },
            { id: 'index', label: 'Index:', suffix: ' / ', relatedId: 'total' },
            { id: 'rotation', label: 'Rotation:', suffix: '°' },
            { id: 'theme', label: 'Theme:' }
        ];

        fields.forEach(field => {
            const fieldDiv = document.createElement('div');
            fieldDiv.style.margin = '4px 0';
            fieldDiv.style.display = 'flex';
            fieldDiv.style.justifyContent = 'space-between';

            const labelSpan = document.createElement('span');
            labelSpan.textContent = field.label;
            labelSpan.style.opacity = '0.8';

            const valueWrapper = document.createElement('div');
            valueWrapper.style.fontWeight = 'bold';
            valueWrapper.style.maxWidth = '60%';
            valueWrapper.style.overflow = 'hidden';
            valueWrapper.style.textOverflow = 'ellipsis';

            const valueSpan = document.createElement('span');
            valueSpan.id = `inspector-${field.id}`;
            valueSpan.textContent = '-';
            valueSpan.style.transition = 'color 0.3s';

            valueWrapper.appendChild(valueSpan);

            if (field.suffix) {
                const suffixNode = document.createTextNode(field.suffix);
                valueWrapper.appendChild(suffixNode);

                if (field.relatedId) {
                    const relatedSpan = document.createElement('span');
                    relatedSpan.id = `inspector-${field.relatedId}`;
                    relatedSpan.textContent = '-';
                    valueWrapper.appendChild(relatedSpan);
                }
            }

            fieldDiv.appendChild(labelSpan);
            fieldDiv.appendChild(valueWrapper);
            this.infoSection.appendChild(fieldDiv);
        });

        this.container.appendChild(sectionWrapper.wrapper);
    }

    createPerformanceSection(isDarkTheme) {
        if (!this.options.enablePerformanceMetrics) return;

        const sectionWrapper = this.createCollapsibleSection('Performance', false, isDarkTheme);
        this.perfSection = sectionWrapper.content;

        const metrics = [
            { id: 'update-frequency', label: 'Update Rate:' },
            { id: 'render-time', label: 'Render Time:' }
        ];

        metrics.forEach(metric => {
            const metricDiv = document.createElement('div');
            metricDiv.style.margin = '4px 0';
            metricDiv.style.display = 'flex';
            metricDiv.style.justifyContent = 'space-between';

            const labelSpan = document.createElement('span');
            labelSpan.textContent = metric.label;
            labelSpan.style.opacity = '0.8';

            const valueSpan = document.createElement('span');
            valueSpan.id = `inspector-${metric.id}`;
            valueSpan.textContent = '-';

            metricDiv.appendChild(labelSpan);
            metricDiv.appendChild(valueSpan);
            this.perfSection.appendChild(metricDiv);
        });

        this.container.appendChild(sectionWrapper.wrapper);
    }

    createControlsSection(isDarkTheme) {
        const sectionWrapper = this.createCollapsibleSection('Controls', true, isDarkTheme);
        const controlsSection = sectionWrapper.content;

        // Theme selector
        const themeLabel = document.createElement('div');
        themeLabel.textContent = 'Change Theme:';
        themeLabel.style.marginBottom = '6px';

        this.themeSelect = document.createElement('select');
        Object.assign(this.themeSelect.style, {
            width: '100%',
            background: isDarkTheme ? '#444' : '#f0f0f0',
            color: isDarkTheme ? 'white' : 'black',
            border: isDarkTheme ? '1px solid #666' : '1px solid #ccc',
            borderRadius: '4px',
            padding: '5px',
            marginBottom: '10px',
            cursor: 'pointer'
        });

        // Safely try to get available themes
        try {
            // Populate with available themes
            const availableThemes = (this.carousel.getAvailableThemes?.() || ['default', 'dark', 'light'])
                .filter(theme => typeof theme === 'string');

            availableThemes.forEach(theme => {
                const option = document.createElement('option');
                option.value = theme;
                option.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
                this.themeSelect.appendChild(option);
            });

            this.themeSelect.onchange = () => {
                try {
                    this.carousel.setTheme?.(this.themeSelect.value);
                    this.updateInfo();
                    this.addVisualFeedback(this.themeSelect, isDarkTheme);
                } catch (err) {
                    console.warn('Carousel3DProInspector: Error changing theme:', err);
                }
            };
        } catch (err) {
            console.warn('Carousel3DProInspector: Error loading themes:', err);
            this.themeSelect.disabled = true;
            this.themeSelect.title = "Themes unavailable";
        }

        controlsSection.appendChild(themeLabel);
        controlsSection.appendChild(this.themeSelect);

        // Regenerate button
        const regenerateBtn = document.createElement('button');
        regenerateBtn.textContent = 'Regenerate Carousel';
        regenerateBtn.title = "Rebuild the carousel with current settings";
        Object.assign(regenerateBtn.style, {
            width: '100%',
            marginTop: '8px',
            padding: '8px',
            background: isDarkTheme ? '#555' : '#e0e0e0',
            color: isDarkTheme ? 'white' : 'black',
            border: isDarkTheme ? '1px solid #777' : '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
        });

        regenerateBtn.onmouseover = () => {
            regenerateBtn.style.background = isDarkTheme ? '#666' : '#d0d0d0';
        };

        regenerateBtn.onmouseout = () => {
            regenerateBtn.style.background = isDarkTheme ? '#555' : '#e0e0e0';
        };

        regenerateBtn.onclick = () => {
            try {
                const startTime = performance.now();
                const result = this.carousel.regenerate?.();
                const duration = performance.now() - startTime;

                // Show regeneration time as a tooltip
                regenerateBtn.title = `Rebuilt in ${duration.toFixed(2)}ms`;

                // Visual feedback
                this.addVisualFeedback(regenerateBtn, isDarkTheme);

                this.updateInfo();
                return result;
            } catch (err) {
                console.warn('Carousel3DProInspector: Error regenerating carousel:', err);
                regenerateBtn.title = "Error: " + (err.message || 'Failed to regenerate');
                return false;
            }
        };

        controlsSection.appendChild(regenerateBtn);

        // Inspector theme toggle button
        const inspectorThemeBtn = document.createElement('button');
        inspectorThemeBtn.textContent = `Switch to ${isDarkTheme ? 'Light' : 'Dark'} Mode`;
        inspectorThemeBtn.title = "Change inspector panel theme";
        Object.assign(inspectorThemeBtn.style, {
            width: '100%',
            marginTop: '8px',
            padding: '6px',
            background: 'none',
            color: isDarkTheme ? '#aaa' : '#555',
            border: isDarkTheme ? '1px solid #444' : '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
        });

        inspectorThemeBtn.onclick = () => {
            this.options.theme = isDarkTheme ? 'light' : 'dark';
            this.destroy();
            this.createInspectorUI();
            this.attachEventListeners();
        };

        controlsSection.appendChild(inspectorThemeBtn);
        this.container.appendChild(sectionWrapper.wrapper);
    }

    createCollapsibleSection(title, initiallyExpanded, isDarkTheme) {
        const wrapper = document.createElement('div');
        wrapper.className = 'inspector-section';
        wrapper.style.marginBottom = '12px';

        const header = document.createElement('div');
        header.className = 'section-header';
        Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            marginBottom: '6px',
            fontWeight: 'bold'
        });

        const headerTitle = document.createElement('div');
        headerTitle.textContent = title;

        const toggleIcon = document.createElement('span');
        toggleIcon.innerHTML = initiallyExpanded ? '&#9660;' : '&#9654;'; // Down/right arrow
        toggleIcon.style.fontSize = '10px';
        toggleIcon.style.marginLeft = '5px';

        header.appendChild(headerTitle);
        header.appendChild(toggleIcon);

        const content = document.createElement('div');
        content.className = 'section-content';
        content.style.display = initiallyExpanded ? 'block' : 'none';
        content.style.transition = 'height 0.2s';

        header.onclick = () => {
            const isExpanded = content.style.display !== 'none';
            content.style.display = isExpanded ? 'none' : 'block';
            toggleIcon.innerHTML = isExpanded ? '&#9654;' : '&#9660;';
        };

        wrapper.appendChild(header);
        wrapper.appendChild(content);

        return { wrapper, content, header };
    }

    updateInfo() {
        if (!this.container || this.container.style.display === 'none') return;

        const now = performance.now();
        const timeSinceLastUpdate = now - this.lastUpdateTime;
        this.frameCount++;

        // Update performance metrics every second
        if (timeSinceLastUpdate > 1000) {
            this.updateFrequency = Math.round((this.frameCount * 1000) / timeSinceLastUpdate);
            this.frameCount = 0;
            this.lastUpdateTime = now;

            // Update performance section if it exists
            if (this.options.enablePerformanceMetrics) {
                const updateFrequencyElem = document.getElementById('inspector-update-frequency');
                if (updateFrequencyElem) {
                    updateFrequencyElem.textContent = `${this.updateFrequency} Hz`;
                }
            }
        }

        try {
            // Only proceed if we have a carousel and it looks valid
            if (!this.carousel || typeof this.carousel !== 'object') return;

            // Safety check DOM elements before updating
            const currentItem = document.getElementById('inspector-current-item');
            const indexSpan = document.getElementById('inspector-index');
            const totalSpan = document.getElementById('inspector-total');
            const rotationSpan = document.getElementById('inspector-rotation');
            const themeSpan = document.getElementById('inspector-theme');

            if (!currentItem || !indexSpan || !totalSpan || !rotationSpan || !themeSpan) return;

            // Safe accessor function with fallback for carousel properties
            const getCarouselValue = (propAccessor, fallback) => {
                try {
                    return propAccessor() ?? fallback;
                } catch (e) {
                    return fallback;
                }
            };

            // Get values with safe fallbacks
            const selectedItem = getCarouselValue(() => this.carousel.getSelectedItem?.() || {}, {});
            const index = getCarouselValue(() => this.carousel.getCurrentIndex?.() || 0, 0);
            const total = getCarouselValue(() => this.carousel.getTotalItems?.() || 0, 0);
            const rotation = getCarouselValue(() => this.carousel.getCurrentRotation?.() || 0, 0);
            const theme = getCarouselValue(() => this.carousel.getCurrentTheme?.() || 'default', 'default');

            // Update with visual feedback for changes
            this.updateValueWithHighlight(currentItem, selectedItem.name || 'Unknown', 'current-item');
            this.updateValueWithHighlight(indexSpan, index + 1, 'index'); // 1-based for display
            this.updateValueWithHighlight(totalSpan, total, 'total');
            this.updateValueWithHighlight(rotationSpan, parseFloat(rotation).toFixed(2), 'rotation');
            this.updateValueWithHighlight(themeSpan, theme, 'theme');

            // Update theme selector to match current theme if it exists
            if (this.themeSelect && theme && this.themeSelect.value !== theme) {
                const themeExists = Array.from(this.themeSelect.options).some(option => option.value === theme);
                if (themeExists) {
                    this.themeSelect.value = theme;
                }
            }
        } catch (err) {
            console.warn('Carousel3DProInspector: Error updating info:', err);
        }
    }

    updateValueWithHighlight(element, newValue, key) {
        if (!element) return;

        const prevValue = this.previousValues[key];
        const valueChanged = prevValue !== undefined && prevValue !== newValue;

        // Update DOM
        element.textContent = newValue;

        // Highlight changes
        if (valueChanged) {
            // Remove any existing highlight
            element.style.color = '';

            // Flash value for a moment with a highlight color
            element.style.color = this.options.theme === 'dark' ? '#7df3ff' : '#0066cc';

            // Clear the highlight after a delay
            clearTimeout(element._highlightTimer);
            element._highlightTimer = setTimeout(() => {
                element.style.color = '';
            }, 300);
        }

        // Store current value for next comparison
        this.previousValues[key] = newValue;
    }

    addVisualFeedback(element, isDarkTheme) {
        const originalBg = element.style.background;
        const originalColor = element.style.color;

        element.style.background = isDarkTheme ? '#228855' : '#99ccaa';
        element.style.color = isDarkTheme ? 'white' : 'black';

        setTimeout(() => {
            element.style.background = originalBg;
            element.style.color = originalColor;
        }, 300);
    }

    attachEventListeners() {
        // Make panel draggable
        const header = this.container.querySelector('.inspector-header');

        header.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            const rect = this.container.getBoundingClientRect();
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            e.preventDefault();
        });

        document.addEventListener('mousemove', this.handleMouseMove = (e) => {
            if (this.isDragging) {
                const x = e.clientX - this.dragOffset.x;
                const y = e.clientY - this.dragOffset.y;

                // Keep within window bounds
                const maxX = window.innerWidth - this.container.offsetWidth;
                const maxY = window.innerHeight - this.container.offsetHeight;

                this.container.style.left = `${Math.max(0, Math.min(maxX, x))}px`;
                this.container.style.top = `${Math.max(0, Math.min(maxY, y))}px`;
            }
        });

        document.addEventListener('mouseup', this.handleMouseUp = () => {
            this.isDragging = false;
        });

        // Listen for carousel events to update info
        try {
            if (this.carousel && typeof this.carousel.on === 'function') {
                this.carousel.on('rotate', this.boundUpdateInfo);
                this.carousel.on('itemChange', this.boundUpdateInfo);
                this.carousel.on('themeChange', this.boundUpdateInfo);
            } else {
                // Fallback: Check for changes periodically
                this.updateInterval = setInterval(this.boundUpdateInfo, this.options.updateInterval);
            }
        } catch (err) {
            console.warn('Carousel3DProInspector: Error attaching event listeners:', err);
            // Fallback if event binding fails
            this.updateInterval = setInterval(this.boundUpdateInfo, this.options.updateInterval);
        }
    }

    registerKeyboardShortcuts() {
        document.addEventListener('keydown', this.handleKeyPress = (e) => {
            // Shift+I to toggle inspector
            if (e.key === 'I' && e.shiftKey) {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    toggleMinimalMode() {
        this.options.minimalMode = !this.options.minimalMode;
        this.container.style.width = this.options.minimalMode ? '180px' : '260px';

        // Toggle visibility of certain elements in minimal mode
        const sections = this.container.querySelectorAll('.section-content');
        sections.forEach(section => {
            if (section !== this.infoSection) {
                section.style.display = this.options.minimalMode ? 'none' : 'block';
            }
        });

        const sectionHeaders = this.container.querySelectorAll('.section-header');
        sectionHeaders.forEach(header => {
            if (header.nextElementSibling !== this.infoSection) {
                header.style.display = this.options.minimalMode ? 'none' : 'flex';
            }
        });
    }

    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    toggle() {
        if (this.container) {
            if (this.container.style.display === 'none') {
                this.show();
            } else {
                this.hide();
            }
        }
    }

    destroy() {
        try {
            // Clear any active intervals
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }

            // Remove DOM elements
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
                this.container = null;
            }

            // Remove event listeners
            document.removeEventListener('mousemove', this.handleMouseMove);
            document.removeEventListener('mouseup', this.handleMouseUp);
            document.removeEventListener('keydown', this.handleKeyPress);

            // Remove any event listeners from the carousel
            try {
                if (this.carousel && typeof this.carousel.off === 'function') {
                    this.carousel.off('rotate', this.boundUpdateInfo);
                    this.carousel.off('itemChange', this.boundUpdateInfo);
                    this.carousel.off('themeChange', this.boundUpdateInfo);
                }
            } catch (err) {
                console.warn('Carousel3DProInspector: Error removing event listeners:', err);
            }
        } catch (err) {
            console.error('Carousel3DProInspector: Error during cleanup:', err);
        }
    }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Carousel3DProInspector };
} else {
    window.Carousel3DProInspector = Carousel3DProInspector;
}

// Create carousel
const carousel = new Carousel3DPro(/* options */);

// Create and enable inspector
const inspector = new Carousel3DProInspector(carousel);

// You can toggle it on/off with:
// inspector.toggle();
// inspector.hide();
// inspector.show();

// Or completely remove it with:
// inspector.destroy();

// For 3D HUD version (requires Three.js):
// import { BubblePanel3DInspector } from './BubblePanel3D.js';
// const hudInspector = new BubblePanel3DInspector(scene, camera, carousel);

// For dat.GUI version:
// import { Carousel3DProInspectorGUI } from './Carousel3DPro_InspectorPanel.js';
// const guiInspector = new Carousel3DProInspectorGUI(carousel);
