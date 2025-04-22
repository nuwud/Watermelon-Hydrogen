// filepath: app/components/Carousel3DMount.jsx
import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import ClientOnly from './ClientOnly';
import { setupCarousel } from './Carousel3DPro/main';
import CartDrawerInjector from '../cart/CartDrawerInjector';
import FloatingContentRenderer from './FloatingContentRenderer';
import { useFloatingContentStore } from '../stores/useFloatingContentStore';

export default function Carousel3DMount() {
  const containerRef = useRef();

  // Register the window helper here, outside Canvas but inside ClientOnly
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__wm__ = {
        showContent: (id) => useFloatingContentStore.getState().setActiveContentId(id),
        clearContent: () => useFloatingContentStore.getState().clearActiveContentId(),
      };
      console.warn('✅ window.__wm__ helper registered in Carousel3DMount');

      // Cleanup function to remove the helper when the component unmounts
      return () => {
        delete window.__wm__;
        console.warn('🗑️ window.__wm__ helper removed from Carousel3DMount');
      };
    }
  }, []); // Empty dependency array ensures this runs once on mount

  useEffect(() => {
    if (containerRef.current) {
      setupCarousel(containerRef.current);
    }
    return () => {
      // Clean up if necessary
    };
  }, []);

  return (
    <>
      <ClientOnly>
        <div
          id="carousel-root"
          ref={containerRef}
          style={{ width: '100%', height: '100vh', overflow: 'hidden' }}
        >
          <Canvas>
            <FloatingContentRenderer />
          </Canvas>
        </div>
      </ClientOnly>
      <CartDrawerInjector />
    </>
  );
}
