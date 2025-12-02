import {useEffect, useRef, useState, lazy, Suspense} from 'react';
import ClientOnly from './ClientOnly';
import {BackgroundStage} from './backgrounds/BackgroundStage';
import * as menuTransformUtils from '../utils/menuTransform';
import '../utils/menuTestUtils';
import '../utils/integrationTests';

// Lazy load Carousel3DProWrapper to avoid SSR bundling of THREE.js
const Carousel3DProWrapper = lazy(() => import('./Carousel3DPro/Carousel3DProWrapper'));

export function Carousel3DMenu({menuData}) {
  const containerRef = useRef(null);
  const carouselInstanceRef = useRef(null);
  const [isClientReady, setIsClientReady] = useState(false);

  // Mark as ready on client-side only
  useEffect(() => {
    setIsClientReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadCarousel = async () => {
      try {
        // Dynamic imports to avoid global scope issues in Cloudflare Workers
        const THREE = await import('three');
        const {gsap} = await import('gsap');
        const {OrbitControls} = await import('three/examples/jsm/controls/OrbitControls.js');
        
        window.THREE = THREE;
        window.gsap = gsap;
        window.OrbitControls = OrbitControls;

        const {mountCarousel3D} = await import('./Carousel3DPro/main.js');

        if (containerRef.current && !carouselInstanceRef.current) {
          carouselInstanceRef.current = mountCarousel3D(containerRef.current, menuData);
          window.debugCarousel = carouselInstanceRef.current;
          window.menuTransformUtils = menuTransformUtils;

          console.warn('[Menu] Carousel initialized with menu data:', {
            hasMenuData: !!menuData,
            itemCount: menuData?.items?.length || 0,
          });
        }
      } catch (err) {
        console.error('[Error] Error loading carousel:', err);
      }
    };

    loadCarousel();

    return () => {
      if (carouselInstanceRef.current?.dispose) {
        carouselInstanceRef.current.dispose();
        carouselInstanceRef.current = null;
      }
    };
  }, [menuData]);

  const items = menuData?.items || ['Item 1', 'Item 2', 'Item 3'];

  return (
    <ClientOnly fallback={<div style={{color: 'orange'}}>Hydrating Client View...</div>}>
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
          <BackgroundStage />
          {isClientReady && (
            <Suspense fallback={<div style={{color: 'cyan'}}>Loading 3D...</div>}>
              <Carousel3DProWrapper items={items} />
            </Suspense>
          )}
        </div>
      )}
    </ClientOnly>
  );
}
