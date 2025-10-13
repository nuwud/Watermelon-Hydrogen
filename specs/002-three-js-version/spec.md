# Feature Specification: Three.js Version Manager

**Feature Branch**: `002-three-js-version`  
**Created**: 2025-10-13  
**Status**: Draft  
**Input**: User description: "Three.js has recent upgrades, should probably be part of a separate spec, but I want to be able to keep up with the three.js libraries natively if this project depends so heavily on it. Would love to be able to revert or choose versions from admin and either use from remote or somehow download into project."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - View Current Three.js Version (Priority: P1) 🎯 MVP

Admin needs to quickly see what version of Three.js is currently running in the project to understand the baseline before making updates.

**Why this priority**: Foundation for all other version management features - must know current state before making changes.

**Independent Test**: Can be fully tested by opening watermelonAdmin panel, navigating to Three.js section, and verifying current version displays with package.json data.

**Acceptance Scenarios**:

1. **Given** admin opens watermelonAdmin panel, **When** navigating to "Three.js Version" section, **Then** current version displays (e.g., "r180") with release date and status indicator (current/outdated)
2. **Given** project uses Three.js from node_modules, **When** version info loads, **Then** shows "Local (node_modules)" source indicator
3. **Given** project uses Three.js from CDN, **When** version info loads, **Then** shows "Remote (CDN)" source indicator with URL
4. **Given** version check fails, **When** system cannot read package.json, **Then** displays "Version unknown - check package.json" error message

---

### User Story 2 - Check for Three.js Updates (Priority: P1) 🎯 MVP

Admin wants to see if newer versions of Three.js are available to evaluate whether updates would benefit the project or introduce risks.

**Why this priority**: Critical for security patches and staying current - must know what updates exist before deciding to upgrade.

**Independent Test**: Can be tested by clicking "Check for Updates" button and verifying npm registry query returns available versions with release notes.

**Acceptance Scenarios**:

1. **Given** admin clicks "Check for Updates" button, **When** npm registry responds, **Then** displays list of available versions (stable releases only, sorted newest first)
2. **Given** newer versions exist, **When** version list displays, **Then** highlights recommended version based on semantic versioning (next minor/patch, not major breaking changes)
3. **Given** current version is latest, **When** update check completes, **Then** displays "You're running the latest version ✅" confirmation
4. **Given** version has known security issues, **When** CVE database check completes, **Then** displays security warning badge with link to details
5. **Given** network is offline, **When** update check fails, **Then** shows cached version data (if available) with "Offline - showing cached data" notice

---

### User Story 3 - Switch Three.js Version (Priority: P2)

Admin wants to upgrade/downgrade Three.js version to test compatibility, apply security patches, or access new features without manual package.json editing.

**Why this priority**: Core functionality for version management - enables actual version changes after viewing and checking updates.

**Independent Test**: Can be tested by selecting a different version from dropdown, clicking "Switch Version", and verifying package.json updates and npm install runs automatically.

**Acceptance Scenarios**:

1. **Given** admin selects version from dropdown (e.g., "r181"), **When** clicking "Switch Version (Local)", **Then** system updates package.json, runs `npm install three@latest`, and confirms successful installation
2. **Given** admin selects version and chooses "Switch Version (CDN)", **When** clicking CDN option, **Then** system updates import maps or script tags to use CDN URL (e.g., `https://cdn.skypack.dev/three@0.180.0`) and confirms change
3. **Given** version switch is in progress, **When** npm install runs, **Then** displays progress indicator with real-time terminal output
4. **Given** version switch fails (network error, incompatible version), **When** error occurs, **Then** automatically rolls back to previous version and displays error details
5. **Given** version switch succeeds, **When** installation completes, **Then** prompts "Run build validation?" with one-click option to execute `npm run build` test
6. **Given** version uses CDN mode, **When** switching back to local, **Then** system removes CDN references and reinstalls from npm

---

### User Story 4 - Compare & Test Versions (Priority: P3)

Developer wants to compare breaking changes between versions and test 3D carousel functionality with different Three.js versions before committing to an upgrade.

**Why this priority**: Quality assurance feature - reduces risk of breaking changes but not required for basic version management.

**Independent Test**: Can be tested by selecting two versions for comparison, viewing diff of breaking changes, and optionally running test suite against new version.

**Acceptance Scenarios**:

1. **Given** admin selects two versions (e.g., r180 vs r181), **When** clicking "Compare Versions", **Then** displays side-by-side changelog with breaking changes highlighted
2. **Given** comparison view is open, **When** breaking changes exist, **Then** shows migration guide links from Three.js official docs
3. **Given** admin clicks "Test in Sandbox", **When** sandbox mode activates, **Then** temporarily loads selected version in isolated iframe with 3D carousel test scene
4. **Given** sandbox test completes, **When** admin confirms "Looks good", **Then** offers one-click "Apply This Version" button
5. **Given** sandbox test reveals issues, **When** admin closes sandbox, **Then** reverts to original version with no changes applied

---

### User Story 5 - Version Update Notifications (Priority: P3)

Admin receives proactive notifications when new Three.js versions are released, especially for security patches, without needing to manually check.

**Why this priority**: Convenience feature - improves awareness but not essential for core functionality.

**Independent Test**: Can be tested by simulating new version release (or waiting for real release) and verifying notification appears in watermelonAdmin with proper categorization (security/feature/breaking).

**Acceptance Scenarios**:

1. **Given** new Three.js version releases, **When** admin opens watermelonAdmin within 24 hours, **Then** displays notification badge on Three.js section with update details
2. **Given** notification is security-related, **When** displayed, **Then** uses red badge with "Security Update Available" label and CVE links
3. **Given** notification is feature update, **When** displayed, **Then** uses blue badge with "New Features Available" label and changelog excerpt
4. **Given** notification is major version (breaking changes), **When** displayed, **Then** uses yellow badge with "Major Update - Review Breaking Changes" warning
5. **Given** admin dismisses notification, **When** clicking "Remind me later", **Then** notification reappears after 7 days or on next security update
6. **Given** admin enables "Auto-check on startup", **When** project dev server starts, **Then** runs background check and stores results in localStorage (no blocking)

### Edge Cases

- **Offline mode**: What happens when npm registry is unreachable? System should use cached version data from localStorage (last successful check) and display "Offline - showing cached data" notice.
- **Version compatibility**: How does system handle Three.js versions that break existing 3D carousel code? Must provide rollback mechanism and breaking change warnings before switching.
- **Mid-switch interruption**: What if version switch is interrupted (user closes browser, network drops during npm install)? System should detect incomplete installation on next startup and offer "Resume" or "Rollback" options.
- **CDN vs Local conflict**: What if package.json has Three.js but CDN is also configured in import maps? System must detect conflict and prompt "Choose primary source: Local or CDN?"
- **SSR safety during version switch**: How does system ensure new Three.js version maintains SSR-safe imports? Must scan for direct `import * as THREE` in `app/**` (should only be in dynamic imports) and warn if violations found.
- **Build failure after version switch**: What if new version causes `npm run build` to fail? System must automatically rollback to previous working version and display build error logs.
- **Multiple Three.js instances**: What if project accidentally has multiple Three.js versions in node_modules (due to peer dependencies)? System should detect with `npm list three` and warn about version conflicts.
- **Admin panel persistence**: What if localStorage is cleared or blocked? Version manager should gracefully degrade to read-only mode (can view current version but not switch without localStorage).
- **Rapid version switching**: What if admin switches versions multiple times quickly? System must queue operations and prevent race conditions with operation locking (only one version switch at a time).

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

#### Version Discovery & Display
- **FR-001**: System MUST read current Three.js version from `package.json` and display in watermelonAdmin panel with version number, release date, and source (local/CDN)
- **FR-002**: System MUST query npm registry (https://registry.npmjs.org/three) to fetch list of available Three.js versions (stable releases only, exclude alpha/beta/rc tags)
- **FR-003**: System MUST display version comparison showing current vs latest with visual indicators (up-to-date ✅, update available 🔄, security patch needed ⚠️)
- **FR-004**: System MUST fetch release notes from Three.js GitHub releases API (https://api.github.com/repos/mrdoob/three.js/releases) for each version
- **FR-005**: System MUST check for known CVEs via GitHub Advisory Database or npm audit for current Three.js version

#### Version Switching (Local)
- **FR-006**: System MUST allow admin to select target version from dropdown (sorted by release date, newest first)
- **FR-007**: System MUST update `package.json` dependencies section with selected version (`"three": "^0.XXX.0"` format)
- **FR-008**: System MUST execute `npm install three@<version>` via Node.js child_process and display real-time terminal output
- **FR-009**: System MUST verify successful installation by reading `node_modules/three/package.json` and confirming version matches target
- **FR-010**: System MUST automatically run `npm run build` after version switch and report success/failure status
- **FR-011**: System MUST maintain backup of previous package.json and node_modules state before switching (allow one-click rollback)
- **FR-012**: System MUST detect build failures and offer automatic rollback with one-click "Revert to Last Working Version" button

#### Version Switching (CDN)
- **FR-013**: System MUST allow admin to switch Three.js loading mode from local (node_modules) to CDN (skypack, jsdelivr, or unpkg)
- **FR-014**: System MUST update import maps or dynamic import URLs to use CDN syntax (e.g., `https://cdn.skypack.dev/three@0.180.0`)
- **FR-015**: System MUST remove Three.js from package.json dependencies when CDN mode is active (to prevent duplicate loading)
- **FR-016**: System MUST verify CDN URL is accessible (HTTP 200 check) before applying CDN switch
- **FR-017**: System MUST maintain CDN configuration in localStorage (persisted across sessions) with version number and CDN provider

#### Version Comparison & Testing
- **FR-018**: System MUST display side-by-side changelog diff between two selected versions with breaking changes highlighted in red
- **FR-019**: System MUST provide direct links to Three.js migration guides for major version upgrades
- **FR-020**: System MUST offer sandbox testing mode that loads selected Three.js version in isolated iframe with test scene
- **FR-021**: System MUST include 3D carousel test scene in sandbox with representative meshes, materials, and GSAP animations
- **FR-022**: System MUST allow "Apply This Version" from sandbox if test passes (one-click apply without re-downloading)

#### Notifications & Monitoring
- **FR-023**: System MUST check for new Three.js releases on watermelonAdmin startup (background operation, non-blocking)
- **FR-024**: System MUST display notification badge on Three.js section when updates available (categorized as security/feature/breaking)
- **FR-025**: System MUST store last-checked timestamp in localStorage and throttle checks to once per 24 hours
- **FR-026**: System MUST provide "Remind me later" option that suppresses notification for 7 days
- **FR-027**: System MUST highlight security updates with red badge and link to CVE details

#### SSR Safety & Build Validation
- **FR-028**: System MUST respect Watermelon Hydrogen's SSR safety rules (no raw `import * as THREE` in `app/**`, only dynamic imports)
- **FR-029**: System MUST scan codebase for SSR violations after version switch using grep pattern: `grep -r "import.*THREE.*from.*three" app/`
- **FR-030**: System MUST run `npm run env:check && npm run lint && npm run build` validation gates after version switch
- **FR-031**: System MUST report validation results with pass/fail status and actionable error messages
- **FR-032**: System MUST prevent version switch if validation gates would fail (predictive pre-check mode)

### Key Entities

- **Version Record**: Represents a Three.js release with properties: version number (string), release date (ISO date), source (local/CDN), changelog URL, breaking changes (boolean), security patches (array of CVE IDs), download size (bytes)
- **Version Manager State**: Represents current system state with properties: currentVersion (Version Record), targetVersion (Version Record), operationInProgress (boolean), lastCheckTimestamp (ISO date), cacheData (object), rollbackAvailable (boolean), cdnMode (boolean), cdnProvider (string)
- **Notification**: Represents an update alert with properties: type (security/feature/breaking), versionFrom (string), versionTo (string), message (string), dismissed (boolean), dismissedUntil (ISO date)

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

#### Performance & Reliability
- **SC-001**: Admin can view current Three.js version in watermelonAdmin panel within 500ms of panel open (no blocking operations)
- **SC-002**: Version update check completes within 3 seconds on typical network (queries npm registry + GitHub releases API)
- **SC-003**: Local version switch (npm install) completes within 60 seconds for typical Three.js package size (~1.5 MB)
- **SC-004**: CDN version switch completes within 5 seconds (no npm installation, only config updates)
- **SC-005**: System maintains 100% rollback success rate (no unrecoverable states after failed version switches)
- **SC-006**: Build validation after version switch completes within 120 seconds (runs `npm run build` test)

#### User Experience
- **SC-007**: Admin can switch Three.js versions with ≤3 clicks (select version → choose mode → confirm)
- **SC-008**: System displays real-time progress indicators during all async operations (npm install, build validation, update checks)
- **SC-009**: Error messages include actionable next steps (e.g., "Build failed. [View Logs] [Rollback] [Contact Support]")
- **SC-010**: Version comparison view loads within 2 seconds and highlights breaking changes with ≥90% accuracy (based on Three.js migration guide keywords)

#### Accuracy & Validation
- **SC-011**: System correctly detects current Three.js version in 100% of standard installations (package.json + node_modules validation)
- **SC-012**: System identifies security vulnerabilities with ≥95% accuracy (using npm audit + GitHub Advisory Database)
- **SC-013**: SSR safety scan detects ≥99% of direct Three.js imports in `app/**` (using grep pattern validation)
- **SC-014**: Build validation correctly predicts build failures in ≥90% of incompatible version switches (pre-check mode)
- **SC-015**: System passes all validation gates: `npm run env:check && npm run lint && npm run build` after every version switch

#### Availability & Resilience
- **SC-016**: System functions in offline mode with cached data (view current version, access cached release notes, no switching)
- **SC-017**: System recovers from interrupted version switches in 100% of cases (resume or rollback options on next startup)
- **SC-018**: Notification system throttles checks to ≤1 request per 24 hours (respects npm registry rate limits)
- **SC-019**: System detects and resolves version conflicts in node_modules (multiple Three.js instances) with ≥95% success rate

#### Integration & Compliance
- **SC-020**: All version management code respects Watermelon Hydrogen's Prime Directives (no raw env, SSR safety, no hard-coded domains)
- **SC-021**: Version manager integrates with existing watermelonAdmin panel (uses same localStorage keys, styling patterns, window globals)
- **SC-022**: System maintains compatibility with Hydrogen/Remix SSR (no server-side Three.js execution during build)
- **SC-023**: Version switching operations complete without affecting active 3D carousel sessions (background operations only, no page reloads required)
