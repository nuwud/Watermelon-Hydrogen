/**
 * Global utilities for WatermelonOS 3D Menu System
 * Provides browser console commands for testing and debugging
 */

// Global function to toggle green ring in central panel
if (typeof window !== 'undefined') {
  window.toggleGreenRing = () => {
    console.log('🔄 Green ring toggle requested');
    
    // Send custom event to React components
    window.dispatchEvent(new CustomEvent('toggleGreenRing', {
      detail: { timestamp: Date.now() }
    }));
    
    console.log('✅ Green ring toggle event dispatched');
  };

  // Global function to test 3D menu integration
  window.test3DMenu = async () => {
    console.log('🧪 Testing 3D Menu Integration...');
    
    try {
      // Test the API endpoints
      const submenuTest = await fetch('/api/test-digital-submenu');
      const submenuData = await submenuTest.json();
      
      console.log('📊 Submenu Integration Results:', {
        success: submenuData.success,
        totalItems: submenuData.totalMenuItems,
        matchedItems: submenuData.matchedItems,
        glbModelsAvailable: submenuData.analysis?.allShopifyProductsHaveGLB
      });
      
      if (submenuData.success) {
        console.log('✅ All systems operational!');
        
        // Test individual product loading
        const testProduct = 'crystal-seed-interactive-3d-genesis-kit';
        const productTest = await fetch(`/api/products-3d?handle=${testProduct}`);
        const productData = await productTest.json();
        
        if (productData.success && productData.products[0]?.glbUrl) {
          console.log('🎯 Sample GLB URL:', productData.products[0].glbUrl);
        }
      }
      
    } catch (error) {
      console.error('❌ 3D Menu test failed:', error);
    }
  };

  // Global function to list available 3D models
  window.list3DModels = async () => {
    console.log('📋 Fetching available 3D models...');
    
    try {
      const response = await fetch('/api/products-3d?collection=all-direct');
      const data = await response.json();
      
      if (data.success) {
        const models = data.products.map(p => ({
          handle: p.handle,
          title: p.title,
          hasGLB: !!p.model3D?.glbUrl,
          glbUrl: p.model3D?.glbUrl
        }));
        
        console.log('📦 Available 3D Models:');
        models.forEach(model => {
          console.log(`  ${model.hasGLB ? '✅' : '❌'} ${model.handle}: ${model.title}`);
          if (model.glbUrl) {
            console.log(`    GLB: ${model.glbUrl}`);
          }
        });
      }
    } catch (error) {
      console.error('❌ Failed to fetch 3D models:', error);
    }
  };

  // Debug info
  console.log('🍉 WatermelonOS 3D Menu Utilities Loaded');
  console.log('Available commands:');
  console.log('  toggleGreenRing() - Toggle the green ring in central panel');
  console.log('  test3DMenu() - Test the 3D menu integration');
  console.log('  list3DModels() - List all available 3D models');
}

export {};
