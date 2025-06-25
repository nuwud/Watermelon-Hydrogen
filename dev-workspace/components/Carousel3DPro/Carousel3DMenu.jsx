//import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { ClientOnly } from '../ClientOnly';
import { setupCarousel } from './main';

/**
 * 3D Interactive Carousel Menu component for navigation
 * @returns {JSX.Element} The carousel menu component
 */
function Carousel3DMenu() {
  const containerRef = useRef(null);
  const [carouselControls, setCarouselControls] = useState(null);
  const [error, setError] = useState(null);

  const loadCarousel = async () => {
    if (!containerRef.current) return;
    
    try {
      console.log('Setting up 3D Carousel...');
      const controls = setupCarousel(containerRef.current);
      setCarouselControls(controls);
      console.log('3D Carousel initialized successfully');
    } catch (err) {
      console.error('Failed to initialize 3D Carousel:', err);
      setError(err.message || 'Unknown error initializing carousel');
    }
  };

  useEffect(() => {
    loadCarousel();
  }, []);
  
  useEffect(() => {
    return () => {
      if (carouselControls?.dispose) {
        console.log('Disposing 3D Carousel resources');
        carouselControls.dispose();
      }
    };
  }, [carouselControls]);
  
  // Add debug controls to attach to window for console debugging
  useEffect(() => {
    if (carouselControls) {
      // Expose debug controls to window for console debugging
      window.carouselDebug = carouselControls.debug;
      console.warn('🍉 Carousel debugger attached to window.carouselDebug');
      
      // Inspect scene contents
      carouselControls.debug.listSceneContents();
      
      // Add easier debug
      window.fixCarousel = () => {
        console.warn('🛠️ Running manual carousel repair');
        carouselControls.debug.repairState();
        return 'Repair completed';
      };
    }
  }, [carouselControls]);

  // Add new effect to check carousel visibility periodically
  useEffect(() => {
    if (!carouselControls) return;
    
    const checkCarouselVisibility = () => {
      const { carousel, scene } = carouselControls;
      
      if (!carousel || !scene) return;
      
      if (!carousel.visible) {
        console.warn('🛠️ Carousel not visible - fixing');
        carousel.visible = true;
      }
      
      if (!scene.children.includes(carousel)) {
        console.warn('🛠️ Carousel not in scene - adding it back');
        scene.add(carousel);
      }
    };
    
    // Check initially
    checkCarouselVisibility();
    
    // Set up periodic check
    const intervalId = setInterval(checkCarouselVisibility, 3000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [carouselControls]);

  if (error) {
    return (
      <div className="carousel-error-container">
        <p>Failed to load 3D menu: {error}</p>
        <button onClick={loadCarousel}>Retry</button>
      </div>
    );
  }

  return (
    <ClientOnly>
      <div className="carousel-container" style={{ width: '100%', height: '600px' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Optional debug controls */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="carousel-debug" style={{ position: 'absolute', top: 0, right: 0, zIndex: 100 }}>
            <button 
              onClick={() => window.fixCarousel()} 
              style={{ background: '#ff5959', padding: '5px 10px', borderRadius: '4px' }}
            >
              Fix Carousel
            </button>
          </div>
        )}
      </div>
    </ClientOnly>
  );
}

export default Carousel3DMenu;
