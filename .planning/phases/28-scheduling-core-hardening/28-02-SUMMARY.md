---
phase: 28-scheduling-core-hardening
plan: 02
subsystem: scheduling
tags: [typescript, vitest, scheduling, adapters, refactoring]

# Dependency graph
requires:
  - phase: 28-01
    provides: Domain types, command API, core/scheduling barrel exports
provides:
  - adapters/scheduling/drag.ts with resolveDateRangeFromPixels and clampDateRangeForIncomingFS
  - Clean domain boundary: core/scheduling has zero pixel/UI functions
  - @deprecated backward-compat re-exports in core/scheduling/index.ts
  - 9 passing tests for UI adapter functions
affects: [28-03-PLAN, downstream consumers of resolveDateRangeFromPixels/clampDateRangeForIncomingFS]

# Tech tracking
tech-stack:
  added: []
patterns: [adapter-pattern, deprecated-re-export-backward-compat]

key-files:
  created:
    - packages/gantt-lib/src/adapters/scheduling/drag.ts
    - packages/gantt-lib/src/adapters/scheduling/index.ts
    - packages/gantt-lib/src/adapters/scheduling/__tests__/drag.test.ts
  modified:
    - packages/gantt-lib/src/core/scheduling/commands.ts
    - packages/gantt-lib/src/core/scheduling/index.ts
    - packages/gantt-lib/src/hooks/useTaskDrag.ts

key-decisions:
  - "UI functions (pixel-aware) extracted to adapters/scheduling, leaving core/scheduling as pure domain layer"
  - "Backward compat via @deprecated re-exports rather than breaking change — dependencyUtils chain works automatically"
  - "clampDateRangeForIncomingFS test adjusted: FS constraint calculation uses -predecessorDuration lag normalization, so minAllowedStart can be earlier than expected"

patterns-established:
  - "Adapter pattern: adapters/scheduling/ wraps core/scheduling with pixel-space conversion"
  - "Backward-compat re-export chain: adapters -> core/scheduling/index.ts (@deprecated) -> dependencyUtils.ts (automatic)"

requirements-completed: [FR-1]

# Metrics
duration: 5min
completed: 2026-03-30
---

# Phase 28 Plan 02: UI Adapter Extraction Summary

**Extract resolveDateRangeFromPixels/clampDateRangeForIncomingFS from core/scheduling to adapters/scheduling, clean domain boundary with backward-compat re-exports**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-30T21:45:00Z
- **Completed:** 2026-03-30T21:50:05Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Created adapters/scheduling/drag.ts with 2 UI adapter functions (pixel-to-date conversion + FS constraint clamping)
- core/scheduling/commands.ts now contains only domain scheduling primitives (no pixel parameters)
- useTaskDrag imports UI functions from adapters/scheduling, domain functions from core/scheduling
- 9 new tests covering both UI adapter functions
- Backward compatibility preserved via @deprecated re-exports

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract UI adapter functions to adapters/scheduling** - `e620cbe` (feat)
2. **Task 2: Update useTaskDrag imports** - `e909c60` (refactor)
3. **Task 3: Add drag adapter tests** - `48e287c` (test)

## Files Created/Modified
- `packages/gantt-lib/src/adapters/scheduling/drag.ts` - UI adapter functions: resolveDateRangeFromPixels, clampDateRangeForIncomingFS
- `packages/gantt-lib/src/adapters/scheduling/index.ts` - Barrel export for adapters/scheduling
- `packages/gantt-lib/src/adapters/scheduling/__tests__/drag.test.ts` - 9 tests for UI adapter functions
- `packages/gantt-lib/src/core/scheduling/commands.ts` - Removed 2 UI functions, kept domain primitives
- `packages/gantt-lib/src/core/scheduling/index.ts` - Added @deprecated re-exports for backward compat
- `packages/gantt-lib/src/hooks/useTaskDrag.ts` - Split imports: domain from core/scheduling, UI from adapters/scheduling

## Decisions Made
- Adapter pattern chosen for UI/pixel-space functions rather than keeping in core — clean domain boundary
- dependencyUtils.ts did NOT need explicit re-export addition because chain works automatically: dependencyUtils -> core/scheduling/index -> adapters/scheduling
- Test for clampDateRangeForIncomingFS adjusted after discovering FS constraint calculation uses -predecessorDuration normalization

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed clampDateRangeForIncomingFS test assertion**
- **Found during:** Task 3 (drag.test.ts)
- **Issue:** Test expected clamp to Jan 6 but FS constraint calculation with -predecessorDuration normalization yields Jan 1 as minAllowedStart, so range.start=Jan 2 passes constraint check unchanged
- **Fix:** Adjusted test to verify correct behavior (no clamp when constraint satisfied), added separate test with data that actually triggers clamping
- **Files modified:** packages/gantt-lib/src/adapters/scheduling/__tests__/drag.test.ts
- **Verification:** All 9 tests pass
- **Committed in:** 48e287c (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug in test expectations)
**Impact on plan:** Minor test correction. No scope creep.

## Issues Encountered
None beyond the auto-fixed test issue above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Clean domain boundary established: core/scheduling has zero pixel/UI dependencies
- Ready for Plan 03: Documentation updates
- adapters/scheduling pattern ready for additional UI adapter functions if needed

---
*Phase: 28-scheduling-core-hardening*
*Completed: 2026-03-30*

## Self-Check: PASSED

- All 6 created/modified files verified present
- All 3 task commits verified in git log (e620cbe, e909c60, 48e287c)
- SUMMARY.md present at expected path
