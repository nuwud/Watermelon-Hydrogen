/**
 * Final validation script for the submenu click fix
 * 
 * This script provides a comprehensive test of the click-to-highlight functionality
 * Copy and paste this into the browser console to test the fix
 */

(function finalSubmenuClickValidation() {
  console.log('🔍 Final Submenu Click Validation - Starting');
  
  // Helper functions
  function getActiveSubmenu() {
    if (typeof window !== 'undefined' && window.scene) {
      let submenu = null;
      window.scene.traverse((object) => {
        if (object.name === 'Carousel3DSubmenu' && object.visible) {
          submenu = object;
        }
      });
      return submenu;
    }
    return null;
  }
  
  function waitForSubmenu(callback, timeout = 10000) {
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      const submenu = getActiveSubmenu();
      if (submenu && submenu.itemMeshes && submenu.itemMeshes.length > 0) {
        clearInterval(checkInterval);
        callback(submenu);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        console.log('⏰ Timeout waiting for submenu');
      }
    }, 100);
  }
  
  function runClickTest(submenu, testIndex, callback) {
    console.log(`🎯 Testing click on index ${testIndex}`);
    
    // Record initial state
    const initialState = {
      currentIndex: submenu.currentIndex,
      rotation: submenu.itemGroup.rotation.x,
      targetRotation: submenu.targetRotation
    };
    
    console.log('📊 Initial:', initialState);
    
    // Expected final state
    const angleStep = (2 * Math.PI) / submenu.itemMeshes.length;
    const expectedTarget = testIndex * angleStep;
    
    console.log('🎯 Expected target rotation:', expectedTarget.toFixed(3));
    
    // Perform click
    try {
      submenu.handleItemClick(testIndex);
      
      // Wait for animation to complete
      setTimeout(() => {
        const finalState = {
          currentIndex: submenu.currentIndex,
          rotation: submenu.itemGroup.rotation.x,
          targetRotation: submenu.targetRotation
        };
        
        console.log('📊 Final:', finalState);
        
        // Validate results
        const rotationMatch = Math.abs(finalState.rotation - expectedTarget) < 0.1;
        const indexMatch = finalState.currentIndex === testIndex;
        const targetMatch = Math.abs(finalState.targetRotation - expectedTarget) < 0.1;
        
        const success = rotationMatch && indexMatch && targetMatch;
        
        console.log('📋 Validation Results:', {
          rotationCorrect: rotationMatch,
          indexCorrect: indexMatch,
          targetCorrect: targetMatch,
          overallSuccess: success
        });
        
        if (success) {
          console.log(`✅ Test ${testIndex} PASSED: Click animation working correctly!`);
        } else {
          console.log(`❌ Test ${testIndex} FAILED: Click animation not working as expected`);
        }
        
        if (callback) callback(success);
        
      }, 800); // Wait for 0.6s animation + buffer
      
    } catch (error) {
      console.error(`❌ Error during test ${testIndex}:`, error);
      if (callback) callback(false);
    }
  }
  
  function runFullValidation(submenu) {
    console.log('🚀 Running full validation suite...');
    
    let testsPassed = 0;
    let testsTotal = 3;
    
    const testCallback = (success) => {
      if (success) testsPassed++;
      
      // Check if all tests completed
      if (testsPassed + (testsTotal - testsPassed) === testsTotal) {
        console.log(`\n🏁 Validation Complete: ${testsPassed}/${testsTotal} tests passed`);
        
        if (testsPassed === testsTotal) {
          console.log('🎉 ALL TESTS PASSED! Submenu click fix is working correctly!');
        } else {
          console.log('⚠️ Some tests failed. Check the implementation.');
        }
      }
    };
    
    // Run tests with delays to avoid conflicts
    setTimeout(() => runClickTest(submenu, 1, testCallback), 1000);
    setTimeout(() => runClickTest(submenu, 2, testCallback), 3000);
    setTimeout(() => runClickTest(submenu, 0, testCallback), 5000); // Test going back to first
  }
  
  // Start validation
  console.log('ℹ️ Instructions:');
  console.log('1. Click on a main carousel item to open a submenu');
  console.log('2. Wait for the automatic validation to run');
  console.log('3. Or manually run: window.testSubmenuClick(index)');
  
  // Wait for submenu and run tests
  waitForSubmenu((submenu) => {
    console.log('✅ Active submenu found with', submenu.itemMeshes.length, 'items');
    
    // Make individual test function available
    window.testSubmenuClick = (index) => runClickTest(submenu, index);
    
    // Auto-run full validation if submenu is already visible
    if (submenu.visible) {
      setTimeout(() => runFullValidation(submenu), 1000);
    }
  });
  
})();
