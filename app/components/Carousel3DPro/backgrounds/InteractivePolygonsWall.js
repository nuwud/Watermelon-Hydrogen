/**
 * InteractivePolygonsWall - Dynamic polygon mesh background with mouse interaction
 * 
 * Creates a grid of connected triangular polygons that respond to mouse movement
 * with gentle wave animations and lighting effects.
 * 
 * SSR-safe: Uses dynamic THREE import and window guards.
 */

const DEFAULT_CONFIG = {
    cols: 25,
    rows: 15,
    cellSize: 60,
    waveSpeed: 0.8,
    waveAmplitude: 25,
    mouseInfluenceRadius: 200,
    mouseInfluenceStrength: 40,
    baseColor: 0x1a1a2e,
    highlightColor: 0x16213e,
    lineColor: 0x0f3460,
    lineOpacity: 0.4,
    meshOpacity: 0.85,
    enableMouseInteraction: true,
    enableWaveAnimation: true,
};

let THREE = null;
let scene = null;
let config = { ...DEFAULT_CONFIG };
let polygonMesh = null;
let lineMesh = null;
let pointsArray = [];
let originalPositions = [];
let geometry = null;
let lineGeometry = null;
let time = 0;
let mousePosition = { x: 0, y: 0, isActive: false };
let animationActive = false;

export async function init(sceneRef, cameraRef, rendererRef, options = {}) {
    if (typeof window === 'undefined') return;
    
    THREE = await import('three');
    scene = sceneRef;
    config = { ...DEFAULT_CONFIG, ...options };
    
    const gridWidth = config.cols * config.cellSize;
    const gridHeight = config.rows * config.cellSize;
    const offsetX = -gridWidth / 2;
    const offsetZ = -gridHeight / 2;
    
    pointsArray = [];
    originalPositions = [];
    
    for (let row = 0; row <= config.rows; row++) {
        for (let col = 0; col <= config.cols; col++) {
            const jitterX = (Math.random() - 0.5) * config.cellSize * 0.3;
            const jitterZ = (Math.random() - 0.5) * config.cellSize * 0.3;
            const x = offsetX + col * config.cellSize + jitterX;
            const z = offsetZ + row * config.cellSize + jitterZ;
            pointsArray.push({ x, y: 0, z });
            originalPositions.push({ x, y: 0, z });
        }
    }
    
    createPolygonMesh();
    createLineMesh();
    
    if (polygonMesh) {
        polygonMesh.position.set(0, -5, -15);
        polygonMesh.rotation.x = -Math.PI * 0.15;
    }
    if (lineMesh) {
        lineMesh.position.copy(polygonMesh.position);
        lineMesh.rotation.copy(polygonMesh.rotation);
    }
    
    if (config.enableMouseInteraction) setupMouseListeners();
    animationActive = true;
    console.log('[InteractivePolygonsWall] Initialized');
}

function createPolygonMesh() {
    if (!THREE) return;
    
    const vertices = [];
    const colors = [];
    const indices = [];
    const baseColor = new THREE.Color(config.baseColor);
    const highlightColor = new THREE.Color(config.highlightColor);
    
    for (let i = 0; i < pointsArray.length; i++) {
        const p = pointsArray[i];
        vertices.push(p.x, p.y, p.z);
        const t = i / pointsArray.length;
        const c = baseColor.clone().lerp(highlightColor, t * 0.3);
        colors.push(c.r, c.g, c.b);
    }
    
    const colCount = config.cols + 1;
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            const tl = row * colCount + col;
            const tr = tl + 1;
            const bl = (row + 1) * colCount + col;
            const br = bl + 1;
            indices.push(tl, bl, tr, tr, bl, br);
        }
    }
    
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    const mat = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: config.meshOpacity,
        shininess: 30,
        flatShading: true,
    });
    
    polygonMesh = new THREE.Mesh(geometry, mat);
    polygonMesh.name = 'InteractivePolygonsWall_mesh';
    scene.add(polygonMesh);
    
    if (!scene.getObjectByName('InteractivePolygonsWall_light')) {
        const light = new THREE.PointLight(0x4a6fa5, 0.5, 500);
        light.position.set(0, 50, -50);
        light.name = 'InteractivePolygonsWall_light';
        scene.add(light);
    }
}

function createLineMesh() {
    if (!THREE) return;
    
    const verts = [];
    const colCount = config.cols + 1;
    
    for (let row = 0; row <= config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            const i1 = row * colCount + col, i2 = i1 + 1;
            verts.push(pointsArray[i1].x, pointsArray[i1].y, pointsArray[i1].z,
                       pointsArray[i2].x, pointsArray[i2].y, pointsArray[i2].z);
        }
    }
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col <= config.cols; col++) {
            const i1 = row * colCount + col, i2 = (row + 1) * colCount + col;
            verts.push(pointsArray[i1].x, pointsArray[i1].y, pointsArray[i1].z,
                       pointsArray[i2].x, pointsArray[i2].y, pointsArray[i2].z);
        }
    }
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            const tl = row * colCount + col, br = (row + 1) * colCount + col + 1;
            verts.push(pointsArray[tl].x, pointsArray[tl].y, pointsArray[tl].z,
                       pointsArray[br].x, pointsArray[br].y, pointsArray[br].z);
        }
    }
    
    lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    
    lineMesh = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({
        color: config.lineColor,
        transparent: true,
        opacity: config.lineOpacity,
    }));
    lineMesh.name = 'InteractivePolygonsWall_lines';
    scene.add(lineMesh);
}

function setupMouseListeners() {
    if (typeof window === 'undefined') return;
    
    const onMove = (e) => {
        mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
        mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
        mousePosition.isActive = true;
    };
    const onLeave = () => { mousePosition.isActive = false; };
    
    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave, { passive: true });
    
    window._wmPolygonWallCleanup = window._wmPolygonWallCleanup || [];
    window._wmPolygonWallCleanup.push(
        () => window.removeEventListener('mousemove', onMove),
        () => document.removeEventListener('mouseleave', onLeave)
    );
}

export function update(dt = 0.016) {
    if (!animationActive || !geometry || !THREE) return;
    time += dt;
    
    const pos = geometry.attributes.position.array;
    
    for (let i = 0; i < pointsArray.length; i++) {
        const orig = originalPositions[i];
        let y = orig.y;
        
        if (config.enableWaveAnimation) {
            y += Math.sin(time * config.waveSpeed + orig.x * 0.02) * config.waveAmplitude * 0.5;
            y += Math.sin(time * config.waveSpeed * 0.7 + orig.z * 0.025) * config.waveAmplitude * 0.3;
            y += Math.cos(time * config.waveSpeed * 0.5 + (orig.x + orig.z) * 0.015) * config.waveAmplitude * 0.2;
        }
        
        if (config.enableMouseInteraction && mousePosition.isActive) {
            const dx = orig.x - mousePosition.x * 500;
            const dz = orig.z - mousePosition.y * 300;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < config.mouseInfluenceRadius) {
                const inf = 1 - dist / config.mouseInfluenceRadius;
                y += inf * inf * config.mouseInfluenceStrength;
            }
        }
        
        pointsArray[i].y = y;
        pos[i * 3 + 1] = y;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    if (lineGeometry) {
        const lp = lineGeometry.attributes.position.array;
        const colCount = config.cols + 1;
        let idx = 0;
        
        for (let row = 0; row <= config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                const i1 = row * colCount + col, i2 = i1 + 1;
                lp[idx++] = pointsArray[i1].x; lp[idx++] = pointsArray[i1].y; lp[idx++] = pointsArray[i1].z;
                lp[idx++] = pointsArray[i2].x; lp[idx++] = pointsArray[i2].y; lp[idx++] = pointsArray[i2].z;
            }
        }
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col <= config.cols; col++) {
                const i1 = row * colCount + col, i2 = (row + 1) * colCount + col;
                lp[idx++] = pointsArray[i1].x; lp[idx++] = pointsArray[i1].y; lp[idx++] = pointsArray[i1].z;
                lp[idx++] = pointsArray[i2].x; lp[idx++] = pointsArray[i2].y; lp[idx++] = pointsArray[i2].z;
            }
        }
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                const tl = row * colCount + col, br = (row + 1) * colCount + col + 1;
                lp[idx++] = pointsArray[tl].x; lp[idx++] = pointsArray[tl].y; lp[idx++] = pointsArray[tl].z;
                lp[idx++] = pointsArray[br].x; lp[idx++] = pointsArray[br].y; lp[idx++] = pointsArray[br].z;
            }
        }
        lineGeometry.attributes.position.needsUpdate = true;
    }
}

export function dispose() {
    console.log('[InteractivePolygonsWall] Disposing');
    animationActive = false;
    
    if (typeof window !== 'undefined' && window._wmPolygonWallCleanup) {
        window._wmPolygonWallCleanup.forEach(fn => { try { fn(); } catch { /* ignore cleanup errors */ } });
        delete window._wmPolygonWallCleanup;
    }
    
    if (scene) {
        if (polygonMesh) {
            scene.remove(polygonMesh);
            polygonMesh.geometry?.dispose();
            polygonMesh.material?.dispose();
        }
        if (lineMesh) {
            scene.remove(lineMesh);
            lineMesh.geometry?.dispose();
            lineMesh.material?.dispose();
        }
        const light = scene.getObjectByName('InteractivePolygonsWall_light');
        if (light) { scene.remove(light); light.dispose?.(); }
    }
    
    polygonMesh = lineMesh = geometry = lineGeometry = scene = THREE = null;
    pointsArray = originalPositions = [];
    time = 0;
}

export default { init, update, dispose };
