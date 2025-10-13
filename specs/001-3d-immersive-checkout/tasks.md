# Task Breakdown: 3D Immersive Checkout Experience

**Feature**: `001-3d-immersive-checkout`  
**Total Tasks**: 74  
**Status**: Not Started  
**Created**: 2025-10-13

---

## Progress Overview

- **Phase 1 - Foundational Setup**: 0/6 tasks
- **Phase 2 - Shopify Integration**: 0/5 tasks
- **Phase 3 - US1 Basic Center Panel**: 0/16 tasks
- **Phase 4 - US2 Animation Styles**: 0/11 tasks
- **Phase 5 - US4 Responsive Sizing**: 0/8 tasks
- **Phase 6 - US3 Mode Configuration**: 0/10 tasks
- **Phase 7 - Polish & Validation**: 0/18 tasks

**Total Progress**: 0/74 (0%)

---

## Phase 1: Foundational Setup (REQUIRED FIRST)

**Objective**: Establish project structure, validate environment, create core utilities.

### Task 1.1: Create Project Directory Structure
- [ ] Create `app/components/checkout-panel/` directory
- [ ] Create `app/components/admin/` directory
- [ ] Create placeholder files with JSDoc headers
- [ ] Verify directory structure matches plan.md

**Acceptance**: Directories exist, no .gitignore violations

---

### Task 1.2: Environment Variable Validation
- [ ] Verify `PUBLIC_CHECKOUT_DOMAIN` in `.env.sample`
- [ ] Document in `app/utils/env.public.ts` if missing
- [ ] Run `npm run env:check` → must pass
- [ ] Add checkout domain to CSP config if needed

**Acceptance**: `npm run env:check` passes, checkout domain accessible via envPublic

---

### Task 1.3: Dependencies Audit
- [ ] Check GSAP version in `package.json` (should be 3.x)
- [ ] Verify React.lazy support (Remix 2.x+)
- [ ] Confirm no new dependencies needed
- [ ] Document existing dependencies used

**Acceptance**: All required dependencies available, no new installs needed

---

### Task 1.4: Create Checkout Context
- [ ] Create `app/components/context/checkout-context.jsx`
- [ ] Define state shape: `{ isOpen, mode, animationStyle, checkoutUrl, sessionId, carouselState, error }`
- [ ] Implement actions: `openCheckout()`, `closeCheckout()`, `setConfig()`, `setError()`
- [ ] Add context provider and custom hook `useCheckout()`

**Acceptance**: Context created, exports provider and hook, type-safe state

**Code Template**:
```jsx
// app/components/context/checkout-context.jsx
import {createContext, useContext, useState, useCallback} from 'react';

const CheckoutContext = createContext(null);

export function CheckoutProvider({children}) {
  const [state, setState] = useState({
    isOpen: false,
    mode: 'center-panel', // 'center-panel' | 'full-page' | 'overlay-modal'
    animationStyle: 'dramatic', // 'dramatic' | 'subtle' | 'elegant'
    checkoutUrl: null,
    sessionId: null,
    carouselState: null, // Snapshot for restoration
    error: null,
  });

  const openCheckout = useCallback(async (cartLines) => {
    // Implemented in Phase 2
  }, []);

  const closeCheckout = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, error: null }));
  }, []);

  // ... other actions

  return (
    <CheckoutContext.Provider value={{...state, openCheckout, closeCheckout}}>
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (!context) throw new Error('useCheckout must be used within CheckoutProvider');
  return context;
}
```

---

### Task 1.5: SSR Safety Validation Setup
- [ ] Review `app/components/ClientOnly.jsx` (should already exist)
- [ ] Add `typeof window !== 'undefined'` guard template
- [ ] Test build with `npm run build` → must pass
- [ ] Document SSR safety patterns in code comments

**Acceptance**: Build passes, ClientOnly component available

---

### Task 1.6: Create CheckoutManager Utility
- [ ] Create `app/utils/checkoutManager.js`
- [ ] Implement `createSession(cartLines)` → fetches from API route
- [ ] Implement `detectIframeRestrictions()` → checks for payment method blocks
- [ ] Implement `coordinateWithCarousel(action)` → interfaces with carousel state
- [ ] Add JSDoc documentation for all functions

**Acceptance**: Utility created with documented API, ready for integration

**Code Template**:
```javascript
// app/utils/checkoutManager.js

/**
 * Creates Shopify checkout session via Storefront API
 * @param {Array} cartLines - Cart line items
 * @returns {Promise<{checkoutUrl: string, sessionId: string, error?: string}>}
 */
export async function createSession(cartLines) {
  try {
    const response = await fetch('/api/checkout-session', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({cartLines}),
    });
    if (!response.ok) throw new Error('Checkout session creation failed');
    return await response.json();
  } catch (error) {
    console.error('createSession error:', error);
    return {error: error.message};
  }
}

/**
 * Detects if iframe embedding is restricted (e.g., Apple Pay)
 * @param {HTMLIFrameElement} iframe
 * @param {number} timeout - Milliseconds to wait
 * @returns {Promise<boolean>} - True if restricted
 */
export async function detectIframeRestrictions(iframe, timeout = 3000) {
  // Implemented in Phase 3
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(true), timeout);
    iframe.addEventListener('load', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

/**
 * Coordinates checkout actions with carousel state
 * @param {'pause'|'resume'|'snapshot'|'restore'} action
 * @returns {Object|null} - Carousel state snapshot if action='snapshot'
 */
export function coordinateWithCarousel(action) {
  if (typeof window === 'undefined') return null;
  
  const carousel = window.debugCarousel;
  if (!carousel) return null;
  
  switch(action) {
    case 'pause':
      window.carouselControls?.pauseRendering();
      break;
    case 'resume':
      window.carouselControls?.resumeRendering();
      break;
    case 'snapshot':
      return carousel.debug?.getCurrentState?.() || null;
    case 'restore':
      // Restoration logic in Phase 3
      break;
  }
  return null;
}
```

---

## Phase 2: Shopify Checkout Integration

**Objective**: Connect to Shopify Storefront API, create checkout sessions.

### Task 2.1: Create GraphQL Checkout Mutation
- [ ] Create `app/graphql/checkout.js` (or add to existing graphql directory)
- [ ] Define `CHECKOUT_CREATE_MUTATION` with fields: `id`, `webUrl`, `ready`, `checkoutUserErrors`
- [ ] Define `CHECKOUT_QUERY` for polling completion status
- [ ] Export mutations as named constants

**Acceptance**: GraphQL queries defined, match Shopify Storefront API spec

**Code Template**:
```javascript
// app/graphql/checkout.js
export const CHECKOUT_CREATE_MUTATION = `#graphql
  mutation checkoutCreate($input: CheckoutCreateInput!) {
    checkoutCreate(input: $input) {
      checkout {
        id
        webUrl
        ready
        lineItems(first: 250) {
          edges {
            node {
              id
              title
              quantity
            }
          }
        }
      }
      checkoutUserErrors {
        field
        message
        code
      }
    }
  }
`;

export const CHECKOUT_QUERY = `#graphql
  query checkout($id: ID!) {
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
`;
```

---

### Task 2.2: Create Server Route for Checkout Session
- [ ] Create `app/routes/api.checkout-session.jsx`
- [ ] Implement action function (POST request handler)
- [ ] Call `context.storefront.query(CHECKOUT_CREATE_MUTATION, {variables})`
- [ ] Return JSON: `{checkoutUrl, sessionId, errors}`
- [ ] Handle errors gracefully with user-friendly messages

**Acceptance**: Route created, POST request creates checkout, returns valid URL

**Code Template**:
```jsx
// app/routes/api.checkout-session.jsx
import {json} from '@shopify/remix-oxygen';
import {CHECKOUT_CREATE_MUTATION} from '~/graphql/checkout';

export async function action({request, context}) {
  if (request.method !== 'POST') {
    return json({error: 'Method not allowed'}, {status: 405});
  }

  try {
    const {cartLines} = await request.json();
    
    if (!cartLines || cartLines.length === 0) {
      return json({error: 'Cart is empty'}, {status: 400});
    }

    const {checkoutCreate} = await context.storefront.query(
      CHECKOUT_CREATE_MUTATION,
      {
        variables: {
          input: {
            lineItems: cartLines.map(line => ({
              variantId: line.merchandise.id,
              quantity: line.quantity,
            })),
          },
        },
      }
    );

    if (checkoutCreate.checkoutUserErrors.length > 0) {
      return json({
        error: checkoutCreate.checkoutUserErrors[0].message,
      }, {status: 400});
    }

    return json({
      checkoutUrl: checkoutCreate.checkout.webUrl,
      sessionId: checkoutCreate.checkout.id,
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    return json({error: 'Failed to create checkout session'}, {status: 500});
  }
}
```

---

### Task 2.3: Integrate CheckoutManager with API Route
- [ ] Update `checkoutManager.createSession()` to call `/api/checkout-session`
- [ ] Handle response: success (return checkoutUrl, sessionId) or error
- [ ] Store session in sessionStorage for recovery: `sessionStorage.setItem('wm_checkout_session', JSON.stringify(session))`
- [ ] Add retry logic (1 retry after 2s delay)

**Acceptance**: createSession returns valid checkout URL or error

---

### Task 2.4: Integrate Checkout Button with Cart
- [ ] Locate cart "Checkout" button (likely in `app/components/cart-drawers/`)
- [ ] Import `useCheckout()` hook
- [ ] On button click: call `openCheckout(cart.lines)`
- [ ] Show loading state during session creation
- [ ] Handle errors with toast/notification

**Acceptance**: Clicking "Checkout" triggers session creation

**Code Template**:
```jsx
// In cart component (e.g., app/components/cart-drawers/CartDrawer.jsx)
import {useCheckout} from '~/components/context/checkout-context';

function CheckoutButton({cart}) {
  const {openCheckout} = useCheckout();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      await openCheckout(cart.lines);
    } catch (error) {
      console.error('Checkout error:', error);
      // Show error notification
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleCheckout} disabled={loading || cart.lines.length === 0}>
      {loading ? 'Loading...' : 'Checkout'}
    </button>
  );
}
```

---

### Task 2.5: Environment Safety Validation
- [ ] Scan `app/components/checkout-panel/` and `app/routes/api.checkout-session.jsx` for raw env usage
- [ ] Replace any `process.env` with `envPublic` or `envServer`
- [ ] Ensure `PUBLIC_CHECKOUT_DOMAIN` used from `envPublic` only
- [ ] Run `npm run env:check` → must pass

**Acceptance**: No raw env usage detected, env:check passes

---

## Phase 3: US1 - Basic Center Panel Checkout (MVP)

**Objective**: Implement core immersive checkout experience with dramatic animation.

### Task 3.1: Create CheckoutPanel Component
- [ ] Create `app/components/checkout-panel/CheckoutPanel.jsx`
- [ ] Accept props: `{checkoutUrl, onComplete, onClose, animationStyle}`
- [ ] Render iframe wrapper + close button
- [ ] Implement close button handler (calls onClose)
- [ ] Add keyboard handler (ESC key closes)

**Acceptance**: Component renders, close button works

---

### Task 3.2: Create CheckoutIframe Component
- [ ] Create `app/components/checkout-panel/CheckoutIframe.jsx`
- [ ] Render `<iframe>` with sandbox attributes: `allow-scripts allow-same-origin allow-forms allow-popups`
- [ ] Add load/error event listeners
- [ ] Implement 3-second timeout detection
- [ ] Emit events: `onLoad`, `onError`, `onTimeout`

**Acceptance**: Iframe renders, timeout detection works

**Code Template**:
```jsx
// app/components/checkout-panel/CheckoutIframe.jsx
import {useEffect, useRef, useState} from 'react';

export function CheckoutIframe({checkoutUrl, onLoad, onError, onTimeout}) {
  const iframeRef = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const timeout = setTimeout(() => {
      if (status === 'loading') {
        setStatus('timeout');
        onTimeout?.();
      }
    }, 3000);

    const handleLoad = () => {
      clearTimeout(timeout);
      setStatus('loaded');
      onLoad?.();
    };

    const handleError = () => {
      clearTimeout(timeout);
      setStatus('error');
      onError?.();
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    return () => {
      clearTimeout(timeout);
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, [status]);

  return (
    <iframe
      ref={iframeRef}
      src={checkoutUrl}
      title="Shopify Checkout"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      style={{width: '100%', height: '100%', border: 'none'}}
    />
  );
}
```

---

### Task 3.3: Implement postMessage Listener
- [ ] In `CheckoutPanel.jsx`, add `window.addEventListener('message', handleMessage)`
- [ ] Validate `event.origin` matches `envPublic.PUBLIC_STORE_DOMAIN`
- [ ] Listen for `checkout:complete` event (if Shopify sends it)
- [ ] Alternative: Poll checkout status via GraphQL query
- [ ] Trigger `onComplete(orderId)` callback

**Acceptance**: Checkout completion detected, onComplete called

---

### Task 3.4: Create CheckoutPanelWrapper (SSR-safe)
- [ ] Create `app/components/checkout-panel/CheckoutPanelWrapper.jsx`
- [ ] Import `ClientOnly` from `~/components/ClientOnly`
- [ ] Wrap `CheckoutPanel` in `<ClientOnly fallback={<CheckoutPanelSkeleton />}>`
- [ ] Pass through all props to CheckoutPanel
- [ ] Test SSR build: `npm run build`

**Acceptance**: SSR-safe, build passes

---

### Task 3.5: Create CheckoutPanelSkeleton
- [ ] Create `app/components/checkout-panel/CheckoutPanelSkeleton.jsx`
- [ ] Render skeleton loader (gray boxes, pulse animation)
- [ ] Match panel dimensions (900x700px desktop)
- [ ] Use Tailwind utility classes

**Acceptance**: Skeleton displays during SSR, matches panel layout

---

### Task 3.6: Create Checkout Animations Utility
- [ ] Create `app/utils/checkoutAnimations.js`
- [ ] Implement `playOpeningAnimation(style, carouselItems, options)`
- [ ] Implement dramatic style: GSAP timeline, push items outward (z -= 500), scale 0.6, opacity 0.3
- [ ] Duration: 1s, ease: power2.out
- [ ] Return promise that resolves on animation complete

**Acceptance**: Animation function created, documented

**Code Template**:
```javascript
// app/utils/checkoutAnimations.js
import gsap from 'gsap';

/**
 * Plays opening animation for checkout panel
 * @param {'dramatic'|'subtle'|'elegant'} style - Animation style
 * @param {Array<THREE.Object3D>} carouselItems - 3D carousel items
 * @param {Object} options - Animation options
 * @returns {Promise<void>}
 */
export async function playOpeningAnimation(style, carouselItems, options = {}) {
  if (!carouselItems || carouselItems.length === 0) {
    return Promise.resolve();
  }

  const timeline = gsap.timeline();

  switch(style) {
    case 'dramatic':
      timeline.to(carouselItems, {
        z: '-=500',
        scale: 0.6,
        opacity: 0.3,
        duration: options.duration || 1,
        ease: 'power2.out',
        stagger: 0.05,
      });
      break;
    
    case 'subtle':
      // Implemented in Phase 4
      break;
    
    case 'elegant':
      // Implemented in Phase 4
      break;
  }

  return new Promise(resolve => {
    timeline.eventCallback('onComplete', resolve);
  });
}

/**
 * Plays closing animation (reverses opening)
 * @param {'dramatic'|'subtle'|'elegant'} style
 * @param {Array<THREE.Object3D>} carouselItems
 * @param {Object} originalPositions - Saved positions from before opening
 * @returns {Promise<void>}
 */
export async function playClosingAnimation(style, carouselItems, originalPositions) {
  if (!carouselItems || carouselItems.length === 0) {
    return Promise.resolve();
  }

  const timeline = gsap.timeline();

  // Restore to original positions
  carouselItems.forEach((item, index) => {
    const original = originalPositions[index];
    timeline.to(item.position, {
      x: original.x,
      y: original.y,
      z: original.z,
      duration: 0.8,
      ease: 'power2.inOut',
    }, 0);
    timeline.to(item.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.8,
      ease: 'power2.inOut',
    }, 0);
    timeline.to(item, {
      opacity: 1,
      duration: 0.8,
    }, 0);
  });

  return new Promise(resolve => {
    timeline.eventCallback('onComplete', resolve);
  });
}
```

---

### Task 3.7: Integrate Animation with Carousel Locks
- [ ] Before animation, check `window.debugCarousel.isTransitioning`
- [ ] If transitioning, defer animation or warn user
- [ ] Set `isTransitioning = true` before animation starts
- [ ] Release lock in animation `onComplete` callback
- [ ] Store original item positions in array

**Acceptance**: Animation respects carousel locks, no race conditions

---

### Task 3.8: Implement Closing Animation
- [ ] Update `checkoutAnimations.js` with `playClosingAnimation()`
- [ ] Reverse opening animation (return items to original positions)
- [ ] Duration: 0.8s, ease: power2.inOut
- [ ] Ensure smooth transition

**Acceptance**: Closing animation works, items return to original positions

---

### Task 3.9: Style CheckoutPanel (Desktop)
- [ ] Create `app/components/checkout-panel/checkout-panel.css`
- [ ] Desktop (≥1200px): 900x700px, centered, border-radius 12px
- [ ] Box shadow: `0 20px 60px rgba(0, 0, 0, 0.3)`
- [ ] z-index: 1000
- [ ] Background: white

**Acceptance**: Panel styled correctly on desktop

**Code Template**:
```css
/* app/components/checkout-panel/checkout-panel.css */
.checkout-panel-container {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.5);
}

.checkout-panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  position: relative;
}

@media (min-width: 1200px) {
  .checkout-panel {
    width: 900px;
    height: 700px;
  }
}

.checkout-close-button {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  z-index: 10;
  transition: background 0.2s;
}

.checkout-close-button:hover {
  background: rgba(0, 0, 0, 0.8);
}
```

---

### Task 3.10: Add Panel Controls UI
- [ ] Add close button (X icon) in top-right corner
- [ ] Style with hover effects
- [ ] Optional: Add "Back to Cart" link
- [ ] Ensure accessibility (focus states, ARIA labels)

**Acceptance**: Close button styled, functional, accessible

---

### Task 3.11: Implement Checkout Completion Handler
- [ ] In `checkout-context.jsx`, implement `handleCheckoutComplete(orderId)`
- [ ] Close checkout panel
- [ ] Play closing animation
- [ ] Clear cart context (if applicable)
- [ ] Show confirmation message (toast or 3D HUD)

**Acceptance**: Completion handler works, user sees confirmation

---

### Task 3.12: Implement Carousel State Snapshot
- [ ] Before animation, capture current carousel state:
  - `currentIndex`
  - `rotation`
  - `isTransitioning`
  - Item positions (array of `{x, y, z}`)
- [ ] Store in `CheckoutContext.carouselState`
- [ ] Use for restoration after close

**Acceptance**: State snapshot captured correctly

**Code Template**:
```javascript
// In checkout-context.jsx openCheckout function
const carouselState = {
  currentIndex: window.debugCarousel?.currentIndex || 0,
  rotation: window.debugCarousel?.rotation || 0,
  itemPositions: carouselItems.map(item => ({
    x: item.position.x,
    y: item.position.y,
    z: item.position.z,
  })),
};
setState(prev => ({...prev, carouselState}));
```

---

### Task 3.13: Implement Carousel State Restoration
- [ ] After closing animation, restore carousel state:
  - Set `currentIndex` to saved value
  - Set `rotation` to saved value
  - Verify item positions match saved positions
- [ ] Kill all GSAP timelines
- [ ] Release all locks (`isTransitioning = false`)

**Acceptance**: Carousel restores to exact pre-checkout state

---

### Task 3.14: Pause 3D Rendering During Checkout
- [ ] In `app/components/Carousel3DPro/main.js`, expose `window.carouselControls.pauseRendering()`
- [ ] Implement: `cancelAnimationFrame(animationFrameId)`
- [ ] Log: "3D rendering paused for checkout"
- [ ] Expose `window.carouselControls.resumeRendering()`
- [ ] Implement: Restart render loop
- [ ] Log: "3D rendering resumed after checkout"

**Acceptance**: Rendering pauses when checkout opens, resumes when closed

---

### Task 3.15: Integrate with Cart UI Context
- [ ] Import `CheckoutProvider` in `app/root.jsx`
- [ ] Wrap app in `<CheckoutProvider>`
- [ ] In cart drawer, listen for checkout state changes
- [ ] Close cart drawer when `isOpen` becomes true

**Acceptance**: Cart drawer closes when checkout opens

---

### Task 3.16: Basic Error Handling
- [ ] Detect iframe load failure (timeout > 3s)
- [ ] Show notification: "Opening secure checkout..."
- [ ] Fallback to full-page redirect: `window.location.href = checkoutUrl`
- [ ] Log error without exposing sensitive info

**Acceptance**: Iframe timeout triggers fallback, user redirected

---

## Phase 4: US2 - Animation Styles

**Objective**: Add subtle and elegant animations, admin configuration.

### Task 4.1: Implement Subtle Animation Style
- [ ] In `checkoutAnimations.js`, add `case 'subtle':`
- [ ] Fade opacity to 0.2 (no movement, no rotation)
- [ ] Duration: 0.6s, ease: power1.out
- [ ] Update closing animation to reverse

**Acceptance**: Subtle animation works, items fade only

---

### Task 4.2: Implement Elegant Animation Style
- [ ] In `checkoutAnimations.js`, add `case 'elegant':`
- [ ] Rotate items 180° on Y-axis: `rotationY: Math.PI`
- [ ] Duration: 1.2s, ease: power2.inOut
- [ ] Update closing animation to reverse rotation

**Acceptance**: Elegant animation works, items rotate to backside

---

### Task 4.3: Create Checkout Config Utility
- [ ] Create `app/utils/checkoutConfig.js`
- [ ] Implement `getAnimationStyle()` → reads from `localStorage.getItem('wm_checkout_animation')`
- [ ] Implement `setAnimationStyle(style)` → saves to localStorage
- [ ] Implement `getMode()` and `setMode(mode)`
- [ ] Default values: mode='center-panel', animation='dramatic'

**Acceptance**: Config utility created, localStorage working

**Code Template**:
```javascript
// app/utils/checkoutConfig.js

const CONFIG_KEYS = {
  MODE: 'wm_checkout_mode',
  ANIMATION: 'wm_checkout_animation',
};

const DEFAULTS = {
  MODE: 'center-panel',
  ANIMATION: 'dramatic',
};

export function getMode() {
  if (typeof window === 'undefined') return DEFAULTS.MODE;
  return localStorage.getItem(CONFIG_KEYS.MODE) || DEFAULTS.MODE;
}

export function setMode(mode) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONFIG_KEYS.MODE, mode);
  window.dispatchEvent(new CustomEvent('wm:checkout-config-changed', {detail: {mode}}));
}

export function getAnimationStyle() {
  if (typeof window === 'undefined') return DEFAULTS.ANIMATION;
  return localStorage.getItem(CONFIG_KEYS.ANIMATION) || DEFAULTS.ANIMATION;
}

export function setAnimationStyle(style) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONFIG_KEYS.ANIMATION, style);
  window.dispatchEvent(new CustomEvent('wm:checkout-config-changed', {detail: {style}}));
}
```

---

### Task 4.4: Integrate Config with Checkout Context
- [ ] In `checkout-context.jsx`, load `mode` and `animationStyle` from config on mount
- [ ] Update state when config changes (listen for `wm:checkout-config-changed` event)
- [ ] Pass `animationStyle` to animation player

**Acceptance**: Config integrated, animations use selected style

---

### Task 4.5: Implement Animation Preview Mode
- [ ] In `checkoutAnimations.js`, add `preview(style, carouselItems, duration)`
- [ ] Play opening animation
- [ ] Auto-reverse after 2 seconds (or specified duration)
- [ ] Return to original state

**Acceptance**: Preview works, animation reverses automatically

---

### Task 4.6: Animation Cleanup
- [ ] In `CheckoutPanel` unmount, kill all GSAP timelines: `gsap.killTweensOf(carouselItems)`
- [ ] Remove event listeners
- [ ] Verify no memory leaks (Chrome DevTools memory profiler)

**Acceptance**: No memory leaks, timelines cleaned up

---

### Task 4.7: Animation Performance Testing
- [ ] Monitor FPS during animation: `window.debugCarousel.debug.getPerformanceStats()`
- [ ] Target: 60fps
- [ ] If FPS < 55, optimize (reduce stagger, shorten duration)
- [ ] Test on low-end device or throttled CPU

**Acceptance**: 60fps maintained during animations

---

### Task 4.8: Implement Closing Animation Variants
- [ ] Update `playClosingAnimation()` to handle all three styles
- [ ] Dramatic: reverse push-outward
- [ ] Subtle: fade back to opacity 1
- [ ] Elegant: reverse rotation (0° Y-axis)

**Acceptance**: All closing animations work correctly

---

### Task 4.9: Add Animation Documentation
- [ ] Add JSDoc comments to all animation functions
- [ ] Document GSAP properties used (z, scale, opacity, rotationY)
- [ ] Note carousel lock coordination requirements
- [ ] Add usage examples

**Acceptance**: All functions documented

---

### Task 4.10: Handle Rapid Animation Triggering
- [ ] Add guard: if animation already running, return early or queue
- [ ] Prevent animation restart mid-animation
- [ ] Test: spam-click "Checkout" button
- [ ] Ensure no animation glitches

**Acceptance**: Rapid triggering handled gracefully

---

### Task 4.11: Animation Integration Testing
- [ ] Test all three styles (dramatic, subtle, elegant)
- [ ] Verify smooth animations at 60fps
- [ ] Confirm no GSAP timeline leaks (check `gsap.globalTimeline.getChildren()`)
- [ ] Test on multiple devices

**Acceptance**: All styles work, no leaks, 60fps maintained

---

## Phase 5: US4 - Responsive Sizing

**Objective**: Make checkout panel responsive across all viewports.

### Task 5.1: Responsive CSS - Desktop
- [ ] In `checkout-panel.css`, add media query: `@media (min-width: 1200px)`
- [ ] Set panel: 900x700px
- [ ] Centered with `place-items: center`
- [ ] Carousel visible at edges

**Acceptance**: Desktop layout correct

---

### Task 5.2: Responsive CSS - Tablet
- [ ] Add media query: `@media (min-width: 768px) and (max-width: 1199px)`
- [ ] Set panel: `width: 90vw; height: 80vh; max-width: 800px`
- [ ] Maintain border-radius

**Acceptance**: Tablet layout correct

---

### Task 5.3: Responsive CSS - Mobile Portrait
- [ ] Add media query: `@media (max-width: 767px)`
- [ ] Set panel: `width: 100vw; height: calc(100vh - 60px); top: 60px`
- [ ] Remove border-radius for fullscreen feel

**Acceptance**: Mobile portrait layout correct, no horizontal scroll

---

### Task 5.4: Responsive CSS - Mobile Landscape
- [ ] Test mobile landscape: 667x375
- [ ] Adjust height if needed: `height: calc(100vh - 50px)`
- [ ] Ensure no content cut off

**Acceptance**: Mobile landscape layout correct

---

### Task 5.5: Orientation Change Handler
- [ ] In `CheckoutPanel.jsx`, add `useEffect` for resize/orientationchange
- [ ] Recalculate panel dimensions dynamically
- [ ] No iframe reload (preserve state)
- [ ] Debounce resize handler (300ms)

**Acceptance**: Orientation changes handled without reload

**Code Template**:
```jsx
useEffect(() => {
  const handleResize = () => {
    const panel = panelRef.current;
    if (panel && window.innerWidth < 768) {
      panel.style.height = `${window.innerHeight - 60}px`;
    }
  };

  const debounced = debounce(handleResize, 300);
  window.addEventListener('resize', debounced);
  window.addEventListener('orientationchange', debounced);

  return () => {
    window.removeEventListener('resize', debounced);
    window.removeEventListener('orientationchange', debounced);
  };
}, []);
```

---

### Task 5.6: Carousel Visibility on Mobile
- [ ] On mobile (<768px), animate carousel to minimal view when checkout opens
- [ ] Option A: Scale down significantly
- [ ] Option B: Hide completely (opacity 0)
- [ ] Restore full visibility when checkout closes

**Acceptance**: Mobile carousel visibility appropriate

---

### Task 5.7: Responsive Testing
- [ ] Test viewports: 1920x1080, 1366x768, 768x1024, 375x667, 667x375
- [ ] Use Chrome DevTools responsive mode
- [ ] Verify no horizontal scroll
- [ ] Confirm readability on smallest viewport

**Acceptance**: All viewports tested, layouts correct

---

### Task 5.8: Touch Interaction Optimization
- [ ] Ensure close button is 44x44px minimum (iOS touch target guideline)
- [ ] Test tap/touch on close button
- [ ] Optional: Add swipe-to-close gesture
- [ ] Test on real mobile device

**Acceptance**: Touch targets meet accessibility guidelines

---

## Phase 6: US3 - Mode Configuration

**Objective**: Add full-page and overlay-modal modes, admin UI.

### Task 6.1: Implement Full-Page Mode
- [ ] In `checkout-context.jsx`, check `mode === 'full-page'`
- [ ] If full-page, skip animations and panel rendering
- [ ] Redirect: `window.location.href = checkoutUrl`
- [ ] No carousel interaction

**Acceptance**: Full-page mode redirects immediately

---

### Task 6.2: Implement Overlay Modal Mode
- [ ] Add mode check: `mode === 'overlay-modal'`
- [ ] Render checkout in modal overlay (not center panel)
- [ ] Apply blur to 3D scene: `backdrop-filter: blur(10px)`
- [ ] Keep carousel at normal positions (no animation)

**Acceptance**: Overlay modal mode displays correctly

---

### Task 6.3: Update Config Utility with Mode
- [ ] Ensure `getMode()` and `setMode()` implemented (done in Task 4.3)
- [ ] Test mode persistence: set to "full-page", reload, verify persists
- [ ] Dispatch event on mode change

**Acceptance**: Mode persists across reloads

---

### Task 6.4: Create CheckoutSettings Admin Component
- [ ] Create `app/components/admin/CheckoutSettings.jsx`
- [ ] Render mode selector: radio buttons (center-panel, full-page, overlay-modal)
- [ ] Render animation style selector: radio buttons (dramatic, subtle, elegant)
- [ ] Add "Save" and "Preview" buttons
- [ ] Style with Tailwind

**Acceptance**: Admin component created, UI renders

**Code Template**:
```jsx
// app/components/admin/CheckoutSettings.jsx
import {useState, useEffect} from 'react';
import {getMode, setMode, getAnimationStyle, setAnimationStyle} from '~/utils/checkoutConfig';

export function CheckoutSettings() {
  const [mode, setModeState] = useState(getMode());
  const [animation, setAnimationState] = useState(getAnimationStyle());

  const handleSave = () => {
    setMode(mode);
    setAnimationStyle(animation);
    alert('Checkout settings saved!');
  };

  const handlePreview = () => {
    // Preview implementation in Task 6.7
    window.watermelonAdmin?.checkoutSettings?.preview(mode, animation);
  };

  return (
    <div className="checkout-settings">
      <h3>Checkout Mode</h3>
      <label>
        <input type="radio" value="center-panel" checked={mode === 'center-panel'} onChange={(e) => setModeState(e.target.value)} />
        Center Panel (Immersive)
      </label>
      <label>
        <input type="radio" value="full-page" checked={mode === 'full-page'} onChange={(e) => setModeState(e.target.value)} />
        Full Page (Traditional)
      </label>
      <label>
        <input type="radio" value="overlay-modal" checked={mode === 'overlay-modal'} onChange={(e) => setModeState(e.target.value)} />
        Overlay Modal (Hybrid)
      </label>

      <h3>Animation Style</h3>
      <label>
        <input type="radio" value="dramatic" checked={animation === 'dramatic'} onChange={(e) => setAnimationState(e.target.value)} />
        Dramatic
      </label>
      <label>
        <input type="radio" value="subtle" checked={animation === 'subtle'} onChange={(e) => setAnimationState(e.target.value)} />
        Subtle
      </label>
      <label>
        <input type="radio" value="elegant" checked={animation === 'elegant'} onChange={(e) => setAnimationState(e.target.value)} />
        Elegant
      </label>

      <button onClick={handleSave}>Save</button>
      <button onClick={handlePreview}>Preview</button>
    </div>
  );
}
```

---

### Task 6.5: Extend watermelonAdmin Global
- [ ] In `CheckoutSettings.jsx`, add `useEffect` to extend `window.watermelonAdmin`
- [ ] Add `window.watermelonAdmin.checkoutSettings` object
- [ ] Expose: `getMode()`, `setMode()`, `getAnimationStyle()`, `setAnimationStyle()`, `preview()`
- [ ] Document in JSDoc

**Acceptance**: watermelonAdmin.checkoutSettings API available

**Code Template**:
```jsx
useEffect(() => {
  if (typeof window === 'undefined') return;

  window.watermelonAdmin = window.watermelonAdmin || {};
  window.watermelonAdmin.checkoutSettings = {
    getMode,
    setMode,
    getAnimationStyle,
    setAnimationStyle,
    preview: (mode, style) => {
      console.log(`Preview: ${mode} with ${style}`);
      // Implementation in Task 6.7
    },
  };
}, []);
```

---

### Task 6.6: Style Admin Panel UI
- [ ] Create `app/components/admin/checkoutSettingsUI.css`
- [ ] Match existing watermelonAdmin design
- [ ] Use Tailwind for layout
- [ ] Add preview thumbnails (optional)

**Acceptance**: Admin UI styled, matches existing patterns

---

### Task 6.7: Implement Mode Preview
- [ ] In `checkoutConfig.js` or `checkoutAnimations.js`, add `preview(mode, animationStyle)`
- [ ] Show mock checkout panel (no real payment)
- [ ] Use test checkout URL or placeholder
- [ ] Auto-close after 5 seconds or user clicks outside

**Acceptance**: Preview shows mock checkout, auto-closes

---

### Task 6.8: Mode Switching Logic
- [ ] In `checkout-context.jsx`, read `mode` from config
- [ ] Route checkout flow based on mode:
  - `center-panel`: Play animation + render panel
  - `full-page`: Redirect immediately
  - `overlay-modal`: Render modal overlay
- [ ] Test all three modes

**Acceptance**: All modes work correctly

---

### Task 6.9: Admin Settings Persistence Test
- [ ] Change mode to "full-page", reload, verify persists
- [ ] Change animation to "elegant", reload, verify persists
- [ ] Test multiple changes and reloads

**Acceptance**: All settings persist correctly

---

### Task 6.10: Admin Documentation
- [ ] Create `docs/admin/checkout-configuration.md`
- [ ] Document how to access watermelonAdmin panel
- [ ] Explain each mode and animation style
- [ ] Provide API reference for `window.watermelonAdmin.checkoutSettings`

**Acceptance**: Documentation complete, clear instructions

---

## Phase 7: Polish & Validation

**Objective**: Error handling, accessibility, performance, comprehensive testing.

### Task 7.1: Iframe Fallback Logic
- [ ] Detect iframe restrictions (Apple Pay, Shop Pay blocked)
- [ ] Auto-fallback to full-page if iframe fails
- [ ] Show notification: "Opening secure checkout in full page"
- [ ] Test with blocked iframe (use DevTools network blocking)

**Acceptance**: Fallback automatic, user notified

---

### Task 7.2: Network Error Handling
- [ ] Catch fetch errors in `/api/checkout-session`
- [ ] Show user-friendly error: "Unable to connect. Please try again."
- [ ] Provide "Try Again" button
- [ ] Log error (no sensitive data)

**Acceptance**: Network errors handled gracefully

---

### Task 7.3: Checkout Session Timeout
- [ ] Detect if checkout left open > 30 minutes
- [ ] Show message: "Session expired, please re-initialize"
- [ ] Provide button to create new session
- [ ] Test: manually wait 30 minutes or mock timeout

**Acceptance**: Timeout detected, user can reinitialize

---

### Task 7.4: Empty Cart Protection
- [ ] In cart component, check `cart.lines.length === 0`
- [ ] Disable "Checkout" button if cart empty
- [ ] Show tooltip: "Cart is empty"
- [ ] Prevent checkout call

**Acceptance**: Checkout disabled when cart empty

---

### Task 7.5: Browser Back Button Handling
- [ ] Add `popstate` event listener in `CheckoutPanel`
- [ ] On back button: close checkout panel gracefully
- [ ] Play closing animation
- [ ] Return to cart or carousel

**Acceptance**: Back button closes checkout smoothly

---

### Task 7.6: Multiple Tabs/Windows Sync
- [ ] Use BroadcastChannel API to sync cart state
- [ ] Create channel: `new BroadcastChannel('wm_cart')`
- [ ] Broadcast when cart changes
- [ ] Listen for changes, update context
- [ ] Test: open two tabs, clear cart in one, verify other updates

**Acceptance**: Cart state synced across tabs

---

### Task 7.7: Accessibility - Keyboard Navigation
- [ ] Ensure checkout panel is keyboard accessible
- [ ] Close button: `tabIndex={0}`, ARIA label "Close checkout"
- [ ] ESC key closes checkout (already implemented in Task 3.1)
- [ ] Test with keyboard only (no mouse)

**Acceptance**: Full keyboard navigation works

---

### Task 7.8: Accessibility - Screen Reader
- [ ] Add `role="dialog"` to checkout panel
- [ ] Add `aria-label="Checkout"` to panel
- [ ] Announce when checkout opens (live region)
- [ ] Announce completion: "Order completed successfully"
- [ ] Test with NVDA or JAWS

**Acceptance**: Screen reader announces correctly

---

### Task 7.9: Performance - Lazy Loading
- [ ] Use `React.lazy()` for `CheckoutPanelWrapper`
- [ ] Wrap in `Suspense` with fallback
- [ ] Verify component not loaded until checkout triggered
- [ ] Check bundle size: `npm run build` → analyze output

**Acceptance**: Checkout component lazy loaded, bundle ≤ 100 KB

---

### Task 7.10: Performance - Preloading
- [ ] Preload checkout component when cart opens (anticipate intent)
- [ ] Use `import()` to trigger preload
- [ ] Test: open cart, verify checkout component preloaded
- [ ] Measure time to open checkout (should be faster)

**Acceptance**: Checkout opens faster with preloading

---

### Task 7.11: Performance - FPS Monitoring
- [ ] Log FPS before checkout opens: `window.debugCarousel.debug.getPerformanceStats()`
- [ ] Log FPS during checkout
- [ ] Log FPS after checkout closes
- [ ] Target: 60fps maintained throughout
- [ ] Alert if FPS drops below 55

**Acceptance**: FPS monitored, target met

---

### Task 7.12: Memory Leak Prevention
- [ ] Verify all GSAP timelines killed: `gsap.killTweensOf(targets)`
- [ ] Remove all event listeners in useEffect cleanup
- [ ] Dispose Three.js objects if any created
- [ ] Use Chrome DevTools memory profiler: take heap snapshot before/after checkout

**Acceptance**: No memory leaks detected

---

### Task 7.13: Error Logging
- [ ] Log checkout errors to console (development mode)
- [ ] Optional: Send to monitoring service (production, e.g., Sentry)
- [ ] Never log sensitive info (payment data, personal info)
- [ ] Test error scenarios, verify logs

**Acceptance**: Errors logged appropriately

---

### Task 7.14: CSP Compliance
- [ ] Verify checkout iframe respects Shopify CSP headers
- [ ] Use HTTPS URLs only (enforced by `envPublic`)
- [ ] Test in production-like environment
- [ ] Check browser console for CSP violations

**Acceptance**: No CSP violations, HTTPS enforced

---

### Task 7.15: Environment Variable Scan
- [ ] Run `npm run env:check` → must pass
- [ ] Grep for raw env usage in checkout files:
  ```bash
  grep -r "process\.env\|import\.meta\.env\|context\.env" app/components/checkout-panel/ app/components/admin/CheckoutSettings.jsx app/routes/api.checkout-session.jsx
  ```
- [ ] Fix any violations (use `envPublic`/`envServer`)

**Acceptance**: No raw env usage, env:check passes

---

### Task 7.16: Hard-Coded Domain Scan
- [ ] Grep for hard-coded domains in checkout files:
  ```bash
  grep -r "nx40dr\|nuwudorder\|myshopify" app/components/checkout-panel/ app/components/admin/ app/routes/api.checkout-session.jsx
  ```
- [ ] Replace with `envPublic.PUBLIC_CHECKOUT_DOMAIN` or `envPublic.PUBLIC_STORE_DOMAIN`
- [ ] Re-run grep, verify clean

**Acceptance**: No hard-coded domains detected

---

### Task 7.17: Lint & Build Validation
- [ ] Run `npm run lint` → must pass (0 errors, 0 warnings)
- [ ] Run `npm run build` → must pass (no SSR violations)
- [ ] Fix any errors or warnings
- [ ] Test build output in preview: `npm run preview`

**Acceptance**: Lint and build pass, preview works

---

### Task 7.18: Comprehensive Integration Testing
- [ ] Run all quickstart.md validation scenarios:
  - Quick Test #1: Basic Center Panel Checkout
  - Quick Test #2: Animation Style Switching
  - Quick Test #3: Responsive Panel Sizing
  - Quick Test #4: Iframe Fallback
  - Quick Test #5: Checkout Mode Switching
  - Quick Test #6: 3D Performance During Checkout
  - Integration Test Scenario: Full end-to-end
- [ ] Test on real devices: desktop, tablet, mobile
- [ ] Test on multiple browsers: Chrome, Firefox, Safari
- [ ] Document any issues found, fix before completion

**Acceptance**: All quickstart tests pass, no critical issues

---

## Definition of Done

### All 74 Tasks Completed
- [x] Phase 1: Foundational Setup (6 tasks)
- [x] Phase 2: Shopify Integration (5 tasks)
- [x] Phase 3: US1 Basic Center Panel (16 tasks)
- [x] Phase 4: US2 Animation Styles (11 tasks)
- [x] Phase 5: US4 Responsive Sizing (8 tasks)
- [x] Phase 6: US3 Mode Configuration (10 tasks)
- [x] Phase 7: Polish & Validation (18 tasks)

### Validation Gates
- [x] `npm run env:check` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] No raw env usage detected
- [x] No hard-coded domains detected

### Functionality
- [x] All 4 user stories fully implemented
- [x] All quickstart validation scenarios pass
- [x] Integration test scenario passes
- [x] No console errors during normal flow

### Performance
- [x] Checkout opens within 2 seconds
- [x] Animations maintain 60fps
- [x] Bundle size ≤ 100 KB
- [x] No memory leaks detected

### Accessibility
- [x] Keyboard navigation works
- [x] Screen reader announces correctly
- [x] Touch targets meet guidelines (44x44px)
- [x] WCAG 2.1 AA compliance

### Documentation
- [x] All functions have JSDoc documentation
- [x] Admin usage guide complete
- [x] API reference documented
- [x] Code comments explain complex logic

### Testing
- [x] Manual testing on desktop/tablet/mobile
- [x] Browser compatibility (Chrome, Firefox, Safari)
- [x] Error scenarios tested
- [x] Performance profiled

---

## Submission Checklist

Before final PR:
- [ ] All 74 tasks marked completed
- [ ] All validation gates pass
- [ ] No merge conflicts with main branch
- [ ] PR description includes:
  - Feature summary
  - Video demo (before/after)
  - Testing performed
  - Known limitations (if any)
- [ ] Team review requested

**Status**: Ready for implementation by GitHub Copilot Coding Agent ✅
