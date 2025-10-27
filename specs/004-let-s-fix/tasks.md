import {getSchema} from '@shopify/hydrogen-codegen';

/**
 * GraphQL Config
 * @see https://the-guild.dev/graphql/config/docs/user/usage
 * @type {IGraphQLConfig}
 */
export default {
  projects: {
    default: {
      schema: getSchema('storefront'),
      documents: [
        './*.{ts,tsx,js,jsx}',
        './app/**/*.{ts,tsx,js,jsx}',
        '!./app/graphql/**/*.{ts,tsx,js,jsx}',
      ],
    },

    customer: {
      schema: getSchema('customer-account'),
      documents: [
        './app/graphql/customer-account/**/*.{ts,tsx,js,jsx,graphql,gql}',
      ],
    },

    admin: {
      schema: getSchema('admin'),
      documents: ['./app/graphql/**/*.admin.graphql'],
    },

    // Add your own GraphQL projects here for CMS, Shopify Admin API, etc.
  },
};

/** @typedef {import('graphql-config').IGraphQLConfig} IGraphQLConfig */
---

## Phase 3: User Story 1 – Configure a Background Preset (Priority: P1) 🎯 MVP

**Goal**: Admins can create/edit/activate HTML/CSS/JS background presets and see the active preset render for storefront visitors without code deploys.

**Independent Test**: From the admin panel, authenticate, create a honeycomb preset, activate it, reload the storefront, and confirm the new background appears within 5 seconds.

### Implementation Tasks

- [x] T009 [US1] Create public route `app/routes/api.backgrounds.active.ts` returning sanitized active preset JSON with graceful fallback when no preset exists.
- [x] T010 [US1] Create admin auth route `app/routes/api.backgrounds.token.ts` that verifies `BACKGROUND_ADMIN_KEY` and returns a signed bearer token plus expiry.
- [x] T011 [US1] Implement `app/routes/api.backgrounds._index.ts` to list presets (GET) and create presets (POST) using token auth and `backgroundPresets.server.ts`.
- [x] T012 [US1] Implement `app/routes/api.backgrounds.$id.ts` to update (PATCH) and delete (DELETE) presets with token auth and cache busting.
- [x] T013 [US1] Implement `app/routes/api.backgrounds.$id.activate.ts` to activate a preset (POST) and bust the Hydrogen cache.
- [x] T014 [US1] Build `app/components/admin/BackgroundPresetManager.jsx` with preset list, editor form (HTML/CSS/JS, motion profile, reduced-motion flag, thumbnail), live render status indicator, preview iframe, and API wiring.
- [x] T015 [US1] Update `app/components/admin/WatermelonAdminPanel.jsx` to surface the Background Preset Manager, persist bearer tokens, and display the latest background status/fallback summary.
- [x] T016 [US1] Implement `app/components/backgrounds/useBackgroundPreset.ts` hook to fetch `/api/backgrounds/active`, memoize by `versionHash`, react to telemetry updates, and expose loading/error/fallback states.
- [x] T017 [US1] Implement `app/components/backgrounds/BackgroundStage.jsx` that guards SSR, uses `backgroundRenderer.client.ts` to render sandboxed `<iframe srcdoc>`, positions it behind the carousel, and emits telemetry events on load/failure.
- [x] T018 [US1] Update `app/components/Carousel3DMenu.jsx` to mount `<BackgroundStage />` inside `#carousel-container` with proper z-index layering and fallback background color removal.
- [x] T019 [P] [US1] Add `app/styles/backgrounds.css` for shared backdrop tokens (calm radius variables, z-index scales, reduced-motion fallbacks) and import it within `BackgroundStage.jsx`.

**Checkpoint**: Admins can manage presets end-to-end, and visitors see the activated preset.

---

## Phase 4: User Story 2 – Respect Shopper Comfort (Priority: P2)

**Goal**: Background animations pause automatically when shoppers prefer reduced motion, without disrupting the carousel.

**Independent Test**: Simulate `prefers-reduced-motion: reduce`, reload the storefront, and confirm the background remains static while the carousel continues functioning.

### Implementation Tasks

- [x] T020 [US2] Extend `useBackgroundPreset.ts` to subscribe to `matchMedia('(prefers-reduced-motion: reduce)')` changes and expose an `isReducedMotion` flag.
- [x] T021 [US2] Update `BackgroundStage.jsx` to pause outer animations and freeze sandboxed JS whenever `isReducedMotion` is true or the preset’s `supportsReducedMotion` is false.
- [x] T022 [US2] Enhance `BackgroundPresetManager.jsx` with controls to set `supportsReducedMotion`, choose a `motion_profile`, and preview reduced-motion behavior.

**Checkpoint**: Reduced-motion shoppers always receive a static background without admin intervention.

---

## Phase 5: User Story 3 – Preserve Menu Focus (Priority: P3)

**Goal**: The background stays calm within the carousel’s immediate radius while delivering animated honeycomb motion farther away.

**Independent Test**: With the honeycomb preset active, verify the area inside the carousel hitbox remains static while the outer field animates on a loop longer than 15 seconds.

### Implementation Tasks

- [x] T023 [US3] Implement `app/components/backgrounds/HoneycombField.js` using Three.js instancing for the animated honeycomb lattice with configurable calm radius and animation intensity.
- [x] T024 [US3] Integrate `HoneycombField` into `BackgroundStage.jsx`, combining a static inner gradient plane with the animated far field and aligning calm radius to the carousel configuration.
- [x] T025 [US3] Update `BackgroundPresetManager.jsx` to expose calm-zone tuning (radius slider, intensity presets) and preview the resulting layers.

**Checkpoint**: Animated background preserves menu focus while delivering ambient motion elsewhere.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize documentation, diagnostics, and validation across stories.

- [x] T026 [P] Document the background preset workflow and admin requirements in `docs/BACKGROUND_PRESETS_GUIDE.md` and reference it from `DOCUMENTATION_HUB.md`.
- [x] T027 [Polish] Extend `app/utils/watermelonIntegrationTests.js` with a background preset smoke test (`integrationTests.backgrounds.runHoneycombTest`) covering activation, reduced motion, calm radius expectations, and telemetry assertions.
- [ ] T028 [Polish] Run a Lighthouse audit focused on "Avoid Large Layout Shifts" and "Reduced Motion" (desktop + mobile), record scores ≥ 90 in `dev-workspace/PROGRESS_REPORT.md`, and note remediation if below target.
- [ ] T029 [Polish] Review background telemetry logs for the last preset activation to confirm <1% failure rate; capture summary in `dev-workspace/PROGRESS_REPORT.md` with follow-up actions if exceeded.
- [ ] T030 [Polish] Run `npm run env:check && npm run lint && npm run build`, capture results in `dev-workspace/PROGRESS_REPORT.md`, and note any follow-up issues.

---

## Dependencies & Execution Order

1. **Phase 1 → Phase 2**: Complete setup before foundational work.
2. **Phase 2 (Foundational)** blocks all user stories; do not begin Phases 3–5 until T003–T008 are complete.
3. **User Stories** proceed in priority order (US1 → US2 → US3). Each story is independently deliverable once its phase completes.
4. **Phase 6** depends on all targeted user stories being implementation-complete and telemetry instrumentation (T006, T017) in place.

---

## Parallel Execution Examples

### User Story 1
- Parallel tasks: `T011` (API list/create), `T012` (update/delete), and `T013` (activate) operate on separate Remix route files after T009–T010 are done.
- UI tasks `T014` and `T019` can progress while API routes are finalized, provided the contract is stable.

### User Story 2
- Run `T020` (hook updates) and `T022` (admin UI controls) in parallel once `T021`’s motion contract is defined.

### User Story 3
- Develop `HoneycombField` in `T023` while UI enhancements in `T025` are drafted, then integrate both via `T024`.

---

## Implementation Strategy

1. **MVP (US1)**: Deliver full admin CRUD + activation flow, runtime rendering, and fallback behavior. Ship after Phase 3 to unblock the creative team.
2. **Accessibility (US2)**: Layer on reduced-motion handling to honor shopper comfort without regressing US1.
3. **Experience Polish (US3)**: Implement honeycomb lattice and calm-zone tuning for the final visual experience.
4. **Polish**: Document, expand integration tests, and confirm validation gates are green.

Each phase ends with a checkpoint so work can pause, validate independently, and deploy if desired.
