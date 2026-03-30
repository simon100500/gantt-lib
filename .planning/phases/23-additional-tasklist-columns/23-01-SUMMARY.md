---
phase: 23-additional-tasklist-columns
plan: 01
subsystem: ui
tags: [typescript, react, tasklist, generic-types, tdd]

# Dependency graph
requires:
  - phase: 22-filters
    provides: TaskPredicate type and filter infrastructure pattern
provides:
  - Public generic types: BuiltInTaskListColumnId, TaskListColumnContext, TaskListColumn
  - Wave-0 failing integration tests for additionalColumns feature
affects: [23-02, 23-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Generic TaskListColumn<TTask extends Task> pattern for type-safe column definitions"
    - "TaskListColumnContext with updateTask patch callback for editor pipeline"

key-files:
  created:
    - packages/gantt-lib/src/components/TaskList/taskListColumns.ts
    - packages/gantt-lib/src/__tests__/taskListColumns.test.tsx
  modified:
    - packages/gantt-lib/src/index.ts

key-decisions:
  - "Used TaskListColumn as primary type name (not GanttColumn) per CONTEXT.md decision D-07"
  - "Generic <TTask extends Task> enables type-safe column definitions for extended task shapes"
  - "editor field is optional on TaskListColumn, editor receives TaskListColumnContext with updateTask/closeEditor"
  - "after field uses BuiltInTaskListColumnId union for type-safe anchor references"
  - "meta is declarative Record<string, unknown> per D-15"

patterns-established:
  - "Column contract file (taskListColumns.ts) separate from component files for clean public API"
  - "Wave-0 TDD: failing tests define exact DOM contracts (data-custom-column-id, data-testid) before implementation"

requirements-completed: [COL-01, COL-02, COL-03, COL-05, COL-06, COL-07, COL-08]

# Metrics
duration: 4min
completed: 2026-03-27
---

# Phase 23 Plan 01: Column Contract & Wave-0 Tests Summary

**Generic TaskListColumn<TTask> types with BuiltInTaskListColumnId anchor, TaskListColumnContext editor pipeline, and 7 failing integration tests defining DOM contracts**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T12:46:51Z
- **Completed:** 2026-03-27T12:50:35Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created public generic column type contract (BuiltInTaskListColumnId, TaskListColumnContext, TaskListColumn)
- Exported column types from root index.ts for consumer access
- Created 7 wave-0 failing integration tests covering ordering, widths, renderCell, editor pipeline, base-column regression, and width budget growth

## Task Commits

Each task was committed atomically:

1. **Task 1: Create public generic column types** - `6c874db` (feat)
2. **Task 2: Create wave-0 failing tests** - `c1592b7` (test)

_Note: Task 2 is TDD RED phase -- tests fail until UI implementation in plan 23-02_

## Files Created/Modified
- `packages/gantt-lib/src/components/TaskList/taskListColumns.ts` - Public generic types for additional columns
- `packages/gantt-lib/src/index.ts` - Re-export column types from root API
- `packages/gantt-lib/src/__tests__/taskListColumns.test.tsx` - 7 integration tests (currently failing)

## Decisions Made
- Used `TaskListColumn` as the primary type name (consistent with CONTEXT.md D-07)
- `editor` is optional, receives `TaskListColumnContext` with `updateTask(patch)` and `closeEditor()`
- `after` field typed as `BuiltInTaskListColumnId` union for compile-time anchor safety
- `meta` is declarative `Record<string, unknown>` only (D-15)
- Tests use `data-custom-column-id` for column identification in DOM assertions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Column type contract is frozen and committed
- Wave-0 tests define exact DOM expectations for 23-02 implementation
- Next plan (23-02) can implement `additionalColumns` prop on GanttChart, wire through TaskList/TaskListRow, and make the 7 tests pass

## Self-Check: PASSED

- FOUND: packages/gantt-lib/src/components/TaskList/taskListColumns.ts
- FOUND: packages/gantt-lib/src/__tests__/taskListColumns.test.tsx
- FOUND: .planning/phases/23-additional-tasklist-columns/23-01-SUMMARY.md
- FOUND: commit 6c874db (Task 1)
- FOUND: commit c1592b7 (Task 2)

---
*Phase: 23-additional-tasklist-columns*
*Completed: 2026-03-27*
