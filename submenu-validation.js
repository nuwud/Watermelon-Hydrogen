/**
 * Quick Submenu Validation Script
 * 
 * Run this in the browser console to quickly test the submenu fix
 */

(function() {
    console.log('🧪 [Submenu Validation] Starting quick validation test...');
    
    // Wait for the scene to be available
    function waitForScene() {
        return new Promise((resolve) => {
            const checkScene = () => {
                if (window.__wm__?.scene && window.__wm__?.carousel) {
                    resolve();
                } else {
                    setTimeout(checkScene, 500);
                }
            };
            checkScene();
        });
    }
    
    // Test submenu switching
    async function testSubmenuSwitching() {
        await waitForScene();
        
        const scene = window.__wm__.scene;
        const carousel = window.__wm__.carousel;
        
        console.log('🎯 [Submenu Validation] Scene and carousel found, starting test...');
        
        // Function to count submenus
        function countSubmenus() {
            return scene.children.filter(child => 
                child.userData?.isSubmenu || 
                child.constructor.name === 'Carousel3DSubmenu' ||
                child.name?.includes('submenu')
            ).length;
        }
        
        // Function to click on carousel item
        function clickCarouselItem(index) {
            return new Promise((resolve) => {
                console.log(`🖱️ [Submenu Validation] Clicking item ${index}...`);
                
                // Get the item
                const item = carousel.items[index];
                if (item && carousel.onItemClick) {
                    const itemLabel = item.userData.itemData.label;
                    carousel.onItemClick(index, itemLabel).then(() => {
                        setTimeout(() => {
                            const count = countSubmenus();
                            console.log(`📊 [Submenu Validation] After clicking "${itemLabel}", submenu count: ${count}`);
                            resolve(count);
                        }, 1000); // Wait for animation
                    }).catch(err => {
                        console.error('❌ [Submenu Validation] Error during click:', err);
                        resolve(0);
                    });
                } else {
                    console.warn('⚠️ [Submenu Validation] Item or onItemClick not found');
                    resolve(0);
                }
            });
        }
        
        try {
            // Initial count
            const initialCount = countSubmenus();
            console.log(`📊 [Submenu Validation] Initial submenu count: ${initialCount}`);
            
            // Test clicks on items that have submenus
            const testIndexes = [0, 1, 2, 3, 4, 5]; // Test first 6 items
            const results = [];
            
            for (let i = 0; i < testIndexes.length; i++) {
                const index = testIndexes[i];
                const count = await clickCarouselItem(index);
                results.push({ index, count });
                
                // Wait between clicks
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Analyze results
            const maxCount = Math.max(...results.map(r => r.count));
            const hasStacking = maxCount > 1;
            
            console.log('📋 [Submenu Validation] Test Results:');
            results.forEach(r => {
                const status = r.count <= 1 ? '✅' : '❌';
                console.log(`   ${status} Item ${r.index}: ${r.count} submenu(s)`);
            });
            
            if (hasStacking) {
                console.log(`❌ [Submenu Validation] FAILED: Detected submenu stacking (max count: ${maxCount})`);
            } else {
                console.log('✅ [Submenu Validation] SUCCESS: No submenu stacking detected!');
            }
            
            // Final cleanup
            const finalCount = countSubmenus();
            console.log(`📊 [Submenu Validation] Final submenu count: ${finalCount}`);
            
        } catch (error) {
            console.error('❌ [Submenu Validation] Test failed:', error);
        }
    }
    
    // Start the test
    testSubmenuSwitching();
    
})();

// Also make the test available globally
window.validateSubmenuFix = function() {
    console.log('🧪 [Submenu Validation] Manual validation started...');
    
    const scene = window.__wm__?.scene;
    if (!scene) {
        console.error('❌ [Submenu Validation] Scene not found');
        return;
    }
    
    const submenuObjects = scene.children.filter(child => 
        child.userData?.isSubmenu || 
        child.constructor.name === 'Carousel3DSubmenu' ||
        child.name?.includes('submenu')
    );
    
    console.log(`📊 [Submenu Validation] Current submenu count: ${submenuObjects.length}`);
    
    if (submenuObjects.length > 1) {
        console.log('❌ [Submenu Validation] Multiple submenus detected:');
        submenuObjects.forEach((obj, i) => {
            console.log(`   ${i + 1}. ${obj.constructor.name} - UUID: ${obj.uuid.slice(0, 8)} - Visible: ${obj.visible}`);
        });
        return false;
    } else if (submenuObjects.length === 1) {
        console.log('✅ [Submenu Validation] Single submenu found (correct)');
        return true;
    } else {
        console.log('ℹ️ [Submenu Validation] No submenus currently active');
        return true;
    }
};

console.log('🧪 [Submenu Validation] Validation script loaded. Use validateSubmenuFix() for manual check.');
