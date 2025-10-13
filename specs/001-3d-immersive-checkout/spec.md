# Feature Specification: 3D Immersive Checkout Experience

**Feature Branch**: `001-3d-immersive-checkout`  
**Created**: 2025-10-13  
**Status**: Draft  
**Input**: User description: "Integrate Shopify checkout into the 3D carousel environment with center panel mode, configurable animation styles, and admin controls"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Center Panel Checkout (Priority: P1) 🎯 MVP

**Description**: As a customer, when I click "Checkout" from the cart, the 3D carousel opens up and displays the Shopify checkout in a panel at the center of the ring, allowing me to complete my purchase without leaving the immersive 3D experience.

**Why this priority**: This is the core "wow factor" feature that differentiates Watermelon from traditional storefronts. Provides the foundation for all other checkout enhancements.

**Independent Test**: Add product to cart, click checkout, verify center panel appears with Shopify checkout form, complete test purchase, verify confirmation displays and carousel returns to normal.

**Acceptance Scenarios**:

1. **Given** user has items in cart, **When** user clicks "Checkout" button, **Then** 3D carousel items animate outward (dramatic style), center panel slides in from depth with checkout iframe
2. **Given** checkout panel is displayed, **When** user enters shipping/payment info, **Then** Shopify checkout processes payment normally within iframe
3. **Given** checkout is complete, **When** Shopify confirms order, **Then** checkout panel closes, carousel animates back, confirmation message displays in 3D space
4. **Given** checkout iframe fails to load, **When** system detects iframe error, **Then** automatically fallback to full-page redirect with user notification

---

### User Story 2 - Multiple Animation Styles (Priority: P2)

**Description**: As a store owner, I want to choose between three different animation styles (dramatic push-outward, subtle fade-out, elegant rotate-to-back) for how the carousel opens during checkout, so I can match the checkout experience to my brand personality.

**Why this priority**: Adds brand customization without changing core functionality. Each store can choose the animation that fits their aesthetic.

**Independent Test**: Open watermelonAdmin panel, switch between animation styles, test checkout with each style, verify animations match expectations.

**Acceptance Scenarios**:

1. **Given** watermelonAdmin panel is open, **When** store owner selects "Dramatic" animation style, **Then** carousel items push outward radially when checkout opens
2. **Given** watermelonAdmin panel is open, **When** store owner selects "Subtle" animation style, **Then** carousel items fade to low opacity when checkout opens
3. **Given** watermelonAdmin panel is open, **When** store owner selects "Elegant" animation style, **Then** carousel items rotate to backside when checkout opens
4. **Given** animation style is saved, **When** page reloads, **Then** selected animation style persists

---

### User Story 3 - Admin Checkout Mode Configuration (Priority: P3)

**Description**: As a store owner, I want to choose between three checkout modes (center-panel immersive, full-page traditional, overlay-modal hybrid) from the watermelonAdmin panel, with live preview of each mode before applying, so I can optimize checkout conversion based on my audience.

**Why this priority**: Provides flexibility for different store needs (some may prefer traditional checkout). Enables A/B testing of checkout experiences.

**Independent Test**: Open admin panel, switch checkout modes, test checkout experience in each mode, verify mode persists after reload.

**Acceptance Scenarios**:

1. **Given** watermelonAdmin panel open, **When** store owner clicks "Checkout Settings", **Then** panel displays three mode options with preview thumbnails
2. **Given** store owner selects "Center Panel" mode, **When** clicking "Preview", **Then** system shows mock checkout in center panel without processing payment
3. **Given** store owner selects "Full Page" mode, **When** customer clicks checkout, **Then** traditional Shopify checkout redirect occurs
4. **Given** store owner selects "Overlay Modal" mode, **When** customer clicks checkout, **Then** checkout opens in modal with 3D scene blurred behind
5. **Given** checkout mode is changed, **When** system detects Shopify iframe restrictions, **Then** automatically fallback to full-page with warning in admin

---

### User Story 4 - Responsive Panel Sizing (Priority: P2)

**Description**: As a customer on any device, the checkout panel automatically resizes to fit my screen (desktop, tablet, mobile portrait/landscape) while maintaining optimal readability and 3D carousel visibility.

**Why this priority**: Essential for mobile commerce. Poor mobile checkout experience directly impacts conversion rates.

**Independent Test**: Load checkout on different viewports (1920x1080, 768x1024, 375x667), verify panel sizing is appropriate for each, verify 3D carousel remains visible.

**Acceptance Scenarios**:

1. **Given** desktop viewport (>1200px), **When** checkout opens, **Then** panel is 900x700px with carousel items visible at edges
2. **Given** tablet viewport (768-1199px), **When** checkout opens, **Then** panel is 90% width, carousel items slightly compressed
3. **Given** mobile portrait (<768px), **When** checkout opens, **Then** panel is fullscreen-minus-header, carousel animates to minimal view
4. **Given** device orientation changes, **When** rotating device, **Then** panel smoothly resizes without reloading checkout

---

### Edge Cases

- **Shopify iframe restrictions**: Some checkout features (Apple Pay, Shop Pay) may not work in iframe → auto-detect and fallback to full-page
- **Checkout session timeout**: If user leaves checkout open for >30min → detect timeout, show re-initialize button
- **Network interruption during checkout**: If connection drops → show reconnection UI, preserve cart state
- **Multiple tabs/windows**: If user opens checkout in multiple tabs → synchronize cart state via BroadcastChannel API
- **Browser back button during checkout**: If user clicks back → close checkout panel gracefully, return to cart
- **Empty cart checkout**: If cart becomes empty during checkout process → close checkout, show "cart is empty" message
- **Checkout domain mismatch**: If PUBLIC_CHECKOUT_DOMAIN doesn't match cart → fallback to default Shopify checkout
- **3D performance degradation**: If FPS drops below 30 during checkout animation → skip animation, show panel immediately
- **Accessibility requirements**: Screen readers must announce checkout panel opening, keyboard navigation must work in iframe

## Requirements *(mandatory)*

### Functional Requirements

**Core Checkout Integration**
- **FR-001**: System MUST create Shopify checkout session via Storefront API when user clicks "Checkout"
- **FR-002**: System MUST display checkout URL in responsive iframe within center panel of 3D carousel
- **FR-003**: System MUST detect checkout completion via postMessage API or order confirmation polling
- **FR-004**: System MUST automatically fallback to full-page redirect if iframe fails to load within 3 seconds
- **FR-005**: System MUST preserve cart state if checkout is abandoned (close button, ESC key, back button)

**3D Animation Integration**
- **FR-006**: System MUST support three animation styles: dramatic (push-outward), subtle (fade), elegant (rotate-back)
- **FR-007**: System MUST use GSAP for all carousel animations with proper cleanup and disposal
- **FR-008**: System MUST respect Carousel3DPro invariants (GSAP locks, transition flags, front-face logic)
- **FR-009**: System MUST pause 3D animations during checkout to improve performance
- **FR-010**: System MUST restore carousel to exact pre-checkout state after completion/cancellation

**Admin Configuration**
- **FR-011**: System MUST add "Checkout Settings" panel to existing watermelonAdmin interface
- **FR-012**: System MUST allow store owners to select checkout mode: center-panel, full-page, overlay-modal
- **FR-013**: System MUST allow store owners to select animation style: dramatic, subtle, elegant
- **FR-014**: System MUST provide live preview of each mode without processing real payment
- **FR-015**: System MUST persist settings to localStorage with Shopify metafield sync option

**Responsive Design**
- **FR-016**: System MUST resize checkout panel based on viewport: desktop (900x700), tablet (90% width), mobile (fullscreen)
- **FR-017**: System MUST handle orientation changes without reloading checkout iframe
- **FR-018**: System MUST maintain 3D carousel visibility at all viewport sizes (minimum 20% of screen)

**Security & Compliance**
- **FR-019**: System MUST use PUBLIC_CHECKOUT_DOMAIN from envPublic (never hard-code domains)
- **FR-020**: System MUST NOT access or store payment information (Shopify handles all PCI compliance)
- **FR-021**: System MUST use SSR-safe patterns (ClientOnly wrapper, typeof window guards)
- **FR-022**: System MUST pass validation gates: npm run env:check && npm run lint && npm run build

**Error Handling**
- **FR-023**: System MUST detect Shopify iframe restrictions and fallback gracefully
- **FR-024**: System MUST show user-friendly error messages for network failures
- **FR-025**: System MUST log checkout errors without exposing sensitive information
- **FR-026**: System MUST provide "Try Again" and "Full Page Checkout" options on error

### Key Entities

- **CheckoutSession**: Represents active checkout state (cart ID, checkout URL, mode, animation style, iframe status)
- **CheckoutConfig**: Store owner settings (preferred mode, animation style, fallback behavior, display options)
- **CarouselCheckoutState**: 3D carousel state snapshot (current rotation, active item, animation locks) for restoration

## Success Criteria *(mandatory)*

### Measurable Outcomes

**User Experience**
- **SC-001**: Users can initiate checkout from cart and see center panel open within 2 seconds
- **SC-002**: 95% of users successfully complete checkout in center panel mode without fallback
- **SC-003**: Checkout panel animation maintains 60fps on devices with GPU
- **SC-004**: Mobile users (< 768px) experience no horizontal scroll during checkout
- **SC-005**: Screen reader users can complete checkout with keyboard navigation only

**Performance**
- **SC-006**: Checkout panel component adds ≤ 100 KB to client bundle (lazy loaded)
- **SC-007**: GSAP animations complete in under 1 second for dramatic style
- **SC-008**: System detects iframe failure and fallbacks within 3 seconds
- **SC-009**: Carousel restoration after checkout takes ≤ 500ms

**Configuration**
- **SC-010**: Store owners can change checkout mode and see preview within 5 seconds
- **SC-011**: Admin settings persist across browser sessions and page reloads
- **SC-012**: Animation style changes apply immediately without page refresh

**Compliance & Security**
- **SC-013**: All checkout code passes `npm run env:check` (no raw env usage)
- **SC-014**: All checkout code passes `npm run lint && npm run build`
- **SC-015**: No hard-coded domains detected in checkout integration code
- **SC-016**: Checkout iframe uses HTTPS and respects Shopify CSP headers

**Business Impact**
- **SC-017**: Checkout abandonment rate remains same or better than traditional checkout
- **SC-018**: < 1% of checkouts require fallback to full-page mode
- **SC-019**: Store owners report "immersive checkout" as unique selling point in user testing
- **SC-020**: Zero PCI compliance violations introduced by center panel checkout
