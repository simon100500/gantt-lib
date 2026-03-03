---
phase: quick-042
plan: 01
subsystem: task-list/dependency-chips
tags: [dependency, chip, delete, inline-action, css]
dependency_graph:
  requires: [TaskListRow chip selection (quick-039), handleDeleteSelected handler]
  provides: [Inline trash button on selected dep chip]
  affects: [TaskListRow.tsx, TaskList.css]
tech_stack:
  added: []
  patterns: [Conditional inline button pattern, inline-flex chip wrapper]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
decisions:
  - Always wrap chip in gantt-tl-dep-chip-wrapper for simplicity (no conditional wrapper)
  - Trash button reuses existing handleDeleteSelected handler — no new logic needed
  - disableDependencyEditing guards the trash button (same guard as add button)
  - Applied same pattern in overflow Popover chips.map block for consistency
metrics:
  duration: "~5 min"
  completed: "2026-03-03T11:51:42Z"
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 042: Dep Chip Trash Button Summary

**One-liner:** Inline trash icon button appears immediately right of a selected dependency chip, calling the existing handleDeleteSelected handler to remove the link.

## What Was Built

When a dependency chip in the "Связи" cell is selected (dark blue state), a small 12x12 trash icon button now appears inline to its right. Clicking the button calls `handleDeleteSelected`, which removes the dependency and clears chip selection. The button is hidden when `disableDependencyEditing=true`. The existing predecessor-row "Удалить" button is untouched.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wrap selected chip + render inline trash button in TaskListRow.tsx | 21d935f | TaskListRow.tsx |
| 2 | Add CSS for chip wrapper and trash button in TaskList.css | 88ef616 | TaskList.css |

## Changes Made

### TaskListRow.tsx
- Wrapped each chip in `<span className="gantt-tl-dep-chip-wrapper">` in both `visibleChips.map(...)` and overflow Popover `chips.map(...)`
- Added `<button className="gantt-tl-dep-chip-trash">` with trash SVG icon rendered conditionally when `isChipSelected && !disableDependencyEditing`
- Button `onClick` wired to `handleDeleteSelected` (pre-existing handler — no new logic)

### TaskList.css
- Added `.gantt-tl-dep-chip-wrapper` — `inline-flex` with `align-items: center; gap: 2px` to keep chip and button visually inline
- Added `.gantt-tl-dep-chip-trash` — transparent button, grey icon (`#6b7280`), `line-height: 0` for pixel-perfect icon alignment
- Added `.gantt-tl-dep-chip-trash:hover` — subtle red tint (`rgba(239,68,68,0.12)`) + red icon (`#dc2626`) hinting destructive action

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — modified, committed 21d935f
- [x] `packages/gantt-lib/src/components/TaskList/TaskList.css` — modified, committed 88ef616
- [x] TypeScript: no errors in TaskListRow.tsx (`grep "TaskListRow"` on tsc output returns empty)
- [x] `.gantt-tl-dep-chip-wrapper` at line 281 in TaskList.css
- [x] `.gantt-tl-dep-chip-trash` at line 288 in TaskList.css
- [x] `.gantt-tl-dep-chip-trash:hover` at line 302 in TaskList.css
- [x] `gantt-tl-dep-chip-trash` button `onClick` wired to `handleDeleteSelected`
- [x] `isSelectedPredecessor` block untouched
