/**
 * InteractiveHexagonWall - 3D hexagon grid with lookAt behavior and colored lights
 * Based on: https://codepen.io/Patrick-Wood-the-sasster/pen/gbOjxMj
 * SSR-safe: Uses dynamic THREE import and window guards.
 */

const DEFAULT_CONFIG = {
    objectRadius: 2.5,
    objectDepth: 1,
    lookAtZ: 40,
    lightIntensity: 0.2,
    lightDistance: 300,
    lightRadius: 100,
    roughness: 0.4,
    metalness: 0.9,
    hexColor: 0xffffff,
    pauseWhenMenuActive: true,
    idleTimeout: 2000,
};

let THREE = null;
let gsap = null;
let scene = null;
let camera = null;
let config = { ...DEFAULT_CONFIG };

let meshes = [];
let light1, light2, light3, light4;
let animationActive = false;
let isInteractive = true;
let menuIdleTimer = null;
let lastMenuActivity = 0;

let mouseOver = false;
const mouse = { x: 0, y: 0 };
let mousePlane = null;
let mousePosition = null;
let raycaster = null;

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
    
    mousePosition = new THREE.Vector3();
    raycaster = new THREE.Raycaster();
    mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    mousePlane.translate(new THREE.Vector3(0, 0, -config.lookAtZ));
    
    createHexagonGrid();
    createLights();
    setupMouseListeners();
    setupMenuActivityListeners();
    
    animationActive = true;
    console.log('[InteractiveHexagonWall] Initialized with', meshes.length, 'hexagons');
}

function createHexagonGrid() {
    if (!THREE || !scene) return;
    
    const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const height = typeof window !== 'undefined' ? window.innerHeight : 1080;
    
    const nx = Math.round(width / 20);
    const ny = Math.round(height / 15);
    
    const mat = new THREE.MeshStandardMaterial({
        color: config.hexColor,
        roughness: config.roughness,
        metalness: config.metalness,
    });
    
    const geo = createHexagonGeometry(6, 0, 0, config.objectRadius, 0);
    const dx = Math.cos(Math.PI / 6) * config.objectRadius * 2;
    const dy = config.objectRadius * 1.5;
    
    meshes = [];
    
    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
            const mesh = new THREE.Mesh(geo, mat);
            mesh.name = 'InteractiveHexagonWall_hex_' + i + '_' + j;
            
            const targetX = (-nx / 2 + i) * dx + (j % 2 / 2 * dx);
            const targetY = (-ny / 2 + j) * dy;
            
            mesh.position.x = targetX;
            mesh.position.y = targetY;
            mesh.position.z = -200 - Math.random() * 50;
            
            mesh.rotation.x = (Math.random() - 0.5) * Math.PI * 2;
            mesh.rotation.y = (Math.random() - 0.5) * Math.PI * 2;
            mesh.rotation.z = (Math.random() - 0.5) * Math.PI * 2;
            
            mesh.userData.introComplete = false;
            
            const dur = 1 + Math.random() * 2;
            if (gsap) {
                gsap.to(mesh.position, {
                    z: 0,
                    duration: dur,
                    ease: 'power1.out',
                    onComplete() { mesh.userData.introComplete = true; }
                });
                gsap.to(mesh.rotation, {
                    x: 0, y: 0, z: 0,
                    duration: dur + 1.5,
                    ease: 'power1.out'
                });
            } else {
                mesh.position.z = 0;
                mesh.rotation.set(0, 0, 0);
                mesh.userData.introComplete = true;
            }
            
            meshes.push(mesh);
            scene.add(mesh);
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
    
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    ambient.name = 'InteractiveHexagonWall_ambient';
    scene.add(ambient);
    
    light1 = new THREE.PointLight(randomColor(), intensity, distance);
    light1.position.set(0, r, r);
    light1.name = 'InteractiveHexagonWall_light1';
    scene.add(light1);
    
    light2 = new THREE.PointLight(randomColor(), intensity, distance);
    light2.position.set(0, -r, r);
    light2.name = 'InteractiveHexagonWall_light2';
    scene.add(light2);
    
    light3 = new THREE.PointLight(randomColor(), intensity, distance);
    light3.position.set(r, 0, r);
    light3.name = 'InteractiveHexagonWall_light3';
    scene.add(light3);
    
    light4 = new THREE.PointLight(randomColor(), intensity, distance);
    light4.position.set(-r, 0, r);
    light4.name = 'InteractiveHexagonWall_light4';
    scene.add(light4);
}

function randomColor() {
    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xffeaa7, 0xdfe6e9, 0xa29bfe, 0xfd79a8];
    return colors[Math.floor(Math.random() * colors.length)];
}

function setupMouseListeners() {
    if (typeof window === 'undefined') return;
    
    function onMove(e) {
        if (!isInteractive) return;
        mouseOver = true;
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        
        if (camera && mousePlane) {
            const v = new THREE.Vector3();
            camera.getWorldDirection(v);
            mousePlane.normal.copy(v.normalize());
        }
        
        if (raycaster && camera && mousePlane && mousePosition) {
            raycaster.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), camera);
            raycaster.ray.intersectPlane(mousePlane, mousePosition);
        }
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
        lastMenuActivity = Date.now();
        isInteractive = false;
        if (menuIdleTimer) clearTimeout(menuIdleTimer);
        menuIdleTimer = setTimeout(() => { isInteractive = true; }, config.idleTimeout);
    }
    
    const events = ['carousel-item-hover', 'carousel-item-click', 'carousel-submenu-open', 'carousel-submenu-close', 'carousel-rotation-start'];
    events.forEach(ev => window.addEventListener(ev, onMenuActivity, { passive: true }));
    
    function onPointerDown(e) { if (e.target && e.target.tagName === 'CANVAS') onMenuActivity(); }
    function onPointerMove(e) { if (Date.now() - lastMenuActivity >= 100 && e.target && e.target.tagName === 'CANVAS') onMenuActivity(); }
    
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    
    window._wmHexWallCleanup = window._wmHexWallCleanup || [];
    events.forEach(ev => window._wmHexWallCleanup.push(() => window.removeEventListener(ev, onMenuActivity)));
    window._wmHexWallCleanup.push(
        () => document.removeEventListener('pointerdown', onPointerDown),
        () => document.removeEventListener('pointermove', onPointerMove)
    );
}

export function update() {
    if (!animationActive || !THREE) return;
    
    const time = Date.now() * 0.001;
    const d = config.lightRadius;
    
    if (light1) { light1.position.x = Math.sin(time * 0.1) * d; light1.position.y = Math.cos(time * 0.2) * d; }
    if (light2) { light2.position.x = Math.cos(time * 0.3) * d; light2.position.y = Math.sin(time * 0.4) * d; }
    if (light3) { light3.position.x = Math.sin(time * 0.5) * d; light3.position.y = Math.sin(time * 0.6) * d; }
    if (light4) { light4.position.x = Math.sin(time * 0.7) * d; light4.position.y = Math.cos(time * 0.8) * d; }
    
    const lookAt = (mouseOver && isInteractive && mousePosition)
        ? new THREE.Vector3(mousePosition.x, mousePosition.y, config.lookAtZ)
        : new THREE.Vector3(0, 0, 10000);
    
    for (let i = 0; i < meshes.length; i++) {
        if (meshes[i].userData.introComplete) meshes[i].lookAt(lookAt);
    }
}

export function setInteractive(interactive) { isInteractive = interactive; }

export function dispose() {
    console.log('[InteractiveHexagonWall] Disposing');
    animationActive = false;
    
    if (menuIdleTimer) { clearTimeout(menuIdleTimer); menuIdleTimer = null; }
    
    if (typeof window !== 'undefined' && window._wmHexWallCleanup) {
        window._wmHexWallCleanup.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
        delete window._wmHexWallCleanup;
    }
    
    if (gsap) { meshes.forEach(m => { gsap.killTweensOf(m.position); gsap.killTweensOf(m.rotation); }); }
    
    if (scene) {
        meshes.forEach(m => { scene.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); });
        [light1, light2, light3, light4].forEach(l => { if (l) { scene.remove(l); if (l.dispose) l.dispose(); } });
        const ambient = scene.getObjectByName('InteractiveHexagonWall_ambient');
        if (ambient) scene.remove(ambient);
    }
    
    meshes = [];
    light1 = light2 = light3 = light4 = null;
    scene = camera = mousePlane = mousePosition = raycaster = THREE = gsap = null;
}

export default { init, update, dispose, setInteractive };
