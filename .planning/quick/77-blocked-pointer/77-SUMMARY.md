---
phase: quick-77
plan: 01
type: execute
wave: 1
completed_date: "2026-03-09"
duration: 2 minutes
subsystem: "task-list"
tags:
  - "link-creation"
  - "ux-improvement"
  - "cursor-feedback"
dependency_graph:
  requires:
    - "phase-14-dependencies-edit"
  provides:
    - "intuitive-cancel-link-creation"
  affects:
    - "task-list-row"
tech_stack:
  added:
    - "handleCancelPicking callback"
  patterns:
    - "conditional onClick based on row type"
    - "cursor as affordance indicator"
key_files:
  created: []
  modified:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      changes: "Added handleCancelPicking callback and updated onClick handler"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      changes: "Changed cursor from not-allowed to pointer for source row"
decisions: []
metrics:
  tasks: 1
  files_modified: 2
  commits: 1
  duration_seconds: 120
---

# Phase quick-77 Plan 01: Allow cancelling link creation by clicking source cell Summary

Add click handler to exit link creation mode when user clicks on the source row's deps cell showing "Выберите задачу", and change cursor from 'not-allowed' to 'pointer'.

## One-liner

Click-to-cancel link creation mode with pointer cursor for discoverable UX.

## Changes Made

### TaskListRow.tsx
- Added `handleCancelPicking` callback that calls `onSetSelectingPredecessorFor?.(null)` with stopPropagation
- Updated deps cell onClick handler to use conditional logic:
  - Source row: `handleCancelPicking` (exits link creation mode)
  - Other rows in picking mode: `handlePredecessorPick` (selects predecessor)
  - Default: no action

### TaskList.css
- Changed `.gantt-tl-row-picking-self .gantt-tl-cell-deps` cursor from `not-allowed` to `pointer`

## Deviations from Plan

None - plan executed exactly as written.

## Testing

The following automated verification passed:
- `grep "handleCancelPicking"` found in TaskListRow.tsx
- `grep "cursor: pointer"` found in TaskList.css for picking-self row

Manual verification steps:
1. Click "+" in any row's deps cell to enter link creation mode
2. Confirm the current row's deps cell shows "Выберите задачу" text
3. Confirm hovering over that cell shows 'pointer' cursor (not 'not-allowed')
4. Click on the "Выберите задачу" cell
5. Confirm link creation mode exits (the text disappears, normal state restored)
6. Confirm you can now click "+" again to re-enter link creation mode

## Success Criteria

- [x] Clicking "Выберите задачу" cell exits link creation mode
- [x] Cursor is 'pointer' instead of 'not-allowed' for source row deps cell
- [x] Link creation mode can be cancelled intuitively

## Impact

Users can now exit link creation mode by clicking on the same cell that started it, which is a more intuitive interaction pattern. The 'pointer' cursor provides clear affordance that the element is clickable.
