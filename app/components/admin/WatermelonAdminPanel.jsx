import {useState, useEffect} from 'react';
import {ClientOnly} from '../ClientOnly';
import {BackgroundPresetManager} from './BackgroundPresetManager';

/**
 * Visual Admin Panel for Watermelon Hydrogen 3D Menu System
 * Provides a UI for the existing console-based admin commands
 */
export function WatermelonAdminPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [menuMode, setMenuMode] = useState('auto');
  const [systemStatus, setSystemStatus] = useState({
    carouselLoaded: false,
    contentManagerLoaded: false,
    currentMenuSource: 'unknown',
    activeSubmenu: null
  });

  // Check system status
  useEffect(() => {
    const checkStatus = () => {
      const status = {
        carouselLoaded: !!window.watermelonAdmin,
        contentManagerLoaded: !!window.contentManager,
        currentMenuSource: window.debugMenuData?.source || 'unknown',
        activeSubmenu: window.watermelonAdmin?.getActiveSubmenu?.() ? 'open' : 'closed',
        menuMode: window.getMenuMode?.() || 'unknown'
      };
      setSystemStatus(status);
      setMenuMode(status.menuMode);
    };

    // Check immediately and then every 2 seconds
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Show/hide panel with keyboard shortcut
  useEffect(() => {
    const handleKeydown = (e) => {
      // Ctrl+Shift+A to toggle admin panel
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  const handleMenuModeChange = (newMode) => {
    if (window.watermelonAdmin?.setMenuMode) {
      window.watermelonAdmin.setMenuMode(newMode);
    } else {
      console.warn('watermelonAdmin not available yet');
    }
  };

  const handleContentLoad = (itemName) => {
    if (window.watermelonAdmin?.loadContent) {
      window.watermelonAdmin.loadContent(itemName);
    }
  };

  const handleClearCache = () => {
    if (window.watermelonAdmin?.clearContentCache) {
      window.watermelonAdmin.clearContentCache();
      console.log('🧹 Content cache cleared');
    }
  };

  const handleCloseSubmenu = () => {
    if (window.watermelonAdmin?.closeSubmenu) {
      window.watermelonAdmin.closeSubmenu();
    }
  };

  const handleRepairState = () => {
    if (window.watermelonAdmin?.repairState) {
      window.watermelonAdmin.repairState();
      console.log('🔧 System state repaired');
    }
  };

  if (!isVisible) {
    return (
      <button
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 10000,
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#00ff00',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontFamily: 'monospace',
          cursor: 'pointer',
          border: '1px solid #00ff00'
        }}
        onClick={() => setIsVisible(true)}
        title="Click to open admin panel (or Ctrl+Shift+A)"
      >
        🍉 Admin
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
  width: '420px',
        maxHeight: '80vh',
        overflowY: 'auto',
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.95)',
        color: '#00ff00',
        border: '2px solid #00ff00',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px'
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#00ff00',
          color: '#000',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 'bold'
        }}
      >
        🍉 Watermelon Admin
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#000',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '12px' }}>
        {/* System Status */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#00ffcc' }}>System Status</h3>
          <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
            <div>Carousel: {systemStatus.carouselLoaded ? '✅' : '❌'}</div>
            <div>Content Manager: {systemStatus.contentManagerLoaded ? '✅' : '❌'}</div>
            <div>Menu Source: {systemStatus.currentMenuSource}</div>
            <div>Active Submenu: {systemStatus.activeSubmenu}</div>
            <div>Current Mode: {menuMode}</div>
          </div>
        </div>

        {/* Menu Mode Controls */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#00ffcc' }}>Menu Mode</h3>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['dummy', 'dynamic', 'auto'].map(mode => (
              <button
                key={mode}
                onClick={() => handleMenuModeChange(mode)}
                style={{
                  background: menuMode === mode ? '#00ff00' : 'transparent',
                  color: menuMode === mode ? '#000' : '#00ff00',
                  border: '1px solid #00ff00',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  textTransform: 'capitalize'
                }}
              >
                {mode}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
            Page will reload when mode changes
          </div>
        </div>

        {/* Content Controls */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#00ffcc' }}>Content Controls</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {['Home', 'Services', 'Gallery', 'Cart'].map(item => (
              <button
                key={item}
                onClick={() => handleContentLoad(item)}
                style={{
                  background: 'transparent',
                  color: '#00ff00',
                  border: '1px solid #00ff00',
                  padding: '6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                Load {item}
              </button>
            ))}
          </div>
        </div>

        {/* System Controls */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#00ffcc' }}>System Controls</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={handleClearCache}
              style={{
                background: 'transparent',
                color: '#ffaa00',
                border: '1px solid #ffaa00',
                padding: '6px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              Clear Content Cache
            </button>
            <button
              onClick={handleCloseSubmenu}
              style={{
                background: 'transparent',
                color: '#ff6600',
                border: '1px solid #ff6600',
                padding: '6px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              Close Submenu
            </button>
            <button
              onClick={handleRepairState}
              style={{
                background: 'transparent',
                color: '#ff3300',
                border: '1px solid #ff3300',
                padding: '6px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              Repair State
            </button>
          </div>
        </div>

        {/* Background Presets */}
        <div style={{ marginBottom: '16px', pointerEvents: 'auto' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#00ffcc' }}>Background Presets</h3>
          <BackgroundPresetManager />
        </div>

        {/* Help */}
        <div style={{ fontSize: '10px', opacity: 0.7, lineHeight: '1.3' }}>
          <div><strong>Console Commands:</strong></div>
          <div>watermelonAdmin.showHelp()</div>
          <div>watermelonAdmin.setMenuMode(&quot;dummy&quot;)</div>
          <div>watermelonAdmin.loadContent(&quot;Home&quot;)</div>
          <div><strong>Keyboard:</strong> Ctrl+Shift+A</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Admin Panel Mount Component
 * Only renders on client side and in development
 */
export function AdminPanelMount() {
  return (
    <ClientOnly fallback={null}>
      {() => (
        // Only show in development or when explicitly enabled
        typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || 
         window.location.search.includes('admin=true') ||
         localStorage.getItem('watermelon-admin-enabled') === 'true') ? (
          <WatermelonAdminPanel />
        ) : null
      )}
    </ClientOnly>
  );
}
