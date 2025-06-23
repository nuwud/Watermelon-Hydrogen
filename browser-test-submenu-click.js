/**
 * 🔧 Browser Test for Submenu Click-to-Highlight Fix
 * 
 * Copy and paste this into the browser console when the 3D carousel is loaded
 * to test the submenu click functionality.
 */

// Test function that can be run in the browser console
function testSubmenuClickFix() {
  console.log('🧪 Testing Submenu Click-to-Highlight Fix');
  console.log('==========================================');
  
  // Find the scene and carousel
  const scene = window.scene;
  const carousel = window.carousel;
  
  if (!scene || !carousel) {
    console.log('❌ Scene or carousel not found. Make sure the 3D carousel is loaded.');
    return;
  }
  
  console.log('✅ Scene and carousel found');
  
  // Function to find active submenu
  function findActiveSubmenu() {
    let activeSubmenu = null;
    scene.traverse((object) => {
      if (object.name === 'Carousel3DSubmenu' && object.visible) {
        activeSubmenu = object;
      }
    });
    return activeSubmenu;
  }
  
  // Test click response
  function testClickResponse(submenu, index) {
    console.log(`🖱️ Testing click on item ${index}...`);
    
    const startTime = performance.now();
    const startIndex = submenu.currentIndex;
    
    // Simulate click
    submenu.handleItemClick(index);
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // Check if the index changed
    const success = submenu.currentIndex === index;
    
    console.log(`   Response time: ${responseTime.toFixed(2)}ms`);
    console.log(`   Start index: ${startIndex} → End index: ${submenu.currentIndex}`);
    console.log(`   Success: ${success ? '✅' : '❌'}`);
    
    return { success, responseTime, startIndex, endIndex: submenu.currentIndex };
  }
  
  // Main test sequence
  function runTestSequence() {
    console.log('\n1️⃣ Looking for active submenu...');
    
    let submenu = findActiveSubmenu();
    if (!submenu) {
      console.log('❌ No active submenu found.');
      console.log('💡 Click on a main menu item to open a submenu, then run this test again.');
      return;
    }
    
    console.log('✅ Active submenu found');
    console.log(`   Item count: ${submenu.itemMeshes ? submenu.itemMeshes.length : 'unknown'}`);
    console.log(`   Current index: ${submenu.currentIndex}`);
    console.log(`   Guard available: ${submenu.guard ? '✅' : '❌'}`);
    
    if (!submenu.itemMeshes || submenu.itemMeshes.length === 0) {
      console.log('❌ Submenu has no items');
      return;
    }
    
    const results = [];
    
    // Test 1: Click on item 1 (if exists)
    if (submenu.itemMeshes.length > 1) {
      console.log('\n2️⃣ Testing first click...');
      results.push(testClickResponse(submenu, 1));
      
      // Wait a moment
      setTimeout(() => {
        // Test 2: Click on item 2 (if exists)
        if (submenu.itemMeshes.length > 2) {
          console.log('\n3️⃣ Testing subsequent click...');
          results.push(testClickResponse(submenu, 2));
          
          setTimeout(() => {
            // Test 3: Click on item 0
            console.log('\n4️⃣ Testing return to first item...');
            results.push(testClickResponse(submenu, 0));
            
            // Report results
            setTimeout(() => {
              console.log('\n📊 TEST RESULTS SUMMARY:');
              console.log('=========================');
              
              let allPassed = true;
              let totalTime = 0;
              
              results.forEach((result, index) => {
                const status = result.success ? '✅ PASS' : '❌ FAIL';
                const timeColor = result.responseTime < 10 ? '🟢' : result.responseTime < 50 ? '🟡' : '🔴';
                console.log(`Test ${index + 1}: ${status} ${timeColor} ${result.responseTime.toFixed(2)}ms`);
                
                if (!result.success) allPassed = false;
                totalTime += result.responseTime;
              });
              
              const avgTime = totalTime / results.length;
              console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
              console.log(`⏱️ Average Response Time: ${avgTime.toFixed(2)}ms`);
              
              if (allPassed && avgTime < 50) {
                console.log('🎉 EXCELLENT! Submenu click-to-highlight is working perfectly!');
                console.log('✅ Fast response times');
                console.log('✅ Reliable index changes');
                console.log('✅ Works on repeated clicks');
              } else if (allPassed) {
                console.log('👍 GOOD! Functionality works but could be faster.');
              } else {
                console.log('⚠️ ISSUES DETECTED! Some clicks failed to register properly.');
              }
            }, 500);
          }, 500);
        }
      }, 500);
    }
  }
  
  runTestSequence();
}

// Function to test multiple submenu opens
function testMultipleSubmenus() {
  console.log('\n🔄 Testing Multiple Submenu Scenarios...');
  console.log('==========================================');
  
  const carousel = window.carousel;
  if (!carousel || !carousel.itemMeshes) {
    console.log('❌ Carousel not available');
    return;
  }
  
  console.log('💡 This test will open different submenus and test clicking in each.');
  console.log('💡 Watch the console for results...');
  
  // Test opening different submenus
  const testSubmenus = [0, 1, 2]; // Test first 3 main menu items
  let currentTest = 0;
  
  function testNextSubmenu() {
    if (currentTest >= testSubmenus.length) {
      console.log('\n🎉 Multi-submenu test completed!');
      return;
    }
    
    const menuIndex = testSubmenus[currentTest];
    console.log(`\n🔄 Opening submenu ${menuIndex + 1}...`);
    
    // Simulate clicking on main menu item
    if (carousel.handleItemClick) {
      carousel.handleItemClick(menuIndex);
      
      // Wait for submenu to open, then test
      setTimeout(() => {
        console.log(`🧪 Testing clicks in submenu ${menuIndex + 1}...`);
        testSubmenuClickFix();
        
        currentTest++;
        setTimeout(testNextSubmenu, 2000); // Wait 2 seconds before next test
      }, 1000);
    }
  }
  
  testNextSubmenu();
}

// Make functions globally available
window.testSubmenuClickFix = testSubmenuClickFix;
window.testMultipleSubmenus = testMultipleSubmenus;

console.log('🔧 Submenu Click Test Functions Loaded!');
console.log('=====================================');
console.log('');
console.log('Available commands:');
console.log('1. testSubmenuClickFix() - Test current submenu');
console.log('2. testMultipleSubmenus() - Test multiple submenus');
console.log('');
console.log('💡 First open a submenu by clicking on a main menu item,');
console.log('   then run: testSubmenuClickFix()');
