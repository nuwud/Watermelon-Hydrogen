# 3D Immersive Checkout - Implementation Tasks

Total: 74 tasks across 7 phases

## Phase 1: Foundational Setup (6 tasks)

### Task 1.1: Create project structure
- [ ] Create `app/components/checkout-panel/` directory
- [ ] Create `app/components/admin/` directory (for settings UI)
- [ ] Create `app/graphql/checkout.js` placeholder
- [ ] Create `app/utils/checkoutManager.js` placeholder

### Task 1.2: Validate environment variables
- [ ] Verify `PUBLIC_CHECKOUT_DOMAIN` is optional in `env.public.ts`
- [ ] Update `.env.sample` with `PUBLIC_CHECKOUT_DOMAIN` if missing
- [ ] Document usage in comments

### Task 1.3: Create checkout context
- [ ] Create `app/components/context/checkout-context.jsx`
- [ ] Export `CheckoutProvider` component
- [ ] Export `useCheckout` hook
- [ ] Include state: `isCheckoutOpen`, `checkoutUrl`, `animationStyle`, `checkoutMode`
- [ ] Include actions: `openCheckout`, `closeCheckout`, `setAnimationStyle`, `setCheckoutMode`

### Task 1.4: Create checkout manager utility
- [ ] Create `app/utils/checkoutManager.js`
- [ ] Implement `createCheckoutSession(cartId)` function
- [ ] Implement `getCheckoutUrl(checkoutId)` helper
- [ ] Use `envPublic` for domain resolution
- [ ] Add JSDoc documentation

### Task 1.5: Ensure SSR safety
- [ ] Verify `ClientOnly` component exists and works
- [ ] Test with simple Three.js component
- [ ] Document SSR safety patterns

### Task 1.6: Phase 1 validation
- [ ] Run `npm run env:check` - must pass
- [ ] Run `npm run lint` - must pass
- [ ] Run `npm run build` - must pass
- [ ] Verify no console errors

---

## Phase 2: Shopify Checkout Integration (5 tasks)

### Task 2.1: Create GraphQL checkout mutation
- [ ] Create `app/graphql/checkout.js`
- [ ] Define `CHECKOUT_CREATE_MUTATION`
- [ ] Include fields: `id`, `webUrl`, `totalPrice`, `lineItems`
- [ ] Use proper GraphQL tag syntax

### Task 2.2: Create server route
- [ ] Create `app/routes/api.checkout-session.jsx`
- [ ] Implement `action` function for POST requests
- [ ] Parse cart ID from request body
- [ ] Call Storefront API with mutation
- [ ] Return checkout URL as JSON
- [ ] Use `envServer` for private token (if needed)
- [ ] Use `envPublic` for public storefront access

### Task 2.3: Integrate with Storefront API
- [ ] Import `checkoutCreate` from `@shopify/hydrogen`
- [ ] Pass cart ID to mutation
- [ ] Handle API errors gracefully
- [ ] Log errors without exposing secrets

### Task 2.4: Connect "Checkout" button in cart
- [ ] Locate existing checkout button in cart drawer
- [ ] Replace direct link with context call
- [ ] Call `openCheckout()` from checkout context
- [ ] Pass cart ID to session creation

### Task 2.5: Phase 2 validation
- [ ] Test checkout session creation
- [ ] Verify valid checkout URL returned
- [ ] Run environment safety scan (grep for raw env)
- [ ] Ensure no hard-coded domains

---

## Phase 3: US1 - Basic Center Panel Checkout (16 tasks - MVP)

### Task 3.1: Create CheckoutPanel component
- [ ] Create `app/components/checkout-panel/CheckoutPanel.jsx`
- [ ] Accept props: `checkoutUrl`, `onClose`, `animationStyle`
- [ ] Render iframe with checkoutUrl
- [ ] Add close button (X icon)
- [ ] Include loading state
- [ ] Add JSDoc documentation

### Task 3.2: Implement CheckoutIframe
- [ ] Create `app/components/checkout-panel/CheckoutIframe.jsx`
- [ ] Set iframe sandbox attributes
- [ ] Add timeout detection (30 seconds)
- [ ] Show skeleton during loading
- [ ] Handle load errors

### Task 3.3: Add postMessage listener
- [ ] Listen for checkout completion messages
- [ ] Handle `checkout.completed` event
- [ ] Handle `checkout.cancelled` event
- [ ] Validate message origin matches checkout domain
- [ ] Call `onClose()` on completion

### Task 3.4: Create SSR-safe wrapper
- [ ] Create `app/components/checkout-panel/CheckoutPanelWrapper.jsx`
- [ ] Wrap with `<ClientOnly>` component
- [ ] Pass through all props
- [ ] Add fallback loader

### Task 3.5: Create CheckoutPanelSkeleton
- [ ] Create `app/components/checkout-panel/CheckoutPanelSkeleton.jsx`
- [ ] Show pulsing placeholder for iframe
- [ ] Match panel dimensions
- [ ] Use Tailwind animation utilities

### Task 3.6: Implement dramatic animation (GSAP)
- [ ] Create `app/components/checkout-panel/animations/dramatic.js`
- [ ] Import GSAP and Three.js types
- [ ] Implement `animateOpen(carouselItems)` function
- [ ] Push items outward radially by 50%
- [ ] Return GSAP timeline
- [ ] Duration: 0.8s, ease: "power2.out"

### Task 3.7: Coordinate with carousel locks
- [ ] Check `window.debugCarousel.isTransitioning` before animating
- [ ] Set `isTransitioning = true` before animation starts
- [ ] Set `isTransitioning = false` in `onComplete` callback
- [ ] Handle race conditions

### Task 3.8: Implement closing animation
- [ ] Implement `animateClose(carouselItems)` in dramatic.js
- [ ] Restore items to original positions
- [ ] Use same timing as opening
- [ ] Ensure cleanup on unmount

### Task 3.9: Style checkout panel (desktop)
- [ ] Create `app/components/checkout-panel/CheckoutPanel.css`
- [ ] Fixed positioning, centered
- [ ] Size: 900x700px
- [ ] Z-index: 1000 (above carousel, below admin)
- [ ] Box shadow: 0 8px 32px rgba(0,0,0,0.3)
- [ ] Border radius: 12px
- [ ] Background: white

### Task 3.10: Handle checkout completion
- [ ] Update cart count to 0
- [ ] Clear cart in localStorage (if used)
- [ ] Show success message (optional)
- [ ] Close panel automatically

### Task 3.11: Snapshot carousel state
- [ ] Before animation, save current index
- [ ] Save current rotation values
- [ ] Store in ref or context
- [ ] Use for restoration

### Task 3.12: Restore carousel state
- [ ] After closing, restore saved index
- [ ] Restore rotation values
- [ ] Smooth transition back
- [ ] Clear snapshot

### Task 3.13: Pause 3D rendering during checkout
- [ ] Access `window.debugCarousel` or exposed API
- [ ] Call `pauseRendering()` on open
- [ ] Call `resumeRendering()` on close
- [ ] Implement these functions in `main.js` if missing

### Task 3.14: Integrate with cart-ui context
- [ ] Import `useCartUI` from cart-ui context
- [ ] Listen for checkout open event
- [ ] Close cart drawer when checkout opens
- [ ] Coordinate z-index layering

### Task 3.15: Basic error handling
- [ ] Detect iframe load failure
- [ ] Show fallback: "Open in new tab" link
- [ ] Log error to console
- [ ] Handle network errors gracefully

### Task 3.16: Phase 3 validation (MVP)
- [ ] Full checkout flow works end-to-end
- [ ] Animations smooth at 60fps (use Chrome DevTools)
- [ ] No console errors during flow
- [ ] Carousel restores correctly after close
- [ ] Run `npm run lint && npm run build`

---

## Phase 4: US2 - Animation Styles (11 tasks)

### Task 4.1: Implement subtle animation
- [ ] Create `app/components/checkout-panel/animations/subtle.js`
- [ ] Implement `animateOpen(carouselItems)`
- [ ] Fade items to opacity 0.2
- [ ] No position changes
- [ ] Duration: 0.6s

### Task 4.2: Implement elegant animation
- [ ] Create `app/components/checkout-panel/animations/elegant.js`
- [ ] Implement `animateOpen(carouselItems)`
- [ ] Rotate items 180° on Y-axis (show backside)
- [ ] Duration: 1.0s, ease: "power2.inOut"
- [ ] Handle both open and close

### Task 4.3: Create checkout config utility
- [ ] Create `app/utils/checkoutConfig.js`
- [ ] Implement `getAnimationStyle()` - reads from localStorage
- [ ] Implement `setAnimationStyle(style)` - writes to localStorage
- [ ] Implement `getCheckoutMode()` - reads from localStorage
- [ ] Implement `setCheckoutMode(mode)` - writes to localStorage
- [ ] Default style: "dramatic", default mode: "center-panel"

### Task 4.4: Integrate config with context
- [ ] Update `checkout-context.jsx` to read from config on mount
- [ ] Update `setAnimationStyle` to persist to config
- [ ] Update `setCheckoutMode` to persist to config
- [ ] Handle SSR (check `typeof window !== 'undefined'`)

### Task 4.5: Implement animation preview mode
- [ ] Add `previewAnimation(style)` function to context
- [ ] Trigger animation without opening checkout
- [ ] Auto-reverse after 2 seconds
- [ ] Useful for admin settings preview

### Task 4.6: Animation cleanup
- [ ] Kill GSAP timelines on unmount
- [ ] Use `useEffect` cleanup function
- [ ] Call `gsap.killTweensOf(targets)`
- [ ] Prevent memory leaks

### Task 4.7: Performance testing
- [ ] Use Chrome DevTools Performance tab
- [ ] Record during animation
- [ ] Verify 60fps maintained
- [ ] Optimize if needed

### Task 4.8: Closing animation variants
- [ ] Update subtle.js with `animateClose()`
- [ ] Update elegant.js with `animateClose()`
- [ ] Ensure symmetrical transitions
- [ ] Test all three styles

### Task 4.9: Documentation (JSDoc)
- [ ] Add JSDoc to all animation functions
- [ ] Document parameters and return values
- [ ] Include usage examples
- [ ] Document GSAP timeline cleanup

### Task 4.10: Handle rapid triggering
- [ ] Prevent opening while animation in progress
- [ ] Queue requests if needed
- [ ] Or show warning: "Please wait..."
- [ ] Test rapid clicking

### Task 4.11: Phase 4 validation
- [ ] All three animation styles work correctly
- [ ] No memory leaks (test 20+ open/close cycles)
- [ ] Smooth 60fps animations
- [ ] Style persists across page reload

---

## Phase 5: US4 - Responsive Sizing (8 tasks)

### Task 5.1: Responsive CSS - Desktop
- [ ] Media query: `@media (min-width: 1200px)`
- [ ] Panel size: 900x700px
- [ ] Centered positioning
- [ ] Carousel visible around panel

### Task 5.2: Responsive CSS - Tablet
- [ ] Media query: `@media (min-width: 768px) and (max-width: 1199px)`
- [ ] Panel size: 90vw x 80vh
- [ ] Centered positioning
- [ ] Carousel partially visible

### Task 5.3: Responsive CSS - Mobile portrait
- [ ] Media query: `@media (max-width: 767px)`
- [ ] Panel size: 100vw x 100vh (fullscreen)
- [ ] No horizontal scroll
- [ ] Hide carousel (z-index or display: none)

### Task 5.4: Responsive CSS - Mobile landscape
- [ ] Media query: `@media (max-width: 767px) and (orientation: landscape)`
- [ ] Panel size: 100vw x 100vh
- [ ] Scrollable content if needed
- [ ] Optimize spacing

### Task 5.5: Orientation change handler
- [ ] Listen for `window.orientationchange` event
- [ ] Recalculate panel dimensions
- [ ] Smooth transition during rotation
- [ ] Test on real devices if possible

### Task 5.6: Carousel visibility on mobile
- [ ] Hide carousel items on mobile (<768px)
- [ ] Update animation functions to check viewport
- [ ] Skip animations if not visible
- [ ] Performance optimization

### Task 5.7: Responsive testing
- [ ] Test on Chrome DevTools device emulator
- [ ] Test viewports: 320px, 375px, 768px, 1024px, 1920px
- [ ] Verify no horizontal scroll at any size
- [ ] Check text readability

### Task 5.8: Touch interaction optimization
- [ ] Close button: min 44x44px touch target
- [ ] Increase padding if needed
- [ ] Add visual feedback on touch (active state)
- [ ] Test on touch devices

---

## Phase 6: US3 - Mode Configuration (10 tasks)

### Task 6.1: Implement full-page mode
- [ ] Update `openCheckout()` in context
- [ ] Check if mode is "full-page"
- [ ] If true, redirect to `checkoutUrl` immediately
- [ ] Use `window.location.href = checkoutUrl`
- [ ] Skip panel and animations

### Task 6.2: Implement overlay-modal mode
- [ ] Create `app/components/checkout-panel/OverlayModal.jsx`
- [ ] Blur background carousel (CSS: `filter: blur(8px)`)
- [ ] Darken overlay (rgba(0,0,0,0.5))
- [ ] No carousel animation (items stay in place)
- [ ] Panel centered with same sizing as center-panel

### Task 6.3: Mode persistence
- [ ] Use `checkoutConfig.js` utility
- [ ] Save mode on change: `setCheckoutMode(mode)`
- [ ] Load mode on mount: `getCheckoutMode()`
- [ ] Default: "center-panel"

### Task 6.4: Create CheckoutSettings admin component
- [ ] Create `app/components/admin/CheckoutSettings.jsx`
- [ ] Show three mode options (radio buttons)
- [ ] Show three animation style options (radio buttons)
- [ ] Save and Cancel buttons
- [ ] Preview button for each combination

### Task 6.5: Extend watermelonAdmin global
- [ ] Check if `window.watermelonAdmin` exists
- [ ] Add `checkoutSettings` property
- [ ] Include `openSettings()` function
- [ ] Include `previewStyle(style)` function
- [ ] Document in admin panel

### Task 6.6: Style admin panel UI
- [ ] Create `app/components/admin/CheckoutSettings.css`
- [ ] Panel: 400x600px, centered
- [ ] Z-index: 2000 (above checkout panel)
- [ ] Clean, minimal design
- [ ] Use existing admin styles if available

### Task 6.7: Implement mode preview
- [ ] Add "Preview" button next to each mode
- [ ] For center-panel: trigger animation preview
- [ ] For overlay-modal: show blur effect briefly
- [ ] For full-page: show info message (can't preview redirect)
- [ ] Auto-revert after 3 seconds

### Task 6.8: Mode switching logic
- [ ] Update `openCheckout()` to check mode
- [ ] Switch case: center-panel, overlay-modal, full-page
- [ ] Call appropriate rendering logic
- [ ] Test all three modes

### Task 6.9: Settings persistence testing
- [ ] Change mode, save, reload page
- [ ] Verify mode persists
- [ ] Change style, save, reload page
- [ ] Verify style persists
- [ ] Test localStorage edge cases

### Task 6.10: Phase 6 validation
- [ ] All three modes work correctly
- [ ] Admin UI functional and styled
- [ ] Settings persist across reloads
- [ ] Preview mode works for all combinations

---

## Phase 7: Polish & Validation (18 tasks)

### Task 7.1: Iframe fallback logic
- [ ] Detect if iframe load fails (timeout or error)
- [ ] Show fallback UI: "Open checkout in new tab"
- [ ] Provide button to open in new window
- [ ] Document Apple Pay iframe limitations

### Task 7.2: Network error handling
- [ ] Catch errors during checkout session creation
- [ ] Show user-friendly error message
- [ ] Provide retry button
- [ ] Log error details to console

### Task 7.3: Checkout session timeout
- [ ] Add timestamp to checkout URL
- [ ] After 30 minutes, mark as expired
- [ ] Show "Session expired" message
- [ ] Provide "Restart checkout" button

### Task 7.4: Empty cart protection
- [ ] Check if cart is empty before opening checkout
- [ ] Show message: "Your cart is empty"
- [ ] Disable checkout button if cart empty
- [ ] Update on cart changes

### Task 7.5: Browser back button handling
- [ ] Listen for `popstate` event
- [ ] If checkout is open, close it
- [ ] Prevent default browser back behavior during checkout
- [ ] Test with history API

### Task 7.6: Multiple tabs/windows sync
- [ ] Create `BroadcastChannel` for checkout state
- [ ] Broadcast "checkout.opened" on open
- [ ] Listen in other tabs, close their checkouts
- [ ] Prevent multiple concurrent checkouts

### Task 7.7: Accessibility - Keyboard navigation
- [ ] Tab through checkout panel elements
- [ ] Esc key closes checkout
- [ ] Enter on close button closes checkout
- [ ] Focus trap within panel

### Task 7.8: Accessibility - Screen reader support
- [ ] Add ARIA labels to panel
- [ ] `role="dialog"`, `aria-modal="true"`
- [ ] `aria-label="Checkout"`
- [ ] Announce state changes ("Checkout opened", "Checkout closed")

### Task 7.9: Performance - Lazy loading
- [ ] Use `React.lazy()` for CheckoutPanel
- [ ] Suspense fallback with skeleton
- [ ] Load animation modules dynamically
- [ ] Reduce initial bundle size

### Task 7.10: Performance - Preloading
- [ ] Preload checkout panel on cart open
- [ ] Preload animation modules on hover
- [ ] Use `<link rel="prefetch">` for iframe content
- [ ] Optimize for perceived performance

### Task 7.11: Performance - FPS monitoring
- [ ] Add FPS counter during development
- [ ] Warn if FPS drops below 55
- [ ] Log slow frames to console
- [ ] Disable in production

### Task 7.12: Memory leak prevention
- [ ] Review all `useEffect` cleanup functions
- [ ] Ensure GSAP timelines are killed
- [ ] Remove event listeners on unmount
- [ ] Test with Chrome DevTools memory profiler

### Task 7.13: Error logging
- [ ] Create `app/utils/errorLogger.js`
- [ ] Log errors to console in development
- [ ] Send to analytics in production (optional)
- [ ] Include context: user agent, cart ID, mode, style

### Task 7.14: CSP compliance
- [ ] Verify `PUBLIC_CHECKOUT_DOMAIN` in CSP headers
- [ ] Update `entry.server.jsx` if needed
- [ ] Allow iframe from checkout domain
- [ ] Test CSP with checkout flow

### Task 7.15: Environment variable scan
- [ ] Run grep scan for raw env usage
- [ ] Command: `grep -r "process\.env\|import\.meta\.env\|context\.env" app/components/checkout-panel app/utils/checkoutManager.js`
- [ ] Fix any violations
- [ ] Verify `npm run env:check` passes

### Task 7.16: Hard-coded domain scan
- [ ] Run grep scan for hard-coded domains
- [ ] Command: `grep -r "nuwudorder\.com\|nx40dr-bu\.myshopify\.com\|o2\.myshopify\.dev" app/components/checkout-panel`
- [ ] Replace with `envPublic.PUBLIC_CHECKOUT_DOMAIN`
- [ ] Document in code comments

### Task 7.17: Lint & build validation
- [ ] Run `npm run lint` - must pass with 0 errors
- [ ] Run `npm run build` - must pass
- [ ] Fix any TypeScript errors
- [ ] Fix any ESLint warnings

### Task 7.18: Comprehensive integration testing
- [ ] Test all 4 user stories end-to-end
- [ ] Test all 3 modes
- [ ] Test all 3 animation styles
- [ ] Test all responsive breakpoints
- [ ] Document test results

---

## Progress Tracking

**Phase 1 (Foundational Setup):** 0/6 complete
**Phase 2 (Shopify Integration):** 0/5 complete
**Phase 3 (Basic Center Panel - MVP):** 0/16 complete
**Phase 4 (Animation Styles):** 0/11 complete
**Phase 5 (Responsive Sizing):** 0/8 complete
**Phase 6 (Mode Configuration):** 0/10 complete
**Phase 7 (Polish & Validation):** 0/18 complete

**Total Progress:** 0/74 tasks complete (0%)
