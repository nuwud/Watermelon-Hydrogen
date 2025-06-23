/**
 * Test the submenu click fix - comprehensive validation
 * 
 * Run this in the browser console after the fix is applied
 */

(function testSubmenuClickFix() {
  console.log('🔧 Testing Submenu Click Fix');
  
  // Helper to find active submenu
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
  
  // Test function
  function validateClickBehavior(testIndex = 1) {
    const submenu = getActiveSubmenu();
    if (!submenu) {
      console.log('❌ No active submenu found. Open a submenu first.');
      return;
    }
    
    console.log(`🧪 Testing click on index ${testIndex}`);
    
    // Record initial state
    const initialIndex = submenu.currentIndex;
    const initialRotation = submenu.itemGroup.rotation.x;
    
    console.log('📊 Initial state:', {
      currentIndex: initialIndex,
      rotation: initialRotation.toFixed(3)
    });
    
    // Perform click
    try {
      submenu.handleItemClick(testIndex);
      
      // Check immediate state
      setTimeout(() => {
        console.log('📊 State after 100ms:', {
          currentIndex: submenu.currentIndex,
          rotation: submenu.itemGroup.rotation.x.toFixed(3),
          targetRotation: submenu.targetRotation.toFixed(3),
          isAnimating: !!submenu.isAnimating,
          selectionInProgress: !!submenu.selectionInProgress
        });
      }, 100);
      
      // Check final state after animation
      setTimeout(() => {
        const finalRotation = submenu.itemGroup.rotation.x;
        const expectedAngleStep = (2 * Math.PI) / submenu.itemMeshes.length;
        const expectedTarget = -testIndex * expectedAngleStep;
        
        console.log('📊 Final state:', {
          currentIndex: submenu.currentIndex,
          rotation: finalRotation.toFixed(3),
          targetRotation: submenu.targetRotation.toFixed(3),
          expectedTarget: expectedTarget.toFixed(3),
          rotationMatches: Math.abs(finalRotation - expectedTarget) < 0.1,
          indexUpdated: submenu.currentIndex === testIndex
        });
        
        // Validate success
        const rotationMatches = Math.abs(finalRotation - expectedTarget) < 0.1;
        const indexUpdated = submenu.currentIndex === testIndex;
        
        if (rotationMatches && indexUpdated) {
          console.log('✅ CLICK FIX SUCCESSFUL! Item animated to correct position and highlighted.');
        } else {
          console.log('❌ CLICK FIX FAILED:', {
            rotationOK: rotationMatches,
            indexOK: indexUpdated
          });
        }
      }, 800);
      
    } catch (error) {
      console.error('❌ Error during click test:', error);
    }
  }
  
  // Auto-run test if submenu is visible
  const submenu = getActiveSubmenu();
  if (submenu && submenu.visible) {
    console.log('🚀 Auto-running test...');
    setTimeout(() => validateClickBehavior(1), 1000);
    setTimeout(() => validateClickBehavior(2), 3000);
  } else {
    console.log('ℹ️ Open a submenu first, then run: validateClickBehavior(1)');
  }
  
  // Make function available globally
  window.validateClickBehavior = validateClickBehavior;
  
})();
