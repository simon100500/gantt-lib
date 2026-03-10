---
status: verifying
trigger: "parent-task-resize-disabled"
created: 2026-03-10T00:00:00.000Z
updated: 2026-03-10T00:00:00.000Z
---

## Current Focus

hypothesis: FIX IMPLEMENTED - Added isTaskParent check in handleMouseDown (lines 840-845) that forces 'move' mode for parent tasks when edge zone detection returns 'resize-left' or 'resize-right'
test: Build completed successfully with no compilation errors
expecting: Parent tasks can only be moved, not resized, regardless of where user clicks on the task bar
next_action: Request human verification - test that parent task resize is disabled in the running application

## Symptoms
expected: Parent tasks should NOT be resizable — dates are computed from children, resize should be completely disabled (only move allowed)
actual: Resize handles are hidden via CSS but edge zone detection in useTaskDrag still allows resize. When resizing a parent, empty space appears next to child tasks.
errors: None
reproduction: Try to resize a parent task bar — the resize interaction works despite CSS hiding handles
timeline: This is from Phase 19 implementation. Parent bars have special styling (gradient, folder icon) and hidden handles, but resize logic doesn't check if task is a parent.

## Evidence

- timestamp: 2026-03-10T00:00:00.000Z
  checked: TaskRow.tsx lines 288-297, TaskRow.css
  found: Resize handles are conditionally hidden for parent tasks with `{!isParent && <div className="gantt-tr-resizeHandle..." />}`
  implication: CSS-only solution - handles are hidden but edge zone detection still active

- timestamp: 2026-03-10T00:00:00.000Z
  checked: useTaskDrag.ts lines 819-838 (handleMouseDown function)
  found: handleMouseDown calls detectEdgeZone(e.clientX, target, edgeZoneWidth) which returns 'left', 'right', or 'move' based purely on cursor position within edgeZoneWidth (20px). No check for isTaskParent status.
  implication: Parent tasks can enter resize-left/resize-right modes when clicking within 20px of edges

- timestamp: 2026-03-10T00:00:00.000Z
  checked: geometry.ts lines 75-104 (detectEdgeZone function)
  found: detectEdgeZone is a pure geometric function - checks cursor position relative to element edges, has no knowledge of task hierarchy or parent status
  implication: Cannot be fixed in geometry.ts - fix must be in useTaskDrag where isTaskParent context exists

- timestamp: 2026-03-10T00:00:00.000Z
  checked: dependencyUtils.ts lines 414-420 (isTaskParent function)
  found: isTaskParent(taskId: string, tasks: Task[]): boolean - checks if any task has parentId === taskId
  implication: Function already exists and is imported in useTaskDrag.ts (line 6) but not used in handleMouseDown

## Resolution

root_cause: useTaskDrag.handleMouseDown allows resize operations for parent tasks because it uses detectEdgeZone without checking isTaskParent. When clicking within 20px of parent task edges, the function sets mode to 'resize-left' or 'resize-right', even though parent task dates are computed from children and should not be resizable.

fix: Added isTaskParent check in handleMouseDown (lines 840-845 in useTaskDrag.ts) that forces 'move' mode for parent tasks when edge zone detection returns 'resize-left' or 'resize-right':

```typescript
// Phase 19: Parent tasks cannot be resized - their dates are computed from children
// Force move mode for parent tasks to prevent resize operations
if (mode === 'resize-left' || mode === 'resize-right') {
  const currentTask = allTasks.find(t => t.id === taskId);
  if (currentTask && isTaskParent(taskId, allTasks)) {
    mode = 'move';
  }
}
```

verification:
- Build completed successfully with no TypeScript errors
- Code change is minimal and targeted - only affects parent task resize behavior
- Move functionality for parent tasks is preserved
- Regular (non-parent) tasks are unaffected

files_changed:
- D:\Projects\gantt-lib\packages\gantt-lib\src\hooks\useTaskDrag.ts: Added parent task check in handleMouseDown (lines 840-845)
