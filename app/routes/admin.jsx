/**
 * Admin Panel Route - Watermelon 3D Theme Editor
 * Live preview and configuration for 3D scene settings
 * 
 * This is Phase 4 of the UX Enhancement Roadmap
 */

import {useState, useEffect, useCallback} from 'react';
import {json} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';

// Default configuration
const DEFAULT_CONFIG = {
  // Scene settings
  scene: {
    backgroundColor: '#0a0a1a',
    fogColor: '#0a0a1a',
    fogNear: 12,
    fogFar: 45,
  },
  // Camera settings
  camera: {
    fov: 75,
    positionX: 0,
    positionY: 2,
    positionZ: 10,
    spotlightIntensity: 2.5,
    spotlightAngle: 60,
    fillLightIntensity: 1.2,
  },
  // Carousel settings
  carousel: {
    radius: 5,
    rotationSpeed: 0.05,
    highlightScale: 1.2,
    glowIntensity: 0.8,
    textColor: '#4488ff',
    glowColor: '#00aaff',
    hoverScale: 1.1,
  },
  // Submenu settings
  submenu: {
    radius: 2.5,
    offsetX: 3.5,
    offsetY: 0.3,
    animationDuration: 0.4,
    itemScale: 0.8,
  },
  // Mobile settings
  mobile: {
    enableFerrisWheel: true,
    ferrisWheelRadius: 4,
    breakpoint: 768,
  },
  // Theme preset
  activeTheme: 'default',
};

export async function loader({request}) {
  // In production, load from Shopify Metaobjects
  // For now, return defaults
  return json({
    config: DEFAULT_CONFIG,
    isDevMode: process.env.NODE_ENV === 'development',
  });
}

export default function AdminPanel() {
  const {config: initialConfig, isDevMode} = useLoaderData();
  const [config, setConfig] = useState(initialConfig);
  const [activeTab, setActiveTab] = useState('scene');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Load saved config from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('watermelon-admin-config');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setConfig(prev => ({...prev, ...parsed}));
          console.log('[Admin] Loaded saved config from localStorage');
        } catch (e) {
          console.warn('[Admin] Failed to parse saved config:', e);
        }
      }
    }
  }, []);

  // Apply config to live scene
  const applyToScene = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    // Dispatch config update event for the 3D scene to listen to
    window.dispatchEvent(new CustomEvent('watermelon-config-update', {
      detail: config
    }));
    
    // Also set on window for direct access
    window.__wmConfig = config;
    
    console.log('[Admin] Applied config to scene:', config);
  }, [config]);

  // Save config
  const saveConfig = useCallback(async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('watermelon-admin-config', JSON.stringify(config));
      
      // In future: Save to Shopify Metaobjects via API
      // await fetch('/api/admin/config', { method: 'POST', body: JSON.stringify(config) });
      
      setLastSaved(new Date().toLocaleTimeString());
      console.log('[Admin] Config saved');
    } catch (e) {
      console.error('[Admin] Failed to save config:', e);
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem('watermelon-admin-config');
    console.log('[Admin] Reset to defaults');
  }, []);

  // Update nested config value
  const updateConfig = useCallback((section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  }, []);

  // Apply changes automatically when config changes
  useEffect(() => {
    const debounce = setTimeout(() => {
      applyToScene();
    }, 100);
    return () => clearTimeout(debounce);
  }, [config, applyToScene]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>🍉 Watermelon Admin</h1>
        <div style={styles.headerActions}>
          <span style={styles.savedIndicator}>
            {lastSaved && `Last saved: ${lastSaved}`}
          </span>
          <button onClick={resetToDefaults} style={styles.buttonSecondary}>
            Reset Defaults
          </button>
          <button onClick={saveConfig} style={styles.buttonPrimary} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Config'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={styles.main}>
        {/* Sidebar Tabs */}
        <nav style={styles.sidebar}>
          {['scene', 'camera', 'carousel', 'submenu', 'mobile'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab ? styles.tabButtonActive : {})
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        {/* Config Panel */}
        <div style={styles.configPanel}>
          {activeTab === 'scene' && (
            <ConfigSection title="Scene Settings">
              <ColorInput
                label="Background Color"
                value={config.scene.backgroundColor}
                onChange={v => updateConfig('scene', 'backgroundColor', v)}
              />
              <ColorInput
                label="Fog Color"
                value={config.scene.fogColor}
                onChange={v => updateConfig('scene', 'fogColor', v)}
              />
              <SliderInput
                label="Fog Near"
                value={config.scene.fogNear}
                min={0}
                max={50}
                onChange={v => updateConfig('scene', 'fogNear', v)}
              />
              <SliderInput
                label="Fog Far"
                value={config.scene.fogFar}
                min={10}
                max={100}
                onChange={v => updateConfig('scene', 'fogFar', v)}
              />
            </ConfigSection>
          )}

          {activeTab === 'camera' && (
            <ConfigSection title="Camera Settings">
              <SliderInput
                label="Field of View"
                value={config.camera.fov}
                min={30}
                max={120}
                onChange={v => updateConfig('camera', 'fov', v)}
              />
              <SliderInput
                label="Position X"
                value={config.camera.positionX}
                min={-20}
                max={20}
                step={0.5}
                onChange={v => updateConfig('camera', 'positionX', v)}
              />
              <SliderInput
                label="Position Y"
                value={config.camera.positionY}
                min={-10}
                max={10}
                step={0.5}
                onChange={v => updateConfig('camera', 'positionY', v)}
              />
              <SliderInput
                label="Position Z"
                value={config.camera.positionZ}
                min={5}
                max={30}
                step={0.5}
                onChange={v => updateConfig('camera', 'positionZ', v)}
              />
              <SliderInput
                label="Spotlight Intensity"
                value={config.camera.spotlightIntensity}
                min={0}
                max={5}
                step={0.1}
                onChange={v => updateConfig('camera', 'spotlightIntensity', v)}
              />
              <SliderInput
                label="Spotlight Angle"
                value={config.camera.spotlightAngle}
                min={15}
                max={90}
                onChange={v => updateConfig('camera', 'spotlightAngle', v)}
              />
              <SliderInput
                label="Fill Light Intensity"
                value={config.camera.fillLightIntensity}
                min={0}
                max={3}
                step={0.1}
                onChange={v => updateConfig('camera', 'fillLightIntensity', v)}
              />
            </ConfigSection>
          )}

          {activeTab === 'carousel' && (
            <ConfigSection title="Carousel Settings">
              <SliderInput
                label="Radius"
                value={config.carousel.radius}
                min={2}
                max={10}
                step={0.5}
                onChange={v => updateConfig('carousel', 'radius', v)}
              />
              <SliderInput
                label="Rotation Speed"
                value={config.carousel.rotationSpeed}
                min={0.01}
                max={0.2}
                step={0.01}
                onChange={v => updateConfig('carousel', 'rotationSpeed', v)}
              />
              <SliderInput
                label="Highlight Scale"
                value={config.carousel.highlightScale}
                min={1}
                max={2}
                step={0.1}
                onChange={v => updateConfig('carousel', 'highlightScale', v)}
              />
              <SliderInput
                label="Glow Intensity"
                value={config.carousel.glowIntensity}
                min={0}
                max={2}
                step={0.1}
                onChange={v => updateConfig('carousel', 'glowIntensity', v)}
              />
              <ColorInput
                label="Text Color"
                value={config.carousel.textColor}
                onChange={v => updateConfig('carousel', 'textColor', v)}
              />
              <ColorInput
                label="Glow Color"
                value={config.carousel.glowColor}
                onChange={v => updateConfig('carousel', 'glowColor', v)}
              />
              <SliderInput
                label="Hover Scale"
                value={config.carousel.hoverScale}
                min={1}
                max={1.5}
                step={0.05}
                onChange={v => updateConfig('carousel', 'hoverScale', v)}
              />
            </ConfigSection>
          )}

          {activeTab === 'submenu' && (
            <ConfigSection title="Submenu Settings">
              <SliderInput
                label="Radius"
                value={config.submenu.radius}
                min={1}
                max={5}
                step={0.25}
                onChange={v => updateConfig('submenu', 'radius', v)}
              />
              <SliderInput
                label="Offset X"
                value={config.submenu.offsetX}
                min={0}
                max={8}
                step={0.5}
                onChange={v => updateConfig('submenu', 'offsetX', v)}
              />
              <SliderInput
                label="Offset Y"
                value={config.submenu.offsetY}
                min={-2}
                max={2}
                step={0.1}
                onChange={v => updateConfig('submenu', 'offsetY', v)}
              />
              <SliderInput
                label="Animation Duration"
                value={config.submenu.animationDuration}
                min={0.1}
                max={1}
                step={0.05}
                onChange={v => updateConfig('submenu', 'animationDuration', v)}
              />
              <SliderInput
                label="Item Scale"
                value={config.submenu.itemScale}
                min={0.5}
                max={1.5}
                step={0.1}
                onChange={v => updateConfig('submenu', 'itemScale', v)}
              />
            </ConfigSection>
          )}

          {activeTab === 'mobile' && (
            <ConfigSection title="Mobile Settings">
              <ToggleInput
                label="Enable Ferris Wheel Mode"
                value={config.mobile.enableFerrisWheel}
                onChange={v => updateConfig('mobile', 'enableFerrisWheel', v)}
              />
              <SliderInput
                label="Ferris Wheel Radius"
                value={config.mobile.ferrisWheelRadius}
                min={2}
                max={8}
                step={0.5}
                onChange={v => updateConfig('mobile', 'ferrisWheelRadius', v)}
              />
              <SliderInput
                label="Breakpoint (px)"
                value={config.mobile.breakpoint}
                min={320}
                max={1024}
                step={8}
                onChange={v => updateConfig('mobile', 'breakpoint', v)}
              />
            </ConfigSection>
          )}
        </div>

        {/* Preview Panel (placeholder for now) */}
        <div style={styles.previewPanel}>
          <h3 style={styles.previewTitle}>Live Preview</h3>
          <p style={styles.previewHint}>
            Changes apply to the main carousel in real-time.
            <br /><br />
            Open the homepage in another tab to see changes.
          </p>
          <div style={styles.previewPlaceholder}>
            <span>🎡</span>
            <span style={{fontSize: '14px', marginTop: '10px'}}>3D Preview</span>
          </div>
          
          {/* Quick Actions */}
          <div style={styles.quickActions}>
            <h4>Quick Actions</h4>
            <button 
              onClick={() => window.open('/', '_blank')} 
              style={styles.buttonSecondary}
            >
              Open Homepage →
            </button>
            <button 
              onClick={() => {
                if (window.__wmBackgroundManager) {
                  window.__wmBackgroundManager.cycleNext();
                }
              }} 
              style={styles.buttonSecondary}
            >
              Cycle Background
            </button>
          </div>
        </div>
      </div>

      {/* Dev Mode Indicator */}
      {isDevMode && (
        <div style={styles.devBanner}>
          Development Mode - Config saved to localStorage
        </div>
      )}
    </div>
  );
}

// ============================================
// UI Components
// ============================================

function ConfigSection({title, children}) {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

function SliderInput({label, value, min, max, step = 1, onChange}) {
  return (
    <div style={styles.inputGroup}>
      <label style={styles.label}>
        {label}: <span style={styles.value}>{value}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={styles.slider}
      />
    </div>
  );
}

function ColorInput({label, value, onChange}) {
  return (
    <div style={styles.inputGroup}>
      <label style={styles.label}>{label}</label>
      <div style={styles.colorWrapper}>
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={styles.colorPicker}
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={styles.colorText}
        />
      </div>
    </div>
  );
}

function ToggleInput({label, value, onChange}) {
  return (
    <div style={styles.inputGroup}>
      <label style={styles.label}>{label}</label>
      <button
        onClick={() => onChange(!value)}
        style={{
          ...styles.toggle,
          backgroundColor: value ? '#22c55e' : '#64748b'
        }}
      >
        {value ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

// ============================================
// Styles
// ============================================

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  savedIndicator: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  main: {
    display: 'flex',
    minHeight: 'calc(100vh - 73px)',
  },
  sidebar: {
    width: '180px',
    backgroundColor: '#1e293b',
    padding: '16px 0',
    borderRight: '1px solid #334155',
  },
  tabButton: {
    display: 'block',
    width: '100%',
    padding: '12px 24px',
    textAlign: 'left',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '15px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabButtonActive: {
    backgroundColor: '#334155',
    color: '#f8fafc',
    borderLeft: '3px solid #3b82f6',
  },
  configPanel: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
  },
  previewPanel: {
    width: '320px',
    backgroundColor: '#1e293b',
    padding: '24px',
    borderLeft: '1px solid #334155',
  },
  previewTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    color: '#f8fafc',
  },
  previewHint: {
    color: '#94a3b8',
    fontSize: '14px',
    lineHeight: 1.5,
    marginBottom: '16px',
  },
  previewPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    fontSize: '48px',
    color: '#64748b',
  },
  quickActions: {
    marginTop: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    color: '#f8fafc',
    borderBottom: '1px solid #334155',
    paddingBottom: '8px',
  },
  inputGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#cbd5e1',
    fontSize: '14px',
  },
  value: {
    color: '#3b82f6',
    fontWeight: 600,
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    cursor: 'pointer',
    accentColor: '#3b82f6',
  },
  colorWrapper: {
    display: 'flex',
    gap: '8px',
  },
  colorPicker: {
    width: '48px',
    height: '36px',
    padding: '2px',
    border: '1px solid #475569',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  colorText: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: '#0f172a',
    border: '1px solid #475569',
    borderRadius: '4px',
    color: '#e2e8f0',
    fontSize: '14px',
  },
  toggle: {
    padding: '8px 24px',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  buttonPrimary: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  buttonSecondary: {
    padding: '10px 20px',
    backgroundColor: '#475569',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  devBanner: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '8px',
    backgroundColor: '#7c3aed',
    color: '#fff',
    textAlign: 'center',
    fontSize: '12px',
  },
};
