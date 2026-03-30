---
phase: 28-scheduling-core-hardening
plan: 03
subsystem: scheduling
tags: [typescript, vitest, scheduling, documentation, boundary-tests]

# Dependency graph
requires:
  - phase: 28-01
    provides: Domain types, command API, core/scheduling barrel exports
  - phase: 28-02
    provides: adapters/scheduling extraction, clean domain boundary, backward-compat re-exports
provides:
  - boundary.test.ts: 5 tests proving pure Node execution without React/DOM/jsdom
  - export-contract.test.ts: 4 tests verifying export map correctness
  - Updated 14-headless-scheduling.md with accurate API docs matching code
  - Fixed dependencyUtils.ts missing execute.ts re-exports
affects: [downstream consumers, documentation readers]

# Tech tracking
tech-stack:
  added: []
patterns: [boundary-testing, export-contract-testing, @vitest-environment node]

key-files:
  created:
    - packages/gantt-lib/src/core/scheduling/__tests__/boundary.test.ts
    - packages/gantt-lib/src/__tests__/export-contract.test.ts
  modified:
    - packages/gantt-lib/src/utils/dependencyUtils.ts
    - docs/reference/14-headless-scheduling.md

key-decisions:
  - "dependencyUtils.ts was missing execute.ts re-exports (moveTaskWithCascade, etc.) — added for backward-compat chain completeness"
  - "Documentation rewritten to match actual code behavior, not idealized descriptions"

patterns-established:
  - "Boundary testing pattern: @vitest-environment node + file scan for forbidden imports"
  - "Export contract testing: dynamic import() to verify barrel exports at runtime"

requirements-completed: [FR-3, FR-5, FR-6]

# Metrics
duration: 7min
completed: 2026-03-30
---

# Phase 28 Plan 03: Boundary Tests and Documentation Summary

**Pure Node boundary tests (5 tests proving zero React/DOM deps) + export contract verification (4 tests) + documentation rewrite matching actual code behavior**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-30T21:53:21Z
- **Completed:** 2026-03-30T22:00:35Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- 5 boundary tests prove core/scheduling runs in pure Node without jsdom/React/DOM
- 4 export contract tests verify barrel re-export chain correctness
- Documentation fully rewritten: fixed normalizeDependencyLag (>= -predecessorDuration), cascadeByLinks (per-type FS/SS vs FF/SF), added execute.ts section, adapters/scheduling section, downstream consumption contract, stability markers
- Fixed dependencyUtils.ts missing execute.ts + adapter re-exports

## Task Commits

Each task was committed atomically:

1. **Task 1: Boundary tests for pure Node execution** - `234dfb7` (test)
2. **Task 1b: Export contract tests + dependencyUtils fix** - `239e183` (test)
3. **Task 2: Documentation rewrite** - `ddf02f1` (docs)

## Files Created/Modified
- `packages/gantt-lib/src/core/scheduling/__tests__/boundary.test.ts` - 5 tests: no React imports, no DOM globals, scheduling functions work without jsdom, execute.ts works without jsdom, types available without runtime deps
- `packages/gantt-lib/src/__tests__/export-contract.test.ts` - 4 tests: command-level API exports, domain types, backward-compat UI adapter re-exports, dependencyUtils full chain
- `packages/gantt-lib/src/utils/dependencyUtils.ts` - Added execute.ts (4 commands) + UI adapter backward-compat re-exports
- `docs/reference/14-headless-scheduling.md` - Full rewrite with accurate API descriptions, execute.ts section, adapters/scheduling section, stability markers, downstream contract

## Decisions Made
- dependencyUtils.ts needed explicit execute.ts re-exports because named `export { ... } from` doesn't auto-include new barrel additions
- Documentation rewritten from scratch rather than patched — too many gaps accumulated across plans 27-28

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added execute.ts + adapter re-exports to dependencyUtils.ts**
- **Found during:** Task 1b (export-contract.test.ts)
- **Issue:** dependencyUtils.ts was missing moveTaskWithCascade, resizeTaskWithCascade, recalculateTaskFromDependencies, recalculateProjectSchedule, resolveDateRangeFromPixels, clampDateRangeForIncomingFS re-exports
- **Fix:** Added 6 named exports to dependencyUtils.ts from '../core/scheduling'
- **Files modified:** packages/gantt-lib/src/utils/dependencyUtils.ts
- **Verification:** All 4 export-contract tests pass
- **Committed in:** 239e183 (Task 1b commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential fix for backward-compat chain completeness. No scope creep.

## Issues Encountered
None beyond the auto-fixed re-export issue.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 28 (scheduling-core-hardening) is now complete
- core/scheduling is server-ready: pure Node, documented, tested, export-contract verified
- All stability markers in documentation set clear expectations for downstream consumers

## Self-Check: PASSED

- All 4 created/modified files verified present
- All 3 task commits verified in git log (234dfb7, 239e183, ddf02f1)
- SUMMARY.md present at expected path

---
*Phase: 28-scheduling-core-hardening*
*Completed: 2026-03-30*
