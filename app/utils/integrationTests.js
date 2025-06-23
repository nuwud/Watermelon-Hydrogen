/**
 * Quick test script to verify the Shopify Pages 3D Integration
 */

console.log('🍉 Watermelon Hydrogen - Testing Shopify Pages Integration');

// Test content manager availability
async function testContentManager() {
  console.log('\n📋 Testing Content Manager...');
  
  // Check if ContentManager is available
  if (typeof window.contentManager !== 'undefined') {
    console.log('✅ ContentManager is available globally');
    
    // Test content mapping
    try {
      const { NUWUD_CONTENT_MAP } = await import('./contentManager.js');
      const sampleItems = ['Home', 'Services', 'Digital Products', 'Gallery', 'About', 'Contact'];
      
      sampleItems.forEach(item => {
        if (NUWUD_CONTENT_MAP[item]) {
          console.log(`✅ Content mapping found for: ${item}`);
        } else {
          console.log(`❌ Content mapping missing for: ${item}`);
        }
      });
    } catch (error) {
      console.log('❌ Could not load content mapping:', error);
    }
    
    // Test content fetching
    try {
      const content = await window.contentManager.getContentData('Home');
      console.log('✅ Content fetching test successful:', content.title);
    } catch (error) {
      console.log('❌ Content fetching test failed:', error);
    }
    
  } else {
    console.log('❌ ContentManager not available globally');
  }
}

// Test central panel availability
function testCentralPanel() {
  console.log('\n🎯 Testing Central Panel...');
  
  if (typeof window.centralPanel !== 'undefined') {
    console.log('✅ CentralPanel is available globally');
    
    // Test if we can check panel status
    if (window.centralPanel.currentContent) {
      console.log('✅ Central panel has current content');
    } else {
      console.log('ℹ️ Central panel ready for content');
    }
  } else {
    console.log('❌ CentralPanel not available globally');
  }
}

// Test API endpoint
function testPageAPI() {
  console.log('\n🔌 Testing Page API...');
  
  fetch('/api/page?handle=home')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log('✅ Page API working - found page:', data.page.title);
      } else {
        console.log('ℹ️ Page API working but page not found:', data.error);
      }
    })
    .catch(error => {
      console.log('❌ Page API error:', error);
    });
}

// Run tests when page loads
if (typeof window !== 'undefined') {
  // Wait for carousel to initialize
  setTimeout(async () => {
    await testContentManager();
    testCentralPanel();
    testPageAPI();
  }, 3000);
  
  // Make tests available globally
  window.watermelonTests = {
    testContentManager,
    testCentralPanel,
    testPageAPI,
    runAll: async () => {
      await testContentManager();
      testCentralPanel();
      testPageAPI();
    }
  };
  
  console.log('🧪 Tests available at window.watermelonTests.runAll()');
}

export { testContentManager, testCentralPanel, testPageAPI };
