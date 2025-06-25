// app/components/Carousel3DMenu.jsx
import {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {gsap} from 'gsap';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
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

    const loadCarousel = async () => {
      try {
        // Set up global references for backward compatibility
        window.THREE = THREE;
        window.gsap = gsap;
        window.OrbitControls = OrbitControls;

        // Dynamic import only the main carousel setup function
        const {setupCarousel} = await import('./Carousel3DPro/main.js');

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