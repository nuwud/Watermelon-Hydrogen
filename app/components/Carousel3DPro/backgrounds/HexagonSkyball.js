/**
 * CerebroSkyball - Geodesic dome/sphere background (X-Men Cerebro style)
 * Uses true 3D icosahedral tessellation with EXTRUDED panels for 3D depth
 * Triangular panels follow the mouse with lookAt behavior
 * Visible gaps between panels show the depth and movement
 */

const DEFAULT_CONFIG = {
    sphereRadius: 55,           // Sphere size
    subdivisions: 3,            // Icosahedron subdivisions (2-4, higher = more panels)
    panelDepth: 1.2,            // Extrusion depth for 3D panels
    panelGap: 0.06,             // Gap between panels (larger for visible edges)
    lightIntensity: 60,
    lightDistance: 200,
    ambientIntensity: 0.5,
    roughness: 0.4,
    metalness: 0.5,
    emissiveBase: 0.3,
    lookAtStrength: 40,         // How strongly panels follow mouse
    lookAtZ: 30,                // Z position of lookAt target
    pauseWhenMenuActive: true,
    idleTimeout: 2000,
    panelColors: [0x3a4d6a, 0x2f4562, 0x445877, 0x3d506b], // Blue-gray panels
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
    console.log('[CerebroSkyball] Initialized with', panelMeshes.length, 'geodesic 3D panels');
}

function createGeodesicSphere() {
    if (!THREE || !skyballGroup) return;
    
    const radius = config.sphereRadius;
    const detail = config.subdivisions;
    
    // Create icosahedron geometry for perfect geodesic sphere
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
        
        // Calculate center of triangle (on sphere surface)
        const center = new THREE.Vector3().addVectors(v1, v2).add(v3).divideScalar(3);
        const centerNormalized = center.clone().normalize();
        
        // Shrink triangle for gaps
        const shrinkFactor = 1 - config.panelGap;
        const sv1 = v1.clone().sub(center).multiplyScalar(shrinkFactor).add(center);
        const sv2 = v2.clone().sub(center).multiplyScalar(shrinkFactor).add(center);
        const sv3 = v3.clone().sub(center).multiplyScalar(shrinkFactor).add(center);
        
        // Create 2D triangle shape for extrusion
        // Project to local 2D space for the Shape
        const normal = centerNormalized.clone();
        const up = new THREE.Vector3(0, 1, 0);
        if (Math.abs(normal.dot(up)) > 0.99) up.set(1, 0, 0);
        
        const tangent = new THREE.Vector3().crossVectors(up, normal).normalize();
        const bitangent = new THREE.Vector3().crossVectors(normal, tangent);
        
        // Project vertices to 2D local space
        const toLocal = (v) => {
            const rel = v.clone().sub(center);
            return new THREE.Vector2(rel.dot(tangent), rel.dot(bitangent));
        };
        
        const p1 = toLocal(sv1);
        const p2 = toLocal(sv2);
        const p3 = toLocal(sv3);
        
        // Create shape
        const shape = new THREE.Shape();
        shape.moveTo(p1.x, p1.y);
        shape.lineTo(p2.x, p2.y);
        shape.lineTo(p3.x, p3.y);
        shape.lineTo(p1.x, p1.y);
        
        // Extrude for 3D depth
        const extrudeSettings = {
            steps: 1,
            depth: config.panelDepth,
            bevelEnabled: true,
            bevelThickness: 0.15,
            bevelSize: 0.1,
            bevelSegments: 2
        };
        
        const triGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        
        // Subtle color variation
        const colorIndex = f % config.panelColors.length;
        const baseColor = config.panelColors[colorIndex];
        
        const mat = new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: config.roughness,
            metalness: config.metalness,
            emissive: 0x1a2a3a,
            emissiveIntensity: config.emissiveBase,
            side: THREE.DoubleSide,
        });
        
        const mesh = new THREE.Mesh(triGeo, mat);
        
        // Position at center and orient facing inward
        mesh.position.copy(center);
        
        // Create rotation matrix to align with sphere surface
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().negate());
        mesh.quaternion.copy(quaternion);
        
        // Store data for animations
        mesh.userData.originalPos = center.clone();
        mesh.userData.center = center.clone();
        mesh.userData.normal = centerNormalized.clone();
        mesh.userData.originalQuaternion = mesh.quaternion.clone();
        mesh.userData.index = f;
        mesh.userData.baseEmissive = config.emissiveBase;
        mesh.userData.introComplete = true;
        
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
    mouse.x += (mouseTarget.x - mouse.x) * 0.08;
    mouse.y += (mouseTarget.y - mouse.y) * 0.08;
    
    // Animate lights in 3D orbits
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
    
    // LookAt target for panels - follows mouse like the flat wall version
    let lookAtX, lookAtY, lookAtZ;
    
    if (isInteractive && mouseOver) {
        // Mouse-driven lookAt target
        lookAtX = mouse.x * config.lookAtStrength;
        lookAtY = mouse.y * config.lookAtStrength;
        lookAtZ = config.lookAtZ;
    } else {
        // Gentle idle movement
        lookAtX = Math.sin(time * 0.2) * 15;
        lookAtY = Math.cos(time * 0.15) * 10;
        lookAtZ = config.lookAtZ + 20;
    }
    
    const lookAtTarget = new THREE.Vector3(lookAtX, lookAtY, lookAtZ);
    
    // Make each panel look at the mouse target
    for (let i = 0; i < panelMeshes.length; i++) {
        const mesh = panelMeshes[i];
        if (mesh.userData.introComplete) {
            // Each panel rotates to face the lookAt target
            mesh.lookAt(lookAtTarget);
        }
        
        // Subtle pulse effect based on position
        const center = mesh.userData.center;
        const waveOffset = (center.x + center.y + center.z) * 0.02;
        const pulse = Math.sin(time * 0.4 + waveOffset) * 0.1;
        mesh.material.emissiveIntensity = mesh.userData.baseEmissive + pulse;
        
        // Panels closer to lookAt direction get extra glow
        if (isInteractive && mouseOver) {
            const panelDir = center.clone().normalize();
            const mouseDir = new THREE.Vector3(mouse.x, mouse.y, -0.5).normalize();
            const dot = panelDir.dot(mouseDir);
            const mouseInfluence = Math.max(0, dot) * 0.3;
            mesh.material.emissiveIntensity += mouseInfluence;
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
