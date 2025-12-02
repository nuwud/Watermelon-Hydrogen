/**
 * Test utilities for Phase 2 - Dynamic Shopify Menu Integration
 * Use these functions to test and validate the menu system
 */

// Mock Shopify menu data for testing
export const mockShopifyMenuData = {
  shop: {
    id: "gid://shopify/Shop/12345",
    name: "Test Store",
    description: "Test store for 3D carousel"
  },
  menu: {
    id: "gid://shopify/Menu/67890",
    items: [
      {
        id: "gid://shopify/MenuItem/1",
        title: "Home",
        url: "/",
        type: "HTTP",
        items: [
          { id: "gid://shopify/MenuItem/11", title: "Dashboard", url: "/dashboard" },
          { id: "gid://shopify/MenuItem/12", title: "Welcome", url: "/welcome" },
          { id: "gid://shopify/MenuItem/13", title: "Getting Started", url: "/getting-started" }
        ]
      },
      {
        id: "gid://shopify/MenuItem/2",
        title: "Products",
        url: "/collections/all",
        type: "COLLECTION",
        items: [
          { id: "gid://shopify/MenuItem/21", title: "Featured", url: "/collections/featured" },
          { id: "gid://shopify/MenuItem/22", title: "New Arrivals", url: "/collections/new" },
          { id: "gid://shopify/MenuItem/23", title: "Best Sellers", url: "/collections/bestsellers" },
          { id: "gid://shopify/MenuItem/24", title: "Sale", url: "/collections/sale" }
        ]
      },
      {
        id: "gid://shopify/MenuItem/3",
        title: "Collections",
        url: "/collections",
        type: "HTTP",
        items: [
          { id: "gid://shopify/MenuItem/31", title: "Summer 2024", url: "/collections/summer-2024" },
          { id: "gid://shopify/MenuItem/32", title: "Electronics", url: "/collections/electronics" },
          { id: "gid://shopify/MenuItem/33", title: "Clothing", url: "/collections/clothing" }
        ]
      },
      {
        id: "gid://shopify/MenuItem/4",
        title: "About",
        url: "/pages/about",
        type: "PAGE",
        items: [
          { id: "gid://shopify/MenuItem/41", title: "Our Story", url: "/pages/our-story" },
          { id: "gid://shopify/MenuItem/42", title: "Team", url: "/pages/team" },
          { id: "gid://shopify/MenuItem/43", title: "Careers", url: "/pages/careers" }
        ]
      },
      {
        id: "gid://shopify/MenuItem/5",
        title: "Support",
        url: "/pages/support",
        type: "PAGE",
        items: [
          { id: "gid://shopify/MenuItem/51", title: "FAQ", url: "/pages/faq" },
          { id: "gid://shopify/MenuItem/52", title: "Contact", url: "/pages/contact" },
          { id: "gid://shopify/MenuItem/53", title: "Returns", url: "/pages/returns" }
        ]
      },
      {
        id: "gid://shopify/MenuItem/6",
        title: "Account",
        url: "/account",
        type: "HTTP",
        items: [
          { id: "gid://shopify/MenuItem/61", title: "Login", url: "/account/login" },
          { id: "gid://shopify/MenuItem/62", title: "Orders", url: "/account/orders" },
          { id: "gid://shopify/MenuItem/63", title: "Profile", url: "/account/profile" },
          { id: "gid://shopify/MenuItem/64", title: "Wishlist", url: "/account/wishlist" }
        ]
      }
    ]
  }
};

// Expected transformed data for comparison
export const expectedTransformedData = {
  items: ["Home", "Products", "Collections", "About", "Support", "Account"],
  submenus: {
    "Home": ["Dashboard", "Welcome", "Getting Started"],
    "Products": ["Featured", "New Arrivals", "Best Sellers", "Sale"],
    "Collections": ["Summer 2024", "Electronics", "Clothing"],
    "About": ["Our Story", "Team", "Careers"],
    "Support": ["FAQ", "Contact", "Returns"],
    "Account": ["Login", "Orders", "Profile", "Wishlist"]
  }
};

// Test cases for menu transformation
export function runMenuTransformTests() {
  console.group('🧪 Testing Menu Transform Functions');
  
  // Import transform functions (assumes they're available)
  const { 
    transformShopifyMenuForCarousel, 
    validateMenuData, 
    createFallbackMenuData 
  } = window.menuTransformUtils || {};
  
  if (!transformShopifyMenuForCarousel) {
    console.error('❌ Menu transform utilities not available. Make sure menuTransform.js is loaded.');
    console.groupEnd();
    return;
  }
  
  // Test 1: Basic transformation
  console.log('Test 1: Basic Shopify menu transformation');
  const transformed = transformShopifyMenuForCarousel(mockShopifyMenuData);
  console.log('Input:', mockShopifyMenuData);
  console.log('Output:', transformed);
  console.log('Expected:', expectedTransformedData);
  
  const test1Pass = JSON.stringify(transformed) === JSON.stringify(expectedTransformedData);
  console.log(test1Pass ? '✅ PASS' : '❌ FAIL');
  
  // Test 2: Validation
  console.log('\nTest 2: Menu data validation');
  const validationResult = validateMenuData(transformed);
  console.log('Validation result:', validationResult);
  console.log(validationResult ? '✅ PASS' : '❌ FAIL');
  
  // Test 3: Fallback data
  console.log('\nTest 3: Fallback menu creation');
  const fallbackData = createFallbackMenuData();
  console.log('Fallback data:', fallbackData);
  const fallbackValid = validateMenuData(fallbackData);
  console.log(fallbackValid ? '✅ PASS' : '❌ FAIL');
  
  // Test 4: Edge cases
  console.log('\nTest 4: Edge cases');
  
  // Empty menu
  const emptyResult = transformShopifyMenuForCarousel({ menu: { items: [] } });
  console.log('Empty menu result:', emptyResult);
  
  // Null input
  const nullResult = transformShopifyMenuForCarousel(null);
  console.log('Null input result:', nullResult);
  
  // Invalid structure
  const invalidResult = transformShopifyMenuForCarousel({ invalid: 'data' });
  console.log('Invalid structure result:', invalidResult);
  
  console.groupEnd();
  
  return {
    basicTransform: test1Pass,
    validation: validationResult,
    fallback: fallbackValid
  };
}

// Test carousel integration
export function testCarouselIntegration() {
  console.group('🎠 Testing Carousel Integration');
  
  const carousel = window.debugCarousel;
  if (!carousel) {
    console.error('❌ No carousel instance found. Make sure the carousel is initialized.');
    console.groupEnd();
    return;
  }
  
  console.log('Carousel instance:', carousel);
  console.log('Carousel scene contents:');
  carousel.debug.listSceneContents();
  
  // Check if dynamic menu data is being used
  const isDynamic = carousel.carousel?.items?.length > 3; // Assuming fallback has 3 items
  console.log(`Menu source: ${isDynamic ? 'Dynamic' : 'Fallback'}`);
  
  console.groupEnd();
  
  return { carouselAvailable: true, isDynamic };
}

// Performance test
export function testMenuLoadingPerformance() {
  console.group('⚡ Testing Menu Loading Performance');
  
  const startTime = performance.now();
  
  // Simulate menu data loading and transformation
  const { transformShopifyMenuForCarousel } = window.menuTransformUtils || {};
  
  if (!transformShopifyMenuForCarousel) {
    console.error('❌ Menu transform utilities not available');
    console.groupEnd();
    return;
  }
  
  // Run transformation multiple times to test performance
  const iterations = 100;
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const iterStart = performance.now();
    transformShopifyMenuForCarousel(mockShopifyMenuData);
    const iterEnd = performance.now();
    results.push(iterEnd - iterStart);
  }
  
  const totalTime = performance.now() - startTime;
  const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
  const minTime = Math.min(...results);
  const maxTime = Math.max(...results);
  
  console.log(`Total time for ${iterations} iterations: ${totalTime.toFixed(2)}ms`);
  console.log(`Average time per transformation: ${avgTime.toFixed(2)}ms`);
  console.log(`Min time: ${minTime.toFixed(2)}ms`);
  console.log(`Max time: ${maxTime.toFixed(2)}ms`);
  
  const performanceGood = avgTime < 1; // Should be under 1ms
  console.log(performanceGood ? '✅ Performance GOOD' : '⚠️ Performance needs optimization');
  
  console.groupEnd();
  
  return { avgTime, performanceGood };
}

// Comprehensive test suite
export function runAllTests() {
  console.log('🍉 Running Phase 2 Menu Integration Tests');
  console.log('='.repeat(50));
  
  const results = {};
  
  try {
    results.menuTransform = runMenuTransformTests();
  } catch (error) {
    console.error('❌ Menu transform tests failed:', error);
    results.menuTransform = { error: error.message };
  }
  
  try {
    results.carouselIntegration = testCarouselIntegration();
  } catch (error) {
    console.error('❌ Carousel integration tests failed:', error);
    results.carouselIntegration = { error: error.message };
  }
  
  try {
    results.performance = testMenuLoadingPerformance();
  } catch (error) {
    console.error('❌ Performance tests failed:', error);
    results.performance = { error: error.message };
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log(JSON.stringify(results, null, 2));
  
  // Overall status
  const hasErrors = Object.values(results).some(result => result.error);
  const allTestsPass = results.menuTransform?.basicTransform && 
                       results.menuTransform?.validation && 
                       results.carouselIntegration?.carouselAvailable &&
                       results.performance?.performanceGood;
  
  console.log('\n🎯 Overall Status:');
  if (hasErrors) {
    console.log('❌ Some tests encountered errors - check implementation');
  } else if (allTestsPass) {
    console.log('✅ All tests passed - Phase 2 integration successful!');
  } else {
    console.log('⚠️ Some tests failed - review implementation details');
  }
  
  return results;
}

// Utility to inject test functions into global scope for console access
export function exposeTestsToConsole() {
  window.menuTests = {
    runAll: runAllTests,
    transform: runMenuTransformTests,
    carousel: testCarouselIntegration,
    performance: testMenuLoadingPerformance,
    mockData: mockShopifyMenuData,
    expectedData: expectedTransformedData
  };
  
  console.log('🧪 Menu tests available at window.menuTests');
  console.log('Run: window.menuTests.runAll() to start testing');
}

// Auto-expose if in browser environment
if (typeof window !== 'undefined') {
  exposeTestsToConsole();
}
