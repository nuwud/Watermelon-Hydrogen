# 🌱 Spec-Kit Feature Specifications

This directory contains feature specifications managed by [GitHub Spec-Kit](https://github.com/github/spec-kit), implementing **Spec-Driven Development** for the Watermelon Hydrogen project.

## 📋 What is Spec-Driven Development?

Spec-Driven Development flips the traditional approach: **specifications become executable**, directly generating working implementations rather than just guiding them. Focus on the **WHAT** and **WHY**, then let AI agents handle the implementation.

## 🚀 Quick Start

### 1. Create a Constitution (First Time Only)

```bash
/speckit.constitution Create principles focused on Hydrogen/Remix architecture, 
Three.js SSR safety, env variable security, and 3D performance optimization.
```

### 2. Start a New Feature

```bash
/speckit.specify Build a feature that allows users to [describe user value]
```

### 3. Generate Technical Plan

```bash
/speckit.plan Tech stack: Shopify Hydrogen (Remix), Three.js r180, GSAP, Tailwind.
Constraints: SSR-safe, no raw env, no hard-coded domains. Follow Carousel3D invariants.
```

### 4. Break Down Into Tasks

```bash
/speckit.tasks
```

### 5. Implement

```bash
/speckit.implement
```

## 📂 Feature Directory Structure

Each feature lives in a numbered directory:

```
specs/
  001-feature-name/
    spec.md          — What to build (user stories, requirements, success criteria)
    plan.md          — How to build it (tech stack, architecture, file structure)
    tasks.md         — Actionable implementation steps with dependencies
    research.md      — Technical decisions (gitignored - private)
    quickstart.md    — Test scenarios (gitignored - private)
    data-model.md    — Database/data structures (if applicable)
    contracts/       — API specifications (if applicable)
```

## 🎯 Watermelon-Specific Guidelines

### Always Include in Plans:

* **Tech Stack**: Hydrogen/Remix, Three.js r180, GSAP, Tailwind
* **SSR Safety**: `<ClientOnly>`, `typeof window !== 'undefined'`, dynamic imports
* **Env Security**: Use `~/utils/env.server` (server-only) and `~/utils/env.public` (client-safe)
* **3D Constraints**: Follow Carousel3DPro invariants (see `.github/copilot-instructions.md` section 3)

### Validation Gates:

Every implementation must pass:
```bash
npm run env:check && npm run lint && npm run build
```

### Golden Files (Ask Before Editing):

* `app/entry.server.jsx`, `app/root.jsx`
* `app/utils/env.server.ts`, `app/utils/env.public.ts`
* `app/components/Carousel3DPro/**`
* `vite.config.js`, `hydrogen.config.*`

## 🔧 Optional Enhancement Commands

* `/speckit.clarify` — Ask clarifying questions before planning (reduces rework)
* `/speckit.analyze` — Validate cross-artifact consistency (after tasks, before implement)
* `/speckit.checklist` — Generate quality validation checklists

## 📖 Examples

### Good Specification Prompt:

```
/speckit.specify Build a 3D product comparison tool that lets users select 
2-3 products from the carousel and view them side-by-side in a split-screen 
view. Users can rotate models independently and see pricing/features in 
overlays. The comparison should persist until dismissed.
```

### Good Plan Prompt:

```
/speckit.plan Use Three.js for split-screen rendering with independent cameras.
Store comparison state in URL params for shareability. Follow SSR safety 
patterns from FloatingPreview.js. Reuse contentManager for product data.
Add comparison button to Product3DDisplay component.
```

## 🚫 Anti-Patterns (Avoid These)

❌ **Don't** include tech stack in `/speckit.specify` — focus on user value
❌ **Don't** hard-code domains or use raw `process.env` in implementations
❌ **Don't** modify golden files without explicit approval
❌ **Don't** skip validation gates (`env:check`, `lint`, `build`)
❌ **Don't** break 3D carousel invariants (GSAP locks, front-face logic)

## 📚 Documentation

* **Full Spec-Kit Guide**: [GitHub Spec-Kit README](https://github.com/github/spec-kit)
* **Project Instructions**: [.github/copilot-instructions.md](../.github/copilot-instructions.md)
* **3D System Docs**: [docs/3D_SYSTEMS_COMPREHENSIVE_DOCUMENTATION.md](../docs/3D_SYSTEMS_COMPREHENSIVE_DOCUMENTATION.md)
* **Complete Impl Guide**: [docs/WATERMELON_3D_COMPLETE_IMPLEMENTATION.md](../docs/WATERMELON_3D_COMPLETE_IMPLEMENTATION.md)

## 🎯 Success Checklist

Before marking a feature complete:

- [ ] All tasks from `tasks.md` completed
- [ ] `npm run env:check` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] No raw env usage (`process.env`, `import.meta.env`, `context.env`)
- [ ] No hard-coded domains (`nuwudorder.com`, `nx40dr-bu.myshopify.com`)
- [ ] Three.js code is SSR-safe (`<ClientOnly>` or guards)
- [ ] Browser console tests pass (`window.integrationTests.runFullIntegrationTest()`)
- [ ] Feature documented in project README or docs/

---

*Generated: 2025-10-13*
*Last Updated: 2025-12-08 - Added 005-3d-ux-enhancement-roadmap epic*

## 📋 Active Specifications

| Spec | Status | Description |
|------|--------|-------------|
| [001-3d-immersive-checkout](./001-3d-immersive-checkout/) | 📦 Archived | 3D checkout experience |
| [002-three-js-version](./002-three-js-version/) | ✅ Complete | Three.js upgrade |
| [003-title-redesign-primary](./003-title-redesign-primary/) | 📦 Archived | Title redesign |
| [004-let-s-fix](./004-let-s-fix/) | 📦 Archived | Bug fixes batch |
| [005-3d-ux-enhancement-roadmap](./005-3d-ux-enhancement-roadmap/) | 🚧 Active | **Major epic: 4 phases of 3D UX improvements** |

### 005 Phase Breakdown

| Phase | Status | Focus |
|-------|--------|-------|
| [Phase 1: Quick Fixes](./005-3d-ux-enhancement-roadmap/phase-1-quick-fixes.md) | 🔴 Ready | Hover, fog, glow, spotlight, dim |
| [Phase 2: Enhanced Polish](./005-3d-ux-enhancement-roadmap/phase-2-enhanced-polish.md) | ⬜ Planning | Sublines, HUD, atmosphere |
| [Phase 3: Menu Expansion](./005-3d-ux-enhancement-roadmap/phase-3-menu-expansion.md) | ⬜ Planning | Ring scatter, content displays |
| [Phase 4: Admin Editor](./005-3d-ux-enhancement-roadmap/phase-4-admin-editor.md) | ⬜ Planning | WYSIWYG 3D config editor |
