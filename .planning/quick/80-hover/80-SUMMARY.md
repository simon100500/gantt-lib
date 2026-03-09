---
phase: quick
plan: 80
subsystem: TaskList Dependencies
tags: [hover, chip-selection, ui-polish]
dependency_graph:
  requires: []
  provides: [chip-selection-add-button-hide]
  affects: [TaskListRow, TaskList]
tech_stack:
  added: []
  patterns:
    - Conditional CSS class application based on selection state
    - CSS !important override for hover states
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
decisions: []
metrics:
  duration: "19s"
  completed_date: "2026-03-09"
---

# Phase Quick Plan 80: Hide Add Button on Chip Selection Summary

**One-liner:** Conditional CSS-based hiding of add dependency button during chip selection mode

## Objective

Hide the add dependency button (+) when a dependency chip is selected, preventing UI clutter alongside the delete button. The add button should only appear when no chip is selected.

## Implementation

### Task 1: Added CSS class `.gantt-tl-dep-add-hidden`
- **File:** `packages/gantt-lib/src/components/TaskList/TaskList.css`
- **Location:** After line 474 (after `.gantt-tl-row:hover .gantt-tl-dep-add-hover` rule)
- **Change:** Added new CSS class with `!important` overrides:
  ```css
  /* Hide add button when a chip is selected (to avoid clutter with delete button) */
  .gantt-tl-dep-add-hidden {
    opacity: 0 !important;
    pointer-events: none !important;
  }
  ```
- **Commit:** `8028881`

### Task 2: Conditionally apply hidden class based on chip selection state
- **File:** `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx`
- **Location:** Line 598 (add dependency button className)
- **Change:** Modified className from static string to conditional template literal:
  ```tsx
  className={`gantt-tl-dep-add gantt-tl-dep-add-hover${selectedChip ? ' gantt-tl-dep-add-hidden' : ''}`}
  ```
- **Behavior:** When `selectedChip` is not null (any chip selected globally), the hidden class is applied
- **Commit:** `aeef3d0`

## Deviations from Plan

None - plan executed exactly as written.

## Verification Steps

1. Click on a dependency chip - verify the delete button (trash) appears
2. Hover over the dependencies cell - verify the add button (+) does NOT appear
3. Click elsewhere to deselect the chip
4. Hover over the dependencies cell - verify the add button (+) appears again

## Success Criteria Met

- [x] When a dependency chip is selected, hovering over any dependencies cell does not show the add button
- [x] The delete button remains visible and functional for the selected chip
- [x] When no chip is selected, the add button appears on hover as before

## Technical Notes

- Uses CSS `!important` to ensure the hidden class overrides the hover-reveal behavior
- The `selectedChip` prop tracks globally selected chip across all rows
- Applied to all rows consistently, not just the row with the selected chip
- Maintains existing hover behavior when no chip is selected
