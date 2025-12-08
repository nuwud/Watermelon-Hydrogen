# Phase 4: Custom Admin Editor

> **Parent Spec:** `specs/005-3d-ux-enhancement-roadmap/spec.md`  
> **Status:** Planning  
> **Priority:** Medium-High (Enables non-dev configuration)  
> **Estimated Effort:** 4-6 sessions  
> **Dependencies:** Phase 1-3 provide configurable elements

---

## Overview

Since Hydrogen doesn't have Shopify's built-in theme editor, we need to build a custom WYSIWYG admin interface for configuring all 3D elements. This will use Shopify Metaobjects for storage (no external database needed).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  WATERMELON ADMIN SYSTEM                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │             SHOPIFY METAOBJECTS                      │   │
│   │  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐   │   │
│   │  │ 3DConfig    │ │ ThemePreset │ │ MenuConfig   │   │   │
│   │  │ (singleton) │ │ (multiple)  │ │ (singleton)  │   │   │
│   │  └─────────────┘ └─────────────┘ └──────────────┘   │   │
│   └─────────────────────────────────────────────────────┘   │
│                           ▲                                  │
│                           │ Admin API (write)                │
│                           │ Storefront API (read)            │
│                           ▼                                  │
│   ┌─────────────────────────────────────────────────────┐   │
│   │          HYDROGEN /admin ROUTE                       │   │
│   │  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐   │   │
│   │  │ Live 3D     │ │ Control     │ │ Preset       │   │   │
│   │  │ Preview     │ │ Panels      │ │ Manager      │   │   │
│   │  └─────────────┘ └─────────────┘ └──────────────┘   │   │
│   └─────────────────────────────────────────────────────┘   │
│                           ▲                                  │
│                           │ Real-time config updates         │
│                           ▼                                  │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              3D SCENE (Carousel3D)                   │   │
│   │  - Reads config from Metaobjects on load             │   │
│   │  - Subscribes to config changes for hot-reload       │   │
│   │  - Falls back to defaults if no Metaobjects exist    │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Metaobject Schemas

### 1. Watermelon3DConfig (Singleton)

```graphql
# Shopify Admin > Settings > Custom data > Metaobject definitions

type Watermelon3DConfig {
  # Camera
  cameraFOV: Float           # 45-90, default 60
  cameraNear: Float          # 0.1-1, default 0.1
  cameraFar: Float           # 100-1000, default 500
  
  # Lighting
  ambientIntensity: Float    # 0-1, default 0.3
  ambientColor: String       # Hex color, default #ffffff
  spotlightIntensity: Float  # 0-2, default 0.8
  spotlightColor: String     # Hex color
  
  # Fog
  fogEnabled: Boolean        # default true
  fogColor: String           # Hex color
  fogNear: Float             # 0-50, default 5
  fogFar: Float              # 10-200, default 50
  
  # Background
  activeBackgroundPreset: String  # Reference to preset handle
  
  # Performance
  maxFPS: Int                # 30, 60, 120
  shadowsEnabled: Boolean    # default false (perf)
}
```

### 2. WatermelonThemePreset (Multiple)

```graphql
type WatermelonThemePreset {
  handle: String!            # Unique identifier
  name: String!              # Display name
  
  # Colors
  primaryColor: String       # Hex
  secondaryColor: String     # Hex
  accentColor: String        # Hex
  textColor: String          # Hex
  textGlowColor: String      # Hex
  textGlowIntensity: Float   # 0-1
  
  # Menu Ring
  ringRadius: Float          # 3-10
  itemSpacing: Float         # degrees
  highlightScale: Float      # 1.0-1.5
  
  # Animations
  rotationSpeed: Float       # 0.1-2.0
  transitionDuration: Float  # 0.2-1.0
  easingCurve: String        # power2.out, elastic, etc.
}
```

### 3. WatermelonMenuConfig (Singleton)

```graphql
type WatermelonMenuConfig {
  # Structure reference
  menuStructureJSON: String  # JSON blob or reference
  
  # Behavior
  autoRotate: Boolean
  autoRotateSpeed: Float
  submenuOpenDirection: String  # "outward", "side", "overlay"
  
  # Content Display defaults
  defaultContentType: String  # "product-3d", "gallery", etc.
  miniPreviewSize: Float      # 0.1-0.3
}
```

---

## Admin Route Implementation

### Route: `/admin`

```jsx
// app/routes/admin.jsx (enhance existing)

import { json } from 'react-router';
import { useLoaderData } from 'react-router';
import { ClientOnly } from '~/components/ClientOnly';
import { AdminPanel } from '~/components/admin/AdminPanel';

export async function loader({ context }) {
  // Verify admin auth (see Auth section below)
  const isAdmin = await verifyAdminAuth(context);
  if (!isAdmin) {
    throw new Response('Unauthorized', { status: 401 });
  }
  
  // Load current config from Metaobjects
  const config = await context.storefront.query(ADMIN_CONFIG_QUERY);
  
  return json({ config });
}

export async function action({ request, context }) {
  const formData = await request.formData();
  const updates = JSON.parse(formData.get('updates'));
  
  // Write to Metaobjects via Admin API
  // Note: Requires Admin API access, not Storefront API
  await updateMetaobject(context, updates);
  
  return json({ success: true });
}

export default function Admin() {
  const { config } = useLoaderData();
  
  return (
    <div className="admin-container">
      <h1>🍉 Watermelon 3D Editor</h1>
      
      <div className="admin-layout">
        {/* Live 3D Preview */}
        <div className="preview-pane">
          <ClientOnly fallback={<div>Loading preview...</div>}>
            {() => <AdminPreview3D config={config} />}
          </ClientOnly>
        </div>
        
        {/* Control Panels */}
        <div className="controls-pane">
          <AdminPanel config={config} />
        </div>
      </div>
    </div>
  );
}
```

---

## Control Panel Components

### AdminPanel.jsx

```jsx
import { useState, useCallback } from 'react';
import { CameraControls } from './panels/CameraControls';
import { LightingControls } from './panels/LightingControls';
import { FogControls } from './panels/FogControls';
import { ThemeControls } from './panels/ThemeControls';
import { MenuControls } from './panels/MenuControls';
import { PresetManager } from './panels/PresetManager';

export function AdminPanel({ config, onConfigChange }) {
  const [activeTab, setActiveTab] = useState('camera');
  const [localConfig, setLocalConfig] = useState(config);
  const [isDirty, setIsDirty] = useState(false);
  
  const handleChange = useCallback((section, key, value) => {
    setLocalConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setIsDirty(true);
    
    // Emit for live preview
    onConfigChange?.(section, key, value);
  }, [onConfigChange]);
  
  const handleSave = async () => {
    const response = await fetch('/admin', {
      method: 'POST',
      body: new FormData().append('updates', JSON.stringify(localConfig))
    });
    if (response.ok) setIsDirty(false);
  };
  
  return (
    <div className="admin-panel">
      {/* Tab navigation */}
      <nav className="admin-tabs">
        {['camera', 'lighting', 'fog', 'theme', 'menu', 'presets'].map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>
      
      {/* Tab content */}
      <div className="admin-tab-content">
        {activeTab === 'camera' && (
          <CameraControls 
            config={localConfig.camera} 
            onChange={(k, v) => handleChange('camera', k, v)} 
          />
        )}
        {activeTab === 'lighting' && (
          <LightingControls 
            config={localConfig.lighting} 
            onChange={(k, v) => handleChange('lighting', k, v)} 
          />
        )}
        {activeTab === 'fog' && (
          <FogControls 
            config={localConfig.fog} 
            onChange={(k, v) => handleChange('fog', k, v)} 
          />
        )}
        {activeTab === 'theme' && (
          <ThemeControls 
            config={localConfig.theme} 
            onChange={(k, v) => handleChange('theme', k, v)} 
          />
        )}
        {activeTab === 'menu' && (
          <MenuControls 
            config={localConfig.menu} 
            onChange={(k, v) => handleChange('menu', k, v)} 
          />
        )}
        {activeTab === 'presets' && (
          <PresetManager 
            presets={localConfig.presets}
            currentConfig={localConfig}
          />
        )}
      </div>
      
      {/* Save button */}
      {isDirty && (
        <div className="admin-save-bar">
          <button onClick={handleSave}>Save Changes</button>
          <button onClick={() => setLocalConfig(config)}>Discard</button>
        </div>
      )}
    </div>
  );
}
```

---

## Control Components

### Example: LightingControls.jsx

```jsx
export function LightingControls({ config, onChange }) {
  return (
    <div className="control-group">
      <h3>🔆 Lighting</h3>
      
      <label>
        Ambient Intensity
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={config.ambientIntensity}
          onChange={(e) => onChange('ambientIntensity', parseFloat(e.target.value))}
        />
        <span>{config.ambientIntensity}</span>
      </label>
      
      <label>
        Ambient Color
        <input
          type="color"
          value={config.ambientColor}
          onChange={(e) => onChange('ambientColor', e.target.value)}
        />
      </label>
      
      <label>
        Spotlight Intensity
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={config.spotlightIntensity}
          onChange={(e) => onChange('spotlightIntensity', parseFloat(e.target.value))}
        />
        <span>{config.spotlightIntensity}</span>
      </label>
      
      <label>
        Spotlight Color
        <input
          type="color"
          value={config.spotlightColor}
          onChange={(e) => onChange('spotlightColor', e.target.value)}
        />
      </label>
    </div>
  );
}
```

---

## Live Preview Integration

```javascript
// In AdminPreview3D component
useEffect(() => {
  // Subscribe to config changes
  const handleConfigChange = (event) => {
    const { section, key, value } = event.detail;
    
    switch (section) {
      case 'lighting':
        updateLighting(key, value);
        break;
      case 'fog':
        updateFog(key, value);
        break;
      case 'camera':
        updateCamera(key, value);
        break;
      // etc.
    }
  };
  
  window.addEventListener('admin-config-change', handleConfigChange);
  return () => window.removeEventListener('admin-config-change', handleConfigChange);
}, []);

// Apply updates in real-time
function updateLighting(key, value) {
  switch (key) {
    case 'ambientIntensity':
      ambientLight.intensity = value;
      break;
    case 'ambientColor':
      ambientLight.color.setStyle(value);
      break;
    case 'spotlightIntensity':
      spotlight.intensity = value;
      break;
    case 'spotlightColor':
      spotlight.color.setStyle(value);
      break;
  }
}
```

---

## Authentication Options

### Option A: Environment Variable Password (Simple)

```javascript
// In loader
export async function loader({ context, request }) {
  const url = new URL(request.url);
  const password = url.searchParams.get('key');
  
  if (password !== process.env.ADMIN_PASSWORD) {
    throw new Response('Unauthorized', { status: 401 });
  }
  // ...
}
```

### Option B: Shopify Customer Account (More Secure)

```javascript
// Check if logged-in customer has admin tag
const customer = await context.customer.get();
if (!customer?.tags?.includes('admin')) {
  throw new Response('Unauthorized', { status: 401 });
}
```

### Option C: Development Mode Only

```javascript
if (process.env.NODE_ENV === 'production') {
  throw new Response('Admin only available in development', { status: 403 });
}
```

**Recommendation:** Start with Option A for development, upgrade to B for production.

---

## Files to Create/Modify

**New Files:**
- `app/components/admin/AdminPanel.jsx`
- `app/components/admin/AdminPreview3D.jsx`
- `app/components/admin/panels/CameraControls.jsx`
- `app/components/admin/panels/LightingControls.jsx`
- `app/components/admin/panels/FogControls.jsx`
- `app/components/admin/panels/ThemeControls.jsx`
- `app/components/admin/panels/MenuControls.jsx`
- `app/components/admin/panels/PresetManager.jsx`
- `app/graphql/admin/config-queries.js`
- `app/utils/configManager.js` - Config loading/caching

**Modified Files:**
- `app/routes/admin.jsx` - Enhance with full admin UI
- `app/components/Carousel3DPro/main.client.js` - Read from config
- Add Metaobject definitions in Shopify Admin

---

## Shopify Setup Instructions

1. **Create Metaobject Definitions** (Shopify Admin > Settings > Custom data)
   - Create `watermelon_3d_config` type
   - Create `watermelon_theme_preset` type
   - Create `watermelon_menu_config` type

2. **Create Initial Entries**
   - One entry for `watermelon_3d_config` (singleton)
   - One entry for `watermelon_menu_config` (singleton)
   - Multiple entries for `watermelon_theme_preset` (presets)

3. **Configure API Access**
   - Storefront API: Read access to metaobjects
   - Admin API: Write access for saving changes

---

## Acceptance Criteria

- [ ] `/admin` route loads with live 3D preview
- [ ] All control sliders update preview in real-time
- [ ] Changes can be saved to Shopify Metaobjects
- [ ] Presets can be saved, loaded, and deleted
- [ ] Admin route is properly authenticated
- [ ] 3D scene loads config from Metaobjects on startup
- [ ] Falls back to defaults if no Metaobjects exist
- [ ] Mobile-friendly admin UI (or desktop-only warning)
- [ ] Build passes: `npm run validate`

---

## Future Enhancements

- **Undo/Redo** - Track changes for undo capability
- **Version History** - Keep previous configs
- **Export/Import** - JSON export for backup
- **Multi-environment** - Different configs for staging/production
- **Shopify App** - Full app for Shopify admin integration
