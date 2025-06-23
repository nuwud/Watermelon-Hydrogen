/**
 * Comprehensive test for submenu click-to-highlight functionality
 * This script tests all aspects of the submenu click behavior
 */

// Test function to validate submenu click behavior
function testSubmenuClickToHighlight() {
  console.log('🧪 Starting Submenu Click-to-Highlight Test');
  
  // Step 1: Look for the main carousel
  let mainCarousel = null;
  let activeSubmenu = null;
  
  // Check if we can access the scene and find carousel objects
  if (typeof window !== 'undefined' && window.scene) {
    window.scene.traverse((object) => {
      if (object.name === 'Carousel3DPro') {
        mainCarousel = object;
        console.log('✅ Found main carousel:', mainCarousel);
      }
      if (object.name === 'Carousel3DSubmenu') {
        activeSubmenu = object;
        console.log('✅ Found active submenu:', activeSubmenu);
      }
    });
  }
  
  // Test if handleItemClick method exists
  if (activeSubmenu && typeof activeSubmenu.handleItemClick === 'function') {
    console.log('✅ handleItemClick method exists');
    
    // Test the method with a valid index
    const testIndex = 1; // Test with second item
    console.log(`🧪 Testing handleItemClick with index: ${testIndex}`);
    
    try {
      activeSubmenu.handleItemClick(testIndex);
      console.log('✅ handleItemClick executed successfully');
      
      // Verify that the item was selected
      setTimeout(() => {
        if (activeSubmenu.currentIndex === testIndex) {
          console.log('✅ Current index correctly updated to:', testIndex);
        } else {
          console.log('❌ Current index not updated. Expected:', testIndex, 'Got:', activeSubmenu.currentIndex);
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Error calling handleItemClick:', error);
    }
    
  } else if (activeSubmenu) {
    console.log('❌ handleItemClick method not found on submenu');
  } else {
    console.log('⚠️ No active submenu found - open a submenu first');
  }
  
  return {
    mainCarousel,
    activeSubmenu,
    hasHandleItemClick: activeSubmenu && typeof activeSubmenu.handleItemClick === 'function'
  };
}

// Export for global use
window.testSubmenuClickToHighlight = testSubmenuClickToHighlight;

console.log('🔧 Test function loaded. Use: testSubmenuClickToHighlight()');
