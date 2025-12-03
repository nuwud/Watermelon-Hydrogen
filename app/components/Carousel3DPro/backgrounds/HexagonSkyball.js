/**
 * CerebroSkyball - Geodesic dome/sphere background (X-Men Cerebro style)
 * Uses true 3D icosahedral tessellation with EXTRUDED triangular panels
 * Panels have 3D depth and follow the mouse with subtle tilting
 * Visible gaps between panels show the depth and movement
 * 
 * MODES:
 * - 'dome': Whole dome rotates toward mouse (original behavior)
 * - 'panels': Each panel individually tilts toward mouse (new behavior)
 */

// Mode presets for easy switching
export const CEREBRO_MODES = {
    dome: {
        mode: 'dome',
        mouseInfluence: 0.15,
        panelTiltMax: 0,
        description: 'Whole dome rotates toward mouse'
    },
    panels: {
        mode: 'panels',
        mouseInfluence: 0.02,      // Subtle dome movement
        panelTiltMax: 0.4,         // Each panel tilts toward mouse
        description: 'Each panel individually tilts toward mouse'
    }
};

const DEFAULT_CONFIG = {
    sphereRadius: 55,           // Sphere size
    subdivisions: 3,            // Icosahedron subdivisions (2-4, higher = more panels)
    panelDepth: 0.8,            // Extrusion depth for 3D panels
    panelGap: 0.05,             // Gap between panels (5% shrink)
    lightIntensity: 60,
    lightDistance: 200,
    ambientIntensity: 0.5,
    roughness: 0.4,
    metalness: 0.5,
    emissiveBase: 0.3,
    mode: 'panels',             // 'dome' or 'panels' - controls mouse behavior
    mouseInfluence: 0.02,       // How much whole dome tilts toward mouse
    panelTiltMax: 0.4,          // Max radians each panel can tilt (panels mode)
    panelTiltSpeed: 0.08,       // How fast panels tilt toward target
    pauseWhenMenuActive: true,
    idleTimeout: 2000,
    panelColors: [0x2a3d5a, 0x253652, 0x354868, 0x2f4560], // Dark blue panels for contrast
};

let THREE = null;
let scene = null;
let config = { ...DEFAULT_CONFIG };

let skyballGroup = null;
let panelMeshes = [];
let panelGroups = [];  // For per-panel rotation in 'panels' mode
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

    scene = sceneRef;
    config = { ...DEFAULT_CONFIG, ...options };

    skyballGroup = new THREE.Group();
    skyballGroup.name = 'CerebroSkyball_group';
    scene.add(skyballGroup);

    createGeodesicSphere();
    createLights();
    setupMouseListeners();
    setupMenuActivityListeners();

    animationActive = true;
    console.log('[CerebroSkyball] Initialized with', panelMeshes.length, 'geodesic 3D panels, mode:', config.mode);
}

function createGeodesicSphere() {
    if (!THREE || !skyballGroup) return;

    const radius = config.sphereRadius;
    const detail = config.subdivisions;

    // Create icosahedron geometry for perfect geodesic sphere
    const icoGeo = new THREE.IcosahedronGeometry(radius, detail);
    
    // We need to get the non-indexed faces
    const nonIndexed = icoGeo.toNonIndexed();
    const positions = nonIndexed.attributes.position.array;
    const faceCount = positions.length / 9; // 3 vertices * 3 coords per face

    panelMeshes = [];
    panelGroups = [];

    for (let f = 0; f < faceCount; f++) {
        const i = f * 9;

        // Get the three vertices of this triangle
        const v1 = new THREE.Vector3(positions[i], positions[i+1], positions[i+2]);
        const v2 = new THREE.Vector3(positions[i+3], positions[i+4], positions[i+5]);
        const v3 = new THREE.Vector3(positions[i+6], positions[i+7], positions[i+8]);

        // Calculate center of triangle (on sphere surface)
        const center = new THREE.Vector3().addVectors(v1, v2).add(v3).divideScalar(3);
        const normal = center.clone().normalize();

        // Shrink triangle toward center for gaps
        const shrinkFactor = 1 - config.panelGap;
        const sv1 = v1.clone().sub(center).multiplyScalar(shrinkFactor).add(center);
        const sv2 = v2.clone().sub(center).multiplyScalar(shrinkFactor).add(center);
        const sv3 = v3.clone().sub(center).multiplyScalar(shrinkFactor).add(center);

        // Create BufferGeometry directly for the extruded triangle
        // This avoids the Shape/ExtrudeGeometry complexity that was causing alignment issues
        const geometry = createExtrudedTriangle(sv1, sv2, sv3, center, normal, config.panelDepth);

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

        const mesh = new THREE.Mesh(geometry, mat);

        // Store data for animations
        mesh.userData.center = center.clone();
        mesh.userData.normal = normal.clone();
        mesh.userData.index = f;
        mesh.userData.baseEmissive = config.emissiveBase;

        // For 'panels' mode: wrap each mesh in a Group that pivots around the panel center
        // This allows each panel to tilt independently toward the mouse
        const panelGroup = new THREE.Group();
        panelGroup.position.copy(center);
        panelGroup.userData.center = center.clone();
        panelGroup.userData.normal = normal.clone();
        panelGroup.userData.baseQuaternion = new THREE.Quaternion();
        
        // Move mesh to be relative to group center
        mesh.position.sub(center);
        
        // Set the group's initial orientation so panel faces outward
        // We'll use this as the base orientation for tilting
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
        panelGroup.quaternion.copy(quaternion);
        panelGroup.userData.baseQuaternion.copy(quaternion);
        
        // Offset mesh rotation to compensate for group rotation
        const invQuaternion = quaternion.clone().invert();
        mesh.quaternion.copy(invQuaternion);

        panelGroup.add(mesh);
        panelGroups.push(panelGroup);
        panelMeshes.push(mesh);
        skyballGroup.add(panelGroup);
    }

    // Clean up
    icoGeo.dispose();
    nonIndexed.dispose();
}

function createExtrudedTriangle(v1, v2, v3, center, normal, depth) {
    // Create a prism from the triangle, extruding inward along the normal
    const inwardNormal = normal.clone().negate();
    
    // Inner vertices (extruded inward)
    const iv1 = v1.clone().add(inwardNormal.clone().multiplyScalar(depth));
    const iv2 = v2.clone().add(inwardNormal.clone().multiplyScalar(depth));
    const iv3 = v3.clone().add(inwardNormal.clone().multiplyScalar(depth));

    // Create geometry with 8 triangles:
    // - 1 front face (outer)
    // - 1 back face (inner)
    // - 3 side faces (2 triangles each = 6 triangles)
    const vertices = [];
    const normals = [];

    // Helper to add a triangle with its normal
    const addTri = (a, b, c, n) => {
        vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
        normals.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
    };

    // Front face (outer) - facing outward
    addTri(v1, v2, v3, normal);

    // Back face (inner) - facing inward
    addTri(iv3, iv2, iv1, inwardNormal);

    // Side faces - each edge needs 2 triangles
    // Edge v1-v2
    const n12 = new THREE.Vector3().crossVectors(
        v2.clone().sub(v1),
        iv1.clone().sub(v1)
    ).normalize();
    addTri(v1, iv1, v2, n12);
    addTri(v2, iv1, iv2, n12);

    // Edge v2-v3
    const n23 = new THREE.Vector3().crossVectors(
        v3.clone().sub(v2),
        iv2.clone().sub(v2)
    ).normalize();
    addTri(v2, iv2, v3, n23);
    addTri(v3, iv2, iv3, n23);

    // Edge v3-v1
    const n31 = new THREE.Vector3().crossVectors(
        v1.clone().sub(v3),
        iv3.clone().sub(v3)
    ).normalize();
    addTri(v3, iv3, v1, n31);
    addTri(v1, iv3, iv1, n31);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

    return geometry;
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

    // Subtle group rotation based on mouse (both modes, but more subtle in panels mode)
    if (isInteractive && mouseOver) {
        const targetRotX = mouse.y * config.mouseInfluence;
        const targetRotY = mouse.x * config.mouseInfluence;
        
        skyballGroup.rotation.x += (targetRotX - skyballGroup.rotation.x) * 0.05;
        skyballGroup.rotation.y += (targetRotY - skyballGroup.rotation.y) * 0.05;
    } else {
        // Gentle idle rotation
        skyballGroup.rotation.x += (Math.sin(time * 0.1) * 0.02 - skyballGroup.rotation.x) * 0.02;
        skyballGroup.rotation.y += (Math.cos(time * 0.08) * 0.02 - skyballGroup.rotation.y) * 0.02;
    }

    // Mouse direction in 3D space (pointing into screen toward mouse position)
    const mouseDir = new THREE.Vector3(mouse.x, mouse.y, -0.5).normalize();

    // Update each panel
    for (let i = 0; i < panelGroups.length; i++) {
        const panelGroup = panelGroups[i];
        const mesh = panelMeshes[i];
        const center = panelGroup.userData.center;
        const normal = panelGroup.userData.normal;

        // Pulse effect on panels
        const waveOffset = (center.x + center.y + center.z) * 0.02;
        const pulse = Math.sin(time * 0.5 + waveOffset) * 0.1;
        mesh.material.emissiveIntensity = mesh.userData.baseEmissive + pulse;

        // How much this panel faces the mouse (dot product)
        const dot = normal.dot(mouseDir);
        const facingMouse = Math.max(0, dot);

        // Extra glow for panels facing mouse
        if (isInteractive && mouseOver) {
            mesh.material.emissiveIntensity += facingMouse * 0.25;
        }

        // PANELS MODE: Each panel tilts toward the mouse
        if (config.mode === 'panels' && config.panelTiltMax > 0) {
            if (isInteractive && mouseOver) {
                // Calculate tilt direction: cross product of normal and mouse direction
                // This gives us the axis to rotate around
                const tiltAxis = new THREE.Vector3().crossVectors(normal, mouseDir);
                const tiltAxisLength = tiltAxis.length();
                
                if (tiltAxisLength > 0.001) {
                    tiltAxis.normalize();
                    
                    // Tilt amount based on how much the panel faces mouse
                    // Panels facing away tilt more, panels facing directly tilt less
                    const tiltAmount = (1 - facingMouse) * config.panelTiltMax * facingMouse * 2;
                    
                    // Create target quaternion: base orientation + tilt
                    const tiltQuat = new THREE.Quaternion().setFromAxisAngle(tiltAxis, tiltAmount);
                    const targetQuat = panelGroup.userData.baseQuaternion.clone().premultiply(tiltQuat);
                    
                    // Smoothly interpolate to target
                    panelGroup.quaternion.slerp(targetQuat, config.panelTiltSpeed);
                }
            } else {
                // Return to base orientation when not interactive
                panelGroup.quaternion.slerp(panelGroup.userData.baseQuaternion, config.panelTiltSpeed * 0.5);
            }
        }
    }
}

export function setInteractive(interactive) { isInteractive = interactive; }

export function dispose() {
    console.log('[CerebroSkyball] Disposing');
    animationActive = false;

    if (menuIdleTimer) { clearTimeout(menuIdleTimer); menuIdleTimer = null; }

    if (typeof window !== 'undefined' && window._wmSkyballCleanup) {
        window._wmSkyballCleanup.forEach(fn => { try { fn(); } catch { /* ignore cleanup errors */ } });
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
    panelGroups = [];
    skyballGroup = null;
    light1 = light2 = light3 = light4 = ambientLight = hemisphereLight = null;
    scene = THREE = null;
}

// Export mode switching function
export function setMode(modeName) {
    if (CEREBRO_MODES[modeName]) {
        Object.assign(config, CEREBRO_MODES[modeName]);
        console.log('[CerebroSkyball] Mode changed to:', modeName);
    }
}

export function getMode() {
    return config.mode;
}

export default { init, update, dispose, setInteractive, setMode, getMode, CEREBRO_MODES };
