# Implementation Plan: 3D Immersive Checkout Experience

**Branch**: `001-3d-immersive-checkout` | **Date**: 2025-10-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-3d-immersive-checkout/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Integrate Shopify checkout into the 3D carousel environment using a responsive center panel that slides in when customers click "Checkout". The implementation uses GSAP for three configurable animation styles (dramatic push-outward, subtle fade, elegant rotate-back), displays the Shopify checkout in an iframe with automatic fallback handling, and adds admin controls to existing watermelonAdmin panel for mode selection (center-panel/full-page/overlay-modal). All code must respect Watermelon Hydrogen's constitutional principles: SSR safety, env security, no hard-coded domains, and 3D carousel invariants.

## Technical Context

**Language/Version**: JavaScript (ES2022), React 18, Remix 2.x (Hydrogen framework)  
**Primary Dependencies**: 
- Shopify Hydrogen 2025.4.1 (Remix-based framework)
- Three.js r180 (3D rendering, dynamically imported)
- GSAP 3.12.7 (animation timeline engine)
- Shopify Storefront API 2024-10 (checkout session creation)

**Storage**: 
- localStorage (admin settings persistence)
- Shopify metafields (optional: sync admin settings to Shopify)
- Session storage (checkout state during active session)

**Testing**: 
- Browser console utilities (`window.integrationTests.runFullIntegrationTest()`)
- Manual testing across viewports (1920x1080, 768x1024, 375x667)
- Shopify test checkout (sandbox environment)

**Target Platform**: 
- Modern browsers (Chrome 90+, Safari 14+, Firefox 88+)
- Desktop (1920x1080), Tablet (768x1024), Mobile (375x667 portrait/landscape)
- Shopify Oxygen serverless deployment

**Project Type**: Web application (Hydrogen/Remix SSR with client-side 3D)

**Performance Goals**: 
- Checkout panel opens within 2 seconds
- GSAP animations maintain 60fps
- Component bundle ≤ 100 KB (lazy loaded)
- Iframe failure detection + fallback within 3 seconds
- Carousel restoration ≤ 500ms after checkout

**Constraints**: 
- SSR-safe: No direct Three.js imports in `app/**`, must use `<ClientOnly>` wrapper
- Env security: Must use `~/utils/env.public` for `PUBLIC_CHECKOUT_DOMAIN`, never hard-code
- 3D invariants: Must respect Carousel3DPro mutation locks (`isTransitioning`, `selectItemLock`)
- Shopify iframe restrictions: Apple Pay/Shop Pay may not work in iframe (auto-fallback required)
- PCI compliance: Cannot access or store payment data (Shopify handles all)

**Scale/Scope**: 
- Single storefront (Watermelon Hydrogen production site)
- 4 user stories, 26 functional requirements
- Estimated 1000-1500 lines of new code across 8-10 new files
- Integration with 3 existing systems: Carousel3DPro, watermelonAdmin, cart-ui context

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Environment Variable Security ✅ COMPLIANT
- **Requirement**: Use `~/utils/env.public` for all `PUBLIC_*` variables
- **Plan**: Checkout integration will use `envPublic.PUBLIC_CHECKOUT_DOMAIN` and `envPublic.PUBLIC_STORE_DOMAIN`
- **Validation**: Must pass `npm run env:check` before implementation complete
- **Risk**: LOW - clear pattern established in existing codebase

### II. SSR Safety for 3D Content ✅ COMPLIANT
- **Requirement**: All browser-only code must be wrapped in `<ClientOnly>` or guarded with `typeof window !== 'undefined'`
- **Plan**: New checkout panel component will use `<ClientOnly>` wrapper, GSAP animations will check `typeof window`
- **Validation**: Build must succeed without SSR crashes; manual test in dev mode
- **Risk**: MEDIUM - iframe manipulation requires careful SSR handling

### III. No Hard-Coded Domains ✅ COMPLIANT
- **Requirement**: Never inline domains like `nuwudorder.com` or `nx40dr-bu.myshopify.com`
- **Plan**: All checkout URLs will be constructed from `envPublic` config
- **Validation**: Scan with `grep -r "nuwudorder\|nx40dr-bu\|o2\.myshopify" app/components/checkout-panel/`
- **Risk**: LOW - enforced by env:check script

### IV. 3D Carousel Invariants ⚠️ REQUIRES CAREFUL HANDLING
- **Requirement**: Respect `isTransitioning`, `forceLockedIndex`, `selectItemLock` flags; only mutate `currentIndex` at safe points
- **Plan**: Checkout animation will:
  1. Check `isTransitioning === false` before starting
  2. Set transition lock during animation
  3. Use GSAP `onComplete` callback to restore state
  4. Never directly mutate carousel indices during animation
- **Validation**: Test with rapid carousel interactions before/during checkout open
- **Risk**: HIGH - animation timing conflicts could break carousel rotation

### V. Golden Files Policy ⚠️ MINIMAL TOUCHES REQUIRED
- **Requirement**: Ask before editing golden files; propose diffs with rationale
- **Files potentially affected**:
  - `app/components/Carousel3DPro/main.js` - MAY need to add checkout trigger event listener
  - `app/components/context/cart-ui.jsx` - MAY need to add checkout mode state
- **Plan**: 
  - Avoid modifying `main.js` if possible; use external event system (`window.dispatchEvent`)
  - Extend `cart-ui.jsx` minimally with new state fields (`checkoutMode`, `checkoutOpen`)
- **Validation**: Propose BEFORE→AFTER diffs before implementation
- **Risk**: MEDIUM - cart-ui changes could affect existing cart drawer behavior

### Performance Targets ✅ COMPLIANT
- **Requirement**: 3D bundle increment ≤ 800 KB (ideal ≤ 500 KB)
- **Plan**: Lazy load checkout panel component; bundle size ≤ 100 KB
- **Validation**: Check Vite bundle analyzer after build
- **Risk**: LOW - checkout panel is mostly iframe wrapper (minimal code)

### Code Quality Standards ✅ COMPLIANT
- **Requirement**: ESLint pass, GSAP cleanup, Three.js disposal
- **Plan**: 
  - All components will have ESLint-compliant code
  - GSAP timelines will use `killTweensOf` in cleanup
  - Event listeners will be removed in `useEffect` cleanup
- **Validation**: `npm run lint && npm run build` must pass
- **Risk**: LOW - standard patterns

### Definition of Done ✅ COMPLIANT
**Checklist**:
- [ ] `npm run env:check` passes (no raw env usage)
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] No hard-coded domains in new code
- [ ] SSR-safe (no `window` access outside guards)
- [ ] GSAP animations cleaned up properly
- [ ] `window.integrationTests.runFullIntegrationTest()` passes
- [ ] Checkout works on desktop/tablet/mobile viewports
- [ ] Fallback to full-page checkout works

**GATE DECISION**: ✅ **PROCEED TO PHASE 0 RESEARCH**  
No constitutional violations detected. High-risk areas (carousel invariants, golden files) have mitigation plans.

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
app/
├── components/
│   ├── checkout-panel/                    # NEW: Checkout panel system
│   │   ├── CheckoutPanel.jsx             # Main checkout panel component
│   │   ├── CheckoutPanelWrapper.jsx      # SSR-safe ClientOnly wrapper
│   │   ├── CheckoutAnimations.js         # GSAP animation presets
│   │   ├── CheckoutFallback.jsx          # Error state + fallback UI
│   │   └── useCheckoutSession.js         # React hook for checkout state
│   │
│   ├── Carousel3DPro/                     # EXISTING: 3D carousel system
│   │   ├── main.js                        # MAY TOUCH: Add checkout event listener
│   │   ├── Carousel3DPro.js              # Reference: Understand rotation locks
│   │   └── Carousel3DSubmenu.js          # Reference: Understand animation patterns
│   │
│   ├── context/
│   │   └── cart-ui.jsx                    # MAY TOUCH: Add checkoutMode state
│   │
│   └── admin/                             # NEW: Admin panel extensions
│       └── CheckoutSettings.jsx           # Admin UI for checkout config
│
├── utils/
│   ├── env.public.ts                      # EXISTING: Used for PUBLIC_CHECKOUT_DOMAIN
│   └── checkoutHelpers.js                 # NEW: Checkout URL generation, iframe utils
│
├── routes/
│   └── ($locale)._index.jsx               # EXISTING: Homepage with carousel (integration point)
│
└── styles/
    └── checkout-panel.css                 # NEW: Panel styling (responsive breakpoints)

public/
└── assets/
    └── checkout/                          # NEW: Static assets
        └── loading-spinner.svg            # Loading indicator for iframe

specs/
└── 001-3d-immersive-checkout/
    ├── spec.md                            # Feature specification
    ├── plan.md                            # This file
    ├── research.md                        # Phase 0 output (NEXT)
    ├── data-model.md                      # Phase 1 output
    ├── quickstart.md                      # Phase 1 output
    └── contracts/                         # Phase 1 output (if API contracts needed)
```

**Structure Decision**: Watermelon Hydrogen uses **Hydrogen/Remix web application structure** (server-side rendering with client-side 3D). New checkout panel components will live in `app/components/checkout-panel/` to follow existing patterns. Admin settings extend `watermelonAdmin` (existing global window utility) rather than creating separate admin route. Integration points are minimal: event-based communication with cart-ui context and Carousel3DPro's animation system.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No constitutional violations detected.** All complexity is justified by business requirements:

| Complexity | Justification | Constitutional Compliance |
|------------|---------------|---------------------------|
| Three animation styles | User Story 2 (P2) - brand customization requirement | Within performance budget (≤ 100 KB bundle) |
| Three checkout modes | User Story 3 (P3) - conversion optimization requirement | No additional infrastructure needed |
| Iframe + fallback | Business-critical - checkout must never block | Follows error handling best practices |
| GSAP animation coordination | Required to respect existing Carousel3DPro invariants | Follows established patterns |
| SSR-safe patterns | Hydrogen/Remix architecture requirement | Follows constitutional Principle II |

**Risk Mitigation**:
- High-risk carousel integration → Minimal touches to golden files, event-based communication
- Iframe restrictions → Automatic fallback ensures checkout always accessible
- Animation complexity → Three presets reduce code duplication, lazy loaded
