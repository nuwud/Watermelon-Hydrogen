/**
 * InteractiveHexagonWall - 3D hexagon grid with lookAt and bright colored lights
 * Based on: https://codepen.io/Patrick-Wood-the-sasster/pen/gbOjxMj
 * Adds hexagons to the MAIN scene behind the carousel
 */

const DEFAULT_CONFIG = {
    objectRadius: 2.5,
    objectDepth: 0.8,
    lookAtZ: 40,
    // MUCH brighter lights for Three.js physically-based rendering
    lightIntensity: 50,         // Very high for PBR
    lightDistance: 150,         // Tighter distance for better falloff
    lightRadius: 60,            // Orbit radius for lights
    roughness: 0.6,             // Higher roughness = more diffuse color visible
    metalness: 0.1,             // Low metalness = shows light color better
    pauseWhenMenuActive: true,
    idleTimeout: 2000,
    zPosition: -40,             // Closer to camera
};

let THREE = null;
let gsap = null;
let scene = null;
let camera = null;
let config = { ...DEFAULT_CONFIG };

let hexGroup = null;
let meshes = [];
let light1, light2, light3, light4, ambientLight;
let animationActive = false;
let isInteractive = true;
let menuIdleTimer = null;

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
    
    // Create a group to hold hexagons
    hexGroup = new THREE.Group();
    hexGroup.name = 'InteractiveHexagonWall_group';
    hexGroup.position.z = config.zPosition;
    scene.add(hexGroup);
    
    createHexagonGrid();
    createLights();
    setupMouseListeners();
    setupMenuActivityListeners();
    
    animationActive = true;
    console.log('[InteractiveHexagonWall] Initialized with', meshes.length, 'hexagons, lights at z =', config.zPosition);
}

function createHexagonGrid() {
    if (!THREE || !hexGroup) return;
    
    const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const height = typeof window !== 'undefined' ? window.innerHeight : 1080;
    
    // Fewer, larger hexagons for better visibility
    const nx = Math.round(width / 40);
    const ny = Math.round(height / 35);
    
    // Use MeshPhongMaterial for better light response without PBR complexity
    // Or MeshStandardMaterial with LOW metalness for diffuse color
    const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: config.roughness,
        metalness: config.metalness,
        emissive: 0x111111,         // Slight self-glow so they're not completely black
        emissiveIntensity: 0.3,
    });
    
    const geo = createHexagonGeometry(6, 0, 0, config.objectRadius, 0);
    const dx = Math.cos(Math.PI / 6) * config.objectRadius * 2.2;
    const dy = config.objectRadius * 1.7;
    
    meshes = [];
    
    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
            const mesh = new THREE.Mesh(geo, mat.clone());
            mesh.name = 'hex_' + i + '_' + j;
            
            const targetX = (-nx / 2 + i) * dx + (j % 2) * (dx / 2);
            const targetY = (-ny / 2 + j) * dy;
            
            mesh.position.x = targetX;
            mesh.position.y = targetY;
            mesh.position.z = -100 - Math.random() * 30;  // Start behind for fly-in
            
            mesh.rotation.x = (Math.random() - 0.5) * Math.PI * 2;
            mesh.rotation.y = (Math.random() - 0.5) * Math.PI * 2;
            mesh.rotation.z = (Math.random() - 0.5) * Math.PI * 2;
            
            mesh.userData.introComplete = false;
            
            const dur = 0.8 + Math.random() * 1.5;
            if (gsap) {
                gsap.to(mesh.position, {
                    z: 0,
                    duration: dur,
                    ease: 'power2.out',
                    onComplete() { mesh.userData.introComplete = true; }
                });
                gsap.to(mesh.rotation, {
                    x: 0, y: 0, z: 0,
                    duration: dur + 0.3,
                    ease: 'power2.out'
                });
            } else {
                mesh.position.z = 0;
                mesh.rotation.set(0, 0, 0);
                mesh.userData.introComplete = true;
            }
            
            meshes.push(mesh);
            hexGroup.add(mesh);
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
        depth: config.objectDepth,
        bevelEnabled: false
    });
    geometry.translate(0, 0, -config.objectDepth / 2);
    return geometry;
}

function createLights() {
    if (!THREE || !scene) return;
    
    const r = config.lightRadius;
    const intensity = config.lightIntensity;
    const distance = config.lightDistance;
    
    // Ambient light so hexagons aren't completely black
    ambientLight = new THREE.AmbientLight(0x222233, 0.5);
    ambientLight.name = 'hex_ambient';
    scene.add(ambientLight);
    
    // Position lights AT the hexagon z-plane (not in front)
    // They orbit around the hexagon grid
    const lightZ = config.zPosition;  // Same z as hexagons
    
    // BRIGHT vibrant colored point lights
    light1 = new THREE.PointLight(0xff00aa, intensity, distance);  // Hot pink/magenta
    light1.position.set(0, r, lightZ);
    light1.name = 'hex_light1';
    scene.add(light1);
    
    light2 = new THREE.PointLight(0x00ff88, intensity, distance);  // Bright green/cyan
    light2.position.set(0, -r, lightZ);
    light2.name = 'hex_light2';
    scene.add(light2);
    
    light3 = new THREE.PointLight(0x4488ff, intensity, distance);  // Blue
    light3.position.set(r, 0, lightZ);
    light3.name = 'hex_light3';
    scene.add(light3);
    
    light4 = new THREE.PointLight(0xff6600, intensity, distance);  // Orange
    light4.position.set(-r, 0, lightZ);
    light4.name = 'hex_light4';
    scene.add(light4);
    
    console.log('[InteractiveHexagonWall] Lights created at z =', lightZ, 'intensity =', intensity);
}

function setupMouseListeners() {
    if (typeof window === 'undefined') return;
    
    function onMove(e) {
        mouseOver = true;
        mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouseTarget.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }
    
    function onLeave() { mouseOver = false; }
    
    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave, { passive: true });
    
    window._wmHexWallCleanup = window._wmHexWallCleanup || [];
    window._wmHexWallCleanup.push(
        () => window.removeEventListener('mousemove', onMove),
        () => document.removeEventListener('mouseleave', onLeave)
    );
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
    
    window._wmHexWallCleanup = window._wmHexWallCleanup || [];
    events.forEach(ev => window._wmHexWallCleanup.push(() => window.removeEventListener(ev, onMenuActivity)));
}

export function update() {
    if (!animationActive || !THREE) return;
    
    const time = Date.now() * 0.001;
    const d = config.lightRadius;
    const lightZ = config.zPosition + 5;  // Slightly in front of hexagons for better illumination
    
    // Animate lights in orbits
    if (light1) { 
        light1.position.x = Math.sin(time * 0.4) * d; 
        light1.position.y = Math.cos(time * 0.5) * d;
        light1.position.z = lightZ;
    }
    if (light2) { 
        light2.position.x = Math.cos(time * 0.6) * d; 
        light2.position.y = Math.sin(time * 0.7) * d;
        light2.position.z = lightZ;
    }
    if (light3) { 
        light3.position.x = Math.sin(time * 0.8) * d; 
        light3.position.y = Math.sin(time * 0.45) * d;
        light3.position.z = lightZ;
    }
    if (light4) { 
        light4.position.x = Math.sin(time * 0.35) * d; 
        light4.position.y = Math.cos(time * 0.55) * d;
        light4.position.z = lightZ;
    }
    
    // Smooth mouse following
    mouse.x += (mouseTarget.x - mouse.x) * 0.08;
    mouse.y += (mouseTarget.y - mouse.y) * 0.08;
    
    // LookAt target
    let lookAtX, lookAtY, lookAtZ;
    
    if (isInteractive && mouseOver) {
        lookAtX = mouse.x * 80;
        lookAtY = mouse.y * 60;
        lookAtZ = config.lookAtZ;
    } else {
        lookAtX = Math.sin(time * 0.2) * 15;
        lookAtY = Math.cos(time * 0.15) * 10;
        lookAtZ = config.lookAtZ + 20;
    }
    
    const lookAt = new THREE.Vector3(lookAtX, lookAtY, lookAtZ);
    
    for (let i = 0; i < meshes.length; i++) {
        if (meshes[i].userData.introComplete) {
            meshes[i].lookAt(lookAt);
        }
    }
}

export function setInteractive(interactive) { isInteractive = interactive; }

export function dispose() {
    console.log('[InteractiveHexagonWall] Disposing');
    animationActive = false;
    
    if (menuIdleTimer) { clearTimeout(menuIdleTimer); menuIdleTimer = null; }
    
    if (typeof window !== 'undefined' && window._wmHexWallCleanup) {
        window._wmHexWallCleanup.forEach(fn => { try { fn(); } catch (e) {} });
        delete window._wmHexWallCleanup;
    }
    
    if (gsap) { 
        meshes.forEach(m => { gsap.killTweensOf(m.position); gsap.killTweensOf(m.rotation); }); 
    }
    
    if (hexGroup && scene) {
        scene.remove(hexGroup);
        meshes.forEach(m => { 
            if (m.geometry) m.geometry.dispose(); 
            if (m.material) m.material.dispose(); 
        });
    }
    
    if (scene) {
        [light1, light2, light3, light4, ambientLight].forEach(l => { if (l) scene.remove(l); });
    }
    
    meshes = [];
    hexGroup = null;
    light1 = light2 = light3 = light4 = ambientLight = null;
    scene = camera = THREE = gsap = null;
}

export default { init, update, dispose, setInteractive };
