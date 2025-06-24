#!/usr/bin/env node

/**
 * 🍉 Watermelon Hydrogen - Full Integration Test Suite
 * 
 * This script tests the complete end-to-end flow:
 * 1. Shopify product/page integration
 * 2. 3D content system
 * 3. Cart functionality
 * 4. Developer utilities
 */

const INTEGRATION_TESTS = [
  {
    name: "Content Manager Initialization",
    test: () => typeof window.contentManager !== 'undefined',
    message: "Content manager should be available globally"
  },
  {
    name: "Carousel 3D Pro System",
    test: () => typeof window.debugCarousel !== 'undefined',
    message: "Debug carousel should be available for testing"
  },
  {
    name: "Cart Integration",
    test: () => typeof window.cartTestUtils !== 'undefined',
    message: "Cart test utilities should be loaded"
  },
  {
    name: "Watermelon Integration Tests",
    test: () => typeof window.watermelonIntegrationTests !== 'undefined',
    message: "Integration test suite should be available"
  },
  {
    name: "Admin Panel Access",
    test: () => typeof window.watermelonAdmin !== 'undefined',
    message: "Admin panel should be accessible"
  }
];

const API_ENDPOINTS = [
  {
    name: "Page API",
    endpoint: "/api/page?handle=home",
    expectedFields: ["title", "body", "handle"]
  },
  {
    name: "Product API", 
    endpoint: "/api/product?handle=shopify-hydrogen-3d-guide",
    expectedFields: ["title", "description", "price"]
  }
];

const CONTENT_MAPPINGS = [
  "Home",
  "Gallery", 
  "Shopify Hydrogen 3D Guide",
  "Build Like Nuwud: Systems Book",
  "WatermelonOS Theme Download"
];

console.log('🍉 Watermelon Hydrogen - Full Integration Test');
console.log('='.repeat(50));

// Browser-based tests (run in console)
if (typeof window !== 'undefined') {
  
  console.log('\n📋 Testing Core Integration Points...');
  
  // Test 1: System availability
  INTEGRATION_TESTS.forEach(test => {
    const result = test.test();
    console.log(`${result ? '✅' : '❌'} ${test.name}: ${test.message}`);
  });
  
  // Test 2: Content mapping
  console.log('\n🗂️ Testing Content Mappings...');
  CONTENT_MAPPINGS.forEach(async item => {
    try {
      const content = await window.contentManager?.getContentData(item);
      console.log(`✅ ${item}: ${content ? 'Mapped' : 'Not mapped'}`);
    } catch (error) {
      console.log(`❌ ${item}: Error - ${error.message}`);
    }
  });
  
  // Test 3: API endpoints
  console.log('\n🌐 Testing API Endpoints...');
  API_ENDPOINTS.forEach(async apiTest => {
    try {
      const response = await fetch(apiTest.endpoint);
      const data = await response.json();
      
      const hasExpectedFields = apiTest.expectedFields.every(field => 
        data && typeof data[field] !== 'undefined'
      );
      
      console.log(`${hasExpectedFields ? '✅' : '❌'} ${apiTest.name}: ${response.status}`);
      if (!hasExpectedFields) {
        console.log(`   Missing fields: ${apiTest.expectedFields.filter(field => !data[field])}`);
      }
    } catch (error) {
      console.log(`❌ ${apiTest.name}: Error - ${error.message}`);
    }
  });
  
  // Test 4: Cart functionality
  console.log('\n🛒 Testing Cart Integration...');
  if (window.cartTestUtils) {
    try {
      window.cartTestUtils.testCartStateMonitoring();
      console.log('✅ Cart state monitoring: Working');
    } catch (error) {
      console.log(`❌ Cart state monitoring: ${error.message}`);
    }
  }
  
  // Test 5: 3D system responsiveness
  console.log('\n🎮 Testing 3D System...');
  if (window.debugCarousel) {
    try {
      const sceneInfo = window.debugCarousel.debug?.getSceneInfo();
      console.log(`✅ 3D Scene: ${sceneInfo ? 'Active' : 'Inactive'}`);
    } catch (error) {
      console.log(`❌ 3D Scene: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Integration Test Complete!');
  console.log('\n📖 Next Steps:');
  console.log('1. Create Shopify products using: node scripts/setup-shopify-products.js');
  console.log('2. Create Shopify pages for your menu items');
  console.log('3. Test content loading with: window.contentManager.getContentData("Home")');
  console.log('4. Monitor cart with: window.cartTestUtils.monitorCartState()');
  console.log('5. Debug 3D with: window.debugCarousel.debug.listSceneContents()');
  
} else {
  // Node.js environment - provide CLI guidance
  console.log('\n🚀 Integration Test Guide');
  console.log('\nThis script provides browser-based testing.');
  console.log('Run in browser console after visiting http://localhost:3001\n');
  
  console.log('Quick Test Commands:');
  console.log('// Load and run this script');
  console.log('fetch("/scripts/test-integration-full.js").then(r => r.text()).then(eval);');
  console.log('');
  console.log('// Individual component tests');
  console.log('window.watermelonIntegrationTests.runAll();');
  console.log('window.cartTestUtils.runAllTests();');
  console.log('window.debugCarousel.debug.listSceneContents();');
  console.log('');
  console.log('// Content tests');
  console.log('await window.contentManager.getContentData("Home");');
  console.log('await window.contentManager.getContentData("Gallery");');
  console.log('');
  
  console.log('🎯 Development Workflow:');
  console.log('1. Start dev server: npm run dev');
  console.log('2. Open browser: http://localhost:3001');
  console.log('3. Open console and run tests');
  console.log('4. Create Shopify content');
  console.log('5. Test real data loading');
  console.log('6. Verify cart integration');
  console.log('7. Polish 3D experience');
}

// Export for module use
if (typeof module !== 'undefined') {
  module.exports = {
    INTEGRATION_TESTS,
    API_ENDPOINTS,
    CONTENT_MAPPINGS
  };
}
