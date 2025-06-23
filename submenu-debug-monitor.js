/**
 * Submenu Debug Monitor
 * 
 * This script adds debugging capabilities to monitor submenu creation/removal
 * to help identify and fix submenu stacking issues.
 */

// Track submenu operations
let submenuOperationLog = [];

// Enhanced scene monitoring
function createSubmenuMonitor(scene) {
    if (!scene) {
        console.error('❌ [Submenu Monitor] Scene not provided');
        return;
    }
    
    let lastSubmenuCount = 0;
    
    // Monitor scene changes
    setInterval(() => {
        const submenuObjects = scene.children.filter(child => 
            child.userData?.isSubmenu || 
            child.constructor.name === 'Carousel3DSubmenu' ||
            child.name?.includes('submenu')
        );
        
        const currentCount = submenuObjects.length;
        
        if (currentCount !== lastSubmenuCount) {
            const timestamp = new Date().toLocaleTimeString();
            const operation = currentCount > lastSubmenuCount ? 'ADDED' : 'REMOVED';
            const logEntry = {
                timestamp,
                operation,
                count: currentCount,
                previous: lastSubmenuCount,
                objects: submenuObjects.map(obj => ({
                    type: obj.constructor.name,
                    visible: obj.visible,
                    uuid: obj.uuid.slice(0, 8),
                    isSubmenu: obj.userData?.isSubmenu || false
                }))
            };
            
            submenuOperationLog.push(logEntry);
            
            // Log with appropriate styling
            const color = currentCount > 1 ? 'color: red; font-weight: bold;' : 'color: green;';
            console.log(`%c🔍 [Submenu Monitor] ${operation} - Count: ${currentCount} (was ${lastSubmenuCount})`, color);
            
            if (currentCount > 1) {
                console.warn(`⚠️ [Submenu Monitor] STACKING DETECTED! Found ${currentCount} submenus:`);
                submenuObjects.forEach((obj, i) => {
                    console.warn(`   ${i + 1}. ${obj.constructor.name} - UUID: ${obj.uuid.slice(0, 8)} - Visible: ${obj.visible}`);
                });
            }
            
            lastSubmenuCount = currentCount;
        }
    }, 100); // Check every 100ms
    
    console.log('🔍 [Submenu Monitor] Started monitoring submenu operations');
}

// Function to get submenu operation history
function getSubmenuOperationLog() {
    return submenuOperationLog;
}

// Function to clear the operation log
function clearSubmenuOperationLog() {
    submenuOperationLog = [];
    console.log('🗑️ [Submenu Monitor] Operation log cleared');
}

// Function to manually count submenus
function countActiveSubmenus() {
    const scene = window.__wm__?.scene;
    if (!scene) {
        console.error('❌ [Submenu Monitor] Scene not found');
        return 0;
    }
    
    const submenuObjects = scene.children.filter(child => 
        child.userData?.isSubmenu || 
        child.constructor.name === 'Carousel3DSubmenu' ||
        child.name?.includes('submenu')
    );
    
    console.log(`📊 [Submenu Monitor] Current submenu count: ${submenuObjects.length}`);
    
    if (submenuObjects.length > 0) {
        console.log('📋 [Submenu Monitor] Active submenus:');
        submenuObjects.forEach((obj, i) => {
            console.log(`   ${i + 1}. ${obj.constructor.name} - UUID: ${obj.uuid.slice(0, 8)} - Visible: ${obj.visible}`);
        });
    }
    
    return submenuObjects.length;
}

// Function to force cleanup stray submenus
function forceCleanupSubmenus() {
    const scene = window.__wm__?.scene;
    if (!scene) {
        console.error('❌ [Submenu Monitor] Scene not found');
        return;
    }
    
    const submenuObjects = scene.children.filter(child => 
        child.userData?.isSubmenu || 
        child.constructor.name === 'Carousel3DSubmenu' ||
        child.name?.includes('submenu')
    );
    
    if (submenuObjects.length === 0) {
        console.log('✅ [Submenu Monitor] No submenus to clean up');
        return;
    }
    
    console.log(`🧹 [Submenu Monitor] Force cleaning ${submenuObjects.length} submenus...`);
    
    submenuObjects.forEach((obj, i) => {
        console.log(`   Removing ${i + 1}. ${obj.constructor.name} - UUID: ${obj.uuid.slice(0, 8)}`);
        scene.remove(obj);
        if (typeof obj.dispose === 'function') {
            obj.dispose();
        }
    });
    
    // Also clear active submenu references
    if (window.__wm__?.activeSubmenu) {
        window.__wm__.activeSubmenu = null;
    }
    
    console.log('✅ [Submenu Monitor] Force cleanup complete');
}

// Initialize monitoring if scene is available
function initSubmenuMonitor() {
    const scene = window.__wm__?.scene;
    if (scene) {
        createSubmenuMonitor(scene);
    } else {
        console.log('⏳ [Submenu Monitor] Waiting for scene to be available...');
        // Try again in 1 second
        setTimeout(initSubmenuMonitor, 1000);
    }
}

// Export functions globally
window.submenuMonitor = {
    init: initSubmenuMonitor,
    count: countActiveSubmenus,
    log: getSubmenuOperationLog,
    clearLog: clearSubmenuOperationLog,
    forceCleanup: forceCleanupSubmenus
};

// Auto-start monitoring
initSubmenuMonitor();

console.log('🔍 [Submenu Monitor] Debug monitor loaded. Use window.submenuMonitor for controls.');
