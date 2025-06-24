/**
 * Complete Integration Test Script for Watermelon Hydrogen
 * Tests product creation, cart integration, and 3D content display
 */

export const integrationTests = {

  async runFullIntegrationTest() {
    console.log('🍉 Running Full Watermelon Hydrogen Integration Test...\n');
    
    // Test 1: Content Manager Integration
    console.log('1️⃣ Testing Content Manager...');
    await this.testContentManager();
    
    // Test 2: Product Content Loading
    console.log('\n2️⃣ Testing Product Content Loading...');
    await this.testProductContent();
    
    // Test 3: Cart Integration
    console.log('\n3️⃣ Testing Cart Integration...');
    await this.testCartIntegration();
    
    // Test 4: 3D Display Integration
    console.log('\n4️⃣ Testing 3D Display Integration...');
    await this.test3DIntegration();
    
    console.log('\n✅ Integration test complete!');
  },

  async testContentManager() {
    if (!window.contentManager) {
      console.warn('❌ Content Manager not available');
      return false;
    }
    
    console.log('✅ Content Manager available');
    
    // Test cache system
    const cacheStatus = window.contentManager.getCacheStatus();
    console.log('📊 Cache Status:', cacheStatus);
    
    // Test content mapping
    const contentMap = window.NUWUD_CONTENT_MAP;
    console.log('🗺️ Content Map loaded:', Object.keys(contentMap).length, 'items');
    
    return true;
  },

  async testProductContent() {
    const testProducts = [
      'Shopify Hydrogen 3D Guide',
      'Build Like Nuwud: Systems Book',
      'WatermelonOS Theme Download'
    ];
    
    for (const product of testProducts) {
      try {
        console.log(`Testing: ${product}`);
        const content = await window.contentManager.getContentData(product);
        
        console.log(`  ✅ Content loaded:`, {
          type: content.type,
          hasPrice: !!content.price,
          isShopifyProduct: content.isShopifyProduct,
          isDummy: content.isDummy
        });
        
        if (content.isDummy) {
          console.log(`  💡 ${product} is using dummy data - create in Shopify to see real data`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error loading ${product}:`, error);
      }
    }
  },

  async testCartIntegration() {
    // Test cart content
    try {
      const cartContent = await window.contentManager.getContentData('Cart');
      console.log('🛒 Cart Content:', {
        type: cartContent.type,
        itemCount: cartContent.itemCount,
        total: cartContent.total,
        isShopifyCart: cartContent.isShopifyCart,
        isDummy: cartContent.isDummy
      });
      
      if (cartContent.isDummy) {
        console.log('💡 Cart is using dummy data - add products to cart to see real data');
      }
      
    } catch (error) {
      console.error('❌ Error testing cart:', error);
    }
    
    // Test drawer controller
    if (window.drawerController) {
      console.log('✅ Drawer Controller available');
      console.log('🎮 Testing drawer open/close...');
      
      window.drawerController.openCartDrawer();
      setTimeout(() => {
        window.drawerController.closeCartDrawer();
        console.log('✅ Drawer test complete');
      }, 2000);
    } else {
      console.warn('⚠️ Drawer Controller not available');
    }
  },

  async test3DIntegration() {
    // Test carousel integration
    if (window.debugCarousel) {
      console.log('✅ 3D Carousel available');
      
      // Test content loading in carousel
      if (window.loadContentForItem) {
        console.log('🎮 Testing 3D content loading...');
        await window.loadContentForItem('Shopify Hydrogen 3D Guide');
        console.log('✅ 3D content loading test complete');
      }
    } else {
      console.warn('⚠️ 3D Carousel not available');
    }
    
    // Test admin panel
    if (window.watermelonAdmin) {
      console.log('✅ Admin Panel available');
    } else {
      console.warn('⚠️ Admin Panel not available');
    }
  },

  // Test with simulated cart data
  async testWithSimulatedCart() {
    console.log('🎮 Testing with simulated cart data...');
    
    // Inject test cart data
    window.cartData = {
      lines: [
        {
          id: 'test-line-1',
          quantity: 1,
          merchandise: {
            title: 'Digital Download',
            product: { title: 'Shopify Hydrogen 3D Guide' }
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
    
    // Clear cache and test cart content
    window.contentManager.clearCache();
    const cartContent = await window.contentManager.getContentData('Cart');
    
    console.log('🛒 Simulated Cart Result:', {
      isShopifyCart: cartContent.isShopifyCart,
      itemCount: cartContent.itemCount,
      total: cartContent.total,
      hasRealData: !cartContent.isDummy
    });
  }
};

// Auto-run on load
if (typeof window !== 'undefined') {
  window.integrationTests = integrationTests;
  
  console.log('🧪 Integration Tests loaded. Available commands:');
  console.log('   window.integrationTests.runFullIntegrationTest()');
  console.log('   window.integrationTests.testWithSimulatedCart()');
}

export default integrationTests;
