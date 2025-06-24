/**
 * Quick Cart Integration Enhancement
 * Add this to your main.js or create as separate utility
 */

export function enhanceCartIntegration() {
  console.log('🛒 Enhancing Cart Integration...');
  
  // 1. Listen for cart updates from Hydrogen
  if (typeof window !== 'undefined') {
    
    // Enhanced cart data detection
    function detectCartData() {
      // Check multiple sources for cart data
      const cartSources = [
        () => window.cartData,
        () => window.hydrogenCart,
        () => window.__HYDROGEN_CART__,
        () => document.querySelector('[data-cart-data]')?.dataset.cartData
      ];
      
      for (const getCart of cartSources) {
        try {
          const cartData = getCart();
          if (cartData && (cartData.lines || cartData.totalQuantity)) {
            console.log('✅ Cart data detected:', cartData);
            return cartData;
          }
        } catch {
          // Silent fail, try next source
        }
      }
      return null;
    }
    
    // 2. Enhanced cart change detection
    let lastCartState = null;
    
    function checkCartChanges() {
      const currentCartData = detectCartData();
      const currentState = currentCartData ? 
        `${currentCartData.totalQuantity || 0}_${currentCartData.cost?.totalAmount?.amount || '0'}` : 
        'empty';
        
      if (currentState !== lastCartState) {
        console.log('🔄 Cart state changed:', currentState);
        lastCartState = currentState;
        
        // Update content manager cache
        if (window.contentManager) {
          window.contentManager.clearCache();
          console.log('🗑️ Cart cache cleared for fresh data');
        }
        
        // Update 3D display if cart is currently shown
        if (window.loadContentForItem && window.currentContentItem === 'Cart') {
          window.loadContentForItem('Cart');
          console.log('🎯 Cart display refreshed');
        }
        
        // Dispatch custom event for other systems
        window.dispatchEvent(new CustomEvent('watermelon-cart-updated', {
          detail: { cartData: currentCartData, state: currentState }
        }));
      }
    }
    
    // 3. Start monitoring cart changes
    setInterval(checkCartChanges, 1000); // Check every second
    
    // 4. Also listen for form submissions (add to cart actions)
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (form.querySelector('input[name="lines"]')) {
        console.log('🛒 Add to cart form submitted');
        // Delay check to allow cart update
        setTimeout(checkCartChanges, 500);
      }
    });
    
    // 5. Listen for Hydrogen cart events (if available)
    ['cart:updated', 'cart:changed', 'hydrogen:cart:updated'].forEach(eventName => {
      window.addEventListener(eventName, (event) => {
        console.log(`📡 Cart event detected: ${eventName}`, event.detail);
        setTimeout(checkCartChanges, 100);
      });
    });
    
    console.log('✅ Cart integration enhanced - monitoring cart changes');
    
    // Initial check
    checkCartChanges();
  }
}

// Auto-run enhancement
if (typeof window !== 'undefined') {
  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceCartIntegration);
  } else {
    enhanceCartIntegration();
  }
}

export default enhanceCartIntegration;
