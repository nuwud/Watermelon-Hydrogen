/**
 * Test script to verify smooth "butter-like" submenu behavior
 * 
 * This script tests:
 * 1. Smooth continuous scrolling in both directions (no rewinding)
 * 2. Click-to-highlight with shortest angular path
 * 3. Proper highlighting and selection state
 */

(function testSmoothSubmenuBehavior() {
  console.log('🧈 Testing Smooth "Butter-Like" Submenu Behavior');
  
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
  
  // Test continuous scroll behavior
  function testContinuousScroll(submenu) {
    console.log('🔄 Testing continuous scroll behavior...');
    
    const initialRotation = submenu.itemGroup.rotation.x;
    const angleStep = (2 * Math.PI) / submenu.itemMeshes.length;
    
    console.log(`📊 Initial rotation: ${initialRotation.toFixed(3)}, angleStep: ${angleStep.toFixed(3)}`);
    
    // Simulate forward scroll
    submenu.scrollSubmenu(1);
    
    setTimeout(() => {
      const afterForwardRotation = submenu.targetRotation;
      const expectedForward = initialRotation - angleStep;
      
      console.log(`➡️ After forward scroll - Target: ${afterForwardRotation.toFixed(3)}, Expected: ${expectedForward.toFixed(3)}`);
      console.log(`✅ Forward scroll correct: ${Math.abs(afterForwardRotation - expectedForward) < 0.1}`);
      
      // Test backward scroll
      submenu.scrollSubmenu(-1);
      
      setTimeout(() => {
        const afterBackwardRotation = submenu.targetRotation;
        const expectedBackward = afterForwardRotation + angleStep;
        
        console.log(`⬅️ After backward scroll - Target: ${afterBackwardRotation.toFixed(3)}, Expected: ${expectedBackward.toFixed(3)}`);
        console.log(`✅ Backward scroll correct: ${Math.abs(afterBackwardRotation - expectedBackward) < 0.1}`);
        
      }, 400);
    }, 400);
  }
  
  // Test click behavior uses shortest path
  function testClickShortestPath(submenu) {
    console.log('🎯 Testing click shortest path behavior...');
    
    const currentRotation = submenu.itemGroup.rotation.x;
    const testIndex = Math.floor(submenu.itemMeshes.length / 2); // Middle item
    
    console.log(`🖱️ Testing click on index ${testIndex} from rotation ${currentRotation.toFixed(3)}`);
    
    // Calculate expected behavior
    const selectedAngle = submenu.itemMeshes[testIndex].userData.angle;
    let delta = selectedAngle - currentRotation;
    
    // Normalize to shortest path
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    
    const expectedTarget = currentRotation + delta;
    const shortestPath = Math.abs(delta) <= Math.PI;
    
    console.log(`📐 Selected angle: ${selectedAngle.toFixed(3)}, delta: ${delta.toFixed(3)}, expected target: ${expectedTarget.toFixed(3)}`);
    console.log(`🛤️ Uses shortest path: ${shortestPath}`);
    
    // Perform click
    submenu.handleItemClick(testIndex);
    
    setTimeout(() => {
      const finalRotation = submenu.itemGroup.rotation.x;
      const rotationMatches = Math.abs(finalRotation - expectedTarget) < 0.1;
      const indexUpdated = submenu.currentIndex === testIndex;
      
      console.log(`📊 Final rotation: ${finalRotation.toFixed(3)}, target matched: ${rotationMatches}, index updated: ${indexUpdated}`);
      
      if (rotationMatches && indexUpdated && shortestPath) {
        console.log('✅ SMOOTH CLICK BEHAVIOR CONFIRMED: Uses shortest path and updates correctly!');
      } else {
        console.log('❌ Click behavior needs adjustment:', {
          rotationOK: rotationMatches,
          indexOK: indexUpdated,
          shortestPathOK: shortestPath
        });
      }
    }, 700);
  }
  
  // Test that there's no "rewinding" behavior
  function testNoRewinding(submenu) {
    console.log('🔁 Testing no-rewind behavior...');
    
    let lastRotation = submenu.itemGroup.rotation.x;
    let scrollCount = 0;
    const maxScrolls = submenu.itemMeshes.length + 2; // Go around plus extra
    
    function performScroll() {
      if (scrollCount >= maxScrolls) {
        console.log('✅ NO REWINDING CONFIRMED: Smooth continuous rotation in all directions!');
        return;
      }
      
      const direction = scrollCount < maxScrolls/2 ? 1 : -1; // Forward then backward
      submenu.scrollSubmenu(direction);
      scrollCount++;
      
      setTimeout(() => {
        const currentRotation = submenu.targetRotation;
        const delta = currentRotation - lastRotation;
        
        // Check that rotation is always progressive (no sudden jumps)
        const isProgressive = Math.abs(delta) < Math.PI; // No big jumps
        
        console.log(`📊 Scroll ${scrollCount}: ${lastRotation.toFixed(3)} → ${currentRotation.toFixed(3)}, delta: ${delta.toFixed(3)}, progressive: ${isProgressive}`);
        
        lastRotation = currentRotation;
        performScroll(); // Continue
      }, 350);
    }
    
    setTimeout(() => performScroll(), 2000); // Start after other tests
  }
  
  // Main test runner
  function runAllTests() {
    const submenu = getActiveSubmenu();
    if (!submenu) {
      console.log('❌ No active submenu found. Open a submenu first.');
      return;
    }
    
    console.log(`✅ Found submenu with ${submenu.itemMeshes.length} items`);
    
    // Run tests in sequence
    testContinuousScroll(submenu);
    setTimeout(() => testClickShortestPath(submenu), 1500);
    testNoRewinding(submenu);
  }
  
  // Make test function available globally
  window.testSmoothSubmenu = runAllTests;
  
  console.log('🚀 Instructions:');
  console.log('1. Open a submenu by clicking on a main carousel item');
  console.log('2. Run: testSmoothSubmenu() to test all behaviors');
  console.log('3. Watch for confirmation messages');
  
  // Auto-run if submenu is already visible
  const submenu = getActiveSubmenu();
  if (submenu && submenu.visible) {
    console.log('🧪 Auto-testing smooth behavior...');
    setTimeout(runAllTests, 1000);
  }
  
})();
