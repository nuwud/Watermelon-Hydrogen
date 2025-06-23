/**
 * 🧪 Comprehensive Submenu Functionality Test
 * 
 * This script tests the restored submenu functionality:
 * 1. Close button visibility and functionality
 * 2. Click-to-highlight behavior for all submenu items
 * 3. Simple, reliable state management
 * 4. No complex guard interference
 */

console.log('🍉 WATERMELON SUBMENU FUNCTIONALITY TEST');
console.log('========================================');

function runSubmenuTests() {
  let testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  function logTest(name, passed, details = '') {
    const result = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${result}: ${name}`);
    if (details) console.log(`   Details: ${details}`);
    
    testResults.tests.push({ name, passed, details });
    if (passed) testResults.passed++;
    else testResults.failed++;
  }

  // Test 1: Check if close button is visible and has proper userData
  function testCloseButtonVisibility() {
    const activeSubmenu = window.scene?.children.find(child => child.name === 'Carousel3DSubmenu');
    
    if (!activeSubmenu) {
      logTest('Close Button Visibility', false, 'No active submenu found');
      return false;
    }

    const closeButton = activeSubmenu.fixedElements?.children.find(child => 
      child.userData?.isCloseButton === true
    );

    if (!closeButton) {
      logTest('Close Button Visibility', false, 'Close button not found in fixedElements');
      return false;
    }

    const isVisible = closeButton.visible;
    const hasProperPosition = closeButton.position.x > 1 && closeButton.position.y > 1;
    const hasRenderOrder = closeButton.renderOrder === 9999;
    const hasXLines = closeButton.userData.xLines?.length === 2;

    const passed = isVisible && hasProperPosition && hasRenderOrder && hasXLines;
    
    logTest('Close Button Visibility', passed, 
      `Visible: ${isVisible}, Position: (${closeButton.position.x.toFixed(1)}, ${closeButton.position.y.toFixed(1)}), ` +
      `RenderOrder: ${closeButton.renderOrder}, X-Lines: ${hasXLines}`
    );
    
    return passed;
  }

  // Test 2: Check submenu item click responsiveness
  function testItemClickResponsiveness() {
    const activeSubmenu = window.scene?.children.find(child => child.name === 'Carousel3DSubmenu');
    
    if (!activeSubmenu) {
      logTest('Item Click Responsiveness', false, 'No active submenu found');
      return false;
    }

    if (!activeSubmenu.itemMeshes || activeSubmenu.itemMeshes.length === 0) {
      logTest('Item Click Responsiveness', false, 'No submenu items found');
      return false;
    }

    // Test handleItemClick method exists
    const hasHandleItemClick = typeof activeSubmenu.handleItemClick === 'function';
    const hasSelectItem = typeof activeSubmenu.selectItem === 'function';
    const hasSimpleState = !activeSubmenu.guard; // Should NOT have complex guard system
    const hasSimpleLock = typeof activeSubmenu.selectItemLock === 'boolean';

    const passed = hasHandleItemClick && hasSelectItem && hasSimpleState && hasSimpleLock;
    
    logTest('Item Click Responsiveness', passed,
      `handleItemClick: ${hasHandleItemClick}, selectItem: ${hasSelectItem}, ` +
      `simpleState: ${hasSimpleState}, simpleLock: ${hasSimpleLock}`
    );

    return passed;
  }

  // Test 3: Test actual click functionality
  function testClickFunctionality() {
    const activeSubmenu = window.scene?.children.find(child => child.name === 'Carousel3DSubmenu');
    
    if (!activeSubmenu || !activeSubmenu.itemMeshes?.length) {
      logTest('Click Functionality', false, 'No active submenu or items');
      return false;
    }

    try {
      const initialIndex = activeSubmenu.currentIndex;
      const targetIndex = (initialIndex + 1) % activeSubmenu.itemMeshes.length;
      
      // Simulate a click
      activeSubmenu.handleItemClick(targetIndex);
      
      // Check if currentIndex was updated
      const indexUpdated = activeSubmenu.currentIndex === targetIndex;
      
      // Check if animation was started (selectItemLock should be true temporarily)
      const animationStarted = activeSubmenu.selectItemLock === true;
      
      const passed = indexUpdated || animationStarted; // Either should be true
      
      logTest('Click Functionality', passed,
        `Initial: ${initialIndex}, Target: ${targetIndex}, Current: ${activeSubmenu.currentIndex}, ` +
        `IndexUpdated: ${indexUpdated}, AnimationStarted: ${animationStarted}`
      );

      return passed;
    } catch (error) {
      logTest('Click Functionality', false, `Error: ${error.message}`);
      return false;
    }
  }

  // Test 4: Verify no complex guard interference
  function testSimpleStateManagement() {
    const activeSubmenu = window.scene?.children.find(child => child.name === 'Carousel3DSubmenu');
    
    if (!activeSubmenu) {
      logTest('Simple State Management', false, 'No active submenu found');
      return false;
    }

    // These should NOT exist (complex guard system)
    const noComplexGuard = !activeSubmenu.guard;
    const noSelectionGuards = typeof activeSubmenu.withSelectionLock === 'undefined';
    const noSelectionInProgress = typeof activeSubmenu.selectionInProgress === 'undefined';
    
    // These SHOULD exist (simple state)
    const hasSelectItemLock = typeof activeSubmenu.selectItemLock === 'boolean';
    const hasIsAnimating = typeof activeSubmenu.isAnimating === 'boolean';
    const hasCurrentIndex = typeof activeSubmenu.currentIndex === 'number';

    const passed = noComplexGuard && noSelectionGuards && hasSelectItemLock && hasIsAnimating && hasCurrentIndex;
    
    logTest('Simple State Management', passed,
      `NoComplexGuard: ${noComplexGuard}, NoSelectionGuards: ${noSelectionGuards}, ` +
      `HasSelectItemLock: ${hasSelectItemLock}, HasIsAnimating: ${hasIsAnimating}, HasCurrentIndex: ${hasCurrentIndex}`
    );

    return passed;
  }

  // Test 5: Test highlighting system
  function testHighlightingSystem() {
    const activeSubmenu = window.scene?.children.find(child => child.name === 'Carousel3DSubmenu');
    
    if (!activeSubmenu || !activeSubmenu.itemMeshes?.length) {
      logTest('Highlighting System', false, 'No active submenu or items');
      return false;
    }

    // Check if highlight/unhighlight methods exist
    const hasHighlightItem = typeof activeSubmenu.highlightItem === 'function';
    const hasUnhighlightItem = typeof activeSubmenu.unhighlightItem === 'function';
    
    // Check if current item is highlighted
    const currentItem = activeSubmenu.itemMeshes[activeSubmenu.currentIndex];
    const mesh = currentItem?.userData?.mesh;
    
    let isHighlighted = false;
    if (mesh) {
      // Check if color is different from original (indicating highlight)
      const currentColor = mesh.material.color;
      const originalColor = mesh.userData.originalColor;
      
      if (originalColor) {
        isHighlighted = !currentColor.equals(originalColor);
      }
    }

    const passed = hasHighlightItem && hasUnhighlightItem && isHighlighted;
    
    logTest('Highlighting System', passed,
      `HasHighlightItem: ${hasHighlightItem}, HasUnhighlightItem: ${hasUnhighlightItem}, ` +
      `IsHighlighted: ${isHighlighted}`
    );

    return passed;
  }

  // Run all tests
  console.log('🧪 Running submenu functionality tests...\n');
  
  testCloseButtonVisibility();
  testItemClickResponsiveness();
  testClickFunctionality();
  testSimpleStateManagement();
  testHighlightingSystem();

  console.log('\n📊 TEST RESULTS:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Submenu functionality is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the details above.');
  }

  return testResults;
}

// Function to open a submenu for testing
function openTestSubmenu(menuItem = 'Gallery') {
  console.log(`🔧 Opening ${menuItem} submenu for testing...`);
  
  if (window.__wm__ && window.__wm__.testSubmenu) {
    return window.__wm__.testSubmenu(menuItem);
  } else {
    console.warn('Manual submenu opening needed. Click on a main carousel item first.');
    return false;
  }
}

// Auto-run tests if submenu is already open
const activeSubmenu = window.scene?.children.find(child => child.name === 'Carousel3DSubmenu');
if (activeSubmenu) {
  console.log('🎯 Active submenu detected, running tests immediately...\n');
  runSubmenuTests();
} else {
  console.log('ℹ️  No active submenu found.');
  console.log('📋 Available commands:');
  console.log('  - runSubmenuTests() - Run all functionality tests');
  console.log('  - openTestSubmenu("Gallery") - Open Gallery submenu for testing');
  console.log('  - openTestSubmenu("Services") - Open Services submenu for testing');
  console.log('\n💡 First open a submenu by clicking on a main carousel item, then run runSubmenuTests()');
}

// Make functions available globally
window.runSubmenuTests = runSubmenuTests;
window.openTestSubmenu = openTestSubmenu;
