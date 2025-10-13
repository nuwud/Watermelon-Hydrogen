# Data Model: 3D Immersive Checkout Experience

**Feature**: `001-3d-immersive-checkout`  
**Phase**: 1 - Data Model Definition  
**Date**: 2025-10-13

## Overview

This document defines the data structures, state management, and entity relationships for the 3D immersive checkout system.

---

## Core Entities

### 1. CheckoutSession

**Description**: Represents an active checkout session with iframe URL, status tracking, and completion state.

**Properties**:
```typescript
interface CheckoutSession {
  // Identity
  id: string;                          // Shopify checkout ID (from checkoutCreate)
  cartId: string;                      // Associated cart ID
  
  // URLs
  webUrl: string;                      // Shopify checkout iframe URL
  fallbackUrl: string;                 // Full-page checkout URL (if iframe fails)
  
  // Status
  status: 'initializing' | 'loading' | 'ready' | 'processing' | 'complete' | 'failed' | 'abandoned';
  iframeStatus: 'loading' | 'loaded' | 'failed';
  
  // Timing
  createdAt: Date;                     // When session was created
  loadStartedAt: Date | null;          // When iframe started loading
  loadCompletedAt: Date | null;        // When iframe finished loading
  completedAt: Date | null;            // When checkout completed
  
  // Completion data
  orderId: string | null;              // Shopify order ID (if completed)
  orderNumber: string | null;          // Human-readable order number
  
  // Error handling
  errorType: 'iframe_timeout' | 'iframe_blocked' | 'network_error' | 'payment_restriction' | null;
  errorMessage: string | null;
  fallbackTriggered: boolean;          // Whether fallback to full-page occurred
}
```

**State Transitions**:
```
initializing → loading → ready → processing → complete
                   ↓         ↓         ↓
                failed ← failed ← failed
                   ↓
              (fallback to full-page)
```

**Storage**: React state + sessionStorage (for recovery after page reload)

**Validation Rules**:
- `webUrl` must be HTTPS
- `webUrl` must match `PUBLIC_CHECKOUT_DOMAIN`
- `status` cannot go backwards (except to 'failed')
- `completedAt` requires `orderId` and `orderNumber`

---

### 2. CheckoutConfig

**Description**: Store owner configuration for checkout behavior, appearance, and animation style.

**Properties**:
```typescript
interface CheckoutConfig {
  // Display mode
  mode: 'center-panel' | 'full-page' | 'overlay-modal';
  
  // Animation settings
  animationStyle: 'dramatic' | 'subtle' | 'elegant';
  animationDuration: number;           // Milliseconds (default: 1000)
  
  // Panel sizing (for center-panel mode)
  panelSize: {
    desktop: { width: number; height: number };  // Default: 900x700
    tablet: { width: string; height: string };   // Default: '90vw', '80vh'
    mobile: { width: string; height: string };   // Default: '100vw', 'calc(100vh - 60px)'
  };
  
  // Behavior
  autoFallbackOnError: boolean;        // Auto-redirect to full-page on iframe failure
  fallbackDelay: number;               // Delay before fallback (ms, default: 1000)
  iframeTimeout: number;               // Timeout for iframe load (ms, default: 3000)
  
  // Feature flags
  pauseRenderingDuringCheckout: boolean;  // Pause 3D rendering (default: true)
  showCloseButton: boolean;            // Allow user to close checkout (default: true)
  
  // Persistence
  lastUpdated: Date;
  syncToShopify: boolean;              // Whether to sync to Shopify metafields
}
```

**Default Values**:
```javascript
const DEFAULT_CHECKOUT_CONFIG = {
  mode: 'center-panel',
  animationStyle: 'dramatic',
  animationDuration: 1000,
  panelSize: {
    desktop: { width: 900, height: 700 },
    tablet: { width: '90vw', height: '80vh' },
    mobile: { width: '100vw', height: 'calc(100vh - 60px)' }
  },
  autoFallbackOnError: true,
  fallbackDelay: 1000,
  iframeTimeout: 3000,
  pauseRenderingDuringCheckout: true,
  showCloseButton: true,
  syncToShopify: false
};
```

**Storage**: localStorage (`wm_checkout_config`) + optional Shopify metafields

**Validation Rules**:
- `mode` must be one of allowed values
- `animationDuration` must be 200-3000ms
- `panelSize` dimensions must be positive
- `iframeTimeout` must be 1000-10000ms

---

### 3. CarouselCheckoutState

**Description**: Snapshot of 3D carousel state before checkout opens, used for restoration after checkout closes.

**Properties**:
```typescript
interface CarouselCheckoutState {
  // Rotation state
  currentIndex: number;                // Active carousel item
  rotation: number;                    // Current Y-axis rotation (radians)
  
  // Animation state
  isTransitioning: boolean;            // Whether carousel was animating
  activeTimeline: object | null;       // Active GSAP timeline (saved reference)
  
  // Item positions
  itemPositions: Array<{
    index: number;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    opacity: number;
  }>;
  
  // Rendering state
  wasRendering: boolean;               // Whether render loop was active
  
  // Timestamp
  savedAt: Date;
}
```

**Lifecycle**:
1. **Capture**: When checkout animation starts (before items move)
2. **Store**: In React ref (not persisted)
3. **Restore**: When checkout closes (animate back to saved positions)
4. **Clear**: After restoration complete

**Validation Rules**:
- Must capture state when `isTransitioning === false`
- `itemPositions` must include all carousel items
- Restoration must respect carousel invariants

---

## State Management

### React Context: CheckoutUIContext

**Description**: Global state for checkout UI, accessible to cart, carousel, and admin components.

**Schema**:
```typescript
interface CheckoutUIContextValue {
  // Session
  session: CheckoutSession | null;
  
  // Config
  config: CheckoutConfig;
  
  // UI state
  isCheckoutOpen: boolean;
  isPanelVisible: boolean;
  isAnimating: boolean;
  
  // Carousel state
  carouselState: CarouselCheckoutState | null;
  
  // Actions
  openCheckout: (cartId: string) => Promise<void>;
  closeCheckout: () => Promise<void>;
  handleCheckoutComplete: (orderId: string, orderNumber: string) => void;
  handleCheckoutError: (errorType: string, errorMessage: string) => void;
  updateConfig: (newConfig: Partial<CheckoutConfig>) => void;
  
  // Status checks
  canOpenCheckout: boolean;            // Whether checkout can be opened (cart not empty, not already open)
  isFallbackMode: boolean;             // Whether in fallback mode
}
```

**Provider Location**: `app/root.jsx` or `app/routes/($locale)._index.jsx`

**Usage Pattern**:
```javascript
// In any component
const {
  isCheckoutOpen,
  openCheckout,
  closeCheckout,
  config
} = useCheckoutUI();

// Open checkout
const handleCheckoutClick = async () => {
  await openCheckout(cart.id);
};
```

---

### localStorage Schema

**Key**: `wm_checkout_config`

**Value** (JSON):
```json
{
  "mode": "center-panel",
  "animationStyle": "dramatic",
  "animationDuration": 1000,
  "panelSize": {
    "desktop": {"width": 900, "height": 700},
    "tablet": {"width": "90vw", "height": "80vh"},
    "mobile": {"width": "100vw", "height": "calc(100vh - 60px)"}
  },
  "autoFallbackOnError": true,
  "fallbackDelay": 1000,
  "iframeTimeout": 3000,
  "pauseRenderingDuringCheckout": true,
  "showCloseButton": true,
  "lastUpdated": "2025-10-13T10:30:00.000Z"
}
```

**Key**: `wm_checkout_session` (temporary, cleared after 30 minutes)

**Value** (JSON):
```json
{
  "id": "gid://shopify/Checkout/abc123",
  "cartId": "gid://shopify/Cart/xyz789",
  "webUrl": "https://nuwudorder.com/checkouts/abc123",
  "status": "loading",
  "createdAt": "2025-10-13T10:25:00.000Z"
}
```

---

## Shopify GraphQL Queries/Mutations

### 1. Create Checkout Session

**Mutation**:
```graphql
mutation checkoutCreate($input: CheckoutCreateInput!) {
  checkoutCreate(input: $input) {
    checkout {
      id
      webUrl
      ready
      completedAt
      order {
        id
        orderNumber
      }
    }
    checkoutUserErrors {
      field
      message
      code
    }
  }
}
```

**Input Variables**:
```typescript
interface CheckoutCreateInput {
  lineItems: Array<{
    variantId: string;
    quantity: number;
  }>;
  email?: string;                      // If customer logged in
  shippingAddress?: ShippingAddress;   // If saved address exists
}
```

**Response Handling**:
- Success: Extract `checkout.webUrl` and `checkout.id`
- Error: Display `checkoutUserErrors[0].message` to user

### 2. Poll Checkout Status (Optional)

**Query**:
```graphql
query getCheckout($id: ID!) {
  node(id: $id) {
    ... on Checkout {
      id
      completedAt
      order {
        id
        orderNumber
      }
    }
  }
}
```

**Usage**: Poll every 5 seconds if postMessage communication fails

---

## Window Globals (for Admin/Debug)

### window.watermelonAdmin.checkoutSettings

**API**:
```typescript
interface WatermelonAdminCheckout {
  // Getters
  getConfig: () => CheckoutConfig;
  getSession: () => CheckoutSession | null;
  getMode: () => 'center-panel' | 'full-page' | 'overlay-modal';
  getAnimationStyle: () => 'dramatic' | 'subtle' | 'elegant';
  
  // Setters
  setMode: (mode: string) => void;
  setAnimationStyle: (style: string) => void;
  updateConfig: (config: Partial<CheckoutConfig>) => void;
  
  // Actions
  preview: (mode: string, style: string) => void;
  resetToDefaults: () => void;
  clearSession: () => void;
  
  // Debug
  logState: () => void;
  simulateError: (errorType: string) => void;
}
```

**Console Usage**:
```javascript
// Change checkout mode
window.watermelonAdmin.checkoutSettings.setMode('center-panel');

// Preview animation
window.watermelonAdmin.checkoutSettings.preview('center-panel', 'elegant');

// Debug current state
window.watermelonAdmin.checkoutSettings.logState();
```

---

## Data Flow Diagram

```
User clicks "Checkout" button
         ↓
CheckoutUIContext.openCheckout(cartId)
         ↓
Capture CarouselCheckoutState (snapshot positions)
         ↓
Call Shopify checkoutCreate mutation
         ↓
Receive checkout.webUrl
         ↓
Create CheckoutSession (status: 'initializing')
         ↓
Trigger GSAP animation (based on config.animationStyle)
         ↓
Set session.status = 'loading'
         ↓
Render CheckoutPanel with iframe (src: webUrl)
         ↓
Start iframe timeout timer (3s)
         ↓
[SUCCESS PATH]                    [FAILURE PATH]
Iframe loads successfully         Iframe fails or times out
         ↓                                 ↓
session.iframeStatus = 'loaded'   session.iframeStatus = 'failed'
         ↓                                 ↓
session.status = 'ready'          Trigger fallback (redirect to full-page)
         ↓
User completes checkout
         ↓
Receive postMessage (checkout:complete)
         ↓
session.status = 'complete'
session.orderId = received orderId
         ↓
Close panel, restore carousel (animate back)
         ↓
Show confirmation message in 3D space
         ↓
Clear CheckoutSession after 5 seconds
```

---

## Entity Relationships

```
Cart (existing)
  ↓ (triggers)
CheckoutSession
  ↓ (configured by)
CheckoutConfig
  ↓ (captures)
CarouselCheckoutState
  ↓ (restores)
Carousel3DPro (existing)
```

**Dependencies**:
- CheckoutSession depends on Cart (cart ID)
- CheckoutPanel depends on CheckoutSession (iframe URL)
- Carousel animation depends on CheckoutConfig (animation style)
- Carousel restoration depends on CarouselCheckoutState (saved positions)

---

## Validation & Constraints

### Data Integrity
- ✅ `CheckoutSession.webUrl` must match `PUBLIC_CHECKOUT_DOMAIN`
- ✅ `CheckoutSession.status` transitions are one-way (except to 'failed')
- ✅ `CheckoutConfig` values must pass validation rules
- ✅ `CarouselCheckoutState` must be captured when `isTransitioning === false`

### Performance
- ✅ CheckoutSession stored in sessionStorage (max 5 MB)
- ✅ CheckoutConfig stored in localStorage (max 10 MB)
- ✅ CarouselCheckoutState not persisted (in-memory only)
- ✅ Cleanup old checkout sessions after 30 minutes

### Security
- ✅ Never store payment data (handled by Shopify)
- ✅ Validate postMessage origin before processing
- ✅ Use HTTPS for all checkout URLs
- ✅ Sanitize error messages before displaying

---

## Summary

**Core Entities**: CheckoutSession, CheckoutConfig, CarouselCheckoutState  
**State Management**: React Context (`CheckoutUIContext`) + localStorage  
**External APIs**: Shopify Storefront API (`checkoutCreate`, `getCheckout`)  
**Window Globals**: `window.watermelonAdmin.checkoutSettings`

**Next Phase**: Generate quickstart guide and update agent context with this data model.
