import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

const rotateObject = (object, duration, repeat = -1) => {
    gsap.to(object.rotation, {
        duration,
        y: Math.PI * 2, // Rotate 360 degrees
        repeat,
        ease: "linear"
    });
};

const Carousel3D = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    // 1. Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    // 2. Get container and set renderer size
    const container = containerRef.current;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 3. Your carousel setup (from your existing code)
    // Example: const carousel = new Carousel3DPro(...);
    // scene.add(carousel);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
    scene.add(cube);
    rotateObject(cube, 2);
    camera.position.z = 5;
    // 4. Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      // carousel.update();
      renderer.render(scene, camera);
    };
    animate();

    // 5. Clean up function
    return () => {
      // Dispose of Three.js resources here!
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      // Example: carousel.dispose();
      renderer.dispose();
    };
  }, []); // Empty dependency array runs this effect only once

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }}></div>;
};

export default Carousel3D;