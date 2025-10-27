# Feature Specification: Let’s Fix the Skyball Background

**Feature Branch**: `004-let-s-fix`  
**Created**: 2025-10-26  
**Status**: Draft  
**Input**: Replace the existing Shopify green background color of the "skyball" surrounding the 3D carousel with a honeycomb-inspired experience that stays calm near the menu, animates further out, and can be managed through an admin interface that accepts HTML/CSS/JS snippets.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure a Background Preset (Priority: P1)

As a Watermelon Hydrogen admin, I want to save a new background preset with HTML/CSS/JS so the 3D menu can use bespoke experiences without code deploys.

**Why this priority**: Without configurable presets, the creative team is blocked from iterating on the background; this is the minimum viable value.

**Independent Test**: From the admin screen, create a preset, set it as active, and verify it renders for storefront visitors without touching the codebase.

**Acceptance Scenarios**:

1. **Given** an authenticated admin in the background settings panel, **When** they paste valid honeycomb HTML/CSS/JS and save, **Then** the preset persists and becomes selectable.
2. **Given** an existing preset, **When** the admin marks it active, **Then** storefront visitors see that preset after the next page reload within 5 seconds of cache bust.

---

### User Story 2 - Respect Shopper Comfort (Priority: P2)

As a shopper who prefers reduced motion, I want the background to stay still so I can browse without discomfort.

**Why this priority**: Accessibility compliance and user comfort are critical but follow the core admin capability.

**Independent Test**: Emulate `prefers-reduced-motion: reduce`, load the storefront, and confirm animation is suppressed while the rest of the page works normally.

**Acceptance Scenarios**:

1. **Given** a storefront visitor with `prefers-reduced-motion: reduce`, **When** the page loads, **Then** the background near and far remains static while maintaining visual integrity.

---

### User Story 3 - Preserve Menu Focus (Priority: P3)

As a shopper, I want background effects to stay subtle near the carousel so I can focus on navigation while still enjoying ambient motion elsewhere.

**Why this priority**: Ensures the new design meets the UX requirement that the immediate menu zone remains calm.

**Independent Test**: With the honeycomb preset active, inspect the zone within the carousel radius and confirm motion stays below agreed thresholds while outer regions animate.

**Acceptance Scenarios**:

1. **Given** the default active preset, **When** the storefront loads, **Then** the background within the carousel hitbox shows only static or micro-motion while the outer gradient animates in a loop exceeding 15 seconds.

---

### Edge Cases

- Admin saves malformed HTML/CSS/JS in a preset; system must validate or sandbox without breaking the storefront.
- No preset is marked active; storefront should fall back to a safe default background with minimal motion.
- Preset assets fail to load (e.g., blocked external script); background should degrade gracefully and log an admin-visible warning.
- Shopper toggles motion preferences mid-session; background should respond on the next animation frame without reload.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an authenticated admin route to create, edit, preview, and delete background presets composed of HTML, CSS, and optional JS snippets.
- **FR-002**: System MUST allow selecting one preset as the active storefront background and persist that selection server-side.
- **FR-003**: System MUST render the active preset SSR-safe, ensuring the immediate carousel zone remains static while allowing controlled animation outside that zone.
- **FR-004**: System MUST honor visitor motion preferences (`prefers-reduced-motion`) by disabling or reducing background animation without admin intervention.
- **FR-005**: System MUST sanitize or sandbox injected JS/CSS to prevent security risks and prevent hard-coded domains or raw env usage.
- **FR-006**: System MUST provide telemetry or admin-visible status indicating when preset rendering fails and which fallback is in use.

### Key Entities *(include if feature involves data)*

- **BackgroundPreset**: Represents a saved configuration with fields for name, HTML markup, CSS styles, optional JS payload, metadata (createdBy, updatedAt), and flags for `isActive` and `supportsReducedMotion`.
- **BackgroundRenderState**: Derived runtime data exposing the active preset, applied animation mode (normal or reduced), and any fallback reason for client rendering.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Creative team can publish a new background preset to production without code changes within 5 minutes end-to-end.
- **SC-002**: Storefront Lighthouse "Avoid Large Layout Shifts" and "Reduced Motion" audits pass with >= 90 scores after the new background deploys.
- **SC-003**: Less than 1% of page loads log preset rendering failures over a 7-day observation period.
- **SC-004**: Shopper surveys confirm ≥85% satisfaction with menu focus when the new background is active.
