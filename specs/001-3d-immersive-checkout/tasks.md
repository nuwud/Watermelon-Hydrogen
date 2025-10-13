# Tasks: 3D Immersive Checkout Experience

**Input**: Design documents from `/specs/001-3d-immersive-checkout/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Manual testing via browser console utilities + quickstart validation scenarios

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions
- **Web app (Hydrogen/Remix)**: `app/components/`, `app/utils/`, `app/routes/`, `app/styles/`
- **Spec directory**: `specs/001-3d-immersive-checkout/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for checkout system

- [ ] T001 Verify all validation gates pass: `npm run env:check && npm run lint && npm run build`
- [ ] T002 [P] Create checkout component directory: `app/components/checkout-panel/`
- [ ] T003 [P] Create admin extension directory: `app/components/admin/`
- [ ] T004 [P] Create checkout utilities directory: `app/utils/checkoutHelpers.js`
- [ ] T005 [P] Create checkout styles file: `app/styles/checkout-panel.css`
- [ ] T006 [P] Add loading spinner asset: `public/assets/checkout/loading-spinner.svg`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Create CheckoutUIContext in `app/components/context/checkout-ui.jsx` with:
  - `CheckoutSession`, `CheckoutConfig`, `CarouselCheckoutState` state management
  - `openCheckout()`, `closeCheckout()`, `handleCheckoutComplete()` actions
  - localStorage integration for config persistence
  - sessionStorage integration for session recovery
- [ ] T008 Implement checkout helpers in `app/utils/checkoutHelpers.js`:
  - `createCheckoutSession(cartId)` - Shopify Storefront API mutation
  - `validateCheckoutUrl(url)` - Domain validation against `PUBLIC_CHECKOUT_DOMAIN`
  - `generateCheckoutConfig()` - Default config factory
  - `sanitizeCheckoutError(error)` - User-friendly error messages
- [ ] T009 Extend `~/utils/env.public.ts` to export `PUBLIC_CHECKOUT_DOMAIN` (if not already present)
- [ ] T010 Add CheckoutUIContext provider to `app/root.jsx` or `app/routes/($locale)._index.jsx`
- [ ] T011 Create SSR-safe ClientOnly wrapper if not exists: `app/components/ClientOnly.jsx`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Basic Center Panel Checkout (Priority: P1) 🎯 MVP

**Goal**: Display Shopify checkout in responsive center panel with dramatic animation when user clicks "Checkout"

**Independent Test**: Add product → cart → click "Checkout" → verify center panel opens with iframe → complete test checkout → verify carousel restores

### Implementation for User Story 1

**Core Components**

- [ ] T012 [P] [US1] Create `CheckoutPanel.jsx` in `app/components/checkout-panel/`:
  - Accept `checkoutUrl`, `onComplete`, `onError`, `onClose` props
  - Render iframe with `src={checkoutUrl}`
  - Implement iframe load/error event listeners
  - Set iframe sandbox attribute: `allow-scripts allow-same-origin allow-forms allow-popups`
  - Implement 3-second timeout detection for iframe load
  - Add postMessage listener for checkout completion detection
  - Validate `event.origin` matches `PUBLIC_STORE_DOMAIN`
  - Handle checkout complete message: extract orderId, call `onComplete()`
- [ ] T013 [P] [US1] Create `CheckoutPanelWrapper.jsx` in `app/components/checkout-panel/`:
  - Wrap `CheckoutPanel` in `<ClientOnly>` for SSR safety
  - Provide `<CheckoutPanelSkeleton />` fallback (simple loading state)
  - Accept same props as CheckoutPanel, pass through
- [ ] T014 [P] [US1] Create `CheckoutFallback.jsx` in `app/components/checkout-panel/`:
  - Display user-friendly notification: "Opening secure checkout..."
  - Accept `checkoutUrl` and `errorMessage` props
  - Countdown timer (1 second) before redirect
  - Trigger `window.location.href = checkoutUrl` redirect to full-page
  - Show error details in console (not to user)

**Animation System**

- [ ] T015 [US1] Create `CheckoutAnimations.js` in `app/components/checkout-panel/`:
  - Export `dramaticAnimation(carouselItems, onComplete)` function
  - Use GSAP timeline to animate items outward (z: '-=500', scale: 0.6, opacity: 0.3)
  - Duration: 1 second, ease: 'power2.out'
  - Call `onComplete()` in timeline's `onComplete` callback
  - Export cleanup function: `killCheckoutAnimation(timeline)`

**State Management Hook**

- [ ] T016 [US1] Create `useCheckoutSession.js` in `app/components/checkout-panel/`:
  - Custom React hook wrapping `useCheckoutUI()` context
  - Manage `iframeStatus` state: 'loading' | 'loaded' | 'failed'
  - Implement iframe timeout timer (3 seconds)
  - Return `{ session, openCheckout, closeCheckout, iframeStatus, isLoading }`

**Responsive Styling**

- [ ] T017 [US1] Implement responsive panel CSS in `app/styles/checkout-panel.css`:
  - `.checkout-panel-container`: Fixed position, full viewport, z-index: 1000
  - `.checkout-panel`: CSS Grid centered
  - Desktop (@media min-width 1200px): 900px × 700px
  - Tablet (@media 768px-1199px): 90vw × 80vh, max-width 800px
  - Mobile (@media max-width 767px): 100vw × calc(100vh - 60px), border-radius: 0
  - Panel styling: white background, border-radius 12px, box-shadow
  - Iframe: width 100%, height 100%, border: none

**Carousel Integration**

- [ ] T018 [US1] Add carousel control to `app/components/Carousel3DPro/main.js` (GOLDEN FILE - minimal touch):
  - Expose `window.carouselControls = { pauseRendering, resumeRendering }`
  - `pauseRendering()`: `cancelAnimationFrame(animationFrameId)`, log "3D rendering paused"
  - `resumeRendering()`: Restart render loop with `animate()`, log "3D rendering resumed"
  - **IMPORTANT**: Do not modify any other carousel logic

**Cart Integration**

- [ ] T019 [US1] Extend `app/components/context/cart-ui.jsx` (GOLDEN FILE - minimal touch):
  - Add `checkoutMode: 'center-panel' | 'full-page' | 'overlay-modal'` to context state
  - Add `isCheckoutOpen: boolean` to context state
  - Import and use `CheckoutUIContext`
  - **IMPORTANT**: Do not modify existing cart drawer logic

**Checkout Trigger**

- [ ] T020 [US1] Update cart drawer component to add checkout button click handler:
  - Find existing "Checkout" button component
  - Add `onClick={() => openCheckout(cart.id)}`
  - Show loading state while checkout initializes
  - Disable button if cart is empty

**Main Integration**

- [ ] T021 [US1] Integrate `CheckoutPanelWrapper` into `app/routes/($locale)._index.jsx`:
  - Import `CheckoutPanelWrapper` with React.lazy
  - Use `<Suspense fallback={<CheckoutPanelSkeleton />}>`
  - Conditionally render only when `isCheckoutOpen === true`
  - Pass handlers: `onComplete`, `onError`, `onClose` from context

**Completion & Restoration**

- [ ] T022 [US1] Implement checkout completion flow in CheckoutUIContext:
  - `handleCheckoutComplete(orderId, orderNumber)`:
    - Set session.status = 'complete'
    - Store orderId and orderNumber
    - Close checkout panel
    - Resume 3D rendering: `window.carouselControls.resumeRendering()`
    - Animate carousel back to original state
    - Show confirmation message (3D text or toast)
    - Clear cart
    - Clear sessionStorage checkout session after 5 seconds

**Error Handling**

- [ ] T023 [US1] Implement error handling in CheckoutUIContext:
  - `handleCheckoutError(errorType, errorMessage)`:
    - Set session.status = 'failed'
    - Store error details
    - Log error to console (not user-facing)
    - Trigger fallback: render `CheckoutFallback` component
    - After 1 second delay, redirect to full-page checkout

**Validation & Testing**

- [ ] T024 [US1] Test basic checkout flow per `quickstart.md` Quick Test #1:
  - Verify checkout opens within 2 seconds
  - Verify iframe loads Shopify checkout
  - Verify animation is smooth (60fps)
  - Verify carousel restores after completion
  - Verify no console errors
- [ ] T025 [US1] Test iframe fallback per `quickstart.md` Quick Test #4:
  - Simulate iframe timeout (block network request)
  - Verify fallback notification appears
  - Verify redirect to full-page works
- [ ] T026 [US1] Run validation gates: `npm run env:check && npm run lint && npm run build`
- [ ] T027 [US1] Scan for violations:
  - No raw env: `grep -r "process\.env\|import\.meta\.env\|context\.env" app/components/checkout-panel/`
  - No hard-coded domains: `grep -r "nuwudorder\|nx40dr-bu\|o2\.myshopify" app/components/checkout-panel/`

**Checkpoint**: At this point, User Story 1 (MVP) should be fully functional - basic center panel checkout with dramatic animation

---

## Phase 4: User Story 2 - Multiple Animation Styles (Priority: P2)

**Goal**: Add subtle and elegant animation options, selectable via watermelonAdmin panel

**Independent Test**: Switch animation styles in admin → test checkout with each → verify animations match expectations → verify persistence

### Implementation for User Story 2

**Animation Variants**

- [ ] T028 [P] [US2] Add `subtleAnimation(carouselItems, onComplete)` to `CheckoutAnimations.js`:
  - GSAP timeline: fade opacity to 0.2, no movement, duration: 800ms
  - Ease: 'power1.inOut'
  - Call `onComplete()` callback
- [ ] T029 [P] [US2] Add `elegantAnimation(carouselItems, onComplete)` to `CheckoutAnimations.js`:
  - GSAP timeline: rotate items 180° on Y-axis (backside visible)
  - Duration: 1200ms, ease: 'power2.inOut'
  - Slight scale down: 0.9
  - Call `onComplete()` callback
- [ ] T030 [US2] Add animation selector function `getCheckoutAnimation(style)`:
  - Accept style: 'dramatic' | 'subtle' | 'elegant'
  - Return corresponding animation function
  - Default to 'dramatic' if unknown style

**Admin Panel Extension**

- [ ] T031 [US2] Create `CheckoutSettings.jsx` in `app/components/admin/`:
  - Create settings panel UI with animation style selector
  - Three radio buttons: "Dramatic", "Subtle", "Elegant"
  - Current selection indicator (highlight/checkmark)
  - "Preview" button for each style
  - "Save" button to persist to localStorage
  - Load current setting from `watermelonAdmin.checkoutSettings.getAnimationStyle()`

**Window Global API**

- [ ] T032 [US2] Extend `window.watermelonAdmin.checkoutSettings` in CheckoutSettings component:
  - `setAnimationStyle(style)`: Save to localStorage `wm_checkout_animation`
  - `getAnimationStyle()`: Read from localStorage, default to 'dramatic'
  - `preview(mode, style)`: Show mock checkout with selected animation (no real payment)
  - Dispatch CustomEvent 'wm:checkout-config-changed' on changes

**Preview Functionality**

- [ ] T033 [US2] Implement animation preview in CheckoutSettings:
  - "Preview" button triggers animation without opening real checkout
  - Use mock panel or temporary visual indicator
  - Animation runs, then auto-reverses after 2 seconds
  - No Shopify API calls during preview

**Context Integration**

- [ ] T034 [US2] Update CheckoutUIContext to use selected animation style:
  - Read `animationStyle` from localStorage on mount
  - Pass style to `openCheckout()` function
  - Use `getCheckoutAnimation(style)` to select correct animation
  - Store style in CheckoutConfig state

**Persistence**

- [ ] T035 [US2] Implement settings persistence:
  - Save to localStorage: `wm_checkout_animation`
  - Load on app mount in CheckoutUIContext
  - Update state when CustomEvent 'wm:checkout-config-changed' fires

**Validation & Testing**

- [ ] T036 [US2] Test animation style switching per `quickstart.md` Quick Test #2:
  - Open watermelonAdmin panel
  - Test dramatic preview → verify items push outward
  - Test subtle preview → verify fade only
  - Test elegant preview → verify rotate to backside
  - Save elegant → reload page → verify persists
  - Test real checkout with elegant → verify correct animation
- [ ] T037 [US2] Verify animations maintain 60fps (use Chrome DevTools Performance panel)
- [ ] T038 [US2] Run validation gates: `npm run env:check && npm run lint && npm run build`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - three animation styles selectable and persistent

---

## Phase 5: User Story 4 - Responsive Panel Sizing (Priority: P2)

**Goal**: Ensure checkout panel resizes correctly across all viewports with orientation change support

**Independent Test**: Load checkout on desktop/tablet/mobile viewports → verify panel sizing appropriate → test orientation change → verify smooth resize

**NOTE**: Implementing US4 before US3 because responsive design affects all modes

### Implementation for User Story 4

**Responsive Sizing Logic**

- [ ] T039 [US4] Add viewport detection hook `useViewportSize.js` in `app/components/checkout-panel/`:
  - Return `{ width, height, viewport: 'desktop' | 'tablet' | 'mobile' }`
  - Listen to window 'resize' and 'orientationchange' events
  - Debounce resize handler (100ms)
  - Cleanup event listeners on unmount

**Dynamic Panel Sizing**

- [ ] T040 [US4] Update CheckoutPanel.jsx to use dynamic sizing:
  - Import `useViewportSize()` hook
  - Apply size classes based on viewport: `checkout-panel--desktop`, `checkout-panel--tablet`, `checkout-panel--mobile`
  - Handle orientation change without reloading iframe (preserve checkout state)

**Enhanced CSS**

- [ ] T041 [US4] Enhance `app/styles/checkout-panel.css` with orientation-specific rules:
  - Mobile landscape: Adjust height to `calc(100vh - 40px)` (smaller header)
  - Tablet landscape: Prefer width-based sizing
  - Add transition: `width 0.3s ease, height 0.3s ease` for smooth resizing
  - Ensure iframe remains full-size within panel at all breakpoints

**Carousel Visibility Adjustments**

- [ ] T042 [US4] Add mobile-specific carousel behavior:
  - On mobile (<768px), animate carousel to minimal view (smaller scale)
  - Keep minimum 20% screen width for carousel visibility
  - On desktop/tablet, maintain full carousel visibility at edges

**Validation & Testing**

- [ ] T043 [US4] Test responsive sizing per `quickstart.md` Quick Test #3:
  - Desktop 1920x1080: Panel is 900x700px, carousel visible at edges
  - Tablet 768x1024: Panel is ~90vw x 80vh, carousel compressed
  - Mobile portrait 375x667: Fullscreen panel minus header
  - Mobile landscape 667x375: Panel adjusts, no cut-off content
  - Rotate device: Panel smoothly resizes without reload
- [ ] T044 [US4] Test on real mobile devices (iOS Safari, Android Chrome)
- [ ] T045 [US4] Verify no horizontal scroll on any viewport
- [ ] T046 [US4] Run validation gates: `npm run env:check && npm run lint && npm run build`

**Checkpoint**: At this point, User Stories 1, 2, AND 4 work - responsive panel sizing across all devices

---

## Phase 6: User Story 3 - Admin Checkout Mode Configuration (Priority: P3)

**Goal**: Add three checkout mode options (center-panel, full-page, overlay-modal) with live preview

**Independent Test**: Switch checkout modes in admin → test checkout in each mode → verify mode persists → verify all modes provide valid checkout path

### Implementation for User Story 3

**Checkout Modes**

- [ ] T047 [P] [US3] Implement full-page mode in CheckoutUIContext:
  - `openCheckout()`: When mode is 'full-page', skip animation and panel
  - Immediately redirect: `window.location.href = checkoutUrl`
  - No center panel rendering
- [ ] T048 [P] [US3] Create OverlayModal component in `app/components/checkout-panel/CheckoutOverlayModal.jsx`:
  - Render checkout iframe in modal dialog
  - Blur 3D scene behind modal: Apply backdrop-filter CSS
  - Click outside modal to close (optional based on `showCloseButton` config)
  - ESC key to close

**Admin Mode Selector**

- [ ] T049 [US3] Extend `CheckoutSettings.jsx` with mode selector:
  - Three radio buttons: "Center Panel", "Full Page", "Overlay Modal"
  - Preview thumbnails for each mode
  - Current mode indicator
  - "Preview" button for each mode
  - "Save" button to persist to localStorage

**Window Global API Extension**

- [ ] T050 [US3] Extend `window.watermelonAdmin.checkoutSettings` with mode functions:
  - `setMode(mode)`: Save to localStorage `wm_checkout_mode`
  - `getMode()`: Read from localStorage, default to 'center-panel'
  - `preview(mode, style)`: Updated to handle all three modes

**Mode Preview**

- [ ] T051 [US3] Implement mode preview in CheckoutSettings:
  - "Preview Center Panel": Show mock center panel with animation
  - "Preview Full Page": Show notification "Would redirect to full-page checkout"
  - "Preview Overlay Modal": Show modal with blurred background
  - No real Shopify API calls during preview

**Context Mode Integration**

- [ ] T052 [US3] Update CheckoutUIContext to respect mode setting:
  - Read `checkoutMode` from localStorage on mount
  - In `openCheckout()`: Branch based on mode:
    - 'center-panel': Existing animation + panel
    - 'full-page': Direct redirect (T047)
    - 'overlay-modal': Render OverlayModal (T048)
  - Store mode in CheckoutConfig state

**Overlay Modal Styling**

- [ ] T053 [US3] Add overlay modal CSS to `app/styles/checkout-panel.css`:
  - `.checkout-overlay`: Fixed position, full viewport, z-index: 2000
  - Backdrop: `backdrop-filter: blur(10px)`, `background: rgba(0,0,0,0.3)`
  - Modal content: Centered, 80vw × 85vh, white background
  - Close button (X) in top-right corner

**Validation & Testing**

- [ ] T054 [US3] Test mode switching per `quickstart.md` Quick Test #5:
  - Test center panel mode (already validated in US1)
  - Switch to full-page → verify immediate redirect
  - Switch to overlay modal → verify modal + blurred scene
  - Test mode persistence across reloads
  - Verify each mode provides valid checkout completion path
- [ ] T055 [US3] Test fallback behavior: If iframe blocked in overlay mode, fallback to full-page
- [ ] T056 [US3] Run validation gates: `npm run env:check && npm run lint && npm run build`

**Checkpoint**: All user stories (1, 2, 3, 4) should now be independently functional - full checkout system complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

**Performance Optimization**

- [ ] T057 [P] Measure checkout panel bundle size with Vite bundle analyzer:
  - Target: ≤ 100 KB
  - If over target, investigate code splitting for GSAP animations
- [ ] T058 [P] Add performance monitoring to CheckoutPanel:
  - Track time from button click to panel open (target: ≤ 2s)
  - Track iframe load time (target: ≤ 3s)
  - Log performance metrics to console in dev mode
- [ ] T059 Verify 3D rendering pauses during checkout (FPS drops significantly)
- [ ] T060 Test memory usage with Chrome DevTools Performance Monitor:
  - Open checkout, wait 30 seconds, verify no memory leaks
  - Close checkout, verify memory released

**Accessibility**

- [ ] T061 [P] Add ARIA labels to checkout panel:
  - `role="dialog"` on panel container
  - `aria-label="Checkout"` on iframe
  - `aria-live="polite"` on loading/error messages
- [ ] T062 [P] Implement keyboard navigation:
  - ESC key closes checkout panel
  - Tab focus trapped within panel when open
  - Focus returns to "Checkout" button after close
- [ ] T063 Test with screen reader (NVDA/VoiceOver):
  - Verify checkout panel opening is announced
  - Verify iframe content is accessible

**Error Handling**

- [ ] T064 Add comprehensive error logging:
  - Log all checkout errors to browser console (not user-facing)
  - Include error type, timestamp, session ID
  - Sanitize sensitive data before logging
- [ ] T065 Test all error scenarios from `quickstart.md`:
  - Iframe timeout
  - Network interruption
  - Shopify checkout session expired
  - Invalid checkout URL

**Documentation**

- [ ] T066 [P] Update `README.md` with checkout feature:
  - Add "3D Immersive Checkout" section
  - Link to quickstart.md for testing
  - Note watermelonAdmin settings
- [ ] T067 [P] Add inline code comments:
  - Document why ClientOnly is used (SSR safety)
  - Document GSAP animation coordination with carousel
  - Document postMessage origin validation
- [ ] T068 [P] Update `.github/copilot-instructions.md` if needed:
  - Add checkout panel to high-risk modules list (if appropriate)
  - Document new window.watermelonAdmin.checkoutSettings API

**Integration Validation**

- [ ] T069 Run full integration test per `quickstart.md` Integration Test Scenario:
  - Fresh page load → browse carousel → add to cart → modify quantity
  - Checkout → complete → verify empty cart
  - Change animation style → checkout again → verify correct animation
  - Change to full-page mode → verify redirect
  - All steps complete without errors
- [ ] T070 Run browser console integration test:
  - `window.integrationTests.runFullIntegrationTest()`
  - Verify all tests pass

**Final Validation**

- [ ] T071 Complete validation checklist from `quickstart.md`:
  - All 8 functionality items checked
  - All 5 performance items checked
  - All 4 quality items checked
  - All 4 user experience items checked
- [ ] T072 Final validation gate run: `npm run env:check && npm run lint && npm run build`
- [ ] T073 Final scan for violations:
  - No raw env in checkout code
  - No hard-coded domains in checkout code
  - SSR-safe (build succeeds)
- [ ] T074 Test on production-like environment (Oxygen preview deployment)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (P1) → US2 (P2) → US4 (P2) → US3 (P3) recommended sequence
  - OR US1, US2, US4 can proceed in parallel (different files)
  - US3 should complete after US2 and US4 (mode selector depends on animation and responsive features)
- **Polish (Phase 7)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Basic Center Panel**: Can start after Foundational (Phase 2) - No dependencies on other stories ✅ INDEPENDENT
- **User Story 2 (P2) - Animation Styles**: Can start after Foundational OR after US1 - Extends CheckoutAnimations.js from US1
- **User Story 4 (P2) - Responsive Sizing**: Can start after Foundational OR after US1 - Enhances CheckoutPanel.jsx from US1
- **User Story 3 (P3) - Mode Configuration**: Depends on US1 (center panel must exist) - Can proceed in parallel with US2/US4

### Within Each User Story

**US1 Flow**:
- Setup → Foundational → T012-T014 (components) [P] → T015-T017 (animation/hook/CSS) [P] → T018-T020 (integration) → T021-T023 (completion/errors) → T024-T027 (validation)

**US2 Flow**:
- T028-T030 (animation variants) [P] → T031-T033 (admin panel) → T034-T035 (context integration) → T036-T038 (validation)

**US4 Flow**:
- T039-T042 (responsive logic) [P] → T043-T046 (validation)

**US3 Flow**:
- T047-T048 (mode implementations) [P] → T049-T051 (admin mode selector) → T052-T053 (integration + styling) → T054-T056 (validation)

### Parallel Opportunities

**Setup Phase (Phase 1)**: All 6 tasks can run in parallel

**Foundational Phase (Phase 2)**: T007-T009 [P], then T010-T011

**User Story 1**: 
- T012, T013, T014 [P] (components)
- T015, T016, T017 [P] (animation, hook, CSS)

**User Story 2**:
- T028, T029 [P] (animation variants)

**User Story 4**:
- T039, T040, T041, T042 [P] (responsive logic)

**User Story 3**:
- T047, T048 [P] (mode implementations)

**Polish Phase**:
- T057, T058, T061, T062, T066, T067, T068 [P] (independent improvements)

---

## Parallel Example: User Story 1 Core Components

```bash
# Launch all core components together:
Task T012: "Create CheckoutPanel.jsx in app/components/checkout-panel/"
Task T013: "Create CheckoutPanelWrapper.jsx in app/components/checkout-panel/"
Task T014: "Create CheckoutFallback.jsx in app/components/checkout-panel/"

# Then launch animation, hook, and CSS together:
Task T015: "Create CheckoutAnimations.js in app/components/checkout-panel/"
Task T016: "Create useCheckoutSession.js in app/components/checkout-panel/"
Task T017: "Implement responsive panel CSS in app/styles/checkout-panel.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T011) - CRITICAL BLOCKER
3. Complete Phase 3: User Story 1 (T012-T027)
4. **STOP and VALIDATE**: Run Quick Test #1 and Quick Test #4 from quickstart.md
5. Deploy/demo MVP if ready → Get user feedback

**MVP Scope**: Basic center panel checkout with dramatic animation, iframe fallback, responsive sizing (from CSS)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (T012-T027) → Test independently → Deploy/Demo (MVP! 🎯)
3. Add User Story 2 (T028-T038) → Test independently → Deploy/Demo (Animation customization)
4. Add User Story 4 (T039-T046) → Test independently → Deploy/Demo (Enhanced responsive)
5. Add User Story 3 (T047-T056) → Test independently → Deploy/Demo (Mode flexibility)
6. Polish (T057-T074) → Final deployment

Each phase adds value without breaking previous features.

### Parallel Team Strategy

With multiple developers (after Foundational phase completes):

**Scenario A: Sequential Priority**
- Week 1: Everyone on US1 (MVP)
- Week 2: Everyone on US2 (animations)
- Week 3: Everyone on US4 (responsive)
- Week 4: Everyone on US3 (modes)

**Scenario B: Parallel Development**
- Developer A: US1 (T012-T027) - 3-4 days
- Developer B: US2 (T028-T038) - starts after US1 T015 complete - 2 days
- Developer C: US4 (T039-T046) - starts after US1 T012 complete - 2 days
- Then together: US3 (T047-T056) - 2 days
- Then together: Polish (T057-T074) - 2-3 days

**Critical Path**: Setup → Foundational → US1 → US3 (US2 and US4 can happen in parallel with US1 partially complete)

---

## Summary

**Total Tasks**: 74
- Phase 1 (Setup): 6 tasks
- Phase 2 (Foundational): 5 tasks (BLOCKING)
- Phase 3 (US1 - Basic Checkout): 16 tasks
- Phase 4 (US2 - Animation Styles): 11 tasks
- Phase 5 (US4 - Responsive Sizing): 8 tasks
- Phase 6 (US3 - Mode Configuration): 10 tasks
- Phase 7 (Polish): 18 tasks

**Parallel Opportunities**: 23 tasks marked [P]

**Independent Test Criteria**:
- US1: Add to cart → checkout → complete order → verify carousel restores
- US2: Switch animation styles → preview each → test real checkout → verify persistence
- US4: Test on desktop/tablet/mobile → verify panel sizing → test orientation change
- US3: Switch checkout modes → test center-panel/full-page/overlay → verify all work

**Suggested MVP Scope**: Phases 1, 2, 3 only (US1 - Basic Center Panel Checkout with dramatic animation)
- Estimated effort: 27 tasks, ~3-5 days for experienced developer
- Delivers core "wow factor" feature with full checkout functionality

**Full Feature Scope**: All 74 tasks
- Estimated effort: ~8-12 days for experienced developer (or 4-6 days with 2 developers in parallel)
- Delivers complete checkout system with all customization options

---

## Notes

- [P] tasks = different files, no shared dependencies
- [Story] labels: US1, US2, US3, US4 for traceability
- Each user story is independently completable and testable
- Golden files (`main.js`, `cart-ui.jsx`) marked for minimal touches only
- Stop at any checkpoint to validate story independently
- Commit after each task or logical group
- Run validation gates frequently (env:check, lint, build)
- Use quickstart.md validation scenarios throughout development
- Test on real devices before marking feature complete
