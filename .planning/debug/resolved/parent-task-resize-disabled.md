---
status: resolved
trigger: "parent-task-resize-disabled"
created: 2026-03-10T00:00:00.000Z
updated: 2026-03-10T22:00:00.000Z
---

## Resolution

root_cause: Two issues found:
1. Parent tasks could be resized despite CSS hiding handles - edge zone detection didn't check isTaskParent
2. Parent tasks didn't stretch in real-time when children were dragged - position calculation didn't account for dragged child's current position

fix:
1. Added isTaskParent check in handleMouseDown (lines 840-845) that forces 'move' mode for parent tasks
2. Fixed parent position calculation in handleGlobalMouseMove (lines 354-427) to compute from all children:
   - For dragged child: use current drag position (newLeft/newWidth)
   - For cascaded children: apply deltaDays
   - For other children: use original positions
   - Parent width dynamically computed from children span

verification:
- Build completed successfully
- Parent tasks can only be moved, not resized
- Parent tasks stretch in real-time when children are dragged

files_changed:
- D:\Projects\gantt-lib\packages\gantt-lib\src\hooks\useTaskDrag.ts: Added parent resize disable and real-time parent movement logic

commits:
- e509be5: fix(19-04): parent task stretches in real-time when child is dragged
