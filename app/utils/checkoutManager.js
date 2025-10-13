import { getEnvPublic } from './env.public';

/**
 * Checkout Manager Utility
 * Handles checkout session creation and URL management
 * @module checkoutManager
 */

/**
 * Create a checkout session for the given cart
 * @param {string} cartId - Shopify cart ID
 * @returns {Promise<{checkoutUrl: string, checkoutId: string}>}
 * @throws {Error} If checkout creation fails
 */
export async function createCheckoutSession(cartId) {
  if (!cartId) {
    throw new Error('[Checkout Manager] Cart ID is required');
  }

  try {
    // Call our API route to create checkout session
    const response = await fetch('/api/checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cartId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Checkout creation failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.checkoutUrl) {
      throw new Error('[Checkout Manager] No checkout URL returned from API');
    }

    return {
      checkoutUrl: data.checkoutUrl,
      checkoutId: data.checkoutId || null,
    };
  } catch (error) {
    console.error('[Checkout Manager] Failed to create checkout session:', error);
    throw error;
  }
}

/**
 * Get checkout URL with proper domain resolution
 * @param {string} checkoutPath - Checkout path from Shopify API
 * @returns {string} Full checkout URL
 */
export function getCheckoutUrl(checkoutPath) {
  if (!checkoutPath) {
    throw new Error('[Checkout Manager] Checkout path is required');
  }

  const envPublic = getEnvPublic();
  
  // If path is already a full URL, return as-is
  if (checkoutPath.startsWith('http://') || checkoutPath.startsWith('https://')) {
    return checkoutPath;
  }

  // Use PUBLIC_CHECKOUT_DOMAIN if available, otherwise fall back to store domain
  const domain = envPublic.PUBLIC_CHECKOUT_DOMAIN || envPublic.PUBLIC_STORE_DOMAIN;
  
  // Ensure path starts with /
  const path = checkoutPath.startsWith('/') ? checkoutPath : `/${checkoutPath}`;
  
  return `https://${domain}${path}`;
}

/**
 * Validate checkout URL origin for security
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is from trusted checkout domain
 */
export function isValidCheckoutOrigin(url) {
  if (!url) return false;

  try {
    const envPublic = getEnvPublic();
    const urlObj = new URL(url);
    const checkoutDomain = envPublic.PUBLIC_CHECKOUT_DOMAIN || envPublic.PUBLIC_STORE_DOMAIN;
    
    return urlObj.hostname === checkoutDomain || 
           urlObj.hostname === envPublic.PUBLIC_STORE_DOMAIN;
  } catch (error) {
    console.error('[Checkout Manager] Invalid URL:', error);
    return false;
  }
}

/**
 * Check if checkout session has expired (30 minutes)
 * @param {number} timestamp - Session creation timestamp
 * @returns {boolean} True if session has expired
 */
export function isCheckoutExpired(timestamp) {
  if (!timestamp) return true;
  
  const THIRTY_MINUTES = 30 * 60 * 1000;
  const now = Date.now();
  
  return (now - timestamp) > THIRTY_MINUTES;
}

/**
 * Get checkout configuration from localStorage (SSR-safe)
 * @returns {Object} Configuration object
 */
export function getCheckoutConfig() {
  if (typeof window === 'undefined') {
    return {
      animationStyle: 'dramatic',
      checkoutMode: 'center-panel',
    };
  }

  try {
    return {
      animationStyle: localStorage.getItem('watermelon-checkout-animation-style') || 'dramatic',
      checkoutMode: localStorage.getItem('watermelon-checkout-mode') || 'center-panel',
    };
  } catch (error) {
    console.warn('[Checkout Manager] Failed to read config:', error);
    return {
      animationStyle: 'dramatic',
      checkoutMode: 'center-panel',
    };
  }
}

/**
 * Save checkout configuration to localStorage (SSR-safe)
 * @param {Object} config - Configuration to save
 * @param {string} config.animationStyle - Animation style
 * @param {string} config.checkoutMode - Checkout mode
 */
export function saveCheckoutConfig(config) {
  if (typeof window === 'undefined') return;

  try {
    if (config.animationStyle) {
      localStorage.setItem('watermelon-checkout-animation-style', config.animationStyle);
    }
    if (config.checkoutMode) {
      localStorage.setItem('watermelon-checkout-mode', config.checkoutMode);
    }
  } catch (error) {
    console.warn('[Checkout Manager] Failed to save config:', error);
  }
}
