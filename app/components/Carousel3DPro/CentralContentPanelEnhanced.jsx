/**
 * Enhanced Central Content Panel for Nuwud Multimedia
 * Integrates Shopify products with 3D display system
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
let GLTFLoader;
async function ensureGLTFLoader() {
  if (!GLTFLoader) {
    GLTFLoader = (await import('three/examples/jsm/loaders/GLTFLoader.js')).GLTFLoader;
  }
  return GLTFLoader;
}
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

const CentralContentPanelEnhanced = ({ 
  selectedItem = null,
  shopifyProduct = null,
  isVisible = true,
  showGreenRing = false, // Admin toggle for green ring
  onContentLoad,
  onError
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const currentModelRef = useRef(null);
  const textGroupRef = useRef(null);
  const greenRingRef = useRef(null);
  
  const [loadingState, setLoadingState] = useState({
    model: false,
    text: false,
    progress: 0
  });
  
  const [contentData, setContentData] = useState(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current || sceneRef.current) return;

    const currentMount = mountRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    
    const camera = new THREE.PerspectiveCamera(
      50, 
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
    renderer.toneMappingExposure = 1.5;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    currentMount.appendChild(renderer.domElement);

    // Camera positioning
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    // Enhanced lighting for product display
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(5, 5, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x4444ff, 0.6);
    fillLight.position.set(-3, 2, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x00ff96, 0.8);
    rimLight.position.set(-5, 0, 5);
    scene.add(rimLight);

    // Create green ring (toggleable)
    const createGreenRing = (targetScene) => {
      const ringGeometry = new THREE.RingGeometry(2.8, 3.2, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff96,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.name = 'greenRing';
      // Initialize invisible; separate effect controls visibility
      ring.visible = false;
      targetScene.add(ring);
      greenRingRef.current = ring;
    };

    createGreenRing(scene);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // Start animation loop
    startAnimationLoop();

    return () => {
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // (green ring creation handled inside the mount effect above)
  // (green ring creation handled inside the mount effect above)

  // Update green ring visibility
  useEffect(() => {
    if (greenRingRef.current) {
      greenRingRef.current.visible = showGreenRing;
    }
  }, [showGreenRing]);

  // Process selected item and Shopify product data
  useEffect(() => {
    if (!selectedItem && !shopifyProduct) {
      setContentData(null);
      clearCentralContent();
      return;
    }

    const processContentData = async () => {
      const data = {
        title: selectedItem?.label || shopifyProduct?.title || 'Product',
        description: selectedItem?.description || shopifyProduct?.description || '',
        glbUrl: null,
        price: shopifyProduct?.priceRange?.minVariantPrice,
        productType: shopifyProduct?.productType,
        isAvailable: shopifyProduct?.variants?.nodes?.[0]?.availableForSale,
        metafields: {}
      };

      // Extract GLB URL
      if (shopifyProduct) {
        data.glbUrl = extractGLBFromShopifyProduct(shopifyProduct);
        
        // Process metafields
        if (shopifyProduct.metafields) {
          shopifyProduct.metafields.forEach(field => {
            if (field.namespace === 'custom') {
              data.metafields[field.key] = field.value;
            }
          });
        }
      }

      // Fallback to menu structure GLB
      if (!data.glbUrl && selectedItem?.model3D?.glbPath) {
        data.glbUrl = selectedItem.model3D.glbPath;
      }

      // Default GLB path
      if (!data.glbUrl) {
        const handle = shopifyProduct?.handle || selectedItem?.id || 'default';
        data.glbUrl = `/assets/models/products/${handle}.glb`;
      }

      setContentData(data);
    };

    processContentData();
  }, [selectedItem, shopifyProduct, clearCentralContent]);

  // (content loading effect moved below after memoized helpers)
  // (content loading effect moved below after memoized helpers)

  // Extract GLB URL from Shopify product
  const extractGLBFromShopifyProduct = (product) => {
    // Check metafields first
    if (product.metafields) {
      const model3DField = product.metafields.find(field => 
        field.namespace === 'custom' && field.key === 'model_3d'
      );
      
      if (model3DField?.reference?.sources) {
        const glbSource = model3DField.reference.sources.find(source => 
          source.format === 'glb' || source.mimeType === 'model/gltf-binary'
        );
        if (glbSource) return glbSource.url;
      }
      
      if (model3DField?.value && model3DField.value.includes('.glb')) {
        return model3DField.value;
      }
    }

    // Check media for GLB files
    if (product.media?.nodes) {
      const glbMedia = product.media.nodes.find(media => 
        media.sources?.some(source => 
          source.format === 'glb' || 
          source.mimeType === 'model/gltf-binary' ||
          source.url.includes('.glb')
        )
      );
      
      if (glbMedia?.sources) {
        const glbSource = glbMedia.sources.find(source => 
          source.format === 'glb' || source.mimeType === 'model/gltf-binary'
        );
        if (glbSource) return glbSource.url;
      }
    }

    return null;
  };

  // Clear central content
  const clearCentralContent = useCallback(() => {
    if (!sceneRef.current) return;

    // Remove current model
  if (currentModelRef.current) {
      sceneRef.current.remove(currentModelRef.current);
      currentModelRef.current = null;
    }

    // Remove text group
    if (textGroupRef.current) {
      sceneRef.current.remove(textGroupRef.current);
      textGroupRef.current = null;
    }
  }, []);

  // Create fallback model when GLB fails
  const createFallbackModel = useCallback(() => {
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const material = new THREE.MeshLambertMaterial({ 
      color: 0x00ff96,
      transparent: true,
      opacity: 0.8
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'fallbackModel';
    
    sceneRef.current.add(mesh);
    currentModelRef.current = mesh;
  }, []);

  // Load central content (3D model + text)
  const load3DModel = useCallback((glbUrl) => {
    return ensureGLTFLoader().then((Loader) =>
      new Promise((resolve) => {
        const loader = new Loader();

        loader.load(
          glbUrl,
          (gltf) => {
            const model = gltf.scene;
            model.name = 'centralModel';

            // Scale and position model
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2.0 / maxDim;
            model.scale.setScalar(scale);

            // Center the model
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center.multiplyScalar(scale));

            // Enable shadows
            model.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Enhance materials for better product display
                if (child.material) {
                  child.material.envMapIntensity = 0.8;
                }
              }
            });

            sceneRef.current.add(model);
            currentModelRef.current = model;

            resolve(model);
          },
          (progress) => {
            const percent = (progress.loaded / progress.total) * 50; // Model is 50% of loading
            setLoadingState((prev) => ({ ...prev, progress: percent }));
          },
          (error) => {
            console.warn('Failed to load GLB model, using fallback:', error);
            createFallbackModel();
            resolve(null);
          }
        );
      })
    );
  }, [createFallbackModel]);

  // (load3DModel implemented above with dynamic import and non-async Promise executor)

  // (createFallbackModel defined above)

  // Load text geometry with depth
  const loadTextGeometry = useCallback((data) => {
    return new Promise((resolve, reject) => {
      const loader = new FontLoader();
      
      loader.load(
        '/helvetiker_regular.typeface.json',
        (font) => {
          const textGroup = new THREE.Group();
          textGroup.name = 'textGroup';

          // Title text
          const titleGeometry = new TextGeometry(data.title, {
            font,
            size: 0.2,
            height: 0.05, // Preserve text depth
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.01,
            bevelSize: 0.01,
            bevelOffset: 0,
            bevelSegments: 5
          });

          titleGeometry.computeBoundingBox();
          const titleWidth = titleGeometry.boundingBox.max.x - titleGeometry.boundingBox.min.x;
          
          const titleMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x00ff96,
            shininess: 100
          });
          const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
          titleMesh.position.set(-titleWidth / 2, -2.5, 0);
          titleMesh.castShadow = true;
          textGroup.add(titleMesh);

          // Price text (if available)
          if (data.price) {
            const priceText = `$${data.price.amount} ${data.price.currencyCode}`;
            const priceGeometry = new TextGeometry(priceText, {
              font,
              size: 0.15,
              height: 0.03,
              curveSegments: 8
            });

            priceGeometry.computeBoundingBox();
            const priceWidth = priceGeometry.boundingBox.max.x - priceGeometry.boundingBox.min.x;
            
            const priceMaterial = new THREE.MeshPhongMaterial({ 
              color: 0x00ddff
            });
            const priceMesh = new THREE.Mesh(priceGeometry, priceMaterial);
            priceMesh.position.set(-priceWidth / 2, -2.9, 0);
            textGroup.add(priceMesh);
          }

          // Status text
          const statusText = data.isAvailable ? 'Available' : 'Out of Stock';
          const statusColor = data.isAvailable ? 0x00ff96 : 0xff6600;
          
          const statusGeometry = new TextGeometry(statusText, {
            font,
            size: 0.12,
            height: 0.02,
            curveSegments: 6
          });

          statusGeometry.computeBoundingBox();
          const statusWidth = statusGeometry.boundingBox.max.x - statusGeometry.boundingBox.min.x;
          
          const statusMaterial = new THREE.MeshPhongMaterial({ 
            color: statusColor
          });
          const statusMesh = new THREE.Mesh(statusGeometry, statusMaterial);
          statusMesh.position.set(-statusWidth / 2, -3.2, 0);
          textGroup.add(statusMesh);

          sceneRef.current.add(textGroup);
          textGroupRef.current = textGroup;

          setLoadingState(prev => ({ ...prev, progress: prev.progress + 50 }));
          resolve(textGroup);
        },
        undefined,
        (error) => {
          console.error('Failed to load font:', error);
          reject(error);
        }
      );
    });
  }, []);

  // Load 3D content when data changes
  useEffect(() => {
    if (!contentData || !sceneRef.current) return;

    const run = async () => {
      clearCentralContent();

      setLoadingState({
        model: true,
        text: true,
        progress: 0,
      });

      try {
        await load3DModel(contentData.glbUrl);
        await loadTextGeometry(contentData);

        setLoadingState({
          model: false,
          text: false,
          progress: 100,
        });

        onContentLoad?.(contentData);
      } catch (error) {
        console.error('Error loading central content:', error);
        setLoadingState({
          model: false,
          text: false,
          progress: 100,
        });
        onError?.(error);
      }
    };

    run();
  }, [contentData, onContentLoad, onError, load3DModel, loadTextGeometry, clearCentralContent]);

  // Animation loop
  const startAnimationLoop = () => {
    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

      // Rotate current model
      if (currentModelRef.current) {
        currentModelRef.current.rotation.y += 0.01;
      }

      // Animate green ring
      if (greenRingRef.current && greenRingRef.current.visible) {
        greenRingRef.current.rotation.z += 0.005;
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      requestAnimationFrame(animate);
    };

    animate();
  };

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

  return (
    <div className="central-content-panel-enhanced">
      <div 
        ref={mountRef} 
        className={`content-mount ${isVisible ? 'visible' : 'hidden'}`}
        style={{
          width: '100%',
          height: '600px',
          position: 'relative',
          borderRadius: '10px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.9) 0%, rgba(0, 50, 100, 0.2) 100%)'
        }}
      />
      
      {/* Loading overlay */}
      {(loadingState.model || loadingState.text) && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">
            Loading {loadingState.model ? '3D Model' : 'Text Content'}...
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${loadingState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Content info panel */}
      {contentData && !loadingState.model && !loadingState.text && (
        <div className="content-info">
          <h3>{contentData.title}</h3>
          {contentData.productType && (
            <p className="product-type">{contentData.productType}</p>
          )}
          {contentData.price && (
            <p className="price">${contentData.price.amount} {contentData.price.currencyCode}</p>
          )}
          <div className="availability">
            Status: {contentData.isAvailable ? 'Available' : 'Out of Stock'}
          </div>
          
          {/* Admin controls */}
          <div className="admin-controls">
            <button 
              onClick={() => {
                // Toggle green ring via global function
                if (window.toggleGreenRing) {
                  window.toggleGreenRing();
                }
              }}
              className="admin-btn"
            >
              Toggle Ring
            </button>
          </div>
        </div>
      )}

      {/* CSS Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .central-content-panel-enhanced {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .content-mount {
          transition: opacity 0.5s ease;
        }

        .content-mount.hidden {
          opacity: 0.3;
          pointer-events: none;
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

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(0, 255, 150, 0.3);
          border-top: 3px solid #00ff96;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-text {
          font-size: 18px;
          margin-bottom: 20px;
          font-family: 'Courier New', monospace;
        }

        .progress-bar {
          width: 200px;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ff96, #00ddff);
          transition: width 0.3s ease;
        }

        .content-info {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.8);
          color: #00ff96;
          padding: 15px;
          border-radius: 8px;
          font-family: 'Courier New', monospace;
          min-width: 200px;
        }

        .content-info h3 {
          margin: 0 0 10px 0;
          font-size: 16px;
          color: #00ff96;
        }

        .content-info p {
          margin: 5px 0;
          font-size: 12px;
        }

        .product-type {
          color: #00ddff;
          font-style: italic;
        }

        .price {
          color: #ffaa00;
          font-weight: bold;
          font-size: 14px;
        }

        .availability {
          margin-top: 10px;
          padding: 5px;
          border-radius: 3px;
          background: rgba(0, 255, 150, 0.1);
          font-size: 11px;
        }

        .admin-controls {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid rgba(0, 255, 150, 0.3);
        }

        .admin-btn {
          background: rgba(0, 255, 150, 0.2);
          border: 1px solid #00ff96;
          color: #00ff96;
          padding: 5px 10px;
          border-radius: 3px;
          cursor: pointer;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          transition: background 0.3s ease;
        }

        .admin-btn:hover {
          background: rgba(0, 255, 150, 0.4);
        }
        `
      }} />
    </div>
  );
};

// Global function for admin console
if (typeof window !== 'undefined') {
  window.toggleGreenRing = () => {
    // This will be connected to the actual component state
    console.log('Green ring toggle requested');
  };
}

export default CentralContentPanelEnhanced;
