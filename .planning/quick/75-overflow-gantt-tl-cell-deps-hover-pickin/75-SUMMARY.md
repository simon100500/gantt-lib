---
phase: quick-75
plan: 01
subsystem: "Task List Dependencies Column"
tags: ["css", "overflow", "hover", "picking-mode"]
dependency_graph:
  requires: []
  provides: ["width-constrained-hover"]
  affects: ["task-list-layout"]
tech_stack:
  added: []
  patterns: ["explicit-width-inheritance"]
key_files:
  created: []
  modified:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      change: "Added width constraints to picking mode hover state"
decisions: []
metrics:
  duration: "30s"
  completed_date: "2026-03-09"
---

# Phase Quick-75 Plan 01: Fix Overflow on Gantt TL Cell Deps Hover in Picking Mode Summary

Fix overflow issue where the dependencies cell expands beyond 90px when hovering in picking mode.

## Changes Made

### 1. Fixed overflow on hover in picking mode

**File:** `packages/gantt-lib/src/components/TaskList/TaskList.css`

**Change:** Added explicit width and overflow constraints to `.gantt-tl-row-picking .gantt-tl-cell-deps:hover`

**Before:**
```css
.gantt-tl-row-picking .gantt-tl-cell-deps:hover {
  background-color: rgba(59, 130, 246, 0.15);
}
```

**After:**
```css
.gantt-tl-row-picking .gantt-tl-cell-deps:hover {
  background-color: rgba(59, 130, 246, 0.15);
  width: 90px;
  max-width: 90px;
  overflow: hidden;
}
```

**Impact:**
- The width is explicitly set to 90px on hover
- max-width prevents any content from forcing expansion
- overflow: hidden clips any content that might still try to expand
- The background color change still works for visual feedback

## Deviations from Plan

None - plan executed exactly as written.

## Verification

To verify the fix:

1. Open demo page with task list visible
2. Click "+" in any row's deps cell to enter link creation mode (picking mode)
3. Hover over the dependencies cell in other rows
4. Confirm: the cell does NOT expand beyond 90px width
5. Confirm: background color changes on hover (visual feedback works)

## Success Criteria

✓ Dependencies cell maintains 90px width constraint when hovering in picking mode
✓ No overflow or expansion beyond column boundary
✓ Background color change on hover still provides visual feedback

## Commits

- `6d20c16`: fix(quick-75): constrain width on deps cell hover in picking mode

## Self-Check: PASSED

All files verified:
- ✓ CSS file exists with expected changes
- ✓ Commit verified in git history
- ✓ All constraints properly applied
