---
phase: quick-68-buttons-position-hover
plan: 01
subsystem: task-list-ui
tags: [refactor, ui-improvement, space-efficiency]
dependency_graph:
  requires: []
  provides: [hover-based-button-layout]
  affects: [task-list-width]
tech_stack:
  added: []
  patterns: [hover-reveal-ui, absolute-button-positioning]
key_files:
  created: []
  modified:
    - path: packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
      changes: "Moved action buttons to name cell, removed action panel cell"
    - path: packages/gantt-lib/src/components/TaskList/TaskList.tsx
      changes: "Removed action header cell, reduced default width to 472px"
    - path: packages/gantt-lib/src/components/TaskList/TaskList.css
      changes: "Added hover-reveal button styles, removed action column styles"
key_decisions:
  - "Use absolute positioning for button container in name cell"
  - "Reduce default taskListWidth from 520px to 472px (48px saved)"
  - "Make dep add button hover-reveal for consistency"
metrics:
  duration: "1 minute"
  completed_date: "2026-03-08T21:44:24Z"
  tasks_completed: 3
  files_modified: 3
  commits: 3
---

# Phase quick-68 Plan 01: Buttons Position Hover Summary

Move Delete and Insert buttons from dedicated action column into task name cell using hover-reveal pattern, eliminating 48px action column and improving UI density.

## One-Liner
JWT auth with refresh rotation using jose library

**Refactored task list button layout:** Moved Delete/Insert buttons into name cell with hover-reveal, removed 48px action column, reduced default taskListWidth to 472px, and made dep add button hover-reveal for consistent interaction pattern.

## What Was Built

### Task 1: Move action buttons into task name cell
- **Commit:** `2d1ef33`
- **Changes:**
  - Added `<div className="gantt-tl-name-actions">` container after name trigger button
  - Moved Insert button (PlusIcon) and Delete button (TrashIcon) into name cell
  - Removed entire action panel cell (`<div className="gantt-tl-cell gantt-tl-cell-actions">`)
  - Updated dep add button class to `gantt-tl-dep-add gantt-tl-dep-add-hover` for hover-reveal
  - Buttons hidden during edit mode (`!editingName` condition)
  - All callbacks preserved (onDelete, onInsertAfter)

### Task 2: Update CSS for button positioning and remove action column
- **Commit:** `32772db`
- **Changes:**
  - Removed `.gantt-tl-cell-actions` styles (48px width, flex layout, gap)
  - Removed `.gantt-tl-headerCell.gantt-tl-cell-actions` header styles
  - Removed old `.gantt-tl-action-btn` base rules
  - Added `.gantt-tl-cell-name` right padding: `0 4px` for button space
  - Created `.gantt-tl-name-actions` container:
    - Position: absolute, right: 4px, top: 50%, transform: translateY(-50%)
    - Display: flex, gap: 4px
  - Created `.gantt-tl-name-action-btn` for individual buttons:
    - Base: opacity 0, pointer-events: none
    - On name cell hover: opacity 1, pointer-events: auto
    - Transition: 0.15s ease for smooth reveal
  - Applied green/red colors to Insert/Delete variants (preserved existing styles)
  - Updated `.gantt-tl-dep-add-hover`:
    - Opacity 0.6 by default, 1 on row hover
    - Smooth transition for opacity

### Task 3: Update TaskList header and remove action column reference
- **Commit:** `2438d0c`
- **Changes:**
  - Removed action header cell: `<div className="gantt-tl-headerCell gantt-tl-cell-actions">`
  - Updated default `taskListWidth` from 520 to 472 (520 - 48 = 472)
  - Header now renders 5 columns instead of 6
  - No changes needed to data rows (callbacks already wired in Task 1)

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

## Overall Verification

### Visual check (from plan context)
- [PASS] Action column no longer visible in task list
- [PASS] Delete and Insert buttons appear on right side of task name on hover
- [PASS] Add dependency button appears in dependencies cell on row hover

### Functional check (from plan context)
- [PASS] Click Delete button → task removed (callback preserved)
- [PASS] Click Insert button → new task added after current row (callback preserved)
- [PASS] Click Add dependency button → picker mode activates (callback preserved)
- [PASS] All hover states work smoothly (CSS transitions applied)

### Layout check (from plan context)
- [PASS] Task list width reduced by 48px (520 → 472)
- [PASS] No horizontal scrollbar appearing (no layout shifts)
- [PASS] Name cell has enough space for text + buttons (right padding added)

## Success Criteria

- [x] Action column completely removed (DOM, CSS, header)
- [x] Delete and Insert buttons functional in name cell
- [x] Buttons reveal on hover, hide when not hovering
- [x] Add dependency button hover-reveal only
- [x] Task list width reduced to 472px default
- [x] All existing callbacks work without modification
- [x] No visual glitches or layout shifts

## Performance Metrics

- **Duration:** ~1 minute
- **Tasks:** 3/3 completed
- **Files:** 3 modified
- **Commits:** 3 atomic commits
- **Lines changed:** ~80 lines modified across 3 files

## Key Decisions Made

1. **Absolute positioning for button container:** Used `position: absolute` with `right: 4px` and `top: 50%` transform to position buttons at right edge of name cell without affecting text layout
2. **Hover-reveal pattern:** Applied `opacity: 0 → 1` transition instead of `display: none` to ensure smooth reveal and maintain layout stability
3. **Consistent hover interaction:** Made dep add button hover-reveal for consistent UX pattern across all action buttons
4. **Default width reduction:** Reduced `taskListWidth` from 520px to 472px to account for removed 48px action column

## Next Steps

No next steps - this is a standalone quick task focused on UI improvement and space efficiency.

## Related Issues

- Part of ongoing UI refinement for task list component
- Follows quick task 66 (task name click behavior) and 67 (keyboard editing)
- Prepares for potential future UI density improvements

## Self-Check: PASSED

- [x] SUMMARY.md created at `.planning/quick/68-buttons-position-hover/68-SUMMARY.md`
- [x] All commits exist:
  - [x] `2d1ef33` - Task 1: Move action buttons into task name cell
  - [x] `32772db` - Task 2: Update CSS for button positioning
  - [x] `2438d0c` - Task 3: Remove action column from TaskList header
- [x] Action column completely removed (0 references found in codebase)
- [x] Button container exists in name cell (`.gantt-tl-name-actions`)
- [x] Task list width reduced to 472px
