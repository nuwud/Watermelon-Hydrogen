/**
 * Debug script to test submenu click-to-highlight functionality
 * 
 * Usage:
 * 1. Open the browser console
 * 2. Copy and paste this script
 * 3. Run it to monitor submenu click events
 * 4. Click on submenu items and observe the debug output
 */

// Monitor submenu click events
(function debugSubmenuClicks() {
  console.log('🔍 Submenu Click Debug Monitor Started');
  
  // Track clicks on submenu items
  let originalConsoleWarn = console.warn;
  console.warn = function(...args) {
    const message = args.join(' ');
    
    // Highlight submenu-related logs
    if (message.includes('handleItemClick') || 
        message.includes('selectItem') || 
        message.includes('Submenu Item clicked')) {
      console.log('🎯 SUBMENU CLICK:', ...args);
    }
    
    // Call original console.warn
    originalConsoleWarn.apply(console, args);
  };
  
  // Monitor for submenu creation
  const checkForSubmenu = () => {
    const submenus = document.querySelectorAll('canvas');
    if (submenus.length > 0) {
      console.log('✅ Canvas elements found:', submenus.length);
      
      // Monitor for Three.js scenes
      if (window.THREE && window.scene) {
        console.log('✅ Three.js scene detected');
        
        // Look for submenu objects in the scene
        window.scene.traverse((object) => {
          if (object.name === 'Carousel3DSubmenu') {
            console.log('✅ Carousel3DSubmenu found in scene');
            
            // Add click event monitoring
            document.addEventListener('click', (event) => {
              console.log('🖱️ Click detected at:', event.clientX, event.clientY);
            });
          }
        });
      }
    }
  };
  
  // Check every second for the submenu
  const interval = setInterval(() => {
    checkForSubmenu();
    
    // Stop checking after 30 seconds
    if (Date.now() - startTime > 30000) {
      clearInterval(interval);
      console.log('🛑 Submenu monitoring timeout');
    }
  }, 1000);
  
  const startTime = Date.now();
  
  console.log('🚀 Instructions:');
  console.log('1. Navigate to a page with the 3D carousel');
  console.log('2. Click on a main carousel item to open submenu');
  console.log('3. Click on different submenu items');
  console.log('4. Watch for debug messages in this format: 🎯 SUBMENU CLICK');
  console.log('5. Verify that clicked items animate to the 3 o\'clock position');
})();
