// app/components/Carousel3DPro/Carousel3DProWrapper.jsx
import { useEffect, useRef } from 'react';
import { Carousel3DPro } from './Carousel3DPro'; // adjust path as needed

const Carousel3DProWrapper = ({ items = [], config = {} }) => {
  const containerRef = useRef(null);
  const carouselRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    try {
      carouselRef.current = new Carousel3DPro(items, config);
      container.appendChild(carouselRef.current.domElement);

      const handleResize = () => {
        if (carouselRef.current?.resize) {
          carouselRef.current.resize(container.clientWidth, container.clientHeight);
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
    } catch (err) {
      console.error("🔥 Error in Carousel3DProWrapper:", err);
    }
  }, [items, config]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
      id="carousel3dpro-wrapper"
    />
  );
};

export default Carousel3DProWrapper;
