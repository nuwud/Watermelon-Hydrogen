# **WatermelonOS: Three.js \+ Shopify Hydrogen Integration (Step-by-Step Guide)**

This guide walks through how to mount a custom Three.js environment inside a Shopify Hydrogen v2025 project to enable 3D interfaces like the Watermelon Menu. It includes scroll behavior fixes, text geometry scaling fixes, and a breakdown of how to structure the integration cleanly.

---

## **🧱 Prerequisites**

* Node.js v18+

* `npm` installed

* Shopify CLI (`npm install -g @shopify/cli @shopify/theme`)

* Vite \+ Hydrogen v2025.1.3+

## **🛠 Step 1: Scaffold Your Hydrogen Project**

shopify create hydrogen \--template hello-world \--name watermelon-hydrogen  
cd watermelon-hydrogen

## **📁 Step 2: Folder \+ File Setup**

Create a folder for your Three.js app:

mkdir \-p app/components/Carousel3DPro

Place these key files inside:

Carousel3DPro/  
├── main.js                    \# Initializes Three.js scene, camera, renderer  
├── Carousel3DPro.js          \# Class defining the 3D carousel logic  
├── Carousel3DSubmenu.js      \# Optional submenu for nested wheels  
├── Carousel3DProWrapper.jsx  \# React wrapper that mounts the main file

## **🧠 Step 3: ClientOnly Wrapper**

Hydrogen uses server-side rendering, so we must isolate Three.js rendering to the browser. Create this file:

// app/components/ClientOnly.jsx  
import { useEffect, useState } from 'react';  
export default function ClientOnly({ children }) {  
  const \[isClient, setIsClient\] \= useState(false);  
  useEffect(() \=\> setIsClient(true), \[\]);  
  return isClient ? children : null;  
}

## **💡 Step 4: Inject Three.js Mount Wrapper**

Create:

// app/components/Carousel3DProWrapper.jsx  
import { useEffect, useRef } from 'react';  
import ClientOnly from '../ClientOnly';  
import setupCarousel from './main.js';

export default function Carousel3DProWrapper() {  
  const containerRef \= useRef(null);

  useEffect(() \=\> {  
    if (containerRef.current) setupCarousel(containerRef.current);  
  }, \[\]);

  return (  
    \<ClientOnly\>  
      \<div id="carousel-container" ref={containerRef} style={{ width: '100%', height: '100vh', overflow: 'hidden' }} /\>  
    \</ClientOnly\>  
  );  
}

## **🌐 Step 5: Add Entry Point to Hydrogen**

Mount the wrapper in your homepage route or layout.

// app/routes/\_index.jsx or layout.jsx  
import Carousel3DProWrapper from '\~/components/Carousel3DPro/Carousel3DProWrapper';  
export default function Index() {  
  return \<Carousel3DProWrapper /\>;  
}

## **🌀 Step 6: main.js – Init Three.js**

Create your Three.js scene and inject the menu:

import \* as THREE from 'three';  
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';  
import { Carousel3DPro } from './Carousel3DPro.js';  
import { Carousel3DSubmenu } from './Carousel3DSubmenu.js';

export default function setupCarousel(container) {  
  const scene \= new THREE.Scene();  
  const camera \= new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);  
  camera.position.set(0, 0, 6);

  const renderer \= new THREE.WebGLRenderer({ antialias: true });  
  renderer.setSize(container.clientWidth, container.clientHeight);  
  container.appendChild(renderer.domElement);

  const controls \= new OrbitControls(camera, renderer.domElement);  
  controls.enableRotate \= false;  
  controls.enableZoom \= true;  
  controls.enablePan \= false;

  const menu \= new Carousel3DPro(scene, camera, renderer, container);

  window.addEventListener('resize', () \=\> {  
    camera.aspect \= container.clientWidth / container.clientHeight;  
    camera.updateProjectionMatrix();  
    renderer.setSize(container.clientWidth, container.clientHeight);  
  });

  function animate() {  
    requestAnimationFrame(animate);  
    controls.update();  
    renderer.render(scene, camera);  
  }  
  animate();  
}

## **🔡 Step 7: Fix TextGeometry Scaling Issues**

Make sure each mesh made from `TextGeometry` includes:

geometry.computeBoundingBox();  
geometry.center();  
mesh.userData.originalScale \= mesh.scale.clone();

### **✅ Bonus Fix: Depth setting to avoid distortion**

Add a missing `depth` parameter:

new TextGeometry("My Label", {  
  font: loadedFont,  
  size: 0.5,  
  height: 0.1,  
  depth: 0.02, // ✅ Fixes stretch issues  
  bevelEnabled: true,  
  bevelSize: 0.02,  
});

## **🖱️ Step 8: Mouse Scroll Behavior (Zoom vs Scroll)**

Update your event listeners to distinguish between scroll and middle-mouse zoom:

container.addEventListener('wheel', (e) \=\> {  
  if (e.ctrlKey || e.metaKey) return; // allow pinch zoom

  if (e.buttons \=== 4\) {  
    // mouse middle button held — allow zoom via OrbitControls  
    return;  
  }

  e.preventDefault();  
  const direction \= e.deltaY \> 0 ? 1 : \-1;

  if (menu.submenuOpen) {  
    menu.submenu.scroll(direction);  
  } else {  
    menu.rotate(direction);  
  }  
});

## **🧪 Step 9: Test and Export**

Run your local dev server:

npm run dev

Visit `http://localhost:3000/` and confirm the 3D menu loads, scroll spins the wheel, text isn’t distorted, and zoom still works via middle mouse \+ movement.

## **💾 Step 10: Save Working Build**

Zip your build with `node_modules` ignored, and optionally create a starter template repo or `create-watermelon` CLI bootstrapper later.

---

You now have a fully working 3D-powered Shopify Hydrogen frontend using Three.js\!

---

Want to turn this into a template generator CLI next? Say the word and we’ll scaffold it\!

