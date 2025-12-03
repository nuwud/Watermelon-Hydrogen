/**
 * CerebroSkyball - Geodesic dome/sphere background (X-Men Cerebro style)
 * Uses true 3D icosahedral tessellation - NO gaps, perfect sphere coverage
 * Triangular panels create the classic sci-fi mental interface aesthetic
 * Includes mouse reactivity when not engaged with menu
 */

const DEFAULT_CONFIG = {
    sphereRadius: 55,           // Sphere size
    subdivisions: 3,            // Icosahedron subdivisions (2-4, higher = more panels)
    panelGap: 0.015,            // Gap between panels (0.01-0.03 for subtle lines)
    lightIntensity: 50,
    lightDistance: 180,
    ambientIntensity: 0.4,
    roughness: 0.3,
    metalness: 0.6,             // More metallic for Cerebro look
    emissiveBase: 0.25,
    lookAtStrength: 12,         // Mouse reactivity strength
    pauseWhenMenuActive: true,
    idleTimeout: 2000,
    panelColors: [0x334466, 0x2a3d5c, 0x3d4f6a, 0x445577], // Subtle blue-gray variations
};

let THREE = null;
let gsap = null;
let scene = null;
let camera = null;
let config = { ...DEFAULT_CONFIG };

let skyballGroup = null;
let panelMeshes = [];
let light1, light2, light3, light4, ambientLight, hemisphereLight;
let animationActive = false;
let isInteractive = true;
let menuIdleTimer = null;

// Mouse tracking for reactivity
let mouseOver = true;
const mouse = { x: 0, y: 0 };
let mouseTarget = { x: 0, y: 0 };

export async function init(sceneRef, cameraRef, rendererRef, options) {
    if (typeof window === 'undefined') return;
    
    THREE = await import('three');
    try {
        const gsapModule = await import('gsap');
        gsap = gsapModule.gsap || gsapModule.default || gsapModule;
    } catch (e) {
        gsap = null;
    }
    
    scene = sceneRef;
    camera = cameraRef;
    config = { ...DEFAULT_CONFIG, ...options };
    
    skyballGroup = new THREE.Group();
    skyballGroup.name = 'CerebroSkyball_group';
    scene.add(skyballGroup);
    
    createGeodesicSphere();
    createLights();
    setupMouseListeners();
    setupMenuActivityListeners();
    
    animationActive = true;
    console.log('[CerebroSkyball] Initialized with', panelMeshes.length, 'geodesic panels');
}

function createGeodesicSphere() {
    if (!THREE || !skyballGroup) return;
    
    const radius = config.sphereRadius;
    const detail = config.subdivisions;
    
    // Create icosahedron geometry - this gives us a perfect geodesic sphere
    // Each face is a triangle, no gaps possible
    const icoGeo = new THREE.IcosahedronGeometry(radius, detail);
    
    // Extract individual triangular faces
    const positions = icoGeo.attributes.position.array;
    const faceCount = positions.length / 9; // 3 vertices * 3 coords per face
    
    panelMeshes = [];
    
    for (let f = 0; f < faceCount; f++) {
        const i = f * 9;
        
        // Get the three vertices of this triangle
        const v1 = new THREE.Vector3(positions[i], positions[i+1], positions[i+2]);
        const v2 = new THREE.Vector3(positions[i+3], positions[i+4], positions[i+5]);
        const v3 = new THREE.Vector3(positions[i+6], positions[i+7], positions[i+8]);
        
        // Calculate center of triangle
        const center = new THREE.Vector3().addVectors(v1, v2).add(v3).divideScalar(3);
        
        // Create slightly smaller triangle for the gap effect
        const shrinkFactor = 1 - config.panelGap;
        const sv1 = v1.clone().sub(center).multiplyScalar(shrinkFactor).add(center);
        const sv2 = v2.clone().sub(center).multiplyScalar(shrinkFactor).add(center);
        const sv3 = v3.clone().sub(center).multiplyScalar(shrinkFactor).add(center);
        
        // Create triangle geometry
        const triGeo = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            sv1.x, sv1.y, sv1.z,
            sv2.x, sv2.y, sv2.z,
            sv3.x, sv3.y, sv3.z
        ]);
        triGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        triGeo.computeVertexNormals();
        
        // Flip normals to face inward
        const normals = triGeo.attributes.normal.array;
        for (let n = 0; n < normals.length; n++) {
            normals[n] *= -1;
        }
        triGeo.attributes.normal.needsUpdate = true;
        
        // Subtle color variation for depth
        const colorIndex = f % config.panelColors.length;
        const baseColor = config.panelColors[colorIndex];
        
        const mat = new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: config.roughness,
            metalness: config.metalness,
            emissive: 0x112233,
            emissiveIntensity: config.emissiveBase,
            side: THREE.DoubleSide,
        });
        
        const mesh = new THREE.Mesh(triGeo, mat);
        
        // Store data for animations
        mesh.userData.originalPos = center.clone();
        mesh.userData.center = center.clone();
        mesh.userData.index = f;
        mesh.userData.baseEmissive = config.emissiveBase;
        mesh.userData.introComplete = false;
        
        panelMeshes.push(mesh);
        skyballGroup.add(mesh);
    }
    
    // Clean up the source geometry
    icoGeo.dispose();
}

function createLights() {
    if (!THREE || !scene) return;
    
    const intensity = config.lightIntensity;
    const distance = config.lightDistance;
    
    // Ambient for base visibility
    ambientLight = new THREE.AmbientLight(0x223344, config.ambientIntensity);
    ambientLight.name = 'skyball_ambient';
    scene.add(ambientLight);
    
    // Hemisphere light for natural gradient (Cerebro blue-purple feel)
    hemisphereLight = new THREE.HemisphereLight(0x4466aa, 0x221133, 0.5);
    hemisphereLight.name = 'skyball_hemisphere';
    scene.add(hemisphereLight);
    
    // 4 colored point lights that orbit inside - cooler Cerebro palette
    light1 = new THREE.PointLight(0x6688ff, intensity, distance); // Blue
    light1.name = 'skyball_light1';
    scene.add(light1);
    
    light2 = new THREE.PointLight(0x88aaff, intensity, distance); // Light blue
    light2.name = 'skyball_light2';
    scene.add(light2);
    
    light3 = new THREE.PointLight(0x4466cc, intensity, distance); // Deep blue
    light3.name = 'skyball_light3';
    scene.add(light3);
    
    light4 = new THREE.PointLight(0x9988ff, intensity, distance); // Purple-blue
    light4.name = 'skyball_light4';
    scene.add(light4);
}

function setupMouseListeners() {
    if (typeof window === 'undefined') return;
    
    function onMouseMove(e) {
        // Normalize mouse to -1 to 1
        mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouseTarget.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }
    
    function onMouseEnter() { mouseOver = true; }
    function onMouseLeave() { mouseOver = false; }
    
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.body.addEventListener('mouseenter', onMouseEnter, { passive: true });
    document.body.addEventListener('mouseleave', onMouseLeave, { passive: true });
    
    window._wmSkyballCleanup = window._wmSkyballCleanup || [];
    window._wmSkyballCleanup.push(() => {
        window.removeEventListener('mousemove', onMouseMove);
        document.body.removeEventListener('mouseenter', onMouseEnter);
        document.body.removeEventListener('mouseleave', onMouseLeave);
    });
}

function setupMenuActivityListeners() {
    if (typeof window === 'undefined') return;
    
    function onMenuActivity() {
        isInteractive = false;
        if (menuIdleTimer) clearTimeout(menuIdleTimer);
        menuIdleTimer = setTimeout(() => { isInteractive = true; }, config.idleTimeout);
    }
    
    const events = ['carousel-item-hover', 'carousel-item-click', 'carousel-submenu-open', 'carousel-submenu-close', 'carousel-rotation-start'];
    events.forEach(ev => window.addEventListener(ev, onMenuActivity, { passive: true }));
    
    window._wmSkyballCleanup = window._wmSkyballCleanup || [];
    events.forEach(ev => window._wmSkyballCleanup.push(() => window.removeEventListener(ev, onMenuActivity)));
}

export function update() {
    if (!animationActive || !THREE) return;
    
    const time = Date.now() * 0.001;
    const orbitRadius = config.sphereRadius * 0.4;
    
    // Smooth mouse tracking
    mouse.x += (mouseTarget.x - mouse.x) * 0.05;
    mouse.y += (mouseTarget.y - mouse.y) * 0.05;
    
    // Animate lights in 3D orbits - slower, more elegant
    if (light1) {
        light1.position.x = Math.sin(time * 0.15) * orbitRadius;
        light1.position.y = Math.cos(time * 0.2) * orbitRadius * 0.6;
        light1.position.z = Math.sin(time * 0.12) * orbitRadius;
    }
    if (light2) {
        light2.position.x = Math.cos(time * 0.18) * orbitRadius;
        light2.position.y = Math.sin(time * 0.25) * orbitRadius * 0.6;
        light2.position.z = Math.cos(time * 0.15) * orbitRadius;
    }
    if (light3) {
        light3.position.x = Math.sin(time * 0.2 + Math.PI) * orbitRadius;
        light3.position.y = Math.cos(time * 0.28 + Math.PI) * orbitRadius * 0.6;
        light3.position.z = Math.sin(time * 0.18 + Math.PI) * orbitRadius;
    }
    if (light4) {
        light4.position.x = Math.cos(time * 0.22 + Math.PI) * orbitRadius;
        light4.position.y = Math.sin(time * 0.3 + Math.PI) * orbitRadius * 0.6;
        light4.position.z = Math.cos(time * 0.2 + Math.PI) * orbitRadius;
    }
    
    // Mouse-reactive panel highlighting when interactive
    if (isInteractive && mouseOver && panelMeshes.length > 0) {
        // Create a ray from camera through mouse position
        const mouseVec = new THREE.Vector3(mouse.x * config.lookAtStrength, mouse.y * config.lookAtStrength, 0);
        
        // Panels near the mouse direction get brighter
        for (let i = 0; i < panelMeshes.length; i++) {
            const mesh = panelMeshes[i];
            const center = mesh.userData.center;
            
            // Calculate how aligned this panel is with mouse direction
            const panelDir = center.clone().normalize();
            const mouseDir = new THREE.Vector3(mouse.x, mouse.y, -0.5).normalize();
            const dot = panelDir.dot(mouseDir);
            
            // Panels more aligned with mouse get extra glow
            const mouseInfluence = Math.max(0, dot) * 0.4;
            mesh.material.emissiveIntensity = mesh.userData.baseEmissive + mouseInfluence;
        }
    }
    
    // Gentle wave/pulse effect across panels
    const pulsePhase = time * 0.4;
    for (let i = 0; i < panelMeshes.length; i++) {
        const mesh = panelMeshes[i];
        const center = mesh.userData.center;
        
        // Wave based on panel position
        const waveOffset = (center.x + center.y + center.z) * 0.02;
        const pulse = Math.sin(pulsePhase + waveOffset) * 0.08;
        
        // Add pulse to existing emissive (don't override mouse effect)
        if (!isInteractive || !mouseOver) {
            mesh.material.emissiveIntensity = mesh.userData.baseEmissive + pulse;
        } else {
            mesh.material.emissiveIntensity += pulse * 0.5;
        }
    }
}

export function setInteractive(interactive) { isInteractive = interactive; }

export function dispose() {
    console.log('[CerebroSkyball] Disposing');
    animationActive = false;
    
    if (menuIdleTimer) { clearTimeout(menuIdleTimer); menuIdleTimer = null; }
    
    if (typeof window !== 'undefined' && window._wmSkyballCleanup) {
        window._wmSkyballCleanup.forEach(fn => { try { fn(); } catch (e) {} });
        delete window._wmSkyballCleanup;
    }
    
    if (skyballGroup && scene) {
        scene.remove(skyballGroup);
        panelMeshes.forEach(m => { 
            if (m.geometry) m.geometry.dispose(); 
            if (m.material) m.material.dispose(); 
        });
    }
    
    if (scene) {
        [light1, light2, light3, light4, ambientLight, hemisphereLight].forEach(l => { if (l) scene.remove(l); });
    }
    
    panelMeshes = [];
    skyballGroup = null;
    light1 = light2 = light3 = light4 = ambientLight = hemisphereLight = null;
    scene = camera = THREE = gsap = null;
}

export default { init, update, dispose, setInteractive };
