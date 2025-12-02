/**
 * Enhanced Cart Integration Test & Development Script
 * Use this to test and enhance the cart functionality
 */

// Enhanced cart testing utilities
export const cartTestUtils = {
  
  /**
   * Add test products to cart (use with real products)
   */
  async addTestProductsToCart() {
    const testProducts = [
      'shopify-hydrogen-3d-guide',
      'build-like-nuwud-systems-book'
    ];
    
    console.log('🛒 Adding test products to cart...');
    
    for (const handle of testProducts) {
      try {
        // This would need to be implemented with your actual add-to-cart system
        console.log(`Adding ${handle} to cart...`);
        // await addToCart(productVariantId);
      } catch (error) {
        console.error(`Error adding ${handle}:`, error);
      }
    }
  },

  /**
   * Test cart state and integration
   */
  testCartIntegration() {
    console.log('🔍 Testing Cart Integration:');
    
    // Test Hydrogen cart hook availability
    if (typeof window !== 'undefined') {
      console.log('1. Window object available:', !!window);
      console.log('2. Cart data sources:');
      console.log('   - window.cartData:', !!window.cartData);
      console.log('   - window.hydrogenCart:', !!window.hydrogenCart);
      console.log('   - window.__HYDROGEN_CART__:', !!window.__HYDROGEN_CART__);
      
      // Test drawer controller
      console.log('3. Drawer Controller:', !!window.drawerController);
      
      // Test content manager cart integration
      console.log('4. Content Manager:', !!window.contentManager);
      
      if (window.contentManager) {
        console.log('   Testing cart content fetch...');
        window.contentManager.getContentData('Cart').then(cartContent => {
          console.log('   Cart Content Result:', cartContent);
        });
      }
    }
  },

  /**
   * Debug current cart state
   */
  debugCartState() {
    if (typeof window !== 'undefined' && window.contentManager) {
      const cacheStatus = window.contentManager.getCacheStatus();
      console.log('📊 Content Manager Cache Status:', cacheStatus);
      
      // Test all cart-related content
      ['Cart', 'Shopify Hydrogen 3D Guide', 'Build Like Nuwud: Systems Book'].forEach(async (item) => {
        const content = await window.contentManager.getContentData(item);
        console.log(`📦 ${item} Content:`, {
          type: content.type,
          isDummy: content.isDummy,
          isShopifyProduct: content.isShopifyProduct,
          isShopifyCart: content.isShopifyCart
        });
      });
    }
  },

  /**
   * Simulate adding products to cart for testing
   */
  simulateCartInteraction() {
    console.log('🎮 Simulating cart interactions...');
    
    // Test drawer opening
    if (window.drawerController) {
      console.log('Testing drawer controller...');
      window.drawerController.openCartDrawer();
      
      setTimeout(() => {
        window.drawerController.closeCartDrawer();
      }, 3000);
    }
    
    // Test content manager cart updates
    if (window.contentManager) {
      // Simulate cart data being available
      window.cartData = {
        lines: [
          {
            id: 'test-line-1',
            quantity: 1,
            merchandise: {
              title: 'Test Variant',
              product: {
                title: 'Shopify Hydrogen 3D Guide'
              },
              image: null
            },
            cost: {
              amountPerQuantity: { amount: '97.00', currencyCode: 'USD' },
              totalAmount: { amount: '97.00', currencyCode: 'USD' }
            }
          }
        ],
        totalQuantity: 1,
        cost: {
          totalAmount: { amount: '97.00', currencyCode: 'USD' },
          subtotalAmount: { amount: '97.00', currencyCode: 'USD' }
        },
        checkoutUrl: '/checkout'
      };
      
      // Test cart content refresh
      window.contentManager.clearCache();
      window.contentManager.getContentData('Cart').then(cartContent => {
        console.log('🛒 Updated Cart Content:', cartContent);
      });
    }
  }
};

// Test current integration status
if (typeof window !== 'undefined') {
  window.cartTestUtils = cartTestUtils;
  console.log('🧪 Cart Test Utils loaded. Available commands:');
  console.log('   window.cartTestUtils.testCartIntegration()');
  console.log('   window.cartTestUtils.debugCartState()');
  console.log('   window.cartTestUtils.simulateCartInteraction()');
}

export default cartTestUtils;
