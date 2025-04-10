## **🧱 Expanded Universal Hydrogen \+ Three.js Integration (Pro Edition)**

This companion guide will **build on your working canvas** and show **how to streamline, document, and scale** any Shopify \+ Three.js integration — turning your WatermelonOS blueprint into a repeatable pipeline.

---

### **🚀 1\. Project Initialization (Reinforced)**

#### **Scaffold from Shopify Hydrogen**

shopify create hydrogen \-t hydrogen  
cd hydrogen  
npm install

#### **Setup Modern UI Stack (optional but ideal)**

npm install \-D tailwindcss postcss autoprefixer  
npx tailwindcss init \-p

Edit `tailwind.config.js` and set `content` path to:

content: \['./app/\*\*/\*.{js,jsx,ts,tsx}'\],

---

### **📦 2\. Install Core Dependencies**

npm install three

If using advanced controls:

npm install gsap

---

### **💡 3\. Create `ClientOnly.jsx` Wrapper**

Three.js must only mount **client-side** to avoid SSR hydration mismatch.

import { useState, useEffect } from 'react';

export default function ClientOnly({ children }) {  
  const \[mounted, setMounted\] \= useState(false);  
  useEffect(() \=\> setMounted(true), \[\]);  
  return mounted ? children : null;  
}

✅ **Drop this into `/app/components/ClientOnly.jsx`**

---

### **🖼️ 4\. Universal ThreeCanvas Template**

This is your *blank slate* for any Three.js experience.

import { useEffect, useRef } from 'react';  
import \* as THREE from 'three';

export default function ThreeCanvas() {  
  const mountRef \= useRef(null);

  useEffect(() \=\> {  
    const container \= mountRef.current;  
    const scene \= new THREE.Scene();  
    const camera \= new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);  
    camera.position.z \= 5;

    const renderer \= new THREE.WebGLRenderer({ antialias: true });  
    renderer.setSize(window.innerWidth, window.innerHeight);  
    container.appendChild(renderer.domElement);

    const cube \= new THREE.Mesh(  
      new THREE.BoxGeometry(),  
      new THREE.MeshStandardMaterial({ color: 0x66ccff })  
    );  
    scene.add(cube);

    const light \= new THREE.DirectionalLight(0xffffff, 1);  
    light.position.set(5, 5, 5);  
    scene.add(light);

    function animate() {  
      requestAnimationFrame(animate);  
      cube.rotation.y \+= 0.01;  
      renderer.render(scene, camera);  
    }  
    animate();

    const resize \= () \=\> {  
      camera.aspect \= window.innerWidth / window.innerHeight;  
      camera.updateProjectionMatrix();  
      renderer.setSize(window.innerWidth, window.innerHeight);  
    };

    window.addEventListener('resize', resize);  
    return () \=\> {  
      window.removeEventListener('resize', resize);  
      container.removeChild(renderer.domElement);  
    };  
  }, \[\]);

  return \<div ref={mountRef} className="fixed top-0 left-0 w-screen h-screen z-\[-1\]" /\>;  
}

---

### **🛤️ 5\. Mount in Any Route**

**Example**: `_index.jsx` or any product route.

import ClientOnly from '\~/components/ClientOnly';  
import ThreeCanvas from '\~/components/ThreeCanvas';

export default function Home() {  
  return (  
    \<\>  
      \<ClientOnly\>  
        \<ThreeCanvas /\>  
      \</ClientOnly\>  
    \</\>  
  );  
}

---

### **🔄 6\. GitHub Copilot Prompt to Bootstrap Future Projects**

// @copilot  
// Scaffold a Shopify Hydrogen v2025.1+ app with SSR-safe Three.js integration:  
// 1\. Install Three.js.  
// 2\. Create ClientOnly wrapper to prevent hydration mismatch.  
// 3\. Make a full-window ThreeCanvas with camera, resize handler, renderer mount, and scene render loop.  
// 4\. Inject into \_index.jsx inside ClientOnly.

---

### **🧠 BONUS: Scale-Up Checkpoint**

Want to scale this to a full product viewer, configurator, or animation tool?

Drop these into your next steps:

* `GLTFLoader` from `three/examples/jsm/loaders/GLTFLoader.js`

* OrbitControls or DragControls

* Pointer \+ Raycaster interactivity

* Shopify metafields injected as props

---

### **✅ Final Developer Checklist**

| ✅ Task | Description |
| ----- | ----- |
| ✔️ Shopify Hydrogen 2025+ initialized | `shopify create hydrogen` |
| ✔️ Three.js installed | `npm install three` |
| ✔️ `ClientOnly` added | Prevents SSR issues |
| ✔️ `ThreeCanvas.jsx` built | Contains full WebGL mount logic |
| ✔️ Route rendered client-only | App uses `<ClientOnly>` on any route |
| ✔️ Scene renders & is responsive | Includes resize listener |

---

Would you like this expanded into a downloadable PDF or `.md` for inclusion in future repo README files? I can prepare that next, or help you convert it into a Hydrogen-compatible GitHub template with full starter code.

Let’s make this a one-command project template for your whole team or clients 💥

