### Summary
Explain what changed and why. Link issue(s) or chat context.


### Scan → Plan → Patch (brief)
- **Scan:** What did you grep? (env misuse, hard‑coded domains, SSR hazards)
- **Plan:** Minimal diffs? Risks?
- **Patch:** Key files changed and why.


### Checklists
- [ ] `npm run env:check` passes (no secrets printed)
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] No raw env usage in `app/**` (use env helpers)
- [ ] No hard‑coded domains in `app/**` (use envPublic)
- [ ] No files > 80MB added; no `docs/chats/*.json` committed
- [ ] Golden files only touched with explicit justification


### Notes / Screenshots