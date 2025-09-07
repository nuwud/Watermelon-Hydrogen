/**
 * Enhanced Central Content Panel for Nuwud Multimedia
 * Integrates Shopify products with 3D display system
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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

  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  // Shopify product data integration
  const [productData, setProductData] = useState(null);
  const [glbUrl, setGlbUrl] = useState(null);

  // Listen for global green ring toggle events
  useEffect(() => {
    const handleGreenRingToggle = (event) => {
      console.log('🔄 Green ring toggle event received:', event.detail);
      // This would normally update the parent component's state
      // For testing, we'll just log it
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('toggleGreenRing', handleGreenRingToggle);
      return () => window.removeEventListener('toggleGreenRing', handleGreenRingToggle);
    }
  }, []);

  // Use shopifyProduct prop or fetch if not provided
  useEffect(() => {
    const handleProductData = async () => {
      // If shopifyProduct is passed as prop, use it directly
      if (shopifyProduct) {
        setProductData(shopifyProduct);
        setGlbUrl(shopifyProduct.glbUrl);
        return;
      }

      // Otherwise, fetch product data if we have a handle
      if (!selectedItem?.shopifyHandle) {
        setProductData(null);
        setGlbUrl(null);
        return;
      }

      try {
        setLoadingState(prev => ({ ...prev, model: true }));
        const response = await fetch(`/api/products-3d?handle=${selectedItem.shopifyHandle}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch product: ${response.statusText}`);
        }

        const data = await response.json();
        setProductData(data);
        
        // Extract GLB URL from product data
        if (data.glbUrl) {
          setGlbUrl(data.glbUrl);
        } else if (data.images && data.images.length > 0) {
          // Check if any image is a GLB file
          const glbImage = data.images.find(img => img.url && img.url.toLowerCase().includes('.glb'));
          if (glbImage) {
            setGlbUrl(glbImage.url);
          }
        }

      } catch (err) {
        console.error('Error fetching Shopify product:', err);
        setError(err.message);
        if (onError) onError(err);
      } finally {
        setLoadingState(prev => ({ ...prev, model: false }));
      }
    };

    handleProductData();
  }, [selectedItem, shopifyProduct, onError]);

  // Initialize Three.js scene
  const initScene = useCallback(() => {
    if (!mountRef.current) return;

    // Clean up existing scene
    if (rendererRef.current) {
      mountRef.current.removeChild(rendererRef.current.domElement);
      rendererRef.current.dispose();
    }

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true 
    });
    renderer.setSize(600, 600);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x00ff96, 0.3);
    fillLight.position.set(-5, 0, 2);
    scene.add(fillLight);

    setDebugInfo(`Scene initialized: ${scene.children.length} objects`);
  }, []);

  // Green ring creation and management
  useEffect(() => {
    if (!sceneRef.current) return;

    // Remove existing green ring
    if (greenRingRef.current) {
      sceneRef.current.remove(greenRingRef.current);
      greenRingRef.current = null;
    }

    // Create green ring if enabled
    if (showGreenRing) {
      const ringGeometry = new THREE.RingGeometry(2.8, 3.2, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff96, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.set(0, 0, 0);
      sceneRef.current.add(ring);
      greenRingRef.current = ring;
    }
  }, [showGreenRing]);

  // Load and display 3D model
  const loadModel = useCallback(async (url) => {
    if (!sceneRef.current || !url) return;

    try {
      setLoadingState(prev => ({ ...prev, model: true, progress: 0 }));

      // Remove existing model
      if (currentModelRef.current) {
        sceneRef.current.remove(currentModelRef.current);
        currentModelRef.current = null;
      }

      const loader = new GLTFLoader();
      
      const gltf = await new Promise((resolve, reject) => {
        loader.load(
          url,
          resolve,
          (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            setLoadingState(prev => ({ ...prev, progress: percent }));
          },
          reject
        );
      });

      const model = gltf.scene;
      
      // Scale and position model appropriately
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      
      model.scale.setScalar(scale);
      model.position.set(0, 0, 0);

      // Enable shadows
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      sceneRef.current.add(model);
      currentModelRef.current = model;

      setDebugInfo(`Model loaded: ${url}`);
      if (onContentLoad) onContentLoad({ type: 'model', url });

    } catch (err) {
      console.error('Error loading 3D model:', err);
      setError(`Failed to load 3D model: ${err.message}`);
      if (onError) onError(err);
    } finally {
      setLoadingState(prev => ({ ...prev, model: false }));
    }
  }, [onContentLoad, onError]);

  // Load and display text geometry
  const loadText = useCallback(async (text) => {
    if (!sceneRef.current || !text) return;

    try {
      setLoadingState(prev => ({ ...prev, text: true }));

      // Remove existing text
      if (textGroupRef.current) {
        sceneRef.current.remove(textGroupRef.current);
        textGroupRef.current = null;
      }

      const fontLoader = new FontLoader();
      
      const font = await new Promise((resolve, reject) => {
        fontLoader.load('/helvetiker_regular.typeface.json', resolve, undefined, reject);
      });

      const textGeometry = new TextGeometry(text, {
        font,
        size: 0.3,
        height: 0.1,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelOffset: 0,
        bevelSegments: 5
      });

      textGeometry.computeBoundingBox();
      const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;

      const textMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff96 });
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      
      textMesh.position.set(-textWidth/2, -3, 0);
      textMesh.castShadow = true;

      const textGroup = new THREE.Group();
      textGroup.add(textMesh);
      
      sceneRef.current.add(textGroup);
      textGroupRef.current = textGroup;

      setDebugInfo(prev => `${prev} | Text: ${text}`);
      if (onContentLoad) onContentLoad({ type: 'text', content: text });

    } catch (err) {
      console.error('Error loading text:', err);
      setError(`Failed to load text: ${err.message}`);
      if (onError) onError(err);
    } finally {
      setLoadingState(prev => ({ ...prev, text: false }));
    }
  }, [onContentLoad, onError]);

  // Animation loop
  useEffect(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    let animationId;
    
    const animate = () => {
      // Rotate current model
      if (currentModelRef.current) {
        currentModelRef.current.rotation.y += 0.005;
      }

      // Animate green ring
      if (greenRingRef.current) {
        greenRingRef.current.rotation.z += 0.01;
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  // Load content when selectedItem or glbUrl changes
  useEffect(() => {
    if (!selectedItem) return;

    // Load 3D model if GLB URL is available
    if (glbUrl) {
      loadModel(glbUrl);
    }

    // Load text
    const displayText = selectedItem.label || selectedItem.name || 'Item';
    loadText(displayText);
  }, [selectedItem, glbUrl, loadModel, loadText]);

  // Initialize scene on mount
  useEffect(() => {
    initScene();
    
    const handleResize = () => {
      if (rendererRef.current && cameraRef.current && mountRef.current) {
        const container = mountRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        rendererRef.current.setSize(width, height);
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initScene]);

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
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: '#00ff96',
          fontFamily: 'monospace'
        }}>
          <div>Loading...</div>
          {loadingState.progress > 0 && (
            <div style={{ marginTop: '10px' }}>
              {Math.round(loadingState.progress)}%
            </div>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(255, 0, 0, 0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          maxWidth: '300px'
        }}>
          Error: {error}
        </div>
      )}

      {/* Debug info */}
      {debugInfo && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0, 255, 150, 0.1)',
          color: '#00ff96',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'monospace',
          border: '1px solid rgba(0, 255, 150, 0.3)',
          maxWidth: '400px'
        }}>
          {debugInfo}
        </div>
      )}

      {/* Product info */}
      {productData && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0, 255, 150, 0.1)',
          color: '#00ff96',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          fontFamily: 'monospace',
          border: '1px solid rgba(0, 255, 150, 0.3)',
          maxWidth: '250px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            {productData.title}
          </div>
          <div style={{ fontSize: '10px', opacity: 0.8 }}>
            Handle: {productData.handle}
          </div>
          {glbUrl && (
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '5px' }}>
              GLB: Available
            </div>
          )}
        </div>
      )}

      {/* Admin Controls */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0, 255, 150, 0.05)',
        border: '1px solid rgba(0, 255, 150, 0.2)',
        borderRadius: '5px',
        padding: '10px',
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#00ff96'
      }}>
        <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>
          Admin Panel
        </div>
        <div style={{
          fontSize: '10px',
          color: '#888',
          marginBottom: '10px'
        }}>
          Green Ring: {showGreenRing ? 'ON' : 'OFF'}
        </div>
        <div style={{
          fontSize: '10px',
          color: '#666',
          padding: '5px',
          borderRadius: '3px',
          background: 'rgba(0, 255, 150, 0.1)'
        }}>
          Console: toggleGreenRing()
        </div>
      </div>
    </div>
  );
};

export default CentralContentPanelEnhanced;