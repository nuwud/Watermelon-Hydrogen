import {useEffect, useState, useCallback} from 'react';
import {CheckoutIframe} from './CheckoutIframe';
import {CheckoutPanelSkeleton} from './CheckoutPanelSkeleton';
import './CheckoutPanel.css';

/**
 * CheckoutPanel Component
 * Displays Shopify checkout in a centered panel overlay
 * @param {Object} props
 * @param {string} props.checkoutUrl - Shopify checkout URL
 * @param {Function} props.onClose - Callback when panel closes
 * @param {string} props.animationStyle - Animation style ('dramatic', 'subtle', 'elegant')
 * @param {string} props.mode - Checkout mode ('center-panel', 'overlay-modal')
 */
export function CheckoutPanel({checkoutUrl, onClose, mode = 'center-panel'}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFallback, setShowFallback] = useState(false);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  // Handle iframe error
  const handleIframeError = useCallback((err) => {
    console.error('[Checkout Panel] Iframe error:', err);
    setIsLoading(false);
    setError(err.message || 'Failed to load checkout');
    setShowFallback(true);
  }, []);

  // Handle checkout completion
  const handleCheckoutComplete = useCallback(() => {
    console.log('[Checkout Panel] Checkout completed');
    // Could show success message here before closing
    setTimeout(() => {
      onClose();
    }, 1000);
  }, [onClose]);

  // Handle backdrop click (close on click outside)
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div 
      className={`checkout-panel-backdrop ${mode}`}
      onClick={handleBackdropClick}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
      tabIndex={-1}
    >
      <div className={`checkout-panel ${mode}`}>
        {/* Close button */}
        <button
          className="checkout-panel-close"
          onClick={onClose}
          aria-label="Close checkout"
          title="Close checkout (Esc)"
        >
          ×
        </button>

        {/* Header */}
        <div className="checkout-panel-header">
          <h2>Checkout</h2>
        </div>

        {/* Content */}
        <div className="checkout-panel-content">
          {isLoading && <CheckoutPanelSkeleton />}
          
          {error && showFallback && (
            <div className="checkout-panel-error">
              <h3>Unable to load checkout</h3>
              <p>{error}</p>
              <a 
                href={checkoutUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="checkout-fallback-button"
              >
                Open checkout in new tab
              </a>
            </div>
          )}

          {!showFallback && (
            <CheckoutIframe
              checkoutUrl={checkoutUrl}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              onComplete={handleCheckoutComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
}
