---
phase: 04-npm-packaging
plan: 05
subsystem: packaging
tags: [npm, build, verification, turbo, tsup]

# Dependency graph
requires:
  - phase: 04-03
    provides: Website package with Modal component moved out
  - phase: 04-04
    provides: Library source migration with CSS conversion
provides:
  - Complete npm package with CJS + ESM bundles
  - TypeScript declarations for all public API
  - Bundled CSS with theming variables
  - Verified build pipeline (npm install, turbo build, test)
  - Human-verified demo page
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [npm-workspace-resolution, turbo-build-pipeline, tsup-bundling]

key-files:
  created: []
  modified:
    - packages/gantt-lib/tsup.config.ts
    - packages/gantt-lib/package.json
    - packages/gantt-lib/src/components/GanttChart/index.tsx
    - packages/gantt-lib/src/index.ts
    - packages/gantt-lib/src/styles.css

key-decisions:
  - "Use named import for esbuild-plugin-preserve-directives (not default)"
  - "Add exclude option to esbuild-plugin-preserve-directives config"
  - "Reorder package.json exports (types before import/require)"
  - "Export GanttChartProps from component index for public API"
  - "CSS variables for theming in styles.css"
  - "Remove @import statements and inline all CSS"

patterns-established:
  - "Pattern 1: Turbo build filter pattern for monorepo builds"
  - "Pattern 2: esbuild-plugin-preserve-directives for React client directives"
  - "Pattern 3: CSS inlining for bundle emission"

requirements-completed: [DX-01, DX-02, DX-03, DX-04]

# Metrics
duration: 10min
completed: 2026-02-20
---

# Phase 04 Plan 05: Build and Verify Summary

**Built and verified the complete npm package with CJS + ESM bundles, TypeScript declarations, and bundled CSS. All dist artifacts meet requirements: ESM gzip size 6.9KB (under 15KB), 'use client' directive preserved, and human-verified demo page working**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-19T21:41:12Z
- **Completed:** 2026-02-19T21:57:37Z
- **Tasks:** 2
- **Files modified:** 6 files

## Accomplishments

- Fixed esbuild-plugin-preserve-directives import (named import not default)
- Added exclude option to esbuild-plugin-preserve-directives configuration
- Reordered package.json exports (types before import/require for Node.js compatibility)
- Exported GanttChartProps from GanttChart component index for public API
- Used default export for DragGuideLines in library index
- Built library with turbo and verified all dist artifacts
- Added CSS variables for customizable theming in gantt-lib styles.css
- Removed all @import statements and inlined CSS for bundler emission
- Removed old src/ directory after migration cleanup
- Verified ESM gzip size: 6.9 KB (under 15KB requirement DX-03)
- Human-verified demo page at http://localhost:3000

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix build issues and verify library artifacts** - `312d661` (fix)
2. **Task 2: Human verification — demo page renders and interactions work** - User approved

**Fix commits:**
- `e1282bd` - CSS variables enhancement and tsconfig updates

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

### Modified:
- `package.json` - Added packageManager field for turbo compatibility
- `packages/gantt-lib/package.json` - Reordered exports, updated dependencies
- `packages/gantt-lib/tsup.config.ts` - Fixed esbuild-plugin-preserve-directives config
- `packages/gantt-lib/src/components/GanttChart/index.tsx` - Exported GanttChartProps
- `packages/gantt-lib/src/index.ts` - Used default export for DragGuideLines
- `packages/gantt-lib/src/styles.css` - Added CSS variables, inlined all CSS
- `packages/website/tsconfig.json` - Added allowJs and module settings

### Deleted:
- Old `src/` directory (removed after migration cleanup)

## Build Verification Results

**dist/index.js (CJS):**
- Size: 34.9 KB
- Starts with: 'use client'
- Format: CommonJS

**dist/index.mjs (ESM):**
- Size: 31.2 KB
- Gzip size: 6.9 KB (under 15KB requirement DX-03)
- Starts with: 'use client'
- Format: ESM

**dist/index.d.ts:**
- Exports: GanttChart, Task, GanttChartProps, TaskRow, GridBackground, TimeScaleHeader, TodayIndicator, DragGuideLines
- Format: TypeScript declarations

**dist/styles.css:**
- Size: 12 KB (12067 bytes)
- Contains: CSS variables for theming, all component styles inlined
- Prefixed classes: 156 gantt-* classes
- No @import statements (all inlined)

**Tests:**
- All 92 tests pass

## Decisions Made

- Use named import for esbuild-plugin-preserve-directives (not default import)
- Add exclude option to esbuild-plugin-preserve-directives to prevent issues
- Reorder package.json exports with types before import/require for Node.js compatibility
- Export GanttChartProps from component index to make it part of public API
- Use default export for DragGuideLines in library index for consistency
- Add CSS variables to styles.css for consumer theming customization
- Remove @import statements and inline all CSS for bundler emission

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed esbuild-plugin-preserve-directives import**
- **Found during:** Task 1 (npm install and turbo build)
- **Issue:** Default import was failing, needed named import
- **Fix:** Changed to named import in tsup.config.ts
- **Files modified:** packages/gantt-lib/tsup.config.ts
- **Committed in:** 312d661 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added exclude option to esbuild-plugin-preserve-directives**
- **Found during:** Task 1 (build configuration)
- **Issue:** Missing exclude option causing build issues
- **Fix:** Added exclude option to tsup config
- **Files modified:** packages/gantt-lib/tsup.config.ts
- **Committed in:** 312d661 (Task 1 commit)

**3. [Rule 1 - Bug] Reordered package.json exports**
- **Found during:** Task 1 (build verification)
- **Issue:** Types export must come before import/require for Node.js compatibility
- **Fix:** Reordered exports in package.json
- **Files modified:** packages/gantt-lib/package.json
- **Committed in:** 312d661 (Task 1 commit)

**4. [Rule 2 - Missing Critical] Exported GanttChartProps from component index**
- **Found during:** Task 1 (TypeScript declaration verification)
- **Issue:** GanttChartProps not exported, needed for public API
- **Fix:** Added GanttChartProps export to GanttChart/index.tsx
- **Files modified:** packages/gantt-lib/src/components/GanttChart/index.tsx
- **Committed in:** 312d661 (Task 1 commit)

**5. [Rule 1 - Bug] Inlined CSS and added variables**
- **Found during:** Task 1 (CSS verification)
- **Issue:** @import statements not working with tsup bundler
- **Fix:** Removed @import statements, inlined all CSS, added CSS variables
- **Files modified:** packages/gantt-lib/src/styles.css
- **Committed in:** e1282bd (CSS fix commit)

---

**Total deviations:** 5 auto-fixed (3 bugs, 2 missing critical)
**Impact on plan:** All auto-fixes necessary for build correctness and API completeness. No scope creep.

## Issues Encountered

- esbuild-plugin-preserve-directives import failed with default import, fixed with named import
- CSS @import statements not working with tsup, fixed by inlining all CSS
- Missing exports for GanttChartProps, fixed by adding export

All issues resolved and verified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- npm package build pipeline verified and working
- All dist artifacts meet requirements
- Demo page verified by user
- Phase 4 (npm-packaging) complete
- Ready for npm publish or further development

## Verification Summary

All success criteria met:
- [x] npm install completes without errors from root
- [x] turbo build produces all dist/ artifacts
- [x] dist/index.js starts with 'use client'
- [x] dist/index.mjs starts with 'use client'
- [x] dist/styles.css is non-empty (12 KB with CSS variables)
- [x] dist/index.d.ts exports GanttChart, Task, GanttChartProps
- [x] ESM bundle gzip size is 6.9 KB (under 15KB DX-03)
- [x] All library tests pass (92 tests)
- [x] Website demo page renders correctly at http://localhost:3000 (human verified)

---
*Phase: 04-npm-packaging*
*Completed: 2026-02-20*
