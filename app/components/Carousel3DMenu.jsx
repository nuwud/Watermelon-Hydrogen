// app/components/Carousel3DMenu.jsx
import {useEffect, useRef} from 'react';
import {ClientOnly} from '@shopify/hydrogen';

export function Carousel3DMenu() {
  const containerRef = useRef(null);
  const carouselInstanceRef = useRef(null);

  useEffect(() => {
    // This ensures we're only running in the browser
    if (typeof window === 'undefined') return;

    // Load GSAP first
    const loadGSAP = async () => {
      if (window.gsap) return window.gsap;
      
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
        script.onload = () => resolve(window.gsap);
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    // Load Three.js and initialize carousel
    const loadCarousel = async () => {
      try {
        await loadGSAP();
        console.log('GSAP loaded successfully');
        
        // Dynamic import Three.js
        const THREE = await import('three');
        window.THREE = THREE;
        
        // Import needed modules dynamically
        const [OrbitControlsModule, {setupCarousel}] = await Promise.all([
          import('three/examples/jsm/controls/OrbitControls.js'),
          import('./Carousel3DPro/main.js')
        ]);
        
        // Make OrbitControls globally available if needed
        window.OrbitControls = OrbitControlsModule.OrbitControls;
        
        // Initialize carousel
        if (containerRef.current && !carouselInstanceRef.current) {
          carouselInstanceRef.current = setupCarousel(containerRef.current);
          console.log('Carousel initialized successfully!');
          
          // Force initial rotation and update
          if (carouselInstanceRef.current?.carousel?.itemGroup) {
            carouselInstanceRef.current.carousel.itemGroup.rotation.set(0, 0, 0);
            carouselInstanceRef.current.carousel.update();
          }

          window.debugCarousel = carouselInstanceRef.current;
        }
      } catch (error) {
        console.error('Error loading carousel:', error);
      }
    };

    loadCarousel();

    // Cleanup function
    return () => {
      if (carouselInstanceRef.current?.dispose) {
        carouselInstanceRef.current.dispose();
        carouselInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <ClientOnly fallback={<div>Loading 3D Menu...</div>}>
      {() => (
        <div 
          ref={containerRef} 
          style={{
            width: '100vw',
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            overflow: 'hidden',
            zIndex: 10
          }}
        />
      )}
    </ClientOnly>
  );
}