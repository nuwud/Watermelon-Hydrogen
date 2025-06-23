// app/components/Carousel3DMenu.jsx
import {useEffect, useRef} from 'react';
import ClientOnly from './ClientOnly';
import Carousel3DProWrapper from './Carousel3DPro/Carousel3DProWrapper';
import * as menuTransformUtils from '../utils/menuTransform';
import '../utils/menuTestUtils'; // Import test utilities
import '../utils/integrationTests'; // Import integration tests

export function Carousel3DMenu({ menuData }) {
  const containerRef = useRef(null);
  const carouselInstanceRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Rest of effect...

    const loadGSAP = async () => {
      if (window.gsap) return window.gsap;
      try {
        const gsap = await import('gsap');
        window.gsap = gsap.default;
        return gsap.default;
      } catch (err) {
        console.error('Failed to load GSAP:', err);
        throw err;
      }
    };    

    const loadCarousel = async () => {
      try {
        await loadGSAP();
        const THREE = await import('three');
        window.THREE = THREE;

        const [OrbitControlsModule, {setupCarousel}] = await Promise.all([
          import('three/examples/jsm/controls/OrbitControls.js'),
          import('./Carousel3DPro/main.js'),
        ]);

        window.OrbitControls = OrbitControlsModule.OrbitControls;

        if (containerRef.current && !carouselInstanceRef.current) {
          // Pass menuData to setupCarousel
          carouselInstanceRef.current = setupCarousel(containerRef.current, menuData);
          window.debugCarousel = carouselInstanceRef.current;
          
          // Expose menu transform utilities for testing
          window.menuTransformUtils = menuTransformUtils;
          
          console.warn('[🍉 Menu] Carousel initialized with menu data:', {
            hasMenuData: !!menuData,
            itemCount: menuData?.items?.length || 0
          });
        }
      } catch (err) {
        console.error('🚨 Error loading carousel:', err);
      }
    };

    loadCarousel();

    return () => {
      if (carouselInstanceRef.current?.dispose) {
        carouselInstanceRef.current.dispose();
        carouselInstanceRef.current = null;
      }
    };
  }, [menuData]); // Add menuData to dependency array

  // Use dynamic menu items if available, otherwise fallback
  const items = menuData?.items || ['Item 1', 'Item 2', 'Item 3'];
  
  return (
    <ClientOnly fallback={<div style={{ color: 'orange' }}>🌀 Hydrating Client View…</div>}>
      {() => (
        <div
          id="carousel-container"
          ref={containerRef}
          style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: 'black',
            color: 'lime',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          
          <Carousel3DProWrapper items={items} />
        </div>
      )}
    </ClientOnly>
  );
  
}