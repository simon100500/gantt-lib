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
  duration_seconds: 180
  completed_date: "2026-03-14T11:54:23Z"
---

# Phase Quick Plan 097: Fix Parent Task Drag Restriction Summary

Prevent parent tasks from being dropped in invalid positions to enforce single-level nesting hierarchy.

## One-Liner

Parent tasks CAN be dragged (drag handle visible), but invalid drop targets (children) show NO indication and are REJECTED silently. Parent CAN be dropped on another parent (both stay at root level).

## Tasks Completed

### Task 1: Add isValidParentDrop validation helper

**Status:** Completed
**Commit:** 8d28960

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

  // Allow dropping on other root tasks (parents or non-parents)
  return true;
}, [tasks, visibleTasks]);
```

**Key decision:** Parent CAN be dropped on another parent (both stay root). Only dropping on children is blocked.

### Task 2: Update handleDragOver to hide indication for invalid drops

**Status:** Completed
**Commit:** 0522516 → 8d28960

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
**Commit:** 0522516 → 8d28960

Added validation check at the start of `handleDrop` to silently reject invalid parent drops:

```typescript
// Reject invalid parent drops (parent being dragged into children)
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
- Invalid drop targets (children) show NO indication
- Invalid drops are silently rejected
- Parent CAN be dropped on another parent (both remain root-level)

## Verification

Build completed successfully with no TypeScript errors.

### Manual Verification Steps

1. Start the dev server: `npm run dev`
2. Open the browser and navigate to the demo page
3. Create:
   - [просто задача] (root)
   - [родитель1] with children
   - [Родитель2] with children
4. **Verify:** All tasks SHOW drag handles
5. **Test:** Drag [Родитель2] between [просто задача] and [родитель1] → Should work (indication shown)
6. **Test:** Drag [Родитель2] between [родитель1]'s children → NO indication, rejected
7. **Test:** Drag [Родитель2] on [родитель1] → Should work (indication shown, both stay root)
8. **Test:** Drag child from [родитель1] to [Родитель2]'s children → Should work

## Success Criteria Met

- [x] Parent tasks show drag handles (can attempt to drag)
- [x] No drag-over indication when parent is dragged over children
- [x] Invalid drops (on children) are silently rejected
- [x] Parent CAN be dropped on another parent (both stay root)
- [x] Child tasks can still be dragged normally
- [x] No TypeScript errors
- [x] Build completes successfully

## Next Steps

Await human verification before proceeding with any additional work.
