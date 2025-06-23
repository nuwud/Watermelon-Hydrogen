/**
 * Test script to verify that submenu stacking is fixed
 * 
 * This script can be run in the browser console to test:
 * 1. Open one submenu
 * 2. Open another submenu 
 * 3. Verify that only one submenu exists in the scene
 */

function testSubmenuStacking() {
    console.log('🧪 [Submenu Test] Starting submenu stacking test...');
    
    // Get references to the global objects
    const scene = window.__wm__?.scene;
    const carousel = window.__wm__?.carousel;
    
    if (!scene || !carousel) {
        console.error('❌ [Submenu Test] Scene or carousel not found. Make sure the 3D environment is loaded.');
        return;
    }
    
    // Function to count submenu objects in the scene
    function countSubmenus() {
        const submenuObjects = scene.children.filter(child => 
            child.userData?.isSubmenu || 
            child.constructor.name === 'Carousel3DSubmenu' ||
            child.name?.includes('submenu')
        );
        return submenuObjects.length;
    }
    
    // Function to simulate a click on a carousel item
    function simulateCarouselClick(index) {
        return new Promise((resolve) => {
            console.log(`🖱️ [Submenu Test] Simulating click on carousel item ${index}...`);
            
            // Get the item
            const item = carousel.items[index];
            if (!item) {
                console.error(`❌ [Submenu Test] No item found at index ${index}`);
                resolve();
                return;
            }
            
            // Trigger the click
            if (carousel.onItemClick) {
                carousel.onItemClick(index, item.userData.itemData.label).then(() => {
                    setTimeout(() => {
                        const submenuCount = countSubmenus();
                        console.log(`📊 [Submenu Test] After clicking item ${index}, found ${submenuCount} submenus in scene`);
                        resolve(submenuCount);
                    }, 500); // Wait for animation to complete
                });
            } else {
                console.error('❌ [Submenu Test] No onItemClick handler found');
                resolve();
            }
        });
    }
    
    // Run the test sequence
    async function runTest() {
        try {
            console.log('📊 [Submenu Test] Initial submenu count:', countSubmenus());
            
            // Click on first item with submenu
            const count1 = await simulateCarouselClick(0);
            
            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Click on second item with submenu
            const count2 = await simulateCarouselClick(1);
            
            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Click on third item with submenu
            const count3 = await simulateCarouselClick(2);
            
            // Verify results
            console.log(`📊 [Submenu Test] Final results:`);
            console.log(`   - After click 1: ${count1} submenus`);
            console.log(`   - After click 2: ${count2} submenus`);
            console.log(`   - After click 3: ${count3} submenus`);
            
            if (count1 <= 1 && count2 <= 1 && count3 <= 1) {
                console.log('✅ [Submenu Test] SUCCESS! No submenu stacking detected.');
            } else {
                console.log('❌ [Submenu Test] FAILURE! Submenu stacking still occurs.');
            }
            
        } catch (error) {
            console.error('❌ [Submenu Test] Test failed with error:', error);
        }
    }
    
    // Start the test
    runTest();
}

// Function to manually check current submenu count
function checkSubmenuCount() {
    const scene = window.__wm__?.scene;
    if (!scene) {
        console.error('❌ Scene not found');
        return 0;
    }
    
    const submenuObjects = scene.children.filter(child => 
        child.userData?.isSubmenu || 
        child.constructor.name === 'Carousel3DSubmenu' ||
        child.name?.includes('submenu')
    );
    
    console.log(`📊 Current submenu count: ${submenuObjects.length}`);
    if (submenuObjects.length > 0) {
        console.log('📋 Submenu objects found:');
        submenuObjects.forEach((obj, i) => {
            console.log(`   ${i + 1}. ${obj.constructor.name} - visible: ${obj.visible}`);
        });
    }
    
    return submenuObjects.length;
}

// Make functions available globally for manual testing
window.testSubmenuStacking = testSubmenuStacking;
window.checkSubmenuCount = checkSubmenuCount;

console.log('🧪 [Submenu Test] Test functions loaded. Use testSubmenuStacking() or checkSubmenuCount() in console.');
