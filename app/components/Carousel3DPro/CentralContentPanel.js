/**
 * 3D Central Content Panel System
 * Displays dynamic content in the center of the carousel ring
 */

import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import gsap from 'gsap';

export class CentralContentPanel extends THREE.Group {
  constructor(config = {}) {
    super();
    
    this.config = {
      radius: 3, // Distance from carousel center
      width: 6,
      height: 4,
      ...config
    };
    
    this.currentContent = null;
    this.isTransitioning = false;
    this.cssRenderer = null;
    this.htmlContent = null;
    
    this.setupPanel();
  }
  
  setupPanel() {
    // Create base 3D frame/border for the content area
    this.createFrame();
    
    // Setup CSS3D renderer for HTML content
    this.setupCSS3DRenderer();
    
    // Position at center of carousel
    this.position.set(0, 0, 0);
  }
  
  createFrame() {
    // Create a subtle 3D frame around the content area
    const frameGeometry = new THREE.RingGeometry(
      this.config.radius - 0.1, 
      this.config.radius + 0.1, 
      32
    );
    
    const frameMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    
    this.frame = new THREE.Mesh(frameGeometry, frameMaterial);
    this.frame.rotation.x = Math.PI / 2; // Lay flat
    this.add(this.frame);
    
    // Add subtle glow effect
    this.createGlowEffect();
  }
  
  createGlowEffect() {
    const glowGeometry = new THREE.RingGeometry(
      this.config.radius - 0.2, 
      this.config.radius + 0.2, 
      32
    );
    
    const glowMaterial = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0.1 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float opacity;
        varying vec2 vUv;
        
        void main() {
          float pulse = sin(time * 2.0) * 0.5 + 0.5;
          vec3 color = vec3(0.0, 1.0, 1.0);
          gl_FragColor = vec4(color, opacity * pulse);
        }
      `
    });
    
    this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glow.rotation.x = Math.PI / 2;
    this.glow.position.y = -0.01; // Slightly below frame
    this.add(this.glow);
  }
  
  setupCSS3DRenderer() {
    // This will be initialized when we have access to the main renderer
    this.cssRenderer = new CSS3DRenderer();
    this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
    this.cssRenderer.domElement.style.position = 'absolute';
    this.cssRenderer.domElement.style.top = '0';
    this.cssRenderer.domElement.style.pointerEvents = 'none';
  }
  
  /**
   * Load and display content based on menu selection
   * @param {string} contentType - Type of content (page, product, etc.)
   * @param {Object} contentData - Data for the content
   */
  async loadContent(contentType, contentData) {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    
    // Hide current content
    if (this.currentContent) {
      await this.hideContent();
    }
    
    // Create new content based on type
    const newContent = await this.createContent(contentType, contentData);
    
    // Show new content
    await this.showContent(newContent);
    
    this.currentContent = newContent;
    this.isTransitioning = false;
  }
  
  async createContent(contentType, contentData) {
    switch (contentType) {
      case 'page':
        return this.createPageContent(contentData);
      case 'product':
        return this.createProductContent(contentData);
      case 'gallery':
        return this.createGalleryContent(contentData);
      case 'dashboard':
        return this.createDashboardContent(contentData);
      default:
        return this.createDefaultContent(contentData);
    }
  }
  
  createPageContent(data) {
    // Create HTML content for Shopify pages
    const contentDiv = document.createElement('div');
    contentDiv.className = 'central-panel-content page-content';
    
    // Check if we have rich formatted content from Shopify
    const hasFormattedContent = data.content && data.content.formatted;
    
    if (hasFormattedContent) {
      const formatted = data.content.formatted;
      contentDiv.innerHTML = `
        <div class="content-wrapper shopify-page">
          <header class="page-header">
            <h1>${formatted.title}</h1>
            <p class="page-summary">${formatted.summary}</p>
            <div class="page-meta">
              <span class="reading-time">${data.content.readingTime} min read</span>
              <span class="word-count">${data.content.wordCount} words</span>
              <span class="last-updated">Updated: ${formatted.lastUpdated}</span>
            </div>
          </header>
          
          <div class="page-content-body">
            ${this.renderContentBlocks(formatted.mainContent)}
          </div>
          
          <footer class="page-footer">
            <div class="content-actions">
              <button class="action-btn primary">${formatted.callToAction}</button>
              <button class="action-btn secondary" onclick="window.centralPanel.showFullPage('${data.url}')">
                View Full Page
              </button>
            </div>
          </footer>
          
          ${data.isPlaceholder ? '<div class="placeholder-notice">⚠️ Placeholder content - Setting up Shopify page</div>' : ''}
        </div>
      `;
    } else {
      // Fallback for simple content
      contentDiv.innerHTML = `
        <div class="content-wrapper simple-page">
          <h1>${data.title}</h1>
          <div class="content-body">
            ${data.content || 'Loading content...'}
          </div>
          <div class="content-actions">
            <button class="action-btn primary">Learn More</button>
            <button class="action-btn secondary">Contact</button>
          </div>
        </div>
      `;
    }
    
    // Style the content
    this.styleContent(contentDiv);
    
    // Create CSS3D object
    const cssObject = new CSS3DObject(contentDiv);
    cssObject.position.set(0, 0, 0);
    cssObject.scale.set(0.01, 0.01, 0.01); // Start small for animation
    
    // Store reference for interactions
    cssObject.userData = { 
      type: 'page', 
      data,
      isShopifyPage: hasFormattedContent 
    };
    
    return cssObject;
  }
  
  createProductContent(data) {
    const contentDiv = document.createElement('div');
    contentDiv.className = 'central-panel-content product-content';
    contentDiv.innerHTML = `
      <div class="product-wrapper">
        <div class="product-image">
          <img src="${data.image}" alt="${data.title}" />
        </div>
        <div class="product-info">
          <h2>${data.title}</h2>
          <p class="price">${data.price}</p>
          <p class="description">${data.description}</p>
          <div class="product-actions">
            <button class="add-to-cart">Add to Cart</button>
            <button class="view-details">View Details</button>
          </div>
        </div>
      </div>
    `;
    
    this.styleContent(contentDiv);
    
    const cssObject = new CSS3DObject(contentDiv);
    cssObject.position.set(0, 0, 0);
    cssObject.scale.set(0.01, 0.01, 0.01);
    
    return cssObject;
  }
  
  createGalleryContent(data) {
    const contentDiv = document.createElement('div');
    contentDiv.className = 'central-panel-content gallery-content';
    contentDiv.innerHTML = `
      <div class="gallery-wrapper">
        <h2>${data.title}</h2>
        <div class="gallery-grid">
          ${data.items.map(item => `
            <div class="gallery-item" data-url="${item.url}">
              <img src="${item.thumbnail}" alt="${item.title}" />
              <div class="gallery-overlay">
                <h3>${item.title}</h3>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    this.styleContent(contentDiv);
    
    const cssObject = new CSS3DObject(contentDiv);
    cssObject.position.set(0, 0, 0);
    cssObject.scale.set(0.01, 0.01, 0.01);
    
    return cssObject;
  }
  
  createDashboardContent(data) {
    const contentDiv = document.createElement('div');
    contentDiv.className = 'central-panel-content dashboard-content';
    contentDiv.innerHTML = `
      <div class="dashboard-wrapper">
        <h1>Welcome to Nuwud Multimedia</h1>
        <div class="dashboard-stats">
          <div class="stat-card">
            <h3>Active Projects</h3>
            <div class="stat-number">${data.activeProjects || 12}</div>
          </div>
          <div class="stat-card">
            <h3>Completed Builds</h3>
            <div class="stat-number">${data.completedBuilds || 47}</div>
          </div>
          <div class="stat-card">
            <h3>Happy Clients</h3>
            <div class="stat-number">${data.happyClients || 156}</div>
          </div>
        </div>
        <div class="quick-actions">
          <button class="action-card" data-action="start-project">
            <h4>Start New Project</h4>
            <p>Begin your digital transformation</p>
          </button>
          <button class="action-card" data-action="view-portfolio">
            <h4>View Portfolio</h4>
            <p>See our latest work</p>
          </button>
        </div>
      </div>
    `;
    
    this.styleContent(contentDiv);
    
    const cssObject = new CSS3DObject(contentDiv);
    cssObject.position.set(0, 0, 0);
    cssObject.scale.set(0.01, 0.01, 0.01);
    
    return cssObject;
  }
  
  /**
   * Render content blocks into HTML
   */
  renderContentBlocks(contentBlocks) {
    if (!Array.isArray(contentBlocks)) return '';
    
    return contentBlocks.map(block => {
      if (block.startsWith('## ')) {
        // Heading
        return `<h3>${block.substring(3)}</h3>`;
      } else {
        // Paragraph
        return `<p>${block}</p>`;
      }
    }).join('');
  }

  /**
   * Show full Shopify page in overlay or new tab
   */
  showFullPage(pageUrl) {
    // For now, open in new tab - later could show in modal overlay
    window.open(pageUrl, '_blank');
  }
  
  styleContent(contentDiv) {
    // Apply consistent styling
    contentDiv.style.cssText = `
      width: 800px;
      height: 600px;
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid #00ffff;
      border-radius: 10px;
      padding: 20px;
      color: #00ffff;
      font-family: 'Courier New', monospace;
      overflow-y: auto;
      backdrop-filter: blur(10px);
      box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
    `;
  }
  
  async showContent(content) {
    if (!content) return;
    
    // Add to scene
    this.add(content);
    
    // Animate in
    return new Promise((resolve) => {
      gsap.to(content.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.5,
        ease: "back.out(1.7)",
        onComplete: resolve
      });
      
      gsap.from(content.rotation, {
        y: Math.PI,
        duration: 0.5,
        ease: "power2.out"
      });
    });
  }
  
  async hideContent() {
    if (!this.currentContent) return;
    
    return new Promise((resolve) => {
      gsap.to(this.currentContent.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.3,
        ease: "back.in(1.7)",
        onComplete: () => {
          this.remove(this.currentContent);
          resolve();
        }
      });
    });
  }
  
  update(time) {
    // Update glow animation
    if (this.glow && this.glow.material.uniforms) {
      this.glow.material.uniforms.time.value = time * 0.001;
    }
  }
  
  dispose() {
    if (this.cssRenderer) {
      this.cssRenderer.domElement.remove();
    }
    
    if (this.currentContent) {
      this.remove(this.currentContent);
    }
    
    // Dispose materials and geometries
    this.traverse((child) => {
      if (child.material) {
        child.material.dispose();
      }
      if (child.geometry) {
        child.geometry.dispose();
      }
    });
  }
}
