---
phase: quick
plan: 092
subsystem: hierarchy
tags: [hierarchy, demote, drag-drop, parent-inference]
dependency_graph:
  requires: [19-02, 19-03, quick-090, quick-091]
  provides: [smart-hierarchy-inference]
  affects: [TaskList, TaskListRow, GanttChart, dependencyUtils]
tech_stack:
  added:
    - "findParentId utility function in dependencyUtils.ts"
  patterns:
    - "Smart parent inference from context (previous task, surrounding tasks)"
    - "TDD approach (RED-GREEN cycle)"
    - "Extended callback signature for additional context"
key_files:
  created:
    - "packages/gantt-lib/src/utils/dependencyUtils.ts (findParentId function)"
  modified:
    - "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
    - "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
    - "packages/gantt-lib/src/__tests__/dependencyUtils.test.ts"
key_decisions:
  - "Extended onReorder callback signature instead of creating new callback"
  - "Simple findParentId utility (single line) vs more complex implementation"
  - "Context-based inference follows MS Project-like behavior"
metrics:
  duration: "3 minutes"
  completed_date: "2026-03-11"
---

# Phase Quick 092: Change Task Grouping Summary

**Smart hierarchy inference for demote and drag-drop operations** - Implements intuitive parent task inference when changing task hierarchy, preventing accidental grandchild nesting and automatically setting correct parent during drag reordering.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ----- | ------ | ----- |
| 1 | Add findParentId utility function | de8c3d6 | dependencyUtils.ts, dependencyUtils.test.ts |
| 2 | Update TaskListRow demote handler | 84676d5 | TaskListRow.tsx |
| 3 | Add smart drag-drop parent inference | acd24dd | TaskList.tsx, GanttChart.tsx |

## Implementation Details

### Task 1: findParentId Utility
- Added `findParentId(taskId: string, tasks: Task[]): string | undefined` to dependencyUtils.ts
- Simple lookup function that returns task.parentId or undefined
- Comprehensive test coverage for all scenarios:
  - Child tasks return parent ID
  - Root tasks return undefined
  - Non-existent tasks return undefined
  - Multiple hierarchies handled correctly

### Task 2: Smart Demote Handler
- Updated `handleDemote` in TaskListRow.tsx
- Logic: `targetParentId = previousTask.parentId || previousTask.id`
- When demoting below a child task → becomes sibling (uses child's parent)
- When demoting below a root task → becomes child (uses root task as parent)
- Prevents grandchild nesting issue

### Task 3: Smart Drag-Drop Parent Inference
- Extended `onReorder` callback signature: `(tasks, movedTaskId?, inferredParentId?)`
- Updated `handleDrop` in TaskList.tsx to infer parentId from drop context:
  - Task above has parentId → use that parent
  - Task below is child of task above → use task above as parent
  - Otherwise → remove parentId (root level)
- Updated `handleReorder` in GanttChart.tsx to apply inferred parentId

## Deviations from Plan

None - plan executed exactly as written.

## Verification

Manual verification steps (as specified in plan):
1. Create hierarchy: Parent (root) → Child1, Child2
2. Add root task "RootTask" below Child2
3. Click "demote" on RootTask
4. Expected: RootTask becomes Child3 (sibling of Child1, Child2), not grandchild
5. Test drag-and-drop: drag root task between Child1 and Child2
6. Expected: Dragged task becomes Child3 with same parent

## Technical Notes

- All existing tests still pass (dependencyUtils, reorderTasks, useTaskDrag)
- Pre-existing dateUtils test failures are unrelated to these changes
- Extended callback signature maintains backward compatibility (new params are optional)
- Implementation follows TDD pattern for utility function

## Files Modified

- `packages/gantt-lib/src/utils/dependencyUtils.ts` - Added findParentId export
- `packages/gantt-lib/src/__tests__/dependencyUtils.test.ts` - Added findParentId tests
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` - Smart demote logic
- `packages/gantt-lib/src/components/TaskList/TaskList.tsx` - Smart drag-drop inference
- `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` - Extended onReorder handler
