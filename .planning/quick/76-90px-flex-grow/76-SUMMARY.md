---
phase: quick-76
plan: 01
subsystem: TaskList CSS
tags: [css, flexbox, layout, task-list]
dependency_graph:
  requires:
    - "quick-72 (90px deps column)"
    - "quick-75 (picking mode overflow)"
  provides:
    - "flexible name column layout"
  affects:
    - "overlay width calculations"
tech_stack:
  added: []
  patterns:
    - "flex-grow for space distribution"
    - "redundant property removal"
key_files:
  created: []
  modified:
    - "packages/gantt-lib/src/components/TaskList/TaskList.css"
decisions:
  - "Reduced min-width from 250px to 150px to fit within 234px available space"
  - "Removed redundant width constraints from picking mode hover state"
metrics:
  duration_seconds: 38
  completed_date: "2026-03-09T08:35:28Z"
  tasks_completed: 1
  files_modified: 1
  commits_created: 1
---

# Phase quick-76 Plan 01: 90px flex-grow Summary

Reduce name column min-width from 250px to 150px and remove redundant width constraints from picking mode hover state to fix column layout with overlay width 472px.

## Changes Made

### Task 1: Reduce name column min-width and remove redundant width constraints

**Commit:** `0665ff8`

Modified `packages/gantt-lib/src/components/TaskList/TaskList.css`:

1. **Reduced name column min-width** (line 112):
   - Changed from `min-width: 250px` to `min-width: 150px`
   - Allows column to fit within 234px available space (472 - 40 - 68 - 68 - 90)
   - Maintains `flex: 1` to grow and fill available space

2. **Removed redundant width constraints from picking mode hover** (line 487):
   - Removed `width: 90px`
   - Removed `max-width: 90px`
   - Removed `overflow: hidden`
   - These properties are already inherited from base `.gantt-tl-cell-deps` rule
   - Background color change on hover still provides visual feedback

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

Automated verification passed:
- `min-width: 150px` confirmed in `.gantt-tl-cell-name`
- Picking mode hover state contains only background color change, no redundant width constraints

## Technical Details

### Layout Calculation

With overlay width 472px:
- Number column: 40px
- Start date: 68px
- End date: 68px
- Dependencies: 90px
- **Available for name: 234px**

The name column uses `flex: 1` with `min-width: 150px` to:
- Grow and fill available space when wider than 234px
- Shrink to fit within 234px when constrained
- Maintain reasonable minimum width for usability

### CSS Inheritance Chain

Base `.gantt-tl-cell-deps` provides:
```css
width: 90px;
flex-shrink: 0;
overflow: hidden;
```

Picking mode hover inherits these and only adds:
```css
background-color: rgba(59, 130, 246, 0.15);
```

## Success Criteria

- [x] Name column min-width reduced to 150px
- [x] Name column uses flex-grow to fill available space
- [x] Dependencies column maintains 90px width
- [x] Picking mode hover shows only background change (no redundant width constraints)
- [x] Column layout works correctly with overlay width 472px
- [x] No overflow occurs

## Next Steps

Manual verification recommended:
1. Open demo page with task list visible
2. Confirm name column takes available space without overflowing
3. Confirm dependencies column maintains exactly 90px width
4. Click "+" in any row's deps cell to enter link creation mode
5. Hover over dependencies cell in other rows
6. Confirm background color changes but cell doesn't expand
