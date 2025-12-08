# **📘 Hydrogen \+ Three.js Integration – Expanded Developer Tutorial**

This is a full-spectrum walkthrough for integrating **Three.js into Shopify Hydrogen** apps (2025+) in a **universal, reusable** fashion. Perfect for devs aiming to embed immersive 3D UI, product explorers, or animated scenes into Shopify storefronts.

---

## **🎯 Goal**

Set up a safe, production-ready scaffold to:

* Mount any Three.js scene into Hydrogen routes

* Avoid SSR/hydration errors

* Enable fast iteration with reusable patterns

---

## **1️⃣ Create Hydrogen App & Base Stack**

### **🔨 Prerequisites**

* Node.js ≥ 18

* Shopify CLI (`npm i -g @shopify/cli`)

* VSCode w/ GitHub Copilot (optional)

### **💻 Init App**

shopify create hydrogen \-t hydrogen  
cd hydrogen  
npm install

### **➕ Add Tailwind (Optional but Useful)**

npm install \-D tailwindcss postcss autoprefixer  
npx tailwindcss init \-p

Add to `tailwind.config.js`:

content: \['./app/\*\*/\*.{js,ts,jsx,tsx}'\]

Create `/app/styles/tailwind.css` and import it into `root.jsx`.

---

## **2️⃣ Install Three.js**

npm install three

You can also install GSAP, OrbitControls, or other tools:

npm install gsap

---

## **3️⃣ Create a Client-Side Only Wrapper**

Hydrogen uses Remix SSR. We **must isolate Three.js logic to the client** to prevent hydration mismatches.

### **📁 `/app/components/ClientOnly.jsx`**

import { useEffect, useState } from 'react';

export default function ClientOnly({ children }) {  
  const \[mounted, setMounted\] \= useState(false);

  useEffect(() \=\> setMounted(true), \[\]);  
  return mounted ? children : null;  
}

---

## **4️⃣ Build a Reusable Canvas Component**

### **📁 `/app/components/ThreeCanvas.jsx`**

import { useEffect, useRef } from 'react';  
import \* as THREE from 'three';

export default function ThreeCanvas() {  
  const containerRef \= useRef(null);

  useEffect(() \=\> {  
    const container \= containerRef.current;  
    const scene \= new THREE.Scene();  
    const camera \= new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);  
    camera.position.z \= 5;

    const renderer \= new THREE.WebGLRenderer({ antialias: true });  
    renderer.setSize(window.innerWidth, window.innerHeight);  
    container.appendChild(renderer.domElement);

    const geometry \= new THREE.BoxGeometry();  
    const material \= new THREE.MeshStandardMaterial({ color: 0x66ccff });  
    const cube \= new THREE.Mesh(geometry, material);  
    scene.add(cube);

    const light \= new THREE.PointLight(0xffffff, 1);  
    light.position.set(10, 10, 10);  
    scene.add(light);

    const animate \= () \=\> {  
      requestAnimationFrame(animate);  
      cube.rotation.x \+= 0.01;  
      cube.rotation.y \+= 0.01;  
      renderer.render(scene, camera);  
    };  
    animate();

    const onResize \= () \=\> {  
      camera.aspect \= window.innerWidth / window.innerHeight;  
      camera.updateProjectionMatrix();  
      renderer.setSize(window.innerWidth, window.innerHeight);  
    };  
    window.addEventListener('resize', onResize);

    return () \=\> {  
      window.removeEventListener('resize', onResize);  
      container.removeChild(renderer.domElement);  
    };  
  }, \[\]);

  return \<div ref={containerRef} style={{ width: '100vw', height: '100vh' }} /\>;  
}

---

## **5️⃣ Embed in Route (e.g. Homepage)**

### **📁 `/app/routes/_index.jsx`**

import ClientOnly from '\~/components/ClientOnly';  
import ThreeCanvas from '\~/components/ThreeCanvas';

export default function Index() {  
  return (  
    \<ClientOnly\>  
      \<ThreeCanvas /\>  
    \</ClientOnly\>  
  );  
}

---

## **6️⃣ Preview & Iterate**

npm run dev

Open `http://localhost:3000` to see your Hydrogen site with your 3D content mounted.

You now have a **stable, reusable base** to:

* Swap scenes

* Import custom shaders

* Inject Shopify metafields into 3D

* Add product models or variant animations

---

## **🔁 Reusability Patterns**

* Use `ThreeCanvas.jsx` as a base for:

  * `ProductViewer3D.jsx`

  * `InteractiveMenu3D.jsx`

  * `AnimatedHeaderCanvas.jsx`

* Replace core logic inside `useEffect` with any custom scene system

* Use Zustand, Redux, or Shopify Cart APIs to feed 3D scenes with dynamic content

---

## **🧠 Advanced Tools**

* **GLTFLoader**: For importing models

* **OrbitControls**: For free navigation

* **GSAP**: For smooth animation timelines

* **R3F (React Three Fiber)**: If desired in React-native approach (Hydrogen v4+ supports modular hydration)

---

## **✅ Summary Checklist**

* Created Hydrogen app

* Added Three.js

* Scoped 3D logic to client with `<ClientOnly>`

* Built a self-cleaning Three.js mount

* Injected into any Hydrogen route

* Now ready to scale 3D interactions across the Shopify storefront

---

Let this be your blueprint for fusing Shopify commerce with powerful 3D frontends. Clone it, fork it, or abstract it into a package. You’re now in full control of immersive Shopify UI.

