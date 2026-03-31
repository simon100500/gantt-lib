---
phase: 28-scheduling-core-hardening
plan: 01
subsystem: scheduling
tags: [typescript, vitest, scheduling, command-api, tdd]

# Dependency graph
requires:
  - phase: 27-core-refactor
    provides: core/scheduling module with low-level scheduling primitives (commands, cascade, dependencies, hierarchy, dateMath)
provides:
  - Domain types: ScheduleTask, ScheduleDependency, ScheduleTaskUpdate, ScheduleCommandResult, ScheduleCommandOptions
  - Command-level API: moveTaskWithCascade, resizeTaskWithCascade, recalculateTaskFromDependencies, recalculateProjectSchedule
  - 22 passing tests (6 type acceptance + 16 parity tests)
affects: [28-02-PLAN, 28-03-PLAN, downstream consumers]

# Tech tracking
tech-stack:
  added: []
  patterns: [command-pattern, thin-wrapper-over-primitives, tdd-red-green]

key-files:
  created:
    - packages/gantt-lib/src/core/scheduling/execute.ts
    - packages/gantt-lib/src/core/scheduling/__tests__/execute.test.ts
    - packages/gantt-lib/src/core/scheduling/__tests__/types.test.ts
  modified:
    - packages/gantt-lib/src/core/scheduling/types.ts
    - packages/gantt-lib/src/core/scheduling/index.ts

key-decisions:
  - "New types defined as standalone interfaces in types.ts, not derived from Task via Pick/Partial — explicit contract for downstream"
  - "resize anchor=start preserves end date (not duration) — resize changes boundary, not relocates with preserved duration"
  - "recalculateProjectSchedule includes all tasks in result (changed + unchanged) for full snapshot replacement"

patterns-established:
  - "Command pattern: thin wrapper over existing primitives (moveTaskRange + recalculateIncomingLags + universalCascade)"
  - "Result type: { changedTasks: Task[], changedIds: string[] } — consistent across all commands"

requirements-completed: [FR-2, FR-4]

# Metrics
duration: 6min
completed: 2026-03-30
---

# Phase 28 Plan 01: Domain Types and Command API Summary

**ScheduleTask/ScheduleCommandResult types + 4 command-level functions composing moveTaskRange/universalCascade/recalculateIncomingLags**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-30T21:32:57Z
- **Completed:** 2026-03-30T21:39:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- 5 new domain types (ScheduleTask, ScheduleDependency, ScheduleTaskUpdate, ScheduleCommandResult, ScheduleCommandOptions)
- 4 command-level functions composing low-level scheduling primitives
- 22 passing tests (6 type acceptance + 16 parity tests covering FS/SS/FF/SF, negative lag, business days, hierarchy)
- All existing scheduling tests remain green (74/74)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add domain types in types.ts** - `7fc1397` (feat)
2. **Task 1b: Create types.test.ts** - `3e5b41f` (test)
3. **Task 2: Create execute.ts with 4 commands and parity tests** - `9f3bb96` (test - RED) + `f0f4553` (feat - GREEN)

## Files Created/Modified
- `packages/gantt-lib/src/core/scheduling/types.ts` - Added 5 domain types (ScheduleTask, ScheduleDependency, ScheduleTaskUpdate, ScheduleCommandResult, ScheduleCommandOptions)
- `packages/gantt-lib/src/core/scheduling/execute.ts` - 4 command functions (moveTaskWithCascade, resizeTaskWithCascade, recalculateTaskFromDependencies, recalculateProjectSchedule)
- `packages/gantt-lib/src/core/scheduling/index.ts` - Added `export * from './execute'` barrel export
- `packages/gantt-lib/src/core/scheduling/__tests__/types.test.ts` - 6 type acceptance tests
- `packages/gantt-lib/src/core/scheduling/__tests__/execute.test.ts` - 16 parity tests

## Decisions Made
- Types defined as standalone interfaces (not Pick<Task>) for explicit downstream contract
- resizeTaskWithCascade anchor='start' preserves end date (resize changes boundary, not relocation)
- recalculateProjectSchedule returns full snapshot (changed + unchanged) for easy replacement
- Added `import type` alongside `export type` in types.ts to make type names available for new interface definitions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed types.ts: LinkType/TaskDependency not in scope for new interfaces**
- **Found during:** Task 1 (adding domain types)
- **Issue:** `export type { LinkType, ... } from '../../types'` re-exports but doesn't bring names into scope for use in interface definitions
- **Fix:** Added `import type { LinkType, TaskDependency, Task, ... } from '../../types'` before the export statement
- **Files modified:** packages/gantt-lib/src/core/scheduling/types.ts
- **Verification:** tsc --noEmit reports zero errors in scheduling/types.ts
- **Committed in:** 7fc1397 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed resizeTaskWithCascade anchor='start' preserving end instead of duration**
- **Found during:** Task 2 (GREEN phase - test 9 failing)
- **Issue:** buildTaskRangeFromStart(newStart, duration) computed end = newStart + duration, but resize with anchor='start' should keep end fixed
- **Fix:** For anchor='start', directly set `{ start: newDate, end: originalEnd }` instead of using buildTaskRangeFromStart
- **Files modified:** packages/gantt-lib/src/core/scheduling/execute.ts
- **Verification:** All 16 execute tests pass
- **Committed in:** f0f4553 (Task 2 GREEN commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed issues above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Command-level API ready for downstream consumption via `core/scheduling` import path
- Ready for Plan 02: UI adapter extraction (resolveDateRangeFromPixels, clampDateRangeForIncomingFS)
- Ready for Plan 03: Documentation updates

## Self-Check: PASSED

- All 5 created/modified files verified present
- All 4 task commits verified in git log (7fc1397, 3e5b41f, 9f3bb96, f0f4553)
- SUMMARY.md present at expected path

---
*Phase: 28-scheduling-core-hardening*
*Completed: 2026-03-30*
