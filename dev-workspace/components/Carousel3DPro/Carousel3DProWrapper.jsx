import { useEffect, useRef } from 'react';
import { Carousel3DPro } from './Carousel3DPro';
import * as THREE from 'three';

const Carousel3DProWrapper = ({ items = [], config = {} }) => {
  const containerRef = useRef(null);
  const carouselRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    carouselRef.current = new Carousel3DPro(items, config);

    // ✅ DOM safety check before appending
    if (carouselRef.current?.domElement instanceof HTMLElement) {
      rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
      containerRef.current.appendChild(rendererRef.current.domElement);
    }

    const handleResize = () => {
      if (carouselRef.current?.resize) {
        carouselRef.current.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (carouselRef.current?.dispose) {
        carouselRef.current.dispose();
      }
    };
  }, [items, config]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default Carousel3DProWrapper;
