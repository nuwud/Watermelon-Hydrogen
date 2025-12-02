import { useEffect, useRef } from 'react';

// IMPORTANT: No static imports of THREE.js or Carousel3DPro here!
// All 3D imports must be dynamic to prevent SSR bundling for Cloudflare Workers

const Carousel3DProWrapper = ({ items = [], config = {} }) => {
  const containerRef = useRef(null);
  const carouselRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    let cleanup = null;

    const initCarousel = async () => {
      try {
        // Dynamic imports - only loaded on client
        const [THREE, { Carousel3DPro }] = await Promise.all([
          import('three'),
          import('./Carousel3DPro'),
        ]);

        if (!containerRef.current) return; // Guard against unmount during async

        carouselRef.current = new Carousel3DPro(items, config);

        // ✅ DOM safety check before appending
        if (carouselRef.current?.domElement instanceof HTMLElement) {
          rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
          containerRef.current.appendChild(rendererRef.current.domElement);
        }

        const handleResize = () => {
          if (carouselRef.current?.resize && containerRef.current) {
            carouselRef.current.resize(
              containerRef.current.clientWidth,
              containerRef.current.clientHeight
            );
          }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        cleanup = () => {
          window.removeEventListener('resize', handleResize);
          if (carouselRef.current?.dispose) {
            carouselRef.current.dispose();
          }
        };
      } catch (err) {
        console.error('[Carousel3DProWrapper] Failed to initialize:', err);
      }
    };

    initCarousel();

    return () => {
      if (cleanup) cleanup();
    };
  }, [items, config]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default Carousel3DProWrapper;
