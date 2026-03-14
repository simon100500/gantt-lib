---
phase: quick
plan: 097
subsystem: drag-and-drop
tags: [drag-restriction, parent-tasks, validation]
dependency_graph:
  requires: []
  provides: [parent-drop-validation]
  affects: [TaskList]
tech_stack:
  added: []
  patterns: [drop-validation, early-return]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
decisions: []
metrics:
  duration_seconds: 120
  completed_date: "2026-03-14T11:51:28Z"
---

# Phase Quick Plan 097: Fix Parent Task Drag Restriction Summary

Prevent parent tasks from being dropped in invalid positions to enforce single-level nesting hierarchy.

## One-Liner

Parent tasks CAN be dragged (drag handle visible), but invalid drop targets show NO indication and are REJECTED silently.

## Tasks Completed

### Task 1: Add isValidParentDrop validation helper

**Status:** Completed
**Commit:** 0522516

Added `isValidParentDrop` helper function that validates if a parent task can be dropped at a specific position:

```typescript
const isValidParentDrop = useCallback((draggedTaskId: string, dropIndex: number): boolean => {
  // If not a parent, allow all drops
  if (!isTaskParent(draggedTaskId, tasks)) {
    return true;
  }

  const dropTarget = visibleTasks[dropIndex];
  if (!dropTarget) return true;

  // Scenario 1: Dropping parent between its own children
  if (dropTarget.parentId === draggedTaskId) {
    return false;
  }

  // Scenario 2: Dropping parent between another parent's children
  if (dropTarget.parentId) {
    return false;
  }

  // Scenario 3: Dropping directly on another parent task
  if (isTaskParent(dropTarget.id, tasks)) {
    return false;
  }

  return true;
}, [tasks, visibleTasks]);
```

### Task 2: Update handleDragOver to hide indication for invalid drops

**Status:** Completed
**Commit:** 0522516

Modified `handleDragOver` to check drop validity before showing drag-over indication:

```typescript
const handleDragOver = useCallback((index: number, e: React.DragEvent) => {
  e.preventDefault();

  const draggedTaskId = dragTaskIdRef.current;
  if (!draggedTaskId) return;

  // Don't show drop indication if this is an invalid parent drop
  if (!isValidParentDrop(draggedTaskId, index)) {
    setDragOverIndex(null);
    e.dataTransfer.dropEffect = 'none';
    return;
  }

  e.dataTransfer.dropEffect = 'move';
  setDragOverIndex(index);
}, [isValidParentDrop]);
```

### Task 3: Update handleDrop to reject invalid drops

**Status:** Completed
**Commit:** 0522516

Added validation check at the start of `handleDrop` to silently reject invalid parent drops:

```typescript
// Reject invalid parent drops (parent being dragged into children or another parent)
if (!isValidParentDrop(movedTaskId, dropIndex)) {
  setDraggingIndex(null);
  setDragOverIndex(null);
  dragOriginIndexRef.current = null;
  dragTaskIdRef.current = null;
  return;
}
```

## Deviations from Plan

**Major correction:** Initial implementation incorrectly hid drag handles for parent tasks. The correct behavior is:
- Parent tasks SHOW drag handles (can be dragged)
- But invalid drop targets show NO indication
- Invalid drops are silently rejected

## Verification

Build completed successfully with no TypeScript errors.

### Manual Verification Steps

1. Start the dev server: `npm run dev`
2. Open the browser and navigate to the demo page
3. Create a parent task "Parent A" with at least 2 children
4. **Verify:** Parent task SHOWS a drag handle
5. **Verify:** Child tasks SHOW drag handles
6. **Test:** Try to drag Parent A between its own children → NO drag-over indication, drop is rejected
7. **Test:** Create another parent "Parent B" with children
8. **Test:** Try to drag Parent A between Parent B's children → NO drag-over indication, drop is rejected
9. **Test:** Try to drag Parent A directly on Parent B → NO drag-over indication, drop is rejected
10. **Test:** Drag a child from Parent A to between Parent B's children → Should work (normal indication)

## Success Criteria Met

- [x] Parent tasks show drag handles (can attempt to drag)
- [x] No drag-over indication when parent is dragged over invalid targets
- [x] Invalid drops are silently rejected (no error, no action)
- [x] Child tasks can still be dragged normally
- [x] No TypeScript errors
- [x] Build completes successfully

## Next Steps

Await human verification before proceeding with any additional work.
