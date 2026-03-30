---
phase: 25-columns-refactoring
plan: 01
self_check: PASSED
subsystem: ui
tags: [typescript, react, tasklist, columns, tdd, vitest]

# Dependency graph
requires: []
provides:
  - "TaskListColumn<TTask> type with anchor-based positioning"
  - "TaskListColumnContext<TTask> without columnId"
  - "resolveTaskListColumns pure resolver function"
  - "Backward-compatible re-export bridge in taskListColumns.ts"
affects: [25-02, 25-03, 25-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Type alias intersection for union+object types (type X = Union & { ... })"
    - "Pure resolver with tracked insertion positions for same-anchor ordering"
    - "Dev-mode duplicate detection via console.error"

key-files:
  created:
    - "packages/gantt-lib/src/components/TaskList/columns/types.ts"
    - "packages/gantt-lib/src/components/TaskList/columns/resolveTaskListColumns.ts"
    - "packages/gantt-lib/src/components/TaskList/columns/__tests__/resolveTaskListColumns.test.ts"
  modified:
    - "packages/gantt-lib/src/components/TaskList/taskListColumns.ts"
    - "packages/gantt-lib/src/__tests__/taskListColumns.test.tsx"
    - "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
    - "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"

key-decisions:
  - "Used type alias (intersection) instead of interface extends union — TypeScript does not support interface extending union types"
  - "Tracked last insertion index per anchor via Map to preserve consumer-provided order for same-anchor columns"
  - "Updated runtime code (TaskList.tsx, TaskListRow.tsx) to match new type API — necessary for tsc --noEmit to pass"

patterns-established:
  - "columns/ subdirectory for column-related types and utilities"
  - "TDD approach: RED (failing tests) -> GREEN (implementation) -> commit"

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-03-29
---

# Phase 25 Plan 01: Structural Foundations Summary

**New TaskListColumn type with before/after anchor union, pure resolveTaskListColumns resolver with 8 TDD tests, and backward-compatible re-export bridge**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-29T13:00:30Z
- **Completed:** 2026-03-29T13:08:35Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created canonical column types in `columns/types.ts` with `TaskListColumn<TTask>` using anchor union and `TaskListColumnContext<TTask>` without `columnId`
- Implemented `resolveTaskListColumns` pure resolver with after/before/no-anchor/invalid-anchor handling and dev-mode duplicate detection
- 8 TDD unit tests covering all insertion scenarios including same-anchor ordering preservation
- Bridge file `taskListColumns.ts` is now a pure re-export from `columns/types.ts`
- Updated runtime code to use new property names (`renderEditor` instead of `editor`, `'after' in col` guard)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create column types and resolver with TDD** - `71c62af` (test: RED phase - 8 failing tests)
2. **Task 1: GREEN phase** - `8d11809` (feat: resolver implementation)
3. **Task 2: Bridge old taskListColumns.ts and update existing tests** - `82dd866` (refactor: bridge + runtime fixes)

## Files Created/Modified
- `packages/gantt-lib/src/components/TaskList/columns/types.ts` - New canonical column types (TaskListColumn, TaskListColumnContext, TaskListColumnAnchor, BuiltInTaskListColumnId)
- `packages/gantt-lib/src/components/TaskList/columns/resolveTaskListColumns.ts` - Pure resolver function for column ordering
- `packages/gantt-lib/src/components/TaskList/columns/__tests__/resolveTaskListColumns.test.ts` - 8 unit tests for the resolver
- `packages/gantt-lib/src/components/TaskList/taskListColumns.ts` - Converted to pure re-export bridge
- `packages/gantt-lib/src/__tests__/taskListColumns.test.tsx` - Updated `editor` -> `renderEditor`, `width: '96px'` -> `width: 96`
- `packages/gantt-lib/src/components/TaskList/TaskList.tsx` - Fixed `col.after` access with `'after' in col` guard
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` - Updated `col.editor` -> `col.renderEditor`

## Decisions Made
- **Type alias over interface extends union**: TypeScript TS2312 error — "An interface can only extend an object type or intersection of object types with statically known members." Used `type TaskListColumn<TTask> = TaskListColumnAnchor & { ... }` instead.
- **Tracked insertion positions**: Simple `findIndex` for `after` anchor reverses order when multiple columns target the same anchor. Used `Map<string, number>` to track last insertion position per anchor key.
- **Updated runtime code in scope**: Plan stated "tsc --noEmit exits 0" as acceptance criteria, but runtime code (TaskList.tsx, TaskListRow.tsx) used old property names. Applied minimal fixes (`'after' in col` guard, `col.editor` -> `col.renderEditor`) to satisfy the criteria without changing logic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript TS2312: interface cannot extend union type**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** `interface TaskListColumn extends TaskListColumnAnchor` where `TaskListColumnAnchor` is a union — TypeScript does not support this
- **Fix:** Changed to `type TaskListColumn<TTask> = TaskListColumnAnchor & { ... }`
- **Files modified:** `packages/gantt-lib/src/components/TaskList/columns/types.ts`
- **Verification:** `npx tsc --noEmit` passes for column files
- **Committed in:** `82dd866` (Task 2 commit)

**2. [Rule 1 - Bug] Test false positive: before-anchor test passed on empty array**
- **Found during:** Task 1 (RED phase)
- **Issue:** `ids.indexOf('startDate')` and `ids.indexOf('priority')` both return -1 on empty array, making `-1 === -1` true
- **Fix:** Added `toBeGreaterThanOrEqual(0)` assertions before equality check
- **Files modified:** `packages/gantt-lib/src/components/TaskList/columns/__tests__/resolveTaskListColumns.test.ts`
- **Verification:** Test correctly fails in RED, passes in GREEN
- **Committed in:** `8d11809` (GREEN phase commit)

**3. [Rule 2 - Missing Critical] Runtime code type incompatibility blocking tsc --noEmit**
- **Found during:** Task 2 (bridge verification)
- **Issue:** `TaskList.tsx` accessed `col.after` (now requires `'after' in col` guard) and `TaskListRow.tsx` accessed `col.editor` (renamed to `col.renderEditor`)
- **Fix:** Added `'after' in col` narrow guard with `as BuiltInTaskListColumnId` cast; replaced all `col.editor` with `col.renderEditor`
- **Files modified:** `TaskList.tsx`, `TaskListRow.tsx`
- **Verification:** `npx tsc --noEmit` shows no column-related errors
- **Committed in:** `82dd866` (Task 2 commit)

**4. [Rule 3 - Blocking] Test import path incorrect for nested directory**
- **Found during:** Task 2 (tsc check)
- **Issue:** `resolveTaskListColumns.test.ts` imported from `../../GanttChart` but file is in `columns/__tests__/` (3 levels deep)
- **Fix:** Changed import to `../../../GanttChart/GanttChart`
- **Files modified:** `packages/gantt-lib/src/components/TaskList/columns/__tests__/resolveTaskListColumns.test.ts`
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** `82dd866` (Task 2 commit)

**5. [Rule 3 - Blocking] Console.error test expected 2 args, implementation passes 1**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** `expect.stringContaining` matchers split the single format string into separate arguments
- **Fix:** Split into two separate `toHaveBeenCalledWith` assertions
- **Files modified:** `packages/gantt-lib/src/components/TaskList/columns/__tests__/resolveTaskListColumns.test.ts`
- **Verification:** All 8 tests pass
- **Committed in:** `8d11809` (GREEN phase commit)

---

**Total deviations:** 5 auto-fixed (1 bug, 2 missing critical, 2 blocking)
**Impact on plan:** All auto-fixes necessary for TypeScript compilation and test correctness. No scope creep — no logic changes to runtime behavior.

## Issues Encountered
- TypeScript `interface extends union` not supported (TS2312) — resolved by using type alias intersection
- Same-anchor column ordering reversed with naive splice approach — resolved by tracking insertion positions per anchor

## Known Stubs
None — all created code is functional and tested.

## Next Phase Readiness
- `columns/types.ts` and `columns/resolveTaskListColumns.ts` are ready for consumption by Plan 02 (built-in column factory)
- Runtime code (`TaskList.tsx`, `TaskListRow.tsx`) has been minimally updated to use new property names but still uses the old bucket-based column insertion pattern — Plan 02/03 will replace this
- Pre-existing TypeScript errors (16 total) in unrelated files (dateUtils, useTaskDrag, DependencyLines, etc.) are out of scope

---
*Phase: 25-columns-refactoring*
*Completed: 2026-03-29*
