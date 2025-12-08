# **🛠️ Hydrogen \+ Three.js Universal Integration Guide**

This guide walks you through the **universal method** to embed any Three.js experience (custom menu, scene, animation, or product interaction) inside a modern **Shopify Hydrogen** 2025+ storefront, with full SSR safety and developer flexibility. This tutorial is framework-agnostic regarding the 3D content and aims to be reusable for any Three.js implementation.

---

## **🧩 1\. Initial Setup**

### **✅ Requirements**

* Node.js ≥ v18

* Shopify CLI (`npm i -g @shopify/cli @shopify/theme`)

* GitHub Copilot (optional)

* VSCode or modern IDE

### **🚀 Create Your Hydrogen App**

shopify create hydrogen \-t hydrogen  
cd hydrogen  
npm install

### **🔧 Enable TypeScript and Tailwind (optional but recommended)**

If not already scaffolded:

npm install \-D tailwindcss postcss autoprefixer  
npx tailwindcss init \-p

Update `tailwind.config.js` and `app/styles/tailwind.css` accordingly.

---

## **🎬 2\. Add Three.js to Your Hydrogen App**

### **📦 Install Three.js**

npm install three

---

## **🧱 3\. Create a `ClientOnly` Safe Mount**

React SSR will break if you try to mount WebGL (like Three.js) on the server. Use this method to load Three.js **only on the client**.

### **🧩 `ClientOnly.jsx`**

import { useEffect, useState } from 'react';

export default function ClientOnly({ children }) {  
  const \[mounted, setMounted\] \= useState(false);

  useEffect(() \=\> {  
    setMounted(true);  
  }, \[\]);

  return mounted ? children : null;  
}

---

## **🖼️ 4\. Create Your 3D Canvas Component**

This will house your Three.js logic.

### **📄 `ThreeCanvas.jsx`**

import { useRef, useEffect } from 'react';  
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

    const light \= new THREE.PointLight(0xffffff, 1, 100);  
    light.position.set(10, 10, 10);  
    scene.add(light);

    function animate() {  
      requestAnimationFrame(animate);  
      cube.rotation.x \+= 0.01;  
      cube.rotation.y \+= 0.01;  
      renderer.render(scene, camera);  
    }  
    animate();

    const handleResize \= () \=\> {  
      camera.aspect \= window.innerWidth / window.innerHeight;  
      camera.updateProjectionMatrix();  
      renderer.setSize(window.innerWidth, window.innerHeight);  
    };

    window.addEventListener('resize', handleResize);

    return () \=\> {  
      window.removeEventListener('resize', handleResize);  
      container.removeChild(renderer.domElement);  
    };  
  }, \[\]);

  return \<div ref={containerRef} style={{ width: '100vw', height: '100vh' }} /\>;  
}

---

## **🌐 5\. Inject Into Hydrogen Route**

### **🛤️ Example: Home Page (`routes/_index.jsx`)**

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

## **🧪 6\. Test It Out**

npm run dev

Visit `http://localhost:3000` to see your 3D scene fully mounted inside your Hydrogen store. From here, you can build:

* Product viewers

* Menus

* Animations

* Hover and scroll triggers

* Sound-reactive visuals

All using **standard Three.js** tools.

---

## **✅ Optional Add-Ons**

* `gsap` for animations

* `three/examples/jsm/controls/OrbitControls.js`

* `stats.js` or `dat.gui` for debugging

---

## **🔁 Recap Checklist**

* Create Hydrogen project

* Install Three.js

* Create ClientOnly mount

* Build a canvas wrapper with Three.js code

* Render inside route with SSR-safety

You now have a **Hydrogen \+ Three.js** boilerplate you can duplicate for any Shopify storefront with immersive 3D capabilities 🚀

