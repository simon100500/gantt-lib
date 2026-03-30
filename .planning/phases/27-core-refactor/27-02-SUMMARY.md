---
phase: 27-core-refactor
plan: 02
subsystem: core
tags: [scheduling, headless, import-rewiring, drag, commands]

# Dependency graph
requires:
  - phase: 27-01
    provides: "Headless scheduling core module at src/core/scheduling/ with 7 modules"
provides:
  - "All UI consumers import scheduling functions from core/scheduling, not utils/dependencyUtils"
  - "resolveDateRangeFromPixels and clampDateRangeForIncomingFS extracted into core/scheduling/commands.ts"
  - "Zero scheduling logic in useTaskDrag.ts (all delegated to core)"
affects: [core-refactor, future-headless-consumers]

# Tech tracking
tech-stack:
  added: []
patterns: [core-import-boundary, ui-imports-from-core-only]

key-files:
  created: []
  modified:
    - packages/gantt-lib/src/core/scheduling/commands.ts
    - packages/gantt-lib/src/hooks/useTaskDrag.ts
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
    - packages/gantt-lib/src/utils/hierarchyOrder.ts

key-decisions:
  - "addBusinessDays/subtractBusinessDays return Date from core, need .toISOString().split('T')[0] conversion in UI code"
  - "DependencyLines.tsx still imports from utils/dependencyUtils — not in scope for this plan"

patterns-established:
  - "UI components import scheduling functions exclusively from core/scheduling barrel"
  - "UI-specific helpers (parseUTCDate, normalizeTaskDates, createCustomDayPredicate) remain in utils/dateUtils"
  - "Date-returning core functions must be converted to string when used for ISO date props"

requirements-completed: [CORE-04, CORE-05]

# Metrics
duration: 9min
completed: 2026-03-30
---

# Phase 27 Plan 02: Core Refactor Summary

**All UI consumers rewired to core/scheduling, drag scheduling logic extracted as resolveDateRangeFromPixels + clampDateRangeForIncomingFS**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-30T20:01:36Z
- **Completed:** 2026-03-30T20:10:31Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Extracted resolveDraggedRange as resolveDateRangeFromPixels into core/scheduling/commands.ts (pure scheduling, no React/DOM)
- Extracted clampDraggedRangeForIncomingFS as clampDateRangeForIncomingFS into core/scheduling/commands.ts
- Rewired 6 UI files to import scheduling functions from core/scheduling instead of utils/dependencyUtils
- All 40 useTaskDrag tests pass without modification
- Build succeeds with zero type errors
- 23 pre-existing test failures remain (unrelated color palette mismatches)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract resolveDateRangeFromPixels and clampDateRangeForIncomingFS into core/scheduling/commands** - `e37de7a` (feat)
2. **Task 2: Rewire GanttChart, TaskList, TaskListRow, TaskRow, hierarchyOrder to import from core/scheduling** - `6622f09` (feat)

## Files Created/Modified
- `src/core/scheduling/commands.ts` - Added resolveDateRangeFromPixels and clampDateRangeForIncomingFS, imported getBusinessDaysCount from dateMath
- `src/hooks/useTaskDrag.ts` - Removed inline scheduling functions, imports all from core/scheduling
- `src/components/GanttChart/GanttChart.tsx` - Scheduling imports from core/scheduling
- `src/components/TaskList/TaskList.tsx` - Merged two dependencyUtils imports into core/scheduling
- `src/components/TaskList/TaskListRow.tsx` - Scheduling from core/scheduling, UI helpers from dateUtils, fixed Date-to-string conversion
- `src/components/TaskRow/TaskRow.tsx` - isTaskParent, getChildren, getBusinessDaysCount from core/scheduling
- `src/utils/hierarchyOrder.ts` - computeParentDates, computeParentProgress, isTaskParent from core/scheduling

## Decisions Made
- addBusinessDays/subtractBusinessDays from core/scheduling return Date objects (not strings like dateUtils wrappers). UI code must convert to ISO string when setting date props. This is the intended boundary: core works with Date, UI works with strings.
- DependencyLines.tsx still imports from utils/dependencyUtils — not in this plan's scope (only 7 files specified).
- DAY_MS constant in TaskListRow.tsx kept — used by local UI-only calendar-day helpers (getInclusiveDurationDays, getEndDateFromDuration).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed addBusinessDays/subtractBusinessDays Date-to-string type mismatch**
- **Found during:** Task 2 (build verification after rewiring TaskListRow)
- **Issue:** core/scheduling addBusinessDays returns Date, but old dateUtils version returned string. Three call sites in TaskListRow expected string results (new Date(string) wrapping and getEndDate return type).
- **Fix:** Removed `new Date(\`${addBusinessDays(...)}T00:00:00.000Z\`)` wrapping (now returns Date directly). Added `.toISOString().split('T')[0]` conversion in getEndDate callback.
- **Files modified:** TaskListRow.tsx (lines 447, 455, 876)
- **Verification:** Build passes, all TaskListRow tests pass
- **Committed in:** 6622f09 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Type mismatch fix required because core functions return Date while UI expects string in some places. Boundary is correct — core uses Date, UI converts as needed.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All internal UI code imports scheduling functions from core/scheduling
- DependencyLines.tsx is the last remaining internal consumer of utils/dependencyUtils (can be rewired in a future cleanup)
- Backward compat verified: barrel chain in utils/ still works for external consumers
- Phase 27 is complete (2/2 plans done)

## Self-Check: PASSED
- SUMMARY.md verified present at .planning/phases/27-core-refactor/27-02-SUMMARY.md
- Commit e37de7a verified in git log
- Commit 6622f09 verified in git log

---
*Phase: 27-core-refactor*
*Completed: 2026-03-30*
