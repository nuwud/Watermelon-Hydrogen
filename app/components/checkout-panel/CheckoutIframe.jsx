import {useEffect, useRef, useState} from 'react';
import {isValidCheckoutOrigin} from '~/utils/checkoutManager';

/**
 * CheckoutIframe Component
 * Renders Shopify checkout in an iframe with security and timeout handling
 * @param {Object} props
 * @param {string} props.checkoutUrl - Shopify checkout URL
 * @param {Function} props.onLoad - Callback when iframe loads
 * @param {Function} props.onError - Callback on error
 * @param {Function} props.onComplete - Callback when checkout completes
 */
export function CheckoutIframe({checkoutUrl, onLoad, onError, onComplete}) {
  const iframeRef = useRef(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Set timeout for iframe load (30 seconds)
    timeoutRef.current = setTimeout(() => {
      if (iframeRef.current && !iframeRef.current.contentWindow) {
        console.warn('[Checkout Iframe] Load timeout');
        setHasTimedOut(true);
        onError(new Error('Checkout took too long to load'));
      }
    }, 30000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onError]);

  // Listen for postMessage events from checkout iframe
  useEffect(() => {
    const handleMessage = (event) => {
      // Validate origin for security
      if (!isValidCheckoutOrigin(event.origin)) {
        console.warn('[Checkout Iframe] Invalid origin:', event.origin);
        return;
      }

      // Handle checkout completion messages
      if (event.data && typeof event.data === 'object') {
        const {type, action} = event.data;

        // Shopify checkout completion events
        if (type === 'checkout.completed' || action === 'checkout_completed') {
          console.log('[Checkout Iframe] Checkout completed');
          onComplete();
        }

        // Shopify checkout cancelled events
        if (type === 'checkout.cancelled' || action === 'checkout_cancelled') {
          console.log('[Checkout Iframe] Checkout cancelled');
          onError(new Error('Checkout was cancelled'));
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onComplete, onError]);

  const handleLoad = () => {
    // Clear timeout on successful load
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    console.log('[Checkout Iframe] Loaded successfully');
    onLoad();
  };

  const handleError = () => {
    console.error('[Checkout Iframe] Failed to load');
    onError(new Error('Failed to load checkout iframe'));
  };

  if (hasTimedOut) {
    return null; // Let parent component show fallback
  }

  return (
    <iframe
      ref={iframeRef}
      src={checkoutUrl}
      title="Shopify Checkout"
      className="checkout-iframe"
      onLoad={handleLoad}
      onError={handleError}
      // Security attributes
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
      allow="payment"
      // Styling
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        borderRadius: '0 0 12px 12px',
      }}
    />
  );
}
