import { useEffect, useRef } from 'react';
import ClientOnly from './ClientOnly';
import { setupCarousel } from './Carousel3DPro/main';

export default function Carousel3DMount() {
  const containerRef = useRef();

  useEffect(() => {
    if (containerRef.current) {
      setupCarousel(containerRef.current);
    }
  }, []);

  return (
    <ClientOnly>
      <div ref={containerRef} style={{ width: '100%', height: '100vh', overflow: 'hidden' }} />
    </ClientOnly>
  );
}
