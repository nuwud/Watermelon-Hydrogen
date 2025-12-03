/**
 * HexagonSkyball - Hexagon pattern mapped to inside of a sphere
 * Creates an enveloping hexagon background that wraps around the entire scene
 * Based on InteractiveHexagonWall but applied to a spherical surface
 */

const DEFAULT_CONFIG = {
    sphereRadius: 80,           // Large sphere to encompass everything
    hexSize: 2.5,               // Size of each hexagon
    lightIntensity: 30,         // Bright lights
    lightDistance: 200,
    roughness: 0.5,
    metalness: 0.2,
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
let light1, light2, light3, light4, ambientLight;
let animationActive = false;
let isInteractive = true;
let menuIdleTimer = null;

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
    setupMenuActivityListeners();
    
    animationActive = true;
    console.log('[HexagonSkyball] Initialized with', hexMeshes.length, 'hexagons on sphere');
}

function createHexagonSphere() {
    if (!THREE || !skyballGroup) return;
    
    const radius = config.sphereRadius;
    const hexSize = config.hexSize;
    
    // Create base hexagon geometry
    const hexGeo = createHexagonGeometry(6, 0, 0, hexSize, 0);
    
    // Material - white with emissive for visibility
    const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: config.roughness,
        metalness: config.metalness,
        emissive: 0x111122,
        emissiveIntensity: 0.2,
        side: THREE.BackSide,  // Render inside of sphere
    });
    
    // Use fibonacci sphere distribution for even hexagon placement
    const numHexagons = 400;  // Adjust for density
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    
    hexMeshes = [];
    
    for (let i = 0; i < numHexagons; i++) {
        const mesh = new THREE.Mesh(hexGeo, mat.clone());
        
        // Fibonacci sphere point distribution
        const theta = 2 * Math.PI * i / goldenRatio;
        const phi = Math.acos(1 - 2 * (i + 0.5) / numHexagons);
        
        // Position on sphere surface (inside)
        mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
        mesh.position.y = radius * Math.sin(phi) * Math.sin(theta);
        mesh.position.z = radius * Math.cos(phi);
        
        // Orient hexagon to face inward (toward center)
        mesh.lookAt(0, 0, 0);
        
        // Store original position for animation
        mesh.userData.originalPos = mesh.position.clone();
        mesh.userData.index = i;
        
        hexMeshes.push(mesh);
        skyballGroup.add(mesh);
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
        depth: 0.5,
        bevelEnabled: false
    });
    geometry.translate(0, 0, -0.25);
    return geometry;
}

function createLights() {
    if (!THREE || !scene) return;
    
    const intensity = config.lightIntensity;
    const distance = config.lightDistance;
    
    // Ambient light for base visibility
    ambientLight = new THREE.AmbientLight(0x222244, 0.4);
    ambientLight.name = 'skyball_ambient';
    scene.add(ambientLight);
    
    // Colored point lights that orbit inside the sphere
    light1 = new THREE.PointLight(0xff0088, intensity, distance);
    light1.name = 'skyball_light1';
    scene.add(light1);
    
    light2 = new THREE.PointLight(0x00ff88, intensity, distance);
    light2.name = 'skyball_light2';
    scene.add(light2);
    
    light3 = new THREE.PointLight(0x4488ff, intensity, distance);
    light3.name = 'skyball_light3';
    scene.add(light3);
    
    light4 = new THREE.PointLight(0xff6600, intensity, distance);
    light4.name = 'skyball_light4';
    scene.add(light4);
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
    const orbitRadius = config.sphereRadius * 0.4;  // Lights orbit inside sphere
    
    // Animate lights in 3D orbits
    if (light1) {
        light1.position.x = Math.sin(time * 0.3) * orbitRadius;
        light1.position.y = Math.cos(time * 0.4) * orbitRadius * 0.8;
        light1.position.z = Math.sin(time * 0.25) * orbitRadius;
    }
    if (light2) {
        light2.position.x = Math.cos(time * 0.35) * orbitRadius;
        light2.position.y = Math.sin(time * 0.45) * orbitRadius * 0.8;
        light2.position.z = Math.cos(time * 0.3) * orbitRadius;
    }
    if (light3) {
        light3.position.x = Math.sin(time * 0.4 + Math.PI) * orbitRadius;
        light3.position.y = Math.cos(time * 0.5 + Math.PI) * orbitRadius * 0.8;
        light3.position.z = Math.sin(time * 0.35 + Math.PI) * orbitRadius;
    }
    if (light4) {
        light4.position.x = Math.cos(time * 0.45 + Math.PI) * orbitRadius;
        light4.position.y = Math.sin(time * 0.55 + Math.PI) * orbitRadius * 0.8;
        light4.position.z = Math.cos(time * 0.4 + Math.PI) * orbitRadius;
    }
    
    // Subtle pulse effect on hexagons when interactive
    if (isInteractive) {
        const pulsePhase = time * 0.5;
        for (let i = 0; i < hexMeshes.length; i++) {
            const mesh = hexMeshes[i];
            const phase = pulsePhase + i * 0.02;
            const pulse = 0.02 * Math.sin(phase);
            mesh.material.emissiveIntensity = 0.2 + pulse * 2;
        }
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
        [light1, light2, light3, light4, ambientLight].forEach(l => { if (l) scene.remove(l); });
    }
    
    hexMeshes = [];
    skyballGroup = null;
    light1 = light2 = light3 = light4 = ambientLight = null;
    scene = camera = THREE = gsap = null;
}

export default { init, update, dispose, setInteractive };
