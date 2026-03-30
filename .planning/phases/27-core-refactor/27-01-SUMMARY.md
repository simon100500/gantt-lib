---
phase: 27-core-refactor
plan: 01
subsystem: core
tags: [scheduling, headless, date-math, dependencies, cascade, validation, hierarchy, backward-compat]

# Dependency graph
requires:
  - phase: prior-phases
    provides: "dependencyUtils.ts and dateUtils.ts with all scheduling logic"
provides:
  - "Headless scheduling core module at src/core/scheduling/ with 7 module files"
  - "All 30+ scheduling functions importable from core/scheduling/index.ts"
  - "Zero React/DOM/date-fns dependencies in core module"
  - "Backward-compat re-export barrels in utils/"
affects: [core-refactor, future-headless-consumers]

# Tech tracking
tech-stack:
  added: []
  patterns: [core-module-with-re-export-barrels, headless-scheduling-layer]

key-files:
  created:
    - packages/gantt-lib/src/core/scheduling/types.ts
    - packages/gantt-lib/src/core/scheduling/dateMath.ts
    - packages/gantt-lib/src/core/scheduling/dependencies.ts
    - packages/gantt-lib/src/core/scheduling/cascade.ts
    - packages/gantt-lib/src/core/scheduling/commands.ts
    - packages/gantt-lib/src/core/scheduling/validation.ts
    - packages/gantt-lib/src/core/scheduling/hierarchy.ts
    - packages/gantt-lib/src/core/scheduling/index.ts
    - packages/gantt-lib/src/core/scheduling/__tests__/dateMath.test.ts
    - packages/gantt-lib/src/core/scheduling/__tests__/dependencies.test.ts
    - packages/gantt-lib/src/core/scheduling/__tests__/cascade.test.ts
    - packages/gantt-lib/src/core/scheduling/__tests__/commands.test.ts
    - packages/gantt-lib/src/core/scheduling/__tests__/validation.test.ts
    - packages/gantt-lib/src/core/scheduling/__tests__/hierarchy.test.ts
  modified:
    - packages/gantt-lib/src/utils/dependencyUtils.ts
    - packages/gantt-lib/src/utils/dateUtils.ts

key-decisions:
  - "Moved getTaskDuration and alignToWorkingDay to dateMath.ts to break circular dependency between dependencies.ts and commands.ts"
  - "Used explicit named re-exports in dependencyUtils.ts instead of export * to avoid name collision with dateUtils.ts string-returning wrappers"
  - "dateUtils.ts delegates to core/dateMath but converts Date results to string for backward compatibility"

patterns-established:
  - "core/scheduling/ is the headless scheduling layer — zero UI dependencies"
  - "utils/ files are thin re-export barrels for backward compat"
  - "Internal core imports use relative paths (./module), not through index barrel"

requirements-completed: [CORE-01, CORE-02, CORE-03]

# Metrics
duration: 20min
completed: 2026-03-30
---

# Phase 27: Core Refactor Summary

**Headless scheduling core at src/core/scheduling/ with 7 modules, 52 new tests, zero React/date-fns deps, full backward compat via re-export barrels**

## Performance

- **Duration:** 20 min
- **Started:** 2026-03-30T19:38:41Z
- **Completed:** 2026-03-30T19:58:52Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- Created headless scheduling module at src/core/scheduling/ with types, dateMath, dependencies, cascade, commands, validation, hierarchy
- All 30+ scheduling functions moved from dependencyUtils.ts and dateUtils.ts into core modules
- 52 new passing tests directly importing from core paths
- Backward compatibility preserved: all 60 existing dependencyUtils tests pass via re-export chain
- Build passes without errors, zero React/DOM/date-fns imports in core

## Task Commits

Each task was committed atomically:

1. **Task 1: Create core/scheduling module structure with types and dateMath** - `96ba852` (feat)
2. **Task 2: Create dependencies, cascade, commands, validation, hierarchy modules + re-export barrels** - `48a7f14` (feat)

## Files Created/Modified
- `src/core/scheduling/types.ts` - Type re-exports (LinkType, Task, TaskDependency, etc.)
- `src/core/scheduling/dateMath.ts` - Pure date math: normalizeUTCDate, parseDateOnly, business-day ops, getTaskDuration, alignToWorkingDay
- `src/core/scheduling/dependencies.ts` - calculateSuccessorDate, computeLagFromDates, normalizeDependencyLag, getDependencyLag
- `src/core/scheduling/cascade.ts` - universalCascade, cascadeByLinks, getSuccessorChain, getTransitiveCascadeChain, reflowTasksOnModeSwitch
- `src/core/scheduling/commands.ts` - buildTaskRangeFromStart/End, moveTaskRange, clampTaskRangeForIncomingFS, recalculateIncomingLags
- `src/core/scheduling/validation.ts` - validateDependencies, detectCycles, buildAdjacencyList
- `src/core/scheduling/hierarchy.ts` - getChildren, isTaskParent, computeParentDates, getAllDescendants, areTasksHierarchicallyRelated
- `src/core/scheduling/index.ts` - Barrel re-export of all core scheduling APIs
- `src/core/scheduling/__tests__/` - 6 test files with 52 passing tests
- `src/utils/dependencyUtils.ts` - Backward-compat re-export barrel (named exports)
- `src/utils/dateUtils.ts` - Delegates 3 business-day functions to core, keeps string return types

## Decisions Made
- Moved `getTaskDuration` and `alignToWorkingDay` to dateMath.ts instead of commands.ts to break circular dependency (dependencies.ts needs getTaskDuration for normalizeDependencyLag, commands.ts needs normalizeDependencyLag)
- Used explicit named re-exports in dependencyUtils.ts to avoid TS2308 ambiguity with dateUtils.ts string-returning `addBusinessDays`/`subtractBusinessDays`/`getBusinessDaysCount`
- Kept dateUtils.ts wrapper functions that delegate to core but convert `Date` results to `string` for backward compat

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Broke circular dependency by moving getTaskDuration to dateMath.ts**
- **Found during:** Task 2 (dependencies module creation)
- **Issue:** `dependencies.ts` imports `getTaskDuration` (for `normalizeDependencyLag`), and `commands.ts` imports `normalizeDependencyLag` (from `dependencies.ts`). Plan placed `getTaskDuration` in `commands.ts`, creating a circular import.
- **Fix:** Moved `getTaskDuration` and `alignToWorkingDay` to `dateMath.ts` (leaf module with no scheduling imports), breaking the cycle.
- **Files modified:** dateMath.ts, dependencies.ts, commands.ts, cascade.ts
- **Verification:** All tests pass, build succeeds, no circular deps
- **Committed in:** 48a7f14 (part of Task 2 commit)

**2. [Rule 3 - Blocking] Fixed TS2308 export name collision**
- **Found during:** Task 2 (build verification)
- **Issue:** `utils/index.ts` does `export * from './dateUtils'` and `export * from './dependencyUtils'`. Both export `addBusinessDays`, `getBusinessDaysCount`, `subtractBusinessDays` — TS2308 ambiguity error in build.
- **Fix:** Changed `dependencyUtils.ts` from `export * from '../core/scheduling'` to explicit named exports excluding the 3 conflicting functions.
- **Files modified:** dependencyUtils.ts
- **Verification:** Build passes without errors
- **Committed in:** 48a7f14 (part of Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were necessary for build correctness. getTaskDuration relocation is architecturally cleaner (leaf module). Named re-exports are more explicit and maintainable.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Core scheduling module ready for direct consumption (headless, no UI deps)
- Backward compat verified: all existing imports continue to work
- Ready for Phase 27 Plan 02 (further refactoring if any)
- 23 pre-existing test failures documented (not caused by this plan)

## Self-Check: PASSED
- All 15 created files verified present on disk
- Both commits (96ba852, 48a7f14) verified in git log

---
*Phase: 27-core-refactor*
*Completed: 2026-03-30*
