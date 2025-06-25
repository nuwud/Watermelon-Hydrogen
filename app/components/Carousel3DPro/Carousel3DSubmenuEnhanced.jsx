/**
 * Enhanced Carousel3DSubmenu for Nuwud Multimedia
 * Integrates Shopify products with 3D menu system
 */

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { extractShopifyGLBUrl } from '../../utils/contentManager.js';

const Carousel3DSubmenuEnhanced = ({ 
  items = [], 
  onItemClick,
  onItemHover,
  shopifyProducts = [],
  selectedMainItem = null,
  isVisible = false 
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const submenuItemsRef = useRef([]);
  const [enhancedItems, setEnhancedItems] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState({});

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current || sceneRef.current) return;

    const currentMount = mountRef.current; // Capture ref value

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75, 
      currentMount.clientWidth / currentMount.clientHeight, 
      0.1, 
      1000
    );
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });

    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    currentMount.appendChild(renderer.domElement);

    // Camera positioning for submenu
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);

    // Lighting setup optimized for GLB models
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x4444ff, 0.3);
    fillLight.position.set(-5, 2, -5);
    scene.add(fillLight);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    return () => {
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Map Shopify products to submenu items
  useEffect(() => {
    const enhanceItems = async () => {
      if (!items.length) return;

      const enhanced = await Promise.all(
        items.map(async (item) => {
          const matchingProduct = shopifyProducts.find(product => 
            product.handle === item.id || 
            product.title.toLowerCase().includes(item.label?.toLowerCase() || '') ||
            product.tags?.some(tag => tag.toLowerCase() === item.id)
          );

          const enhancedItem = {
            ...item,
            shopifyProduct: matchingProduct,
            model3D: {
              type: item.model3D?.type || 'default',
              description: item.model3D?.description || item.description,
              glbPath: item.model3D?.glbPath || `/assets/models/default/${item.id}.glb`
            }
          };

          // Use Shopify GLB if available
          if (matchingProduct) {
            const shopifyGLB = extractShopifyGLBUrl(matchingProduct);
            if (shopifyGLB) {
              enhancedItem.model3D.glbPath = shopifyGLB;
            }

            // Add product metadata
            enhancedItem.price = matchingProduct.priceRange?.minVariantPrice;
            enhancedItem.productType = matchingProduct.productType;
            enhancedItem.isAvailable = matchingProduct.variants?.nodes?.[0]?.availableForSale;
          }

          return enhancedItem;
        })
      );

      setEnhancedItems(enhanced);
    };

    enhanceItems();
  }, [items, shopifyProducts]);

  // Load 3D models for submenu items
  useEffect(() => {
    if (!sceneRef.current || !enhancedItems.length) return;

    const loader = new GLTFLoader();
    submenuItemsRef.current = [];

    // Clear existing submenu items
    const submenuGroup = sceneRef.current.getObjectByName('submenuGroup');
    if (submenuGroup) {
      sceneRef.current.remove(submenuGroup);
    }

    const newSubmenuGroup = new THREE.Group();
    newSubmenuGroup.name = 'submenuGroup';
    sceneRef.current.add(newSubmenuGroup);

    // Arrange items in a circle around the center
    const radius = 4;
    const angleStep = (Math.PI * 2) / enhancedItems.length;

    enhancedItems.forEach((item, index) => {
      const angle = index * angleStep;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Load GLB model
      setLoadingProgress(prev => ({ ...prev, [item.id]: 0 }));

      loader.load(
        item.model3D.glbPath,
        (gltf) => {
          const model = gltf.scene;
          model.name = `submenu-${item.id}`;
          model.position.set(x, 0, z);
          model.userData = { item, index };

          // Scale model appropriately
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 0.8 / maxDim;
          model.scale.setScalar(scale);

          // Add interaction data
          model.traverse((child) => {
            if (child.isMesh) {
              child.userData = { item, index };
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          newSubmenuGroup.add(model);
          submenuItemsRef.current[index] = model;

          setLoadingProgress(prev => ({ ...prev, [item.id]: 100 }));

          // Add floating text label
          addFloatingLabel(item, x, z, newSubmenuGroup);
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          setLoadingProgress(prev => ({ ...prev, [item.id]: percent }));
        },
        (error) => {
          console.warn(`Failed to load 3D model for ${item.label}:`, error);
          // Add fallback placeholder
          addFallbackGeometry(item, x, z, newSubmenuGroup, index);
          setLoadingProgress(prev => ({ ...prev, [item.id]: 100 }));
        }
      );
    });

  }, [enhancedItems]);

  // Add floating text label for item
  const addFloatingLabel = (item, x, z, group) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = 'rgba(0, 255, 150, 0.9)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'black';
    context.font = '18px Arial';
    context.textAlign = 'center';
    context.fillText(item.label, canvas.width / 2, 25);

    // Add price if available
    if (item.price) {
      context.font = '14px Arial';
      context.fillText(`$${item.price.amount}`, canvas.width / 2, 45);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const geometry = new THREE.PlaneGeometry(2, 0.5);
    const label = new THREE.Mesh(geometry, material);

    label.position.set(x, 1.5, z);
    label.lookAt(cameraRef.current.position);
    label.name = `label-${item.id}`;

    group.add(label);
  };

  // Add fallback geometry when GLB fails to load
  const addFallbackGeometry = (item, x, z, group, index) => {
    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const material = new THREE.MeshLambertMaterial({ 
      color: 0x00ff96,
      transparent: true,
      opacity: 0.8
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.set(x, 0, z);
    mesh.name = `submenu-fallback-${item.id}`;
    mesh.userData = { item, index };

    group.add(mesh);
    submenuItemsRef.current[index] = mesh;
  };

  // Animation loop
  useEffect(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    let animationFrame;

    const animate = () => {
      // Rotate submenu items gently
      submenuItemsRef.current.forEach((item, index) => {
        if (item) {
          item.rotation.y += 0.01;
          // Gentle floating animation
          item.position.y = Math.sin(Date.now() * 0.001 + index) * 0.1;
        }
      });

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationFrame = requestAnimationFrame(animate);
    };

    if (isVisible) {
      animate();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isVisible]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;

      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle mouse interactions
  useEffect(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event) => {
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

      if (intersects.length > 0) {
        const intersected = intersects[0].object;
        if (intersected.userData?.item) {
          onItemHover?.(intersected.userData.item);
          rendererRef.current.domElement.style.cursor = 'pointer';
        }
      } else {
        rendererRef.current.domElement.style.cursor = 'default';
      }
    };

    const handleClick = (event) => {
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

      if (intersects.length > 0) {
        const intersected = intersects[0].object;
        if (intersected.userData?.item) {
          onItemClick?.(intersected.userData.item);
        }
      }
    };

    rendererRef.current.domElement.addEventListener('mousemove', handleMouseMove);
    rendererRef.current.domElement.addEventListener('click', handleClick);

    return () => {
      if (rendererRef.current?.domElement) {
        rendererRef.current.domElement.removeEventListener('mousemove', handleMouseMove);
        rendererRef.current.domElement.removeEventListener('click', handleClick);
      }
    };
  }, [onItemClick, onItemHover]);

  return (
    <div className="carousel-3d-submenu-enhanced">
      <div 
        ref={mountRef} 
        className={`submenu-mount ${isVisible ? 'visible' : 'hidden'}`}
        style={{
          width: '100%',
          height: '400px',
          position: 'relative',
          transition: 'opacity 0.3s ease',
          opacity: isVisible ? 1 : 0
        }}
      />
      
      {/* Loading indicators */}
      {Object.entries(loadingProgress).some(([, progress]) => progress < 100) && (
        <div className="loading-overlay">
          <div className="loading-text">Loading 3D Models...</div>
          {Object.entries(loadingProgress).map(([itemId, progress]) => (
            <div key={itemId} className="loading-item">
              <span>{itemId}: {Math.round(progress)}%</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item info overlay */}
      {enhancedItems.length > 0 && (
        <div className="submenu-info">
          <h3>{selectedMainItem?.label} Submenu</h3>
          <p>{enhancedItems.length} items available</p>
          <div className="shopify-integration-status">
            {enhancedItems.filter(item => item.shopifyProduct).length} items connected to Shopify
          </div>
        </div>
      )}

      {/* CSS Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .carousel-3d-submenu-enhanced {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .submenu-mount {
          border-radius: 10px;
          overflow: hidden;
          background: linear-gradient(135deg, 
            rgba(0, 255, 150, 0.1) 0%, 
            rgba(0, 150, 255, 0.1) 100%);
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: #00ff96;
          z-index: 10;
        }

        .loading-text {
          font-size: 18px;
          margin-bottom: 20px;
          font-family: 'Courier New', monospace;
        }

        .loading-item {
          margin: 5px 0;
          width: 200px;
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 2px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ff96, #00ddff);
          transition: width 0.3s ease;
        }

        .submenu-info {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background: rgba(0, 0, 0, 0.7);
          color: #00ff96;
          padding: 10px;
          border-radius: 5px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }

        .submenu-info h3 {
          margin: 0 0 5px 0;
          font-size: 14px;
        }

        .submenu-info p {
          margin: 0;
          opacity: 0.8;
        }

        .shopify-integration-status {
          margin-top: 5px;
          color: #00ddff;
          font-size: 11px;
        }

        .hidden {
          pointer-events: none;
        }
        `
      }} />
    </div>
  );
};

export default Carousel3DSubmenuEnhanced;
