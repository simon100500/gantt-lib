---
phase: 04-npm-packaging
plan: 03
subsystem: infra
tags: [next.js, react-19, npm-workspaces, workspace-dependencies]

# Dependency graph
requires:
  - phase: 04-01
    provides: Root monorepo configuration with Turborepo orchestration and npm workspaces setup
provides:
  - Next.js 15 demo application packages/website/ with workspace dependency on gantt-lib
  - Modal component moved to website-only location (packages/website/src/components/Modal/)
  - Demo page importing GanttChart from 'gantt-lib' workspace package
affects: [04-04-migration, 04-05-publishing]

# Tech tracking
tech-stack:
  added: [next@^15.1.0, react@^19.0.0, react-dom@^19.0.0]
  patterns: [workspace-dependency-resolution, consumer-css-import, demo-site-consumption]

key-files:
  created:
    - packages/website/package.json
    - packages/website/tsconfig.json
    - packages/website/next.config.ts
    - packages/website/src/app/layout.tsx
    - packages/website/src/app/page.tsx
    - packages/website/src/app/globals.css
    - packages/website/src/components/Modal/Modal.tsx
    - packages/website/src/components/Modal/Modal.module.css
  modified: []

key-decisions:
  - "No transpilePackages in next.config.ts - library ships pre-compiled dist files"
  - "Modal component moved to website-only - not part of library API"
  - "Consumer CSS import pattern: import 'gantt-lib/styles.css' in layout.tsx"
  - "Workspace dependency syntax: \"gantt-lib\": \"*\" for npm workspaces"

patterns-established:
  - "Pattern 1: Website package declares workspace dependency using wildcard version"
  - "Pattern 2: Consumer imports library CSS via 'gantt-lib/styles.css' path"
  - "Pattern 3: Demo website co-located in monorepo for development convenience"

requirements-completed: [DX-04]

# Metrics
duration: 1min
completed: 2026-02-19
---

# Phase 04 Plan 03: Website Package Summary

**Next.js 15 demo application consuming gantt-lib via npm workspace dependency with Modal component moved to website-only location**

## Performance

- **Duration:** 1 min (60s)
- **Started:** 2026-02-19T21:34:48Z
- **Completed:** 2026-02-19T21:35:48Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Created packages/website/ Next.js 15 application with workspace dependency on gantt-lib
- Built demo page importing GanttChart from 'gantt-lib' workspace package
- Moved Modal component from library source to website-only location
- Configured clean Next.js setup without transpilePackages (library ships pre-compiled)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold packages/website with package.json, tsconfig.json, next.config.ts** - `12319b8` (chore)
2. **Task 2: Create app shell, demo page, and move Modal to website** - `4f03754` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `packages/website/package.json` - Website npm manifest with gantt-lib workspace dependency
- `packages/website/tsconfig.json` - TypeScript config extending root base config
- `packages/website/next.config.ts` - Next.js config without transpilePackages
- `packages/website/src/app/layout.tsx` - Root layout importing gantt-lib/styles.css
- `packages/website/src/app/page.tsx` - Demo page with sample GanttChart
- `packages/website/src/app/globals.css` - Minimal CSS reset
- `packages/website/src/components/Modal/Modal.tsx` - Modal component (website-only)
- `packages/website/src/components/Modal/Modal.module.css` - Modal styles (website-only)

## Decisions Made

- Used `"gantt-lib": "*"` in package.json for npm workspace dependency resolution
- Omitted transpilePackages from next.config.ts - library ships pre-compiled dist files, no transpilation needed
- Moved Modal component to website-only location - it's demo infrastructure, not library API
- Consumer CSS import pattern: `import 'gantt-lib/styles.css'` in layout.tsx for library styles

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed as expected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Website package scaffold complete, ready for content migration in 04-04
- Modal component preserved in website location for future demo use
- Workspace dependency proves the installation path works correctly

---
*Phase: 04-npm-packaging*
*Completed: 2026-02-19*
