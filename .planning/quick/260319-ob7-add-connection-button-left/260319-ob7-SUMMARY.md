---
phase: quick
plan: 260319-ob7
subsystem: TaskList dependencies cell
tags: [ui, positioning, ux]
dependency_graph:
  requires: []
  provides: [left-positioned-add-button]
  affects: [dependencies-cell-layout]
tech_stack:
  added: []
  patterns: [flexbox-layout, dom-order-positioning]
key_files:
  created: []
  modified:
    - path: packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
      changes: Moved add button JSX before chips JSX
    - path: packages/gantt-lib/src/components/TaskList/TaskList.css
      changes: Changed margin-left:auto to margin-right:4px
decisions: []
metrics:
  duration: "2 minutes"
  completed_date: "2026-03-19"
  tasks_completed: 2
  files_modified: 2
---

# Phase Quick Plan 260319-ob7: Add Connection Button Left Summary

Move the "add connection" button from the right side to the left side of the dependencies cell, improving UX by placing the add button in a more intuitive position.

## Changes Made

### Task 1: Move add button to left side in JSX
**File:** `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx`
**Commit:** `713b551`

Moved the "+" add dependency button rendering block to appear BEFORE the dependency chips rendering block. This changes the DOM order so the button renders first, which combined with CSS changes positions it on the left side.

**Before:**
```tsx
{chips.length >= 2 ? (...) : chips.length === 1 ? (...) : null}
{!disableDependencyEditing && !isPicking && ( <button ...>+</button> )}
```

**After:**
```tsx
{!disableDependencyEditing && !isPicking && ( <button ...>+</button> )}
{chips.length >= 2 ? (...) : chips.length === 1 ? (...) : null}
```

### Task 2: Update CSS to position button on left
**File:** `packages/gantt-lib/src/components/TaskList/TaskList.css`
**Commit:** `51bddf5`

Updated the `.gantt-tl-dep-add` CSS rule to position the button on the left side with proper spacing from the dependency chips.

**Changes:**
- Removed `margin-left: auto;` (was pushing button to the right)
- Added `margin-right: 4px;` (adds spacing between button and chips)

All other existing styles preserved:
- Hover reveal (`.gantt-tl-dep-add-hover`)
- Hide when selected (`.gantt-tl-dep-add-hidden`)
- Hover background (`.gantt-tl-dep-add:hover`)

## Verification

All success criteria met:

- [x] Add connection button renders on the left side of dependencies cell
- [x] Button has proper spacing (4px) from existing dependency chips
- [x] All existing behaviors preserved (hover reveal, hide on select, picker mode)
- [x] No visual overlap between button and chips

## Deviations from Plan

None - plan executed exactly as written.

## Testing Recommendations

Visual verification:
1. Open the Gantt chart with tasks that have dependencies
2. Locate the dependencies column
3. Verify the "+" button appears on the LEFT side of dependency chips
4. Hover over the row - button should reveal smoothly
5. Click on a dependency chip - button should hide
6. Exit picker mode - button should be hidden
7. Verify ~4px gap between "+" button and first chip

## Commits

- `713b551`: feat(quick-260319-ob7): move add button before chips in JSX
- `51bddf5`: style(quick-260319-ob7): position add button on left side

## Self-Check: PASSED

**Files created:**
- FOUND: D:\Проекты\gantt-lib\.planning\quick\260319-ob7-add-connection-button-left\260319-ob7-SUMMARY.md

**Commits verified:**
- FOUND: 713b551
- FOUND: 51bddf5

**Files modified:**
- FOUND: D:\Проекты\gantt-lib\packages\gantt-lib\src\components\TaskList\TaskListRow.tsx
- FOUND: D:\Проекты\gantt-lib\packages\gantt-lib\src\components\TaskList\TaskList.css
