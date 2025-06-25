/**
 * Test script for verifying Shopify product connections
 * Run this in browser console after the 3D menu has loaded
 */

(function() {
  console.log('🍉 Product Connection Test Starting...');
  
  // Test if contentManager is available
  if (typeof window.contentManager === 'undefined') {
    console.warn('❌ contentManager not found. Make sure the 3D menu has loaded.');
    return;
  }
  
  // List of digital products to test
  const productsToTest = [
    'Shopify Hydrogen 3D Guide',
    'Build Like Nuwud: Systems Book',
    'Watermelon OS Theme (Download)',
    'eCommerce Templates',
    '3D Product Viewer Kit',
    'Audio + HUD FX Packs'
  ];
  
  console.log(`🧪 Testing ${productsToTest.length} digital products...`);
  
  // Test each product
  productsToTest.forEach(async (productName, index) => {
    try {
      console.log(`\n${index + 1}. Testing: ${productName}`);
      
      if (typeof window.contentManager === 'undefined') {
        console.error(`❌ ${productName}: contentManager not available`);
        return;
      }
      
      const contentData = await window.contentManager.getContentData(productName);
      
      if (contentData) {
        if (contentData.isShopifyProduct) {
          console.log(`✅ ${productName}: Real Shopify product loaded!`);
          console.log(`   - Handle: ${contentData.handle}`);
          console.log(`   - Price: ${contentData.price?.amount || 'N/A'}`);
          console.log(`   - Images: ${contentData.images?.nodes?.length || 0}`);
        } else {
          console.warn(`⚠️ ${productName}: Using dummy/fallback content`);
          if (contentData.isPlaceholder) {
            console.log(`   - Reason: Product not found in Shopify`);
          }
        }
      } else {
        console.error(`❌ ${productName}: No content data returned`);
      }
    } catch (error) {
      console.error(`❌ ${productName}: Error testing product`, error);
    }
  });
  
  console.log('\n🍉 Product Connection Test Complete!');
  console.log('\n💡 To test manually:');
  console.log('1. Click "Digital Products" in the 3D menu');
  console.log('2. Click any product item in the submenu');
  console.log('3. Check if real product data appears in center panel');
  
})();

// Add global test function for easy access
window.testProductConnections = function() {
  console.log('🔄 Running product connection test...');
  
  if (typeof window.contentManager === 'undefined') {
    console.warn('❌ contentManager not available. Load the 3D menu first.');
    return;
  }
  
  // Quick test of one product
  window.contentManager.getContentData('Shopify Hydrogen 3D Guide').then(data => {
    if (data && data.isShopifyProduct) {
      console.log('✅ Product connections are working!');
      console.log('Real Shopify data:', {
        title: data.title,
        handle: data.handle,
        price: data.price?.amount
      });
    } else {
      console.warn('⚠️ Product connections not working. Check if products exist in Shopify.');
    }
  });
};

console.log('🍉 Product test utilities loaded. Run testProductConnections() to test.');
