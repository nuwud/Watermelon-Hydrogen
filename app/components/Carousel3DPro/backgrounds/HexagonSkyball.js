/**
 * HexagonSkyball - Hexagon grid mapped to inside of a sphere
 * Creates an enveloping hexagon background that wraps around the entire scene
 * Uses grid-based UV mapping like the flat wall, but wrapped onto a sphere
 * Includes mouse reactivity when not engaged with menu
 */

const DEFAULT_CONFIG = {
    sphereRadius: 60,           // Sphere size
    hexSize: 4.0,               // LARGER hexagons like flat wall
    hexSpacingX: 2.1,           // Tight spacing multiplier (smaller = tighter)
    hexSpacingY: 1.65,          // Tight vertical spacing
    lightIntensity: 60,
    lightDistance: 200,
    ambientIntensity: 0.5,
    roughness: 0.5,
    metalness: 0.2,
    emissiveBase: 0.35,
    lookAtStrength: 15,         // Mouse reactivity strength
    pauseWhenMenuActive: true,
    idleTimeout: 2000,
};

let THREE = null;
let gsap = null;
let scene = null;
let camera = null;
let config = { ...DEFAULT_CONFIG };

let skyballGroup = null;
let hexMeshes = [];
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
    skyballGroup.name = 'HexagonSkyball_group';
    scene.add(skyballGroup);
    
    createHexagonSphere();
    createLights();
    setupMouseListeners();
    setupMenuActivityListeners();
    
    animationActive = true;
    console.log('[HexagonSkyball] Initialized with', hexMeshes.length, 'hexagons on sphere');
}

function createHexagonSphere() {
    if (!THREE || !skyballGroup) return;
    
    const radius = config.sphereRadius;
    const hexSize = config.hexSize;
    
    // Create base hexagon geometry - LARGER like flat wall
    const hexGeo = createHexagonGeometry(6, 0, 0, hexSize, 0);
    
    // Material with good visibility
    const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: config.roughness,
        metalness: config.metalness,
        emissive: 0x223344,
        emissiveIntensity: config.emissiveBase,
        side: THREE.DoubleSide,
    });
    
    // Grid-based placement on sphere using UV-like coordinates
    // Calculate grid dimensions based on sphere surface area
    const circumference = 2 * Math.PI * radius;
    const dx = Math.cos(Math.PI / 6) * hexSize * config.hexSpacingX;
    const dy = hexSize * config.hexSpacingY;
    
    // Number of hexagons around equator and from pole to pole
    const nxEquator = Math.floor(circumference / dx);
    const nyMeridian = Math.floor((Math.PI * radius) / dy);
    
    hexMeshes = [];
    
    for (let j = 0; j < nyMeridian; j++) {
        // Latitude angle (phi) from 0 to PI
        const phi = (j + 0.5) / nyMeridian * Math.PI;
        
        // Adjust number of hexagons per row based on latitude (fewer near poles)
        const rowRadius = radius * Math.sin(phi);
        const rowCircumference = 2 * Math.PI * rowRadius;
        const nxRow = Math.max(3, Math.floor(rowCircumference / dx));
        
        for (let i = 0; i < nxRow; i++) {
            // Longitude angle (theta) from 0 to 2PI
            // Offset every other row for honeycomb pattern
            const offset = (j % 2) * (Math.PI / nxRow);
            const theta = (i / nxRow) * 2 * Math.PI + offset;
            
            const mesh = new THREE.Mesh(hexGeo, mat.clone());
            
            // Spherical to Cartesian conversion
            mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
            mesh.position.y = radius * Math.cos(phi);  // Y is up
            mesh.position.z = radius * Math.sin(phi) * Math.sin(theta);
            
            // Orient hexagon to face inward (toward center)
            mesh.lookAt(0, 0, 0);
            
            // Store data for animations
            mesh.userData.originalPos = mesh.position.clone();
            mesh.userData.originalRot = mesh.rotation.clone();
            mesh.userData.index = hexMeshes.length;
            mesh.userData.introComplete = false;
            
            hexMeshes.push(mesh);
            skyballGroup.add(mesh);
        }
    }
}

function createHexagonGeometry(n, x, y, s, r) {
    if (!THREE) return null;
    
    const points = [];
    const dt = 2 * Math.PI / n;
    
    for (let i = 0; i < n; i++) {
        const t = Math.PI / 2 + r + i * dt;
        points.push([x + Math.cos(t) * s, y + Math.sin(t) * s]);
    }
    
    const shape = new THREE.Shape();
    points.forEach((p, i) => {
        if (i === 0) shape.moveTo(p[0], p[1]);
        else shape.lineTo(p[0], p[1]);
    });
    shape.lineTo(points[0][0], points[0][1]);
    
    const geometry = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: 0.6,
        bevelEnabled: false
    });
    geometry.translate(0, 0, -0.3);
    return geometry;
}

function createLights() {
    if (!THREE || !scene) return;
    
    const intensity = config.lightIntensity;
    const distance = config.lightDistance;
    
    // Ambient for base visibility
    ambientLight = new THREE.AmbientLight(0x334455, config.ambientIntensity);
    ambientLight.name = 'skyball_ambient';
    scene.add(ambientLight);
    
    // Hemisphere light for natural gradient
    hemisphereLight = new THREE.HemisphereLight(0x5577aa, 0x332244, 0.4);
    hemisphereLight.name = 'skyball_hemisphere';
    scene.add(hemisphereLight);
    
    // 4 colored point lights that orbit inside
    light1 = new THREE.PointLight(0xff4488, intensity, distance);
    light1.name = 'skyball_light1';
    scene.add(light1);
    
    light2 = new THREE.PointLight(0x44ff88, intensity, distance);
    light2.name = 'skyball_light2';
    scene.add(light2);
    
    light3 = new THREE.PointLight(0x4488ff, intensity, distance);
    light3.name = 'skyball_light3';
    scene.add(light3);
    
    light4 = new THREE.PointLight(0xff8844, intensity, distance);
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
    const orbitRadius = config.sphereRadius * 0.45;
    
    // Smooth mouse tracking
    mouse.x += (mouseTarget.x - mouse.x) * 0.05;
    mouse.y += (mouseTarget.y - mouse.y) * 0.05;
    
    // Animate lights in 3D orbits
    if (light1) {
        light1.position.x = Math.sin(time * 0.25) * orbitRadius;
        light1.position.y = Math.cos(time * 0.35) * orbitRadius * 0.7;
        light1.position.z = Math.sin(time * 0.2) * orbitRadius;
    }
    if (light2) {
        light2.position.x = Math.cos(time * 0.3) * orbitRadius;
        light2.position.y = Math.sin(time * 0.4) * orbitRadius * 0.7;
        light2.position.z = Math.cos(time * 0.25) * orbitRadius;
    }
    if (light3) {
        light3.position.x = Math.sin(time * 0.35 + Math.PI) * orbitRadius;
        light3.position.y = Math.cos(time * 0.45 + Math.PI) * orbitRadius * 0.7;
        light3.position.z = Math.sin(time * 0.3 + Math.PI) * orbitRadius;
    }
    if (light4) {
        light4.position.x = Math.cos(time * 0.4 + Math.PI) * orbitRadius;
        light4.position.y = Math.sin(time * 0.5 + Math.PI) * orbitRadius * 0.7;
        light4.position.z = Math.cos(time * 0.35 + Math.PI) * orbitRadius;
    }
    
    // Mouse-reactive lookAt behavior when interactive (not engaged with menu)
    if (isInteractive && mouseOver) {
        const lookAtZ = config.lookAtStrength;
        const targetX = mouse.x * lookAtZ;
        const targetY = mouse.y * lookAtZ;
        
        for (let i = 0; i < hexMeshes.length; i++) {
            const mesh = hexMeshes[i];
            // Each hexagon looks toward a point influenced by mouse position
            const lookTarget = new THREE.Vector3(targetX, targetY, 0);
            
            // Calculate direction from hex to center, then offset by mouse
            const toCenter = mesh.position.clone().normalize();
            const offset = lookTarget.clone().multiplyScalar(0.3);
            const finalTarget = offset;
            
            // Smooth lookAt toward mouse-influenced center
            mesh.lookAt(finalTarget);
        }
    }
    
    // Gentle pulse effect
    const pulsePhase = time * 0.6;
    for (let i = 0; i < hexMeshes.length; i++) {
        const mesh = hexMeshes[i];
        const phase = pulsePhase + i * 0.01;
        const pulse = Math.sin(phase) * 0.12;
        mesh.material.emissiveIntensity = config.emissiveBase + pulse;
    }
}

export function setInteractive(interactive) { isInteractive = interactive; }

export function dispose() {
    console.log('[HexagonSkyball] Disposing');
    animationActive = false;
    
    if (menuIdleTimer) { clearTimeout(menuIdleTimer); menuIdleTimer = null; }
    
    if (typeof window !== 'undefined' && window._wmSkyballCleanup) {
        window._wmSkyballCleanup.forEach(fn => { try { fn(); } catch (e) {} });
        delete window._wmSkyballCleanup;
    }
    
    if (skyballGroup && scene) {
        scene.remove(skyballGroup);
        hexMeshes.forEach(m => { 
            if (m.geometry) m.geometry.dispose(); 
            if (m.material) m.material.dispose(); 
        });
    }
    
    if (scene) {
        [light1, light2, light3, light4, ambientLight, hemisphereLight].forEach(l => { if (l) scene.remove(l); });
    }
    
    hexMeshes = [];
    skyballGroup = null;
    light1 = light2 = light3 = light4 = ambientLight = hemisphereLight = null;
    scene = camera = THREE = gsap = null;
}

export default { init, update, dispose, setInteractive };
