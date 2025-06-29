/**
 * 3D Central Content Panel System
 * Displays dynamic content in the center of the carousel ring
 */

import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import gsap from 'gsap';
import { contentTemplates } from '../../utils/contentTemplates.js';

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
    // Create HTML content for product display
    const contentDiv = document.createElement('div');
    contentDiv.className = 'central-panel-content product-content';
    
    // Use enhanced product content with pricing and actions
    const productContent = data.content || data.formatted || '';
    const price = data.price || (data.selectedVariant?.price ? `$${data.selectedVariant.price.amount}` : 'Price TBD');
    
    contentDiv.innerHTML = `
      <div class="product-wrapper">
        <div class="product-header">
          <h1 class="product-title">${data.title}</h1>
          <div class="product-price">${price}</div>
        </div>
        <div class="product-content">
          ${typeof productContent === 'string' ? productContent : productContent.html || data.description || ''}
        </div>
        <div class="product-actions">
          <button class="add-to-cart-btn" data-product-handle="${data.handle}">
            Add to Cart
          </button>
          <button class="view-details-btn" data-product-url="${data.url}">
            View Details
          </button>
          <button class="buy-now-btn" data-product-handle="${data.handle}">
            Buy Now
          </button>
        </div>
        <div class="product-meta">
          <span class="product-type">${data.type === 'product' ? 'Digital Product' : data.type}</span>
          ${data.isShopifyProduct ? '<span class="shopify-badge">✅ Shopify</span>' : ''}
          ${data.isDummy ? '<span class="demo-badge">⚠️ Demo</span>' : ''}
        </div>
      </div>
    `;
    
    this.styleContent(contentDiv);
    
    const cssObject = new CSS3DObject(contentDiv);
    cssObject.position.set(0, 0, 0);
    cssObject.scale.set(0.01, 0.01, 0.01);
    
    // Add 3D GLB model if product has a shape
    if (data.shape && data.shape !== 'null') {
      this.add3DProductModel(data.shape);
    }
    
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
    
    // Clear any product models
    this.clearProductModels();
    
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
  
  /**
   * Enhanced content loading with template system
   */
  async loadTemplatedContent(contentData) {
    try {
      // Use the template system to render content
      const templatedHtml = contentTemplates.renderContent(contentData);
      
      // Create enhanced content with template
      const enhancedContent = {
        ...contentData,
        templatedHtml,
        hasTemplate: true
      };
      
      await this.showContent(enhancedContent);
      
      // Add template-specific interactions
      this.setupTemplateInteractions();
      
    } catch (error) {
      console.error('[CentralContentPanel] Template loading error:', error);
      // Fallback to regular content loading
      await this.showContent(contentData);
    }
  }

  /**
   * Setup interactions for templated content
   */
  setupTemplateInteractions() {
    if (!this.htmlContent) return;
    
    // Add click handlers for template buttons
    const buttons = this.htmlContent.querySelectorAll('[data-action]');
    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        const action = e.target.getAttribute('data-action');
        const url = e.target.getAttribute('data-url');
        
        this.handleTemplateAction(action, url, e.target);
      });
    });
  }

  /**
   * Handle template button actions
   */
  handleTemplateAction(action, url, element) {
    console.log(`[CentralContentPanel] Template action: ${action}`, { url, element });
    
    switch (action) {
      case 'open-page':
        if (url) {
          window.open(url, '_blank');
        }
        break;
      case 'view-cart':
        // Trigger cart drawer
        if (window.drawerController?.openCartDrawer) {
          window.drawerController.openCartDrawer();
        }
        break;
      case 'view-gallery':
        // Load gallery content
        if (window.loadContentForItem) {
          window.loadContentForItem('Gallery');
        }
        break;
      case 'view-product':
        // Handle product view
        console.log('Product view requested');
        break;
      case 'cta':
        // Handle call-to-action
        console.log('CTA clicked');
        break;
      default:
        console.log(`Unknown template action: ${action}`);
    }
  }
  
  update(time) {
    // Update glow animation
    if (this.glow && this.glow.material.uniforms) {
      this.glow.material.uniforms.time.value = time * 0.001;
    }
    
    // Update floating animations for product models
    if (this.productModels) {
      this.productModels.forEach(model => {
        if (model.userData.floatAnimation) {
          model.userData.floatAnimation();
        }
      });
    }
  }
  
  dispose() {
    if (this.cssRenderer) {
      this.cssRenderer.domElement.remove();
    }
    
    if (this.currentContent) {
      this.remove(this.currentContent);
    }
    
    // Clear product models
    this.clearProductModels();
    
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
  
  /**
   * Add a floating 3D GLB model for a product
   * @param {string} glbPath - Path to the GLB model file
   */
  async add3DProductModel(glbPath) {
    try {
      console.warn(`[🍉 3D Model] Loading GLB model: ${glbPath}`);
      
      // Import GLTFLoader dynamically
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      
      // Load the GLB model
      const gltf = await new Promise((resolve, reject) => {
        loader.load(
          glbPath,
          (gltf) => resolve(gltf),
          (progress) => {
            console.warn(`[🍉 3D Model] Loading progress: ${(progress.loaded / progress.total * 100)}%`);
          },
          (error) => reject(error)
        );
      });
      
      const model = gltf.scene;
      
      // Position the model floating next to the content
      model.position.set(-2, 1, 0); // Left side of content panel
      model.scale.setScalar(1); // Adjust scale as needed
      
      // Add floating animation
      const floatAnimation = () => {
        const time = Date.now() * 0.001;
        model.position.y = 1 + Math.sin(time * 2) * 0.2; // Gentle floating motion
        model.rotation.y = time * 0.5; // Slow rotation
      };
      
      // Store animation function for updates
      model.userData.floatAnimation = floatAnimation;
      
      // Add the model to the central panel
      this.add(model);
      
      // Store reference for cleanup
      if (!this.productModels) this.productModels = [];
      this.productModels.push(model);
      
      console.warn(`[🍉 3D Model] Successfully added GLB model to central panel`);
      
      return model;
      
    } catch (error) {
      console.error(`[🍉 3D Model] Failed to load GLB model ${glbPath}:`, error);
      
      // Create a fallback 3D shape if GLB loading fails
      const fallbackGeometry = new THREE.BoxGeometry(1, 1, 1);
      const fallbackMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        wireframe: true
      });
      const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
      
      fallbackMesh.position.set(-2, 1, 0);
      fallbackMesh.scale.setScalar(0.8);
      
      // Add floating animation to fallback
      const floatAnimation = () => {
        const time = Date.now() * 0.001;
        fallbackMesh.position.y = 1 + Math.sin(time * 2) * 0.2;
        fallbackMesh.rotation.y = time * 0.5;
      };
      
      fallbackMesh.userData.floatAnimation = floatAnimation;
      
      this.add(fallbackMesh);
      
      if (!this.productModels) this.productModels = [];
      this.productModels.push(fallbackMesh);
      
      console.warn(`[🍉 3D Model] Added fallback wireframe cube instead of GLB`);
      
      return fallbackMesh;
    }
  }

  /**
   * Clear all product models from the panel
   */
  clearProductModels() {
    if (this.productModels) {
      this.productModels.forEach(model => {
        this.remove(model);
        if (model.geometry) model.geometry.dispose();
        if (model.material) {
          if (Array.isArray(model.material)) {
            model.material.forEach(mat => mat.dispose());
          } else {
            model.material.dispose();
          }
        }
      });
      this.productModels = [];
    }
  }
}
