---
phase: quick-039
plan: 01
subsystem: task-list-dependencies
tags: [ux, dependency-editing, chips, delete-interaction]
key-files:
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
decisions:
  - "Chip × button removed; deletion now originates from predecessor row via 'Удалить' button — symmetrizes add/delete UX"
  - "selectedChip state held in TaskList and passed down to all rows so any row can check if it is the selected predecessor"
  - "Chip click toggles selection (same chip click = deselect); both Escape and outside-click clear selection"
metrics:
  duration: "~8 min"
  completed: "2026-03-03"
  tasks: 2
  files: 3
---

# Phase quick-039 Plan 01: Dep Delete via Predecessor Chip Summary

**One-liner:** Removed chip × button; dependency deletion now triggered by clicking a chip (selects it) and then pressing "Удалить" on the predecessor row.

## What Changed

### Interaction Model (Before vs After)

**Before:** Each chip had an × button that appeared on hover. Clicking × removed the dependency immediately from the successor row.

**After:**
1. Chips have no × button — they are click targets
2. Clicking a chip on a successor row *selects* it (blue highlight with `gantt-tl-dep-chip-selected` class)
3. The predecessor row's Связи cell shows a red "Удалить" button while that chip is selected
4. Clicking "Удалить" removes the dependency and clears the selection
5. Clicking the same chip again deselects (toggle)
6. Pressing Escape or clicking outside the overlay clears the selection

This symmetrizes the UX: dependency creation and deletion both originate from the predecessor side.

### TaskList.tsx

- Added `selectedChip` state: `{ successorId, predecessorId, linkType } | null`
- Added `handleChipSelect` callback (passed down to all rows)
- Combined the Escape/outside-click effect to clear both `selectingPredecessorFor` and `selectedChip`
- Passes `selectedChip` and `onChipSelect` to each `TaskListRow`

### TaskListRow.tsx

- Added `selectedChip` and `onChipSelect` to `TaskListRowProps`
- Replaced `handleRemoveChip` with `handleChipClick` (toggles chip selection)
- Added `isSelectedPredecessor` computed flag
- Added `handleDeleteSelected` for the predecessor-row delete button
- Removed × button from visible chips and overflow Popover chips
- Added `onClick` + `gantt-tl-dep-chip-selected` conditional class to chips
- Added "Удалить" button rendered when `isSelectedPredecessor && !disableDependencyEditing`
- Overflow Popover chips also support chip click selection

### TaskList.css

- Removed `.gantt-tl-dep-chip-remove` and `.gantt-tl-dep-overflow-remove` rule blocks
- Added `cursor: pointer` to `.gantt-tl-dep-chip`
- Added `.gantt-tl-dep-chip-selected` (blue background + border + font-weight: 600)
- Added `.gantt-tl-dep-delete-selected` and hover (red button, inline-flex, 0.7rem font)

## Files Modified

| File | Change |
|------|--------|
| `packages/gantt-lib/src/components/TaskList/TaskList.tsx` | selectedChip state, handleChipSelect, combined Escape effect, new props passed to TaskListRow |
| `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` | New props, replaced handleRemoveChip, chip click handler, isSelectedPredecessor, delete button |
| `packages/gantt-lib/src/components/TaskList/TaskList.css` | Removed remove-button styles, added chip cursor/selected/delete-button styles |

## Commits

| Hash | Description |
|------|-------------|
| 526f29b | feat(quick-039): dep delete via predecessor-side Удалить button |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `packages/gantt-lib/src/components/TaskList/TaskList.tsx` — exists and modified
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — exists and modified
- `packages/gantt-lib/src/components/TaskList/TaskList.css` — exists and modified
- Commit 526f29b — exists on branch dep-edit
- TypeScript: 0 new errors (pre-existing DragGuideLines + useTaskDrag.test errors unchanged)
