# Data Model: Honeycomb Background Presets

## BackgroundPreset (Metaobject)
- **id**: string (Metaobject ID)
- **title**: string (display label)
- **slug**: string (unique handle for admin lookups)
- **html_markup**: string (sanitized HTML fragment injected into sandbox iframe)
- **css_styles**: string (sanitized CSS injected via `<style>`)
- **js_snippet**: string (raw JS executed inside iframe sandbox)
- **motion_profile**: enum (`full`, `subtle`, `static`) used to determine animation intensity
- **supports_reduced_motion**: boolean flag to indicate custom handling for reduced motion
- **thumbnail**: optional URL for admin preview card
- **createdBy**: string (Shopify staff email or `system`)
- **updatedBy**: string
- **createdAt / updatedAt**: ISO timestamps managed by Shopify
- **isActive**: boolean (mirrors active preset selection via admin UI)

**Validation Rules**:
- `slug` must be unique, lowercased, kebab-case (validated prior to mutation).
- `html_markup` length ≤ 50KB, `css_styles` ≤ 25KB, `js_snippet` ≤ 25KB.
- `motion_profile` defaults to `full`; if set to `static`, animation timeline remains paused even without reduced-motion preference.
- When `supports_reduced_motion` is false, renderer enforces full pause on preference change.

## BackgroundPresetActivation (Server Cache Record)
- **activePresetId**: string (references BackgroundPreset.id)
- **versionHash**: string (hash of markup/css/js for busting cache)
- **cacheExpiry**: Date (Hydrogen Cache TTL)
- **lastActivatedBy**: string (admin user slug)

**Validation Rules**:
- `versionHash` recomputed on every activation; mismatches trigger re-fetch from Shopify.
- `cacheExpiry` defaults to now + 30s; admin invalidate endpoint clears record immediately.

## AdminAuthToken (Ephemeral Session)
- **token**: string (HMAC signed value)
- **issuedAt**: Date
- **expiresAt**: Date (default 30 minutes)
- **issuedTo**: string (admin email or `background-admin`)

**Validation Rules**:
- Token signature verified using `BACKGROUND_ADMIN_KEY` + `SESSION_SECRET`.
- Expired tokens rejected; refresh issues new token and revokes old.
