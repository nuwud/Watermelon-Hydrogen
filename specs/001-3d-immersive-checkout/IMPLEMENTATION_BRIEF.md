# Implementation Brief: 3D Immersive Checkout Experience

**For**: GitHub Copilot Coding Agent  
**Branch**: `001-3d-immersive-checkout`  
**Feature**: Integrate Shopify checkout into 3D carousel with responsive center panel  
**Status**: Ready for implementation - All specs complete ✅

---

## 🎯 Mission

Implement a complete 3D immersive checkout system for Watermelon Hydrogen that displays Shopify checkout in a responsive center panel within the 3D carousel ring. The system must support three animation styles (dramatic, subtle, elegant), three checkout modes (center-panel, full-page, overlay-modal), and maintain strict compliance with the project's constitutional principles.

---

## 📋 Complete Specification Package

All design documents are complete and validated in `specs/001-3d-immersive-checkout/`:

✅ **spec.md** (528 lines)
- 4 user stories prioritized P1→P3
- 26 functional requirements
- 20 measurable success criteria
- 9 edge cases documented

✅ **plan.md** (239 lines)
- Technical context (Hydrogen, Three.js r180, GSAP, Shopify API)
- Constitution compliance check (ALL GATES PASSED)
- Project structure with integration points

✅ **research.md** (465 lines)
- 8 major technical decisions with implementation patterns
- Code examples for all critical integrations
- Alternatives considered + rationale

✅ **data-model.md** (322 lines)
- 3 core entities (CheckoutSession, CheckoutConfig, CarouselCheckoutState)
- React Context schema
- localStorage persistence patterns
- Shopify GraphQL queries

✅ **quickstart.md** (461 lines)
- 6 quick test scenarios with step-by-step validation
- Integration test scenario
- Debug commands
- Validation checklist

✅ **tasks.md** (740 lines) ⭐ PRIMARY GUIDE
- **74 actionable tasks** organized by phase and user story
- Clear file paths for every task
- Dependency ordering
- Parallel execution markers [P]
- Checkpoints after each user story

---

## 🏗️ Implementation Plan

### Phase Structure (Follow tasks.md exactly)

**Phase 1: Setup** (T001-T006) - 6 tasks
- Create directory structure
- Verify validation gates

**Phase 2: Foundational** (T007-T011) - 5 tasks ⚠️ BLOCKS ALL USER STORIES
- CheckoutUIContext creation
- Checkout helpers (Shopify API integration)
- SSR-safe ClientOnly wrapper
- Environment variable setup

**Phase 3: User Story 1 - Basic Center Panel Checkout (P1 MVP)** (T012-T027) - 16 tasks
- Core components (CheckoutPanel, Wrapper, Fallback)
- Dramatic animation with GSAP
- State management hook
- Responsive CSS
- Minimal carousel integration (GOLDEN FILE)
- Cart button integration (GOLDEN FILE)
- Error handling with fallback

**Phase 4: User Story 2 - Animation Styles (P2)** (T028-T038) - 11 tasks
- Subtle & elegant animations
- Admin panel extension (watermelonAdmin.checkoutSettings)
- Animation preview functionality
- localStorage persistence

**Phase 5: User Story 4 - Responsive Sizing (P2)** (T039-T046) - 8 tasks
- Viewport detection hook
- Dynamic panel sizing
- Orientation change handling
- Mobile carousel adjustments

**Phase 6: User Story 3 - Mode Configuration (P3)** (T047-T056) - 10 tasks
- Full-page redirect mode
- Overlay modal component
- Admin mode selector
- Mode preview

**Phase 7: Polish & Validation** (T057-T074) - 18 tasks
- Performance optimization
- Accessibility (ARIA, keyboard nav)
- Error logging
- Documentation updates
- Full validation checklist

---

## 🚨 CRITICAL CONSTRAINTS (Must Follow)

### Constitutional Principles (NON-NEGOTIABLE)

**I. Environment Variable Security**
- ✅ MUST use `~/utils/env.public` for `PUBLIC_CHECKOUT_DOMAIN`
- ❌ NEVER use `process.env`, `import.meta.env`, or `context.env` in `app/**`
- ✅ Must pass `npm run env:check` before completion

**II. SSR Safety for 3D Content**
- ✅ MUST wrap all browser-only code in `<ClientOnly>` wrapper
- ✅ MUST use `typeof window !== 'undefined'` guards
- ✅ MUST use dynamic imports for heavy modules
- ✅ Must pass `npm run build` (SSR must not crash)

**III. No Hard-Coded Domains**
- ❌ NEVER inline `nuwudorder.com`, `nx40dr-bu.myshopify.com`, or `o2.myshopify.dev`
- ✅ MUST read from `envPublic` for all domain references

**IV. 3D Carousel Invariants (HIGH-RISK)**
- ⚠️ **CRITICAL**: Respect `isTransitioning` flag before animations
- ⚠️ **CRITICAL**: Set transition locks during checkout animations
- ⚠️ **CRITICAL**: Never modify `currentIndex` during animation
- ⚠️ **CRITICAL**: Use GSAP `onComplete` callbacks for state changes
- ⚠️ **CRITICAL**: Preserve carousel item positions for restoration

**V. Golden Files Policy (ASK-BEFORE-EDIT)**
- 🔒 `app/components/Carousel3DPro/main.js` - Minimal touch (only expose pause/resume controls)
- 🔒 `app/components/context/cart-ui.jsx` - Minimal touch (only add checkout state fields)
- ✅ Propose BEFORE→AFTER diffs before applying changes

### Validation Gates (Run After Each Phase)

```bash
# Must pass before implementation is complete
npm run env:check && npm run lint && npm run build
```

### Scan for Violations (Before Final PR)

```bash
# No raw env usage
grep -r "process\.env\|import\.meta\.env\|context\.env" app/components/checkout-panel/

# No hard-coded domains
grep -r "nuwudorder\|nx40dr-bu\|o2\.myshopify" app/components/checkout-panel/
```

---

## 🎯 MVP vs Full Feature

### MVP Scope (Recommended First PR)
**Phases 1-3**: Setup + Foundational + User Story 1
- **27 tasks** (T001-T027)
- Estimated: 3-5 days
- Deliverable: Basic center panel checkout with dramatic animation
- Test: `quickstart.md` Quick Test #1 + Quick Test #4

**MVP Value**: Core "wow factor" feature - checkout in 3D carousel center panel

### Full Feature Scope (All 74 Tasks)
**Phases 1-7**: All user stories + polish
- **74 tasks** (T001-T074)
- Estimated: 8-12 days
- Deliverable: Complete checkout system with all customization options
- Test: All 6 quick tests + integration test scenario

---

## 📝 Implementation Guidelines

### File Creation Patterns

**Components** (`app/components/checkout-panel/`):
- `CheckoutPanel.jsx` - Main iframe component
- `CheckoutPanelWrapper.jsx` - SSR-safe `<ClientOnly>` wrapper
- `CheckoutFallback.jsx` - Error state + redirect UI
- `CheckoutAnimations.js` - GSAP animation presets
- `useCheckoutSession.js` - React hook for state management

**Context** (`app/components/context/`):
- `checkout-ui.jsx` - New CheckoutUIContext (complete React Context)

**Utils** (`app/utils/`):
- `checkoutHelpers.js` - Shopify API calls, URL validation, config factory

**Styles** (`app/styles/`):
- `checkout-panel.css` - Responsive panel styling with breakpoints

**Admin** (`app/components/admin/`):
- `CheckoutSettings.jsx` - Admin UI for checkout configuration

### Code Patterns to Follow

**SSR-Safe Component Pattern**:
```javascript
// CheckoutPanelWrapper.jsx
import {ClientOnly} from '~/components/ClientOnly';

export function CheckoutPanelWrapper({checkoutUrl, onComplete}) {
  return (
    <ClientOnly fallback={<CheckoutPanelSkeleton />}>
      {() => <CheckoutPanel checkoutUrl={checkoutUrl} onComplete={onComplete} />}
    </ClientOnly>
  );
}
```

**Environment Variable Access**:
```javascript
// Good ✅
import {envPublic} from '~/utils/env.public';
const checkoutDomain = envPublic.PUBLIC_CHECKOUT_DOMAIN;

// Bad ❌
const checkoutDomain = process.env.PUBLIC_CHECKOUT_DOMAIN;
```

**GSAP Animation Pattern**:
```javascript
// CheckoutAnimations.js
export function dramaticAnimation(carouselItems, onComplete) {
  const timeline = gsap.timeline({
    onComplete: () => {
      carouselRef.current.isTransitioning = false; // Release lock
      onComplete();
    }
  });
  
  timeline.to(carouselItems, {
    z: '-=500',
    scale: 0.6,
    opacity: 0.3,
    duration: 1,
    ease: 'power2.out'
  });
  
  return timeline;
}
```

**Shopify Checkout Creation**:
```javascript
// checkoutHelpers.js
export async function createCheckoutSession(cartId, storefront) {
  const {checkout} = await storefront.mutate(CHECKOUT_CREATE_MUTATION, {
    variables: {
      input: {
        lineItems: cart.lines.map(line => ({
          variantId: line.variant.id,
          quantity: line.quantity
        }))
      }
    }
  });
  
  return {
    id: checkout.id,
    webUrl: checkout.webUrl
  };
}
```

### Golden File Modifications (Minimal Touch)

**`app/components/Carousel3DPro/main.js`**:
```javascript
// Add ONLY these exports (near end of file)
function pauseRendering() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  console.log('3D rendering paused for checkout');
}

function resumeRendering() {
  if (!animationFrameId) {
    animate();
  }
  console.log('3D rendering resumed after checkout');
}

// Expose to checkout system
if (typeof window !== 'undefined') {
  window.carouselControls = { pauseRendering, resumeRendering };
}
```

**`app/components/context/cart-ui.jsx`**:
```javascript
// Add ONLY these fields to context state (existing structure)
const [checkoutMode, setCheckoutMode] = useState('center-panel');
const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
```

---

## ✅ Testing & Validation Strategy

### After Each Phase

1. **Run validation gates**:
   ```bash
   npm run env:check && npm run lint && npm run build
   ```

2. **Check for violations**:
   ```bash
   grep -r "process\.env" app/components/checkout-panel/
   grep -r "nuwudorder" app/components/checkout-panel/
   ```

3. **Verify SSR safety**:
   - Build must succeed without crashes
   - No `window` or `document` access outside guards

### User Story Checkpoints

**After US1 (Phase 3)**:
- Run `quickstart.md` Quick Test #1 (basic checkout flow)
- Run `quickstart.md` Quick Test #4 (iframe fallback)
- Verify: Checkout opens, processes payment, carousel restores

**After US2 (Phase 4)**:
- Run `quickstart.md` Quick Test #2 (animation styles)
- Verify: All three animations work, settings persist

**After US4 (Phase 5)**:
- Run `quickstart.md` Quick Test #3 (responsive sizing)
- Verify: Panel sizes correctly on desktop/tablet/mobile

**After US3 (Phase 6)**:
- Run `quickstart.md` Quick Test #5 (checkout modes)
- Verify: All three modes work, no errors

**After Polish (Phase 7)**:
- Run `quickstart.md` Integration Test Scenario (full end-to-end)
- Run: `window.integrationTests.runFullIntegrationTest()`
- Complete validation checklist (all items checked)

### Browser Console Tests

```javascript
// Verify checkout system
window.watermelonAdmin.checkoutSettings.getConfig();
window.watermelonAdmin.checkoutSettings.logState();

// Test animations
window.watermelonAdmin.checkoutSettings.preview('center-panel', 'dramatic');
window.watermelonAdmin.checkoutSettings.preview('center-panel', 'elegant');

// Verify carousel controls
window.carouselControls.pauseRendering();
window.carouselControls.resumeRendering();
```

---

## 📊 Progress Tracking

### Mark Tasks Complete in tasks.md

After completing each task, update `specs/001-3d-immersive-checkout/tasks.md`:

```markdown
- [X] T001 Verify all validation gates pass
- [X] T002 [P] Create checkout component directory
```

### Commit Strategy

**Suggested commit pattern**:
```
feat(checkout): Complete Phase 1 - Setup (T001-T006)
feat(checkout): Complete Phase 2 - Foundational (T007-T011)
feat(checkout): Complete US1 - Basic center panel checkout (T012-T027)
feat(checkout): Complete US2 - Animation styles (T028-T038)
feat(checkout): Complete US4 - Responsive sizing (T039-T046)
feat(checkout): Complete US3 - Mode configuration (T047-T056)
feat(checkout): Complete Phase 7 - Polish & validation (T057-T074)
```

### Branch Strategy

- **Current branch**: `001-3d-immersive-checkout` (already created)
- **Base branch**: `main`
- **PR target**: `main`
- **PR title**: `feat: 3D Immersive Checkout Experience`

---

## 🚀 Recommended Execution

### Approach A: MVP First (Fastest to Value)
1. Implement Phases 1-3 (T001-T027) → 27 tasks
2. Create PR: "feat: 3D Immersive Checkout MVP (center panel + dramatic animation)"
3. Get review & feedback
4. Follow-up PR for remaining features

### Approach B: Full Feature (Comprehensive)
1. Implement all Phases 1-7 (T001-T074) → 74 tasks
2. Create single PR: "feat: 3D Immersive Checkout Experience (complete)"
3. Comprehensive review before merge

**Recommendation**: **Approach A (MVP First)** for faster iteration and feedback

---

## 📚 Reference Documentation

**Essential Reading**:
- `specs/001-3d-immersive-checkout/tasks.md` - Task list (PRIMARY GUIDE)
- `specs/001-3d-immersive-checkout/research.md` - Technical decisions
- `specs/001-3d-immersive-checkout/data-model.md` - Entity schemas
- `specs/001-3d-immersive-checkout/quickstart.md` - Test scenarios

**Project Context**:
- `.github/copilot-instructions.md` - Project guardrails (Sections 0-5)
- `.specify/memory/constitution.md` - Governing principles
- `docs/WATERMELON_3D_COMPLETE_IMPLEMENTATION.md` - 3D architecture

**Shopify/Hydrogen Resources**:
- [Shopify Storefront API - Checkout](https://shopify.dev/docs/api/storefront/latest/mutations/checkoutCreate)
- [Hydrogen Cart Integration](https://shopify.dev/docs/custom-storefronts/hydrogen/cart)
- [Hydrogen SSR Patterns](https://shopify.dev/docs/custom-storefronts/hydrogen/framework/react-server-components)

---

## ⚠️ Common Pitfalls to Avoid

1. **Don't modify carousel rotation logic** - Only add pause/resume controls
2. **Don't hard-code domains** - Always use `envPublic`
3. **Don't skip ClientOnly wrappers** - SSR will crash
4. **Don't modify `currentIndex` during animations** - Breaks carousel invariants
5. **Don't skip validation gates** - Run after each phase
6. **Don't forget GSAP cleanup** - Memory leaks without proper disposal
7. **Don't skip error fallback** - Checkout must never block users
8. **Don't test only on desktop** - Responsive design is P2 priority

---

## 🎬 Final Deliverables

### Pull Request Must Include

✅ All 74 tasks completed (or 27 for MVP)
✅ All validation gates passing (`env:check && lint && build`)
✅ No violations found in scans (raw env, hard-coded domains)
✅ At least MVP test scenarios passing (Quick Test #1, #4)
✅ tasks.md updated with all tasks marked [X]
✅ No console errors during normal checkout flow
✅ Golden file modifications minimal and justified
✅ Documentation updated (README.md mention)

### PR Description Template

```markdown
## Feature: 3D Immersive Checkout Experience

Implements Shopify checkout integration within the 3D carousel environment.

### User Stories Implemented
- [X] US1 (P1): Basic center panel checkout with dramatic animation
- [ ] US2 (P2): Multiple animation styles (dramatic, subtle, elegant)
- [ ] US4 (P2): Responsive panel sizing (desktop/tablet/mobile)
- [ ] US3 (P3): Admin mode configuration (center/full-page/overlay)

### Testing Completed
- [X] Quick Test #1: Basic checkout flow
- [X] Quick Test #4: Iframe fallback
- [ ] Quick Test #2: Animation styles
- [ ] Quick Test #3: Responsive sizing
- [ ] Quick Test #5: Checkout modes
- [ ] Integration Test Scenario

### Validation Gates
- [X] `npm run env:check` - PASS
- [X] `npm run lint` - PASS
- [X] `npm run build` - PASS
- [X] No raw env usage in checkout code
- [X] No hard-coded domains in checkout code

### Golden File Modifications
- `app/components/Carousel3DPro/main.js`: Added pause/resume controls only
- `app/components/context/cart-ui.jsx`: Added checkoutMode and isCheckoutOpen state

### Demo
[Add video/screenshots of checkout in action]

### Breaking Changes
None - all changes additive

### Follow-up Tasks
[If MVP PR, list remaining user stories for follow-up]
```

---

## 🤝 Support & Questions

If you encounter issues during implementation:

1. **Review research.md** - Contains implementation patterns for all major decisions
2. **Check quickstart.md** - Debugging commands for common issues
3. **Consult constitution.md** - When unsure about compliance
4. **Check existing patterns** - Look at similar components in `app/components/`

**Critical Questions to Ask Before Golden File Edits**:
- Is this modification absolutely necessary?
- Can I achieve this with events instead?
- What's the minimum code change required?
- Have I documented BEFORE→AFTER?

---

**Status**: Ready for implementation ✅  
**Branch**: `001-3d-immersive-checkout` (pushed to origin)  
**Next Step**: Begin Phase 1 (Setup) - Task T001

Good luck! 🍉 This is a well-specified feature with clear constraints. Follow the tasks.md sequentially, validate after each phase, and you'll have a working immersive checkout system.
