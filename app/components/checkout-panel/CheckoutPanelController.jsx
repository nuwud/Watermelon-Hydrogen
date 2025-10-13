import {useEffect, useRef} from 'react';
import {useCheckout} from '../context/checkout-context';
import {CheckoutPanelWrapper} from './CheckoutPanelWrapper';
import {animateOpen, animateClose, snapshotCarouselState} from './animations/dramatic';

/**
 * CheckoutPanelController Component
 * Manages checkout panel lifecycle and animations
 * Integrates with checkout context and 3D carousel
 */
export function CheckoutPanelController() {
  const {
    isCheckoutOpen,
    checkoutUrl,
    animationStyle,
    checkoutMode,
    closeCheckout,
  } = useCheckout();

  const timelineRef = useRef(null);
  const savedStateRef = useRef(null);

  // Handle checkout open animation
  useEffect(() => {
    if (isCheckoutOpen && checkoutUrl) {
      console.log('[Checkout Controller] Opening checkout', {
        mode: checkoutMode,
        animationStyle,
      });

      // Skip animations for full-page mode (should redirect instead)
      if (checkoutMode === 'full-page') {
        return;
      }

      // Snapshot carousel state before animation
      savedStateRef.current = snapshotCarouselState();

      // Only animate for center-panel mode
      if (checkoutMode === 'center-panel' && animationStyle === 'dramatic') {
        // Pause 3D rendering during checkout
        if (typeof window !== 'undefined' && window.debugCarousel?.pauseRendering) {
          window.debugCarousel.pauseRendering();
        }

        // Animate carousel items outward
        timelineRef.current = animateOpen(null, {
          duration: 0.8,
          ease: 'power2.out',
          onComplete: () => {
            console.log('[Checkout Controller] Open animation complete');
          },
        });
      }
    }
  }, [isCheckoutOpen, checkoutUrl, checkoutMode, animationStyle]);

  // Handle checkout close
  const handleClose = () => {
    console.log('[Checkout Controller] Closing checkout');

    // Cleanup timeline if it exists
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }

    // Animate back if center-panel mode
    if (checkoutMode === 'center-panel' && animationStyle === 'dramatic') {
      animateClose(null, savedStateRef.current, {
        duration: 0.8,
        ease: 'power2.inOut',
        onComplete: () => {
          console.log('[Checkout Controller] Close animation complete');
          
          // Resume 3D rendering
          if (typeof window !== 'undefined' && window.debugCarousel?.resumeRendering) {
            window.debugCarousel.resumeRendering();
          }
          
          // Clear saved state
          savedStateRef.current = null;
          
          // Close checkout
          closeCheckout();
        },
      });
    } else {
      // For overlay-modal or if no animation, close immediately
      closeCheckout();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
      
      // Resume rendering if it was paused
      if (typeof window !== 'undefined' && window.debugCarousel?.resumeRendering) {
        window.debugCarousel.resumeRendering();
      }
    };
  }, []);

  // Don't render anything if checkout is closed
  if (!isCheckoutOpen || !checkoutUrl) {
    return null;
  }

  // Full-page mode should have already redirected, so don't render panel
  if (checkoutMode === 'full-page') {
    return null;
  }

  return (
    <CheckoutPanelWrapper
      checkoutUrl={checkoutUrl}
      onClose={handleClose}
      animationStyle={animationStyle}
      mode={checkoutMode}
    />
  );
}
