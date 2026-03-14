---
phase: quick
plan: 097
subsystem: drag-and-drop
tags: [drag-restriction, parent-tasks, ui]
dependency_graph:
  requires: []
  provides: [isDraggable-prop, parent-task-drag-restriction]
  affects: [TaskList, TaskListRow]
tech_stack:
  added: []
  patterns: [conditional-rendering, validation-helpers]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
decisions: []
metrics:
  duration_seconds: 64
  completed_date: "2026-03-14T11:48:29Z"
---

# Phase Quick Plan 097: Fix Parent Task Drag Restriction Summary

Prevent parent tasks from being dragged in the task list to enforce single-level nesting hierarchy.

## One-Liner

Parent tasks are now non-draggable (no drag handle displayed), preventing them from becoming nested either as their own child or as another parent's child.

## Tasks Completed

### Task 1: Add canDragTask validation helper to TaskList.tsx

**Status:** Completed
**Commit:** 78c4e14

Added a helper function `canDragTask` to the TaskList component that checks whether a task can be dragged:

```typescript
const canDragTask = useCallback((taskId: string): boolean => {
  // Parent tasks cannot be dragged
  // This prevents them from becoming nested (either as their own child or another parent's child)
  return !isTaskParent(taskId, tasks);
}, [tasks]);
```

The `isTaskParent` utility was already imported from `dependencyUtils.ts`.

### Task 2: Pass isDraggable prop to TaskListRow and conditionally render drag handle

**Status:** Completed
**Commit:** 04c5130

**Changes to TaskList.tsx:**
- Passed `isDraggable={canDragTask(task.id)}` to each TaskListRow

**Changes to TaskListRow.tsx:**
1. Added `isDraggable?: boolean;` to TaskListRowProps interface
2. Added `isDraggable = true` to component destructuring (default for backward compatibility)
3. Wrapped drag handle rendering with conditional check:

```typescript
{isDraggable && (
  <span
    className="gantt-tl-drag-handle"
    draggable={true}
    onDragStart={(e) => {
      e.stopPropagation();
      onDragStart?.(rowIndex, e);
    }}
    onDragEnd={(e) => onDragEnd?.(e)}
    onClick={(e) => e.stopPropagation()}
  >
    <DragHandleIcon />
  </span>
)}
```

## Deviations from Plan

None - plan executed exactly as written.

## Verification

Build completed successfully with no TypeScript errors.

### Manual Verification Steps

1. Start the dev server: `npm run dev`
2. Open the browser and navigate to the demo page
3. Create a parent task with at least 2 children
4. Verify: Parent task does NOT show a drag handle (6-dot icon in № column)
5. Verify: Child tasks DO show drag handles
6. Try to drag a child task - should work normally
7. Try to drag a parent task - should not be possible (no handle to grab)
8. Test with multiple parent groups - verify all parents have no drag handles

## Success Criteria Met

- [x] Parent tasks do not display drag handles
- [x] Child tasks display drag handles and can be dragged
- [x] Root-level (non-parent) tasks display drag handles and can be dragged
- [x] No TypeScript errors
- [x] Build completes successfully

## Next Steps

Await human verification before proceeding with any additional work.
