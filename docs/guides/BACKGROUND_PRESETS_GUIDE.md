# Background Preset Management Guide

> Updated: 2025-10-26

## Overview

Watermelon Hydrogen now supports configurable storefront background presets. Admins can author HTML/CSS/JS experiences, tune motion parameters, and activate presets without redeploying the app. Presets are stored as Shopify Admin metaobjects (`background_preset`) and consumed at runtime via `/api/backgrounds/active`.

### Key Capabilities

- CRUD endpoints for background presets protected by a bearer token issued via `BACKGROUND_ADMIN_KEY`.
- Live admin panel (`WatermelonAdminPanel`) surfacing the **Background Preset Manager** UI.
- Sandboxed iframe renderer with telemetry, reduced motion handling, and cache busting.
- Honeycomb ambient field rendered with Three.js instancing that respects the calm radius settings from presets.

## API Endpoints

| Route | Method | Description |
| --- | --- | --- |
| `/api/backgrounds/token` | `POST` | Exchange `BACKGROUND_ADMIN_KEY` for a signed bearer token (30 min TTL). |
| `/api/backgrounds` | `GET` | List all background presets. Requires `Authorization: Bearer <token>`. |
| `/api/backgrounds` | `POST` | Create a preset. Body must include markup, styles, motion profile, calm radius/intensity, etc. |
| `/api/backgrounds/:id` | `PATCH` | Update preset fields by handle/id. |
| `/api/backgrounds/:id` | `DELETE` | Remove preset and clear caches. |
| `/api/backgrounds/:id/activate` | `POST` | Mark preset as active and bust CDN/cache. |
| `/api/backgrounds/active` | `GET` | Public JSON payload describing the active preset used by the storefront. |
| `/api/backgrounds/telemetry` | `POST` | Telemetry events emitted by the renderer (load/error states). |

All admin routes require the bearer token. Public routes (`/active`, `/telemetry`) do not expose secrets and respect cache-control headers.

## Admin Panel Workflow

1. **Open the Admin Panel** (`Ctrl+Shift+A` or click the 🍉 Admin button). The panel is available in development, on `localhost`, or when `?admin=true` is present.
2. **Request a Token** using the shared `BACKGROUND_ADMIN_KEY`. The token is stored in `localStorage` (`wm-backgrounds-token`) and reused until expiry.
3. **Manage Presets**:
   - Use the list view to select existing presets. Active presets are highlighted.
   - The editor supports title, slug, thumbnail, markup, styles, JS snippet, motion profile, reduced-motion flag, calm radius, and intensity.
   - The “Mark Active on Save” toggle flips the `isActive` field during create/update.
4. **Preview Changes**: The preview panel mounts the same sandbox renderer the storefront uses. Any HTML/CSS/JS authored in the form is rendered immediately without persisting.
5. **Activate Preset**: Use the *Activate Preset* button to flip the active flag and invalidate the cache so storefront visitors see the new preset on refresh.
6. **Monitor Status**: The status card displays the currently active preset, version hash, updated timestamp, and whether reduced motion mode is in effect. Use *Refresh Active Preset* to force the hook to re-fetch `/api/backgrounds/active`.

## Reduced Motion & Accessibility

- The `supportsReducedMotion` flag communicates whether a preset supplies its own reduced-motion handling.
- If the visitor has `prefers-reduced-motion: reduce` **or** the preset is marked as not supporting reduced motion, the renderer forces a static mode:
  - `backgroundRenderer.client.ts` sets `data-motion="reduced"`, disables iframe animations, and skips executing custom JS.
  - `BackgroundStage` exposes a badge so the admin can confirm reduced mode is active.
  - `HoneycombField` is paused (`calmIntensity` is treated as `0`).
- `useBackgroundPreset` now exposes `isReducedMotion`, allowing any consumer to react to preference changes in real time.

## Calm Radius & Honeycomb Field

- Presets include `calmRadius` (px) and `calmIntensity` (`0-1`). Values are clamped to `120 ≤ radius ≤ 960` and `0 ≤ intensity ≤ 1`.
- `HoneycombField` (Three.js instanced mesh) uses these fields to keep the carousel’s immediate area calm while animating the distant lattice.
- When reduced motion is active, the instancing animation pauses and the ambient opacity drops for a still backdrop.

## Telemetry & Debugging

- All renderer load/error events post to `/api/backgrounds/telemetry` with preset ID, version hash, and user agent.
- `BackgroundStage` overlay surfaces live states: loading, errors, fallback, and reduced-motion mode.
- `window.integrationTests.backgrounds.runHoneycombTest()` fetches the active preset, validates DOM layers, and logs reduced-motion status.

## Validation Checklist

- [ ] `npm run env:check` passes (requires `BACKGROUND_ADMIN_KEY`, `PRIVATE_SHOPIFY_ADMIN_TOKEN`, etc.).
- [ ] `npm run lint && npm run build` succeed.
- [ ] `/api/backgrounds/active` returns active preset JSON within 30 seconds of activation.
- [ ] Reduced-motion preference triggers static mode (verify with DevTools > Rendering).
- [ ] Admin panel preview matches storefront rendering for a preset sample.

Refer to this guide whenever adding presets, onboarding admins, or troubleshooting background rendering.
