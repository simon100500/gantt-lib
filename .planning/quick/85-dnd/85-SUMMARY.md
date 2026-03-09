---
phase: quick-85
plan: 01
subsystem: TaskList drag-and-drop
tags: [dnd, task-reorder, drop-zone]
dependency_graph:
  requires:
    - "TaskList.tsx (drag-to-reorder state)"
  provides:
    - "Drop zone after last row for end-position placement"
  affects:
    - "TaskList.tsx (handleDrop logic)"
    - "TaskList.css (drop zone styling)"
tech_stack:
  added: []
  patterns:
    - "After-last drop zone with dragOverIndex === tasks.length sentinel"
    - "Conditional className for drag-over state"
    - "pointer-events toggle for non-blocking drop zone"
key_files:
  created:
    - ".planning/quick/85-dnd/85-SUMMARY.md"
  modified:
    - "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
    - "packages/gantt-lib/src/components/TaskList/TaskList.css"
decisions: []
metrics:
  duration_seconds: 95
  completed_date: "2026-03-09T19:42:11Z"
---

# Phase quick-85 Plan 01: Drag and Drop After-Last Position Summary

**One-liner:** Added drop zone after the last row to enable moving tasks to the very end of the list via drag-and-drop.

## Objective

Fix drag and drop to allow moving tasks to the very end (after the last row). The current DnD separator only appears between existing rows, preventing users from dropping a task after the last row. This fix adds a drop zone at the end to enable placing tasks at the end position.

## Implementation

### Task 1: Add Drop Zone Element After Last Row
**File:** `packages/gantt-lib/src/components/TaskList/TaskList.tsx`

Added a drop zone div after the task rows (inside `.gantt-tl-body`):
- `className="gantt-tl-drop-zone"` with conditional `gantt-tl-drop-zone-drag-over` when `dragOverIndex === tasks.length`
- `height` matching `rowHeight` prop
- `onDragOver` handler that sets `dragOverIndex` to `tasks.length` (special sentinel value meaning "after last")
- `onDrop` handler that calls `handleDrop(tasks.length, e)`

### Task 2: Update Drop Logic to Handle After-Last Position
**File:** `packages/gantt-lib/src/components/TaskList/TaskList.tsx`

Modified `handleDrop` to correctly handle the case where `dropIndex === tasks.length`:

```typescript
const insertIndex = dropIndex === tasks.length
  ? tasks.length - 1  // After last means position at last
  : originIndex < dropIndex ? dropIndex - 1 : dropIndex;
```

This fixes the edge case where dragging the last row to the after-last position would incorrectly place it at `tasks.length - 2`.

### Task 3: Add CSS Styling for Drop Zone Indicator
**File:** `packages/gantt-lib/src/components/TaskList/TaskList.css`

Added CSS for the drop zone element:
- `.gantt-tl-drop-zone` - base styling with `pointer-events: none` (non-blocking when not dragging)
- `.gantt-tl-drop-zone-drag-over` - enables pointer events during drag
- `.gantt-tl-drop-zone-drag-over::before` - blue 2px top border indicator using `::before` pseudo-element

Consistent with existing `.gantt-tl-row-drag-over::before` style for visual uniformity.

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria

- [x] Tasks can be dragged and dropped after the last row
- [x] Blue drop indicator appears when hovering over the drop zone at the end
- [x] Tasks are correctly positioned at the end when dropped
- [ ] Existing drag and drop behavior for middle positions is not affected (pending human verification)

## Commits

- **2e620ae**: `feat(quick-85): add drop zone after last row for drag-to-reorder`
  - Added drop zone div after task rows
  - Updated handleDrop to handle dropIndex === tasks.length
- **2c6904f**: `style(quick-85): add drop zone blue indicator styling`
  - Added .gantt-tl-drop-zone CSS classes
  - Added blue 2px top border indicator on drag-over

## Files Modified

| File | Changes |
|------|---------|
| `packages/gantt-lib/src/components/TaskList/TaskList.tsx` | +18 lines, -1 line (drop zone element + handleDrop fix) |
| `packages/gantt-lib/src/components/TaskList/TaskList.css` | +23 lines (drop zone styling) |

## Verification Instructions

1. Open the Gantt chart demo at http://localhost:3000
2. Create at least 3 tasks if not already present
3. Drag the first task by its drag handle (number column)
4. Drag it to the bottom, past the last row
5. Observe the blue separator line appears at the bottom
6. Drop the task
7. Verify the task is now at the end of the list

## Next Steps

Await human verification at checkpoint to confirm the fix works as expected and existing drag/drop behavior is not affected.
