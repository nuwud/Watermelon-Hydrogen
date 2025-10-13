# 3D Immersive Checkout Experience

## Overview
Create an immersive 3D checkout experience where customers can complete Shopify checkout within a center panel surrounded by the 3D carousel, without leaving the immersive environment.

## User Stories

### US1: Basic Center Panel Checkout (P1 - MVP)
**As a** customer browsing the 3D carousel  
**I want** to checkout in a center panel that opens within the 3D environment  
**So that** I can complete my purchase without losing the immersive experience

**Acceptance Criteria:**
- Checkout button opens a center panel overlaid on the 3D carousel
- Carousel items animate outward (dramatic push) to create space
- Shopify checkout iframe loads within the panel
- Animations are smooth at 60fps
- On completion/close, carousel items restore to original positions
- Panel is centered and properly sized for desktop

### US2: Multiple Animation Styles (P2)
**As a** store owner  
**I want** to choose from multiple animation styles when checkout opens  
**So that** I can match the animation to my brand aesthetic

**Acceptance Criteria:**
- Three animation styles available:
  - Dramatic: Push items outward radially
  - Subtle: Fade items to low opacity (0.2)
  - Elegant: Rotate items to backside (180° Y-axis)
- Selected style persists across page reloads (localStorage)
- Preview mode allows testing styles without checkout
- Smooth transitions between styles

### US3: Admin Checkout Mode Configuration (P3)
**As a** store administrator  
**I want** to configure checkout behavior from an admin panel  
**So that** I can choose between immersive, traditional, or hybrid checkout experiences

**Acceptance Criteria:**
- Three checkout modes:
  - Center-panel: Immersive 3D experience (default)
  - Full-page: Traditional Shopify redirect
  - Overlay-modal: Hybrid with blur background
- Admin UI integrated with existing watermelonAdmin
- Settings persist via localStorage
- Mode can be previewed before saving

### US4: Responsive Panel Sizing (P2)
**As a** customer on any device  
**I want** the checkout panel to size appropriately  
**So that** I can complete checkout comfortably on any screen size

**Acceptance Criteria:**
- Desktop (≥1200px): 900x700px panel, carousel visible
- Tablet (768-1199px): 90vw x 80vh panel
- Mobile (<768px): Fullscreen panel, no horizontal scroll
- Orientation changes handled smoothly
- Touch targets meet accessibility guidelines (44x44px min)

## Success Criteria

### Functional
- All 4 user stories fully implemented
- Checkout session creates successfully
- iframe loads Shopify checkout
- Animations maintain 60fps
- Carousel state properly restored

### Performance
- Checkout panel opens within 2 seconds
- Bundle size ≤ 100 KB (lazy loaded)
- No memory leaks during open/close cycles
- No console errors during normal flow

### Accessibility
- Keyboard navigation works (Tab, Esc, Enter)
- Screen readers announce checkout state
- Touch targets meet WCAG guidelines
- Focus management on open/close

### Quality
- No raw env usage (`npm run env:check` passes)
- No hard-coded domains
- SSR-safe patterns (`npm run build` passes)
- No linting errors (`npm run lint` passes)

## Out of Scope

- Custom checkout form (using Shopify's native checkout)
- Payment gateway integration (handled by Shopify)
- Order confirmation page customization
- Multi-step checkout wizard
- Guest vs logged-in user flows (handled by Shopify)

## Dependencies

- Shopify Storefront API (checkoutCreate mutation)
- Existing cart-ui context
- Existing Carousel3DPro system
- GSAP for animations
- Three.js for 3D rendering

## Risks

1. **iframe restrictions**: Apple Pay may not work in iframe
   - Mitigation: Provide fallback to full-page mode
2. **CSP violations**: iframe content security policy
   - Mitigation: Ensure PUBLIC_CHECKOUT_DOMAIN in CSP
3. **Animation performance**: Heavy GSAP + Three.js rendering
   - Mitigation: Pause 3D rendering during checkout
4. **Mobile UX**: Small screens may not show carousel
   - Mitigation: Fullscreen mode on mobile (<768px)

## References

- Shopify Storefront API: https://shopify.dev/docs/api/storefront
- GSAP: https://gsap.com
- Three.js: https://threejs.org
- Project constraints: `.github/copilot-instructions.md`
