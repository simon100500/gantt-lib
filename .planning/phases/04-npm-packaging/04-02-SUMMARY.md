---
phase: 04-npm-packaging
plan: 02
subsystem: packaging
tags: [npm, library-config, tsup, exports-field]

# Dependency graph
requires: [04-01-monorepo-foundation]
provides:
  - Library package manifest with exports field
  - tsup dual CJS+ESM build configuration with CSS
  - TypeScript config extending root base
  - Vitest test runner config for library
affects: [04-03-component-library, 04-04-website-package]

# Tech tracking
tech-stack:
  added: [tsup@^8.0.0, esbuild-plugin-preserve-directives@^0.0.6]
  patterns: [dual-cjs-esm, npm-exports-field, css-bundling, preserve-directives]

key-files:
  created: [packages/gantt-lib/package.json, packages/gantt-lib/tsup.config.ts, packages/gantt-lib/tsconfig.json, packages/gantt-lib/vitest.config.ts]
  modified: []

key-decisions:
  - "Use esbuild-plugin-preserve-directives for use-client handling (NOT banner)"
  - "Bundle clsx into dist (NOT external, NOT a dependency)"
  - "date-fns in dependencies (auto-installed for consumers)"
  - "react/react-dom as peerDependencies (>=18 supports React 18 and 19)"
  - "Package name is exactly 'gantt-lib'"
  - "CSS renamed to styles.css via onSuccess hook"

patterns-established:
  - "Pattern 1: Dual CJS+ESM build with tsup for maximum compatibility"
  - "Pattern 2: exports field with './styles.css' subpath for CSS imports"
  - "Pattern 3: preserve-directives plugin ensures 'use client' works in both CJS and ESM"
  - "Pattern 4: onSuccess hook renames CSS output to predictable styles.css name"

requirements-completed: [DX-01, DX-02, DX-03, DX-04]

# Metrics
duration: 1min
completed: 2026-02-19
---

# Phase 04 Plan 02: Library Package Scaffolding Summary

**Library package configuration with tsup dual CJS+ESM build, npm exports field, and preserve-directives plugin for Next.js use-client compatibility**

## Performance

- **Duration:** 1 min (65s)
- **Started:** 2026-02-19T21:34:43Z
- **Completed:** 2026-02-19T21:35:48Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments

- Created packages/gantt-lib/ directory with library package manifest
- Configured package.json exports field for dual ESM/CSS entry points
- Set react and react-dom as peerDependencies (>=18 for React 18/19 support)
- Added date-fns to dependencies (auto-installed for library consumers)
- Created tsup.config.ts with esbuild-plugin-preserve-directives for use-client handling
- Configured dual CJS+ESM build with dts and sourcemap output
- Added onSuccess hook to rename CSS output to styles.css
- Created tsconfig.json extending root base config
- Created vitest.config.ts with jsdom environment for library tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Create packages/gantt-lib/package.json with exports field** - `01cc90d` (feat)
2. **Task 2: Create tsup.config.ts, tsconfig.json, and vitest.config.ts** - `bf98372` (feat)

**Fix commits:** None

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `packages/gantt-lib/package.json` - Library npm manifest with exports field (NEW)
- `packages/gantt-lib/tsup.config.ts` - tsup dual CJS+ESM build configuration (NEW)
- `packages/gantt-lib/tsconfig.json` - TypeScript config extending root base (NEW)
- `packages/gantt-lib/vitest.config.ts` - Vitest test runner config for library (NEW)

## Decisions Made

- Used esbuild-plugin-preserve-directives instead of banner for use-client handling (banner breaks CJS due to use strict injection)
- Bundle clsx into dist via tsup (NOT in external array, NOT a dep or peerDep)
- Added date-fns to dependencies (auto-installed for consumers)
- Set react and react-dom as peerDependencies with >=18 (supports React 18 and 19)
- Package name is exactly "gantt-lib"
- onSuccess hook renames emitted CSS file to predictable "styles.css" name

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

---

**Total deviations:** 0
**Impact on plan:** None - all tasks completed as specified

## Issues Encountered

None - all tasks completed as expected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Library package scaffolding complete with all four config files
- Ready for source migration in 04-03 (move components from app/ to packages/gantt-lib/src/)
- tsup config correctly handles "use client" directive for Next.js RSC compatibility
- exports field allows consumers to import both main library and CSS

---
*Phase: 04-npm-packaging*
*Completed: 2026-02-19*
