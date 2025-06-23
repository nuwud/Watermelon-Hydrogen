/**
 * Advanced debug script to track the exact flow of submenu click-to-highlight
 * 
 * This script monitors the complete flow:
 * 1. handleItemClick call
 * 2. selectItem execution
 * 3. Animation start and completion
 * 4. State changes
 */

(function debugSubmenuClickFlow() {
  console.log('🔬 Advanced Submenu Click Flow Debug - Started');
  
  // Helper to get the active submenu
  function getActiveSubmenu() {
    if (typeof window !== 'undefined' && window.scene) {
      let activeSubmenu = null;
      window.scene.traverse((object) => {
        if (object.name === 'Carousel3DSubmenu' && object.visible) {
          activeSubmenu = object;
        }
      });
      return activeSubmenu;
    }
    return null;
  }
  
  // Track submenu state
  function logSubmenuState(submenu, label = 'State') {
    if (!submenu) return;
    
    console.log(`📊 ${label}:`, {
      currentIndex: submenu.currentIndex,
      targetRotation: submenu.targetRotation?.toFixed(3),
      currentRotation: submenu.itemGroup?.rotation?.x?.toFixed(3),
      isAnimating: submenu.isAnimating,
      selectItemLock: submenu.selectItemLock,
      isTransitioning: submenu.isTransitioning,
      forceLockedIndex: submenu.forceLockedIndex,
      selectionInProgress: submenu.selectionInProgress
    });
  }
  
  // Test function that simulates a click on a specific index
  function testClickOnIndex(index) {
    const submenu = getActiveSubmenu();
    if (!submenu) {
      console.log('❌ No active submenu found');
      return;
    }
    
    console.log(`🎯 Testing click on index ${index}`);
    logSubmenuState(submenu, 'BEFORE');
    
    // Check if handleItemClick exists
    if (typeof submenu.handleItemClick === 'function') {
      try {
        // Call handleItemClick
        submenu.handleItemClick(index);
        
        // Log state immediately after
        setTimeout(() => {
          logSubmenuState(submenu, 'AFTER 100ms');
        }, 100);
        
        // Log state after animation should complete
        setTimeout(() => {
          logSubmenuState(submenu, 'AFTER 700ms');
        }, 700);
        
      } catch (error) {
        console.error('❌ Error calling handleItemClick:', error);
      }
    } else {
      console.log('❌ handleItemClick method not found');
    }
  }
  
  // Monitor for submenu and setup test
  const checkInterval = setInterval(() => {
    const submenu = getActiveSubmenu();
    if (submenu && submenu.itemMeshes && submenu.itemMeshes.length > 0) {
      console.log('✅ Active submenu found with items:', submenu.itemMeshes.length);
      clearInterval(checkInterval);
      
      // Setup global test function
      window.testSubmenuClick = testClickOnIndex;
      
      console.log('🚀 Instructions:');
      console.log('1. Open a submenu by clicking on a main carousel item');
      console.log('2. Use: testSubmenuClick(1) to test clicking item at index 1');
      console.log('3. Use: testSubmenuClick(2) to test clicking item at index 2');
      console.log('4. Watch the debug output to see if animation starts');
      
      // Auto-test if submenu is already visible
      if (submenu.visible) {
        console.log('🧪 Auto-testing click on index 1...');
        setTimeout(() => testClickOnIndex(1), 1000);
      }
    }
  }, 1000);
  
  // Cleanup after 30 seconds
  setTimeout(() => {
    clearInterval(checkInterval);
    console.log('🏁 Debug session ended');
  }, 30000);
  
})();
