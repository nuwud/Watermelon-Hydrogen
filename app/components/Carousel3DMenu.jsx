// app/components/Carousel3DMenu.jsx
import {useEffect, useRef} from 'react';
import ClientOnly from './ClientOnly';

export function Carousel3DMenu() {
  const containerRef = useRef(null);
  const carouselInstanceRef = useRef(null);

  useEffect(() => {
    console.warn('[Carousel3DMenu] useEffect triggered');

    if (typeof window === 'undefined') {
      console.warn('[Carousel3DMenu] Skipping init – window is undefined (SSR)');
      return;
    }

    const loadGSAP = async () => {
      if (window.gsap) return window.gsap;

      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
        script.onload = () => {
          console.warn('[GSAP] Loaded successfully');
          resolve(window.gsap);
        };
        script.onerror = (err) => {
          console.error('[GSAP] Failed to load', err);
          reject(err);
        };
        document.head.appendChild(script);
      });
    };

    const loadCarousel = async () => {
      try {
        await loadGSAP();

        const THREE = await import('three');
        window.THREE = THREE;
        console.warn('[THREE] Loaded and assigned to window');

        const [OrbitControlsModule, {setupCarousel}] = await Promise.all([
          import('three/examples/jsm/controls/OrbitControls.js'),
          import('./Carousel3DPro/main.js'),
        ]);

        window.OrbitControls = OrbitControlsModule.OrbitControls;

        if (!containerRef.current) {
          console.error('[Carousel3DMenu] containerRef.current is null!');
          return;
        }

        console.warn('[Carousel3DMenu] Calling setupCarousel with:', containerRef.current);
        carouselInstanceRef.current = setupCarousel(containerRef.current);

        if (carouselInstanceRef.current?.carousel?.itemGroup) {
          carouselInstanceRef.current.carousel.itemGroup.rotation.set(0, 0, 0);
          carouselInstanceRef.current.carousel.update();
        }

        window.debugCarousel = carouselInstanceRef.current;
        console.warn('[Carousel3DMenu] Carousel initialized and attached to window.debugCarousel');

      } catch (error) {
        console.error('[Carousel3DMenu] Error loading carousel:', error);
      }
    };

    // Slight delay to ensure container DOM is mounted
    requestAnimationFrame(() => {
      if (containerRef.current) {
        loadCarousel();
      } else {
        console.warn('[Carousel3DMenu] requestAnimationFrame: containerRef still null');
      }
    });

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
          id="carousel-container"
          ref={containerRef}
          style={{
            width: '100vw',
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            overflow: 'hidden',
            background: '#000',
            zIndex: 10,
          }}
        >
          <p style={{color: '#fff', padding: '1rem'}}>3D Menu Loading...</p>
        </div>
      )}
    </ClientOnly>
  );
}
