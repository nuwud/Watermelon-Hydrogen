# 🏗️ Watermelon Hydrogen Technical Architecture

## 🎯 System Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Shopify Hydrogen v2025]
        B[React 18+ SSR]
        C[Vite Bundler]
        D[Remix Router]
    end
    
    subgraph "3D Rendering Layer"
        E[Three.js WebGL]
        F[GSAP Animations]
        G[OrbitControls]
        H[TextGeometry]
    end
    
    subgraph "Admin & Management"
        I[WatermelonAdminPanel.jsx]
        J[Console Commands]
        K[Real-time Monitoring]
        L[Menu Mode Toggle]
    end
    
    subgraph "Content System"
        M[contentManager.js]
        N[contentTemplates.js]
        O[Template Engine]
        P[Content Caching]
    end
    
    subgraph "Cart Integration"
        Q[CartDrawer3D System]
        R[cart-ui Context]
        S[3D Cart Elements]
        T[Shopify Cart API]
    end
    
    subgraph "Shopify Integration"
        U[Storefront API]
        V[GraphQL Queries]
        W[Page Content API]
        X[Menu Data Loading]
    end
    
    subgraph "Deployment"
        Y[Shopify Oxygen]
        Z[GitHub Actions]
        AA[Environment Config]
    end

    A --> E
    B --> A
    C --> B
    D --> A
    
    E --> F
    E --> G
    E --> H
    
    I --> J
    I --> K
    I --> L
    
    M --> N
    N --> O
    M --> P
    
    Q --> R
    Q --> S
    R --> T
    
    U --> V
    V --> W
    V --> X
    
    Y --> Z
    Y --> AA
    
    E --> M
    I --> E
    Q --> E
    U --> M
```

## 🔄 Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Hydrogen
    participant ThreeJS
    participant Admin
    participant Shopify
    participant ContentMgr

    User->>Browser: Load Page
    Browser->>Hydrogen: Request Route
    Hydrogen->>Shopify: GraphQL Menu Query
    Shopify-->>Hydrogen: Menu Data
    Hydrogen->>ThreeJS: Initialize 3D Scene
    ThreeJS->>Admin: Register Admin Panel
    
    User->>ThreeJS: Click Menu Item
    ThreeJS->>ContentMgr: Request Content
    ContentMgr->>Shopify: API Call /api/page
    Shopify-->>ContentMgr: Page Content
    ContentMgr->>ThreeJS: Render Template
    ThreeJS->>Browser: Update 3D Display
    
    User->>Admin: Ctrl+Shift+A
    Admin->>Browser: Show Admin Panel
    User->>Admin: Toggle Menu Mode
    Admin->>ThreeJS: Reload Scene
    ThreeJS->>Shopify: New Menu Query
```

## 🎨 Component Architecture

```mermaid
graph LR
    subgraph "Main Scene"
        A[main.js - Setup Carousel]
        B[Carousel3DPro.js - Main Wheel]
        C[Carousel3DSubmenu.js - Submenus]
        D[CentralContentPanel.js - Content Display]
    end
    
    subgraph "React Wrappers"
        E[Carousel3DMenu.jsx]
        F[Carousel3DProWrapper.jsx]
        G[ClientOnly.jsx]
    end
    
    subgraph "Admin System"
        H[WatermelonAdminPanel.jsx]
        I[Admin Controls]
        J[System Status]
    end
    
    subgraph "Cart System"
        K[CartDrawer3D.jsx]
        L[CartDrawerController.jsx]
        M[cart-ui.jsx]
    end
    
    subgraph "Content System"
        N[contentManager.js]
        O[contentTemplates.js]
        P[API Routes]
    end
    
    E --> A
    F --> E
    G --> F
    
    A --> B
    A --> C
    A --> D
    
    H --> I
    H --> J
    H --> A
    
    K --> L
    L --> M
    K --> A
    
    N --> O
    N --> P
    D --> N
```

## 📊 File Dependency Matrix

| Component | Dependencies | Exports | Global Exposure |
|-----------|-------------|---------|-----------------|
| `main.js` | Three.js, GSAP, ContentManager | setupCarousel() | window.watermelonAdmin |
| `contentManager.js` | contentTemplates.js | ContentManager class | window.contentManager |
| `WatermelonAdminPanel.jsx` | React, ClientOnly | Admin component | - |
| `CartDrawer3D.jsx` | cart-ui, Shopify hooks | Cart component | window.drawerController |
| `Carousel3DPro.js` | Three.js, TextGeometry | Carousel3DPro class | - |
| `contentTemplates.js` | - | Template functions | - |

## 🔧 Configuration Layers

```yaml
Application Config:
  - vite.config.js: Build configuration
  - package.json: Dependencies & scripts
  - eslint.config.js: Code quality
  - tailwind.config.js: Styling

Environment Config:
  - .env files: API tokens
  - Oxygen deployment: Production settings
  - GitHub Actions: CI/CD pipeline

Shopify Config:
  - Storefront API tokens
  - Menu handles
  - Page content mapping
  - GraphQL fragments

3D Scene Config:
  - Camera settings
  - Animation parameters
  - Material properties
  - Performance settings
```

## 🎯 Integration Points

### **Shopify ↔ Three.js Bridge**
```javascript
// Menu data transformation
Shopify GraphQL → menuTransform.js → 3D Carousel

// Content loading
Menu Click → contentManager.js → Shopify API → Template Render → 3D Display

// Cart integration
3D Cart Click → Event System → React Context → Shopify Cart
```

### **Admin ↔ System Bridge**
```javascript
// Admin panel controls
UI Controls → watermelonAdmin object → 3D Scene Updates

// Real-time monitoring
System Status → Admin Panel → Visual Indicators

// Mode switching
Admin Toggle → localStorage → Scene Reload → New Data Source
```

### **Template ↔ Content Bridge**
```javascript
// Content rendering
Raw Data → Template Selection → HTML Generation → 3D Panel Display

// Interactive elements
Template Buttons → Event Handlers → System Actions (cart, navigation)
```

## 🚀 Performance Architecture

### **Rendering Pipeline**
1. **SSR Phase**: Hydrogen renders React shell
2. **Hydration**: Client-side React takes over
3. **3D Initialization**: ClientOnly mounts Three.js
4. **Content Loading**: Async Shopify data fetch
5. **Template Rendering**: Dynamic content display

### **Memory Management**
- **Three.js Cleanup**: Geometry/material disposal
- **Event Listeners**: Comprehensive removal on unmount
- **Animation Cleanup**: GSAP timeline disposal
- **Cache Management**: Smart content cache expiry

### **Performance Optimizations**
- **Code Splitting**: React.lazy for large components
- **Asset Loading**: Efficient GLTF and texture loading
- **Animation**: RequestAnimationFrame optimization
- **Caching**: Multi-layer content caching strategy

---

*Architecture documented: June 23, 2025*
