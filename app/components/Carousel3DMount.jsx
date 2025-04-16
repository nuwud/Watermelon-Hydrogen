import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import ClientOnly from './ClientOnly';
import { setupCarousel } from './Carousel3DPro/main';
import CartDrawerInjector from '../cart/CartDrawerInjector';
import CartDrawer3D from '../components/cart-drawers/CartDrawer3D';
import FloatingContentRenderer from './FloatingContentRenderer'; // Import the new component

export default function Carousel3DMount() {
  const containerRef = useRef();

  useEffect(() => {
    if (containerRef.current) {
      setupCarousel(containerRef.current);
    }
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
            {/* Your scene components */}
            <FloatingContentRenderer />
          </Canvas>
        </div>
      </ClientOnly>
      <CartDrawerInjector />
      <CartDrawer3D />
    </>
  );
}