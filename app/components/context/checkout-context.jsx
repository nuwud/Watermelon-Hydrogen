import { createContext, useContext, useState, useEffect } from 'react';

/**
 * Checkout Context - Manages checkout panel state and configuration
 * @module checkout-context
 */

const CheckoutContext = createContext();

/**
 * Hook to access checkout context
 * @returns {Object} Checkout context value
 */
export const useCheckout = () => {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error('useCheckout must be used within CheckoutProvider');
  }
  return context;
};

/**
 * Checkout Provider Component
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export const CheckoutProvider = ({ children }) => {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [animationStyle, setAnimationStyleState] = useState('dramatic');
  const [checkoutMode, setCheckoutModeState] = useState('center-panel');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load configuration from localStorage on mount (SSR-safe)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedStyle = localStorage.getItem('watermelon-checkout-animation-style');
        const savedMode = localStorage.getItem('watermelon-checkout-mode');
        
        if (savedStyle) setAnimationStyleState(savedStyle);
        if (savedMode) setCheckoutModeState(savedMode);
      } catch (err) {
        console.warn('[Checkout Context] Failed to load config from localStorage:', err);
      }
    }
  }, []);

  /**
   * Open checkout with given URL
   * @param {string} url - Checkout URL from Shopify
   */
  const openCheckout = (url) => {
    if (!url) {
      console.error('[Checkout Context] Cannot open checkout: URL is missing');
      setError('Checkout URL is missing');
      return;
    }

    // Handle full-page mode - immediate redirect
    if (checkoutMode === 'full-page') {
      window.location.href = url;
      return;
    }

    // Handle center-panel and overlay-modal modes
    setCheckoutUrl(url);
    setIsCheckoutOpen(true);
    setError(null);
  };

  /**
   * Close checkout panel
   */
  const closeCheckout = () => {
    setIsCheckoutOpen(false);
    setCheckoutUrl(null);
    setError(null);
  };

  /**
   * Set animation style and persist to localStorage
   * @param {string} style - One of: 'dramatic', 'subtle', 'elegant'
   */
  const setAnimationStyle = (style) => {
    const validStyles = ['dramatic', 'subtle', 'elegant'];
    if (!validStyles.includes(style)) {
      console.warn(`[Checkout Context] Invalid animation style: ${style}`);
      return;
    }

    setAnimationStyleState(style);
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('watermelon-checkout-animation-style', style);
      } catch (err) {
        console.warn('[Checkout Context] Failed to save animation style:', err);
      }
    }
  };

  /**
   * Set checkout mode and persist to localStorage
   * @param {string} mode - One of: 'center-panel', 'overlay-modal', 'full-page'
   */
  const setCheckoutMode = (mode) => {
    const validModes = ['center-panel', 'overlay-modal', 'full-page'];
    if (!validModes.includes(mode)) {
      console.warn(`[Checkout Context] Invalid checkout mode: ${mode}`);
      return;
    }

    setCheckoutModeState(mode);
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('watermelon-checkout-mode', mode);
      } catch (err) {
        console.warn('[Checkout Context] Failed to save checkout mode:', err);
      }
    }
  };

  /**
   * Preview animation without opening checkout
   * @param {string} style - Animation style to preview
   */
  const previewAnimation = (style) => {
    console.log('[Checkout Context] Preview animation:', style);
    // This will be implemented with actual animation logic in Phase 4
    // For now, just log the preview request
  };

  const value = {
    // State
    isCheckoutOpen,
    checkoutUrl,
    animationStyle,
    checkoutMode,
    isLoading,
    error,
    
    // Actions
    openCheckout,
    closeCheckout,
    setAnimationStyle,
    setCheckoutMode,
    previewAnimation,
    setIsLoading,
    setError,
  };

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
};
