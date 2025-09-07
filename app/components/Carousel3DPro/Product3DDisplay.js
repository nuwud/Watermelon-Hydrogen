/**
 * 3D Product Display System for Central Panel
 * Displays floating GLB models, product info, and interactive 3D buttons
 * Uses the product's actual GLB/shape from content manager (no placeholders)
 */

import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import gsap from 'gsap';

export class Product3DDisplay {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        
        // Display state
        this.isVisible = false;
        this.currentProduct = null;
        
        // 3D elements
        this.displayGroup = new THREE.Group();
        this.productModel = null;
        this.titleText = null;
        this.priceText = null;
        this.buttons = [];
        
        // Font for 3D text
        this.font = null;
        this.loadFont();
        
        this.scene.add(this.displayGroup);
        
        console.log('🎮 Product3DDisplay initialized');
    }
    
    async loadFont() {
        const fontLoader = new FontLoader();
        try {
            this.font = await new Promise((resolve, reject) => {
                fontLoader.load('/helvetiker_regular.typeface.json', resolve, undefined, reject);
            });
            console.log('✅ Font loaded for Product3DDisplay');
        } catch (error) {
            console.warn('⚠️ Font loading failed:', error);
        }
    }
    
    async displayProduct(productData) {
        console.log('🛍️ Displaying product:', productData.title);
        
        // Clear previous product
        this.clearDisplay();
        
        this.currentProduct = productData;
        this.isVisible = true;
        
        // Position the display group in front of camera
        this.displayGroup.position.set(0, 0, 0);
        this.displayGroup.visible = true;
        
        // Load and display the product's actual GLB model
        await this.loadProductModel(productData);
        
        // Create 3D text elements
        this.createProductText(productData);
        
        // Create interactive 3D buttons
        this.createInteractiveButtons(productData);
        
        // Animate in
        this.animateIn();
    }
    
    async loadProductModel(productData) {
        // Use the product's assigned shape from content manager
        const shapeName = productData.shape;
        
        if (!shapeName) {
            console.warn('⚠️ No shape assigned to product:', productData.title);
            return;
        }
    // Dynamically import GLTFLoader for better chunking and SSR safety
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const gltfLoader = new GLTFLoader();
        const modelPath = `/assets/models/${shapeName}.glb`;
        
        try {
            console.log(`🔄 Loading product model: ${modelPath}`);
            const gltf = await new Promise((resolve, reject) => {
                gltfLoader.load(modelPath, resolve, undefined, reject);
            });
            
            this.productModel = gltf.scene;
            
            // Position the model
            this.productModel.position.set(0, 1, -3);
            this.productModel.scale.setScalar(2);
            
            // Add floating animation
            gsap.to(this.productModel.rotation, {
                y: Math.PI * 2,
                duration: 8,
                repeat: -1,
                ease: "none"
            });
            
            gsap.to(this.productModel.position, {
                y: "+=0.5",
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: "power2.inOut"
            });
            
            this.displayGroup.add(this.productModel);
            console.log(`✅ Product model loaded: ${shapeName}`);
            
        } catch (error) {
            console.warn(`⚠️ Failed to load product model ${modelPath}:`, error);
            // Create a fallback wireframe cube
            this.createFallbackModel();
        }
    }
    
    createFallbackModel() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ff88, 
            wireframe: true 
        });
        this.productModel = new THREE.Mesh(geometry, material);
        this.productModel.position.set(0, 1, -3);
        this.displayGroup.add(this.productModel);
    }
    
    createProductText(productData) {
        if (!this.font) return;
        
        // Product title
        try {
            const titleGeometry = new TextGeometry(productData.title, {
                font: this.font,
                size: 0.3,
                depth: 0.1, // Add proper depth to prevent stretching
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.02,
                bevelSize: 0.01,
                bevelOffset: 0,
                bevelSegments: 3
            });
            
            titleGeometry.computeBoundingBox();
            const titleWidth = titleGeometry.boundingBox.max.x - titleGeometry.boundingBox.min.x;
            titleGeometry.translate(-titleWidth / 2, 0, 0);
            
            const titleMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xffffff,
                transparent: true,
                opacity: 0.9
            });
            
            this.titleText = new THREE.Mesh(titleGeometry, titleMaterial);
            this.titleText.position.set(0, 2, -3);
            this.displayGroup.add(this.titleText);
            
        } catch (error) {
            console.warn('⚠️ Failed to create title text:', error);
        }
        
        // Product price
        if (productData.price) {
            try {
                const priceGeometry = new TextGeometry(productData.price, {
                    font: this.font,
                    size: 0.25,
                    depth: 0.08, // Add proper depth
                    curveSegments: 12,
                    bevelEnabled: true,
                    bevelThickness: 0.015,
                    bevelSize: 0.008,
                    bevelOffset: 0,
                    bevelSegments: 3
                });
                
                priceGeometry.computeBoundingBox();
                const priceWidth = priceGeometry.boundingBox.max.x - priceGeometry.boundingBox.min.x;
                priceGeometry.translate(-priceWidth / 2, 0, 0);
                
                const priceMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x00ff88,
                    transparent: true,
                    opacity: 0.9
                });
                
                this.priceText = new THREE.Mesh(priceGeometry, priceMaterial);
                this.priceText.position.set(0, 1.5, -3);
                this.displayGroup.add(this.priceText);
                
            } catch (error) {
                console.warn('⚠️ Failed to create price text:', error);
            }
        }
    }
    
    createInteractiveButtons(productData) {
        const buttonData = [
            { text: 'BUY NOW', color: 0x00ff88, action: 'buy', position: [-1.5, 0, -2] },
            { text: 'ADD TO CART', color: 0x0088ff, action: 'addToCart', position: [0, 0, -2] },
            { text: 'DETAILS', color: 0xff8800, action: 'details', position: [1.5, 0, -2] }
        ];
        
        buttonData.forEach((btnData) => {
            this.createButton(btnData, productData);
        });
    }
    
    createButton(btnData, productData) {
        if (!this.font) return;
        
        try {
            // Create button text
            const textGeometry = new TextGeometry(btnData.text, {
                font: this.font,
                size: 0.15,
                depth: 0.05, // Add proper depth
                curveSegments: 8,
                bevelEnabled: true,
                bevelThickness: 0.01,
                bevelSize: 0.005,
                bevelOffset: 0,
                bevelSegments: 2
            });
            
            textGeometry.computeBoundingBox();
            const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
            textGeometry.translate(-textWidth / 2, 0, 0);
            
            const textMaterial = new THREE.MeshPhongMaterial({ 
                color: btnData.color,
                transparent: true,
                opacity: 0.8
            });
            
            const buttonMesh = new THREE.Mesh(textGeometry, textMaterial);
            buttonMesh.position.set(...btnData.position);
            
            // Add button metadata
            buttonMesh.userData = {
                type: 'productButton',
                action: btnData.action,
                product: productData
            };
            
            // Add hover effect
            gsap.to(buttonMesh.scale, {
                x: 1.1,
                y: 1.1,
                z: 1.1,
                duration: 1,
                repeat: -1,
                yoyo: true,
                ease: "power2.inOut"
            });
            
            this.buttons.push(buttonMesh);
            this.displayGroup.add(buttonMesh);
            
        } catch (error) {
            console.warn('⚠️ Failed to create button:', btnData.text, error);
        }
    }
    
    animateIn() {
        // Scale in animation
        this.displayGroup.scale.set(0, 0, 0);
        gsap.to(this.displayGroup.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 0.8,
            ease: "back.out(1.7)"
        });
        
        // Fade in elements
        this.displayGroup.traverse((child) => {
            if (child.material && child.material.transparent) {
                const originalOpacity = child.material.opacity;
                child.material.opacity = 0;
                gsap.to(child.material, {
                    opacity: originalOpacity,
                    duration: 1,
                    delay: 0.2
                });
            }
        });
    }
    
    hide() {
        console.log('🙈 Hiding product display');
        this.isVisible = false;
        
        // Animate out
        gsap.to(this.displayGroup.scale, {
            x: 0,
            y: 0,
            z: 0,
            duration: 0.5,
            ease: "back.in(1.7)",
            onComplete: () => {
                this.clearDisplay();
            }
        });
    }
    
    clearDisplay() {
        // Remove all children from display group
        while (this.displayGroup.children.length > 0) {
            const child = this.displayGroup.children[0];
            this.displayGroup.remove(child);
            
            // Dispose of geometries and materials
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }
        
        // Reset references
        this.productModel = null;
        this.titleText = null;
        this.priceText = null;
        this.buttons = [];
        this.currentProduct = null;
        
        this.displayGroup.visible = false;
    }
    
    // Check if a 3D object is a product display button
    isProductButton(object) {
        return object.userData && object.userData.type === 'productButton';
    }
    
    // Handle button clicks
    handleButtonClick(object) {
        if (!this.isProductButton(object)) return false;
        
        const { action, product } = object.userData;
        console.log(`🛍️ Product button clicked: ${action} for ${product.title}`);
        
        switch (action) {
            case 'buy':
                this.handleBuyNow(product);
                break;
            case 'addToCart':
                this.handleAddToCart(product);
                break;
            case 'details':
                this.handleViewDetails(product);
                break;
        }
        
        return true;
    }
    
    handleBuyNow(product) {
        console.log('💰 Buy Now clicked for:', product.title);
        // Navigate to product page for immediate purchase
        if (product.url) {
            window.location.href = product.url;
        }
    }
    
    handleAddToCart(product) {
        console.log('🛒 Add to Cart clicked for:', product.title);
        // Add to cart logic here
        if (window.cartActions?.addItem) {
            window.cartActions.addItem(product);
        }
    }
    
    handleViewDetails(product) {
        console.log('📋 View Details clicked for:', product.title);
        // Show detailed product view
        if (product.url) {
            window.open(product.url, '_blank');
        }
    }
    
    dispose() {
        this.clearDisplay();
        if (this.displayGroup.parent) {
            this.displayGroup.parent.remove(this.displayGroup);
        }
    }
}
