---
phase: 25-columns-refactoring
plan: 02
subsystem: ui
tags: [react, typescript, tasklist, columns, refactoring]

# Dependency graph
requires:
  - phase: 25-01
    provides: "columns/types.ts with TaskListColumn<TTask>, resolveTaskListColumns resolver"
provides:
  - "createBuiltInColumns factory with 8 built-in column definitions"
  - "Unified resolvedColumns.map() rendering in TaskList header and TaskListRow body"
  - "BUILT_IN_COLUMN_WIDTHS record with numeric pixel widths"
affects: [25-03-editor-unification, 25-04-generic-tightening, 25-05-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns: [resolvedColumns pipeline, built-in cell extraction into variables]

key-files:
  created:
    - packages/gantt-lib/src/components/TaskList/columns/createBuiltInColumns.tsx
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx

key-decisions:
  - "Built-in cell JSX extracted into const variables (numberCell, nameCell, etc.) referenced from builtInCells record in resolvedColumns.map()"
  - "Placeholder renderCell returning null for built-in columns; actual rendering stays in extracted JSX variables (Phase B intermediate state)"
  - "Custom column editor uses col.renderEditor ?? (col as any).editor for backward compat during transition"
  - "BUILT_IN_CSS_CLASSES map preserves existing CSS class-based styling for built-in header cells"

patterns-established:
  - "resolvedColumns.map() drives both header and row cell rendering"
  - "builtInCells record maps column id to pre-computed JSX element"

requirements-completed: []

# Metrics
duration: 12min
completed: 2026-03-29
---

# Phase 25 Plan 02: render-unification Summary

**Unified header and row rendering via resolvedColumns.map() pipeline, replacing hardcoded bucket insertion**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-29T13:11:44Z
- **Completed:** 2026-03-29T13:23:53Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `createBuiltInColumns` factory returning 8 built-in `TaskListColumn<TTask>` definitions with numeric widths
- Replaced hardcoded header cells + bucket insertion in TaskList.tsx with `resolvedColumns.map()` driven rendering
- Replaced `additionalColumnsByAnchor` prop in TaskListRow with `resolvedColumns` prop, single `resolvedColumns?.map()` renders all cells
- Eliminated two duplicate custom column render blocks in TaskListRow (after name, after progress)
- All 7 integration tests pass, no visual/behavioral changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create createBuiltInColumns factory** - `d2b773a` (feat)
2. **Task 2: Unify header rendering and row column passing** - `8479657` (refactor)

## Files Created/Modified
- `packages/gantt-lib/src/components/TaskList/columns/createBuiltInColumns.tsx` - Factory returning 8 built-in column definitions with numeric widths and placeholder renderCell
- `packages/gantt-lib/src/components/TaskList/TaskList.tsx` - Replaced bucket logic with resolvedColumns pipeline, unified header via map()
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` - Extracted built-in cells into variables, unified row via resolvedColumns.map(), single custom column block

## Decisions Made
- Built-in cell JSX extracted into const variables rather than functions to avoid re-indentation of ~600 lines of JSX
- `BUILT_IN_CSS_CLASSES` map preserves existing CSS class styling (gantt-tl-cell-number, gantt-tl-cell-name, etc.) in the header
- Dependencies header retains special Popover UI via conditional check `col.id === 'dependencies'` in the map
- Custom column backward compat: `col.renderEditor ?? (col as any).editor` handles both new and old column definitions during transition

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree branch mismatch - plan 25-01 commits not on worktree branch**
- **Found during:** Initialization
- **Issue:** Worktree was on master (8c75dff), but plan 25-01 commits (a236664+) were on custom-colls branch via another worktree
- **Fix:** `git reset --hard a236664` to get 25-01 changes into worktree
- **Files modified:** None (git operation)
- **Verification:** columns/types.ts and columns/resolveTaskListColumns.ts exist

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Worktree alignment was necessary prerequisite. No code scope changes.

## Issues Encountered
- Large TaskListRow.tsx file (2286 lines) required careful extraction of ~600 lines of JSX into const variables without changing indentation or breaking closure variable references
- Node.js (not python3) available on Windows worktree for scripted file operations

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `createBuiltInColumns` factory ready with placeholder renderCell (returns null)
- Both header and body render through unified `resolvedColumns.map()` pipeline
- Plan 25-03 (editor unification) can now replace individual `editingName`/`editingDuration`/`editingProgress` booleans with single `editingColumnId` mechanism
- The `builtInCells` variable approach in TaskListRow provides natural entry point for Phase C editor unification

---
*Phase: 25-columns-refactoring*
*Completed: 2026-03-29*
