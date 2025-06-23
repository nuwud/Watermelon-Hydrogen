/**
 * 3D Submenu Usability Test Script
 * 
 * This script provides testing utilities for validating the improved submenu functionality.
 * Run this in the browser console while the 3D carousel is active.
 */

// Test utilities for 3D submenu improvements
window.SubmenuUsabilityTests = {
  
  /**
   * Test hit area effectiveness by programmatically checking click targets
   */
  testHitAreas() {
    console.log('🎯 Testing Hit Area Improvements...');
    
    const activeSubmenu = window.debugSubmenu || window.activeSubmenu;
    if (!activeSubmenu) {
      console.warn('❌ No active submenu found. Please open a submenu first.');
      return;
    }
    
    const hitAreas = [];
    activeSubmenu.itemMeshes.forEach((container, index) => {
      const hitArea = container.userData.hitArea;
      if (hitArea) {
        const geometry = hitArea.geometry;
        const size = {
          width: geometry.parameters.width,
          height: geometry.parameters.height,
          depth: geometry.parameters.depth
        };
        hitAreas.push({
          index,
          itemName: container.userData.item,
          hitAreaSize: size,
          isVisible: hitArea.visible,
          hasClickHandler: hitArea.userData.isSubmenuItem
        });
      }
    });
    
    console.log('Hit Areas:', hitAreas);
    console.log(`✅ Found ${hitAreas.length} hit areas with improved sizing`);
    
    // Check minimum size requirements
    const meetsMinimum = hitAreas.every(area => 
      area.hitAreaSize.width >= 2.5 && area.hitAreaSize.height >= 1.2
    );
    
    console.log(meetsMinimum ? 
      '✅ All hit areas meet minimum size requirements' : 
      '❌ Some hit areas are too small'
    );
    
    return hitAreas;
  },
  
  /**
   * Test continuous scroll functionality
   */
  testContinuousScroll() {
    console.log('🔄 Testing Continuous Scroll...');
    
    const activeSubmenu = window.debugSubmenu || window.activeSubmenu;
    if (!activeSubmenu) {
      console.warn('❌ No active submenu found. Please open a submenu first.');
      return;
    }
    
    const totalItems = activeSubmenu.itemMeshes.length;
    console.log(`📊 Testing with ${totalItems} items`);
    
    // Store initial state
    const initialIndex = activeSubmenu.getFrontIndex();
    const initialRotation = activeSubmenu.targetRotation;
    
    console.log(`🏁 Starting from index ${initialIndex}, rotation ${initialRotation.toFixed(3)}`);
    
    // Test forward scrolling
    const testScrollForward = () => {
      console.log('➡️ Testing forward scroll...');
      activeSubmenu.scrollSubmenu(1);
      
      setTimeout(() => {
        const newIndex = activeSubmenu.getFrontIndex();
        const newRotation = activeSubmenu.targetRotation;
        console.log(`➡️ After forward scroll: index ${newIndex}, rotation ${newRotation.toFixed(3)}`);
        
        // Test backward scrolling
        setTimeout(() => {
          console.log('⬅️ Testing backward scroll...');
          activeSubmenu.scrollSubmenu(-1);
          
          setTimeout(() => {
            const finalIndex = activeSubmenu.getFrontIndex();
            const finalRotation = activeSubmenu.targetRotation;
            console.log(`⬅️ After backward scroll: index ${finalIndex}, rotation ${finalRotation.toFixed(3)}`);
            
            const backToOriginal = finalIndex === initialIndex;
            console.log(backToOriginal ? 
              '✅ Continuous scroll working correctly - returned to original position' :
              '❌ Continuous scroll issue - did not return to original position'
            );
          }, 500);
        }, 500);
      }, 500);
    };
    
    testScrollForward();
  },
  
  /**
   * Test dynamic text sizing
   */
  testDynamicTextSizing() {
    console.log('📏 Testing Dynamic Text Sizing...');
    
    const activeSubmenu = window.debugSubmenu || window.activeSubmenu;
    if (!activeSubmenu) {
      console.warn('❌ No active submenu found. Please open a submenu first.');
      return;
    }
    
    const textSizeData = [];
    activeSubmenu.itemMeshes.forEach((container, index) => {
      const item = container.userData.item;
      const mesh = container.userData.mesh;
      
      if (mesh && mesh.geometry && mesh.geometry.parameters) {
        const textLength = item.toString().length;
        const fontSize = mesh.geometry.parameters.size || 'unknown';
        
        // Calculate expected size based on our algorithm
        let expectedSize = 0.28;
        if (textLength > 25) expectedSize = 0.16;
        else if (textLength > 20) expectedSize = 0.18;
        else if (textLength > 15) expectedSize = 0.20;
        else if (textLength > 12) expectedSize = 0.22;
        else if (textLength > 8) expectedSize = 0.24;
        
        textSizeData.push({
          index,
          text: item.toString(),
          length: textLength,
          actualSize: fontSize,
          expectedSize,
          matches: Math.abs(fontSize - expectedSize) < 0.01
        });
      }
    });
    
    console.log('Text Size Data:', textSizeData);
    
    const allMatch = textSizeData.every(data => data.matches);
    console.log(allMatch ?
      '✅ All text sizes match expected dynamic sizing' :
      '❌ Some text sizes do not match expected values'
    );
    
    return textSizeData;
  },
  
  /**
   * Test modern color palette
   */
  testColorPalette() {
    console.log('🎨 Testing Modern Color Palette...');
    
    const activeSubmenu = window.debugSubmenu || window.activeSubmenu;
    if (!activeSubmenu) {
      console.warn('❌ No active submenu found. Please open a submenu first.');
      return;
    }
    
    const colorData = [];
    activeSubmenu.itemMeshes.forEach((container, index) => {
      const mesh = container.userData.mesh;
      const iconMesh = container.userData.iconMesh;
      
      if (mesh && mesh.material) {
        const modernColors = activeSubmenu.getModernColorPalette(index);
        const iconColor = activeSubmenu.getIconColor(index);
        
        colorData.push({
          index,
          item: container.userData.item,
          textColor: `#${mesh.material.color.getHexString()}`,
          emissiveColor: `#${mesh.material.emissive.getHexString()}`,
          expectedTextColor: `#${modernColors.text.toString(16).padStart(6, '0')}`,
          expectedEmissive: `#${modernColors.emissive.toString(16).padStart(6, '0')}`,
          iconColor: iconMesh ? `#${iconColor.toString(16).padStart(6, '0')}` : 'N/A',
          theme: this.getThemeName(index)
        });
      }
    });
    
    console.log(colorData);
    console.log('✅ Color palette data collected - verify colors match themes');
    
    return colorData;
  },
  
  /**
   * Get theme name for index
   */
  getThemeName(index) {
    const themes = [
      'Deep Ocean', 'Sunset', 'Forest', 'Royal Purple',
      'Cyber', 'Golden', 'Rose', 'Electric'
    ];
    return themes[index % themes.length];
  },
  
  /**
   * Run all tests
   */
  runAllTests() {
    console.log('🧪 Running All Submenu Usability Tests...');
    console.log('='.repeat(50));
    
    try {
      this.testHitAreas();
      console.log('');
      
      this.testDynamicTextSizing();
      console.log('');
      
      this.testColorPalette();
      console.log('');
      
      // Run scroll test last as it's animated
      setTimeout(() => {
        this.testContinuousScroll();
        console.log('');
        console.log('🎉 All tests completed!');
      }, 1000);
      
    } catch (error) {
      console.error('❌ Test suite error:', error);
    }
  },
  
  /**
   * Check for submenu availability
   */
  checkSubmenuAvailability() {
    const activeSubmenu = window.debugSubmenu || window.activeSubmenu;
    if (activeSubmenu) {
      console.log('✅ Active submenu found:', {
        itemCount: activeSubmenu.itemMeshes.length,
        currentIndex: activeSubmenu.currentIndex,
        isVisible: activeSubmenu.visible
      });
      return true;
    } else {
      console.log('ℹ️ No active submenu. To test:');
      console.log('1. Navigate to the 3D carousel');
      console.log('2. Click on a menu item that has a submenu');
      console.log('3. Run the tests again');
      return false;
    }
  }
};

// Auto-check for submenu when script loads
console.log('🔧 3D Submenu Usability Test Suite Loaded');
console.log('📋 Available commands:');
console.log('- SubmenuUsabilityTests.checkSubmenuAvailability()');
console.log('- SubmenuUsabilityTests.testHitAreas()');
console.log('- SubmenuUsabilityTests.testContinuousScroll()');
console.log('- SubmenuUsabilityTests.testDynamicTextSizing()');
console.log('- SubmenuUsabilityTests.testColorPalette()');
console.log('- SubmenuUsabilityTests.runAllTests()');
console.log('');

window.SubmenuUsabilityTests.checkSubmenuAvailability();
