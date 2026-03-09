---
phase: quick-081
plan: 01
subsystem: ui
tags: [calendar, grid-lines, geometry]

# Dependency graph
requires: []
provides:
  - First month separator fix - no separator line at x=0 (left edge of calendar grid)
  - calculateGridLines function with first date check to skip month separator at grid start
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [grid-line-calculation, first-element-exclusion]

key-files:
  created: []
  modified:
    - packages/gantt-lib/src/utils/geometry.ts
    - packages/gantt-lib/src/__tests__/geometry.test.ts

key-decisions:
  - "Skip isMonthStart flag for first date (i === 0) in calculateGridLines to prevent unwanted separator at x=0"

patterns-established: []
requirements-completed: []

# Metrics
duration: 3min
completed: 2026-03-09
---

# Quick Task 081: Remove First Month Separator Summary

**Skip month separator flag for first date in calendar grid to eliminate unwanted thick line at left edge**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T13:26:00Z
- **Completed:** 2026-03-09T13:29:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Removed unwanted month separator line at position x=0 (left edge of calendar grid)
- All other month separators between different months still render correctly
- Week and day separators remain unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Skip month separator for first date in calculateGridLines** - `23d7b0a` (feat)

**Plan metadata:** (docs: complete plan)

## Files Created/Modified

- `packages/gantt-lib/src/utils/geometry.ts` - Modified calculateGridLines to skip isMonthStart for first date
- `packages/gantt-lib/src/__tests__/geometry.test.ts` - Updated tests to reflect new behavior

## Decisions Made

- Used ternary operator `i === 0 ? false : date.getUTCDate() === 1` for clean first-date check
- Updated existing tests to match new correct behavior (no separator at x=0)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test expectations for new behavior**
- **Found during:** Task 1 (Skip month separator for first date)
- **Issue:** Tests expected isMonthStart: true for first date when it's the 1st of month, but this is the bug we're fixing
- **Fix:** Updated test expectations to isMonthStart: false for first date (result[0] in both failing tests)
- **Files modified:** packages/gantt-lib/src/__tests__/geometry.test.ts
- **Verification:** All 40 geometry tests pass after update
- **Committed in:** 23d7b0a (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix in tests)
**Impact on plan:** Test update required to match new correct behavior. No scope creep.

## Issues Encountered

None - implementation and test updates went smoothly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Calendar grid now renders correctly without left-edge separator
- All existing month, week, and day separators function as expected
- Ready for visual verification in demo app

---
*Phase: quick-081*
*Completed: 2026-03-09*
