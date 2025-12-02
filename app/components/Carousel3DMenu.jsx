import {useEffect, useRef} from 'react';
import ClientOnly from './ClientOnly';
import Carousel3DProWrapper from './Carousel3DPro/Carousel3DProWrapper';
import {BackgroundStage} from './backgrounds/BackgroundStage';
import * as menuTransformUtils from '../utils/menuTransform';
import '../utils/menuTestUtils';
import '../utils/integrationTests';

export function Carousel3DMenu({menuData}) {
  const containerRef = useRef(null);
  const carouselInstanceRef = useRef(null);

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
          <Carousel3DProWrapper items={items} />
        </div>
      )}
    </ClientOnly>
  );
}
