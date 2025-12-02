import {useEffect, useRef} from 'react';

const OUTER_RADIUS = 1200;
const HEX_RADIUS = 60;
const BASE_OPACITY_NEAR = 0.22;
const BASE_OPACITY_FAR = 0.38;
const VERTICAL_DAMPING = 0.6;
const ANIMATION_SPEED = 0.35;

function createHexPositions(outerRadius, THREE) {
  const positions = [];
  const hexWidth = Math.sqrt(3) * HEX_RADIUS;
  const hexHeight = HEX_RADIUS * 2;
  const stepX = hexWidth;
  const stepZ = (3 / 4) * hexHeight;
  const rings = Math.ceil(outerRadius / stepX) + 2;

  for (let q = -rings; q <= rings; q += 1) {
    for (let r = -rings; r <= rings; r += 1) {
      const x = stepX * (q + r / 2);
      const z = stepZ * r;
      const distance = Math.sqrt(x * x + z * z);
      if (distance > outerRadius) continue;
      const baseColor = new THREE.Color();
      baseColor.setHSL(0.12, 0.75, 0.45 + (distance / OUTER_RADIUS) * 0.15);
      positions.push({
        x,
        z,
        distance,
        offset: Math.random() * Math.PI * 2,
        baseColor,
      });
    }
  }

  return positions;
}

export function HoneycombField({calmRadius, calmIntensity, isReducedMotion}) {
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const calmRadiusRef = useRef(calmRadius);
  const calmIntensityRef = useRef(calmIntensity);
  const reducedRef = useRef(isReducedMotion);

  useEffect(() => {
    calmRadiusRef.current = calmRadius;
  }, [calmRadius]);

  useEffect(() => {
    calmIntensityRef.current = calmIntensity;
  }, [calmIntensity]);

  useEffect(() => {
    reducedRef.current = isReducedMotion;
  }, [isReducedMotion]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!containerRef.current) return undefined;

    let cleanedUp = false;
    let renderer = null;
    let resizeObserver = null;
    let cleanupFn = null;

    const initScene = async () => {
      // Dynamic import to avoid global scope issues in Cloudflare Workers
      const THREE = await import('three');
      
      if (cleanedUp || !containerRef.current) return;

      const container = containerRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 1, 4000);
      camera.position.set(0, 380, 620);
      camera.lookAt(new THREE.Vector3(0, 0, 0));

      renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      const positions = createHexPositions(OUTER_RADIUS, THREE);
      const geometry = new THREE.CircleGeometry(HEX_RADIUS, 6);
      geometry.rotateX(-Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({color: 0xffe066, transparent: true, opacity: BASE_OPACITY_NEAR});
      const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      const colors = new Float32Array(positions.length * 3);
      for (let i = 0; i < positions.length; i += 1) {
        positions[i].baseColor.toArray(colors, i * 3);
      }
      mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor.needsUpdate = true;

      scene.add(mesh);

      const dummy = new THREE.Object3D();
      const workingColor = new THREE.Color();

      const resize = () => {
        if (!container || !renderer) return;
        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      resize();

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
      } else {
        window.addEventListener('resize', resize);
      }

      const animate = (time) => {
        if (cleanedUp) return;
        
        const motionIntensity = reducedRef.current ? 0 : calmIntensityRef.current;
        const motionProgress = time * 0.001 * ANIMATION_SPEED;
        material.opacity = reducedRef.current ? BASE_OPACITY_NEAR : BASE_OPACITY_FAR;
        const calmRadiusCurrent = Math.min(calmRadiusRef.current, OUTER_RADIUS - 1);
        const outerRange = Math.max(1, OUTER_RADIUS - calmRadiusCurrent);

        for (let index = 0; index < positions.length; index += 1) {
          const position = positions[index];
          const {x, z, distance, offset, baseColor: positionColor} = position;
          const calmZone = distance <= calmRadiusCurrent;
          const influence = calmZone
            ? 0
            : Math.min(1, (distance - calmRadiusCurrent) / outerRange);
          const amplitude = motionIntensity * influence * 60;
          const verticalOffset = amplitude * Math.sin(motionProgress + offset);

          dummy.position.set(x, verticalOffset * VERTICAL_DAMPING, z);
          const scale = 1 + motionIntensity * 0.15 * influence;
          dummy.scale.setScalar(scale);
          dummy.rotation.y = (motionProgress + offset) * 0.02;
          dummy.updateMatrix();
          mesh.setMatrixAt(index, dummy.matrix);

          const brightness = calmZone ? 0.78 : 0.9 + influence * 0.35 * motionIntensity;
          workingColor.copy(positionColor).multiplyScalar(brightness);
          workingColor.toArray(colors, index * 3);
        }

        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) {
          mesh.instanceColor.needsUpdate = true;
        }
        renderer.render(scene, camera);
        animationRef.current = window.requestAnimationFrame(animate);
      };

      animationRef.current = window.requestAnimationFrame(animate);

      // Store cleanup function for later use
      cleanupFn = () => {
        cleanedUp = true;
        if (animationRef.current) {
          window.cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        if (resizeObserver) {
          resizeObserver.disconnect();
        } else {
          window.removeEventListener('resize', resize);
        }
        geometry.dispose();
        material.dispose();
        if (renderer) {
          renderer.dispose();
          if (renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
          }
        }
        scene.remove(mesh);
      };
    };

    initScene();

    return () => {
      cleanedUp = true;
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, []);

  return <div ref={containerRef} className="wm-background-stage__honeycomb" />;
}

export default HoneycombField;
