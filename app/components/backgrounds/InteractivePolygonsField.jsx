/**
 * InteractivePolygonsField.jsx
 * Interactive 3D polygon grid background with mouse-driven lookAt behavior
 * Based on original Three.js hexagon wall with animated lights
 * 
 * Supports two render styles:
 * - 'threejs': Full 3D with extruded hexagons, lookAt, and animated lights (default)
 * - 'canvas2d': Lightweight 2D canvas fallback
 */

import {useEffect, useRef, useCallback, useState} from 'react';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Object/polygon settings
  objectRadius: 2.5,
  objectDepth: 1,
  polygonSides: 6,
  
  // Grid calculation (based on screen size)
  gridDivisorX: 20,
  gridDivisorY: 15,
  
  // Camera
  cameraZ: 75,
  cameraFov: 50,
  
  // LookAt behavior
  lookAtZ: 40,
  
  // Lights
  lightRadius: 100,
  lightIntensity: 0.2,
  lightDistance: 300,
  
  // Animation
  introAnimationDuration: 1,
  introAnimationVariance: 2,
  introRotationExtra: 1.5,
  
  // Material
  materialColor: 0xffffff,
  materialRoughness: 0.4,
  materialMetalness: 0.9,
  
  // Background
  backgroundColor: 0x000000,
};

// Canvas 2D fallback config
const CANVAS_CONFIG = {
  cellSize: 50,
  baseColor: 0x1a1a2e,
  accentColor: 0xff6b6b,
  hoverColor: 0x4ecdc4,
  waveSpeed: 0.002,
  mouseInfluence: 120,
  rotationSpeed: 0.001,
  lineWidth: 1.5,
  opacity: 0.6,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function rnd(max, negative = false) {
  return negative ? Math.random() * 2 * max - max : Math.random() * max;
}

function randomColor() {
  return Math.random() * 0xffffff;
}

// ============================================================================
// THREE.JS RENDERER (3D with lookAt)
// ============================================================================

function ThreeJSPolygons({containerRef, isReducedMotion}) {
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const meshesRef = useRef([]);
  const lightsRef = useRef({});
  const animationIdRef = useRef(null);
  const mouseRef = useRef({over: false, x: 0, y: 0});
  const mousePlaneRef = useRef(null);
  const mousePositionRef = useRef(null);
  const raycasterRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Capture container reference at effect start for cleanup
    const container = containerRef.current;
    
    let THREE, OrbitControls, gsap;
    let disposed = false;

    const init = async () => {
      // Dynamic imports for SSR safety
      const threeModule = await import('three');
      THREE = threeModule;
      
      const controlsModule = await import('three/examples/jsm/controls/OrbitControls.js');
      OrbitControls = controlsModule.OrbitControls;
      
      const gsapModule = await import('gsap');
      gsap = gsapModule.default || gsapModule.gsap;

      if (disposed) return;

      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      // Create renderer
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Create camera
      const camera = new THREE.PerspectiveCamera(
        CONFIG.cameraFov, 
        width / height, 
        0.1, 
        1000
      );
      camera.position.z = CONFIG.cameraZ;
      cameraRef.current = camera;

      // Create controls (disabled rotation for background)
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableRotate = false;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableKeys = false;
      controlsRef.current = controls;

      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(CONFIG.backgroundColor);
      sceneRef.current = scene;

      // Initialize raycaster and mouse plane for lookAt
      raycasterRef.current = new THREE.Raycaster();
      mousePositionRef.current = new THREE.Vector3();
      mousePlaneRef.current = new THREE.Plane(
        new THREE.Vector3(0, 0, 1), 
        0
      ).translate(new THREE.Vector3(0, 0, -CONFIG.lookAtZ));

      // Add lights
      initLights(THREE, scene);

      // Create mesh grid
      initMeshGrid(THREE, gsap, scene, width, height);

      // Event listeners
      const onResize = () => {
        if (disposed) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      const onMouseMove = (e) => {
        if (disposed) return;
        const rect = container.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        mouseRef.current.over = true;
        mouseRef.current.x = ((e.clientX - rect.left) / w) * 2 - 1;
        mouseRef.current.y = -((e.clientY - rect.top) / h) * 2 + 1;

        // Update mouse plane normal to face camera
        const v = new THREE.Vector3();
        camera.getWorldDirection(v);
        v.normalize();
        mousePlaneRef.current.normal.copy(v);

        // Raycast to mouse plane
        raycasterRef.current.setFromCamera(
          new THREE.Vector2(mouseRef.current.x, mouseRef.current.y), 
          camera
        );
        raycasterRef.current.ray.intersectPlane(
          mousePlaneRef.current, 
          mousePositionRef.current
        );
      };

      const onMouseOut = () => {
        mouseRef.current.over = false;
      };

      const onClick = () => {
        // Reinitialize scene on click (like original)
        if (disposed) return;
        disposeMeshes();
        initMeshGrid(THREE, gsap, scene, 
          container.clientWidth || window.innerWidth,
          container.clientHeight || window.innerHeight
        );
      };

      window.addEventListener('resize', onResize);
      container.addEventListener('mousemove', onMouseMove);
      container.addEventListener('mouseout', onMouseOut);
      container.addEventListener('click', onClick);

      // Animation loop
      const animate = () => {
        if (disposed) return;
        animationIdRef.current = requestAnimationFrame(animate);

        controls.update();

        const time = Date.now() * 0.001;
        const d = CONFIG.lightRadius;

        // Animate lights
        const lights = lightsRef.current;
        if (lights.light1) {
          lights.light1.position.x = Math.sin(time * 0.1) * d;
          lights.light1.position.y = Math.cos(time * 0.2) * d;
        }
        if (lights.light2) {
          lights.light2.position.x = Math.cos(time * 0.3) * d;
          lights.light2.position.y = Math.sin(time * 0.4) * d;
        }
        if (lights.light3) {
          lights.light3.position.x = Math.sin(time * 0.5) * d;
          lights.light3.position.y = Math.sin(time * 0.6) * d;
        }
        if (lights.light4) {
          lights.light4.position.x = Math.sin(time * 0.7) * d;
          lights.light4.position.y = Math.cos(time * 0.8) * d;
        }

        // Update mesh lookAt
        const lookAt = mouseRef.current.over && mousePositionRef.current
          ? new THREE.Vector3(
              mousePositionRef.current.x,
              mousePositionRef.current.y,
              CONFIG.lookAtZ
            )
          : new THREE.Vector3(0, 0, 10000);

        meshesRef.current.forEach((mesh) => {
          // Only lookAt if intro animation is complete
          if (mesh.userData.tween1 && mesh.userData.tween2) {
            const t1Active = mesh.userData.tween1.isActive?.() ?? false;
            const t2Active = mesh.userData.tween2.isActive?.() ?? false;
            if (!t1Active && !t2Active && !isReducedMotion) {
              mesh.lookAt(lookAt);
            }
          }
        });

        renderer.render(scene, camera);
      };

      animate();

      // Cleanup function
      return () => {
        window.removeEventListener('resize', onResize);
        container.removeEventListener('mousemove', onMouseMove);
        container.removeEventListener('mouseout', onMouseOut);
        container.removeEventListener('click', onClick);
      };
    };

    const initLights = (THREE, scene) => {
      const r = CONFIG.lightRadius;
      const intensity = CONFIG.lightIntensity;
      const distance = CONFIG.lightDistance;

      scene.add(new THREE.AmbientLight(0xffffff));

      const light1 = new THREE.PointLight(randomColor(), intensity, distance);
      light1.position.set(0, r, r);
      scene.add(light1);

      const light2 = new THREE.PointLight(randomColor(), intensity, distance);
      light2.position.set(0, -r, r);
      scene.add(light2);

      const light3 = new THREE.PointLight(randomColor(), intensity, distance);
      light3.position.set(r, 0, r);
      scene.add(light3);

      const light4 = new THREE.PointLight(randomColor(), intensity, distance);
      light4.position.set(-r, 0, r);
      scene.add(light4);

      lightsRef.current = { light1, light2, light3, light4 };
    };

    const createPolygonGeometry = (THREE, n, x, y, s, rotation) => {
      // Create polygon points
      const dt = (2 * Math.PI) / n;
      const points = [];
      for (let i = 0; i < n; i++) {
        const t = Math.PI / 2 + rotation + i * dt;
        const px = x + Math.cos(t) * s;
        const py = y + Math.sin(t) * s;
        points.push([px, py]);
      }

      // Create shape from points
      const shape = new THREE.Shape();
      points.forEach((p, i) => {
        if (i === 0) shape.moveTo(p[0], p[1]);
        else shape.lineTo(p[0], p[1]);
      });
      shape.lineTo(points[0][0], points[0][1]);

      // Extrude geometry
      const extrudeSettings = {
        steps: 1,
        depth: CONFIG.objectDepth,
        bevelEnabled: false,
      };
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.translate(0, 0, -CONFIG.objectDepth / 2);
      return geometry;
    };

    const initMeshGrid = (THREE, gsap, scene, width, height) => {
      const nx = Math.round(width / CONFIG.gridDivisorX);
      const ny = Math.round(height / CONFIG.gridDivisorY);

      const material = new THREE.MeshStandardMaterial({
        color: CONFIG.materialColor,
        roughness: CONFIG.materialRoughness,
        metalness: CONFIG.materialMetalness,
      });

      const geometry = createPolygonGeometry(
        THREE, 
        CONFIG.polygonSides, 
        0, 0, 
        CONFIG.objectRadius, 
        0
      );

      const dx = Math.cos(Math.PI / 6) * CONFIG.objectRadius * 2;
      const dy = CONFIG.objectRadius * 1.5;

      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const mesh = new THREE.Mesh(geometry, material);
          
          // Position in hex grid pattern
          mesh.position.x = (-nx / 2 + i) * dx + ((j % 2) / 2) * dx;
          mesh.position.y = (-ny / 2 + j) * dy;
          mesh.position.z = -200 - rnd(50);
          
          // Random initial rotation
          mesh.rotation.x = rnd(2 * Math.PI, true);
          mesh.rotation.y = rnd(2 * Math.PI, true);
          mesh.rotation.z = rnd(2 * Math.PI, true);

          // Intro animation (fly in + rotate to flat)
          const duration = CONFIG.introAnimationDuration + rnd(CONFIG.introAnimationVariance);
          
          if (!isReducedMotion) {
            mesh.userData.tween1 = gsap.to(mesh.position, {
              z: 0,
              duration,
              ease: 'power1.out',
            });
            mesh.userData.tween2 = gsap.to(mesh.rotation, {
              x: 0,
              y: 0,
              z: 0,
              duration: duration + CONFIG.introRotationExtra,
              ease: 'power1.out',
            });
          } else {
            // Skip animation if reduced motion
            mesh.position.z = 0;
            mesh.rotation.set(0, 0, 0);
            mesh.userData.tween1 = { isActive: () => false };
            mesh.userData.tween2 = { isActive: () => false };
          }

          meshesRef.current.push(mesh);
          scene.add(mesh);
        }
      }
    };

    const disposeMeshes = () => {
      meshesRef.current.forEach((mesh) => {
        if (mesh.userData.tween1?.kill) mesh.userData.tween1.kill();
        if (mesh.userData.tween2?.kill) mesh.userData.tween2.kill();
        mesh.geometry?.dispose?.();
        if (sceneRef.current) {
          sceneRef.current.remove(mesh);
        }
      });
      meshesRef.current = [];
    };

    // Start initialization
    const cleanupPromise = init();

    // Cleanup on unmount
    return () => {
      disposed = true;
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      disposeMeshes();

      // Dispose lights
      Object.values(lightsRef.current).forEach((light) => {
        if (sceneRef.current) {
          sceneRef.current.remove(light);
        }
      });
      lightsRef.current = {};

      // Dispose renderer
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (container && rendererRef.current.domElement) {
          container.removeChild(rendererRef.current.domElement);
        }
      }

      // Dispose controls
      if (controlsRef.current?.dispose) {
        controlsRef.current.dispose();
      }

      // Call async cleanup if available
      cleanupPromise?.then?.((cleanup) => cleanup?.());
    };
  }, [containerRef, isReducedMotion]);

  return null; // Renders into containerRef
}

// ============================================================================
// CANVAS 2D RENDERER (Lightweight fallback)
// ============================================================================

function Canvas2DPolygons({isReducedMotion}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const mouseRef = useRef({x: -1000, y: -1000});
  const timeRef = useRef(0);

  const createPolygonPath = useCallback((ctx, x, y, radius, sides, rotation = 0) => {
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = (i * 2 * Math.PI / sides) + rotation;
      const px = x + radius * Math.cos(angle);
      const py = y + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }, []);

  const hexToRgba = useCallback((hex, alpha) => {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }, []);

  const lerpColor = useCallback((color1, color2, t) => {
    const r1 = (color1 >> 16) & 255, g1 = (color1 >> 8) & 255, b1 = color1 & 255;
    const r2 = (color2 >> 16) & 255, g2 = (color2 >> 8) & 255, b2 = color2 & 255;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return (r << 16) | (g << 8) | b;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = {x: -1000, y: -1000};
    };

    const animate = () => {
      if (!canvas || !ctx) return;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      if (!isReducedMotion) {
        timeRef.current += CANVAS_CONFIG.waveSpeed;
      }

      const cellWidth = CANVAS_CONFIG.cellSize * 1.5;
      const cellHeight = CANVAS_CONFIG.cellSize * Math.sqrt(3);
      const cols = Math.ceil(width / cellWidth) + 2;
      const rows = Math.ceil(height / cellHeight) + 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const offsetX = row % 2 === 0 ? 0 : cellWidth / 2;
          const x = col * cellWidth + offsetX;
          const y = row * cellHeight * 0.75;

          const dx = x - mouseRef.current.x;
          const dy = y - mouseRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const influence = Math.max(0, 1 - distance / CANVAS_CONFIG.mouseInfluence);

          const wave = isReducedMotion 
            ? 0 
            : Math.sin(x * 0.02 + y * 0.02 + timeRef.current) * 0.5 + 0.5;

          const baseSize = CANVAS_CONFIG.cellSize * 0.4;
          const size = baseSize + influence * baseSize * 0.5 + wave * 3;
          const rotation = isReducedMotion 
            ? 0 
            : timeRef.current * CANVAS_CONFIG.rotationSpeed + influence * 0.5;

          let color = CANVAS_CONFIG.baseColor;
          if (influence > 0) {
            color = lerpColor(CANVAS_CONFIG.accentColor, CANVAS_CONFIG.hoverColor, influence);
          } else if (wave > 0.5) {
            color = lerpColor(CANVAS_CONFIG.baseColor, CANVAS_CONFIG.accentColor, (wave - 0.5) * 0.3);
          }

          const opacity = CANVAS_CONFIG.opacity + influence * 0.3 + wave * 0.1;

          ctx.lineWidth = CANVAS_CONFIG.lineWidth + influence * 2;
          ctx.strokeStyle = hexToRgba(color, opacity);
          ctx.fillStyle = hexToRgba(color, opacity * 0.1);

          createPolygonPath(ctx, x, y, size, 6, rotation);
          ctx.fill();
          ctx.stroke();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isReducedMotion, createPolygonPath, hexToRgba, lerpColor]);

  return (
    <canvas
      ref={canvasRef}
      className="wm-background-stage__polygons wm-background-stage__polygons--canvas2d"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
      }}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const POLYGON_STYLES = ['threejs', 'canvas2d'];
const POLYGON_STYLE_KEY = 'wm_polygon_style';

function getStoredPolygonStyle() {
  if (typeof window === 'undefined') return 'canvas2d';
  try {
    const stored = localStorage.getItem(POLYGON_STYLE_KEY);
    if (stored && POLYGON_STYLES.includes(stored)) return stored;
  } catch {
    // Ignore localStorage errors
  }
  return 'canvas2d';
}

function persistPolygonStyle(style) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(POLYGON_STYLE_KEY, style);
  } catch {
    // Ignore localStorage errors
  }
}

export function InteractivePolygonsField({isReducedMotion = false}) {
  const containerRef = useRef(null);
  const [style, setStyleState] = useState(getStoredPolygonStyle);

  const setStyle = useCallback((newStyle) => {
    if (!POLYGON_STYLES.includes(newStyle)) return;
    setStyleState(newStyle);
    persistPolygonStyle(newStyle);
  }, []);

  const cycleStyle = useCallback(() => {
    const idx = POLYGON_STYLES.indexOf(style);
    const next = POLYGON_STYLES[(idx + 1) % POLYGON_STYLES.length];
    setStyle(next);
    return next;
  }, [style, setStyle]);

  // Expose polygon style API
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__wmPolygonStyle = {
      getStyle: () => style,
      setStyle,
      cycleStyle,
      getStyles: () => POLYGON_STYLES,
    };
    return () => { delete window.__wmPolygonStyle; };
  }, [style, setStyle, cycleStyle]);

  return (
    <div
      ref={containerRef}
      className="wm-background-stage__polygons"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      aria-hidden="true"
      data-polygon-style={style}
    >
      {style === 'threejs' ? (
        <ThreeJSPolygons 
          containerRef={containerRef} 
          isReducedMotion={isReducedMotion} 
        />
      ) : (
        <Canvas2DPolygons isReducedMotion={isReducedMotion} />
      )}
    </div>
  );
}

export default InteractivePolygonsField;
