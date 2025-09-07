/**
 * 3D Central Content Panel System - Development Version
 * Enhanced with admin controls and product display features
 * SAFETY: This is a development copy, original preserved
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
      // NEW: Admin controls for visual elements
      showFrame: false, // Toggle for green ring - DEFAULT OFF per user request
      frameColor: 0x00ffff,
      frameOpacity: 0.3,
      showGlow: false, // Toggle for glow effect
      ...config
    };
    
    this.currentContent = null;
    this.isTransitioning = false;
    this.cssRenderer = null;
    this.htmlContent = null;
    
    this.setupPanel();
    
    // Expose admin controls
    this.setupAdminControls();
  }
  
  setupPanel() {
    // Create base 3D frame/border for the content area (conditionally)
    if (this.config.showFrame) {
      this.createFrame();
    }
    
    // Setup CSS3D renderer for HTML content
    this.setupCSS3DRenderer();

    this.setupCSS3DObject();

    // Position at center of carousel
    this.position.set(0, 0, 0);
  }
  
  /**
   * NEW: Admin controls for runtime adjustments
   */
  setupAdminControls() {
    // Add to global admin interface
    if (typeof window !== 'undefined') {
      if (!window.watermelonAdmin) {
        window.watermelonAdmin = {};
      }
      
      // Frame toggle controls
      window.watermelonAdmin.toggleCenterFrame = (show = !this.config.showFrame) => {
        this.config.showFrame = show;
        if (show && !this.frame) {
          this.createFrame();
        } else if (!show && this.frame) {
          this.remove(this.frame);
          this.frame = null;
        }
        console.log(`[CentralContentPanel] Frame ${show ? 'enabled' : 'disabled'}`);
      };
      
      // Glow toggle controls
      window.watermelonAdmin.toggleCenterGlow = (show = !this.config.showGlow) => {
        this.config.showGlow = show;
        if (this.glow) {
          this.glow.visible = show;
        }
        console.log(`[CentralContentPanel] Glow ${show ? 'enabled' : 'disabled'}`);
      };
      
      // Frame color controls
      window.watermelonAdmin.setCenterFrameColor = (color = 0x00ffff) => {
        this.config.frameColor = color;
        if (this.frame?.material) {
          this.frame.material.color.setHex(color);
        }
        console.log(`[CentralContentPanel] Frame color set to: #${color.toString(16)}`);
      };
    }
  }
  
  createFrame() {
    // Only create if enabled
    if (!this.config.showFrame) return;
    
    // Create a subtle 3D frame around the content area
    const frameGeometry = new THREE.RingGeometry(
      this.config.radius - 0.1, 
      this.config.radius + 0.1, 
      32
    );
    
    const frameMaterial = new THREE.MeshBasicMaterial({
      color: this.config.frameColor,
      transparent: true,
      opacity: this.config.frameOpacity,
      side: THREE.DoubleSide
    });
    
    this.frame = new THREE.Mesh(frameGeometry, frameMaterial);
    this.frame.rotation.x = Math.PI / 2; // Lay flat
    this.add(this.frame);
    
    // Add subtle glow effect if enabled
    if (this.config.showGlow) {
      this.createGlowEffect();
    }
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
    this.glow.visible = this.config.showGlow; // Respect visibility setting
    this.add(this.glow);
  }
  
  // ... rest of the original methods remain the same
  
  setupCSS3DRenderer() {
    if (typeof window === 'undefined') return;
    
    // Create CSS3D renderer for HTML content overlay
    this.cssRenderer = new CSS3DRenderer();
    this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
    this.cssRenderer.domElement.style.position = 'absolute';
    this.cssRenderer.domElement.style.top = '0px';
    this.cssRenderer.domElement.style.left = '0px';
    this.cssRenderer.domElement.style.pointerEvents = 'none';
    this.cssRenderer.domElement.style.zIndex = '100';
  }

  setupCSS3DObject() {
    if (typeof window === 'undefined') return;
    // Create CSS3D object for HTML content
    this.htmlContent = new CSS3DObject(document.createElement('div'));  
    this.htmlContent.position.set(0, 0, 0); // Center in panel
    this.htmlContent.scale.set(1, 1, 1); // Default scale
    this.add(this.htmlContent);
  }

  /**
   * Enhanced content loading with template system
   */
  async loadTemplatedContent(contentData) {
    try {
      console.log('[CentralContentPanel] Loading templated content:', contentData?.type);
      
      // Check if this is a product that should display a GLB model
      if (contentData?.type === 'product' && contentData?.glbModel) {
        await this.loadProductWithGLB(contentData);
      } else {
        // Use the template system to render content
        const templatedHtml = contentTemplates.renderContent(contentData);
        
        // Create enhanced content with template
        const enhancedContent = {
          ...contentData,
          templatedHtml,
          hasTemplate: true
        };
        
        await this.showContent(enhancedContent);
      }
      
      // Add template-specific interactions
      this.setupTemplateInteractions();
      
    } catch (error) {
      console.error('[CentralContentPanel] Template loading error:', error);
      // Fallback to regular content loading
      await this.showContent(contentData);
    }
  }
  
  /**
   * NEW: Load product with GLB model display
   */
  async loadProductWithGLB(productData) {
    try {
      console.log('[CentralContentPanel] Loading product with GLB:', productData.glbModel);
      
      // Clear existing 3D content
      this.clearProductModels();
      
      // Load GLB model
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      
      loader.load(
        productData.glbModel,
        (gltf) => {
          const model = gltf.scene;
          
          // Scale and position the model
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDimension = Math.max(size.x, size.y, size.z);
          const scale = 1.5 / maxDimension; // Scale to reasonable size
          
          model.scale.setScalar(scale);
          model.position.set(0, 0.5, 0); // Float above center
          
          // Add to scene
          this.productModel = model;
          this.add(model);
          
          // Add floating product info
          this.createProductInfo(productData);
          
          // Animate in
          gsap.from(model.scale, {
            duration: 1,
            x: 0, y: 0, z: 0,
            ease: "back.out(1.7)"
          });
          
          console.log('[CentralContentPanel] Product GLB loaded successfully');
        },
        (progress) => {
          console.log('[CentralContentPanel] GLB loading progress:', progress);
        },
        (error) => {
          console.error('[CentralContentPanel] GLB loading error:', error);
          // Fallback to regular product display
          this.showContent(productData);
        }
      );
      
    } catch (error) {
      console.error('[CentralContentPanel] Product GLB setup error:', error);
      // Fallback to regular content
      this.showContent(productData);
    }
  }
  
  /**
   * Create floating product information display
   */
  createProductInfo(productData) {
    // Create floating text with product details
    const infoGroup = new THREE.Group();
    
    // Load font for 3D text (reuse carousel font)
    if (this.scene?.userData?.font) {
      this.createProductText(infoGroup, productData, this.scene.userData.font);
    } else {
      // Create HTML overlay as fallback
      this.createProductHTMLOverlay(productData);
    }
    
    this.productInfo = infoGroup;
    this.add(infoGroup);
  }
  
  /**
   * Create 3D text for product info (preserving text geometry depth)
   */
  createProductText(group, productData, font) {
    // Product title
    const titleGeometry = new THREE.TextGeometry(productData.title || 'Product', {
      font,
      size: 0.15,
      depth: 0.02, // Preserve depth setting per user request
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelOffset: 0,
      bevelSegments: 5
    });
    
    const titleMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ffff,
      metalness: 0.1,
      roughness: 0.8
    });
    
    const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    titleGeometry.computeBoundingBox();
    const titleWidth = titleGeometry.boundingBox.max.x - titleGeometry.boundingBox.min.x;
    titleMesh.position.set(-titleWidth / 2, 1.5, 0);
    
    group.add(titleMesh);
    
    // Product price
    if (productData.price) {
      const priceGeometry = new THREE.TextGeometry(`$${productData.price}`, {
        font,
        size: 0.1,
        depth: 0.015, // Slightly less depth for smaller text
        curveSegments: 8
      });
      
      const priceMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00 
      });
      
      const priceMesh = new THREE.Mesh(priceGeometry, priceMaterial);
      priceGeometry.computeBoundingBox();
      const priceWidth = priceGeometry.boundingBox.max.x - priceGeometry.boundingBox.min.x;
      priceMesh.position.set(-priceWidth / 2, 1.2, 0);
      
      group.add(priceMesh);
    }
  }
  
  /**
   * Clear existing product models
   */
  clearProductModels() {
    if (this.productModel) {
      this.remove(this.productModel);
      this.productModel = null;
    }
    if (this.productInfo) {
      this.remove(this.productInfo);
      this.productInfo = null;
    }
  }
  
  // ... Include all other original methods here
  // (This is a development version, so we'd copy the rest of the original file)
}
